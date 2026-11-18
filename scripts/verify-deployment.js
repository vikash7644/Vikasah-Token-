const hre = require("hardhat");
const fs = require("node:fs");
const path = require("node:path");

const EXPECTED_CHAIN_ID = 97n;
const DEFAULT_RECORD_PATH = path.join("deployments", "bsc-testnet.json");

async function main() {
  const recordPath = path.resolve(process.env.DEPLOYMENT_RECORD_PATH || DEFAULT_RECORD_PATH);
  if (!fs.existsSync(recordPath)) {
    throw new Error(
      `Deployment record not found at ${recordPath}. Deploy the token first or set DEPLOYMENT_RECORD_PATH to a reviewed record.`
    );
  }

  const record = JSON.parse(fs.readFileSync(recordPath, "utf8"));
  if (record.network !== "bsc-testnet" || record.chainId !== 97) {
    throw new Error("Deployment record is not for BNB Smart Chain Testnet (chain ID 97).");
  }

  const network = await hre.ethers.provider.getNetwork();
  if (network.chainId !== EXPECTED_CHAIN_ID) {
    throw new Error(`Wrong network: expected chain ID 97, received ${network.chainId}.`);
  }

  if (!hre.ethers.isAddress(record.address) || record.address === hre.ethers.ZeroAddress) {
    throw new Error("Deployment record contains an invalid token contract address.");
  }
  const address = hre.ethers.getAddress(record.address);
  const code = await hre.ethers.provider.getCode(address);
  if (code === "0x") throw new Error("No contract bytecode exists at the recorded address on BNB Testnet.");

  const token = await hre.ethers.getContractAt("VikasahToken", address);
  const [
    name,
    symbol,
    decimals,
    totalSupply,
    maxSupply,
    ownerAllocation,
    distributionReserve,
    owner,
    ownerBalance,
    reserveBalance,
    paused
  ] = await Promise.all([
    token.name(),
    token.symbol(),
    token.decimals(),
    token.totalSupply(),
    token.MAX_SUPPLY(),
    token.OWNER_ALLOCATION(),
    token.DISTRIBUTION_RESERVE(),
    token.owner(),
    token.balanceOf(record.ownerAllocationReceiver),
    token.balanceOf(record.distributionReserveReceiver),
    token.paused()
  ]);

  const expectedOwner = hre.ethers.parseEther("300000000");
  const expectedReserve = hre.ethers.parseEther("700000000");
  const expectedSupply = hre.ethers.parseEther("1000000000");
  const expectedAdmin = hre.ethers.getAddress(record.adminOwner);
  if (
    name !== "Vikasah Token" ||
    symbol !== "VKT" ||
    decimals !== 18n ||
    maxSupply !== expectedSupply ||
    ownerAllocation !== expectedOwner ||
    distributionReserve !== expectedReserve ||
    totalSupply !== expectedSupply ||
    owner !== expectedAdmin ||
    ownerBalance !== expectedOwner ||
    reserveBalance !== expectedReserve
  ) {
    throw new Error("On-chain token metadata, owner or allocation balances do not match the expected VKT deployment.");
  }

  record.status = "deployed_verified";
  record.verifiedAt = new Date().toISOString();
  record.onChain = {
    name,
    symbol,
    decimals: Number(decimals),
    owner,
    totalSupply: hre.ethers.formatUnits(totalSupply, 18),
    maxSupply: hre.ethers.formatUnits(maxSupply, 18),
    ownerAllocation: hre.ethers.formatUnits(ownerBalance, 18),
    distributionReserve: hre.ethers.formatUnits(reserveBalance, 18),
    paused
  };
  fs.writeFileSync(recordPath, JSON.stringify(record, null, 2) + "\n", { mode: 0o600 });

  console.log("VKT TESTNET READ-ONLY VERIFICATION PASSED");
  console.log("Contract:", address);
  console.log("Explorer:", "https://testnet.bscscan.com/address/" + address);
  console.log("Total supply:", record.onChain.totalSupply, "VKT");
  console.log("Owner allocation:", record.onChain.ownerAllocation, "VKT");
  console.log("Distribution reserve:", record.onChain.distributionReserve, "VKT");
  console.log("Paused:", paused);
  console.log("Updated local record:", recordPath);
}

main().catch((error) => {
  console.error("VKT testnet verification failed:", error.message);
  process.exitCode = 1;
});
