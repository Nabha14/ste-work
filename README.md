# StellarWork — Decentralized Freelance Escrow

> Milestone-based freelance escrow powered by Soroban smart contracts on Stellar.

🔴 **[Live Demo → ste-work.vercel.app](https://ste-work.vercel.app)** · 📋 **[User Feedback Form](https://forms.gle/rF1U7afEDLaPwTte8)**

[![CI](https://github.com/Nabha14/ste-work/actions/workflows/ci.yml/badge.svg)](https://github.com/Nabha14/ste-work/actions/workflows/ci.yml)

---

## What is StellarWork?

StellarWork eliminates trust between clients and freelancers by encoding the entire payment agreement into immutable Soroban smart contracts. Funds are locked on-chain and released automatically when milestones are approved — no middlemen, no platform fees, no trust required.

**How it works:**
1. Client posts a job and locks XLM into the `EscrowContract`
2. Freelancer accepts the job and submits deliverables per milestone
3. Client approves → XLM releases instantly + `WORK` reputation tokens minted
4. If disputed, an arbitrator splits funds via basis points

---

## Blue Belt — Level 5 Checklist

| Requirement | Status |
|---|---|
| Deployed MVP on Stellar testnet | ✅ Live at [ste-work.vercel.app](https://ste-work.vercel.app) |
| Real on-chain transactions | ✅ All actions signed via Freighter, submitted to Soroban RPC |
| User onboarding flow | ✅ First-visit onboarding modal (Freighter → testnet XLM → first job) |
| Dispute resolution UI | ✅ Dispute button, resolve modal with basis-point slider on Escrow page |
| Admin panel | ✅ `/admin` — platform stats, all disputes, resolve on-chain |
| User profile & reputation | ✅ `/profile` — WORK score, reputation badge, job history |
| SEO & OG metadata | ✅ OpenGraph image, Twitter card, keywords, metadataBase |
| 5+ users onboarded | 🎯 Share the live link · [Submit Feedback Form](https://forms.gle/rF1U7afEDLaPwTte8) |

---

## Green Belt — Level 4 Checklist

| Requirement | Status |
|---|---|
| Inter-contract calls | ✅ `EscrowContract.approve_milestone` calls `WorkToken.mint` |
| Custom SEP-41 token | ✅ `WorkToken` (WORK reputation token, non-transferable) |
| Advanced contract patterns | ✅ Milestone state machine, dispute resolution, time-locked deadlines |
| Production readiness | ✅ CI/CD via GitHub Actions, deployed to Stellar testnet |
| Mobile responsive design | ✅ Fully responsive across all pages |
| Contract tests | ✅ 45 unit tests (10 WorkToken + 35 EscrowContract) |

---

## Deployed Contracts (Stellar Testnet)

| Contract | Address |
|---|---|
| `WorkToken` (SEP-41) | `CAWVOIUBWDGXW7S34GJAKMZYJEKEDS3UJ45UP47CQ2ZFKYHFY7CBHKJI` |
| `EscrowContract` | `CC7XSNBIJSFMOR7YHPKGHRSEFZWWFF6N5LUBVHCR24XRNM3UQYWK246B` |

- [WorkToken on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CAWVOIUBWDGXW7S34GJAKMZYJEKEDS3UJ45UP47CQ2ZFKYHFY7CBHKJI)
- [EscrowContract on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CC7XSNBIJSFMOR7YHPKGHRSEFZWWFF6N5LUBVHCR24XRNM3UQYWK246B)

---

## Tech Stack

- **Smart Contracts** — Rust + Soroban SDK 22
- **Frontend** — Next.js 14, TypeScript, Tailwind CSS
- **Wallet** — Freighter (Stellar browser extension)
- **Chain interaction** — `@stellar/stellar-sdk` Soroban RPC
- **CI/CD** — GitHub Actions

---

## Project Structure

```
stellarwork/
├── app/                    # Next.js App Router pages
│   ├── page.tsx            # Landing page
│   ├── dashboard/          # Live on-chain dashboard
│   ├── jobs/               # Browse & accept jobs
│   ├── escrow/             # Milestone tracker
│   ├── my-work/            # Freelancer view
│   └── about/              # Project info & architecture
├── components/
│   ├── layout/Navbar.tsx   # Sticky nav with wallet connect
│   ├── ui/                 # Card, Badge, Button, Sparkline
│   └── dashboard/          # PostJobModal
├── lib/
│   ├── contracts/
│   │   ├── client.ts       # Soroban RPC read/write helpers
│   │   └── config.ts       # Contract addresses & network config
│   ├── wallet-context.tsx  # Freighter wallet provider
│   └── utils.ts            # Formatting helpers
└── contracts/
    ├── work_token/         # SEP-41 WORK reputation token
    │   ├── src/lib.rs
    │   └── src/test.rs     # 10 unit tests
    └── escrow_contract/    # Milestone escrow state machine
        ├── src/lib.rs
        └── src/test.rs     # 35 unit tests
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- Rust + `wasm32-unknown-unknown` target
- [Stellar CLI](https://developers.stellar.org/docs/tools/developer-tools/cli/install-cli)
- [Freighter wallet](https://www.freighter.app/) browser extension

### Run the frontend

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Environment variables

Create `.env.local`:

```env
NEXT_PUBLIC_NETWORK=testnet
NEXT_PUBLIC_HORIZON_URL=https://horizon-testnet.stellar.org
NEXT_PUBLIC_SOROBAN_RPC=https://soroban-testnet.stellar.org
NEXT_PUBLIC_ESCROW_CONTRACT_ID=CC7XSNBIJSFMOR7YHPKGHRSEFZWWFF6N5LUBVHCR24XRNM3UQYWK246B
NEXT_PUBLIC_WORK_TOKEN_CONTRACT_ID=CAWVOIUBWDGXW7S34GJAKMZYJEKEDS3UJ45UP47CQ2ZFKYHFY7CBHKJI
NEXT_PUBLIC_NATIVE_TOKEN=CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
```

---

## Smart Contract Development

### Build contracts

```bash
cd contracts
stellar contract build
```

### Run all tests (45 passing)

```bash
cd contracts
cargo test --workspace
```

Output:
```
test result: ok. 35 passed; 0 failed  ← EscrowContract
test result: ok. 10 passed; 0 failed  ← WorkToken
```

### Test coverage

**WorkToken (10 tests)**
- `test_initialize_sets_metadata`
- `test_initialize_zero_supply`
- `test_initialize_twice_panics`
- `test_balance_zero_for_unknown_address`
- `test_mint_increases_balance_and_supply`
- `test_mint_accumulates_across_calls`
- `test_mint_multiple_recipients_independent`
- `test_mint_zero_panics`
- `test_mint_negative_panics`
- `test_set_escrow_updates_minter`

**EscrowContract (35 tests)**
- Initialize, double-init guard
- Post job: id, count, fund transfer, stored data, multi-milestone, validation panics
- Accept job: assigns freelancer, double-accept guard, nonexistent job
- Submit milestone: status change, deliverable stored, double-submit guard
- Approve milestone: payment release, status update, partial multi-milestone release
- Dispute: status change, locked milestone guard, stranger auth guard
- Resolve dispute: 100% freelancer, 100% client, 50/50 split, invalid bps, non-disputed guard
- Claim timeout: releases after deadline, before-deadline guard, no-deadline guard
- List jobs: empty, all, pagination
- Full lifecycle integration test

---

## Contract Architecture

### EscrowContract

```
post_job()        → locks XLM, creates Job with milestones
accept_job()      → assigns freelancer, closes job to new applicants
submit_milestone()→ freelancer submits deliverable hash (IPFS or text)
approve_milestone()→ client approves → releases XLM + mints WORK tokens ← inter-contract call
dispute_milestone()→ either party raises dispute
resolve_dispute() → admin splits funds by basis points (0–10000)
claim_timeout()   → freelancer claims if deadline passed and client unresponsive
```

### WorkToken (SEP-41)

```
initialize()   → sets admin + escrow contract address
mint()         → only callable by EscrowContract (inter-contract auth)
balance()      → returns WORK token balance for address
total_supply() → total WORK tokens minted
set_escrow()   → admin can update escrow contract address
```

### Inter-contract call flow

```
Client calls approve_milestone()
  └─ EscrowContract transfers XLM to freelancer
  └─ EscrowContract calls WorkToken.mint(freelancer, amount)
       └─ WorkToken verifies caller is EscrowContract
       └─ WorkToken mints WORK reputation tokens
```

---

## CI/CD

GitHub Actions runs on every push to `main`:

1. **Contract Tests** — `cargo test --workspace`
2. **Contract Build** — `stellar contract build` → uploads WASM artifacts
3. **Frontend** — TypeScript type-check + `next build`

---

## License

MIT
