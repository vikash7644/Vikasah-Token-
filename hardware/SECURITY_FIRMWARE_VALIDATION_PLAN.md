# Vikasah Hardware Wallet — Security & Firmware Validation Plan

**Status:** Engineering plan; tests have not yet been run.  
**Applies to:** Vikasah Standard (button-based confirmation) and Vikasah Pro (touchscreen-based confirmation).  
**Network scope under consideration:** BNB Smart Chain mainnet (chain ID 56) and testnet (chain ID 97), only after the implementation and test vectors are approved.  
**Release rule:** No production seed, private key, customer funds, or real-money presale may be used during prototype validation.

## 1. Objectives and non-goals

The prototype must demonstrate that:
- Private keys are generated on the device and never exported through USB, firmware logs, debug interfaces, companion software, or manufacturing tools.
- A transaction is decoded and displayed on the trusted device before a deliberate physical user confirmation.
- The signed payload is bound to the intended chain and account, and malformed, unsupported, ambiguous, or policy-disallowed requests fail closed.
- Only authenticated, integrity-checked and anti-rollback firmware can boot or update.
- Recovery, PIN protection, reset and failure handling behave predictably and are documented.
- Independent reviewers can reproduce the security evidence from source, build records, test vectors and prototype hardware.

This plan is not a certification, security audit, claim of secure-element selection, or evidence that a prototype currently exists.

## 2. Threat model

### Assets to protect
1. Seed material, private keys and derived signing capability.
2. PIN and local authentication state.
3. Firmware signing keys and device identity/provisioning records.
4. Transaction intent: destination, value, token/contract, chain ID, nonce, fees and calldata interpretation.
5. Firmware integrity, update channel and recovery process.
6. User privacy and device/manufacturing records.

### Adversaries and failure sources
- Malware on a connected Android/desktop host or compromised browser.
- Malicious USB host, cable accessory, or crafted protocol message.
- Phishing, misleading token metadata, malicious contract calldata, wrong-chain requests and replay attempts.
- Physical access to a lost/stolen device, invasive probing, fault injection or side-channel analysis.
- Compromised build/dependency pipeline, malicious firmware update or counterfeit/reworked components.
- Manufacturing operator or supplier attempting to extract secrets or substitute components.
- User mistakes, power loss, interrupted updates, corrupted storage and component failure.

### Trust boundaries
- Host app / USB transport is untrusted.
- Device firmware is trusted only after verified boot and authenticated update.
- Secure element is a candidate protection boundary, not a substitute for correct firmware, transaction review or independent evaluation.
- Manufacturer receives no customer seed phrase or private key. Production provisioning must use public device identity and controlled firmware credentials only.

## 3. Required architecture decisions (must be documented before design freeze)

- Select the secure element and document its security evaluation, key-generation API, supported curves, lifecycle controls, supply-chain provenance and failure modes. Do not claim a certification unless the exact part and configuration are independently verified.
- Define which cryptographic operations occur inside the secure element and which occur in the main MCU. Private-key export must be disabled by design and verified by test.
- Define the trusted display path and confirmation controls separately:
  - **Standard:** transaction summary on the device display, then a deliberate physical confirmation/cancel action.
  - **Pro:** transaction summary on the touchscreen, then a deliberate confirmation gesture/button with clear cancel path. Touchscreen input must not be remotely or silently activated by the host.
- Define secure boot root of trust, firmware signing-key custody, update format, version counter / anti-rollback mechanism, recovery mode and revocation procedure.
- Define PIN policy, retry throttling, secure reset/wipe behavior, lockout recovery and what data survives a reset. Do not promise tamper-proof erasure until validated.
- Define USB protocol framing, authentication where appropriate, message-size limits, timeouts, parser behavior and explicit error codes.
- Define the exact supported transaction formats. Unknown contract methods, unknown token standards, arbitrary calldata and unsupported networks must be rejected or clearly identified as unsupported; no blind signing in the initial release.
- Define entropy source, health checks, seed generation, backup/recovery format and user-facing recovery warnings. Never use a test seed for customer devices.

## 4. Firmware and hardware test matrix

