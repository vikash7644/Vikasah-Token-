import { copyFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import Database from "better-sqlite3";

const [backupArgument, destinationArgument] = process.argv.slice(2);
if (!backupArgument || !destinationArgument || process.argv.length !== 4) {
  throw new Error("Usage: node restore.mjs <verified-backup.sqlite> <new-database-path>");
}
const backupPath = resolve(backupArgument);
const destinationPath = resolve(destinationArgument);
if (backupPath === destinationPath) {
  throw new Error("Restore source and destination must be different paths.");
}

function validateDatabase(path) {
  const database = new Database(path, { readonly: true, fileMustExist: true });
  try {
    const integrity = database.pragma("integrity_check", { simple: true });
    if (integrity !== "ok") throw new Error("SQLite integrity check failed.");
    const tables = new Set(database.prepare(
      "SELECT name FROM sqlite_master WHERE type='table'"
    ).all().map(row => row.name));
    if (!tables.has("invoices")) throw new Error("Database is missing the invoices table.");
    const columns = new Set(database.prepare("PRAGMA table_info(invoices)").all().map(row => row.name));
    for (const column of ["id", "amount_wei", "payer_address", "status", "transaction_hash", "block_number", "block_hash"]) {
      if (!columns.has(column)) throw new Error(`Database is missing required invoices column: ${column}`);
    }
  } finally {
    database.close();
  }
}

validateDatabase(backupPath);
let created = false;
try {
  // COPYFILE_EXCL guarantees the restore never overwrites an existing database.
  await copyFile(backupPath, destinationPath, 1);
  created = true;
  validateDatabase(destinationPath);
  console.log("SQLite restore created and integrity-checked at the requested new path.");
} catch (error) {
  if (created) await rm(destinationPath, { force: true });
  throw error;
}
