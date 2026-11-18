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
