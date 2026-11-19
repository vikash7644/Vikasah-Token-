# Vikasah Hardware Wallet — Manufacturer RFQ

**Status:** Request for quotation only. This document is not a purchase order or authorization to pay a supplier.

## Pilot batch

- 50 × Vikasah Standard
- 50 × Vikasah Pro (colour touchscreen)
- Total: 100 devices
- Initial market: India
- Currency: INR; suppliers must show GST, freight, tooling and other charges separately.

## Product requirements

### Standard
- Secure element (supplier must identify exact manufacturer, part number and security documentation).
- USB-C interface.
- Compact display and physical confirmation buttons.
- PIN-protected access.
- On-device key generation and transaction signing.
- EVM-compatible signing; BNB Smart Chain mainnet (chain ID 56) and testnet (chain ID 97).
- ERC-20/BEP-20 transaction review and signing.
- Secure boot, authenticated firmware updates and anti-rollback.
- Tamper-evident enclosure and unique serial number.

### Pro
- All Standard security and signing requirements.
- Colour touchscreen.
- Premium enclosure; supplier to quote aluminium and durable polymer options separately.
- On-device PIN and transaction review.
- Screen must clearly show network, recipient, asset, amount, fees and relevant transaction data before approval.

## Mandatory security requirements

1. Private keys and recovery secrets must be generated and remain inside the device's protected key architecture.
2. No manufacturer, mobile app, cloud service, analytics SDK, USB host or support process may receive private keys or recovery phrases.
3. No hidden remote-access, key-export or administrative backdoor.
4. Secure boot, signed firmware, anti-rollback and protected debug interfaces.
5. Supplier must provide a threat model, security architecture, firmware update design and test plan.
6. Independent security assessment is required before production approval.
7. Use test-only keys during development. Never provide real customer seed phrases or treasury keys to a supplier.
8. Do not claim certification or security assurance unless the exact product has passed the relevant assessment.

## Quotation requested

Provide separate itemised prices for:
- Requirements and architecture
- Industrial design and mechanical enclosure
- Schematic and PCB layout
- Prototype PCB fabrication and assembly
- Secure-element procurement and integration
- Firmware development and source-code handover
- Mobile app integration support
- Touchscreen integration (Pro)
- Test fixtures and functional test procedures
- Security testing and independent audit (separately itemised)
- Tooling and NRE
- 50 Standard + 50 Pro pilot production
- Packaging, freight, GST and warranty reserve

Also quote unit pricing at 50, 100, 500 and 1,000 units, with MOQ, lead time, payment milestones, warranty, DOA/defect replacement terms and component lifecycle/availability.

## Acceptance gates

1. Supplier qualification, NDA and written IP terms.
2. Architecture and exact secure-element approval.
3. Working Standard and Pro engineering samples.
4. Functional tests and documented security review.
5. Independent security assessment and remediation.
6. Written Vikasah approval before the 100-unit production run.
7. Per-device QA records, serial-number traceability and final delivery inspection.

No production order or advance payment is authorized until the acceptance gates are met.

## IP and handover

The agreement must define Vikasah's ownership or durable rights to custom PCB source files, schematics, Gerbers, BOM, mechanical CAD, firmware source, build instructions, test fixtures and product documentation. Third-party components and open-source licenses must be disclosed. Supplier subcontractors and component substitutions require written approval.

## Supplier pre-qualification shortlist

These are leads for technical evaluation, not approved suppliers or confirmed wallet manufacturers.

### Ambimat Electronics — Ahmedabad
- Publicly describes embedded product engineering, hardware/firmware, PCB manufacturing support, assembly, testing and productisation.
- Its EMS page says bare-board fabrication is handled through manufacturing partners while assembly, wiring and testing are performed by its technicians.
- Contact: business.development@ambimat.com; +91-79-25501989.
- Website: https://ambimat.com/
- RFQ contact: https://ambimat.com/contact/
- Ask specifically for the exact secure-element part, secure-wallet experience, source-code/IP terms and whether it can own the full device programme.

### Shematic — Noida
- Publicly describes ODM and contract manufacturing, SMT/THT/BGA assembly, inspection and prototype-to-volume services.
- Website: https://www.shematic.in/services
- Ask for evidence of secure-element integration and wallet firmware experience; general EMS capability alone does not establish this.

### Digital Circuits — Bengaluru / Mysore / Baddi
- Publicly describes PCB assembly, box build, system integration and electronics contract manufacturing.
- Contact: ankur.goyal@digitalcircuits.in; +91-98451-70988.
- Website: https://digitalcircuits.in/electronics-contract-manufacturing-india
- Best treated initially as a production/assembly candidate after Vikasah's design is production-ready; ask whether it can support 100-unit pilot NPI.

## Supplier response template

Please provide:
1. Company profile and manufacturing locations.
2. Relevant hardware security and secure-element project references.
3. Proposed secure-element manufacturer and exact part number.
4. Proposed MCU, display, USB and enclosure components.
5. Security architecture and threat model.
6. Itemised engineering, prototype and unit costs.
7. Source-code, design-file and IP ownership terms.
8. Prototype and production lead times.
9. QA, traceability, warranty and defect-replacement process.
10. Written confirmation of what is performed in-house and what is subcontracted.

**Important:** Supplier capabilities listed above are based on public company descriptions and are not an endorsement, security certification or confirmation that any supplier has agreed to build Vikasah Wallet.
