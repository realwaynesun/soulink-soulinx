import type { Address, Hex } from 'viem'

// --- Credit & Lending ---

export interface LoanTerms {
  collateralPct: number
  interestPct: number
  maxAmount: number
  durationHours: number
}

export interface TermsResponse {
  name: string
  score: number
  eligible: boolean
  collateral_pct: number
  interest_pct: number
  max_amount: number
  duration_hours: number
  pool_available: number
}

// --- Soulink API ---

export interface SoulinkResolveResponse {
  name: string
  owner: string
  expires_at: string
}

export interface SoulinkCreditResponse {
  name: string
  score: number
  total_reports: number
  positive: number
  negative: number
  updated_at: string | null
}

export interface SoulinkVerifyResponse {
  valid: boolean
  name?: string
  owner?: string
  error?: string
}

export interface SoulinkReportRequest {
  agent: string
  score: 1 | -1
  action: string
  context?: string
  reporter_name: string
  reporter_signature: string
  reporter_message: string
}

// --- Pool ---

export interface PoolStats {
  total_deposits: string
  total_borrowed: string
  available: string
  utilization_pct: number
}

// --- Config ---

export interface AppConfig {
  operatorPrivateKey: Hex
  soulinkBaseUrl: string
  soulinkFeeAddress: Address
  platformFeeBps: number
  port: number
  dbPath: string
  corsOrigin: string
  rpcUrl: string
  usdgAddress: Address
  poolContractAddress: Address
  poolAgentName: string
}
