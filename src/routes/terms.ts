import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import { formatUnits } from 'viem'
import { pool } from '../contract.js'
import { createSoulinkClient } from '../soulink.js'
import { calculateTerms } from '../lending.js'
import { config } from '../config.js'
import type { TermsResponse } from '../types.js'

const nameSchema = z.string().min(3).max(32).regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/)

const soulink = createSoulinkClient(config.soulinkBaseUrl)

const router = Router()

router.get('/terms/:name', async (req: Request, res: Response) => {
  const parsed = nameSchema.safeParse(req.params.name)
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_name' })
    return
  }

  const [credit, avail] = await Promise.all([
    soulink.credit(parsed.data),
    pool.read.available(),
  ])

  const terms = calculateTerms(credit.score)
  const response: TermsResponse = {
    name: parsed.data,
    score: credit.score,
    eligible: terms !== null,
    collateral_pct: terms?.collateralPct ?? 0,
    interest_pct: terms?.interestPct ?? 0,
    max_amount: terms?.maxAmount ?? 0,
    duration_hours: terms?.durationHours ?? 0,
    pool_available: Number(formatUnits(avail, 6)),
  }

  res.json(response)
})

export default router
