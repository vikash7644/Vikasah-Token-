import test from "node:test";
import assert from "node:assert/strict";
import {
  BNB_TESTNET_CHAIN_ID,
  assertSameBlock,
  snapshotToCsv,
  buildSnapshot,
  formatUnits,
  isValidAddress,
  parseDecimals,
  validateConfig,
  validateSupply
} from "./core.mjs";

const token = "0x1111111111111111111111111111111111111111";
const owner = "0x2222222222222222222222222222222222222222";
const reserve = "0x3333333333333333333333333333333333333333";

test("targets BNB Smart Chain Testnet chain ID 97", () => {
  assert.equal(BNB_TESTNET_CHAIN_ID, "0x61");
});

test("accepts valid 20-byte EVM addresses and rejects malformed values", () => {
  assert.equal(isValidAddress(token), true);
  assert.equal(isValidAddress("0x1234"), false);
  assert.equal(isValidAddress("not-an-address"), false);
});

test("requires HTTPS and distinct owner/reserve wallets", () => {
  assert.throws(() => validateConfig({ rpcUrl: "http://rpc.example", token, owner, reserve }), /HTTPS/);
  assert.throws(() => validateConfig({ rpcUrl: "https://rpc.example", token, owner, reserve: owner }), /different/);
  assert.doesNotThrow(() => validateConfig({ rpcUrl: "https://rpc.example", token, owner, reserve }));
});

test("formats token values without floating-point loss", () => {
  assert.equal(formatUnits(1234567890123456789n, 18), "1.2345");
  assert.equal(formatUnits(1000000000000000000n, 18), "1");
  assert.equal(formatUnits(123n, 0), "123");
});

test("accepts supported decimals and rejects unreasonable decimals", () => {
  assert.equal(parseDecimals("0x12"), 18);
  assert.throws(() => parseDecimals("0x25"), /unsupported decimals/);
});

test("enforces the fixed cap and aggregate wallet balance sanity check", () => {
  const oneBillion = 1_000_000_000n * 10n ** 18n;
  assert.equal(validateSupply({ supply: oneBillion, ownerBalance: 300_000_000n * 10n ** 18n, reserveBalance: 700_000_000n * 10n ** 18n, decimals: 18 }), true);
  assert.throws(() => validateSupply({ supply: oneBillion + 1n, ownerBalance: 0n, reserveBalance: 0n, decimals: 18 }), /sanity checks/);
  assert.throws(() => validateSupply({ supply: 10n, ownerBalance: 8n, reserveBalance: 8n, decimals: 0 }), /sanity checks/);
});

test("exports a JSON-safe snapshot with raw integer balances and provenance warning", () => {
  const snapshot = buildSnapshot({
    token, owner, reserve, blockNumber: 123456, blockHash: "0x" + "a".repeat(64),
    decimals: 18, supply: 1000n, ownerBalance: 300n, reserveBalance: 700n,
    timestamp: "2026-11-18T09:00:00.000Z"
  });
  assert.equal(snapshot.chainId, 97);
  assert.equal(snapshot.blockNumber, 123456);
  assert.equal(snapshot.blockHash, "0x" + "a".repeat(64));
  assert.equal(snapshot.totalSupplyRaw, "1000");
  assert.equal(snapshot.ownerBalanceRaw, "300");
  assert.match(snapshot.note, /user-supplied/);
  assert.doesNotThrow(() => JSON.stringify(snapshot));
});

test("rejects a block hash change during snapshot collection", () => {
  const hash = "0x" + "b".repeat(64);
  assert.equal(assertSameBlock(hash, hash.toUpperCase()), true);
  assert.throws(() => assertSameBlock(hash, "0x" + "c".repeat(64)), /reorganization/);
});

test("exports a quoted CSV with raw integer amounts", () => {
  const snapshot = buildSnapshot({
    token, owner, reserve, blockNumber: 123, blockHash: "0x" + "d".repeat(64),
    decimals: 18, supply: 1000n, ownerBalance: 300n, reserveBalance: 700n,
    timestamp: "2026-11-18T09:00:00.000Z"
  });
  const csv = snapshotToCsv(snapshot);
  assert.match(csv, /"totalSupplyRaw","1000"/);
  assert.match(csv, /"ownerBalanceRaw","300"/);
  assert.match(csv, /"reserveBalanceRaw","700"/);
  assert.ok(csv.endsWith("\\r\\n"));
});
