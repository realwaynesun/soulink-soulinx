import { privateKeyToAccount } from 'viem/accounts'
import { createPublicClient, createWalletClient, defineChain, http, keccak256, toHex, type Hex, type Address } from 'viem'

const REGISTRY = '0x15d13ED36b337Dff3d5877ed46655037Ee4C1bE0' as Address
const OPERATOR_KEY = (process.env.OPERATOR_PRIVATE_KEY ?? process.env.PAYER_KEY) as Hex | undefined

if (!OPERATOR_KEY) {
  console.error('Set OPERATOR_PRIVATE_KEY env var')
  process.exit(1)
}

const AGENTS: Array<{ name: string; envKey: string }> = [
  { name: 'lender', envKey: 'LENDER_KEY' },
  { name: 'alice', envKey: 'ALICE_KEY' },
  { name: 'bob', envKey: 'BOB_KEY' },
  { name: 'charlie', envKey: 'CHARLIE_KEY' },
  { name: 'soulinx-pool', envKey: 'SOULINX_POOL_KEY' },
]

const xlayer = defineChain({
  id: 196,
  name: 'X Layer',
  nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.xlayer.tech'] } },
})

const account = privateKeyToAccount(OPERATOR_KEY)
const publicClient = createPublicClient({ chain: xlayer, transport: http() })
const walletClient = createWalletClient({ account, chain: xlayer, transport: http() })

const registryAbi = [
  {
    type: 'function', name: 'registerFor', stateMutability: 'nonpayable',
    inputs: [
      { type: 'string', name: 'name' },
      { type: 'address', name: 'agentOwner' },
      { type: 'bytes32', name: 'soulHash' },
      { type: 'address', name: 'paymentAddress' },
    ],
    outputs: [],
  },
  {
    type: 'function', name: 'resolve',
    inputs: [{ type: 'string', name: 'name' }],
    outputs: [{ type: 'address' }],
    stateMutability: 'view',
  },
] as const

async function isRegistered(name: string): Promise<boolean> {
  try {
    const addr = await publicClient.readContract({
      address: REGISTRY, abi: registryAbi, functionName: 'resolve', args: [name],
    })
    return addr !== '0x0000000000000000000000000000000000000000'
  } catch {
    return false
  }
}

async function registerAgent(name: string, ownerKey: Hex): Promise<string | null> {
  const ownerAccount = privateKeyToAccount(ownerKey)
  const soulHash = keccak256(toHex(name))

  console.log(`  Registering ${name}.agent → ${ownerAccount.address}`)

  const hash = await walletClient.writeContract({
    address: REGISTRY,
    abi: registryAbi,
    functionName: 'registerFor',
    args: [name, ownerAccount.address, soulHash, ownerAccount.address],
  })

  console.log(`  TX: ${hash}`)

  // X Layer RPC sometimes returns "block is out of range" for recent blocks
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 15_000 })
      if (receipt.status === 'reverted') {
        console.error(`  REVERTED`)
        return null
      }
      console.log(`  OK: block=${receipt.blockNumber}`)
      return hash
    } catch {
      await new Promise((r) => setTimeout(r, 3000))
    }
  }

  // Verify by checking if registration succeeded even without receipt
  const registered = await isRegistered(name)
  if (registered) {
    console.log(`  OK: confirmed via resolve()`)
    return hash
  }
  console.error(`  UNCONFIRMED: TX submitted but could not verify`)
  return hash
}

async function main() {
  console.log('soulinX Agent Registration — X Layer Direct')
  console.log(`Operator: ${account.address}`)
  console.log(`Registry: ${REGISTRY}\n`)

  const txHashes: string[] = []

  for (const { name, envKey } of AGENTS) {
    const key = process.env[envKey] as Hex | undefined
    if (!key) {
      console.log(`SKIP ${name} — ${envKey} not set`)
      continue
    }

    const registered = await isRegistered(name)
    if (registered) {
      console.log(`SKIP ${name}.agent — already registered`)
      continue
    }

    const hash = await registerAgent(name, key)
    if (hash) txHashes.push(hash)

    await new Promise((r) => setTimeout(r, 500))
  }

  console.log(`\nRegistered ${txHashes.length} agents`)
  if (txHashes.length > 0) {
    console.log('TX hashes (for hackathon submission):')
    txHashes.forEach((h) => console.log(`  ${h}`))
  }
}

main().catch((err) => {
  console.error('Registration failed:', err)
  process.exit(1)
})
