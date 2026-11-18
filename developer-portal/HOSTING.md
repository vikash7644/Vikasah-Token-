# VKT Cloud Hosting Plan

This document describes a low-maintenance cloud deployment path. It does not deploy anything, create a paid service, or authorize a mainnet launch.

## Architecture

- **Merchant Studio / static portal:** deploy `developer-portal/` as a static site on Vercel. The browser may connect to a wallet, but it must never receive the merchant API secret.
- **Payment verifier API:** deploy `developer-portal/api/` as a Node.js 20 web service on Render (or an equivalent host that supports native Node modules and persistent storage).
- **Database:** keep SQLite on a persistent mounted disk. Do not use an ephemeral filesystem for invoice records.
- **Blockchain access:** use a BNB Smart Chain Testnet RPC endpoint (chain ID 97) until testnet verification is complete.

## API service settings

- Root directory: `developer-portal/api`
- Runtime: Node.js 20
- Build command: `npm install`
- Start command: `npm start`
- Liveness path: `/health`\n- Readiness path: `/ready` (checks database, testnet RPC chain ID, and deployed token bytecode)
- Persistent disk mount path: `/var/data`
- Environment variable: `DATABASE_PATH=/var/data/vkt-payments.sqlite`

A persistent disk may require a paid hosting plan. Check the provider's current pricing and backup policy before creating a service. A free/ephemeral instance is suitable only for a disposable demo, not real invoice records.

## Required environment variables

Set these in the hosting provider's encrypted environment-variable settings, never in source control:

- `PORT`: supplied by the host when available.
- `BSC_TESTNET_RPC_URL`: HTTPS BNB Smart Chain Testnet RPC URL.
- `VKT_TOKEN_ADDRESS`: actual deployed VKT testnet contract address; do not use the zero-address example.
- `VKT_MERCHANT_ADDRESS`: merchant's public wallet address, non-zero and different from the token contract address.
- `MERCHANT_API_KEY`: at least 32 bytes of cryptographically random secret material.
- `MIN_CONFIRMATIONS`: initially `3`, subject to a documented finality policy.
- `DATABASE_PATH`: persistent disk path shown above.

Never put `MERCHANT_API_KEY`, wallet private keys, or seed phrases in the static portal, frontend environment variables, GitHub commits, or browser storage. The API does not need a customer's private key.

## Browser origin policy

- `CORS_ALLOWED_ORIGINS`: comma-separated exact HTTPS origins for the merchant frontend (for example `https://merchant.example`); HTTP is accepted only for localhost development. Do not use `*` or include URL paths. Keep this list limited to domains you control.

## Safe rollout sequence

1. Finish API tests and review the exact commit that will be deployed.
2. Deploy the VKT contract to BNB Smart Chain Testnet using a separate, funded test wallet only after explicit approval.
3. Verify the contract address and ownership/allocation on-chain.
4. Create the cloud API service and persistent disk; configure the environment variables above.
5. Confirm `/health` is live and `/ready` returns ready only when SQLite, chain ID 97 RPC, and deployed token bytecode are available; repeat after a service restart.
6. Run `npm run backup` with the source and destination on the persistent disk, then copy the backup to separate storage and perform a restore drill.
7. Create a small test invoice and verify a real wallet-signed testnet transfer end-to-end.
8. Schedule `npm run reconcile` (single instance only) against the same persistent database, for example every 5 minutes; monitor failures and reset counts. Test duplicate submissions, wrong payer, wrong amount, insufficient confirmations, service restart, backup restore, rate limiting, and reorg reconciliation.
9. Only after independent security review should production hosting or mainnet be considered.

## Current blockers

- The VKT token contract has not been deployed, so there is no verified contract address to configure.
- The API is a single-merchant testnet starter, not a production payment processor.
- The reconciliation command is implemented but must still be scheduled and monitored by the host. Stronger finality handling, monitoring/alerts, off-disk scheduled backups and restore drills, webhook delivery, merchant authentication lifecycle, and independent security review remain required. The current verification rate limit is service-wide and SQLite-backed for this single-instance starter; it is not a distributed multi-instance limiter.
- The backup command creates a consistent SQLite snapshot; the restore command validates a backup into a new destination without overwriting an existing database. Scheduling, off-disk retention, encryption, and recurring restore drills must be configured operationally.
- No cloud service, persistent disk, domain, or paid plan has been created by this repository change.
