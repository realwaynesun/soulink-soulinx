---
name: soulinx-credit-lending
description: "Use this skill to 'borrow USDG with low collateral based on credit score', 'deposit USDG as lender for yield', 'check lending eligibility and terms', 'repay loans via x402 payment', 'credit-gated A2A lending for AI agents on X Layer', 'get better loan terms with higher reputation', 'check pool liquidity', 'view loan history', 'withdraw deposit with earned interest'. Integrates Soulink agent credit scoring with x402 USDG payments for autonomous agent-to-agent lending on X Layer."
license: Apache-2.0
metadata:
  author: soulink
  version: "1.0.0"
  homepage: "https://soulink.dev"
---

# soulinX: Credit-Based A2A Lending for AI Agents

7 HTTP endpoints for credit-gated borrowing, lending, and repayment on X Layer.

Agents with high Soulink credit scores can borrow USDG with minimal (or zero) OKB collateral. Lenders deposit USDG into the pool via x402 and earn interest when borrowers repay. Deposits and repayments use x402 payments. Borrowing requires a prior OKB collateral transfer to the pool address, then a call to `/borrow` with the tx hash. No ETH needed.

**Base URL**: `SOULINX_BASE_URL` (configurable, e.g. `https://api.soulink.dev/soulinx`)

## Pre-flight Checks

Before calling any soulinX endpoint, verify these in order:

1. **Server health**: `GET {SOULINX_BASE_URL}/health` -- expect `{"status":"ok"}`
2. **Soulink identity**: The agent must have a registered `.agent` name on Soulink. Verify at `GET https://api.soulink.dev/api/v1/resolve/{name}`
3. **USDG balance**: The agent needs USDG on X Layer (chain 196) for lender deposits or repayments. Borrowers need OKB (native token) for collateral. Check via `okx-wallet-portfolio`

## Skill Routing

- For wallet balances -> use `okx-wallet-portfolio`
- For token swaps -> use `okx-dex-swap`
- For market prices -> use `okx-dex-market`
- For Soulink identity registration -> use `soulink` skill at `https://api.soulink.dev/skill.md`

## Quickstart

### 1. Check lending terms for an agent

```bash
curl {SOULINX_BASE_URL}/terms/alice
# -> {"name":"alice","score":92,"eligible":true,"collateral_pct":0,
#     "interest_pct":1,"max_amount":200,"duration_hours":168,"pool_available":5000}
```

### 2. Deposit USDG as lender (x402-gated)

```bash
curl -X POST {SOULINX_BASE_URL}/deposit \
  -H "Content-Type: application/json" \
  -H "X-402-Payment: <x402_token>" \
  -d '{"name":"bob","amount":10000000}'
# amount in minimal units (10 USDG = 10000000, 6 decimals)
# -> {"id":"dep_abc123","amount":10000000,"status":"active"}
```

### 3. Borrow USDG with credit score (OKB collateral + EIP-191 auth)

First, transfer OKB collateral to the pool address. Then call `/borrow` with the tx hash:

```bash
curl -X POST {SOULINX_BASE_URL}/borrow \
  -H "Content-Type: application/json" \
  -d '{"name":"alice","amount":5000000,"collateral_tx":"0x<okb_transfer_tx_hash>","okb_price":12.5,"signature":"0x...","message":"soulink:alice:1710000000"}'
# NOT x402-gated -- collateral is via prior OKB transfer
# collateral_tx = tx hash of OKB transfer to pool (0x0 if score 90+ / 0% collateral)
# -> {"loan_id":"loan_xyz789","amount":5000000,"collateral_usdg":0,
#     "collateral_okb_wei":"0","repay_amount":5050000,"interest_pct":1,"due_at":"2026-03-21T...","disburse_tx":"0x..."}
```

### 4. Repay loan (x402-gated)

```bash
curl -X POST {SOULINX_BASE_URL}/repay/loan_xyz789 \
  -H "X-402-Payment: <x402_token>"
# x402 payment = repay_amount from borrow response
# -> {"repaid":true,"loan_id":"loan_xyz789","collateral_returned":0}
```

## Command Index

| # | Method | Path | Auth | Description |
|---|--------|------|------|-------------|
| 1 | GET | `/health` | -- | Server health check |
| 2 | GET | `/pool` | -- | Pool stats: total deposits, borrowed, available liquidity |
| 3 | GET | `/terms/:name` | -- | Check credit score, eligibility, and loan terms for an agent |
| 4 | POST | `/deposit` | x402 | Deposit USDG into the lending pool as a lender |
| 5 | POST | `/borrow` | EIP-191 | Borrow USDG (requires prior OKB collateral transfer + tx hash) |
| 6 | POST | `/repay/:loanId` | x402 | Repay an active loan (x402 amount = repay_amount) |
| 7 | GET | `/loans/:name` | -- | View loan history for an agent |
| 8 | POST | `/withdraw` | EIP-191 | Withdraw deposit + earned interest |

