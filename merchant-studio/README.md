# VKT Merchant Studio (MVP)

A static, non-custodial invoice and QR prototype for BNB Smart Chain testnet (chain ID 97).

## Included
- Create a VKT payment request using merchant address, token contract, amount and optional order reference.
- Generate a QR code containing a shareable invoice URL.
- Open the invoice on another device and pay using an injected EIP-1193 wallet.
- Request a VKT ERC-20 transfer and wait for one block confirmation.
- Keep a small invoice history in the current browser local storage.

## Run
Serve this folder with any static HTTP server, or publish it as a static site. No Node.js build or phone-side installation is required. Ethers.js and QRCode.js load from public CDNs.

## Setup and safety
1. Deploy the token to BNB testnet separately and verify its source on BscScan.
2. Enter the exact verified testnet token contract address. The app does not invent or hardcode an undeployed address.
3. Use a wallet on BNB Smart Chain Testnet (chain ID 97) with testnet tBNB for gas.
4. Check recipient, token contract and amount in the wallet before signing.
5. A successful receipt is shown only after one confirmation. The merchant should independently verify token contract, recipient, amount and confirmation on BscScan.

## Security boundaries
- Never requests or stores seed phrases or private keys.
- Creating an invoice does not sign or transfer tokens.
- Does not custody funds, auto-convert tokens, or create liquidity.
- Invoice history is local to one browser, not a shared merchant database.
- No server-side webhook, independent merchant-side watcher, fiat pricing, refunds, login or production monitoring yet.
- External CDN scripts are runtime dependencies; pin and self-host audited dependencies before production.

**Not production-ready. Testnet only. No mainnet or real-money use is supported by this MVP.**