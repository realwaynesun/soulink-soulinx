# soulinX Demo

Credit-based A2A lending cycle with 4 AI agents on X Layer.

## Prerequisites

1. Register 4 `.agent` names on [soulink.dev](https://soulink.dev): `lender`, `alice`, `bob`, `charlie` ($1 each)
2. Register `soulinx-pool.agent` for the pool operator
3. Seed credit scores via Soulink API: alice ~85, bob ~50 (default), charlie ~15
4. Fund the operator wallet with USDG + OKB on X Layer
5. Deploy SoulinXPool contract on X Layer
6. Configure `.env`:
   - `OPERATOR_PRIVATE_KEY` — pool wallet private key
   - `SOULINK_FEE_ADDRESS` — Soulink treasury address
   - `POOL_CONTRACT_ADDRESS` — deployed SoulinXPool address
   - `POOL_AGENT_NAME` — pool's .agent name (e.g., `soulinx-pool`)

## Run

```bash
# Terminal 1 — start soulinX server
npm run dev

# Terminal 2 — check prerequisites
npm run demo:setup

# Terminal 2 — run full demo (set agent private keys)
LENDER_KEY=0x... ALICE_KEY=0x... BOB_KEY=0x... npm run demo
```

## What it does

| Act | Steps | Description |
|-----|-------|-------------|
| 1 | Deposit | Lender deposits 200 USDG into the pool |
| 2 | Borrow | Alice (high credit) approved, Charlie rejected, Bob (risky) approved at 100% collateral |
| 3 | Repay | Alice repays loan, collateral returned, credit improves |
| 4 | Default | Bob defaults, collateral seized, credit damaged |
| 5 | Withdraw | Lender withdraws principal + earned interest |
