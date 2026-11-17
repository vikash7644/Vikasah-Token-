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

### 1. VKT Utility Pass (recommended first feature)

A holder can voluntarily lock a chosen amount of their own VKT in a dedicated utility vault for a fixed 180-day period. The vault records the user's locked amount and unlock timestamp. While locked, the user can qualify for clearly defined ecosystem access tiers.

Important boundaries:
- This is a utility/access feature, not staking yield.
- No interest, APY, or token rewards are promised.
- The 30% owner allocation is not enrolled automatically.
- A user must explicitly approve and deposit their own tokens.
- Withdrawals are available only after the 180-day lock period; no administrator can seize user deposits.
- The approved lock period is 180 days only; no 30-day or 90-day option is included.
- Tier thresholds and concrete access benefits still require approval before implementation.

### 2. VKT Merchant Payment Receipts

An optional payment helper can emit a structured on-chain receipt containing merchant, payer, amount, and an order reference hash. It should not custody funds or impose a transfer tax. Merchants can verify payments using the transaction and receipt event.

### 3. VKT Batch Payments

A separately audited helper can let a sender distribute VKT to multiple recipients in one transaction. It must reject mismatched arrays, zero recipients, and invalid amounts, and revert atomically if any transfer fails. The standard ERC-20 transfer remains available.

### 4. VKT Community Proposals (later phase)

A governance module can let eligible holders signal on ecosystem proposals. Voting rules, snapshot timing, quorum, and proposal execution authority must be defined before implementation. Token voting should not silently give the token contract owner arbitrary treasury access.

## Recommended implementation order

1. Keep the existing fixed-supply token contract unchanged while its CI compile/test failure is resolved.
2. Specify the Utility Pass tier thresholds and whether tiers grant access only or any discounts; the lock period is fixed at 180 days.
3. Implement the Utility Pass as a separate, narrowly scoped contract with tests for deposits, unlock timing, withdrawals, reentrancy protection, and owner-allocation separation.
4. Add Merchant Receipts and Batch Payments as optional helpers after review.
5. Consider governance only after the ecosystem and treasury rules are public.

## Decisions required before coding the Utility Pass

- Approved lock period: 180 days only.
- What minimum VKT balance should qualify for each tier?
- What concrete benefit does each tier unlock (for example, app features, merchant discounts, or ecosystem access)?

No tier amounts, lock periods, discounts, reward rates, or sale allocations are assumed by this proposal.
