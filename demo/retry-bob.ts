import { createPublicClient, createWalletClient, defineChain, http, parseEther, formatEther } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

const xlayer = defineChain({
  id: 196, name: 'X Layer',
  nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.xlayer.tech'] } },
})

const account = privateKeyToAccount(process.env.OPERATOR_PRIVATE_KEY as `0x${string}`)
const walletClient = createWalletClient({ account, chain: xlayer, transport: http() })
const publicClient = createPublicClient({ chain: xlayer, transport: http() })

const BOB = '0xFe3503788E092F3F43813C2182CCd6eb505893C4' as const
const ALICE = '0x6616D42684E2473dDc7D8a4ad4ed70917dF65638' as const
const LENDER = '0x69042589Ab72312F0F7aa52CFC2026280b2795Fe' as const

async function main() {
  console.log('Sending 0.02 OKB to Bob...')
  const h = await walletClient.sendTransaction({ to: BOB, value: parseEther('0.02') })
  const r = await publicClient.waitForTransactionReceipt({ hash: h })
  console.log('TX:', h, 'status:', r.status)

  console.log('\n--- Balances ---')
  for (const [name, addr] of [['Operator', account.address], ['Lender', LENDER], ['Alice', ALICE], ['Bob', BOB]] as const) {
    const okb = await publicClient.getBalance({ address: addr })
    console.log(`${name}: ${formatEther(okb)} OKB`)
  }
}

main().catch(console.error)
