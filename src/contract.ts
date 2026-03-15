import {
  createPublicClient,
  createWalletClient,
  defineChain,
  erc20Abi,
  http,
  maxUint256,
  type Address,
  type Hex,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import poolAbi from './pool-abi.json' with { type: 'json' }
import { config } from './config.js'

const xlayer = defineChain({
  id: 196,
  name: 'X Layer',
  nativeCurrency: { name: 'OKB', symbol: 'OKB', decimals: 18 },
  rpcUrls: { default: { http: [config.rpcUrl] } },
  blockExplorers: { default: { name: 'OKLink', url: 'https://www.oklink.com/xlayer' } },
})

const account = privateKeyToAccount(config.operatorPrivateKey)
const abi = poolAbi as typeof poolAbi

export const walletClient = createWalletClient({
  account,
  chain: xlayer,
  transport: http(),
})

export const publicClient = createPublicClient({
  chain: xlayer,
  transport: http(),
})

// X Layer RPC can return "block is out of range" during polling. Retry with delay.
export async function waitForTx(hash: `0x${string}`, retries = 5): Promise<{ status: string }> {
  for (let i = 0; i < retries; i++) {
    try {
      return await publicClient.waitForTransactionReceipt({ hash, pollingInterval: 3000 })
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      if (msg.includes('block is out of range') && i < retries - 1) {
        await new Promise(r => setTimeout(r, 3000))
        continue
      }
      throw e
    }
  }
  throw new Error('waitForTx exhausted retries')
}

const addr = config.poolContractAddress

export const pool = {
  read: {
    totalDeposits: () => publicClient.readContract({ address: addr, abi, functionName: 'totalDeposits' }) as Promise<bigint>,
    totalBorrowed: () => publicClient.readContract({ address: addr, abi, functionName: 'totalBorrowed' }) as Promise<bigint>,
    available: () => publicClient.readContract({ address: addr, abi, functionName: 'available' }) as Promise<bigint>,
    lenderDeposits: (a: Address) => publicClient.readContract({ address: addr, abi, functionName: 'lenderDeposits', args: [a] }) as Promise<bigint>,
    lenderEarned: (a: Address) => publicClient.readContract({ address: addr, abi, functionName: 'lenderEarned', args: [a] }) as Promise<bigint>,
    okbCollateral: (a: Address) => publicClient.readContract({ address: addr, abi, functionName: 'okbCollateral', args: [a] }) as Promise<bigint>,
    activeLoanId: (a: Address) => publicClient.readContract({ address: addr, abi, functionName: 'activeLoanId', args: [a] }) as Promise<Hex>,
    loans: (id: Hex) => publicClient.readContract({ address: addr, abi, functionName: 'loans', args: [id] }) as Promise<readonly [Address, bigint, bigint, bigint, bigint, number]>,
    creditScores: (a: Address) => publicClient.readContract({ address: addr, abi, functionName: 'creditScores', args: [a] }) as Promise<bigint>,
    getCollateralPct: (score: bigint) => publicClient.readContract({ address: addr, abi, functionName: 'getCollateralPct', args: [score] }) as Promise<bigint>,
    getInterestPct: (score: bigint) => publicClient.readContract({ address: addr, abi, functionName: 'getInterestPct', args: [score] }) as Promise<bigint>,
  },
  write: {
    depositFor: (lender: Address, amount: bigint) => walletClient.writeContract({ address: addr, abi, functionName: 'depositFor', args: [lender, amount] }),
    withdrawFor: (lender: Address) => walletClient.writeContract({ address: addr, abi, functionName: 'withdrawFor', args: [lender] }),
    approveLoan: (id: Hex, borrower: Address, amount: bigint, okbPriceX18: bigint) => walletClient.writeContract({ address: addr, abi, functionName: 'approveLoan', args: [id, borrower, amount, okbPriceX18] }),
    repayFor: (id: Hex, borrower: Address) => walletClient.writeContract({ address: addr, abi, functionName: 'repayFor', args: [id, borrower] }),
    defaultLoan: (id: Hex) => walletClient.writeContract({ address: addr, abi, functionName: 'defaultLoan', args: [id] }),
    updateCredit: (agent: Address, score: bigint) => walletClient.writeContract({ address: addr, abi, functionName: 'updateCredit', args: [agent, score] }),
    distributeInterest: (lender: Address, amount: bigint) => walletClient.writeContract({ address: addr, abi, functionName: 'distributeInterest', args: [lender, amount] }),
  },
}

export async function approveUsdgToPool(): Promise<void> {
  // Check if already approved
  const allowance = await publicClient.readContract({
    address: config.usdgAddress,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [account.address, config.poolContractAddress],
  })
  if (allowance > 0n) {
    console.log('USDG already approved to pool contract, skipping.')
    return
  }
  const hash = await walletClient.writeContract({
    address: config.usdgAddress,
    abi: erc20Abi,
    functionName: 'approve',
    args: [config.poolContractAddress, maxUint256],
  })
  const receipt = await publicClient.waitForTransactionReceipt({ hash })
  if (receipt.status === 'reverted') throw new Error('USDG approval to pool contract reverted')
}
