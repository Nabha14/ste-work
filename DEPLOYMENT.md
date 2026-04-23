# Stellar Testnet Deployment

## Deployed Contracts

| Contract | Address |
|---|---|
| WorkToken (SEP-41) | `CAWVOIUBWDGXW7S34GJAKMZYJEKEDS3UJ45UP47CQ2ZFKYHFY7CBHKJI` |
| EscrowContract | `CC7XSNBIJSFMOR7YHPKGHRSEFZWWFF6N5LUBVHCR24XRNM3UQYWK246B` |

## Network
- **Network**: Stellar Testnet
- **Horizon**: https://horizon-testnet.stellar.org
- **Soroban RPC**: https://soroban-testnet.stellar.org

## Explorer Links
- [WorkToken on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CAWVOIUBWDGXW7S34GJAKMZYJEKEDS3UJ45UP47CQ2ZFKYHFY7CBHKJI)
- [EscrowContract on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CC7XSNBIJSFMOR7YHPKGHRSEFZWWFF6N5LUBVHCR24XRNM3UQYWK246B)

## Build & Test

```bash
# Build contracts
cd contracts
stellar contract build

# Run all tests (45 passing)
cargo test --workspace

# Run frontend
cd ..
npm run dev
```

## Level 5 Blue Belt Checklist

- [x] Deployed MVP — live at https://ste-work.vercel.app
- [x] Real on-chain transactions — all actions signed via Freighter, submitted to Soroban RPC
- [x] User onboarding flow — first-visit modal (Freighter → testnet XLM → first job)
- [x] Dispute resolution UI — dispute button + resolve modal with basis-point slider
- [x] Admin panel — `/admin` page: platform stats, all disputes, resolve on-chain
- [x] User profile & reputation — `/profile`: WORK score, reputation badge, job history
- [x] SEO & OG metadata — OpenGraph image, Twitter card, keywords
- [ ] 5 users onboarded — share https://ste-work.vercel.app and onboard real users

## Level 4 Green Belt Checklist

- [x] Inter-contract calls — `EscrowContract.approve_milestone` calls `WorkToken.mint`
- [x] Custom SEP-41 token — `WorkToken` (WORK reputation token)
- [x] Advanced contract patterns — milestone state machine, dispute resolution, time-locks
- [x] Contract tests — 45 unit tests (10 WorkToken + 35 EscrowContract)
- [x] Production deployment — both contracts live on Stellar testnet
- [x] Frontend — Next.js dApp reading real on-chain state via Soroban RPC
