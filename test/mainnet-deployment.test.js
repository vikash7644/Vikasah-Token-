const { expect } = require("chai");
const { ethers } = require("hardhat");
const { requireAddress, validateDeploymentWallets, createFeePlan, assertSufficientBalance } = require("../scripts/deploy-mainnet");

describe("VKT mainnet deployment preflight", function () {
  async function wallets() {
    const [deployer, admin, allocation, reserve] = await ethers.getSigners();
    return { deployerAddress: deployer.address, owner: admin.address, ownerAllocationReceiver: allocation.address, distributionReceiver: reserve.address };
  }

  it("accepts four distinct valid deployment wallets", async function () {
    const config = await wallets();
    const result = validateDeploymentWallets(config);
    expect(result.deployerAddress).to.equal(config.deployerAddress);
    expect(result.owner).to.equal(config.owner);
  });

  it("rejects invalid and zero addresses", async function () {
    const config = await wallets();
    expect(() => requireAddress("wallet", ethers.ZeroAddress)).to.throw("valid, non-zero");
    expect(() => validateDeploymentWallets({ ...config, owner: "not-an-address" })).to.throw("TOKEN_ADMIN_OWNER");
  });

  it("rejects duplicate allocation and reserve wallets", async function () {
    const config = await wallets();
    expect(() => validateDeploymentWallets({ ...config, distributionReceiver: config.ownerAllocationReceiver })).to.throw("must be different");
  });

  it("rejects an admin wallet reused as an allocation wallet", async function () {
    const config = await wallets();
    expect(() => validateDeploymentWallets({ ...config, ownerAllocationReceiver: config.owner })).to.throw("separately controlled admin");
  });

  it("rejects a deployer reused for any token role", async function () {
    const config = await wallets();
    expect(() => validateDeploymentWallets({ ...config, distributionReceiver: config.deployerAddress })).to.throw("dedicated deployer");
  });

  it("adds a rounded-up 20 percent gas buffer and uses EIP-1559 fee caps", async function () {
    const plan = createFeePlan(101n, { maxFeePerGas: 8n, maxPriorityFeePerGas: 2n, gasPrice: 7n });
    expect(plan.gasLimit).to.equal(122n);
    expect(plan.maximumFeePerGas).to.equal(8n);
    expect(plan.maximumEstimatedCost).to.equal(976n);
    expect(plan.deploymentOverrides.maxFeePerGas).to.equal(8n);
    expect(plan.deploymentOverrides.maxPriorityFeePerGas).to.equal(2n);
    expect(plan.deploymentOverrides).not.to.have.property("gasPrice");
  });

  it("falls back to legacy gas price when EIP-1559 fields are unavailable", async function () {
    const plan = createFeePlan(100n, { maxFeePerGas: null, maxPriorityFeePerGas: null, gasPrice: 5n });
    expect(plan.gasLimit).to.equal(120n);
    expect(plan.maximumEstimatedCost).to.equal(600n);
    expect(plan.deploymentOverrides.gasPrice).to.equal(5n);
  });

  it("rejects missing or inconsistent RPC fee data", async function () {
    expect(() => createFeePlan(100n, {})).to.throw("did not provide usable gas fee data");
    expect(() => createFeePlan(100n, { maxFeePerGas: 2n, maxPriorityFeePerGas: 3n })).to.throw("invalid EIP-1559 fee data");
    expect(() => createFeePlan(0n, { gasPrice: 1n })).to.throw("invalid gas estimate");
  });

  it("blocks deployment when the deployer balance is below the maximum estimate", async function () {
    expect(() => assertSufficientBalance(599n, 600n)).to.throw("no transaction was sent");
    expect(() => assertSufficientBalance(600n, 600n)).not.to.throw();
  });
});
