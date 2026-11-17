# VKT Utility Passport — 180-day lock

## What it does

The Utility Passport is a separate, non-transferable on-chain lock position. A wallet owner chooses an amount of VKT and locks it for exactly 180 days. During the lock, an integrating app can read `hasActivePassport(wallet)` or `isLocked(wallet)` and inspect `positionOf(wallet)`.

This contract deliberately does not define tier thresholds or merchant benefits. Those rules remain a product decision and must be documented before any app grants benefits.

## User flow

1. The user obtains VKT and approves the passport contract for the chosen amount.
2. The user calls `lock(amount)`. The contract records the amount and an unlock timestamp 180 days after the mined lock transaction, then transfers VKT into the vault.
3. The user can prove an active lock through the read-only methods.
4. At or after the unlock timestamp, only that wallet can call `withdraw()` and receive its exact locked amount.
5. After withdrawal, the wallet may create another 180-day position.

Each wallet can have one position at a time. It must withdraw an expired position before locking again.

## Trust and safety properties

- No owner/admin role, ownership transfer, mint, arbitrary rescue, confiscation, or early-unlock method.
- The user selects the amount and initiates the lock.
- SafeERC20 handles token transfers; ReentrancyGuard protects state-changing entry points.
- Position state is cleared before the outgoing token transfer.
- The contract emits `Locked` and `Withdrawn` events.
- No yield, APY, rewards, price support, or investment return is promised.
- The lock itself is not an NFT and cannot be transferred.

## Important VKT token interaction

The VKT token contract has an owner-controlled global pause function. If VKT transfers are paused while a position is locked or being withdrawn, the vault's token transfer can fail until VKT transfers are unpaused. The passport contract itself has no admin pause or seizure method, but it cannot override the underlying token's pause. This dependency must be clearly disclosed to users.

## Deployment status

This is source code and automated local-contract tests only. It is not deployed to BNB Smart Chain Testnet or Mainnet. Do not configure a production app with a guessed address. Before deployment, run the full GitHub Actions checks, deploy to BSC Testnet using a dedicated test wallet, verify the contract source, and test lock/expiry/withdrawal using test VKT. Obtain an independent security review before mainnet use.

A guarded Hardhat script is provided as `npm run deploy:passport:testnet`. It refuses any chain other than BSC Testnet (chain ID 97), requires `VKT_TOKEN_ADDRESS`, checks that the address contains contract code, and verifies the token name, symbol, 18 decimals, and exact 1,000,000,000 VKT supply before deploying. It then checks the linked token address and 180-day duration. Configure `BSC_TESTNET_RPC_URL`, `DEPLOYER_PRIVATE_KEY`, and `VKT_TOKEN_ADDRESS` only in a protected local `.env` or GitHub Actions secrets; never commit secrets or share private keys in chat. This command has not been run and does not mean a Passport is deployed.

## Not yet specified

- Access-tier thresholds
- Merchant/app benefits
- Any governance or reward mechanism
- A public indexer or hosted passport verification API
