const hre = require("hardhat");

const EXPECTED_MAINNET_CHAIN_ID = 56n;
const REQUIRED_CONFIRMATION = "I_HAVE_VERIFIED_VKT_MAINNET_DEPLOYMENT";

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

  const network = await hre.ethers.provider.getNetwork();
  if (network.chainId !== EXPECTED_MAINNET_CHAIN_ID) {
    throw new Error(
      `Refusing deployment: expected BNB Smart Chain Mainnet (chain ID 56), received chain ID ${network.chainId}.`
    );
  }

  const [deployer] = await hre.ethers.getSigners();
  if (!deployer) throw new Error("No deployer configured. Use a secure local signer; never commit its key.");

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

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("NETWORK: BNB Smart Chain MAINNET (56)");
  console.log("Deployer:", deployer.address);
  console.log("Deployer BNB balance:", hre.ethers.formatEther(balance));
  console.log("Admin owner:", owner);
  console.log("30% allocation receiver:", ownerAllocationReceiver);
  console.log("70% reserve receiver:", distributionReceiver);
  console.log("Review the above values and expected gas before signing.");

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
