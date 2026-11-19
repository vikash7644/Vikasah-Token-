const hre = require("hardhat");

const EXPECTED_MAINNET_CHAIN_ID = 56n;
const REQUIRED_CONFIRMATION = "I_HAVE_VERIFIED_VKT_MAINNET_DEPLOYMENT";
const GAS_LIMIT_BUFFER_PERCENT = 20n;

function requireAddress(label, value) {
  if (!value || !hre.ethers.isAddress(value) || value === hre.ethers.ZeroAddress) {
    throw new Error(`${label} must be a valid, non-zero EVM address.`);
  }
  return hre.ethers.getAddress(value);
}

async function main() {
  if (process.env.VKT_MAINNET_DEPLOYMENT_CONFIRM !== REQUIRED_CONFIRMATION) {
    throw new Error(
      "Mainnet deployment blocked. Review the source, audit, wallet addresses and gas estimate, then set VKT_MAINNET_DEPLOYMENT_CONFIRM to the exact confirmation string in your private environment."
    );
  }

  const provider = hre.ethers.provider;
  const network = await provider.getNetwork();
  if (network.chainId !== EXPECTED_MAINNET_CHAIN_ID) {
    throw new Error(
      `Refusing deployment: expected BNB Smart Chain Mainnet (chain ID 56), received chain ID ${network.chainId}.`
    );
  }

  const [deployer] = await hre.ethers.getSigners();
  if (!deployer) throw new Error("No deployer configured. Use a secure local signer; never commit its key.");

  const deployerAddress = hre.ethers.getAddress(deployer.address);
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
    throw new Error("Owner allocation and distribution reserve must be different wallets.");
  }
  if (owner === ownerAllocationReceiver || owner === distributionReceiver) {
    throw new Error("Use a separately controlled admin owner, preferably a multisig.");
  }
  if (
    deployerAddress === owner ||
    deployerAddress === ownerAllocationReceiver ||
    deployerAddress === distributionReceiver
  ) {
    throw new Error("Use a dedicated deployer wallet separate from all three token role wallets.");
  }

  const Token = await hre.ethers.getContractFactory("VikasahToken");
  const deploymentRequest = await Token.getDeployTransaction(
    owner,
    ownerAllocationReceiver,
    distributionReceiver
  );
  const estimatedGas = await provider.estimateGas({
    ...deploymentRequest,
    from: deployerAddress
  });
  const gasLimit = (estimatedGas * (100n + GAS_LIMIT_BUFFER_PERCENT) + 99n) / 100n;

  const feeData = await provider.getFeeData();
  const deploymentOverrides = { gasLimit };
  let maximumFeePerGas;
  if (feeData.maxFeePerGas != null && feeData.maxPriorityFeePerGas != null) {
    deploymentOverrides.maxFeePerGas = feeData.maxFeePerGas;
    deploymentOverrides.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
    maximumFeePerGas = feeData.maxFeePerGas;
  } else if (feeData.gasPrice != null) {
    deploymentOverrides.gasPrice = feeData.gasPrice;
    maximumFeePerGas = feeData.gasPrice;
  } else {
    throw new Error("RPC did not provide usable gas fee data; refusing to broadcast.");
  }

  const maximumEstimatedCost = gasLimit * maximumFeePerGas;
  const balance = await provider.getBalance(deployerAddress);
  console.log("NETWORK: BNB Smart Chain MAINNET (56)");
  console.log("Deployer:", deployerAddress);
  console.log("Deployer BNB balance:", hre.ethers.formatEther(balance));
  console.log("Admin owner:", owner);
  console.log("30% allocation receiver:", ownerAllocationReceiver);
  console.log("70% reserve receiver:", distributionReceiver);
  console.log("Estimated gas:", estimatedGas.toString());
  console.log("Gas limit with 20% buffer:", gasLimit.toString());
  console.log("Maximum estimated deployment fee (BNB):", hre.ethers.formatEther(maximumEstimatedCost));

  if (balance < maximumEstimatedCost) {
    throw new Error(
      `Insufficient deployer BNB balance. Need at least ${hre.ethers.formatEther(maximumEstimatedCost)} BNB at the quoted fee cap; no transaction was sent.`
    );
  }

  console.log("Preflight passed. Review the addresses and fee cap before signing.");
  const token = await Token.deploy(
    owner,
    ownerAllocationReceiver,
    distributionReceiver,
    deploymentOverrides
  );
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
    throw new Error("Post-deployment allocation invariant failed. Stop launch and investigate.");
  }

  console.log("VKT MAINNET CONTRACT:", address);
  console.log("Owner allocation:", hre.ethers.formatUnits(ownerBalance, 18), "VKT");
  console.log("Distribution reserve:", hre.ethers.formatUnits(reserveBalance, 18), "VKT");
  console.log("Total supply:", hre.ethers.formatUnits(supply, 18), "VKT");
  console.log("Verify source on BscScan before announcing the token.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
