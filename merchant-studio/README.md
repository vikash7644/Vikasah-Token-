# VKT Merchant Studio

A non-custodial VKT checkout interface for BNB Smart Chain Testnet (chain ID 97), with a server-side bridge to the VKT invoice verifier.

## What it does

- Creates a shareable invoice URL and QR code with a stable invoice ID.
- Connects to an injected EIP-1193 wallet and requires BNB Smart Chain Testnet.
- When the customer chooses **Pay with wallet**, registers the invoice with the merchant API using the connected payer address.
- Requests the exact VKT transfer in the wallet; the customer reviews and signs it.
- Sends the transaction hash to the server-side verifier, which checks the token contract, expected payer, merchant recipient, exact amount, successful receipt and configured confirmation depth.
- Polls for the verifier's persisted invoice status and displays **PAID** only after the backend confirms it.
- Keeps a small local invoice history for convenience; the backend database is the payment record.

## Run the server-backed version

The status API key is deliberately kept on the server. Do not add `MERCHANT_API_KEY` to browser JavaScript, HTML, local storage, or a public Vercel environment variable.

1. Review and merge/deploy the matching [VKT Payment Verifier API PR #3](https://github.com/vikash7644/Vikasah-Token-/pull/3) separately; configure its persistent SQLite database and BNB testnet RPC. PR #3 is a separate draft and is not automatically included by this Merchant Studio PR.
2. From this folder, install the server dependencies:

   ```sh
   cd server
   npm install
   cp .env.example .env
   ```

3. Edit `.env` on the server only:
   - `VKT_API_BASE_URL`: HTTPS URL of the deployed VKT Payment Verifier API (HTTP is allowed only for localhost development).
   - `MERCHANT_API_KEY`: the same strong, random merchant API key configured on the verifier; at least 32 bytes.
4. Start the app:

   ```sh
   npm start
   ```

5. Open the Merchant Studio server URL. The server serves this folder and exposes same-origin routes:
   - `GET /api/vkt/config` — returns the API's public chain ID, token address and merchant address. The browser compares these with the invoice before sending any transfer.
   - `POST /api/vkt/invoices` — registers invoice ID, amount and connected payer.
   - `POST /api/vkt/payments/verify` — requests chain receipt verification.
   - `GET /api/vkt/invoices/:invoiceId` — returns persisted invoice status through the server-held API key.

The server proxy validates invoice inputs, applies a per-IP request limit, forwards the secret only from the server, and returns stable errors. The browser never receives the merchant API key. Host the frontend and this proxy on the same origin; a static-only deployment does not provide these routes and cannot complete backend verification.

## Render deployment blueprint

The repository-root `render.yaml` defines a free-tier web service with `merchant-studio/server` as its root directory. In Render, create a Blueprint from this repository and set `VKT_API_BASE_URL` and `MERCHANT_API_KEY` as private environment values. The `/health` endpoint is used for process health; `/ready` checks the VKT API's public chain configuration and its own readiness result, including database access, BNB testnet RPC chain ID and deployed token bytecode.

The free service may sleep when idle and is suitable only for development/testnet evaluation, not dependable payment processing. The VKT verifier API must be deployed separately with durable database storage before this service can complete invoice creation and settlement. No hosting service has been created or deployed by adding this blueprint.

## Test

```sh
cd server
npm install
npm test
```

The proxy and server integration tests use a mocked upstream API; they cover route validation, secret forwarding, readiness gating and static-file exposure. They do not claim that a live contract or testnet payment has been tested.

## Safety and current limitations

- Testnet only. The VKT token and Utility Passport contract have not yet been deployed; no verified contract address is published.
- No seed phrase or private key is requested or stored. Every transfer is approved by the user's wallet.
- The API expects a payer address and binds it to the invoice before the transfer.
- The app never marks a payment paid based only on a wallet popup or a transaction hash; the backend must confirm it.
- A failed or delayed backend check may leave an on-chain transfer with an invoice still pending. The merchant must reconcile the transaction before fulfilling an order.
- This is a single-merchant starter, not a multi-tenant payment processor. No webhook delivery, fiat conversion, refunds, merchant login, production monitoring or independent security audit is included.
- External ethers.js and QRCode.js scripts are loaded from CDNs; pin and self-host audited copies before production.

**Not production-ready. BNB testnet only. Do not use real funds or claim mainnet support.**
