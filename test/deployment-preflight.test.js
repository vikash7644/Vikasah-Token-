const assert = require("node:assert/strict");
const { ethers } = require("hardhat");
const {
  requireAddress,
  validateAllocationWallets,
  calculateRequiredBalance
} = require("../scripts/preflight-helpers");

const owner = "0x0000000000000000000000000000000000000001";
const allocation = "0x0000000000000000000000000000000000000002";
const reserve = "0x0000000000000000000000000000000000000003";

describe("VKT deployment preflight helpers", function () {
  it("normalizes valid addresses and rejects invalid or zero addresses", function () {
    assert.equal(requireAddress(ethers, "owner", owner), ethers.getAddress(owner));
    assert.throws(() => requireAddress(ethers, "owner", ""), /valid, non-zero/);
    assert.throws(() => requireAddress(ethers, "owner", "not-an-address"), /valid, non-zero/);
    assert.throws(() => requireAddress(ethers, "owner", ethers.ZeroAddress), /valid, non-zero/);
  });

  it("requires separate owner allocation and distribution reserve wallets", function () {
    const result = validateAllocationWallets(ethers, {
      owner,
      ownerAllocationReceiver: allocation,
      distributionReceiver: reserve
    });
    assert.equal(result.owner, ethers.getAddress(owner));
    assert.equal(result.ownerAllocationReceiver, ethers.getAddress(allocation));
    assert.equal(result.distributionReceiver, ethers.getAddress(reserve));
    assert.throws(() => validateAllocationWallets(ethers, {
      owner,
      ownerAllocationReceiver: allocation,
      distributionReceiver: allocation
    }), /different wallets/);
  });

  it("calculates the required deployment balance with a 20 percent buffer", function () {
    assert.equal(calculateRequiredBalance(100n, 2n), 240n);
    assert.equal(calculateRequiredBalance(101n, 2n), 243n);
    assert.throws(() => calculateRequiredBalance(0n, 2n), /must be positive/);
    assert.throws(() => calculateRequiredBalance(100n, 0n), /must be positive/);
    assert.throws(() => calculateRequiredBalance(100n, 2n, 99n), /at least 100%/);
  });
});
