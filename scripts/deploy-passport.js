const hre = require("hardhat");

const EXPECTED_TESTNET_CHAIN_ID = 97n;
const EXPECTED_TOKEN_NAME = "Vikasah Token";
const EXPECTED_TOKEN_SYMBOL = "VKT";
const EXPECTED_TOKEN_DECIMALS = 18;
const EXPECTED_TOTAL_SUPPLY = hre.ethers.parseEther("1000000000");

function requireAddress(label, value) {
  if (!value || !hre.ethers.isAddress(value) || value === hre.ethers.ZeroAddress) {
    throw new Error(`${label} must be a valid, non-zero EVM address.`);
  }
  return hre.ethers.getAddress(value);
}

async function main() {
  const network = await hre.ethers.provider.getNetwork();
  if (network.chainId !== EXPECTED_TESTNET_CHAIN_ID) {
    throw new Error(
      `Refusing deployment: expected BNB Smart Chain Testnet (chain ID 97), received chain ID ${network.chainId}.`
    );
  }

  const [deployer] = await hre.ethers.getSigners();
  if (!deployer) {
    throw new Error("No deployer account configured. Set DEPLOYER_PRIVATE_KEY as a protected secret.");
  }

  const tokenAddress = requireAddress("VKT_TOKEN_ADDRESS", process.env.VKT_TOKEN_ADDRESS);
  const tokenCode = await hre.ethers.provider.getCode(tokenAddress);
  if (tokenCode === "0x") {
    throw new Error("VKT_TOKEN_ADDRESS has no contract code on BNB Smart Chain Testnet.");
  }

  const token = new hre.ethers.Contract(
    tokenAddress,
    [
      "function name() view returns (string)",
      "function symbol() view returns (string)",
      "function decimals() view returns (uint8)",
      "function totalSupply() view returns (uint256)"
    ],
    hre.ethers.provider
  );

  const [name, symbol, decimals, totalSupply] = await Promise.all([
    token.name(),
    token.symbol(),
    token.decimals(),
    token.totalSupply()
  ]);

  if (
    name !== EXPECTED_TOKEN_NAME ||
    symbol !== EXPECTED_TOKEN_SYMBOL ||
    Number(decimals) !== EXPECTED_TOKEN_DECIMALS ||
    totalSupply !== EXPECTED_TOTAL_SUPPLY
  ) {
    throw new Error(
      "Token preflight failed: expected Vikasah Token (VKT), 18 decimals, and exactly 1,000,000,000 VKT total supply."
    );
  }

  console.log("Network chain ID:", network.chainId.toString());
  console.log("Deployer:", deployer.address);
  console.log("Verified VKT token:", tokenAddress);
  console.log("Deploying the fixed 180-day Utility Passport (no admin controls)...");

  const Passport = await hre.ethers.getContractFactory("VKTUtilityPassport");
  const passport = await Passport.deploy(tokenAddress);
  await passport.waitForDeployment();

  const passportAddress = await passport.getAddress();
  const linkedToken = await passport.vkt();
  const lockDuration = await passport.LOCK_DURATION();

  if (
    hre.ethers.getAddress(linkedToken) !== tokenAddress ||
    lockDuration !== 180n * 24n * 60n * 60n
  ) {
    throw new Error("Post-deployment Passport verification failed.");
  }

  console.log("VKT Utility Passport deployed at:", passportAddress);
  console.log("Linked VKT token:", linkedToken);
  console.log("Lock duration (seconds):", lockDuration.toString());
  console.log("Deployment verification passed. No VKT tokens were transferred by this script.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
