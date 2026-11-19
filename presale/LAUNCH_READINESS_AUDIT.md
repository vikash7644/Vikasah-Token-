# Vikasah Hardware Wallet — Launch Readiness Audit

**Audit date:** 2026-11-19  
**Scope:** Static landing page and engineering/readiness notes on PR #7, branch `feat/vikasah-presale-site`.  
**Reviewed files:** `presale/index.html`, `presale/README.md`, `hardware/README.md`.  
**Decision:** **NOT READY for commercial launch or presale.** Suitable only as a clearly labelled concept / pre-launch information page after the publishing owner approves it.

## What is already in place

- Responsive static HTML page with Standard and Pro model sections and a comparison table.
- First pilot plan is stated as 50 Standard + 50 Pro (100 total).
- ₹6,499 and ₹8,999 are labelled indicative target prices, not final offers.
- Concept visuals are disclosed as illustrations.
- Page states that no orders, payments, deposits, delivery promises or personal-data collection are active.
- Engineering notes describe on-device key generation/signing, trusted transaction review, testnet-first work and independent security gates.
- No third-party JavaScript dependency is required by the current page.

## Findings and required actions

### P0 — Must resolve before accepting money or shipping devices

1. **No validated production device:** the repository contains specifications, not a manufactured or certified wallet. Build and validate working Standard and Pro prototypes.
2. **Independent security assessment missing:** complete threat modelling, secure-element/key-isolation review, firmware and boot-chain review, transaction-parser testing, recovery testing and independent hardware/firmware assessment before real funds.
3. **Manufacturer and bill of materials not confirmed:** obtain comparable written RFQs, component provenance, BOM, tooling/NRE, yield assumptions, lead times, MOQ, warranty/RMA terms and supply-chain controls. Do not provide seed phrases or private keys to a manufacturer.
4. **Commercial terms are incomplete:** confirm final price and tax treatment, warranty, returns/refunds, shipping, delivery estimates, customer support, terms of sale and applicable India legal/tax/compliance advice before presale.
5. **Signing confirmation needs one consistent design:** the product page describes Pro touchscreen confirmation, while the engineering specification describes a physical confirmation button. Define and test the trusted confirmation mechanism for each model. A touchscreen must not silently approve transactions; users must see and explicitly approve the decoded transaction details on the trusted device.
6. **Supported network and signing scope must be proven:** the spec proposes BNB Smart Chain chain IDs 56 and 97. Do not advertise support until signing, chain-ID binding, replay protection, token/contract display and malformed/unknown transaction rejection pass test vectors and independent review.

### P1 — Resolve before public marketing launch

1. **Search/social metadata is minimal:** add a canonical URL, Open Graph and social-card metadata, favicon/app icons, and a deliberate robots/sitemap strategy after the final public URL is selected.
2. **No actual product photography:** current device render is CSS concept art. Keep the concept disclaimer prominent; replace with clearly labelled prototype photos only when a real prototype exists.
3. **Accessibility needs a pass:** test keyboard navigation and visible focus states, screen-reader landmarks/table headers, contrast, 200% zoom, narrow mobile widths and reduced-motion preferences. Verify the comparison table does not force horizontal overflow on small screens.
4. **No operational contact path:** add a verified business contact/support route before marketing claims or customer commitments. Do not collect visitor data until privacy notice, consent, secure backend, retention and deletion process are ready.
5. **Clarify the CTA:** “Early access” and “Get launch updates” currently lead to an on-page section whose only action is following GitHub. Consider labelling it “Follow development” until a real opt-in waitlist exists.

### P2 — Recommended quality improvements

- Add a last-updated date and a public product status / FAQ page.
- Add automated HTML validation, link checks, accessibility checks and a mobile viewport smoke test to CI.
- Add a content review checklist so provisional prices/specifications cannot be mistaken for final purchase terms.
- Configure HTTPS, custom domain, security headers and a deployment preview before publishing; verify the actual live URL after deployment.

## CI and publication evidence

- PR #7 is open, draft and unmerged at the time of this audit.
- The reviewed PR page did not expose a reliable completed CI result. The GitHub combined commit-status query returned no status entries for the reviewed head commit. This is **not evidence of a passing CI run**.
- The PR itself says it does not publish the site. No live deployment or public URL was verified in this audit.
- Therefore: do not describe the website as live, production-ready, accepting reservations, or accepting payment.

## Release gates

- [ ] Prototype Standard and Pro hardware validated
- [ ] Secure element selected and supply chain reviewed
- [ ] Trusted display and confirmation UX validated for both models
- [ ] Firmware, signing, recovery and update security tests complete
- [ ] Independent security assessment completed and findings resolved
- [ ] Manufacturer quotation, BOM, production schedule and QC plan approved
- [ ] Final price, taxes, warranty, returns, shipping and support confirmed
- [ ] Legal/privacy/terms review completed
- [ ] Waitlist backend and consent controls reviewed, if collecting data
- [ ] CI checks green on the release commit
- [ ] Public deployment, domain, HTTPS and mobile/accessibility checks verified

**Current status:** Concept landing page only. No sales, payments, reservations or delivery commitments.
