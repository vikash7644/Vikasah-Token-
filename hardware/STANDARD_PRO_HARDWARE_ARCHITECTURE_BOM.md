# Vikasah Hardware Wallet — Standard & Pro Architecture and Preliminary BOM

**Document status:** Preliminary engineering baseline (Rev 0.1), for design review and manufacturer feasibility discussions only.  
**Models:** Vikasah Standard (physical-button UI) and Vikasah Pro (touchscreen UI).  
**Pilot quantity under consideration:** 50 Standard + 50 Pro (100 total).  
**Not a production release:** No schematic, PCB layout, validated prototype, approved vendor, firm price, certification, or security audit is represented here.

## 1. Design decision

Use one shared security architecture and firmware core for both models. Keep the user-interface board/display and enclosure different. This reduces duplicated security-critical code and makes it easier to maintain the same transaction review rules.

### Common security architecture

1. USB-C connects to an untrusted host. USB data is treated as hostile input.
2. Main MCU runs the wallet application, transaction parser, display controller and signed-update bootloader.
3. A dedicated secure element is the hardware root of trust for device identity, protected credentials and (only if the exact SKU/API supports it) secp256k1 key operations.
4. A hardware entropy source / MCU TRNG feeds an approved cryptographic DRBG. Entropy health failure must stop wallet creation.
5. Private-key material must never be sent to the host, debug port, logs, factory test station or cloud.
6. The device independently parses and renders transaction fields. The host's display is never the approval authority.
7. Firmware updates are signed offline by the product owner; devices reject unsigned, corrupted and unauthorized downgrade images.

**Important design gate:** Do not assume every Secure Element SKU supports Ethereum's secp256k1 curve or the required derivation/signing workflow. Confirm exact ordering code, firmware/app configuration, API support, object policy, performance and lifecycle controls with the manufacturer before schematic freeze. If the chosen secure element cannot perform the required wallet operation securely, redesign the key architecture; do not silently move secrets to the host.

## 2. Model architecture

| Subsystem | Vikasah Standard | Vikasah Pro |
|---|---|---|
| Main controller | Shared MCU family and firmware core | Same MCU family and firmware core |
| Security | Same Secure Element and trust model | Same Secure Element and trust model |
| Display | Low-power monochrome display, target 1.5–2.1 inch | Colour capacitive touchscreen, target 2.4–3.5 inch |
| User confirmation | Dedicated physical confirm and cancel buttons; hold-to-confirm for sensitive actions | Touch review plus deliberate physical confirm control; cancel always available |
| Input | Navigation buttons | Touch input; optional side buttons for power/back |
| Connectivity | USB-C data + power | USB-C data + power |
| Power | USB-powered prototype first; optional rechargeable battery only after power/safety review | USB-powered prototype first; optional rechargeable battery only after power/safety review |
| Enclosure | Compact, durable, tamper-evident design | Larger enclosure with protected touchscreen and tactile side control |

The Pro touchscreen is not itself a security boundary. The confirmation state must be controlled by trusted firmware, and critical approval should require a deliberate physical action or a separately justified secure interaction design.

## 3. Preliminary component shortlist (not yet approved)

