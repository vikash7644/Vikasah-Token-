# Vikasah Standard & Pro — Prototype Hardware Architecture and Component Shortlist

**Status:** Engineering shortlist for prototype quotation and bench evaluation (2026-11-19).  
**Not a production BOM, certification, security approval, or supplier commitment.** Exact orderable part numbers, package variants, lifecycle, availability, pricing, reference designs, and layout constraints must be confirmed with the manufacturers and distributors before schematic capture.

## 1. Design decision

Use one common security architecture for both models and differentiate the user interface:

- **Standard:** compact monochrome display, physical navigation/confirm buttons.
- **Pro:** colour touchscreen as requested, plus a separate hardware confirm control for final high-risk approval. Touch alone must not be the sole authorization signal.
- Both: secure element, MCU secure boot, signed firmware updates, anti-rollback, USB-C, protected debug, no Bluetooth in the first prototype.
- QR-based air-gapped transaction exchange is a later option, not a claim for prototype one.

The Pro touchscreen is an untrusted input surface until the complete display and input path is reviewed. The firmware must render decoded transaction details itself and require a deliberate final confirmation. A connected phone must never be able to approve by sending a pre-confirmed command.

## 2. Candidate component architecture

| Subsystem | Candidate / target | Selection notes |
|---|---|---|
| Secure element (primary candidate) | **NXP EdgeLock SE050 family** | First candidate for key isolation and cryptographic operations. Confirm exact SE050 variant, host interface, supported curves/algorithms, secure object policy, provisioning model, lifecycle and availability. NXP describes the family as a high-security secure element; do not transfer family-level certification claims to a specific SKU without checking its certificate and scope. |
| Secure element (alternate) | **STSAFE-A110** | Evaluate as an alternate authenticator/crypto device. Compare required signing curves, key-generation behavior, signature throughput, command set, host integration, certification scope and firmware-update signature-verification support against SE050. |
| Main MCU | **STM32U5 family (e.g. STM32U585-class evaluation)** | Candidate low-power MCU family for USB, display, secure boot and signed firmware update. Select exact SKU only after RAM/Flash, USB peripheral, display bus, package, lifecycle and secure-boot implementation are proven. |
| Standard display | 1.3–1.5 inch monochrome OLED, SPI/I²C | Prefer high contrast, wide viewing angle, no touch controller; validate readable address/amount/fee pages. Exact panel/controller TBD. |
| Pro display | 2.4–2.8 inch colour IPS, SPI/QSPI, capacitive touch | Touchscreen selected for Pro. Choose panel/controller after testing sunlight readability, viewing angle, touch noise, driver maturity, supply continuity and full transaction readability. |
| Input | Standard: 3–4 physical buttons. Pro: touch UI + dedicated confirm button | Final approval is a physical, deliberate action. Require long-press or two-step confirmation for signing. |
| Connectivity | USB-C device port | USB data/power with ESD protection and current limiting. Host supplies unsigned payload only. Do not expose a debug console or bootloader unlock path over normal USB. |
| Power | Protected Li-ion/Li-Po cell, charger, fuel gauge, power-path | Battery size TBD after display/MCU current measurements. Include over-current, over-charge, under-voltage and thermal protections; validate transport and applicable battery requirements. |
| Secure boot / update | MCU ROM/root-of-trust + signed firmware + anti-rollback | Establish immutable first-stage trust anchor, key rotation/revocation plan, recovery mode and downgrade prevention. Do not rely on a desktop app to validate firmware. |
| Debug / manufacturing | SWD/JTAG pads disabled or locked in production | Keep factory test access controlled; irreversible debug lock only after secure provisioning and recovery tests. |

### Why this shortlist

SE050 is the lead secure-element candidate because it is a dedicated secure element with a broad cryptographic/key-management feature set. STSAFE-A110 remains an alternate pending a function-by-function fit check. STM32U5 is a candidate MCU family, not a final part selection. The architecture deliberately keeps private keys and signing operations inside the secure element, with the MCU responsible for parsing, rendering, transport and policy enforcement. The precise division of cryptographic work must be confirmed against the chosen secure element's APIs and supported algorithms.

## 3. Model-specific interaction

### Standard