| Area | Test cases | Minimum acceptance evidence |
|---|---|---|
| Key generation | Generate repeated independent test wallets; inspect host traffic, logs and debug output | No seed/private key leaves device; test keys are reproducible only from the documented test fixture, never production entropy |
| Entropy | Startup/continuous health checks, failure injection, repeated generation and statistical review | Entropy-source failure blocks key generation; cryptographic review of design and implementation |
| PIN/authentication | Wrong PIN, retry limits, power cycle, timeout, reset and recovery paths | Retry policy is enforced on-device; no host-side bypass; behavior matches published recovery UX |
| Secure boot | Modified image, unsigned image, wrong signer, corrupted header, interrupted boot | Untrusted firmware is rejected; device enters documented safe recovery state |
| Firmware update | Valid signed update, invalid signature, truncated package, downgrade, interrupted transfer/power loss | Signature and version policy enforced; no downgrade; interruption does not brick device or expose secrets |
| USB/protocol | Fuzz framing, lengths, malformed CBOR/JSON/binary fields, replayed requests, disconnects and timeouts | No crash, memory corruption, secret leakage or unintended signing; bounded resource use |
| Transaction parser | Wrong chain, altered destination, huge values, decimals, unknown token, malformed ABI, nested/unknown calldata | Device displays exact reviewed fields or refuses; host cannot substitute fields after confirmation |
| Signing | Known-answer vectors, address derivation, signature verification, chain-ID binding and nonce changes | Independent verifier confirms signatures; signatures match the exact on-device-approved transaction |
| Recovery | Restore test wallet from user-controlled backup; wrong/malformed backup; interrupted recovery | Recovery matches documented behavior; no seed transmitted to host logs or vendor tools |
| Storage/lifecycle | Power loss during writes, wear, reset, RMA/service mode, debug lock and secure disposal | No partial-state signing; secrets are inaccessible through documented service/debug paths |
| Hardware robustness | Brownout, repeated USB connect/disconnect, thermal operating envelope, ESD pre-compliance | No unsafe state or silent approval; record limits and failures; formal lab testing before certification claims |
| Supply chain | Component identity, secure element lot traceability, firmware hash, provisioning station access | Traceable BOM and controlled provisioning; no supplier access to user secrets |

All testing uses synthetic accounts, valueless testnet assets and controlled lab fixtures. No production key or live customer funds.

## 5. Transaction review and signing policy

The device must independently parse the signing request and render the security-relevant fields from the exact bytes to be signed. The host's display is informational only.

Required visible fields, where applicable:
- Network name and numeric chain ID.
- Account/from address (or a recognizable shortened form plus a way to verify it).
- Recipient / contract address in full or with a safe verification affordance.
- Native value and asset symbol; token contract and decimals must be bound to verified metadata.
- Function name and decoded arguments only when the ABI is trusted and decoding is unambiguous.
- Maximum fee / gas parameters and nonce.
- A prominent warning for approvals, unlimited allowance, contract creation, unknown methods and unsupported calldata.

Rules:
- Never silently convert an unknown request into a generic “safe” label.
- Do not rely on token name, logo, ticker or metadata supplied only by the host.
- A change to any displayed or signed field invalidates the previous approval.
- Confirmation is local and explicit; cancellation is always available.
- Chain ID and transaction domain must be included in signing validation to prevent cross-chain replay where the transaction format supports it.
- Initial release should disable blind signing and arbitrary message signing unless separately specified, threat-modelled and tested.

## 6. Test execution and evidence

For every test, record:
- Test ID, requirement, device model, hardware revision and firmware commit/hash.
- Fixture/setup, exact steps, expected result and observed result.
- Logs with secrets removed, failure screenshots/photos where appropriate, tester and timestamp.
- Pass/fail/block status, defect reference, severity and retest evidence.

Suggested stages:
1. **EVT engineering prototype:** boot, display, power, USB, key isolation and core signing path.
2. **DVT design validation:** full test matrix, environmental/robustness testing, usability and recovery.
3. **Independent assessment:** hardware, firmware, secure element integration, transaction parser, protocol, build pipeline and physical attack review by a qualified independent lab.
4. **PVT production validation:** sample-lot traceability, firmware hash verification, provisioning controls, QA yield, packaging and RMA process.

A test is not passed merely because code compiles. Attach reproducible test output and reviewed evidence.

## 7. Release gates — all required

- [ ] Standard and Pro prototypes exist and hardware revisions are frozen.
- [ ] Secure element selected; part provenance and evaluation evidence reviewed.
- [ ] Threat model and architecture decisions approved.
- [ ] Key generation and non-exportability tests pass on physical devices.
- [ ] Secure boot, signed update and anti-rollback tests pass.
- [ ] PIN, reset, recovery and interrupted-power tests pass.
- [ ] Transaction parser, display integrity, chain binding and signing vectors pass.
- [ ] USB/protocol fuzzing and robustness tests pass.
- [ ] No unresolved critical/high security findings; accepted residual risks documented by owner.
- [ ] Independent hardware/firmware security assessment completed and findings retested.
- [ ] Manufacturing provisioning, component traceability and RMA procedures audited.
- [ ] User manual, recovery warnings, support and incident-response process approved.

**No-go:** Any secret export, silent/ambiguous signing, unsigned firmware acceptance, rollback bypass, unresolved critical/high finding, or inability to reproduce test evidence blocks release.

## 8. Manufacturer information boundary

Safe to share after internal review: mechanical envelope, connector placement, non-secret BOM requirements, display/button requirements, test fixture interface and public firmware hashes.

Never share: customer seed phrases, private keys, wallet backups, production signing credentials, unrestricted firmware-signing keys, or access tokens. Keep firmware signing under owner-controlled, preferably offline or hardware-backed custody with documented multi-person authorization.

## 9. Immediate next actions

1. Confirm Standard and Pro confirmation hardware and trusted-display design.
2. Select candidate MCU and secure element only after a documented comparison and supply-chain review.
3. Build a non-production engineering prototype and test fixture.
4. Implement key-isolation and transaction-display proof-of-concept using synthetic test keys.
5. Commission an independent security lab before any real-value use or presale.

**Current evidence status:** Plan only. No physical prototype, laboratory result, certification, manufacturer quotation or independent audit is asserted by this document.
