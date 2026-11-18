import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import net from "node:net";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("API handles SIGTERM and closes cleanly", async () => {
  const directory = await mkdtemp(join(tmpdir(), "vkt-shutdown-test-"));
  const portServer = net.createServer();
  await new Promise((resolve, reject) => portServer.once("error", reject).listen(0, "127.0.0.1", resolve));
  const { port } = portServer.address();
  await new Promise((resolve, reject) => portServer.close(error => error ? reject(error) : resolve()));
  const child = spawn(process.execPath, ["server.mjs"], {
    cwd: new URL("..", import.meta.url),
    env: {
      ...process.env,
      PORT: String(port),
      BSC_TESTNET_RPC_URL: "http://127.0.0.1:8545",
      VKT_TOKEN_ADDRESS: "0x0000000000000000000000000000000000000001",
      VKT_MERCHANT_ADDRESS: "0x0000000000000000000000000000000000000002",
      MERCHANT_API_KEY: "test-only-vkt-api-key-with-32-plus-bytes",
      DATABASE_PATH: join(directory, "shutdown.sqlite")
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  let stdout = "";
  let stderr = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", chunk => { stdout += chunk; });
  child.stderr.on("data", chunk => { stderr += chunk; });

  try {
    let ready = false;
    for (let attempt = 0; attempt < 50; attempt += 1) {
      try {
        const response = await fetch(`http://127.0.0.1:${port}/health`);
        if (response.ok) { ready = true; break; }
      } catch { /* Wait for the child process to listen. */ }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.equal(ready, true, "API should start before shutdown");
    child.kill("SIGTERM");
    const exitCode = await new Promise((resolve, reject) => {
      child.once("error", reject);
      child.once("close", resolve);
    });
    assert.equal(exitCode, 0, stderr);
    assert.match(stdout, /closing VKT verifier gracefully/);
  } finally {
    if (child.exitCode === null) child.kill("SIGKILL");
    await rm(directory, { recursive: true, force: true });
  }
});
