import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import http from "node:http";
import Database from "better-sqlite3";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

async function rpcServer(blockResult) {
  const server = http.createServer(async (request, response) => {
    let body = "";
    for await (const chunk of request) body += chunk;
    const payload = JSON.parse(body);
    let result;
    if (payload.method === "eth_chainId") result = "0x61";
    else if (payload.method === "eth_getBlockByNumber") result = blockResult;
    else result = null;
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ jsonrpc: "2.0", id: payload.id, result }));
  });
  await new Promise((resolve, reject) => server.once("error", reject).listen(0, "127.0.0.1", resolve));
  return { server, url: `http://127.0.0.1:${server.address().port}` };
}

async function runReconcile(directory, rpcUrl) {
  const child = spawn(process.execPath, ["reconcile.mjs"], {
    cwd: new URL("..", import.meta.url),
    env: { ...process.env, BSC_TESTNET_RPC_URL: rpcUrl, DATABASE_PATH: join(directory, "payments.sqlite") },
    stdio: ["ignore", "pipe", "pipe"]
  });
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", chunk => { stdout += chunk; });
  child.stderr.on("data", chunk => { stderr += chunk; });
  const code = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", resolve);
  });
  assert.equal(code, 0, stderr);
  return JSON.parse(stdout.trim());
}

async function withPaidInvoice(blockHash, callback) {
  const directory = await mkdtemp(join(tmpdir(), "vkt-reconcile-test-"));
  const database = new Database(join(directory, "payments.sqlite"));
  database.exec(`
    CREATE TABLE invoices (
      id TEXT PRIMARY KEY,
      amount_wei TEXT NOT NULL,
      payer_address TEXT NOT NULL,
      status TEXT NOT NULL,
      transaction_hash TEXT UNIQUE,
      block_number INTEGER,
      block_hash TEXT
    );
  `);
  database.prepare(`
    INSERT INTO invoices (id, amount_wei, payer_address, status, transaction_hash, block_number, block_hash)
    VALUES ('order-1', '100', '0x0000000000000000000000000000000000000003', 'paid', ?, 123, ?)
  `).run(`0x${"a".repeat(64)}`, blockHash);
  database.close();
  try {
    await callback(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test("reconciliation returns an invoice to pending when its recorded block hash is orphaned", async () => {
  await withPaidInvoice(`0x${"1".repeat(64)}`, async directory => {
    const rpc = await rpcServer({
      number: "0x7b",
      hash: `0x${"2".repeat(64)}`,
      parentHash: `0x${"3".repeat(64)}`,
      timestamp: "0x1",
      nonce: "0x0000000000000000",
      difficulty: "0x0",
      gasLimit: "0x1c9c380",
      gasUsed: "0x0",
      miner: "0x0000000000000000000000000000000000000000",
      extraData: "0x",
      transactions: [],
      stateRoot: `0x${"4".repeat(64)}`,
      receiptsRoot: `0x${"5".repeat(64)}`,
      logsBloom: `0x${"0".repeat(512)}`
    });
    try {
      assert.deepEqual(await runReconcile(directory, rpc.url), {
        checked: 1, reset: 1, network: "bsc-testnet", chainId: 97
      });
      const db = new Database(join(directory, "payments.sqlite"), { readonly: true });
      const row = db.prepare("SELECT status, transaction_hash, block_number, block_hash FROM invoices WHERE id='order-1'").get();
      db.close();
      assert.deepEqual(row, { status: "pending", transaction_hash: null, block_number: null, block_hash: null });
    } finally {
      await new Promise(resolve => rpc.server.close(resolve));
    }
  });
});

test("reconciliation leaves a paid invoice unchanged when RPC has no block response", async () => {
  await withPaidInvoice(`0x${"1".repeat(64)}`, async directory => {
    const rpc = await rpcServer(null);
    try {
      assert.deepEqual(await runReconcile(directory, rpc.url), {
        checked: 1, reset: 0, network: "bsc-testnet", chainId: 97
      });
      const db = new Database(join(directory, "payments.sqlite"), { readonly: true });
      const row = db.prepare("SELECT status, transaction_hash, block_hash FROM invoices WHERE id='order-1'").get();
      db.close();
      assert.equal(row.status, "paid");
      assert.equal(row.transaction_hash, `0x${"a".repeat(64)}`);
      assert.equal(row.block_hash, `0x${"1".repeat(64)}`);
    } finally {
      await new Promise(resolve => rpc.server.close(resolve));
    }
  });
});
