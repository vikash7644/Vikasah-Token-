import test from "node:test";
import assert from "node:assert/strict";
import { payVkt } from "../src/index.js";

const validToken = "0x0000000000000000000000000000000000000001";
const validMerchant = "0x0000000000000000000000000000000000000002";
const signer = { provider: { getNetwork: async () => ({ chainId: 97n }) } };

for (const amount of ["0", "0.0", "-1", "1e3", "01", "1.0000000000000000001", "", "abc"]) {
  test(`rejects invalid payment amount: ${JSON.stringify(amount)}`, async () => {
    await assert.rejects(
      payVkt({ signer, tokenAddress: validToken, merchantAddress: validMerchant, amount }),
      /Amount must be a positive decimal/
    );
  });
}

test("rejects malformed token address before attempting a transaction", async () => {
  await assert.rejects(
    payVkt({ signer, tokenAddress: "not-an-address", merchantAddress: validMerchant, amount: "1" }),
    /VKT token address must be a valid EVM address/
  );
});

test("rejects malformed merchant address before attempting a transaction", async () => {
  await assert.rejects(
    payVkt({ signer, tokenAddress: validToken, merchantAddress: "0x1234", amount: "1" }),
    /Merchant address must be a valid EVM address/
  );
});

test("requires a connected signer", async () => {
  await assert.rejects(
    payVkt({ signer: null, tokenAddress: validToken, merchantAddress: validMerchant, amount: "1" }),
    /Connect a wallet first/
  );
});
