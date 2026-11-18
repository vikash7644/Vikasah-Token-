import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import Database from "better-sqlite3";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("online backup command creates a consistent standalone SQLite copy", async () => {
  const directory = await mkdtemp(join(tmpdir(), "vkt-backup-test-"));
  const source = join(directory, "source.sqlite");
  const destination = join(directory, "backups", "copy.sqlite");
  const original = new Database(source);
  original.exec("CREATE TABLE sample (id INTEGER PRIMARY KEY, value TEXT NOT NULL)");
  original.prepare("INSERT INTO sample (value) VALUES (?)").run("backup-ok");
  original.close();

  try {
    const child = spawn(process.execPath, ["backup.mjs"], {
      cwd: new URL("..", import.meta.url),
      env: { ...process.env, DATABASE_PATH: source, BACKUP_PATH: destination },
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
    assert.match(stdout, /SQLite backup completed and integrity-checked/);

    const copy = new Database(destination, { readonly: true, fileMustExist: true });
    assert.equal(copy.prepare("SELECT value FROM sample WHERE id = 1").get().value, "backup-ok");
    copy.close();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("online backup refuses to overwrite the live source database", async () => {
  const directory = await mkdtemp(join(tmpdir(), "vkt-backup-same-"));
  const source = join(directory, "source.sqlite");
  const original = new Database(source);
  original.exec("CREATE TABLE sample (value TEXT)");
  original.close();

  try {
    const child = spawn(process.execPath, ["backup.mjs"], {
      cwd: new URL("..", import.meta.url),
      env: { ...process.env, DATABASE_PATH: source, BACKUP_PATH: source },
      stdio: "ignore"
    });
    const exitCode = await new Promise((resolve, reject) => {
      child.once("error", reject);
      child.once("close", resolve);
    });
    assert.notEqual(exitCode, 0);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
