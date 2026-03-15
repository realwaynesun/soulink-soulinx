import { privateKeyToAccount } from 'viem/accounts'
import type { Hex } from 'viem'

const keys: Record<string, Hex> = {
  lender: process.env.LENDER_KEY as Hex,
  alice: process.env.ALICE_KEY as Hex,
  bob: process.env.BOB_KEY as Hex,
  charlie: process.env.CHARLIE_KEY as Hex,
}

async function main() {
  console.log('=== Key Addresses vs On-Chain Owners ===\n')
  for (const [name, key] of Object.entries(keys)) {
    const acc = privateKeyToAccount(key)
    const r = await fetch(`https://soulink.dev/api/v1/names/${name}`)
    const d = await r.json() as { owner?: string; error?: string }
    const match = d.owner?.toLowerCase() === acc.address.toLowerCase()
    console.log(`${name}:`)
    console.log(`  key addr:  ${acc.address}`)
    console.log(`  on-chain:  ${d.owner ?? d.error}`)
    console.log(`  match:     ${match ? 'YES' : 'NO !!!'}`)
  }
}

main()
