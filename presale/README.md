# Vikasah Hardware Wallet — Pre-launch website

This folder contains the static early-access landing page for the planned Vikasah Standard and Pro hardware wallets.

## Preview locally
Open `index.html` in a browser. No build step or third-party JavaScript dependencies are required.

## Current page behavior
- Responsive product landing page with Standard and Pro comparison.
- Shows the planned first batch: 50 Standard + 50 Pro.
- Shows indicative target prices only: ₹6,499 Standard and ₹8,999 Pro.
- Clearly states that the product is in planning, prices/specifications are provisional, and no orders or payments are accepted.
- Does not collect or transmit visitor information.

## Before enabling a real presale
1. Complete working prototypes and independent security review.
2. Confirm final BOM, manufacturing cost, product specifications, warranty and delivery estimates.
3. Obtain legal/tax advice and publish terms, refund/cancellation policy and privacy notice.
4. Add a secure backend for waitlist/order records with consent, spam protection and data-retention controls.
5. Only enable payment after production readiness, support and refund operations are in place.

## Hosting
The page is static and can be hosted on GitHub Pages or Vercel. For GitHub Pages, configure the repository Pages source to publish from the default branch and use `/presale` as the site path, or move the page to the configured publishing root after approval.

## Automated website QA

The GitHub Actions workflow `.github/workflows/presale-qa.yml` runs on pull requests and pushes that change `presale/**`.

It launches the page in Chromium and checks:
- Mobile (390px) and desktop (1440px) layouts for page-level horizontal overflow.
- The comparison table's contained horizontal scrolling on mobile.
- Keyboard access to the skip link and the main content landmark.
- Reduced-motion support and page metadata.
- That the concept preview has no visitor signup form.
- Automated WCAG 2.1 A/AA checks using axe-core.

Run locally after installing the test dependencies:

```sh
npm install --no-save playwright @axe-core/playwright
npx playwright install chromium
node scripts/check-presale.mjs
```

A passing automated scan is not a substitute for manual screen-reader, real-device, zoom, keyboard and human contrast testing.
