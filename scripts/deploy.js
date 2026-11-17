const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const owner = process.env.TOKEN_OWNER_ADDRESS;
  const receiver = process.env.INITIAL_SUPPLY_RECEIVER;

  if (!owner || !receiver) {
    throw new Error("Set TOKEN_OWNER_ADDRESS and INITIAL_SUPPLY_RECEIVER in GitHub Actions secrets or local environment.");
  }

  console.log("Deploying from:", deployer.address);
  console.log("Administrative owner:", owner);
  console.log("Initial full-supply receiver:", receiver);

  const Token = await hre.ethers.getContractFactory("VikasahToken");
  const token = await Token.deploy(owner, receiver);
  await token.waitForDeployment();

  const address = await token.getAddress();
  const supply = await token.totalSupply();
  console.log("Vikasah Token deployed at:", address);
  console.log("Initial total supply:", hre.ethers.formatUnits(supply, 18), "VKT");
  console.log("Network chain ID:", (await hre.ethers.provider.getNetwork()).chainId.toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
