# VKT Payment Verifier (testnet starter)

A single-merchant Node.js API that creates invoices and independently verifies VKT transfers on BNB Smart Chain Testnet (chain ID 97).

## Run

```sh
cp .env.example .env
# Set a real testnet RPC URL, deployed VKT contract address, merchant wallet,
# and a cryptographically random MERCHANT_API_KEY of at least 32 bytes. Do not use placeholder addresses.
npm install
npm start
```

The server loads `.env` automatically. Never commit it. Startup rejects merchant API keys shorter than 32 bytes; use a password manager or cryptographic random generator to create one.

## API

- `GET /health` — service/network health.
- `POST /v1/invoices` — create an invoice; requires `Authorization: Bearer <MERCHANT_API_KEY>` and JSON `{"invoiceId":"order-123","amount":"5.25","payerAddress":"0xCUSTOMER_WALLET"}`.
- `POST /v1/payments/verify` — verify JSON `{"invoiceId":"order-123","transactionHash":"0x..."}`.

The verifier checks the RPC chain ID, deployed token bytecode, successful receipt, configured token contract, expected payer, exact Transfer recipient and amount, minimum confirmations, invoice status and transaction-hash reuse. It records the receipt block number/hash and rechecks canonical block identity when a paid invoice is verified again; if the recorded block was reorganized out, the invoice is returned to pending for reconciliation. Existing SQLite databases are migrated to add the block tracking columns. Public error responses intentionally omit raw RPC/database exception details.

## Limitations and deployment checklist

- Testnet only. The VKT contract has not yet been deployed; use no guessed contract address.
- This starter is single-merchant. It does not yet support merchant onboarding, per-merchant wallets, webhook signing/retries, refunds, fiat conversion, or multiple chains.
- Protect the API key, use HTTPS, configure rate limits and monitoring, back up SQLite, and restrict network access before hosting.
- Reorg reconciliation is a basic safety layer, not a complete chain-finality guarantee. Production still needs a defined finality policy, periodic background reconciliation for every paid invoice, durable audit logs, authenticated status access, rate limiting, monitoring, backups, and independent security review.
- Do not expose the merchant API key in browser code.
- Never request or store customer private keys or seed phrases.
