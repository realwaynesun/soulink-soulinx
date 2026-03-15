import { createPublicClient, createWalletClient, defineChain, http, type Hex } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import poolAbi from '../src/pool-abi.json' with { type: 'json' }

const RPC = process.env.RPC_URL ?? 'https://xlayerrpc.okx.com'
const xlayer = defineChain({ id: 196, name: 'X Layer', nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 }, rpcUrls: { default: { http: [RPC] } } })
const account = privateKeyToAccount(process.env.OPERATOR_PRIVATE_KEY as Hex)
const walletClient = createWalletClient({ account, chain: xlayer, transport: http(RPC) })
const publicClient = createPublicClient({ chain: xlayer, transport: http(RPC) })
const POOL = process.env.POOL_CONTRACT_ADDRESS as `0x${string}`

const AGENTS = [
  ['Alice', '0x6616D42684E2473dDc7D8a4ad4ed70917dF65638'],
  ['Bob', '0xFe3503788E092F3F43813C2182CCd6eb505893C4'],
] as const

async function main() {
  for (const [name, addr] of AGENTS) {
    const loanId = await publicClient.readContract({
      address: POOL, abi: poolAbi as any, functionName: 'activeLoanId', args: [addr],
    }) as Hex
    if (loanId === '0x0000000000000000000000000000000000000000000000000000000000000000') {
      console.log(`${name}: no active loan`)
      continue
    }
    console.log(`${name}: defaulting loan ${loanId.slice(0, 18)}...`)
    try {
      const hash = await walletClient.writeContract({
        address: POOL, abi: poolAbi as any, functionName: 'defaultLoan', args: [loanId],
      })
      const r = await publicClient.waitForTransactionReceipt({ hash })
      console.log(`  TX: ${hash} status: ${r.status}`)
    } catch (e) {
      console.log(`  Failed: ${e instanceof Error ? e.message.slice(0, 100) : e}`)
    }
  }
}
main()
