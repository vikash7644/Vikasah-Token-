# Vikasah Token (VKT)

Vikasah Token is an ERC-20-compatible BEP-20 token project targeting BNB Smart Chain.

## Contract configuration

- Name: Vikasah Token
- Symbol: VKT
- Decimals: 18
- Maximum supply: 1,000,000,000 VKT
- Supply policy: fixed/capped; no public or owner mint function
- Initial issuance: the complete 1,000,000,000 VKT is minted once to the configured initial receiver
- Administrative owner: configured separately at deployment; use a multisig for production

The initial receiver is a distribution/treasury address, not an implemented tokenomics allocator. Proposed owner, liquidity, public-sale, ecosystem, treasury and team percentages are not encoded in this contract. Separate and review distribution/vesting arrangements before any sale or liquidity launch.

## Features

- ERC-20 / BEP-20 transfers and allowances
- Burnable balances
- EIP-2612 permit approvals
- Owner-controlled emergency pause
- Two-step ownership transfer
- Hard cap and no mint entry point

A burn permanently reduces total supply. The contract does not provide a re-mint function.

## Build and test

Requires Node.js 20 or newer.

```bash
npm install
npm run compile
npm test
```

## BNB Smart Chain testnet deployment

1. Copy `.env.example` to `.env`.
2. Set `BSC_TESTNET_RPC_URL`, `DEPLOYER_PRIVATE_KEY`, `TOKEN_OWNER_ADDRESS`, and `INITIAL_SUPPLY_RECEIVER`.
3. Keep private keys only in a local ignored `.env` file or GitHub Actions secrets. Never commit them or send them in chat.
4. Fund the deployer with BNB testnet gas.
5. Run `npm run deploy:testnet`.

- Testnet chain ID: 97
- RPC: https://bsc-testnet-dataseed.bnbchain.org
- Explorer: https://testnet.bscscan.com/

## Security and launch status

This repository is a development/testnet starting point, not an audited or production-ready token. CI compilation and tests must pass before testnet deployment. Obtain an independent smart-contract audit, verify deployed source, confirm distribution/vesting wallets, and complete legal and operational reviews before mainnet launch. Testnet tokens have no monetary value. Token creation or exchange listing does not guarantee buyers, price appreciation, or profit.

Mainnet deployment, liquidity creation, token sale, and exchange listing are not performed by this repository's CI workflow.
