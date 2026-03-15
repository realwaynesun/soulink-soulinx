const BASE_URL = process.env.SOULINK_BASE_URL ?? 'https://soulink.dev'
const SOULINX_URL = process.env.SOULINX_URL ?? 'http://localhost:4030'

const AGENTS = ['lender', 'alice', 'bob', 'charlie'] as const

const G = '\x1b[32m'
const R = '\x1b[31m'
const Y = '\x1b[33m'
const C = '\x1b[36m'
const D = '\x1b[2m'
const X = '\x1b[0m'

function header(text: string) {
  console.log(`\n${C}--- ${text} ---${X}\n`)
}

async function checkAgent(name: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/api/v1/names/${name}`)
    if (!res.ok) return false
    const data = (await res.json()) as { owner?: string }
    return !!data.owner
  } catch {
    return false
  }
}

async function checkCredit(name: string): Promise<number | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/v1/credit/${name}`)
    if (!res.ok) return null
    const data = (await res.json()) as { score: number }
    return data.score
  } catch {
    return null
  }
}

async function checkServer(): Promise<boolean> {
  try {
    const res = await fetch(`${SOULINX_URL}/health`)
    return res.ok
  } catch {
    return false
  }
}

async function main() {
  console.log(`${C}soulinX Demo Setup Check${X}`)

  header('1. soulinX Server')
  const serverOk = await checkServer()
  console.log(serverOk
    ? `  ${G}OK${X} soulinX running at ${SOULINX_URL}`
    : `  ${R}MISSING${X} Start server: cd soulinx && npm run dev`)

  header('2. Agent Registration')
  for (const name of AGENTS) {
    const ok = await checkAgent(name)
    console.log(ok
      ? `  ${G}OK${X} ${name}.agent registered`
      : `  ${R}MISSING${X} Register ${name}.agent ($1 USDC on soulink.dev)`)
  }

  header('3. Credit Scores')
  const targets: Record<string, { want: string; min: number; max: number }> = {
    alice: { want: '~85', min: 80, max: 95 },
    bob: { want: '~50', min: 40, max: 60 },
    charlie: { want: '~15', min: 0, max: 30 },
  }
  for (const [name, t] of Object.entries(targets)) {
    const score = await checkCredit(name)
    if (score === null) {
      console.log(`  ${R}ERR${X}  ${name} — could not fetch credit`)
    } else if (score >= t.min && score <= t.max) {
      console.log(`  ${G}OK${X} ${name} credit=${score} (target ${t.want})`)
    } else {
      console.log(`  ${Y}ADJ${X} ${name} credit=${score}, need ${t.want}`)
    }
  }

  header('4. Seed Credit Reports')
  console.log(`${D}# To seed credit reports, use real EIP-191 signatures.${X}`)
  console.log(`${D}# Sign with the reporter's private key:${X}`)
  console.log(`${D}#   message = "soulink:{reporter_name}:{unix_timestamp}"${X}`)
  console.log(`${D}#   signature = EIP-191 personal_sign(message, reporter_private_key)${X}`)
  console.log(`${D}#   POST /api/v1/credit/report with real signature + message${X}`)
}

main()