- Monochrome display with paginated transaction review.
- Physical up/down/back/confirm controls.
- Display chain name and chain ID, recipient, token contract (shortened with a way to inspect full value), amount, network fee and transaction method.
- Require explicit confirmation after the final review page; reject if any field cannot be rendered unambiguously.

### Pro

- Colour touchscreen with larger transaction summary and full-detail screens.
- Touch may navigate and select fields, but final signing requires the dedicated hardware confirm control.
- Show a persistent signing state and clear cancellation path.
- Never accept blind-signing or "approve all" flows in the first release.
- Touch controller firmware, gesture handling and display rendering are part of the attack surface and must be tested.

## 4. Signing and trust-boundary flow

1. Device boots through verified boot stages and checks firmware signature/version.
2. Device establishes a protected session with the secure element.
3. Host sends an unsigned EVM transaction payload.
4. MCU validates encoding, chain ID, nonce, destination, value, fee fields and supported transaction type.
5. Firmware decodes known contract calls; unknown or ambiguous calls are rejected, not summarized as safe.
6. Device displays the exact security-relevant fields on its own screen.
7. User performs final physical confirmation (button on Standard; dedicated confirm control on Pro).
8. Secure element signs internally; private key and recovery secret never leave the device.
9. Device returns signature only. Host broadcasts; device does not need network access.

Do not sign arbitrary opaque hashes or unknown EIP-712 payloads in prototype one. Add typed-data signing only after domain, chain binding, primary type and every displayed field are parsed and covered by test vectors.

## 5. Prototype bring-up plan

**Bench prototype A — security and signing path**
- MCU evaluation board + secure-element evaluation kit.
- Test-only keys and BNB testnet chain ID 97.
- Validate key generation, signing, host protocol, malformed input rejection and power-loss behavior.
- No real VKT treasury keys or mainnet funds.

**Prototype B — trusted interface**
- Add Standard display/buttons and Pro display/touch/confirm control.
- Test transaction review against a golden set of known raw transactions and contract calls.
- Verify that the displayed fields exactly match the signed payload.

**Prototype C — custom PCB**
- Complete schematic, PCB layout, power/USB/ESD review, antenna-free mechanical design, debug policy and manufacturing test points.
- Build a small engineering batch before any 100-unit production decision.

## 6. Required evidence before freezing the BOM

- Vendor datasheets, reference manuals, security certificates and certificate scope for exact orderable SKUs.
- Written confirmation of secure-element algorithms, key import/generation restrictions, object policy and firmware support.
- MCU secure-boot and signed-update design reviewed against vendor reference implementation.
- Component availability, lifecycle, authorized distribution, MOQ, lead time and traceability.
- Display readability and touch reliability results on physical samples.
- Power, thermal, USB ESD, drop and enclosure tests.
- Independent review of the secure boot chain, secure-element integration, transaction parser, trusted display and recovery process.
- Production test plan and per-device provisioning process that never exposes seed phrases or private keys to the contract manufacturer.

## 7. Explicit exclusions / unresolved decisions

- No exact display, battery, charger, USB-C receptacle, protection IC, buttons, enclosure material or PCB stack-up selected yet.
- No vendor quotation, purchase order, prototype, certification, audit or production validation is implied.
- No Bluetooth, Wi-Fi, NFC, cloud recovery or companion-app custody in prototype one.
- Bitcoin/PSBT and arbitrary EIP-712 signing are out of initial scope.
- BNB Smart Chain chain IDs 56 and 97 remain proposed support targets; support must not be advertised until chain binding, replay protection, parser and independent test vectors pass.

## 8. Reference sources

- NXP EdgeLock SE050 product family: https://www.nxp.com/pages/edgelock-se050-plug-and-trust-secure-element-family-enhanced-iot-security-with-high-flexibility:SE050
- NXP SE050 datasheet: https://www.nxp.com/docs/en/data-sheet/SE050-DATASHEET.pdf
- NXP EdgeLock SE051 family (comparison reference): https://www.nxp.com/products/SE051
- STSAFE-A110 product page: https://www.st.com/en/secure-mcus/stsafe-a110.html

These vendor pages are starting points. Re-check current documentation and exact part-number applicability during schematic design and procurement.
