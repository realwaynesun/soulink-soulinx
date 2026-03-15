import express from 'express'
import cors from 'cors'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import { privateKeyToAccount } from 'viem/accounts'
import { config } from './config.js'
import { db } from './db.js'
import { pool, publicClient, approveUsdgToPool, waitForTx } from './contract.js'
import { createSoulinkClient } from './soulink.js'
import { signReport } from './sign.js'
import poolRouter from './routes/pool.js'
import depositRouter, { depositPrice } from './routes/deposit.js'
import withdrawRouter from './routes/withdraw.js'
import termsRouter from './routes/terms.js'
import borrowRouter from './routes/borrow.js'
import repayRouter, { repayPrice } from './routes/repay.js'
import loansRouter from './routes/loans.js'

const app = express()
app.use(cors({ origin: config.corsOrigin }))
app.use(express.json())

// x402 setup — same pattern as main Soulink server for X Layer
async function setupX402() {
  const mod = await import('soulink402')
  const payTo = privateKeyToAccount(config.operatorPrivateKey).address

  const x402Config: import('soulink402').X402Config = {
    payTo, network: 'eip155:196',
    routes: {
      'POST /deposit': { price: depositPrice, description: 'Deposit USDG into lending pool' },
      'POST /repay/:loanId': { price: repayPrice, description: 'Repay active loan in USDG' },
    },
  }

  x402Config.facilitatorUrl = 'https://facilitator.payai.network'

  // Register USDG as the payment asset for X Layer (eip155:196)
  const { ExactEvmScheme } = await import('@x402/evm/exact/server')
  const evmScheme = new ExactEvmScheme()
  evmScheme.registerMoneyParser(async (amount: number, network: string) => {
    if (network === 'eip155:196') {
      const tokenAmount = BigInt(Math.round(amount * 1e6)).toString()
      return {
        amount: tokenAmount,
        asset: config.usdgAddress,
        extra: { name: 'Global Dollar', version: '1' },
      }
    }
    return null
  })

  // Use createServer with custom scheme instead of x402() middleware
  const { x402ResourceServer, x402HTTPResourceServer, paymentMiddlewareFromHTTPServer } =
    await import('@x402/express')
  const { HTTPFacilitatorClient } = await import('@x402/core/http')

  const facilitatorClient = new HTTPFacilitatorClient({ url: 'https://facilitator.payai.network' })
  const resourceServer = new x402ResourceServer(facilitatorClient as never)
    .register('eip155:196', evmScheme)
  const routes = mod.buildRoutes(x402Config)
  const httpServer = new x402HTTPResourceServer(resourceServer, routes)

  return paymentMiddlewareFromHTTPServer(httpServer)
}

const paywall = await setupX402()
app.use(paywall)
for (const m of [poolRouter, depositRouter, withdrawRouter, termsRouter, borrowRouter, repayRouter, loansRouter]) app.use(m)

const __dirname = dirname(fileURLToPath(import.meta.url))
app.get('/skill.md', (_req, res) => { res.sendFile(resolve(__dirname, '../skill/SKILL.md')) })
app.get('/health', (_req, res) => { res.json({ status: 'ok' }) })

// NOTE: Overdue detection depends on SQLite loan_index table rather than on-chain state.
// This is acceptable for hackathon MVP but a production system should scan on-chain events
// or use a dedicated indexer to avoid drift between off-chain index and contract state.
function startOverdueWorker() {
  const soulink = createSoulinkClient(config.soulinkBaseUrl)
  const findOverdue = db.prepare(
    "SELECT * FROM loan_index WHERE due_at < strftime('%Y-%m-%dT%H:%M:%fZ', 'now')",
  )
  const deleteIndex = db.prepare('DELETE FROM loan_index WHERE id = ?')

  setInterval(async () => {
    const overdue = findOverdue.all() as Array<{ id: string; borrower: string; due_at: string }>
    for (const row of overdue) {
      try {
        const hash = await pool.write.defaultLoan(row.id as `0x${string}`)
        const receipt = await waitForTx(hash)
        if (receipt.status === 'reverted') {
          throw new Error(`defaultLoan tx reverted for ${row.id}`)
        }
        deleteIndex.run(row.id)

        const report = await signReport()
        await soulink.submitReport({
          agent: row.borrower, score: -1, action: 'payment_defaulted',
          context: `Loan ${row.id} defaulted.`,
          ...report,
        }).catch(() => {})
      } catch {}
    }
  }, 60_000)
}

