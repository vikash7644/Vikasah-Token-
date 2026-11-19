# VKT mainnet deployment runbook

## Target
- Network: BNB Smart Chain Mainnet
- Chain ID: 56
- Token: Vikasah Token (VKT)
- Decimals: 18
- Initial and maximum supply: 1,000,000,000 VKT
- Owner allocation: 300,000,000 VKT (30%)
- Distribution reserve: 700,000,000 VKT (70%)

## Important: not yet authorized or deployed
Adding mainnet configuration does not deploy the token. No transaction is sent by CI. The mainnet script has a deliberate confirmation guard and must only be run by the project owner after reviewing the exact deployment parameters and accepting the BNB gas cost.

## Pre-deployment gates
1. Run the full test suite and inspect the exact source commit to be deployed.
2. Obtain an independent security audit and resolve all critical/high findings.
3. Choose three distinct, controlled addresses:
   - admin owner: preferably a hardware-backed multisig;
   - 30% owner allocation receiver;
   - 70% distribution reserve receiver.
4. Confirm the reserve distribution plan, vesting/lockups (if any), public disclosures and legal/tax treatment. The contract itself does not lock tokens or create liquidity.
5. Estimate deployment gas on BNB Chain and fund the deployer wallet with enough BNB plus a margin.
6. Use a dedicated deployer wallet. Keep its private key in a local ignored .env or a secure signer; never commit it or share it in chat.
7. Independently verify the chain ID is 56 and double-check every address on the signing screen.
8. Only after all checks, the owner may manually set VKT_MAINNET_DEPLOYMENT_CONFIRM to I_HAVE_VERIFIED_VKT_MAINNET_DEPLOYMENT in their private environment and run npm run deploy:mainnet.
9. Verify the contract source and constructor arguments on BscScan. Confirm balances and total supply on-chain before any public announcement.

## Environment
Copy .env.example to .env and populate BSC_MAINNET_RPC_URL, DEPLOYER_PRIVATE_KEY, TOKEN_ADMIN_OWNER, OWNER_ALLOCATION_RECEIVER and DISTRIBUTION_RESERVE_RECEIVER locally. Never paste secrets into GitHub issues, commits, chat or screenshots.

## Not included
This runbook does not authorize deployment, liquidity creation, token sale, exchange listing or spending funds. It does not guarantee a listing, market price, buyers or profit.
