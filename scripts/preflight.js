const hre = require("hardhat");

const EXPECTED_TESTNET_CHAIN_ID = 97n;

const {
  validateAllocationWallets,
  calculateRequiredBalance
} = require("./preflight-helpers");

async function main() {
  const network = await hre.ethers.provider.getNetwork();
  if (network.chainId !== EXPECTED_TESTNET_CHAIN_ID) {
    throw new Error(`Preflight is testnet-only: expected chain ID 97, received ${network.chainId}.`);
  }

  const [deployer] = await hre.ethers.getSigners();
  if (!deployer) {
    throw new Error("No deployer configured. Set DEPLOYER_PRIVATE_KEY in the ignored .env file.");
  }

  const {
    owner,
    ownerAllocationReceiver,
    distributionReceiver
  } = validateAllocationWallets(hre.ethers, {
    owner: process.env.TOKEN_ADMIN_OWNER,
    ownerAllocationReceiver: process.env.OWNER_ALLOCATION_RECEIVER,
    distributionReceiver: process.env.DISTRIBUTION_RESERVE_RECEIVER
  });

  const factory = await hre.ethers.getContractFactory("VikasahToken", deployer);
  const deployment = await factory.getDeployTransaction(
    owner,
    ownerAllocationReceiver,
    distributionReceiver
  );
  const gasLimit = await hre.ethers.provider.estimateGas({
    ...deployment,
    from: deployer.address
  });
  const feeData = await hre.ethers.provider.getFeeData();
  const gasPrice = feeData.gasPrice ?? feeData.maxFeePerGas;
  if (!gasPrice || gasPrice <= 0n) {
    throw new Error("RPC did not provide a usable gas price; deployment cost cannot be estimated safely.");
  }

  const estimatedCost = gasLimit * gasPrice;
  const requiredBalance = calculateRequiredBalance(gasLimit, gasPrice);
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  if (balance < requiredBalance) {
    throw new Error(
      `Insufficient testnet BNB for estimated deployment plus 20% buffer. Need at least ${hre.ethers.formatEther(requiredBalance)} BNB; deployer has ${hre.ethers.formatEther(balance)} BNB.`
    );
  }

  console.log("VKT TESTNET PREFLIGHT PASSED (no transaction sent)");
  console.log("Chain ID:", network.chainId.toString());
  console.log("Deployer:", deployer.address);
  console.log("Admin owner:", owner);
  console.log("30% allocation receiver:", ownerAllocationReceiver);
  console.log("70% reserve receiver:", distributionReceiver);
  console.log("Estimated gas:", gasLimit.toString());
  console.log("Estimated deployment cost:", hre.ethers.formatEther(estimatedCost), "BNB");
  console.log("Required balance with 20% buffer:", hre.ethers.formatEther(requiredBalance), "BNB");
  console.log("Available deployer balance:", hre.ethers.formatEther(balance), "BNB");
}

main().catch((error) => {
  console.error("VKT testnet preflight failed:", error.message);
  process.exitCode = 1;
});
