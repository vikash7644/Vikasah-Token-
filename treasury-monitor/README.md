# VKT Treasury & Allocation Monitor

A static, read-only dashboard for Vikasah Token on BNB Smart Chain Testnet (chain ID 97).

## What it reads

- ERC-20 `totalSupply()`
- ERC-20 `decimals()`
- `balanceOf(ownerAllocationWallet)`
- `balanceOf(distributionReserveWallet)`
- A single pinned block number and block hash used for the entire snapshot (contract bytecode, supply, decimals and both balances)

It checks the configured RPC chain ID and verifies that token bytecode exists before reading data. It does not connect to a wallet, request signatures, send transactions, or hold credentials.

## Run

Serve this directory with any static HTTP server, then enter:
1. The HTTPS BNB Testnet RPC URL.
2. The deployed VKT token contract address.
3. The owner-allocation receiver address.
4. The distribution-reserve receiver address.

After a successful read, the dashboard can export JSON and CSV snapshots containing the network, block number and hash, on-chain block timestamp, capture time, entered addresses, raw integer values and formatted balances. Both formats retain raw integer values for accurate downstream processing. Every contract read in one snapshot uses the same block tag to avoid mixing values from different blocks. The monitor rechecks that block hash after reading and discards the snapshot if the block changed during collection (for example, during a reorganization). It also validates the RPC block timestamp before exporting. Raw values are preserved so downstream tools do not need to parse rounded display values.

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
## Related VKT payment tools

The monitor is intentionally read-only and is not the payment verifier. The related components are maintained as separate draft pull requests:

- [VKT Merchant Studio — invoice and QR checkout (PR #1)](https://github.com/vikash7644/Vikasah-Token-/pull/1) creates invoices and lets a customer approve a VKT transfer in their own wallet.
- [VKT Developer Portal, Checkout SDK and Payment Verifier API (PR #3)](https://github.com/vikash7644/Vikasah-Token-/pull/3) verifies transaction receipts and persists invoice settlement status. Merchant Studio's server proxy is configured to call this API; it keeps the merchant API key server-side.
- This Treasury Monitor (PR #4) independently reads token supply and the two allocation-wallet balances at one pinned block. It cannot create invoices, verify merchant orders, or move funds.

### Safe integration order

1. Review the token deployment configuration and independently verify all three wallet roles before any deployment transaction. No VKT contract address is currently published by these draft PRs.
2. Deploy and verify the testnet token only after explicit wallet-owner approval; record the verified contract address and allocation receivers.
3. Configure the Payment Verifier API with that exact chain ID, token address, merchant recipient, RPC endpoint and durable database. Keep its API key private.
4. Configure Merchant Studio's server proxy with the verifier's HTTPS base URL and the matching private API key. Confirm its public chain/token/merchant configuration matches the invoice before any wallet transfer.
5. Open this monitor separately with the verified token and allocation receiver addresses. Compare its on-chain balances with the deployment record; do not treat its 30% / 70% design labels as proof of wallet ownership.

All three pull requests are independent, open drafts. Their CI checks do not mean the services are deployed or that a live testnet payment has been completed. Do not use real funds or expose API keys in browser code.
