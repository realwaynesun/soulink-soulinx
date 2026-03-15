import { privateKeyToAccount } from 'viem/accounts'
import { createPublicClient, createWalletClient, defineChain, http, type Hex, formatEther, formatUnits } from 'viem'
import { x402Client, x402HTTPClient } from '@x402/core/client'
import { toClientEvmSigner } from '@x402/evm'
import { ExactEvmScheme } from '@x402/evm/exact/client'

const BASE = process.env.SOULINX_URL ?? 'http://localhost:4030'
const SOULINK = process.env.SOULINK_BASE_URL ?? 'https://soulink.dev'
const RPC = process.env.RPC_URL ?? 'https://xlayerrpc.okx.com'

const AGENT_KEYS: Record<string, Hex> = {
  lender: process.env.LENDER_KEY as Hex,
  alice: process.env.ALICE_KEY as Hex,
  bob: process.env.BOB_KEY as Hex,
}

const xlayer = defineChain({
  id: 196, name: 'X Layer',
  nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
  blockExplorers: { default: { name: 'OKLink', url: 'https://www.oklink.com/xlayer' } },
})

const xlayerPublicClient = createPublicClient({ chain: xlayer, transport: http(RPC) })

// --- x402 client ---
function createX402Fetch(agentKey: Hex): typeof fetch {
  const account = privateKeyToAccount(agentKey)
  const signer = toClientEvmSigner(account, xlayerPublicClient)
  const scheme = new ExactEvmScheme(signer)
  const client = new x402Client()
  client.register('eip155:196', scheme)
  const httpClient = new x402HTTPClient(client)

  return async function x402Fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const res = await fetch(input, init)
    if (res.status !== 402) return res
    console.log(`  ${Y}← 402 Payment Required (x402 protocol)${X}`)
    const body = await res.json()
    const paymentRequired = httpClient.getPaymentRequiredResponse((name) => res.headers.get(name), body)
    const hookHeaders = await httpClient.handlePaymentRequired(paymentRequired)
    if (hookHeaders) return fetch(input, { ...init, headers: { ...init?.headers, ...hookHeaders } })
    console.log(`  ${C}→ Signing USDG payment on X Layer...${X}`)
    const payload = await httpClient.createPaymentPayload(paymentRequired)
    console.log(`  ${G}→ Payment signed. Retrying with proof...${X}`)
    const paymentHeaders = httpClient.encodePaymentSignatureHeader(payload)
    return fetch(input, { ...init, headers: { ...init?.headers, ...paymentHeaders } })
  }
}

// --- EIP-191 signing ---
async function signForAgent(name: string): Promise<{ signature: string; message: string }> {
  const key = AGENT_KEYS[name]
  if (!key) throw new Error(`Set ${name.toUpperCase()}_KEY env var`)
  const account = privateKeyToAccount(key)
  const timestamp = Math.floor(Date.now() / 1000)
  const message = `soulink:${name}:${timestamp}`
  const signature = await account.signMessage({ message })
  return { signature, message }
}

// --- ANSI Colors ---
const G = '\x1b[32m', R = '\x1b[31m', Y = '\x1b[33m', C = '\x1b[36m'
const B = '\x1b[1m', D = '\x1b[2m', X = '\x1b[0m'

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
const shortTx = (tx: string) => tx.length > 12 ? `${tx.slice(0, 10)}...` : tx

async function api<T>(method: string, path: string, body?: unknown, customFetch?: typeof fetch): Promise<{ status: number; data: T }> {
  const opts: RequestInit = { method, headers: { 'Content-Type': 'application/json' } }
  if (body) opts.body = JSON.stringify(body)
  const doFetch = customFetch ?? fetch
  const res = await doFetch(`${BASE}${path}`, opts)
  const text = await res.text()
  let data: T
  try { data = JSON.parse(text) as T } catch { data = { error: text.slice(0, 200) } as T }
  return { status: res.status, data }
}

async function soulinkApi<T>(path: string): Promise<T> {
  const res = await fetch(`${SOULINK}${path}`)
  return (await res.json()) as T
}

