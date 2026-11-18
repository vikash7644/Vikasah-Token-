# VKT Treasury & Allocation Monitor

A static, read-only dashboard for Vikasah Token on BNB Smart Chain Testnet (chain ID 97).

## What it reads

- ERC-20 `totalSupply()`
- ERC-20 `decimals()`
- `balanceOf(ownerAllocationWallet)`
- `balanceOf(distributionReserveWallet)`

It checks the configured RPC chain ID and verifies that token bytecode exists before reading data. It does not connect to a wallet, request signatures, send transactions, or hold credentials.

## Run

Serve this directory with any static HTTP server, then enter:
1. The HTTPS BNB Testnet RPC URL.
2. The deployed VKT token contract address.
3. The owner-allocation receiver address.
4. The distribution-reserve receiver address.

The dashboard intentionally has no hard-coded contract or wallet addresses. Do not publish addresses until the deployment has been verified on-chain.

## Important

- The displayed 30% / 70% figures are the project's initial allocation design; live balances are fetched from the chain.
- The dashboard does not prove that the supplied wallet addresses are the intended allocation receivers. Verify them against the deployment record and verified contract constructor arguments.
- This is a transparency viewer, not an audited financial statement or proof of circulating supply.
- Testnet balances have no monetary value.
- No private key, seed phrase, wallet connection, or transaction permission is required.

## Automated checks

The repository test command also runs the monitor's dependency-free Node.js tests:

```bash
npm run test:treasury
```

These tests cover HTTPS and address validation, distinct allocation wallets, BNB Testnet chain ID configuration, decimal parsing, exact integer formatting, and supply/balance sanity checks. They do not require a deployed VKT contract or live RPC access.
