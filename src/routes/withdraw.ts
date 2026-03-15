import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import type { Address } from 'viem'
import { formatUnits } from 'viem'
import { pool, publicClient, waitForTx } from '../contract.js'
import { db } from '../db.js'
import { createSoulinkClient } from '../soulink.js'
import { config } from '../config.js'

const bodySchema = z.object({
  name: z.string().min(3).max(32).regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/),
  signature: z.string().startsWith('0x'),
  message: z.string(),
})

const soulink = createSoulinkClient(config.soulinkBaseUrl)

const router = Router()

router.post('/withdraw', async (req: Request, res: Response) => {
  const parsed = bodySchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_input', details: parsed.error.issues })
    return
  }

  const verified = await soulink.verify(parsed.data)
  if (!verified.valid) {
    res.status(403).json({ error: 'auth_failed', message: verified.error })
    return
  }

  const lender = verified.owner!.toLowerCase() as Address
  const [principal, earned] = await Promise.all([
    pool.read.lenderDeposits(lender),
    pool.read.lenderEarned(lender),
  ])

  if (principal === 0n) {
    res.status(404).json({ error: 'no_deposit', message: 'No active deposit found.' })
    return
  }

  try {
    const hash = await pool.write.withdrawFor(lender)
    const receipt = await waitForTx(hash)
    if (receipt.status === 'reverted') {
      throw new Error('Transaction reverted')
    }

    db.prepare('DELETE FROM lender_index WHERE address = ?').run(lender)
    res.json({
      tx_hash: hash,
      principal: formatUnits(principal, 6),
      earned: formatUnits(earned, 6),
      total: formatUnits(principal + earned, 6),
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ error: 'tx_failed', message: msg })
  }
})

export default router
