import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'

const AGENTS = ['lender', 'alice', 'bob', 'charlie', 'soulinx-pool'] as const

console.log('# === soulinX Demo Agent Wallets ===')
console.log('# Generated at', new Date().toISOString())
console.log('# Add these to soulinx/.env and demo/.env\n')

for (const name of AGENTS) {
  const key = generatePrivateKey()
  const account = privateKeyToAccount(key)
  const envName = name.replace('-', '_').toUpperCase()
  console.log(`# ${name}.agent → ${account.address}`)
  console.log(`${envName}_KEY=${key}\n`)
}

console.log('# === Operator wallet (same key as OPERATOR_PRIVATE_KEY) ===')
console.log('# The operator deploys the contract and runs the soulinX server.')
console.log('# Fund this wallet with OKB (gas) + USDG on X Layer.')
