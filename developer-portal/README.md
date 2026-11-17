# VKT Developer Portal

A static, mobile-friendly developer documentation site for Vikasah Token.

## Contents
- Testnet-first wallet and token read example using ethers v6
- ERC-20 interface reference
- Merchant payment and receipt-verification guidance
- Explicit deployment status and contract-address placeholder

## Current status
This is a documentation frontend only. It does not provide a live API, hosted RPC service, production SDK package, account system, payment processor, or live contract address. The VKT contract has not been deployed to BNB Smart Chain Testnet in this release. The page intentionally uses a placeholder address and warns developers not to send funds to guessed addresses.

## Preview
Open index.html in a browser or serve this directory with any static file server.

## Before production
1. Deploy the reviewed contract to BNB Smart Chain Testnet.
2. Verify the contract source and publish the exact address and ABI.
3. Pin or self-host frontend dependencies and add automated checks.
4. Build a backend verifier with chain, receipt, Transfer-event, order-binding and replay-protection checks.
5. Test wallet compatibility on real Android devices.
6. Perform an independent security review before mainnet use.

Never ask users for seed phrases or private keys.