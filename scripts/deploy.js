const hre = require("hardhat");
const fs = require("node:fs");
const path = require("node:path");

const EXPECTED_TESTNET_CHAIN_ID = 97n;

function requireAddress(label, value) {
  if (!value || !hre.ethers.isAddress(value) || value.toLowerCase() === hre.ethers.ZeroAddress.toLowerCase()) {
    throw new Error(`${label} must be a valid, non-zero EVM address.`);
  }
  return hre.ethers.getAddress(value);
}

function saveDeploymentRecord(record) {
  const recordPath = path.resolve(
    process.env.DEPLOYMENT_RECORD_PATH || path.join("deployments", "bsc-testnet.json")
  );
  fs.mkdirSync(path.dirname(recordPath), { recursive: true });
  fs.writeFileSync(recordPath, JSON.stringify(record, null, 2) + "\n", { mode: 0o600 });
  console.log("Deployment record saved to:", recordPath);
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
  const deploymentTx = token.deploymentTransaction();
  if (!deploymentTx) throw new Error("Deployment transaction details are unavailable.");
  const receipt = await deploymentTx.wait(1);
  if (!receipt || receipt.status !== 1) {
    throw new Error(`Deployment transaction ${deploymentTx.hash} did not produce a successful receipt.`);
  }

  const record = {
    status: "deployed_unverified",
    network: "bsc-testnet",
    chainId: Number(network.chainId),
    contract: "VikasahToken",
    address,
    transactionHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    deployer: deployer.address,
    adminOwner: owner,
    ownerAllocationReceiver,
    distributionReserveReceiver,
    deployedAt: new Date().toISOString()
  };
  saveDeploymentRecord(record);

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
    record.status = "allocation_invariant_failed";
    record.observedOwnerAllocation = hre.ethers.formatUnits(ownerBalance, 18);
    record.observedDistributionReserve = hre.ethers.formatUnits(reserveBalance, 18);
    record.observedTotalSupply = hre.ethers.formatUnits(supply, 18);
    saveDeploymentRecord(record);
    throw new Error("Post-deployment allocation invariant failed; do not proceed with launch.");
  }

  Object.assign(record, {
    status: "deployed_verified",
    tokenName: await token.name(),
    tokenSymbol: await token.symbol(),
    decimals: Number(await token.decimals()),
    ownerAllocation: hre.ethers.formatUnits(ownerBalance, 18),
    distributionReserve: hre.ethers.formatUnits(reserveBalance, 18),
    totalSupply: hre.ethers.formatUnits(supply, 18)
  });
  saveDeploymentRecord(record);

  console.log("Vikasah Token deployed at:", address);
  console.log("Deployment transaction:", receipt.hash);
  console.log("Owner allocation:", record.ownerAllocation, "VKT");
  console.log("Distribution reserve:", record.distributionReserve, "VKT");
  console.log("Total supply:", record.totalSupply, "VKT");
  console.log("Deployment receipt and allocation invariants verified.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
