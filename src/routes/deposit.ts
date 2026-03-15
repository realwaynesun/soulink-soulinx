import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import type { Address } from 'viem'
import { pool, publicClient, waitForTx } from '../contract.js'
import { db } from '../db.js'
import { createSoulinkClient } from '../soulink.js'
import { config } from '../config.js'

type HTTPRequestContext = { adapter: { getBody?: () => unknown } }

const bodySchema = z.object({
  name: z.string().min(3).max(32).regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/),
  amount: z.number().int().min(1_000_000).max(1_000_000_000),
  signature: z.string().startsWith('0x'),
  message: z.string(),
})

const soulink = createSoulinkClient(config.soulinkBaseUrl)

const router = Router()

router.post('/deposit', async (req: Request, res: Response) => {
  const parsed = bodySchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_input', details: parsed.error.issues })
    return
  }

  const { name, amount, signature, message } = parsed.data

  const verified = await soulink.verify({ name, signature, message })
  if (!verified.valid) {
    res.status(403).json({ error: 'auth_failed', message: verified.error })
    return
  }

  const lender = verified.owner!.toLowerCase() as Address

  try {
    const hash = await pool.write.depositFor(lender, BigInt(amount))
    const receipt = await waitForTx(hash)
    if (receipt.status === 'reverted') {
      throw new Error('Transaction reverted')
    }

    db.prepare('INSERT OR REPLACE INTO lender_index (address, name) VALUES (?, ?)').run(lender, name)
    res.json({ tx_hash: hash, amount, lender: name })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ error: 'tx_failed', message: msg })
  }
})

export default router

export function depositPrice(context: HTTPRequestContext): string {
  const body = context.adapter.getBody?.() as { amount?: number } | undefined
  if (!body?.amount) return '1'
  return String(body.amount / 1_000_000)
}
