import "dotenv/config";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import Database from "better-sqlite3";

const sourcePath = resolve(process.env.DATABASE_PATH || "./vkt-payments.sqlite");
const backupPath = resolve(process.env.BACKUP_PATH || "./backups/vkt-payments.sqlite");

if (sourcePath === backupPath) {
  throw new Error("BACKUP_PATH must be different from DATABASE_PATH.");
}

await mkdir(dirname(backupPath), { recursive: true });
const database = new Database(sourcePath, { readonly: true, fileMustExist: true });
try {
  await database.backup(backupPath);
  console.log("SQLite backup completed.");
} finally {
  database.close();
}
