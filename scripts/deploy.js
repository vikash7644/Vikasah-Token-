const hre = require("hardhat");

const EXPECTED_TESTNET_CHAIN_ID = 97n;

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
    throw new Error("No deployer account configured. Set DEPLOYER_PRIVATE_KEY in the ignored .env file.");
  }

  const owner = requireAddress("TOKEN_ADMIN_OWNER", process.env.TOKEN_ADMIN_OWNER);
  const ownerAllocationReceiver = requireAddress(
    "OWNER_ALLOCATION_RECEIVER",
    process.env.OWNER_ALLOCATION_RECEIVER
  );
  const distributionReceiver = requireAddress(
    "DISTRIBUTION_RESERVE_RECEIVER",
    process.env.DISTRIBUTION_RESERVE_RECEIVER
  );

  if (ownerAllocationReceiver === distributionReceiver) {
    throw new Error("Owner allocation and distribution reserve must use different wallets.");
  }

  console.log("Network chain ID:", network.chainId.toString());
  console.log("Deploying from:", deployer.address);
  console.log("Admin owner:", owner);
  console.log("30% owner allocation receiver:", ownerAllocationReceiver);
  console.log("70% distribution reserve receiver:", distributionReceiver);

  const Token = await hre.ethers.getContractFactory("VikasahToken");
  const token = await Token.deploy(owner, ownerAllocationReceiver, distributionReceiver);
  await token.waitForDeployment();

  const address = await token.getAddress();
  const [ownerBalance, reserveBalance, supply] = await Promise.all([
    token.balanceOf(ownerAllocationReceiver),
    token.balanceOf(distributionReceiver),
    token.totalSupply()
  ]);

  const expectedOwner = hre.ethers.parseEther("300000000");
  const expectedReserve = hre.ethers.parseEther("700000000");
  const expectedSupply = hre.ethers.parseEther("1000000000");
  if (
    ownerBalance !== expectedOwner ||
    reserveBalance !== expectedReserve ||
    supply !== expectedSupply
  ) {
    throw new Error("Post-deployment allocation invariant failed; do not proceed with launch.");
  }

  console.log("Vikasah Token deployed at:", address);
  console.log("Owner allocation:", hre.ethers.formatUnits(ownerBalance, 18), "VKT");
  console.log("Distribution reserve:", hre.ethers.formatUnits(reserveBalance, 18), "VKT");
  console.log("Total supply:", hre.ethers.formatUnits(supply, 18), "VKT");
  console.log("Deployment preflight and allocation checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
