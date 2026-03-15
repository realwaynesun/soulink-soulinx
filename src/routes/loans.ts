import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import type { Address } from 'viem'
import { formatUnits } from 'viem'
import { pool } from '../contract.js'
import { createSoulinkClient } from '../soulink.js'
import { config } from '../config.js'

const ZERO_BYTES32 = '0x0000000000000000000000000000000000000000000000000000000000000000'
const STATUS_LABELS = ['none', 'active', 'repaid', 'defaulted'] as const

const nameSchema = z.string().min(3).max(32).regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/)

const soulink = createSoulinkClient(config.soulinkBaseUrl)

const router = Router()

router.get('/loans/:name', async (req: Request, res: Response) => {
  const parsed = nameSchema.safeParse(req.params.name)
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_name' })
    return
  }

  const resolved = await soulink.resolve(parsed.data).catch(() => null)
  if (!resolved?.owner) {
    res.status(404).json({ error: 'unresolvable', message: 'Cannot resolve owner address.' })
    return
  }

  const owner = resolved.owner.toLowerCase() as Address
  const activeLoan = await pool.read.activeLoanId(owner)

  if (activeLoan === ZERO_BYTES32) {
    res.json({ name: parsed.data, active_loan: null })
    return
  }

  const [borrower, amount, collateral, repayAmount, dueAt, status] = await pool.read.loans(activeLoan)

  res.json({
    name: parsed.data,
    active_loan: {
      id: activeLoan,
      borrower,
      amount: formatUnits(amount, 6),
      collateral_okb: formatUnits(collateral, 18),
      repay_amount: formatUnits(repayAmount, 6),
      due_at: new Date(Number(dueAt) * 1000).toISOString(),
      status: STATUS_LABELS[status] ?? 'unknown',
    },
  })
})

export default router