| Function | Candidate / target | Qty per device | Selection notes |
|---|---|---:|---|
| Main MCU | STM32U5-class MCU or equivalent low-power MCU with TrustZone-M, secure boot support, hardware crypto and TRNG | 1 | Compare flash/RAM, secure boot lifecycle, debug lock, toolchain, long-term supply and secure firmware-update design. Exact part number remains open. |
| Secure Element | NXP EdgeLock SE050 family, exact variant to be selected after secp256k1 and API validation; compare other wallet-suitable secure elements | 1 | Verify exact SKU supports secp256k1 (Koblitz 256k1), required signing/derivation operations, secure object policy, anti-tamper claims and procurement provenance. Family-level capability is not sufficient evidence. |
| Standard display | Monochrome OLED or memory LCD, 1.5–2.1 inch, SPI/I²C | 1 | Choose based on readability, power, viewing angle, lifecycle and availability. |
| Pro display | 2.4–3.5 inch colour capacitive touchscreen, SPI/RGB interface | 1 | Prefer a module with documented controller, touch controller, stable supply and protective cover lens. |
| USB connector | USB-C receptacle, mechanically reinforced | 1 | USB 2.0 data initially; implement correct CC resistors / power-role behavior and ESD protection. |
| USB protection | USB data-line ESD protection array | 1 | Place close to connector; validate layout and IEC ESD test plan. |
| Power management | Protected USB input, low-noise regulators, current limiting and battery charger only if battery is approved | 1 set | Do not add a lithium battery to EVT until charging, thermal and transport safety are designed. |
| User controls | Tactile switches: navigation, confirm, cancel, power | 3–5 | Standard uses dedicated controls; Pro retains a physical power/back or confirmation control. |
| Haptic / buzzer | Optional low-power haptic motor or buzzer | 0–1 | Optional; must not replace visual confirmation. |
| Non-volatile storage | MCU internal flash first; external secure storage only if justified | 0–1 | Never store plaintext seed or private key in ordinary external flash. |
| Clock | MCU internal oscillator initially; crystal if timing/USB requirements demand | 0–1 | Confirm timing accuracy and USB compliance. |
| PCB | 4-layer FR-4, controlled stack-up, test points restricted/disabled in production | 1 | EVT may expose controlled test pads; production must lock debug access and document lifecycle. |
| Enclosure | Injection-mouldable polymer or CNC/printed EVT enclosure | 1 | Separate Standard and Pro mechanical design; no tamper-resistance claim without testing. |
| Packaging | Anti-tamper seal, quick-start and recovery warning card | 1 set | Never print or request customer recovery words during manufacturing. |

### Candidate secure-element note

NXP's public EdgeLock SE050 family documentation describes secure-element security features and lists supported ECC families; an NXP technical presentation lists Koblitz secp256k1 support for specific SE050 variants. This is a **candidate for evaluation**, not proof that every SE050 variant or configuration supports the exact Ethereum wallet workflow. Obtain written SKU-specific confirmation and test the complete BIP-32/BIP-39/EIP-155 signing flow before selecting it.

## 4. Preliminary BOM quantities for 100-unit pilot

The quantities below are planning quantities only. They exclude engineering spares, assembly yield loss and MOQ. The final purchase order must be based on the frozen schematic and manufacturer quote.

| Item | Standard 50 | Pro 50 | Pilot total |
|---|---:|---:|---:|
| Main MCU | 50 | 50 | 100 |
| Secure Element | 50 | 50 | 100 |
| Display module | 50 monochrome | 50 touchscreen | 100 |
| USB-C receptacle | 50 | 50 | 100 |
| ESD protection | 50 sets | 50 sets | 100 sets |
| Power-management components | 50 sets | 50 sets | 100 sets |
| User controls | 150–250 | 100–200 | 250–450 |
| PCB assembly | 50 | 50 | 100 |
| Enclosure set | 50 | 50 | 100 |
| Packaging set | 50 | 50 | 100 |

Add 5–10% engineering/production spares only after supplier lead times and yield assumptions are known. Do not order the secure element until the exact part and key-management architecture are approved.

## 5. Firmware modules shared by both models

- Boot ROM / immutable boot stage where supported.
- Signed bootloader with anti-rollback counter and documented recovery.
- Device identity and secure-element provisioning.
- Entropy health checks and deterministic test fixtures (test-only).
- Wallet derivation and key-isolation layer.
- Transaction decoder and policy engine.
- Trusted display renderer with field-by-field review.
- Physical confirmation state machine.
- USB transport parser with strict framing, limits, timeouts and fuzz tests.
- BNB Smart Chain transaction support: chain ID 56 and testnet chain ID 97 only after test vectors and parser coverage are approved.
- Firmware update package verification and offline signing workflow.
- Secret-safe diagnostics: no seed, private key, PIN or recovery words in logs.

## 6. EVT schematic / PCB block diagram

