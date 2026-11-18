export const BNB_TESTNET_CHAIN_ID = "0x61";
export const MAX_SUPPLY_TOKENS = 1_000_000_000n;
export const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

export function isValidAddress(value) {
  return typeof value === "string" && ADDRESS_PATTERN.test(value.trim());
}

export function validateConfig({ rpcUrl, token, owner, reserve }) {
  if (typeof rpcUrl !== "string" || !/^https:\/\//i.test(rpcUrl.trim())) {
    throw new Error("Use an HTTPS RPC endpoint.");
  }
  if (![token, owner, reserve].every(isValidAddress)) {
    throw new Error("Enter valid token, owner allocation and reserve addresses.");
  }
  if (owner.trim().toLowerCase() === reserve.trim().toLowerCase()) {
    throw new Error("Owner and reserve wallets must be different.");
  }
}

export function parseDecimals(hexValue) {
  const decimals = Number(BigInt(hexValue));
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 36) {
    throw new Error("Token returned an unsupported decimals value.");
  }
  return decimals;
}

export function formatUnits(rawValue, decimals = 18) {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 36) {
    throw new RangeError("Decimals must be an integer from 0 to 36.");
  }
  const raw = BigInt(rawValue);
  const unit = 10n ** BigInt(decimals);
  const whole = raw / unit;
  const fraction = decimals === 0
    ? ""
    : (raw % unit).toString().padStart(decimals, "0").slice(0, 4).replace(/0+$/, "");
  return whole.toLocaleString("en-US") + (fraction ? "." + fraction : "");
}

export function validateSupply({ supply, ownerBalance, reserveBalance, decimals }) {
  const total = BigInt(supply);
  const owner = BigInt(ownerBalance);
  const reserve = BigInt(reserveBalance);
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 36) {
    throw new Error("Token returned an unsupported decimals value.");
  }
  const cap = MAX_SUPPLY_TOKENS * (10n ** BigInt(decimals));
  if (total < 0n || owner < 0n || reserve < 0n || total > cap || owner + reserve > total) {
    throw new Error("On-chain values violate the configured supply sanity checks.");
  }
  return true;
}

export function buildSnapshot({ token, owner, reserve, blockNumber, blockHash, blockTimestamp, decimals, supply, ownerBalance, reserveBalance, timestamp }) {
  return {
    schema: "vkt-treasury-snapshot/v1",
    network: "BNB Smart Chain Testnet",
    chainId: 97,
    capturedAt: timestamp,
    blockNumber,
    blockHash,
    blockTimestamp,
    tokenContract: token,
    ownerAllocationWallet: owner,
    distributionReserveWallet: reserve,
    decimals,
    totalSupplyRaw: String(supply),
    totalSupply: formatUnits(supply, decimals),
    ownerBalanceRaw: String(ownerBalance),
    ownerBalance: formatUnits(ownerBalance, decimals),
    reserveBalanceRaw: String(reserveBalance),
    reserveBalance: formatUnits(reserveBalance, decimals),
    note: "Read-only RPC snapshot. Wallet labels are user-supplied and must be verified against deployment records. Not an audited financial statement."
  };
}

export function assertSameBlock(expectedHash, observedHash) {
  if (typeof expectedHash !== "string" || typeof observedHash !== "string" ||
      expectedHash.toLowerCase() !== observedHash.toLowerCase()) {
    throw new Error("The snapshot block changed during the read (possible chain reorganization). Please retry.");
  }
  return true;
}

export function snapshotToCsv(snapshot) {
  const rows = [
    ["field", "value"],
    ["schema", snapshot.schema],
    ["network", snapshot.network],
    ["chainId", snapshot.chainId],
    ["capturedAt", snapshot.capturedAt],
    ["blockNumber", snapshot.blockNumber],
    ["blockHash", snapshot.blockHash],
    ["blockTimestamp", snapshot.blockTimestamp],
    ["tokenContract", snapshot.tokenContract],
    ["ownerAllocationWallet", snapshot.ownerAllocationWallet],
    ["distributionReserveWallet", snapshot.distributionReserveWallet],
    ["decimals", snapshot.decimals],
    ["totalSupply", snapshot.totalSupply],
    ["totalSupplyRaw", snapshot.totalSupplyRaw],
    ["ownerBalance", snapshot.ownerBalance],
    ["ownerBalanceRaw", snapshot.ownerBalanceRaw],
    ["reserveBalance", snapshot.reserveBalance],
    ["reserveBalanceRaw", snapshot.reserveBalanceRaw],
    ["note", snapshot.note]
  ];
  return rows.map((row) => row.map((value) => {
    const text = String(value ?? "");
    return '"' + text.replace(/"/g, '""') + '"';
  }).join(",")).join("\r\n") + "\r\n";
}

export function parseBlockTimestamp(hexValue) {
  if (typeof hexValue !== "string" || !/^0x[0-9a-f]+$/i.test(hexValue)) {
    throw new Error("RPC returned an invalid block timestamp.");
  }
  const seconds = BigInt(hexValue);
  if (seconds <= 0n || seconds > 253402300799n) {
    throw new Error("RPC returned a block timestamp outside the supported date range.");
  }
  return new Date(Number(seconds) * 1000).toISOString();
}
