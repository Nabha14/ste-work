# StellarWork — 10-Slide Pitch Deck Content

## Slide 1 — Freelance escrow without the trust gap

**StellarWork**

Milestone-based freelance escrow on Stellar

- Funds move only when work is approved or a dispute is resolved
- Native XLM settlement with on-chain reputation
- Built for cross-border digital work

## Slide 2 — Freelancers and clients still start every project with a trust problem

- Clients worry about paying before delivery
- Freelancers worry about shipping work without a guaranteed payout
- Traditional platforms centralize funds, rules, and reputation
- Cross-border work adds delays, fees, and opaque dispute processes

**The result:** smaller teams either accept risk or pay intermediaries to manage it.

## Slide 3 — StellarWork turns a work agreement into enforceable escrow

- Create a job with one or more funded milestones
- Lock payment in a Soroban smart contract
- Release XLM only when the client approves completed work
- Resolve disputes with transparent basis-point splits

**No platform custody. No manual reconciliation. No ambiguity about where the funds are.**

## Slide 4 — A simple workflow for both sides of the contract

1. **Client posts** a scoped job and locks XLM.
2. **Freelancer accepts** and completes milestones.
3. **Freelancer submits** a deliverable reference.
4. **Client approves** for instant XLM release and WORK reputation.
5. **Either party disputes**; an authorized admin settles on-chain when needed.

## Slide 5 — Built as a real on-chain product, not a payment mockup

- **Frontend:** Next.js dApp with responsive wallet-aware flows
- **Wallet layer:** Freighter signs every state-changing transaction
- **Settlement:** Stellar Testnet + Soroban RPC
- **EscrowContract:** milestones, deadlines, refunds, timeouts, disputes
- **WorkToken:** soulbound WORK reputation minted after verified settlement

**Architecture principle:** the UI guides the action; the contract enforces the outcome.

## Slide 6 — Start where trust and payment friction are highest

- Beachhead: independent developers, designers, and small remote teams
- First use case: milestone-based digital deliverables with clear acceptance criteria
- Expansion: agencies, contributor bounties, DAO workstreams, creator commissions
- Why Stellar: fast, low-cost settlement that fits frequent milestone payments

**Market opportunity:** convert fragmented off-platform agreements into auditable, programmable work contracts.

## Slide 7 — Validation is measured on-chain and in the product

- Live testnet dApp with deployed EscrowContract and WorkToken
- **56 automated contract tests** covering lifecycle, payout, refund, timeout, and dispute paths
- **[50-user testnet dataset — insert final count and Explorer link]**
- Feedback loop already translated into product work: clearer loading, safer wallet state, and improved onboarding

**Proof point:** every critical state change is signed, submitted, and independently visible in the Stellar explorer.

## Slide 8 — Growth comes from demonstrable trust, not speculative incentives

- Onboard freelancer communities with testnet project templates
- Partner with hackathons and student-builder programs for milestone bounties
- Make public WORK reputation portable across StellarWork projects
- Convert successful testnet flows into focused mainnet pilots

**Growth loop:** completed work → verifiable reputation → stronger freelancer discovery → more funded jobs.

## Slide 9 — A focused path to sustainable platform value

- Keep core escrow transparent and non-custodial
- Offer optional paid tools around workflow, discovery, and team coordination
- Potential revenue: premium organization workspaces, enhanced arbitration, job promotion, and analytics
- Avoid extracting value from locked user funds

**Principle:** trust infrastructure should make work easier, not introduce a new rent-seeking layer.

## Slide 10 — Roadmap: from testnet proof to a trusted work layer

- **Now:** testnet escrow, WORK reputation, feedback-led UX improvements
- **Next:** indexed activity feed, notification system, richer dispute evidence
- **Pilot:** curated freelancer/client cohorts with repeat milestone workflows
- **Mainnet readiness:** independent security review, monitoring, admin policy, and staged rollout

**North star:** make a milestone agreement as easy to create as a job post—and as reliable as a contract.
