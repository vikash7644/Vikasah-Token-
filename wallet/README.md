# Vikasah Wallet — mobile app foundation

## Product goal
A non-custodial companion wallet for Vikasah Token (VKT) on BNB Smart Chain, designed to pair with a future Vikasah hardware signer. The wallet must never require the user to give a seed phrase or private key to the project team, a website, a backend, GitHub, or ChatGPT.

## Release stages
1. **UI + read-only portfolio:** wallet address import/watch-only, BNB Chain balance and token metadata/balance, transaction history links, QR receive screen. No private-key entry or signing in this stage.
2. **Local wallet creation/import:** only after selecting and independently reviewing a maintained wallet/cryptography SDK. Generate/import secrets on-device; use Android Keystore / iOS Keychain and platform secure hardware where available. Never log secrets or send them to analytics, crash reports, APIs, or backups.
3. **Transaction signing:** show chain, network, destination, token, exact amount, fees, and decoded contract method before user approval. Reject wrong chain IDs and unknown/unverified contracts by default.
4. **Hardware signer pairing:** request a transaction from the app, display the exact transaction on the hardware device, and broadcast only after physical confirmation on the device.
5. **Independent security review and release:** threat model, dependency review, static analysis, test vectors, device testing, external audit, and signed reproducible release builds.

## Initial supported network
- BNB Smart Chain Mainnet: chain ID 56 (read-only integration until signing is reviewed).
- BNB Smart Chain Testnet: chain ID 97 (development/testing only).
- Native asset: BNB.
- Token: VKT; the contract address must be supplied from a verified deployment. Never invent or pre-fill an address.

## Security requirements
- Non-custodial by design; no hosted key custody.
- No seed phrase/private key fields in web forms, chat, support tickets, telemetry, or server APIs.
- Never store secrets in AsyncStorage, localStorage, plaintext files, source control, or app logs.
- Use audited, maintained cryptographic libraries; do not implement elliptic-curve cryptography, mnemonic derivation, or signing primitives from scratch.
- Enforce chain ID and transaction replay protections; validate checksums and token decimals.
- Clear signing intent on cancellation, timeout, app backgrounding, or device disconnect.
- Display human-readable transaction details and warn about unlimited approvals and unknown contracts.
- Do not claim hardware-backed security unless the specific device and implementation have been independently verified.

## Current implementation status
This document is a product/security specification, not a functioning wallet app. No private-key handling, signing, transaction broadcasting, hardware pairing, or production build is implemented by this document. The first code milestone should be a read-only portfolio app with mock-data tests and no secret handling.
