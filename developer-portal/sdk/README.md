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
// Your trusted merchant backend must create an invoice first, using the\n// connected address as payerAddress and keeping its API key server-side.\nconst invoiceId = "invoice-id-created-by-your-backend";\nconst payment = await payVkt({
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
