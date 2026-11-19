# Vikasah Digital Wallet

A self-custody digital wallet workstream, separate from the physical Standard/Pro hardware-wallet manufacturing plan.

## Current state

This branch adds a static responsive product preview only. It is **not** a functioning wallet:
- no seed generation or import
- no private-key storage
- no RPC connection or balance fetching
- no signing, sending, swapping, bridge, or WalletConnect
- no analytics, signup, or payment collection

Never paste a seed phrase or private key into this preview.

## Product direction

- Android-first responsive web experience, then installable PWA / native Android wrapper after security design.
- Non-custodial: secrets remain under user/device control; Vikasah servers must never receive seed phrases or private keys.
- Initial chain scope: BNB Smart Chain mainnet (56) and testnet (97), with explicit network identification.
- Assets: BNB and VKT; token contract address must be verified from an approved source before enabling token display or transfers.
- Later hardware integration: same transaction intent and signing protocol can connect to Vikasah Standard/Pro devices.

## Security architecture gates before live wallet functionality

1. Select audited cryptographic libraries and define secure random generation.
2. Decide platform key protection: Android Keystore / hardware-backed key availability, encrypted local vault, and recovery model. Do not claim all Android devices provide hardware-backed storage.
3. Define seed standard and derivation path; implement BIP-39/BIP-32 only with known-answer tests and independent review.
4. Implement transaction construction and signing locally; validate chain ID, destination, amount, nonce, fee and calldata before approval.
5. Protect against clipboard, screenshots where appropriate, backups, logs, crash reports, overlays and malicious deep links.
6. Add PIN/biometric as local unlock controls, not as a substitute for key encryption.
7. Complete threat model, dependency review, mobile security testing and independent audit before mainnet value.
8. Do not request or transmit users' recovery phrases. Support must never ask for them.

## Milestones

- [x] Static product preview
- [ ] Architecture and threat model approved
- [ ] Secure wallet core with synthetic test vectors
- [ ] Read-only BSC testnet/mainnet balance view
- [ ] Testnet receive/send and signature verification
- [ ] Android device security testing and independent audit
- [ ] Mainnet release approval

## Run preview

Open digital-wallet/index.html in a browser or host this folder as a static site. This is a static preview, not a deployable wallet application.
