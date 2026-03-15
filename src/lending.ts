import type { LoanTerms } from './types.js'

const TIERS: Array<{ minScore: number; terms: LoanTerms }> = [
  { minScore: 90, terms: { collateralPct: 0, interestPct: 1, maxAmount: 200, durationHours: 168 } },
  { minScore: 80, terms: { collateralPct: 20, interestPct: 2, maxAmount: 100, durationHours: 72 } },
  { minScore: 70, terms: { collateralPct: 50, interestPct: 5, maxAmount: 50, durationHours: 48 } },
  { minScore: 50, terms: { collateralPct: 100, interestPct: 10, maxAmount: 20, durationHours: 24 } },
]

export function calculateTerms(creditScore: number): LoanTerms | null {
  const tier = TIERS.find((t) => creditScore >= t.minScore)
  return tier?.terms ?? null
}

export function calculateCollateral(amount: number, collateralPct: number): number {
  return Math.ceil(amount * collateralPct / 100)
}

export function calculateRepayAmount(amount: number, interestPct: number): number {
  return Math.ceil(amount * (100 + interestPct) / 100)
}

export function calculateFee(amount: number, feeBps: number): { borrowerAmount: number; feeAmount: number } {
  const feeAmount = Math.floor(amount * feeBps / 10000)
  return { borrowerAmount: amount - feeAmount, feeAmount }
}
