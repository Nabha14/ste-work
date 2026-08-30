# StellarWork — Decentralized Freelance Escrow

> Milestone-based freelance escrow powered by Soroban smart contracts on Stellar.

🔴 **[Live Demo → ste-work.vercel.app](https://ste-work.vercel.app)** · 📋 **[User Feedback Form](https://forms.gle/rF1U7afEDLaPwTte8)**

[![CI](https://github.com/Nabha14/ste-work/actions/workflows/ci.yml/badge.svg)](https://github.com/Nabha14/ste-work/actions/workflows/ci.yml)

---

## Submission Resources

| Resource | Link |
|---|---|
| Live testnet dApp | [ste-work.vercel.app](https://ste-work.vercel.app) |
| Demo video | **[Add existing demo-video link before submission]** |
| Pitch deck | [Download the PowerPoint deck](docs/stellarwork-pitch-deck.pptx) · [source outline](docs/PITCH_DECK_CONTENT.md) |
| Escrow contract | [Stellar Expert](https://stellar.expert/explorer/testnet/contract/CC7XSNBIJSFMOR7YHPKGHRSEFZWWFF6N5LUBVHCR24XRNM3UQYWK246B) |

> The demo video and analytics screenshots are already complete. Their final hosted links should replace the two marked placeholders without changing this README structure.

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
| User-validation evidence | ✅ Existing onboarding feedback |

---

## User Feedback & Iteration

📊 **[Full Responses Spreadsheet](https://docs.google.com/spreadsheets/d/1OZ0SbeZdSnzPAKeN_SpHhPx5mpppctxkoUVRPD1NQIo/edit?usp=sharing)**

### Feedback Inputs

StellarWork uses qualitative onboarding feedback to guide product iteration:

- **Usability feedback:** the five-person onboarding study below captures qualitative product feedback.

The Step 3 UX improvements focused on the recurring usability signals: users needed more confidence while a transaction moved from Freighter to chain confirmation, clearer recovery when chain reads were slow, and a more direct first-wallet connection path.

| Name | Wallet | UX Score | Understood? | Liked | Feature Request | Bug Reported |
|---|---|---|---|---|---|---|
| Nabha Pote | `GAZ27S...KV44` | 10/10 | Yes | UI is nice | More description about job details & company info | None |
| Om Ozarkar | `GCYXWP...CCZBK` | 8/10 | Yes | Smooth process | Filter jobs by budget, milestone count, status | Stale wallet session |
| Kartik Botre | `GDNQNN...AZFNJ` | 5/10 | Yes | — | None | None |
| Vaishnavi Deore | `GBKLRB...KU65S` | 9/10 | Yes | — | Deliverable link preview | Own jobs mixed in open list |
| Subodh Ingle | `GDK6LO...YQ5C7` | 6/10 | Yes | Easy job application | Public shareable profile page | None |

### Step 3 Feedback-Driven Improvements

| Improvement | Feedback signal | Outcome | Commit placeholder |
|---|---|---|---|
| Transaction lifecycle panel | Signing and chain confirmation felt opaque | Shows prepare → sign → on-chain confirmation and exposes the Stellar Expert transaction link | `[commit link: UX transaction state]` |
| Resilient job refresh | Slow or incomplete RPC reads made the UI feel unstable | Preserves successful job reads, refreshes every 30 seconds, and shows when data was last updated | `[commit link: RPC resilience]` |
| Wallet-ready onboarding | New users were unsure when their wallet was ready | Adds a live Freighter connection checkpoint within onboarding | `[commit link: onboarding wallet check]` |

### Earlier Feedback-Driven Changes

| Change | Type | Commit |
|---|---|---|
| Job detail expansion — full description, client address, company info, milestone breakdown | Feature | `c704030` |
| Filter jobs by budget range, milestone count, status + sort dropdown | Feature | `c704030` |
| Deliverable link preview — clickable URL/IPFS on escrow page | Feature | `80e6f2c` |
| Public profile `/profile/[address]` — shareable, no wallet required | Feature | `e3360b7` |
| Fix stale wallet session — verify Freighter on restore | Bug Fix | `3b61b30` |
| Own jobs separated into "My Postings" section | Bug Fix | `c704030` |

### Newly Added Features (Escrow & Reputation Upgrades)

| Feature / Upgrade | Component | Type | Commit | Description |
|---|---|---|---|---|
| **Soulbound WORK Token** | Smart Contract | Compliance | `07c9193` | Restricts `transfer`, `transfer_from`, and `approve` methods of the `WorkToken` to enforce non-transferable reputation. |
| **Whitelisted Payment Token** | Smart Contract | Security | `7fe021b` | Enforces that only the whitelisted Native XLM token address can be used for posting jobs. |
| **Job Cancellation & Refunds** | Contract & Frontend | Feature | `7fe021b`, `18fcde0`, `a1f961e` | Enables clients to cancel open jobs (if unaccepted) and refund locked funds. |
| **Overdue Milestone Refunds** | Contract & Frontend | Feature | `7fe021b`, `18fcde0`, `a1f961e` | Allows clients to reclaim milestone funds if the completion deadline is missed. |
| **3-Day Review Window** | Smart Contract | Timing | `7fe021b` | Introduces a 259,200s review countdown upon milestone submission before timeout claim is valid. |
| **Dispute Resolution UI Modal** | Frontend Component | Refactor | `a1f961e` | Modularized the dispute resolution popup into a separate reusable UI component. |
| **Reactive Wallet State Polling** | Frontend Context | UX / Security | `0988659` | Periodically polls Freighter wallet address every 2s to detect locks/account swaps instantly. |

---

## Green Belt — Level 4 Checklist

| Requirement | Status |
|---|---|
| Inter-contract calls | ✅ `EscrowContract.approve_milestone` calls `WorkToken.mint` |
| Custom SEP-41 token | ✅ `WorkToken` (WORK reputation token, non-transferable) |
| Advanced contract patterns | ✅ Milestone state machine, dispute resolution, time-locked deadlines |
| Production readiness | ✅ CI/CD via GitHub Actions, deployed to Stellar testnet |
| Mobile responsive design | ✅ Fully responsive across all pages |
| Contract tests | ✅ 56 unit tests (11 WorkToken + 45 EscrowContract) |

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
- **Frontend** — Next.js 16, TypeScript, Tailwind CSS
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
    │   └── src/test.rs     # 11 unit tests
    └── escrow_contract/    # Milestone escrow state machine
        ├── src/lib.rs
        └── src/test.rs     # 45 unit tests
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

### Run all tests (56 passing)

```bash
cd contracts
cargo test --workspace
```

Output:
```
test result: ok. 45 passed; 0 failed  ← EscrowContract
test result: ok. 11 passed; 0 failed  ← WorkToken
```

### Test coverage

**WorkToken (11 tests)**
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
- `test_set_admin_rotates_admin_key`

**EscrowContract (45 tests)**
- Initialize, double-init guard
- Post job: id, count, fund transfer, stored data, multi-milestone, validation panics, token whitelist verification
- Accept job: assigns freelancer, double-accept guard, nonexistent job
- Submit milestone: status change, deliverable stored, double-submit guard, review period settings
- Approve milestone: payment release, status update, partial multi-milestone release
- Dispute: status change, locked milestone guard, stranger auth guard
- Resolve dispute: 100% freelancer, 100% client, 50/50 split, invalid bps, non-disputed guard
- Claim timeout: releases after review deadline, before-deadline guard
- Cancel job: client cancel open job, refund client, set status to refunded
- Refund milestone: client refund milestone on deadline breach if not submitted
- List jobs: empty, all, pagination
- Full lifecycle integration test
- Security regressions: zero-value milestones, expired deadlines, late delivery, self-assignment, and unaccepted-job refunds

### Security & State-Management Hardening

- Bounded job, description, deliverable, milestone, and pagination inputs to keep storage and execution costs predictable.
- Checked job, balance, supply, and basis-point arithmetic to fail safely on invalid values.
- Explicit `remaining` escrow accounting prevents a milestone from settling twice.
- Deadline and acceptance guards close refund and late-submission edge cases.
- WORK token administration supports planned key rotation while preserving escrow-only minting.

### Redeploy Optimized Contracts

Use [scripts/redeploy-testnet-contracts.sh](scripts/redeploy-testnet-contracts.sh) after review. It is explicitly testnet-only, builds both WASM artifacts, deploys them in dependency order, initializes both contracts, and prints the environment values to add to `.env.local`.

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
refund_milestone()→ client reclaims an unsubmitted overdue milestone
cancel_job()      → client cancels an unaccepted job and receives a full refund
```

### WorkToken (SEP-41)

```
initialize()   → sets admin + escrow contract address
mint()         → only callable by EscrowContract (inter-contract auth)
balance()      → returns WORK token balance for address
total_supply() → total WORK tokens minted
set_escrow()   → admin can update escrow contract address
set_admin()    → rotates the admin key for long-lived deployments
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

## Roadmap

| Horizon | Focus | Outcome |
|---|---|---|
| Now | Product validation | Contract test coverage and feedback-led UX iteration |
| Next | Product reliability | Indexed activity feed, transaction notifications, and richer dispute evidence |
| Pilot | Repeat workflows | Curated client/freelancer cohorts completing multi-milestone work |
| Mainnet readiness | Security and operations | Independent review, monitoring, admin policy, and staged deployment |

---

## CI/CD

GitHub Actions runs on every push to `main`:

1. **Contract Tests** — `cargo test --workspace`
2. **Contract Build** — `stellar contract build` → uploads WASM artifacts
3. **Frontend** — TypeScript type-check + `next build`

---

## License

MIT
