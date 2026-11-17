# VKT Utility Features — Design Proposal

This document proposes utility features that can distinguish Vikasah Token (VKT) from a plain transferable BEP-20 token. It is a design proposal, not a claim that these features are already implemented or audited.

## Design rules

- Preserve the fixed 1,000,000,000 VKT initial and maximum supply.
- Preserve the 300,000,000 VKT owner allocation as a separate wallet balance.
- Do not automatically route owner-allocation tokens into liquidity pools, staking, rewards, or third-party contracts.
- Do not add hidden minting, transfer taxes, reflection, rebasing, or guaranteed-yield promises.
- Any optional lock must be user-initiated, transparent, and have a clearly specified unlock time.
- New features must be independently tested and reviewed before mainnet use.

## Proposed differentiators

### 1. VKT Utility Passport (recommended first feature)

A holder can voluntarily lock a chosen amount of their own VKT in a dedicated utility vault for a fixed 180-day period. The vault records the user's locked amount and unlock timestamp. A read-only on-chain Passport view can show the holder's current access tier and unlock date; it is not a tradable NFT and cannot be sold or transferred. While locked, the user can qualify for clearly defined ecosystem access tiers. Apps and participating merchants can verify eligibility directly from the contract.

Important boundaries:
- This is a utility/access feature, not staking yield.
- No interest, APY, or token rewards are promised.
- The 30% owner allocation is not enrolled automatically.
- A user must explicitly approve and deposit their own tokens.
- Withdrawals are available only after the 180-day lock period; no administrator can seize user deposits.
- The approved lock period is 180 days only; no 30-day or 90-day option is included.
- Tier thresholds and concrete access benefits still require approval before implementation.

### 2. VKT Merchant Payment Receipts

An optional payment helper can emit a structured on-chain receipt containing merchant, payer, amount, and an order reference hash. It should not custody funds or impose a transfer tax. Merchants can verify payments using the transaction and receipt event. Participating merchants can optionally check a buyer's Utility Passport tier before applying a clearly disclosed benefit.

### 3. VKT Batch Payments

A separately audited helper can let a sender distribute VKT to multiple recipients in one transaction. It must reject mismatched arrays, zero recipients, and invalid amounts, and revert atomically if any transfer fails. The standard ERC-20 transfer remains available.

### 4. VKT Community Proposals (later phase)

A governance module can let eligible holders signal on ecosystem proposals. Voting rules, snapshot timing, quorum, and proposal execution authority must be defined before implementation. Token voting should not silently give the token contract owner arbitrary treasury access.

## Recommended implementation order

1. Keep the existing fixed-supply token contract unchanged; the Solidity compile/test CI workflow has now passed on commit 99592130d41ab111932e31293931266d3b58945b.
2. Specify the Utility Pass tier thresholds and whether tiers grant access only or any discounts; the lock period is fixed at 180 days.
3. Implement the Utility Passport as a separate, narrowly scoped contract with tests for deposits, unlock timing, withdrawals, reentrancy protection, and owner-allocation separation.
4. Add Merchant Receipts and Batch Payments as optional helpers after review.
5. Consider governance only after the ecosystem and treasury rules are public.

## Decisions required before coding the Utility Pass

- Approved lock period: 180 days only.
- What minimum VKT balance should qualify for each tier?
- What concrete benefit does each tier unlock (for example, app features, merchant discounts, or ecosystem access)?

No tier amounts, discounts, reward rates, or sale allocations are assumed by this proposal. The 180-day lock is fixed; no mainnet deployment is authorized by this design document.


## VKT software ecosystem (proposed)

These are companion software products, not extra powers hidden inside the token contract. They should use public on-chain data and user-authorized wallet transactions.

### 5. VKT Merchant Studio
A web dashboard for merchants to create payment requests, generate QR codes, view confirmed VKT payments, export receipts, and verify a transaction on the BNB Chain explorer. It must clearly distinguish pending from confirmed payments and never ask merchants for seed phrases or private keys.

### 6. VKT Checkout SDK
A small open-source JavaScript SDK and checkout widget that websites can integrate to request a VKT payment. The customer approves and sends the payment from their own wallet. The SDK watches for the matching on-chain receipt and reports confirmation; it must not custody funds.

### 7. VKT Invoice & QR
A simple invoice generator that creates a unique order reference, requested amount, merchant wallet, and QR/deep link. The invoice itself is not proof of payment; the app verifies the matching on-chain transaction before marking it paid.

### 8. VKT Proof API
A read-only API for apps and merchants to verify token balances, Utility Passport eligibility, payment receipt events, and transaction confirmations. Rate limits, chain ID checks, and clear error states are required. It must not expose private user data or claim that a pending transaction is final.

### 9. VKT Treasury & Allocation Monitor
A public dashboard showing the fixed supply, current circulating/total supply, owner allocation wallet balance, distribution reserve balance, and any published vesting or lock schedules. It must not have the ability to move funds. The owner allocation and distribution reserve remain visibly separate.

### 10. VKT Developer Portal
Documentation, contract addresses after deployment, verified ABI downloads, SDK examples, testnet faucet links from official sources, and integration guides. Never publish deployment addresses until they are verified on-chain.

## Software delivery order

1. Build Merchant Studio and Invoice & QR as a testnet-first web app.
2. Build the Checkout SDK and Proof API with automated tests.
3. Add the public Treasury & Allocation Monitor.
4. Publish the Developer Portal after testnet contracts and addresses are verified.
5. Keep every companion app non-custodial: no seed phrase collection, no private-key collection, and no automatic token transfers.

All software features above are proposals until implemented, tested, and reviewed. They do not guarantee sales, adoption, token price, or exchange listings.
