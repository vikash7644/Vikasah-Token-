# Vikasah Token (VKT)

Vikasah Token is an ERC-20-compatible BEP-20 token project targeting BNB Smart Chain.

## Confirmed contract configuration

- Name: Vikasah Token
- Symbol: VKT
- Decimals: 18
- Maximum and initial supply: 1,000,000,000 VKT
- Supply policy: fixed/capped; no owner mint function
- Owner allocation: 30% (300,000,000 VKT), minted to a separately configured owner-allocation wallet
- Remaining distribution reserve: 70% (700,000,000 VKT), minted to a separate reserve wallet
- Owner-allocation separation: using or transferring the 70% distribution reserve does not debit the 30% owner-allocation wallet. The owner wallet balance changes only when that wallet itself signs a transfer/burn or grants an allowance that is used.

The 30% owner allocation is a normal ERC-20 balance held at the configured owner-allocation receiver; it is not automatically supplied to liquidity pools or staking contracts. No third party can spend that wallet balance without its own approval/signature. The token contract cannot prevent the wallet owner from voluntarily transferring or approving those tokens to a pool or staking contract. The administrative owner is a separate constructor parameter and should be a multisig for production. The 70% reserve is not automatically divided into liquidity, public sale, ecosystem, treasury or team allocations. Those proposed percentages and their vesting arrangements still need explicit approval and separate distribution controls before launch.

## Features

- ERC-20 / BEP-20 transfers and allowances
- Burnable balances; burns permanently reduce total supply
- EIP-2612 permit approvals
- Owner-controlled emergency pause
- Two-step ownership transfer
- Separate owner allocation and distribution reserve; no automatic liquidity/staking integration
- Hard cap and no mint entry point

## Build and test

Requires Node.js 20 or newer.

```bash
npm install
npm run compile
npm test
```

## BNB Smart Chain testnet deployment

1. Set the environment variables shown in `.env.example`.
2. Use separate, controlled addresses for the admin owner, owner allocation receiver and reserve receiver.
3. Keep private keys only in a local ignored `.env` file or GitHub Actions secrets. Never commit them or send them in chat.
4. Fund the deployer with BNB testnet gas.
5. Run `npm run preflight:testnet` first. This checks the chain ID, all configured addresses, estimated deployment gas and deployer balance with a 20% buffer. It sends no transaction.
6. Only after reviewing the preflight output, run `npm run deploy:testnet` to broadcast the deployment transaction.

- Testnet chain ID: 97
- RPC: https://bsc-testnet-dataseed.bnbchain.org
- Explorer: https://testnet.bscscan.com/

## Security and launch status

This is a development/testnet starting point, not an audited or production-ready token. CI compilation and tests must pass before testnet deployment. Run the non-transactional testnet preflight and independently verify every wallet address before broadcasting a deployment transaction. Obtain an independent smart-contract audit, verify deployed source, confirm distribution/vesting wallets, and complete legal and operational reviews before mainnet launch. Testnet tokens have no monetary value. Token creation or exchange listing does not guarantee buyers, price appreciation, or profit.

Mainnet deployment, liquidity creation, token sale, and exchange listing are not performed by this repository's CI workflow.
