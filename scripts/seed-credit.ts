import { createPublicClient, createWalletClient, defineChain, http, type Address, type Hex } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

const OPERATOR_KEY = process.env.OPERATOR_PRIVATE_KEY as Hex | undefined
const POOL = process.env.POOL_CONTRACT_ADDRESS as Address | undefined

if (!OPERATOR_KEY || !POOL) {
  console.error('Set OPERATOR_PRIVATE_KEY and POOL_CONTRACT_ADDRESS env vars')
  process.exit(1)
}

const xlayer = defineChain({
  id: 196, name: 'X Layer',
  nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.xlayer.tech'] } },
})

const account = privateKeyToAccount(OPERATOR_KEY)
const publicClient = createPublicClient({ chain: xlayer, transport: http() })
const walletClient = createWalletClient({ account, chain: xlayer, transport: http() })

// Resolve agent addresses from X Layer registry
const REGISTRY = '0x15d13ED36b337Dff3d5877ed46655037Ee4C1bE0' as Address
const resolveAbi = [{
  type: 'function', name: 'resolve',
  inputs: [{ type: 'string' }],
  outputs: [{ type: 'tuple', components: [
    { type: 'uint256', name: 'tokenId' },
    { type: 'address', name: 'owner' },
    { type: 'bytes32', name: 'soulHash' },
    { type: 'address', name: 'paymentAddress' },
    { type: 'uint256', name: 'registeredAt' },
    { type: 'uint256', name: 'expiresAt' },
  ]}],
  stateMutability: 'view',
}] as const

const poolAbi = [
  { type: 'function', name: 'updateCreditBatch', inputs: [{ type: 'address[]' }, { type: 'uint256[]' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'creditScores', inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
] as const

// Target scores: alice=85, bob=55, charlie=15, lender=50
const SCORES: Record<string, number> = {
  alice: 85,
  bob: 55,
  charlie: 15,
  lender: 50,
}

async function main() {
  console.log('soulinX Credit Seeder — Direct on-chain')
  console.log(`Pool: ${POOL}`)

  const agents: Address[] = []
  const scores: bigint[] = []

  for (const [name, score] of Object.entries(SCORES)) {
    const identity = await publicClient.readContract({
      address: REGISTRY, abi: resolveAbi, functionName: 'resolve', args: [name],
    })
    console.log(`  ${name}.agent → ${identity.owner} → score ${score}`)
    agents.push(identity.owner)
    scores.push(BigInt(score))
  }

  console.log('\nSubmitting batch updateCredit...')
  const hash = await walletClient.writeContract({
    address: POOL!,
    abi: poolAbi,
    functionName: 'updateCreditBatch',
    args: [agents, scores],
  })
  console.log(`TX: ${hash}`)

  // Wait for confirmation with retry
  for (let i = 0; i < 10; i++) {
    try {
      const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 15_000 })
      console.log(`Confirmed: block=${receipt.blockNumber}`)
      break
    } catch {
      await new Promise((r) => setTimeout(r, 3000))
    }
  }

  // Verify scores
  console.log('\nVerifying:')
  for (const [name, expected] of Object.entries(SCORES)) {
    const identity = await publicClient.readContract({
      address: REGISTRY, abi: resolveAbi, functionName: 'resolve', args: [name],
    })
    const score = await publicClient.readContract({
      address: POOL!, abi: poolAbi, functionName: 'creditScores', args: [identity.owner],
    })
    const ok = Number(score) === expected
    console.log(`  ${name}: ${score} ${ok ? '✓' : '✗ (expected ' + expected + ')'}`)
  }
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
