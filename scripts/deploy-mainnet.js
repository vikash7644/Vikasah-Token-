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

function validateDeploymentWallets({ deployerAddress, owner, ownerAllocationReceiver, distributionReceiver }) {
  const deployer = requireAddress("Deployer", deployerAddress);
  const admin = requireAddress("TOKEN_ADMIN_OWNER", owner);
  const allocation = requireAddress("OWNER_ALLOCATION_RECEIVER", ownerAllocationReceiver);
  const reserve = requireAddress("DISTRIBUTION_RESERVE_RECEIVER", distributionReceiver);

  if (allocation === reserve) {
    throw new Error("Owner allocation and distribution reserve must be different wallets.");
  }
  if (admin === allocation || admin === reserve) {
    throw new Error("Use a separately controlled admin owner, preferably a multisig.");
  }
  if (deployer === admin || deployer === allocation || deployer === reserve) {
    throw new Error("Use a dedicated deployer wallet separate from all three token role wallets.");
  }

  return { deployerAddress: deployer, owner: admin, ownerAllocationReceiver: allocation, distributionReceiver: reserve };
}

function createFeePlan(estimatedGas, feeData) {
  if (typeof estimatedGas !== "bigint" || estimatedGas <= 0n) {
    throw new Error("RPC returned an invalid gas estimate; refusing to broadcast.");
  }

  const gasLimit = (estimatedGas * (100n + GAS_LIMIT_BUFFER_PERCENT) + 99n) / 100n;
  const deploymentOverrides = { gasLimit };
  let maximumFeePerGas;

  if (feeData?.maxFeePerGas != null && feeData?.maxPriorityFeePerGas != null) {
    if (feeData.maxFeePerGas <= 0n || feeData.maxPriorityFeePerGas < 0n ||
        feeData.maxPriorityFeePerGas > feeData.maxFeePerGas) {
      throw new Error("RPC returned invalid EIP-1559 fee data; refusing to broadcast.");
    }
    deploymentOverrides.maxFeePerGas = feeData.maxFeePerGas;
    deploymentOverrides.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
    maximumFeePerGas = feeData.maxFeePerGas;
  } else if (feeData?.gasPrice != null && feeData.gasPrice > 0n) {
    deploymentOverrides.gasPrice = feeData.gasPrice;
    maximumFeePerGas = feeData.gasPrice;
  } else {
    throw new Error("RPC did not provide usable gas fee data; refusing to broadcast.");
  }

  return {
    gasLimit,
    deploymentOverrides,
    maximumFeePerGas,
    maximumEstimatedCost: gasLimit * maximumFeePerGas
  };
}

function assertSufficientBalance(balance, maximumEstimatedCost) {
  if (typeof balance !== "bigint" || balance < maximumEstimatedCost) {
    throw new Error(
      `Insufficient deployer BNB balance. Need at least ${hre.ethers.formatEther(maximumEstimatedCost)} BNB at the quoted fee cap; no transaction was sent.`
    );
  }
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

  const wallets = validateDeploymentWallets({
    deployerAddress: deployer.address,
    owner: process.env.TOKEN_ADMIN_OWNER,
    ownerAllocationReceiver: process.env.OWNER_ALLOCATION_RECEIVER,
    distributionReceiver: process.env.DISTRIBUTION_RESERVE_RECEIVER
  });
  const { deployerAddress, owner, ownerAllocationReceiver, distributionReceiver } = wallets;

  const Token = await hre.ethers.getContractFactory("VikasahToken");
  const deploymentRequest = await Token.getDeployTransaction(owner, ownerAllocationReceiver, distributionReceiver);
  const estimatedGas = await provider.estimateGas({ ...deploymentRequest, from: deployerAddress });
  const feePlan = createFeePlan(estimatedGas, await provider.getFeeData());
  const balance = await provider.getBalance(deployerAddress);

  console.log("NETWORK: BNB Smart Chain MAINNET (56)");
  console.log("Deployer:", deployerAddress);
  console.log("Deployer BNB balance:", hre.ethers.formatEther(balance));
  console.log("Admin owner:", owner);
  console.log("30% allocation receiver:", ownerAllocationReceiver);
  console.log("70% reserve receiver:", distributionReceiver);
  console.log("Estimated gas:", estimatedGas.toString());
  console.log("Gas limit with 20% buffer:", feePlan.gasLimit.toString());
  console.log("Maximum estimated deployment fee (BNB):", hre.ethers.formatEther(feePlan.maximumEstimatedCost));

  assertSufficientBalance(balance, feePlan.maximumEstimatedCost);

  console.log("Preflight passed. Review the addresses and fee cap before signing.");
  const token = await Token.deploy(owner, ownerAllocationReceiver, distributionReceiver, feePlan.deploymentOverrides);
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
  if (ownerBalance !== expectedOwner || reserveBalance !== expectedReserve || supply !== expectedSupply) {
    throw new Error("Post-deployment allocation invariant failed. Stop launch and investigate.");
  }

  console.log("VKT MAINNET CONTRACT:", address);
  console.log("Owner allocation:", hre.ethers.formatUnits(ownerBalance, 18), "VKT");
  console.log("Distribution reserve:", hre.ethers.formatUnits(reserveBalance, 18), "VKT");
  console.log("Total supply:", hre.ethers.formatUnits(supply, 18), "VKT");
  console.log("Verify source on BscScan before announcing the token.");
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = { requireAddress, validateDeploymentWallets, createFeePlan, assertSufficientBalance };
