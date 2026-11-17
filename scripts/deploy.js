const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const owner = process.env.TOKEN_ADMIN_OWNER;
  const ownerAllocationReceiver = process.env.OWNER_ALLOCATION_RECEIVER;
  const distributionReceiver = process.env.DISTRIBUTION_RESERVE_RECEIVER;

  if (!owner || !ownerAllocationReceiver || !distributionReceiver) {
    throw new Error(
      "Set TOKEN_ADMIN_OWNER, OWNER_ALLOCATION_RECEIVER and DISTRIBUTION_RESERVE_RECEIVER."
    );
  }

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

  console.log("Vikasah Token deployed at:", address);
  console.log("Owner allocation:", hre.ethers.formatUnits(ownerBalance, 18), "VKT");
  console.log("Distribution reserve:", hre.ethers.formatUnits(reserveBalance, 18), "VKT");
  console.log("Total supply:", hre.ethers.formatUnits(supply, 18), "VKT");
  console.log("Network chain ID:", (await hre.ethers.provider.getNetwork()).chainId.toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