## Credit-to-Terms Mapping

Soulink credit score determines loan terms. Higher reputation = better deals.

| Credit Score | Collateral | Interest | Max Loan | Duration |
|-------------|-----------|----------|----------|----------|
| 90+ | 0% | 1% | 200 USDG | 7 days |
| 80-89 | 20% | 2% | 100 USDG | 3 days |
| 70-79 | 50% | 5% | 50 USDG | 2 days |
| 50-69 | 100% | 10% | 20 USDG | 1 day |
| Below 50 | Ineligible | -- | -- | -- |

Collateral is OKB (native token), transferred to the pool address before calling `/borrow`. Returned on successful repayment.

## Cross-Skill Workflows

### Workflow A: Check Balance -> Deposit into Pool

```
1. okx-wallet-portfolio  Check USDG balance on X Layer (chain 196)
       |
2. soulinx               POST /deposit with x402 payment
       -> deposit confirmed, start earning yield
```

### Workflow B: Borrow -> Swap -> Profit -> Repay

```
1. soulinx               GET /terms/{name} -> check eligibility and max loan
       |
2. soulinx               Transfer OKB collateral to pool, then POST /borrow with tx hash
       | USDG disbursed to borrower
3. okx-dex-swap          Swap borrowed USDG for another token on X Layer
       | trade for profit
4. okx-dex-swap          Swap back to USDG
       |
5. soulinx               POST /repay/{loanId} with x402 repayment
       -> collateral returned, credit preserved
```

### Workflow C: Monitor Prices -> Time Repayment

```
1. okx-dex-market        Check token prices before repaying
       |
2. okx-dex-swap          Swap profits back to USDG if favorable
       |
3. soulinx               POST /repay/{loanId} before due_at
```

## Operation Flow

### Step 1: Identify Intent

- Want to earn yield? -> `POST /deposit` (become a lender)
- Want to borrow? -> `GET /terms/:name` -> `POST /borrow`
- Have an active loan? -> `POST /repay/:loanId` before `due_at`
- Want to exit the pool? -> `POST /withdraw` (get deposit + earned interest)
- Check pool status? -> `GET /pool`

### Step 2: Collect Parameters

- Missing agent name -> ask for the `.agent` name registered on Soulink
- Missing amount -> ask user, remind to use minimal units (1 USDG = 1000000)
- Missing EIP-191 signature -> sign `soulink:{name}:{unix_timestamp}` (5-min TTL)
- Missing x402 token -> construct payment for the required amount on X Layer

### Step 3: Execute and Suggest Next Steps

| Just completed | Suggest |
|---|---|
| `GET /terms` (eligible) | 1. Borrow USDG -> `POST /borrow` 2. Check pool liquidity -> `GET /pool` |
| `POST /deposit` | 1. Check pool stats -> `GET /pool` 2. Monitor your deposit -> `GET /loans/:name` |
| `POST /borrow` | 1. Swap on DEX -> `okx-dex-swap` 2. Set reminder to repay before `due_at` |
| `POST /repay` | 1. Check updated credit score -> Soulink `GET /credit/:name` 2. Borrow again -> `GET /terms` |
| `POST /withdraw` | 1. Check wallet balance -> `okx-wallet-portfolio` 2. Swap earned USDG -> `okx-dex-swap` |

## Security Rules

1. **Always check terms first**: Call `GET /terms/:name` before borrowing to confirm eligibility and current pool liquidity
2. **Repay before `due_at`**: Late repayment triggers automatic default, seizes collateral, and submits a negative credit report to Soulink
3. **Verify payment amounts**: Deposit x402 = deposit amount. Borrow = OKB collateral transfer (not x402). Repay x402 = `repay_amount` from borrow response
4. **One active loan per agent**: A second borrow attempt returns `409 active_loan_exists`
5. **EIP-191 auth required for borrow/withdraw**: Sign `soulink:{name}:{unix_timestamp}` with the agent's private key. Signature valid for 5 minutes
6. **Amounts in minimal units**: 1 USDG = 1000000 (6 decimals). Min deposit: 1 USDG. Min borrow: 1 USDG

## Edge Cases

| Scenario | Error | Resolution |
|----------|-------|------------|
| Pool has insufficient liquidity | `400 insufficient_pool` | Wait for deposits or reduce borrow amount |
| Agent has no Soulink identity | `terms` returns score 0, ineligible | Register a `.agent` name on Soulink first |
| Agent already has active loan | `409 active_loan_exists` | Repay existing loan before borrowing again |
| Credit score below 50 | `403 rejected` | Build credit via positive behavior reports on Soulink |
| Loan past `due_at` | Auto-defaulted by overdue worker | Collateral seized, negative credit report filed. Rebuild credit over time |
| No active deposit to withdraw | `404 no_deposit` | Agent has no active deposit in the pool |
