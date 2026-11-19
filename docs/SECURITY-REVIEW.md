# Vikasah Token (VKT) — Independent Security Review Handoff

## Review status

This document is a handoff for an independent Solidity/security reviewer. It is not an audit, certification, or claim that the contract is secure. No independent audit is recorded as completed. Do not deploy to BNB Smart Chain mainnet until an appropriately qualified reviewer has examined the exact release commit and all critical/high findings have been resolved and retested.

## Scope to review

- `contracts/VikasahToken.sol`
- `scripts/deploy-mainnet.js`
- `hardhat.config.js`
- `test/VikasahToken.test.js`
- `test/mainnet-deployment.test.js`
- OpenZeppelin dependency versions and the exact dependency tree used for the release

The reviewer should independently inspect the complete repository at the proposed release commit, not rely only on this summary.

## Intended token invariants

- Name: Vikasah Token
- Symbol: VKT
- Decimals: 18
- Initial supply: 1,000,000,000 VKT
- Maximum supply cap: 1,000,000,000 VKT
- Initial owner allocation: 300,000,000 VKT (30%)
- Initial distribution reserve: 700,000,000 VKT (70%)
- Allocation and reserve are minted once in the constructor to separate nonzero addresses.
- There is no public or owner mint function.
- Burns permanently reduce total supply; the cap does not replenish burned tokens.
- Ownership uses a two-step transfer process; ownership renunciation is disabled.
- The owner can pause and unpause token transfers.

## Important trust and custody disclosures

- The 30% allocation is a normal ERC-20 balance, not a contract-enforced lock. Its wallet owner can voluntarily transfer, approve, or burn those tokens.
- The 70% reserve is also not locked or vested by this contract. A separate vesting/lock contract or documented custody/distribution process would be needed to enforce a schedule.
- The admin owner has pause/unpause authority. Review the operational, governance, multisig and recovery arrangements for that role.
- A separate deployer wallet is required by the mainnet deployment preflight. The deployer signs and pays BNB gas; it is not the token admin or either allocation receiver.
- Standard ERC-20 transfers do not create liquidity, staking, exchange listings, buyers, or market value.

## Existing automated coverage

The repository test suite covers token metadata and initial allocations, transfer and burn behavior, pause access control, absence of a mint function, two-step ownership transfer, EIP-2612 permit, allowance-based transferFrom, separation of the initial allocations, constructor rejection of zero/duplicate role wallets, and disabled ownership renunciation.

The mainnet preflight tests cover four distinct wallets, invalid/zero addresses, duplicate role wallets, deployer-role separation, 20% gas-limit buffer calculation, EIP-1559 fee data, legacy gas-price fallback, invalid/missing RPC fee data, and insufficient deployer balance.

Passing automated tests is useful evidence but does not replace manual review, fuzzing, invariant testing, dependency review, or an independent audit.

## Required reviewer questions

1. Are all inherited OpenZeppelin overrides and constructor arguments correct for the pinned dependency versions?
2. Can pause, ownership transfer, or recovery behavior create an unintended permanent lock or loss of control?
3. Are cap, initial mint, burn, and supply invariants correct under all reachable call sequences?
4. Are permit signatures, nonces, chain ID handling, and replay protections correct?
5. Are deployment fee calculations and wallet checks safe for BNB Smart Chain mainnet RPC behavior?
6. Are compiler version, optimizer settings, EVM target, dependencies, and build artifacts reproducible?
7. Are there denial-of-service, integration, or operational risks not covered by unit tests?

## Findings register

The reviewer should record each finding with severity, affected file/line, exploit preconditions, impact, recommended remediation, and retest evidence. Release is blocked until all critical/high findings are resolved and independently retested. Medium/low findings must be explicitly accepted or fixed by the project owner.

## Mainnet release gates

- [ ] Independent review completed against the exact release commit.
- [ ] Critical/high findings fixed and retested.
- [ ] Full CI green on the exact release commit.
- [ ] Four distinct deployment/admin/allocation/reserve addresses verified independently.
- [ ] Admin custody and recovery process documented (preferably hardware-backed multisig).
- [ ] 30% allocation custody and disclosure plan documented.
- [ ] 70% reserve distribution, vesting, and custody plan documented; do not imply on-chain locks unless implemented and verified.
- [ ] Deployer has sufficient BNB for the verified fee estimate plus a margin.
- [ ] Source and constructor arguments ready for BscScan verification.
- [ ] Project owner explicitly authorizes the exact deployment after reviewing the signing details.

Never put private keys, seed phrases, RPC credentials, or other secrets in this document, GitHub issues, commits, screenshots, or chat.
