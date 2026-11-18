# @vikasah/vkt-checkout

A small, non-custodial browser helper for VKT checkout on **BNB Smart Chain Testnet (chain ID 97)**.

## Install in a test project

```sh
npm install ethers
```

Copy `src/index.js` into your app or install this package from a Git URL after review. This package is not published to npm yet.

## Example

```js
import { connectVktWallet, payVkt, verifyVktPayment } from "./src/index.js";

const { signer, address } = await connectVktWallet();
// Your trusted merchant backend must create an invoice first, using the
// connected address as payerAddress and keeping its API key server-side.
const invoiceId = "invoice-id-created-by-your-backend";
const payment = await payVkt({
  signer,
  tokenAddress: "0xYOUR_DEPLOYED_TESTNET_VKT_ADDRESS",
  merchantAddress: "0xYOUR_MERCHANT_WALLET",
  amount: "12.5"
});
await payment.wait(1);
const result = await verifyVktPayment({
  apiBaseUrl: "https://your-verifier.example",
  invoiceId,
  transactionHash: payment.hash
});
console.log(address, result);
```

## Important
- The token address above is a placeholder; VKT is not yet deployed to testnet.
- Wallets must be on chain ID 97. The user approves each transfer in their wallet.
- Never collect seed phrases or private keys.
- A transaction hash alone is not proof of payment. Use a server verifier that checks the configured token, recipient, exact invoice amount, chain, confirmations and replay protection.
- This is an early testnet SDK starter, not audited or production-ready. Test with a disposable wallet and test tokens only.


## Utility Passport status (read-only)

After the 180-day Utility Passport contract has been deployed to BNB Smart Chain Testnet, an app can read a wallet's position without requesting a transaction:

```js
import { readVktUtilityPassport } from "@vikasah/vkt-checkout";

const status = await readVktUtilityPassport({
  provider, // BrowserProvider returned by connectVktWallet()
  passportAddress: "0xDEPLOYED_PASSPORT_ADDRESS",
  account: "0xWALLET_ADDRESS"
});

console.log(status.active, status.amount, status.unlockAt);
```

This helper only reads on-chain state. It does not assign access tiers or merchant benefits; those policies are not defined yet. Do not use a placeholder address in a live app.


## Utility Passport actions (wallet-signed)

Once both VKT and the Passport are deployed and verified on BSC Testnet, the SDK can request the following user-approved actions:

```js
import {
  approveVktForPassport,
  lockVktInPassport,
  readVktUtilityPassport,
  withdrawVktFromPassport
} from "./src/index.js";

// User approves only the chosen amount (wallet confirmation required).
const approval = await approveVktForPassport({
  signer,
  tokenAddress: "0xDEPLOYED_VKT_ADDRESS",
  passportAddress: "0xDEPLOYED_PASSPORT_ADDRESS",
  amount: "100"
});
await approval.wait();

// User separately confirms the lock transaction.
const lock = await lockVktInPassport({
  signer,
  passportAddress: "0xDEPLOYED_PASSPORT_ADDRESS",
  amount: "100"
});
await lock.wait();

// The contract rejects this until the full 180 days have elapsed.
const withdrawal = await withdrawVktFromPassport({
  signer,
  passportAddress: "0xDEPLOYED_PASSPORT_ADDRESS"
});
await withdrawal.wait();
```

The SDK checks chain ID 97 and 18 token decimals, and never receives private keys. Approval and lock are separate wallet transactions. The contract, not the SDK, enforces the 180-day wait. If the underlying VKT token is paused, its transfer restrictions can prevent locking or withdrawal until transfers are unpaused. These actions are not usable until real verified testnet addresses exist; no address is supplied or assumed here.
## Run SDK validation tests

From this directory, run:

```sh
npm install
npm test
```

The current tests cover malformed wallet/token addresses, missing signer state, zero/negative values, scientific notation, leading-zero amounts and precision beyond 18 decimals. These are input-validation tests; they do not replace wallet testing against a deployed testnet contract.
