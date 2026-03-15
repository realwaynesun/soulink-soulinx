import { Router, type Request, type Response } from 'express'
import { formatUnits } from 'viem'
import { pool } from '../contract.js'

const router = Router()

router.get('/pool', async (_req: Request, res: Response) => {
  const [deposits, borrowed, avail] = await Promise.all([
    pool.read.totalDeposits(),
    pool.read.totalBorrowed(),
    pool.read.available(),
  ])
  const utilization = deposits > 0n
    ? Number(borrowed * 10000n / deposits) / 100
    : 0

  res.json({
    total_deposits: formatUnits(deposits, 6),
    total_borrowed: formatUnits(borrowed, 6),
    available: formatUnits(avail, 6),
    utilization_pct: utilization,
  })
})

export default router
