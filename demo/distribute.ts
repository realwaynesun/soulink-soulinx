import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  parseEther,
  formatEther,
  formatUnits,
  type Address,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

const OPERATOR_KEY = process.env.OPERATOR_PRIVATE_KEY as `0x${string}`
if (!OPERATOR_KEY) throw new Error('Set OPERATOR_PRIVATE_KEY')

const USDG = '0x4ae46a509f6b1d9056937ba4500cb143933d2dc8' as Address

const xlayer = defineChain({
  id: 196,
  name: 'X Layer',
  nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.xlayer.tech'] } },
  blockExplorers: { default: { name: 'OKLink', url: 'https://www.oklink.com/xlayer' } },
})

const account = privateKeyToAccount(OPERATOR_KEY)
const walletClient = createWalletClient({ account, chain: xlayer, transport: http() })
const publicClient = createPublicClient({ chain: xlayer, transport: http() })

const erc20Abi = [
  {
    type: 'function' as const, name: 'transfer' as const,
    inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }], stateMutability: 'nonpayable' as const,
  },
  {
    type: 'function' as const, name: 'balanceOf' as const,
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' as const,
  },
] as const

const TRANSFERS = [
  { name: 'Lender', to: '0x69042589Ab72312F0F7aa52CFC2026280b2795Fe' as Address, usdg: 5_000_000, okb: '0.01' },
  { name: 'Alice',  to: '0x6616D42684E2473dDc7D8a4ad4ed70917dF65638' as Address, usdg: 4_000_000, okb: '0.01' },
  { name: 'Bob',    to: '0xFe3503788E092F3F43813C2182CCd6eb505893C4' as Address, usdg: 0,         okb: '0.02' },
]

async function checkBalance(addr: Address, label: string) {
  const okb = await publicClient.getBalance({ address: addr })
  const usdg = await publicClient.readContract({ address: USDG, abi: erc20Abi, functionName: 'balanceOf', args: [addr] })
  console.log(`  ${label}: ${formatEther(okb)} OKB | ${formatUnits(usdg, 6)} USDG`)
}

async function main() {
  console.log('\n=== soulinX Fund Distribution ===\n')
  console.log('Operator:', account.address)
  await checkBalance(account.address, 'Operator')

  for (const t of TRANSFERS) {
    console.log(`\n--- ${t.name} (${t.to.slice(0, 10)}...) ---`)

    if (t.usdg > 0) {
      console.log(`  Sending ${formatUnits(BigInt(t.usdg), 6)} USDG...`)
      const hash = await walletClient.writeContract({
        address: USDG, abi: erc20Abi, functionName: 'transfer', args: [t.to, BigInt(t.usdg)],
      })
      await publicClient.waitForTransactionReceipt({ hash })
      console.log(`  USDG TX: https://www.oklink.com/xlayer/tx/${hash}`)
    }

    if (parseFloat(t.okb) > 0) {
      console.log(`  Sending ${t.okb} OKB...`)
      const hash = await walletClient.sendTransaction({ to: t.to, value: parseEther(t.okb) })
      await publicClient.waitForTransactionReceipt({ hash })
      console.log(`  OKB TX: https://www.oklink.com/xlayer/tx/${hash}`)
    }

    await checkBalance(t.to, t.name)
  }

  console.log('\n--- Final Operator Balance ---')
  await checkBalance(account.address, 'Operator')
  console.log('\n=== Distribution Complete ===\n')
}

main().catch(console.error)
