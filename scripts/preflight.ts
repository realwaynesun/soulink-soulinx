import { createPublicClient, defineChain, http, formatEther, formatUnits, erc20Abi, type Address } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

const SOULINK = process.env.SOULINK_BASE_URL ?? 'https://soulink.dev'
const SOULINX_URL = process.env.SOULINX_URL ?? 'http://localhost:4030'
const POOL_ADDRESS = process.env.POOL_CONTRACT_ADDRESS
const OPERATOR_KEY = process.env.OPERATOR_PRIVATE_KEY
const USDG = '0x4ae46a509F6b1D9056937BA4500cb143933D2dc8'

const G = '\x1b[32m'
const R = '\x1b[31m'
const Y = '\x1b[33m'
const D = '\x1b[2m'
const X = '\x1b[0m'

const xlayer = defineChain({
  id: 196,
  name: 'X Layer',
  nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.xlayer.tech'] } },
})

const client = createPublicClient({ chain: xlayer, transport: http() })

function pass(msg: string) { console.log(`  ${G}PASS${X} ${msg}`) }
function fail(msg: string) { console.log(`  ${R}FAIL${X} ${msg}`) }
function warn(msg: string) { console.log(`  ${Y}WARN${X} ${msg}`) }

async function checkSoulink(): Promise<boolean> {
  try {
    const res = await fetch(`${SOULINK}/health`)
    return res.ok
  } catch { return false }
}

async function checkSoulinx(): Promise<boolean> {
  try {
    const res = await fetch(`${SOULINX_URL}/health`)
    return res.ok
  } catch { return false }
}

async function checkAgent(name: string): Promise<boolean> {
  try {
    const res = await fetch(`${SOULINK}/api/v1/names/${name}`)
    if (!res.ok) return false
    const data = (await res.json()) as { owner?: string }
    return !!data.owner
  } catch { return false }
}

async function checkCredit(name: string): Promise<number | null> {
  try {
    const res = await fetch(`${SOULINK}/api/v1/credit/${name}`)
    if (!res.ok) return null
    const data = (await res.json()) as { score: number }
    return data.score
  } catch { return null }
}

async function main() {
  console.log('\nsoulinX Pre-flight Check\n')
  let allGood = true

  // 1. Services
  console.log('1. Services')
  const soulinkOk = await checkSoulink()
  soulinkOk ? pass(`Soulink API at ${SOULINK}`) : fail(`Soulink API unreachable`)
  allGood &&= soulinkOk

  const soulinxOk = await checkSoulinx()
  soulinxOk ? pass(`soulinX server at ${SOULINX_URL}`) : fail(`soulinX server not running`)
  allGood &&= soulinxOk

  // 2. Contract
  console.log('\n2. Contract')
  if (!POOL_ADDRESS) {
    fail('POOL_CONTRACT_ADDRESS not set')
    allGood = false
  } else {
    const code = await client.getCode({ address: POOL_ADDRESS as Address })
    code && code !== '0x' ? pass(`Pool contract at ${POOL_ADDRESS}`) : fail(`No contract at ${POOL_ADDRESS}`)
    allGood &&= !!code && code !== '0x'
  }

  // 3. Operator wallet
  console.log('\n3. Operator Wallet')
  if (!OPERATOR_KEY) {
    fail('OPERATOR_PRIVATE_KEY not set')
    allGood = false
  } else {
    const account = privateKeyToAccount(OPERATOR_KEY as `0x${string}`)
    const [okb, usdgBal] = await Promise.all([
      client.getBalance({ address: account.address }),
      client.readContract({ address: USDG as Address, abi: erc20Abi, functionName: 'balanceOf', args: [account.address] }),
    ])
    const okbStr = formatEther(okb)
    const usdgStr = formatUnits(usdgBal, 6)
    Number(okbStr) > 0.01 ? pass(`OKB: ${okbStr}`) : fail(`OKB: ${okbStr} (need gas)`)
    Number(usdgStr) > 0 ? pass(`USDG: ${usdgStr}`) : warn(`USDG: ${usdgStr} (need for demo)`)
    console.log(`  ${D}Address: ${account.address}${X}`)
  }

  // 4. Agent registration
  console.log('\n4. Agent Registration')
  for (const name of ['lender', 'alice', 'bob', 'charlie', 'soulinx-pool']) {
    const ok = await checkAgent(name)
    ok ? pass(`${name}.agent`) : fail(`${name}.agent not registered`)
    allGood &&= ok
  }

  // 5. Credit scores
  console.log('\n5. Credit Scores')
  const targets: Record<string, { want: string; min: number; max: number }> = {
    alice: { want: '80-89', min: 80, max: 89 },
    bob: { want: '50-69', min: 50, max: 69 },
    charlie: { want: '<50', min: 0, max: 49 },
  }
  for (const [name, t] of Object.entries(targets)) {
    const score = await checkCredit(name)
    if (score === null) {
      fail(`${name} — no credit data`)
      allGood = false
    } else if (score >= t.min && score <= t.max) {
      pass(`${name} credit=${score} (target ${t.want})`)
    } else {
      warn(`${name} credit=${score} (want ${t.want})`)
    }
  }

  // 6. Demo agent keys
  console.log('\n6. Demo Agent Keys')
  for (const [env, name] of [['LENDER_KEY', 'lender'], ['ALICE_KEY', 'alice'], ['BOB_KEY', 'bob']]) {
    process.env[env] ? pass(`${env} set`) : fail(`${env} not set (needed for demo)`)
    allGood &&= !!process.env[env]
  }

  console.log(`\n${allGood ? G + 'ALL CHECKS PASSED' : R + 'SOME CHECKS FAILED'}${X}\n`)
  process.exit(allGood ? 0 : 1)
}

main().catch((err) => {
  console.error('Preflight failed:', err.message)
  process.exit(1)
})
