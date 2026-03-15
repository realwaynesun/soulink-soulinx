import { z } from 'zod'
import type { Address, Hex } from 'viem'
import type { AppConfig } from './types.js'

const schema = z.object({
  OPERATOR_PRIVATE_KEY: z.string().startsWith('0x'),
  SOULINK_BASE_URL: z.string().default('https://soulink.dev'),
  SOULINK_FEE_ADDRESS: z.string().startsWith('0x'),
  PLATFORM_FEE_BPS: z.coerce.number().default(100),
  PORT: z.coerce.number().default(4030),
  DB_PATH: z.string().default('./soulinx.db'),
  CORS_ORIGIN: z.string().default('*'),
  RPC_URL: z.string().default('https://rpc.xlayer.tech'),
  USDG_ADDRESS: z.string().default('0x4ae46a509f6b1d9056937ba4500cb143933d2dc8'),
  POOL_CONTRACT_ADDRESS: z.string().startsWith('0x'),
  POOL_AGENT_NAME: z.string().min(3).max(32),
})

const parsed = schema.parse(process.env)

export const config: AppConfig = {
  operatorPrivateKey: parsed.OPERATOR_PRIVATE_KEY as Hex,
  soulinkBaseUrl: parsed.SOULINK_BASE_URL,
  soulinkFeeAddress: parsed.SOULINK_FEE_ADDRESS as Address,
  platformFeeBps: parsed.PLATFORM_FEE_BPS,
  port: parsed.PORT,
  dbPath: parsed.DB_PATH,
  corsOrigin: parsed.CORS_ORIGIN,
  rpcUrl: parsed.RPC_URL,
  usdgAddress: parsed.USDG_ADDRESS as Address,
  poolContractAddress: parsed.POOL_CONTRACT_ADDRESS as Address,
  poolAgentName: parsed.POOL_AGENT_NAME,
}
