import { describe, it, expect } from 'vitest'
import { calculateTerms, calculateCollateral, calculateRepayAmount, calculateFee } from '../src/lending.js'

describe('calculateTerms', () => {
  it('returns top tier for score 95', () => {
    expect(calculateTerms(95)).toEqual({
      collateralPct: 0, interestPct: 1, maxAmount: 200, durationHours: 168,
    })
  })

  it('returns top tier at boundary score 90', () => {
    expect(calculateTerms(90)).toEqual({
      collateralPct: 0, interestPct: 1, maxAmount: 200, durationHours: 168,
    })
  })

  it('returns second tier for score 85', () => {
    expect(calculateTerms(85)).toEqual({
      collateralPct: 20, interestPct: 2, maxAmount: 100, durationHours: 72,
    })
  })

  it('returns second tier at boundary score 80', () => {
    expect(calculateTerms(80)).toEqual({
      collateralPct: 20, interestPct: 2, maxAmount: 100, durationHours: 72,
    })
  })

  it('returns third tier for score 75', () => {
    expect(calculateTerms(75)).toEqual({
      collateralPct: 50, interestPct: 5, maxAmount: 50, durationHours: 48,
    })
  })

  it('returns third tier at boundary score 70', () => {
    expect(calculateTerms(70)).toEqual({
      collateralPct: 50, interestPct: 5, maxAmount: 50, durationHours: 48,
    })
  })

  it('returns fourth tier for score 55', () => {
    expect(calculateTerms(55)).toEqual({
      collateralPct: 100, interestPct: 10, maxAmount: 20, durationHours: 24,
    })
  })

  it('returns fourth tier at boundary score 50', () => {
    expect(calculateTerms(50)).toEqual({
      collateralPct: 100, interestPct: 10, maxAmount: 20, durationHours: 24,
    })
  })

  it('rejects score 49', () => {
    expect(calculateTerms(49)).toBeNull()
  })

  it('rejects score 0', () => {
    expect(calculateTerms(0)).toBeNull()
  })

  it('returns top tier for perfect score 100', () => {
    const terms = calculateTerms(100)
    expect(terms).not.toBeNull()
    expect(terms!.collateralPct).toBe(0)
  })
})

describe('calculateCollateral', () => {
  it('calculates 20% collateral on 100 USDC', () => {
    expect(calculateCollateral(100_000000, 20)).toBe(20_000000)
  })

  it('returns 0 for 0% collateral', () => {
    expect(calculateCollateral(100_000000, 0)).toBe(0)
  })

  it('returns full amount for 100% collateral', () => {
    expect(calculateCollateral(100_000000, 100)).toBe(100_000000)
  })

  it('calculates 50% collateral on 50 USDC', () => {
    expect(calculateCollateral(50_000000, 50)).toBe(25_000000)
  })

  it('rounds up with Math.ceil for 1 USDC at 20%', () => {
    expect(calculateCollateral(1_000000, 20)).toBe(200000)
  })
})

describe('calculateRepayAmount', () => {
  it('calculates 2% interest on 50 USDC', () => {
    expect(calculateRepayAmount(50_000000, 2)).toBe(51_000000)
  })

  it('calculates 10% interest on 50 USDC', () => {
    expect(calculateRepayAmount(50_000000, 10)).toBe(55_000000)
  })

  it('calculates 1% interest on 100 USDC', () => {
    expect(calculateRepayAmount(100_000000, 1)).toBe(101_000000)
  })

  it('calculates 5% interest on 20 USDC', () => {
    expect(calculateRepayAmount(20_000000, 5)).toBe(21_000000)
  })
})

describe('calculateFee', () => {
  it('calculates 1% fee on 50 USDC', () => {
    expect(calculateFee(50_000000, 100)).toEqual({
      borrowerAmount: 49_500000,
      feeAmount: 500000,
    })
  })

  it('calculates 1% fee on 100 USDC', () => {
    expect(calculateFee(100_000000, 100)).toEqual({
      borrowerAmount: 99_000000,
      feeAmount: 1_000000,
    })
  })

  it('calculates 1% fee on 15 USDC', () => {
    expect(calculateFee(15_000000, 100)).toEqual({
      borrowerAmount: 14_850000,
      feeAmount: 150000,
    })
  })

  it('returns full amount when fee is 0 bps', () => {
    expect(calculateFee(50_000000, 0)).toEqual({
      borrowerAmount: 50_000000,
      feeAmount: 0,
    })
  })
})

describe('collateral ratio story', () => {
  it('Alice (credit 85) borrows 50 USDC with favorable terms', () => {
    const terms = calculateTerms(85)
    expect(terms).not.toBeNull()
    expect(terms!.collateralPct).toBe(20)

    const collateral = calculateCollateral(50_000000, terms!.collateralPct)
    expect(collateral).toBe(10_000000)

    const repay = calculateRepayAmount(50_000000, terms!.interestPct)
    expect(repay).toBe(51_000000)

    const fee = calculateFee(50_000000, 100)
    expect(fee.borrowerAmount).toBe(49_500000)
    expect(fee.feeAmount).toBe(500000)
  })

  it('Bob (credit 50) needs full collateral, limited to 15 USDC', () => {
    const terms = calculateTerms(50)
    expect(terms).not.toBeNull()
    expect(terms!.collateralPct).toBe(100)

    const collateral = calculateCollateral(15_000000, terms!.collateralPct)
    expect(collateral).toBe(15_000000)
  })

  it('Charlie (credit 30) is rejected entirely', () => {
    const terms = calculateTerms(30)
    expect(terms).toBeNull()
  })
})
