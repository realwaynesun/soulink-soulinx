# soulinX

Credit-based A2A lending for AI agents on X Layer -- where your reputation is your oracle.

[Demo Video](https://youtu.be/vlOYBdz4EUg) | [Skill File](https://soulink.dev/soulinx/skill.md) | [Soulink](https://soulink.dev/soulinx) | [X Layer Explorer](https://www.oklink.com/xlayer/address/0xBCae727ABBD3f4237894268deF39E2Ce66376DC5)

## The Problem

Traditional DeFi treats all borrowers the same -- everyone overcollateralizes at 150%+. AI agents can't earn trust. There's no way to get better financial terms through consistent good behavior.

## The Solution

soulinX lets agents borrow USDG based on their Soulink credit score. Higher credit = less collateral = better capital efficiency.

```
Credit 90 --> lock 0 OKB,  borrow $200 USDG  (uncollateralized)
Credit 80 --> lock $20 OKB, borrow $100 USDG  (20% collateral)
Credit 50 --> lock $20 OKB, borrow $20 USDG   (100% collateral)
Credit 15 --> rejected

Same agent, different history. That's the value of reputation.
```

## Architecture

```
Lender Agent --> soulinX Pool <-- Borrower Agent
                     |
          +----------+----------+
          |          |          |
     Soulink API   X Layer    x402
    (credit score) (USDG/OKB) (deposit/repay)
          |
     Onchain OS
   (wallet assets)
```

## How It Works

1. **Lender** deposits USDG into the pool (x402 payment + EIP-191 auth, operator calls `depositFor` on contract)
2. **Borrower** checks credit score -- gets personalized terms via `GET /terms/:name`
3. **Borrower** locks OKB collateral on contract (`lockCollateral`), then calls `POST /borrow` -- server pushes credit score on-chain, contract derives collateral ratio + duration, transfers USDG loan
4. **Borrower** repays USDG via x402 -- contract auto-releases OKB, credit improves
5. **Default** -- contract seizes OKB (enforced by `block.timestamp > dueAt`), credit destroyed

## Credit Tiers

| Credit Score | Collateral | Interest | Max Loan | Duration |
|:---:|:---:|:---:|:---:|:---:|
| 90+ | 0% | 1% | $200 | 7 days |
| 80+ | 20% | 2% | $100 | 3 days |
| 70+ | 50% | 5% | $50 | 2 days |
| 50+ | 100% | 10% | $20 | 1 day |
| < 50 | Rejected | -- | -- | -- |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Lending | Express 5 + SQLite (better-sqlite3) |
| Payments | x402 protocol via soulink402 (deposit + repay only) |
| Credit | Soulink API (behavioral + on-chain assets via Onchain OS) |
| Transfers | viem on X Layer (chain 196) |
| Identity | EIP-191 signatures + .agent names |

## Quick Start

```bash
git clone https://github.com/realwaynesun/soulink-soulinx
cd soulink-soulinx && npm install
cp .env.example .env  # Configure keys
npm run dev           # Start lending server
npm run demo          # Watch the magic
```

## API Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/pool` | -- | Pool stats (deposits, utilization, available) |
| POST | `/deposit` | x402 + EIP-191 | Deposit USDG (x402 payment + identity verification) |
| POST | `/withdraw` | EIP-191 | Withdraw deposit + earned interest |
| GET | `/terms/:name` | -- | Check borrowing terms for an agent |
| POST | `/borrow` | EIP-191 | Borrow USDG (lock OKB on contract first, server calls approveLoan) |
| POST | `/repay/:loanId` | x402 | Repay active loan in USDG, contract auto-releases OKB |
| GET | `/loans/:name` | -- | View loan history for an agent |

## X Layer Native

- **Chain 196** -- OKB gas, near-zero transaction costs
- **USDG**: `0x4ae46a509f6b1d9056937ba4500cb143933d2dc8`
- **Collateral**: OKB (native token on X Layer)
- **Soulink Registry**: `0x15d13ed36b337dff3d5877ed46655037ee4c1be0`

## Onchain OS Integration

Soulink credit scoring queries the OKX Onchain OS Wallet Portfolio API for on-chain asset data -- wallet holdings factor into creditworthiness alongside behavioral reports. soulinX is published as an Onchain OS skill, discoverable by any agent in the ecosystem.

## Built On

- [Soulink](https://soulink.dev) -- Agent identity and credit infrastructure
- [OKX Onchain OS](https://github.com/okx/onchainos-skills) -- On-chain data and DeFi
- [x402](https://www.x402.org/) -- HTTP payment protocol

## License

Apache-2.0
