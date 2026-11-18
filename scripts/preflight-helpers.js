function requireAddress(ethers, label, value) {
  if (
    typeof value !== "string" ||
    !ethers.isAddress(value) ||
    value.toLowerCase() === ethers.ZeroAddress.toLowerCase()
  ) {
    throw new Error(`${label} must be a valid, non-zero EVM address.`);
  }
  return ethers.getAddress(value);
}

function validateAllocationWallets(ethers, {
  owner,
  ownerAllocationReceiver,
  distributionReceiver
}) {
  const normalized = {
    owner: requireAddress(ethers, "TOKEN_ADMIN_OWNER", owner),
    ownerAllocationReceiver: requireAddress(
      ethers,
      "OWNER_ALLOCATION_RECEIVER",
      ownerAllocationReceiver
    ),
    distributionReceiver: requireAddress(
      ethers,
      "DISTRIBUTION_RESERVE_RECEIVER",
      distributionReceiver
    )
  };
  if (normalized.ownerAllocationReceiver === normalized.distributionReceiver) {
    throw new Error("Owner allocation and distribution reserve must use different wallets.");
  }
  return normalized;
}

function calculateRequiredBalance(gasLimit, gasPrice, bufferPercent = 120n) {
  const gas = BigInt(gasLimit);
  const price = BigInt(gasPrice);
  const buffer = BigInt(bufferPercent);
  if (gas <= 0n || price <= 0n || buffer < 100n) {
    throw new Error("Gas limit and gas price must be positive; buffer must be at least 100%.");
  }
  return (gas * price * buffer + 99n) / 100n;
}

module.exports = {
  requireAddress,
  validateAllocationWallets,
  calculateRequiredBalance
};
