import { privateKeyToAccount } from 'viem/accounts'
import type { Hex } from 'viem'

const SOULINK = process.env.SOULINK_BASE_URL ?? 'https://soulink.dev'

const AGENTS: Record<string, Hex> = {
  lender: process.env.LENDER_KEY as Hex,
  alice: process.env.ALICE_KEY as Hex,
  bob: process.env.BOB_KEY as Hex,
  charlie: process.env.CHARLIE_KEY as Hex,
  'soulinx-pool': process.env.OPERATOR_PRIVATE_KEY as Hex,
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

async function submitReport(
  reporter: string, target: string, score: 1 | -1, action: string,
) {
  const key = AGENTS[reporter]
  if (!key) return
  const account = privateKeyToAccount(key)
  const ts = Math.floor(Date.now() / 1000)
  const message = `soulink:${reporter}:${ts}`
  const signature = await account.signMessage({ message })

  await sleep(1500)
  const res = await fetch(`${SOULINK}/api/v1/credit/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agent: target, score, action,
      reporter_name: reporter,
      reporter_signature: signature,
      reporter_message: message,
    }),
  })
  const text = await res.text()
  let status: string
  try {
    const data = JSON.parse(text) as { recorded?: boolean; error?: string }
    status = data.recorded ? 'OK' : data.error ?? 'failed'
  } catch {
    status = `HTTP ${res.status} (rate limited, retrying...)`
    await sleep(5000)
  }
  console.log(`  ${reporter} → ${target} (${score > 0 ? '+' : ''}${score} ${action}): ${status}`)
}

async function checkScore(name: string) {
  const res = await fetch(`${SOULINK}/api/v1/credit/${name}`)
  const d = await res.json() as { score: number; total_reports: number }
  console.log(`  ${name}.agent: score=${d.score} (${d.total_reports} reports)`)
}

async function main() {
  console.log('=== Seeding Credit Scores ===\n')

  // Raise alice: multiple positive reports from different agents
  console.log('Raising alice credit:')
  const reporters = ['lender', 'bob', 'charlie', 'soulinx-pool']
  const positiveActions = ['task_completed', 'payment_on_time']
  for (const reporter of reporters) {
    for (const action of positiveActions) {
      await submitReport(reporter, 'alice', 1, action)
    }
  }

  // Lower charlie: multiple negative reports
  console.log('\nLowering charlie credit:')
  const negReporters = ['lender', 'alice', 'bob', 'soulinx-pool']
  const negActions = ['violation', 'task_failed']
  for (const reporter of negReporters) {
    for (const action of negActions) {
      await submitReport(reporter, 'charlie', -1, action)
    }
  }

  // Give bob a couple reports to make him mid-range
  console.log('\nSetting bob to mid credit:')
  await submitReport('lender', 'bob', 1, 'task_completed')
  await submitReport('alice', 'bob', 1, 'task_completed')
  await submitReport('charlie', 'bob', -1, 'violation')

  console.log('\n=== Final Credit Scores ===')
  for (const name of ['alice', 'bob', 'charlie', 'lender']) {
    await checkScore(name)
  }
}

main().catch(console.error)