// Periodic worker: distribute interest from repaid loans to origination-time lenders
// Interest distribution worker.
// Known limitation: lender snapshots are taken off-chain before approveLoan, so there is a
// small window where lender state can change. Production systems should use on-chain share-based
// accounting (e.g., ERC-4626 vault shares like Morpho) to eliminate this window entirely.
function startDistributionWorker() {
  const findPending = db.prepare('SELECT * FROM pending_distributions WHERE distributed = 0')
  const claimAndFind = db.transaction((loanId: string) => {
    const rows = db.prepare(
      'SELECT * FROM lender_snapshots WHERE loan_id = ? AND distributed = 0',
    ).all(loanId) as Array<{
      lender_address: string; deposit_amount: number; total_deposits: number
    }>
    // Mark as in-progress (distributed = 2) to prevent concurrent pickup
    for (const r of rows) {
      db.prepare(
        'UPDATE lender_snapshots SET distributed = 2 WHERE loan_id = ? AND lender_address = ?',
      ).run(loanId, r.lender_address)
    }
    return rows
  })
  const markSnapDone = db.prepare(
    'UPDATE lender_snapshots SET distributed = 1 WHERE loan_id = ? AND lender_address = ?',
  )
  const markSnapFailed = db.prepare(
    'UPDATE lender_snapshots SET distributed = 0 WHERE loan_id = ? AND lender_address = ?',
  )
  const checkAllDone = db.prepare(
    'SELECT COUNT(*) as remaining FROM lender_snapshots WHERE loan_id = ? AND distributed != 1',
  )
  const markLoanDone = db.prepare(
    'UPDATE pending_distributions SET distributed = 1 WHERE loan_id = ?',
  )

  // Crash recovery: reset in-progress claims (distributed=2) from prior runs.
  // Known limitation: if process crashed after on-chain distributeInterest succeeded but before
  // SQLite was updated to 1, this reset may cause a duplicate payout on restart.
  // Production fix: use on-chain share-based accounting (ERC-4626 vault pattern) where interest
  // accrues to pool shares automatically, eliminating the need for off-chain distribution tracking.
  db.prepare('UPDATE lender_snapshots SET distributed = 0 WHERE distributed = 2').run()

  let running = false
  setInterval(async () => {
    if (running) return
    running = true
    try {
      const pending = findPending.all() as Array<{ loan_id: string; interest_amount: number }>
      for (const dist of pending) {
        const snapshots = claimAndFind(dist.loan_id)
        for (const snap of snapshots) {
          const share = BigInt(Math.floor(dist.interest_amount * snap.deposit_amount / snap.total_deposits))
          if (share === 0n) { markSnapDone.run(dist.loan_id, snap.lender_address); continue }
          try {
            const h = await pool.write.distributeInterest(snap.lender_address as `0x${string}`, share)
            const r = await waitForTx(h)
            if (r.status !== 'reverted') markSnapDone.run(dist.loan_id, snap.lender_address)
            else markSnapFailed.run(dist.loan_id, snap.lender_address)
          } catch { markSnapFailed.run(dist.loan_id, snap.lender_address) }
        }
        const { remaining } = checkAllDone.get(dist.loan_id) as { remaining: number }
        if (remaining === 0) markLoanDone.run(dist.loan_id)
      }
    } finally { running = false }
  }, 120_000)
}

async function verifyPoolAgentOwnership() {
  const soulink = createSoulinkClient(config.soulinkBaseUrl)
  const account = privateKeyToAccount(config.operatorPrivateKey)
  const resolved = await soulink.resolve(config.poolAgentName)
  if (!resolved?.owner || resolved.owner.toLowerCase() !== account.address.toLowerCase()) {
    throw new Error(
      `POOL_AGENT_NAME "${config.poolAgentName}" is not owned by operator wallet ${account.address}. ` +
      `Register it first or fix the config.`,
    )
  }
  console.log(`Pool agent verified: ${config.poolAgentName}.agent owned by ${account.address}`)
}

async function main() {
  await verifyPoolAgentOwnership()

  console.log('Approving USDG spend to pool contract...')
  await approveUsdgToPool()
  console.log('USDG approval complete.')

  startOverdueWorker()
  startDistributionWorker()
  app.listen(config.port, () => {
    console.log(`soulinX lending server running on http://localhost:${config.port}`)
  })
}

main()
