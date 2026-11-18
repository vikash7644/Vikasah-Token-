import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import Database from "better-sqlite3";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("restore creates and validates a new database without modifying the backup", async () => {
  const directory = await mkdtemp(join(tmpdir(), "vkt-restore-test-"));
  const backup = join(directory, "backup.sqlite");
  const destination = join(directory, "restored", "payments.sqlite");
  const source = new Database(backup);
  source.exec(`
    CREATE TABLE invoices (
      id TEXT PRIMARY KEY, amount_wei TEXT NOT NULL, payer_address TEXT NOT NULL,
      status TEXT NOT NULL, transaction_hash TEXT, block_number INTEGER, block_hash TEXT
    );
    INSERT INTO invoices (id, amount_wei, payer_address, status)
    VALUES ('order-restore', '100', '0x0000000000000000000000000000000000000003', 'pending');
  `);
  source.close();
  const before = await readFile(backup);

  try {
    const child = spawn(process.execPath, ["restore.mjs", backup, destination], {
      cwd: new URL("..", import.meta.url),
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", chunk => { stdout += chunk; });
    child.stderr.on("data", chunk => { stderr += chunk; });
    const exitCode = await new Promise((resolve, reject) => {
      child.once("error", reject);
      child.once("close", resolve);
    });
    assert.equal(exitCode, 0, stderr);
    assert.match(stdout, /restore created and integrity-checked/);
    const restored = new Database(destination, { readonly: true, fileMustExist: true });
    assert.equal(restored.prepare("SELECT id FROM invoices").get().id, "order-restore");
    restored.close();
    assert.deepEqual(await readFile(backup), before);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("restore refuses to overwrite an existing destination", async () => {
  const directory = await mkdtemp(join(tmpdir(), "vkt-restore-existing-"));
  const backup = join(directory, "backup.sqlite");
  const destination = join(directory, "existing.sqlite");
  const source = new Database(backup);
  source.exec(`
    CREATE TABLE invoices (
      id TEXT PRIMARY KEY, amount_wei TEXT NOT NULL, payer_address TEXT NOT NULL,
      status TEXT NOT NULL, transaction_hash TEXT, block_number INTEGER, block_hash TEXT
    );
  `);
  source.close();
  const existing = new Database(destination);
  existing.exec("CREATE TABLE preserve_me (value TEXT); INSERT INTO preserve_me VALUES ('untouched')");
  existing.close();

  try {
    const child = spawn(process.execPath, ["restore.mjs", backup, destination], {
      cwd: new URL("..", import.meta.url),
      stdio: "ignore"
    });
    const exitCode = await new Promise((resolve, reject) => {
      child.once("error", reject);
      child.once("close", resolve);
    });
    assert.notEqual(exitCode, 0);
    const check = new Database(destination, { readonly: true });
    assert.equal(check.prepare("SELECT value FROM preserve_me").get().value, "untouched");
    check.close();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
