# VKT 70% distribution reserve — approval worksheet

## Current on-chain fact

At deployment, 700,000,000 VKT (70% of the initial 1,000,000,000 VKT supply) is minted to the configured distribution-reserve receiver.

**No distribution percentages, vesting dates, lockups, beneficiaries, or release authority are approved by this document.** Do not infer any allocation from example categories below. Complete and approve this worksheet before mainnet deployment or public token-sale/liquidity announcements.

## Allocation proposal (owner must complete)

| Purpose | Proposed VKT | % of total supply | Beneficiary / wallet | Vesting or release rule |
|---|---:|---:|---|---|
| Liquidity provision | TBD | TBD | TBD | TBD |
| Ecosystem / developer grants | TBD | TBD | TBD | TBD |
| Community / rewards | TBD | TBD | TBD | TBD |
| Treasury / operations | TBD | TBD | TBD | TBD |
| Partnerships / other | TBD | TBD | TBD | TBD |
| **Total** | **700,000,000** | **70%** | | |

The completed VKT amounts must sum to exactly 700,000,000 VKT. Percentages above refer to total initial supply, not just the reserve.

## Custody and controls to decide

- [ ] Identify the reserve wallet controller and whether it is a hardware-backed multisig.
- [ ] Identify required signers, threshold, recovery process, and signer replacement procedure.
- [ ] Decide whether tokens remain in the reserve wallet or move to separately audited vesting/lock contracts.
- [ ] For each beneficiary, document the amount, release dates, cliff, revocability (if any), and on-chain enforcement.
- [ ] For liquidity, document the pair, amount of VKT and paired asset, LP-token custody, lock duration, and who can withdraw.
- [ ] Publish wallet addresses and a plain-language explanation before distribution.
- [ ] Obtain independent review of any vesting, timelock, staking, or liquidity contracts.

## Important limitations

- The current VKT token contract does not enforce reserve vesting or lockups.
- The reserve receiver can transfer or approve its VKT like any ordinary ERC-20 holder.
- A spreadsheet, website promise, or this worksheet does not create an on-chain lock.
- The 30% owner allocation is separate and is not automatically debited when the reserve is used; its holder can still voluntarily transfer, approve, or burn its own tokens.
- Do not describe tokens as locked, vested, burned, or liquidity-backed unless the relevant on-chain state has been independently verified.

## Approval record

- Prepared by: TBD
- Approved by token owner: TBD
- Approval date: TBD
- Exact approved document commit: TBD
- Independent reviewer: TBD
- Supporting transaction / contract addresses: TBD
