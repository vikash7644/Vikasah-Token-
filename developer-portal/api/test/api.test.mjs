import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import net from "node:net";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";

const apiKey = "test-only-vkt-api-key";
const tokenAddress = "0x0000000000000000000000000000000000000001";
const merchantAddress = "0x0000000000000000000000000000000000000002";
const payerAddress = "0x0000000000000000000000000000000000000003";
let child;
let baseUrl;
let tempDir;

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => server.once("error", reject).listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  return port;
}

before(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "vkt-api-test-"));
  const databasePath = join(tempDir, "test.sqlite");
  const legacyDb = new Database(databasePath);
  legacyDb.exec(`
    CREATE TABLE invoices (
      id TEXT PRIMARY KEY,
      amount_wei TEXT NOT NULL,
      payer_address TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      transaction_hash TEXT UNIQUE,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  legacyDb.close();
  const port = await freePort();
  baseUrl = `http://127.0.0.1:${port}`;
  child = spawn(process.execPath, ["server.mjs"], {
    cwd: new URL("..", import.meta.url),
    env: {
      ...process.env,
      PORT: String(port),
      BSC_TESTNET_RPC_URL: "http://127.0.0.1:8545",
      VKT_TOKEN_ADDRESS: tokenAddress,
      VKT_MERCHANT_ADDRESS: merchantAddress,
      MERCHANT_API_KEY: apiKey,
      DATABASE_PATH: databasePath
    },
    stdio: "ignore"
  });

  let ready = false;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) { ready = true; break; }
    } catch { /* Wait for the local test server to bind. */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.equal(ready, true, "API server should start for integration tests");
});

after(async () => {
  if (child && child.exitCode === null) {
    child.kill("SIGTERM");
    await new Promise(resolve => child.once("exit", resolve));
  }
  if (tempDir) await rm(tempDir, { recursive: true, force: true });
});

test("startup migrates existing invoice databases with reorg tracking columns", async () => {
  const database = new Database(join(tempDir, "test.sqlite"), { readonly: true });
  const columns = new Set(database.prepare("PRAGMA table_info(invoices)").all().map(column => column.name));
  database.close();
  assert.equal(columns.has("block_number"), true);
  assert.equal(columns.has("block_hash"), true);
});

test("health endpoint identifies BNB Smart Chain Testnet", async () => {
  const response = await fetch(`${baseUrl}/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, network: "bsc-testnet", chainId: 97 });
});

test("invoice creation rejects missing or incorrect merchant authorization", async () => {
  const response = await fetch(`${baseUrl}/v1/invoices`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ invoiceId: "order-unauthorized", amount: "5.25", payerAddress })
  });
  assert.equal(response.status, 401);
});

test("invoice creation validates identifiers, payer and positive decimal amounts", async () => {
  const headers = { "content-type": "application/json", authorization: `Bearer ${apiKey}` };
  const invalidCases = [
    { invoiceId: "../bad", amount: "5.25", payerAddress },
    { invoiceId: "bad-payer", amount: "5.25", payerAddress: "not-an-address" },
    { invoiceId: "zero-amount", amount: "0", payerAddress },
    { invoiceId: "negative-amount", amount: "-1", payerAddress },
    { invoiceId: "too-many-decimals", amount: "1.0000000000000000001", payerAddress },
    { invoiceId: "scientific-notation", amount: "1e3", payerAddress },
    { invoiceId: "leading-zero", amount: "01", payerAddress },
    { invoiceId: "whitespace-amount", amount: " 1", payerAddress }
  ];

  for (const body of invalidCases) {
    const response = await fetch(`${baseUrl}/v1/invoices`, {
      method: "POST", headers, body: JSON.stringify(body)
    });
    assert.equal(response.status, 400, `expected invalid invoice to fail: ${JSON.stringify(body)}`);
  }
});

test("invoice creation accepts 18-decimal VKT amounts and rejects duplicate IDs", async () => {
  const headers = { "content-type": "application/json", authorization: `Bearer ${apiKey}` };
  const body = { invoiceId: "order-decimal-1", amount: "0.000000000000000001", payerAddress };
  const created = await fetch(`${baseUrl}/v1/invoices`, {
    method: "POST", headers, body: JSON.stringify(body)
  });
  assert.equal(created.status, 201);
  assert.deepEqual(await created.json(), {
    invoiceId: body.invoiceId, amount: body.amount, currency: "VKT", status: "pending"
  });

  const duplicate = await fetch(`${baseUrl}/v1/invoices`, {
    method: "POST", headers, body: JSON.stringify(body)
  });
  assert.equal(duplicate.status, 409);
});

test("concurrent duplicate invoice requests create exactly one invoice", async () => {
  const headers = { "content-type": "application/json", authorization: `Bearer ${apiKey}` };
  const body = { invoiceId: "order-concurrent-unique", amount: "12.5", payerAddress };
  const requests = await Promise.all(Array.from({ length: 8 }, () => fetch(`${baseUrl}/v1/invoices`, {
    method: "POST", headers, body: JSON.stringify(body)
  })));
  const statuses = requests.map(response => response.status).sort((a, b) => a - b);
  assert.deepEqual(statuses, [201, 409, 409, 409, 409, 409, 409, 409]);
});

test("payment verification rejects malformed transaction hashes before RPC access", async () => {
  const response = await fetch(`${baseUrl}/v1/payments/verify`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ invoiceId: "order-decimal-1", transactionHash: "not-a-transaction-hash" })
  });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: "A valid invoiceId and transactionHash are required."
  });
});

test("payment verification returns 404 for unknown invoices", async () => {
  const response = await fetch(`${baseUrl}/v1/payments/verify`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      invoiceId: "unknown-invoice",
      transactionHash: `0x${"a".repeat(64)}`
    })
  });
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: "Invoice not found." });
});
