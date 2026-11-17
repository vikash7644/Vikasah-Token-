# VKT Payment Verifier (testnet starter)

A single-merchant Node.js API that creates invoices and independently verifies VKT transfers on BNB Smart Chain Testnet (chain ID 97).

## Run

```sh
cp .env.example .env
# Set a real testnet RPC URL, deployed VKT contract address, merchant wallet,
# and a long random MERCHANT_API_KEY. Do not use placeholder addresses.
npm install
npm start
```

## API

- `GET /health` — service/network health.
- `POST /v1/invoices` — create an invoice; requires `Authorization: Bearer <MERCHANT_API_KEY>` and JSON `{"invoiceId":"order-123","amount":"5.25"}`.
- `POST /v1/payments/verify` — verify JSON `{"invoiceId":"order-123","transactionHash":"0x..."}`.

The verifier checks the RPC chain ID, deployed token bytecode, successful receipt, configured token contract, exact Transfer recipient and amount, minimum confirmations, invoice status and transaction-hash reuse. SQLite persists invoice/payment records.

## Limitations and deployment checklist

- Testnet only. The VKT contract has not yet been deployed; use no guessed contract address.
- This starter is single-merchant. It does not yet support merchant onboarding, per-merchant wallets, webhook signing/retries, refunds, fiat conversion, or multiple chains.
- Protect the API key, use HTTPS, configure rate limits and monitoring, back up SQLite, and restrict network access before hosting.
- For production, handle chain reorganizations and concurrent verification with a stronger transactional/idempotent design, add authenticated status access and audit logs, and obtain an independent security review.
- Do not expose the merchant API key in browser code.
- Never request or store customer private keys or seed phrases.
