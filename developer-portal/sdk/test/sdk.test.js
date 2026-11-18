import test from "node:test";
import assert from "node:assert/strict";
import { approveVktForPassport, lockVktInPassport, payVkt, verifyVktPayment } from "../src/index.js";

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

test("accepts the smallest 18-decimal amount before network validation", async () => {
  const wrongNetworkSigner = { provider: { getNetwork: async () => ({ chainId: 56n }) } };
  await assert.rejects(
    payVkt({
      signer: wrongNetworkSigner,
      tokenAddress: validToken,
      merchantAddress: validMerchant,
      amount: "0.000000000000000001"
    }),
    /Wrong network: BNB Smart Chain Testnet is required/
  );
});

test("Passport lock rejects zero amount before wallet transaction", async () => {
  await assert.rejects(
    lockVktInPassport({
      signer,
      passportAddress: validToken,
      amount: "0"
    }),
    /Amount must be a positive decimal/
  );
});

test("Passport approval rejects precision beyond 18 decimals", async () => {
  await assert.rejects(
    approveVktForPassport({
      signer,
      tokenAddress: validToken,
      passportAddress: validMerchant,
      amount: "1.0000000000000000001"
    }),
    /Amount must be a positive decimal/
  );
});

test("rejects numeric SDK amounts to prevent floating-point precision loss", async () => {
  await assert.rejects(
    payVkt({ signer, tokenAddress: validToken, merchantAddress: validMerchant, amount: 1.25 }),
    /decimal string/
  );
});

test("rejects insecure non-local verifier URLs before making a request", async () => {
  await assert.rejects(
    verifyVktPayment({
      apiBaseUrl: "http://payments.example",
      invoiceId: "order-1",
      transactionHash: `0x${"a".repeat(64)}`
    }),
    /valid HTTPS URL/
  );
});

test("rejects malformed invoice identifiers before making a request", async () => {
  await assert.rejects(
    verifyVktPayment({
      apiBaseUrl: "https://payments.example",
      invoiceId: "../order",
      transactionHash: `0x${"a".repeat(64)}`
    }),
    /valid API URL, invoice ID/
  );
});

test("rejects an invalid Passport address before lock submission", async () => {
  await assert.rejects(
    lockVktInPassport({ signer, passportAddress: "0x1234", amount: "1" }),
    /Passport address must be a valid EVM address/
  );
});

test("rejects invalid VKT address before Passport approval", async () => {
  await assert.rejects(
    approveVktForPassport({
      signer,
      tokenAddress: "0x1234",
      passportAddress: validMerchant,
      amount: "1"
    }),
    /VKT token address must be a valid EVM address/
  );
});
