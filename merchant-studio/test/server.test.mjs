import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import http from "node:http";
import net from "node:net";

let upstream;
let child;
let baseUrl;
let upstreamReady = true;

async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => server.once("error", reject).listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  return port;
}

before(async () => {
  const upstreamPort = await freePort();
  upstream = http.createServer((req, res) => {
    res.setHeader("content-type", "application/json");
    if (req.url === "/v1/config") {
      res.end(JSON.stringify({
        network: "bsc-testnet",
        chainId: 97,
        tokenAddress: "0x0000000000000000000000000000000000000001",
        merchantAddress: "0x0000000000000000000000000000000000000002"
      }));
      return;
    }
    if (req.url === "/ready") {
      res.statusCode = upstreamReady ? 200 : 503;
      res.end(JSON.stringify({
        ok: upstreamReady,
        ready: upstreamReady,
        reason: upstreamReady ? undefined : "RPC unavailable"
      }));
      return;
    }
    res.statusCode = 404;
    res.end(JSON.stringify({ error: "not found" }));
  });
  await new Promise((resolve, reject) => upstream.once("error", reject).listen(upstreamPort, "127.0.0.1", resolve));

  const port = await freePort();
  baseUrl = "http://127.0.0.1:" + port;
  child = spawn(process.execPath, ["server.mjs"], {
    cwd: new URL("../server/", import.meta.url),
    env: {
      ...process.env,
      PORT: String(port),
      VKT_API_BASE_URL: "http://127.0.0.1:" + upstreamPort,
      MERCHANT_API_KEY: "test-merchant-key-with-at-least-32-random-bytes"
    },
    stdio: "ignore"
  });

  let ready = false;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(baseUrl + "/health");
      if (response.ok) { ready = true; break; }
    } catch { /* Wait for the local server to bind. */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.equal(ready, true, "Merchant Studio server should start");
});

after(async () => {
  if (child && child.exitCode === null) {
    child.kill("SIGTERM");
    await new Promise(resolve => child.once("exit", resolve));
  }
  if (upstream) await new Promise(resolve => upstream.close(resolve));
});

test("health endpoint reports process liveness", async () => {
  const response = await fetch(baseUrl + "/health");
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, service: "vkt-merchant-studio" });
});

test("readiness requires the upstream verifier and BNB testnet configuration", async () => {
  const response = await fetch(baseUrl + "/ready");
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    ok: true,
    ready: true,
    chainId: 97,
    network: "bsc-testnet"
  });

  upstreamReady = false;
  const unavailable = await fetch(baseUrl + "/ready");
  assert.equal(unavailable.status, 503);
  assert.equal((await unavailable.json()).ready, false);
});

test("static checkout is served but server source files are not public", async () => {
  const page = await fetch(baseUrl + "/");
  assert.equal(page.status, 200);
  assert.match(await page.text(), /VKT Merchant Studio/);

  const source = await fetch(baseUrl + "/server/vkt-proxy.mjs");
  assert.equal(source.status, 404);
  const tests = await fetch(baseUrl + "/test/server.test.mjs");
  assert.equal(tests.status, 404);
});

test("checkout API rejects malformed invoice requests before upstream forwarding", async () => {
  const response = await fetch(baseUrl + "/api/vkt/invoices", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ invoiceId: "../bad", amount: "1", payerAddress: "0x0000000000000000000000000000000000000003" })
  });
  assert.equal(response.status, 400);
});