```text
Untrusted phone / desktop host
          |
        USB-C
          |
   ESD + power protection
          |
      Main MCU  <------> Display / touch or buttons
       |   |
       |   +----------> Secure Element (I2C/SPI, protected policy)
       |
       +--------------> Restricted debug/test pads (locked in production)
       |
   Power management
```

The secure element bus, reset behavior, boot verification path and MCU debug lifecycle must be reviewed as a complete threat model. The block diagram is conceptual and is not a schematic.

## 7. Design and procurement gates

### Gate A — architecture proof (before PCB design)
- [ ] Choose exact MCU ordering code and verify lifecycle / secure boot / TRNG documentation.
- [ ] Choose exact secure-element ordering code; obtain written confirmation for secp256k1 support and required APIs.
- [ ] Prove test-only wallet derivation and signature verification against published test vectors.
- [ ] Decide whether signing occurs entirely in the secure element. If not, document the protected key boundary and threat analysis.
- [ ] Freeze Standard button state machine and Pro touchscreen + physical confirmation behavior.
- [ ] Define supported transaction types and reject blind signing by default.

### Gate B — EVT engineering samples
- [ ] Schematic and PCB reviewed by an independent embedded-security engineer.
- [ ] Bring-up: power, USB, display, buttons/touch and secure-element communication.
- [ ] Secure boot and signed update demonstrated on physical devices.
- [ ] Synthetic test keys only; no production seeds or customer funds.
- [ ] Key non-exportability and transaction-display integrity tests pass.

### Gate C — DVT and independent security
- [ ] Complete firmware/security validation matrix in SECURITY_FIRMWARE_VALIDATION_PLAN.md.
- [ ] Hardware fault, ESD, thermal, power-loss and storage tests completed.
- [ ] Independent security assessment completed; critical/high findings closed.
- [ ] Recovery instructions and user warnings reviewed.

### Gate D — PVT and production
- [ ] Approved vendor list, traceable BOM and second-source risk review.
- [ ] Controlled provisioning; manufacturer never receives customer keys or firmware-signing private keys.
- [ ] Per-device firmware hash, serial number and QA evidence recorded.
- [ ] Yield, warranty, RMA, packaging and support processes approved.
- [ ] Final costed BOM and signed manufacturer quotation approved before purchase order.

## 8. RFQ data to request from manufacturers

Ask each manufacturer to quote separately for:
1. EVT: 5 assembled units per model (10 total), including PCB fabrication, assembly and bring-up.
2. DVT: 10 assembled units per model (20 total), after EVT corrections.
3. PVT / pilot: 50 units per model (100 total), after design freeze.
4. NRE, PCB tooling, enclosure tooling, test fixture, programming/provisioning, assembly, QA, packaging and shipping as separate line items.
5. MOQ, component substitutions, lead times, payment terms, warranty, yield assumptions, defect handling, traceability and change-notification policy.
6. Whether the supplier has prior experience with secure-element integration and controlled firmware provisioning. Request references and evidence; do not rely on marketing claims.

No target unit price is asserted in this document. Request current written quotes and compare like-for-like BOM revisions, taxes, duties, tooling and logistics.

## 9. Manufacturer security boundary

Manufacturer may receive approved non-secret mechanical files, schematic/BOM after design review, test instructions and public firmware hashes. Manufacturer must not receive customer seed phrases, private keys, recovery backups, production firmware-signing private keys, exchange/API credentials or wallet funds. Provisioning credentials must be scoped, logged, revocable and controlled by Vikasah.

## 10. Reference documentation

- NXP EdgeLock SE050 product family: https://www.nxp.com/pages/edgelock-se050-plug-and-trust-secure-element-family-enhanced-iot-security-with-high-flexibility:SE050
- NXP SE05x secure boot application note: https://www.nxp.com/docs/en/application-note/AN13086.pdf
- STM32U5 product family: https://www.st.com/en/microcontrollers-microprocessors/stm32u5-series.html

**Current evidence status:** Preliminary architecture and BOM planning only. No component has been purchased or frozen; no schematic/PCB, prototype, manufacturer quotation, security certification or independent audit is claimed.
