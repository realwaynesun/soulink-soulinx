import { Router, type Request, type Response } from 'express'
import { randomUUID } from 'crypto'
import { z } from 'zod'
import type { Address, Hex } from 'viem'
import { formatUnits, parseUnits } from 'viem'
import { pool, publicClient, waitForTx } from '../contract.js'
import { db } from '../db.js'
import { createSoulinkClient } from '../soulink.js'
import { config } from '../config.js'
import { calculateTerms } from '../lending.js'
import { getOkbPrice } from '../okb-price.js'

const bodySchema = z.object({
  name: z.string().min(3).max(32).regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/),
  amount: z.number().int().min(1_000_000),
  signature: z.string().startsWith('0x'),
  message: z.string(),
})

const ZERO_BYTES32: Hex = '0x0000000000000000000000000000000000000000000000000000000000000000'

const insertLoanIndex = db.prepare(
  'INSERT INTO loan_index (id, borrower, due_at) VALUES (?, ?, ?)',
)

const soulink = createSoulinkClient(config.soulinkBaseUrl)

function generateLoanId(): Hex {
  const hex = randomUUID().replace(/-/g, '').padEnd(64, '0')
  return `0x${hex}`
}

const router = Router()

router.post('/borrow', async (req: Request, res: Response) => {
  const parsed = bodySchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_input', details: parsed.error.issues })
    return
  }

  const { name, amount, signature, message } = parsed.data

  const [verified, credit] = await Promise.all([
    soulink.verify({ name, signature, message }),
    soulink.credit(name),
  ])

  if (!verified.valid) {
    res.status(403).json({ error: 'auth_failed', message: verified.error })
    return
  }

  const terms = calculateTerms(credit.score)
  if (!terms) {
    res.status(403).json({ error: 'rejected', message: 'Credit score too low.' })
    return
  }

  const borrower = verified.owner!.toLowerCase() as Address
  const [activeLoan, avail] = await Promise.all([
    pool.read.activeLoanId(borrower),
    pool.read.available(),
  ])

  if (activeLoan !== ZERO_BYTES32) {
    res.status(409).json({ error: 'active_loan_exists', message: 'Repay existing loan first.' })
    return
  }
  if (amount > terms.maxAmount * 1_000_000) {
    res.status(400).json({ error: 'exceeds_max', message: `Max loan: ${terms.maxAmount} USDG.` })
    return
  }
  if (BigInt(amount) > avail) {
    res.status(400).json({ error: 'insufficient_pool', message: 'Not enough liquidity.' })
    return
  }

  const okbPrice = await getOkbPrice()
  const okbPriceX18 = parseUnits(okbPrice.toFixed(18), 18)
  const loanId = generateLoanId()

  try {
    // Snapshot lenders BEFORE any on-chain loan action to prevent JIT deposit attacks
    const lenders = db.prepare('SELECT address FROM lender_index').all() as { address: string }[]
    const totalDep = await pool.read.totalDeposits()
    const snapshotInsert = db.prepare(
      'INSERT OR IGNORE INTO lender_snapshots (loan_id, lender_address, deposit_amount, total_deposits) VALUES (?, ?, ?, ?)',
    )
    for (const l of lenders) {
      const dep = await pool.read.lenderDeposits(l.address as Address)
      if (dep > 0n) snapshotInsert.run(loanId, l.address, Number(dep), Number(totalDep))
    }

    const creditHash = await pool.write.updateCredit(borrower, BigInt(credit.score))
    const creditReceipt = await waitForTx(creditHash)
    if (creditReceipt.status === 'reverted') throw new Error('Credit update reverted')

    const hash = await pool.write.approveLoan(loanId, borrower, BigInt(amount), okbPriceX18)
    const receipt = await waitForTx(hash)
    if (receipt.status === 'reverted') {
      throw new Error('Transaction reverted')
    }

    // Read actual dueAt from contract (source of truth)
    const loanData = await pool.read.loans(loanId)
    const onChainDueAt = Number(loanData[4])
    const dueAt = new Date(onChainDueAt * 1000).toISOString()
    insertLoanIndex.run(loanId, name, dueAt)

    res.json({
      loan_id: loanId,
      tx_hash: hash,
      amount,
      okb_price: okbPrice,
      interest_pct: terms.interestPct,
      due_at: dueAt,
      
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ error: 'tx_failed', message: msg })
  }
})

export default router