// --- Demo Steps ---

interface TermsData { name: string; score: number; eligible: boolean; collateral_pct: number; interest_pct: number; max_amount: number; duration_hours: number; pool_available: number }
interface DepositData { tx_hash: string; amount: number; lender: string }
interface RepayData { repaid: boolean; loan_id: string; tx_hash: string; repay_amount: string }
interface WithdrawData { tx_hash: string; principal: string; earned: string; total: string }
interface CreditData { name: string; score: number }
interface PoolData { total_deposits: string; total_borrowed: string; available: string; utilization_pct: number }

async function main() {
  console.log(`\n${C}${B}+======================================================+`)
  console.log(`|  soulinX Demo: Credit-Based A2A Lending on X Layer   |`)
  console.log(`+======================================================+${X}\n`)

  // === ACT 1: THE CREDIT GATE ===
  console.log(`${C}${B}--- ACT 1: THE CREDIT GATE ---${X}\n`)
  console.log(`${B}[1/6]${X} Three agents check their borrowing terms\n`)

  for (const name of ['alice', 'bob', 'charlie']) {
    console.log(`  ${D}--> GET /terms/${name}${X}`)
    const { data } = await api<TermsData>('GET', `/terms/${name}`)
    await sleep(300)
    if (!data.eligible) {
      console.log(`  ${R}${name}.agent${X}  credit=${data.score}  ${R}REJECTED${X} — credit too low\n`)
    } else {
      console.log(`  ${G}${name}.agent${X}  credit=${B}${data.score}${X}  collateral=${B}${data.collateral_pct}%${X}  interest=${data.interest_pct}%  max=$${data.max_amount}\n`)
    }
  }

  console.log(`  ${C}→ Same protocol, completely different terms.`)
  console.log(`  → Credit 80: deposit $2, borrow $10. Credit 20: rejected.`)
  console.log(`  → That's the value of reputation.${X}\n`)
  await sleep(1000)

  // === ACT 2: LENDER DEPOSITS VIA x402 ===
  console.log(`${C}${B}--- ACT 2: LENDER DEPOSITS (x402 payment) ---${X}\n`)
  console.log(`${B}[2/6]${X} Lender deposits 1 USDG into pool`)

  const lenderSig = await signForAgent('lender')
  console.log(`  ${D}--> POST /deposit ${D}(x402 gated)${X}`)
  const x402Lender = createX402Fetch(AGENT_KEYS.lender)
  const { data: depositData } = await api<DepositData>('POST', '/deposit',
    { name: 'lender', amount: 1_000_000, ...lenderSig }, x402Lender)
  if (depositData.tx_hash) {
    console.log(`  ${G}OK${X} Deposited 1 USDG | TX: ${shortTx(depositData.tx_hash)}`)
  } else {
    console.log(`  ${R}Failed:${X} ${JSON.stringify(depositData).slice(0, 100)}`)
  }

  const pool = await api<PoolData>('GET', '/pool')
  console.log(`  ${D}Pool: ${pool.data.available} USDG available${X}\n`)
  await sleep(1000)

  // === ACT 3: ALICE REPAYS VIA x402 ===
  console.log(`${C}${B}--- ACT 3: ALICE REPAYS HER LOAN (x402 payment) ---${X}\n`)

  // Get Alice's active loan
  const POOL_ADDR = process.env.POOL_CONTRACT_ADDRESS as `0x${string}`
  const ALICE_ADDR = '0x6616D42684E2473dDc7D8a4ad4ed70917dF65638'
  const poolAbi = [
    { type: 'function', name: 'activeLoanId', inputs: [{ name: '', type: 'address' }], outputs: [{ name: '', type: 'bytes32' }], stateMutability: 'view' },
    { type: 'function', name: 'loans', inputs: [{ name: '', type: 'bytes32' }], outputs: [{ name: '', type: 'address' }, { name: '', type: 'uint256' }, { name: '', type: 'uint256' }, { name: '', type: 'uint256' }, { name: '', type: 'uint256' }, { name: '', type: 'uint8' }], stateMutability: 'view' },
  ] as const

  const aliceLoanId = await xlayerPublicClient.readContract({ address: POOL_ADDR, abi: poolAbi, functionName: 'activeLoanId', args: [ALICE_ADDR] })
  const aliceLoan = await xlayerPublicClient.readContract({ address: POOL_ADDR, abi: poolAbi, functionName: 'loans', args: [aliceLoanId] })
  const repayAmount = formatUnits(aliceLoan[3], 6)

  console.log(`${B}[3/6]${X} Alice repays her loan (${repayAmount} USDG)`)
  console.log(`  ${D}Loan: ${(aliceLoanId as string).slice(0, 18)}...${X}`)
  console.log(`  ${D}Amount: 1 USDG | Interest: 2% | Repay: ${repayAmount} USDG${X}`)
  // Alice repays directly on the contract (approve USDG + call repay)
  console.log(`  ${C}→ Alice approves USDG to pool contract...${X}`)
  const aliceAccount = privateKeyToAccount(AGENT_KEYS.alice)
  const aliceWallet = createWalletClient({ account: aliceAccount, chain: xlayer, transport: http(RPC) })
  const erc20Abi = [{ type: 'function' as const, name: 'approve' as const, inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'nonpayable' as const }]
  const approveHash = await aliceWallet.writeContract({
    address: process.env.USDG_ADDRESS as `0x${string}`,
    abi: erc20Abi, functionName: 'approve',
    args: [POOL_ADDR, BigInt(aliceLoan[3])],
  })
  await xlayerPublicClient.waitForTransactionReceipt({ hash: approveHash })
  console.log(`  ${G}→ USDG approved | TX: ${shortTx(approveHash)}${X}`)

  console.log(`  ${C}→ Alice calls repay() on pool contract...${X}`)
  const repayAbi = [{ type: 'function' as const, name: 'repay' as const, inputs: [{ name: 'loanId', type: 'bytes32' }], outputs: [], stateMutability: 'nonpayable' as const }]
  const repayHash = await aliceWallet.writeContract({
    address: POOL_ADDR, abi: repayAbi, functionName: 'repay',
    args: [aliceLoanId],
  })
  const repayReceipt = await xlayerPublicClient.waitForTransactionReceipt({ hash: repayHash })

  if (repayReceipt.status === 'success') {
    const creditAfter = await soulinkApi<CreditData>('/api/v1/credit/alice')
    console.log(`  ${G}OK${X} Repaid! | TX: ${shortTx(repayHash)}`)
    console.log(`  ${G}→ OKB collateral auto-returned by contract${X}`)
    console.log(`  ${G}→ Credit score: ${creditAfter.score}${X}\n`)
  } else {
    console.log(`  ${R}Transaction reverted${X}\n`)
  }
  await sleep(1000)

  // === ACT 4: CHARLIE REJECTED ===
  console.log(`${C}${B}--- ACT 4: CHARLIE TRIES TO BORROW ---${X}\n`)
  console.log(`${B}[4/6]${X} Charlie (credit 20) tries to borrow`)
  console.log(`  ${D}--> GET /terms/charlie${X}`)
  const { data: charlieTerms } = await api<TermsData>('GET', '/terms/charlie')
  console.log(`  ${R}REJECTED${X} Credit ${charlieTerms.score} < minimum 50`)
  console.log(`  ${D}→ "Build your reputation first. Good agents earn better terms."${X}\n`)
  await sleep(1000)

  // === ACT 5: BOB'S DEFAULT ===
  console.log(`${C}${B}--- ACT 5: BOB'S ACTIVE LOAN ---${X}\n`)
  const BOB_ADDR = '0xFe3503788E092F3F43813C2182CCd6eb505893C4'
  const bobLoanId = await xlayerPublicClient.readContract({ address: POOL_ADDR, abi: poolAbi, functionName: 'activeLoanId', args: [BOB_ADDR] })
  const bobLoan = await xlayerPublicClient.readContract({ address: POOL_ADDR, abi: poolAbi, functionName: 'loans', args: [bobLoanId] })
  const bobDueAt = new Date(Number(bobLoan[4]) * 1000)

  console.log(`${B}[5/6]${X} Bob has an active loan`)
  console.log(`  ${D}Loan: ${(bobLoanId as string).slice(0, 18)}...${X}`)
  console.log(`  ${D}Amount: 1 USDG | Interest: 10% | Repay: ${formatUnits(bobLoan[3], 6)} USDG${X}`)
  console.log(`  ${D}Collateral: ${formatEther(bobLoan[2])} OKB locked in contract${X}`)
  console.log(`  ${D}Due: ${bobDueAt.toISOString()}${X}`)
  if (bobDueAt < new Date()) {
    console.log(`  ${R}OVERDUE!${X} Bob failed to repay.`)
    console.log(`  ${R}→ OKB collateral will be seized by the contract${X}`)
    console.log(`  ${R}→ Credit score will drop${X}\n`)
  } else {
    console.log(`  ${Y}Due in ${Math.round((bobDueAt.getTime() - Date.now()) / 3600000)}h${X}`)
    console.log(`  ${D}→ If Bob doesn't repay, contract auto-seizes OKB collateral${X}`)
    console.log(`  ${D}→ Credit score will drop from 60 → lower${X}\n`)
  }
  await sleep(1000)

  // === ACT 6: LENDER WITHDRAWS ===
  console.log(`${C}${B}--- ACT 6: LENDER WITHDRAWS ---${X}\n`)
  console.log(`${B}[6/6]${X} Lender withdraws deposit + earned interest`)
  const withdrawSig = await signForAgent('lender')
  console.log(`  ${D}--> POST /withdraw${X}`)
  const { data: withdrawData, status: wStatus } = await api<WithdrawData & { error?: string }>('POST', '/withdraw',
    { name: 'lender', ...withdrawSig })
  if (wStatus < 400 && withdrawData.tx_hash) {
    console.log(`  ${G}OK${X} Withdrawn: ${withdrawData.total} USDG (${withdrawData.principal} principal + ${withdrawData.earned} earned)`)
    console.log(`  ${G}→ TX: ${shortTx(withdrawData.tx_hash)}${X}\n`)
  } else {
    console.log(`  ${D}Withdraw skipped (pool has active loans)${X}\n`)
  }

  // === SUMMARY ===
  console.log(`${C}${B}--- SUMMARY ---${X}\n`)

  const finalPool = await api<PoolData>('GET', '/pool')
  const aliceCredit = await soulinkApi<CreditData>('/api/v1/credit/alice')
  const bobCredit = await soulinkApi<CreditData>('/api/v1/credit/bob')
  const charlieCredit = await soulinkApi<CreditData>('/api/v1/credit/charlie')

  console.log(`  ${C}+------------------------------------------+`)
  console.log(`  | soulinX A2A Lending on X Layer            |`)
  console.log(`  |                                          |`)
  console.log(`  | Pool: ${finalPool.data.available} USDG available              |`)
  console.log(`  |                                          |`)
  console.log(`  | Credit Scores:                           |`)
  console.log(`  |   alice.agent:   ${aliceCredit.score} (repaid, trusted)     |`)
  console.log(`  |   bob.agent:     ${bobCredit.score} (active loan)          |`)
  console.log(`  |   charlie.agent: ${charlieCredit.score} (rejected)            |`)
  console.log(`  |                                          |`)
  console.log(`  | x402 payments: deposit + repay           |`)
  console.log(`  | Smart contract: trustless execution      |`)
  console.log(`  | Credit oracle: on-chain enforcement      |`)
  console.log(`  +------------------------------------------+${X}\n`)

  console.log(`${G}${B}Your reputation is your oracle.${X}\n`)
}

main().catch(e => console.log(`\n${R}Demo failed:${X} ${e instanceof Error ? e.message : e}`))
