import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import type { Hex } from 'viem'
import { formatUnits } from 'viem'
import { pool, publicClient, waitForTx } from '../contract.js'
import { db } from '../db.js'
import { createSoulinkClient } from '../soulink.js'
import { config } from '../config.js'
import { signReport } from '../sign.js'

type HTTPRequestContext = { adapter: { getBody?: () => unknown }; path: string }

const loanIdSchema = z.string().regex(/^0x[0-9a-f]{64}$/)

const findLoanIndex = db.prepare('SELECT borrower FROM loan_index WHERE id = ?')
const deleteLoanIndex = db.prepare('DELETE FROM loan_index WHERE id = ?')

const soulink = createSoulinkClient(config.soulinkBaseUrl)

const router = Router()

router.post('/repay/:loanId', async (req: Request, res: Response) => {
  const parsed = loanIdSchema.safeParse(req.params.loanId)
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_loan_id' })
    return
  }

  const loanId = parsed.data as Hex
  const [borrower, , , repayAmount, , status] = await pool.read.loans(loanId)

  if (status !== 1) {
    res.status(400).json({ error: 'not_active', message: `Loan status: ${status}` })
    return
  }

  const indexRow = findLoanIndex.get(loanId) as { borrower: string } | undefined
  const borrowerName = indexRow?.borrower ?? 'unknown'

  try {
    const hash = await pool.write.repayFor(loanId, borrower)
    const receipt = await waitForTx(hash)
    if (receipt.status === 'reverted') {
      throw new Error('Transaction reverted')
    }
    deleteLoanIndex.run(loanId)

    // Queue interest for distribution by the periodic worker
    const loanData = await pool.read.loans(loanId)
    const principal = loanData[1]
    const interest = repayAmount - principal
    if (interest > 0n) {
      db.prepare('INSERT OR IGNORE INTO pending_distributions (loan_id, interest_amount) VALUES (?, ?)').run(loanId, Number(interest))
    }

    try {
      const report = await signReport()
      await soulink.submitReport({
        agent: borrowerName, score: 1, action: 'payment_on_time',
        context: `Loan ${loanId} repaid. Amount: ${formatUnits(repayAmount, 6)} USDG`,
        ...report,
      })
    } catch {}

    res.json({
      repaid: true,
      loan_id: loanId,
      tx_hash: hash,
      repay_amount: formatUnits(repayAmount, 6),
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ error: 'tx_failed', message: msg })
  }
})

export default router

export async function repayPrice(context: HTTPRequestContext): Promise<string> {
  const loanId = context.path.split('/').pop()
  if (!loanId?.startsWith('0x')) return '0'

  try {
    const [, , , repayAmount, , status] = await pool.read.loans(loanId as Hex)
    if (status !== 1) return '0'
    return formatUnits(repayAmount, 6)
  } catch {
    return '0'
  }
}
