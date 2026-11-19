# Vikasah Hardware Wallet — engineering specification

## Goal
Design a dedicated offline transaction-signing device for Vikasah Wallet. This repository currently contains specifications only; it is not a manufactured device, certified secure element, audited firmware, or ready-to-use hardware wallet.

## Proposed first device
- Shared security architecture for Standard and Pro.
- Secure element selected only after vendor security documentation and independent review.
- Microcontroller with secure boot and signed firmware updates.
- Standard: compact monochrome display and physical navigation/confirmation buttons.
- Pro: colour touchscreen plus a separate physical final-confirm control.
- USB-C data/power; QR-based air-gapped transaction exchange is a later option.
- No Bluetooth in the first prototype to reduce attack surface.
- Tamper-evident enclosure and protected debug interfaces.
- Protected battery/charging design reviewed for electrical and thermal safety.

## Component architecture
See [PROTOTYPE_COMPONENT_ARCHITECTURE.md](./PROTOTYPE_COMPONENT_ARCHITECTURE.md) for the current prototype shortlist and model-specific design.

- Lead secure-element candidate: NXP EdgeLock SE050 family; exact SKU and certificate scope not yet approved.
- Alternate secure-element candidate: STSAFE-A110, subject to feature-fit comparison.
- Main MCU candidate: STM32U5 family; exact SKU not yet frozen.
- Standard display: 1.3–1.5 inch monochrome OLED, exact controller TBD.
- Pro display: 2.4–2.8 inch colour IPS touchscreen, exact controller TBD.
- Final Pro signing approval must require a dedicated physical confirm control; touch alone is not the authorization signal.

## Signing model
1. Device boots through verified boot stages and checks signed firmware/version.
2. Device generates its own entropy and key material through a reviewed hardware-backed path.
3. Recovery words are displayed only on the device during setup; users write them offline.
4. The app sends an unsigned transaction.
5. Firmware validates and displays chain ID, destination, token contract, amount, fee and supported method.
6. User explicitly confirms on the device (physical control on both models).
7. Secure element signs internally and the device returns only the signature.
8. The app broadcasts the signed transaction; private key material never leaves the device.

Unknown or ambiguous transaction calls must be rejected. EIP-712 typed-data signing is out of scope until domain and payload parsing are fully implemented and tested.

## First protocol scope
- Proposed EVM transaction signing for BNB Smart Chain chain IDs 56 and 97.
- Do not advertise network support until chain binding, replay protection, token/contract display and malformed transaction rejection pass test vectors and independent review.
- Bitcoin support is a later separate milestone using PSBT; do not claim BTC support in the first release.

## Mandatory security gates
- Threat model covering malicious host/app, supply-chain compromise, physical access, fault injection, side channels, rollback and recovery attacks.
- Secure-element vendor review and key-isolation validation.
- Reproducible firmware builds, signed boot chain, anti-rollback and debug-lock policy.
- Fuzzing and test vectors for transaction parsing and signing formats.
- Independent hardware and firmware security assessment before real funds.
- Recovery and loss scenarios tested before public release.

## Prototype phases
1. Architecture and component shortlist.
2. Development-board proof of concept with test keys only.
3. Trusted display + physical confirmation and EVM testnet signing.
4. Custom PCB and enclosure prototype.
5. Independent security review and manufacturing validation.

## Important
A software mockup or development board is not equivalent to a secure commercial hardware wallet. Never store a real VKT treasury key on an unreviewed prototype. Keep treasury funds in established audited hardware/multisig custody until this device passes independent review. Component candidates are not an approved BOM, and no supplier quote or production commitment exists.
