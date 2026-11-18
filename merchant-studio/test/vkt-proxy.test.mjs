import test from "node:test";
import assert from "node:assert/strict";
import { mountVktMerchantProxy } from "../server/vkt-proxy.mjs";

const apiKey = "test-only-merchant-key-with-more-than-32-bytes";
const payerAddress = "0x0000000000000000000000000000000000000003";
function harness(fetchImpl = async () => ({ status: 200, json: async () => ({ ok: true }) })) {
  const routes = new Map();
  const app = {
    post(path, handler) { routes.set("POST " + path, handler); },
    get(path, handler) { routes.set("GET " + path, handler); }
  };
  mountVktMerchantProxy(app, {
    apiBaseUrl: "https://payments.example/",
    merchantApiKey: apiKey,
    fetchImpl
  });
  return routes;
}
function responseRecorder() {
  return {
    statusCode: 200,
    payload: null,
    headers: {},
    status(code) { this.statusCode = code; return this; },
    set(name, value) { this.headers[name.toLowerCase()] = value; return this; },
    json(payload) { this.payload = payload; return this; }
  };
}

test("proxy refuses insecure upstream URLs and weak API keys", () => {
  const app = { post() {}, get() {} };
  assert.throws(() => mountVktMerchantProxy(app, {
    apiBaseUrl: "http://payments.example",
    merchantApiKey: apiKey
  }), /HTTPS/);
  assert.throws(() => mountVktMerchantProxy(app, {
    apiBaseUrl: "https://payments.example",
    merchantApiKey: "short"
  }), /at least 32 bytes/);
});

test("public checkout configuration is proxied without exposing credentials", async () => {
  let captured;
  const routes = harness(async (url, options) => {
    captured = { url: String(url), options };
    return { status: 200, json: async () => ({ chainId: 97, tokenAddress: "0x0000000000000000000000000000000000000001", merchantAddress: "0x0000000000000000000000000000000000000002" }) };
  });
  const res = responseRecorder();
  await routes.get("GET /api/vkt/config")({}, res);
  assert.equal(res.statusCode, 200);
  assert.equal(captured.url, "https://payments.example/v1/config");
  assert.equal(captured.options.headers.authorization, undefined);
  assert.equal(JSON.stringify(res.payload).includes(apiKey), false);
});

test("invoice creation validates fields before forwarding", async () => {
  let calls = 0;
  const routes = harness(async () => { calls += 1; return { status: 201, json: async () => ({ status: "pending" }) }; });
  const handler = routes.get("POST /api/vkt/invoices");
  for (const body of [
    { invoiceId: "../bad", amount: "1", payerAddress },
    { invoiceId: "zero", amount: "0", payerAddress },
    { invoiceId: "float", amount: "1e3", payerAddress },
    { invoiceId: "zero-payer", amount: "1", payerAddress: "0x0000000000000000000000000000000000000000" },
    { invoiceId: "over-cap", amount: "1000000000.000000000000000001", payerAddress }
  ]) {
    const res = responseRecorder();
    await handler({ body }, res);
    assert.equal(res.statusCode, 400);
  }
  assert.equal(calls, 0);
});

test("invoice creation forwards the merchant key only from server-side proxy", async () => {
  let captured;
  const routes = harness(async (url, options) => {
    captured = { url: String(url), options };
    return { status: 201, json: async () => ({ invoiceId: "order-1", status: "pending" }) };
  });
  const res = responseRecorder();
  await routes.get("POST /api/vkt/invoices")({
    body: { invoiceId: "order-1", amount: "1.25", payerAddress }
  }, res);
  assert.equal(res.statusCode, 201);
  assert.equal(captured.url, "https://payments.example/v1/invoices");
  assert.equal(captured.options.headers.authorization, "Bearer " + apiKey);
  assert.equal(JSON.parse(captured.options.body).payerAddress, payerAddress);
  assert.equal(JSON.stringify(res.payload).includes(apiKey), false);
});

test("duplicate invoice retries are reused only for the same pending payer and amount", async () => {
  let calls = 0;
  const routes = harness(async (url, options) => {
    calls += 1;
    if (String(url).endsWith("/v1/invoices") && options.method === "POST") {
      return { status: 409, json: async () => ({ error: "Invoice ID already exists." }) };
    }
    return {
      status: 200,
      json: async () => ({
        invoiceId: "order-retry",
        amount: "1.250000000000000000",
        payerAddress,
        status: "pending"
      })
    };
  });
  const res = responseRecorder();
  await routes.get("POST /api/vkt/invoices")({
    body: { invoiceId: "order-retry", amount: "1.25", payerAddress }
  }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.payload, {
    invoiceId: "order-retry",
    amount: "1.250000000000000000",
    currency: "VKT",
    status: "pending",
    reused: true
  });
  assert.equal(calls, 2);
});

test("duplicate invoice cannot be reused by another payer", async () => {
  const routes = harness(async (url, options) => {
    if (options.method === "POST") return { status: 409, json: async () => ({ error: "duplicate" }) };
    return {
      status: 200,
      json: async () => ({
        invoiceId: "order-retry",
        amount: "1",
        payerAddress: "0x0000000000000000000000000000000000000004",
        status: "pending"
      })
    };
  });
  const res = responseRecorder();
  await routes.get("POST /api/vkt/invoices")({
    body: { invoiceId: "order-retry", amount: "1", payerAddress }
  }, res);
  assert.equal(res.statusCode, 409);
  assert.deepEqual(res.payload, {
    error: "Invoice ID already exists with different details or is already paid."
  });
});

test("invoice status lookup forwards bearer auth and encodes the invoice id", async () => {
  let captured;
  const routes = harness(async (url, options) => {
    captured = { url: String(url), options };
    return { status: 200, json: async () => ({ status: "paid", payerAddress, amount: "1.5" }) };
  });
  const res = responseRecorder();
  await routes.get("GET /api/vkt/invoices/:invoiceId")({ params: { invoiceId: "order-1" } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(captured.url, "https://payments.example/v1/invoices/order-1");
  assert.equal(captured.options.headers.authorization, "Bearer " + apiKey);
  assert.deepEqual(res.payload, { status: "paid", amount: "1.5" });
  assert.equal("payerAddress" in res.payload, false);
  assert.equal(res.headers["cache-control"], "no-store");
});

test("payment verification forwards no merchant secret", async () => {
  let captured;
  const routes = harness(async (url, options) => {
    captured = { url: String(url), options };
    return { status: 202, json: async () => ({ status: "confirming" }) };
  });
  const res = responseRecorder();
  const transactionHash = "0x" + "a".repeat(64);
  await routes.get("POST /api/vkt/payments/verify")({
    body: { invoiceId: "order-1", transactionHash }
  }, res);
  assert.equal(res.statusCode, 202);
  assert.equal(captured.options.headers.authorization, undefined);
  assert.deepEqual(JSON.parse(captured.options.body), { invoiceId: "order-1", transactionHash });
});

test("upstream network errors return a stable 502 response", async () => {
  const routes = harness(async () => { throw new Error("sensitive internal failure"); });
  const res = responseRecorder();
  await routes.get("GET /api/vkt/invoices/:invoiceId")({ params: { invoiceId: "order-1" } }, res);
  assert.equal(res.statusCode, 502);
  assert.deepEqual(res.payload, { error: "VKT invoice service is unavailable. Retry later." });
});
