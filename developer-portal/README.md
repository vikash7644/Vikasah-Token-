# VKT Developer Portal

A static, mobile-friendly developer documentation site for Vikasah Token.

## Components in this branch
- `index.html`, `styles.css`, `app.js`: documentation portal frontend.
- `sdk/`: non-custodial browser checkout helper for injected wallets, restricted to BNB Smart Chain Testnet (chain ID 97).
- `api/`: single-merchant Node.js + SQLite invoice and receipt verifier starter. It checks the configured token contract, chain, successful receipt, exact merchant recipient and amount, confirmation depth and transaction-hash reuse.

## Current status
These are source-code starters in a review branch, not a hosted service. The VKT contract has not yet been deployed to BNB Smart Chain Testnet, so no real contract address is published. The SDK is not published to npm, and the API is not deployed. Do not use placeholder addresses or real funds.

## Local development
- SDK: install `ethers` in the consuming test application and import `sdk/src/index.js`.
- API: enter `api/`, copy `.env.example` to `.env`, fill real testnet settings only after deployment, then run `npm install && npm start`.

## Before production
1. Deploy and independently verify the reviewed contract on testnet.
2. Pin/self-host frontend dependencies and run wallet compatibility tests, including Android.
3. Add merchant authentication, rate limiting, monitoring, webhook signing/retries and stronger reorg/concurrency handling.
4. Perform automated tests and an independent security review.
5. Only consider mainnet after explicit review and approval.

Never ask users for seed phrases or private keys.
