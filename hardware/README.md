# Vikasah Hardware Wallet — engineering specification

## Goal
Design a dedicated offline transaction-signing device for Vikasah Wallet. This repository currently contains a specification only; it is not a manufactured device, certified secure element, audited firmware, or ready-to-use hardware wallet.

## Proposed first device
- Secure element selected only after vendor security documentation and independent review.
- Microcontroller with secure boot and signed firmware updates.
- Small trusted display and physical confirmation buttons.
- USB-C data/power; QR-based air-gapped transaction exchange as an alternative.
- No Bluetooth in the first prototype to reduce attack surface.
- Tamper-evident enclosure and protected debug interfaces.
- Battery and charging design reviewed for electrical and thermal safety.

## Signing model
1. The device generates its own entropy using a reviewed hardware random source.
2. Recovery words are displayed only on the device during setup; users write them offline.
3. The app sends an unsigned transaction or typed-data request.
4. Firmware parses and displays chain ID, destination, token contract, amount, fee, and method.
5. User confirms with a physical button.
6. Device signs internally and returns only the signature.
7. The app broadcasts the signed transaction; private key material never leaves the device.

## First protocol scope
- EVM transaction signing for BNB Smart Chain chain IDs 56 and 97.
- EIP-712 typed-data signing only after domain and payload parsing are implemented and tested.
- Reject unknown chain IDs, malformed transactions, unsupported opcodes/methods, and ambiguous display fields.
- Bitcoin support is a later separate milestone using PSBT; do not claim BTC support in the first release.

## Mandatory security gates
- Threat model covering malicious host/app, supply-chain compromise, physical access, fault injection, side channels, rollback, and recovery attacks.
- Secure-element vendor review and key-isolation validation.
- Reproducible firmware builds, signed boot chain, anti-rollback, and debug-lock policy.
- Fuzzing and test vectors for transaction parsing and signing formats.
- Independent hardware and firmware security assessment before real funds.
- Recovery and loss scenarios tested before public release.

## Prototype phases
1. Architecture and component selection.
2. Development-board proof of concept with test keys only.
3. Trusted display + button confirmation and EVM testnet signing.
4. Custom PCB and enclosure prototype.
5. Independent security review and manufacturing validation.

## Important
A software mockup or development board is not equivalent to a secure commercial hardware wallet. Never store a real VKT treasury key on an unreviewed prototype. Keep treasury funds in established audited hardware/multisig custody until this device passes independent review.
