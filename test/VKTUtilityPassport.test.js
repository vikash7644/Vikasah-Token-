const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("VKTUtilityPassport", function () {
  async function deployFixture() {
    const [owner, ownerAllocation, reserve, alice, bob] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("VikasahToken");
    const token = await Token.deploy(owner.address, ownerAllocation.address, reserve.address);
    await token.waitForDeployment();

    const Passport = await ethers.getContractFactory("VKTUtilityPassport");
    const passport = await Passport.deploy(await token.getAddress());
    await passport.waitForDeployment();

    const amount = ethers.parseEther("250");
    await token.connect(reserve).transfer(alice.address, amount * 2n);
    await token.connect(alice).approve(await passport.getAddress(), amount * 2n);
    return { token, passport, owner, reserve, alice, bob, amount };
  }

  it("locks the user's chosen amount for exactly 180 days", async function () {
    const { token, passport, alice, amount } = await deployFixture();
    const tx = await passport.connect(alice).lock(amount);
    const receipt = await tx.wait();
    const lockBlock = await ethers.provider.getBlock(receipt.blockNumber);
    const expectedUnlockAt = lockBlock.timestamp + 180 * 24 * 60 * 60;
    await expect(tx)
      .to.emit(passport, "Locked")
      .withArgs(alice.address, amount, expectedUnlockAt);

    const [lockedAmount, unlockAt] = await passport.positionOf(alice.address);
    expect(lockedAmount).to.equal(amount);
    expect(unlockAt).to.equal(expectedUnlockAt);
    expect(await passport.isLocked(alice.address)).to.equal(true);
    expect(await passport.hasActivePassport(alice.address)).to.equal(true);
    expect(await token.balanceOf(await passport.getAddress())).to.equal(amount);
  });

  it("does not allow early withdrawal and returns the exact amount after 180 days", async function () {
    const { token, passport, alice, amount } = await deployFixture();
    const balanceBefore = await token.balanceOf(alice.address);
    await passport.connect(alice).lock(amount);

    await expect(passport.connect(alice).withdraw()).to.be.revertedWithCustomError(passport, "StillLocked");
    await time.increase(180 * 24 * 60 * 60);
    expect(await passport.isLocked(alice.address)).to.equal(false);
    expect(await passport.hasActivePassport(alice.address)).to.equal(false);

    await expect(passport.connect(alice).withdraw())
      .to.emit(passport, "Withdrawn")
      .withArgs(alice.address, amount);
    expect(await token.balanceOf(alice.address)).to.equal(balanceBefore);
    const [remainingAmount, remainingUnlockAt] = await passport.positionOf(alice.address);
    expect(remainingAmount).to.equal(0n);
    expect(remainingUnlockAt).to.equal(0n);
  });

  it("prevents a second lock while a position is active", async function () {
    const { passport, alice, amount } = await deployFixture();
    await passport.connect(alice).lock(amount);
    await expect(passport.connect(alice).lock(1n))
      .to.be.revertedWithCustomError(passport, "PositionAlreadyActive");
  });

  it("allows a new 180-day position after the previous one is withdrawn", async function () {
    const { passport, alice, amount } = await deployFixture();
    await passport.connect(alice).lock(amount);
    await time.increase(180 * 24 * 60 * 60);
    await passport.connect(alice).withdraw();
    await expect(passport.connect(alice).lock(amount)).to.not.be.reverted;
  });

  it("rejects zero amounts and accounts without an active position", async function () {
    const { passport, alice, bob } = await deployFixture();
    await expect(passport.connect(alice).lock(0n)).to.be.revertedWithCustomError(passport, "ZeroAmount");
    await expect(passport.connect(bob).withdraw()).to.be.revertedWithCustomError(passport, "NoActivePosition");
  });

  it("keeps each wallet's position private to that wallet's withdrawal rights", async function () {
    const { token, passport, alice, bob, amount } = await deployFixture();
    await passport.connect(alice).lock(amount);
    await time.increase(180 * 24 * 60 * 60);

    const bobBefore = await token.balanceOf(bob.address);
    await expect(passport.connect(bob).withdraw()).to.be.revertedWithCustomError(passport, "NoActivePosition");
    expect(await token.balanceOf(bob.address)).to.equal(bobBefore);
    await passport.connect(alice).withdraw();
  });

  it("has no owner, admin, confiscation, or early-unlock entry points", async function () {
    const { passport } = await deployFixture();
    for (const signature of [
      "owner()", "transferOwnership(address)", "pause()", "rescueTokens(address,address,uint256)",
      "emergencyWithdraw(address)", "unlockEarly()"
    ]) {
      expect(passport.interface.hasFunction(signature)).to.equal(false);
    }
  });

  it("documents the underlying VKT pause dependency on withdrawals", async function () {
    const { token, passport, owner, alice, amount } = await deployFixture();
    await passport.connect(alice).lock(amount);
    await time.increase(180 * 24 * 60 * 60);
    await token.connect(owner).pause();
    await expect(passport.connect(alice).withdraw()).to.be.reverted;
    await token.connect(owner).unpause();
    await expect(passport.connect(alice).withdraw()).to.not.be.reverted;
  });


  it("does not create a position when the token transfer fails", async function () {
    const { token, passport, owner, alice, amount } = await deployFixture();
    await token.connect(owner).pause();

    await expect(passport.connect(alice).lock(amount)).to.be.reverted;
    const [lockedAmount, unlockAt] = await passport.positionOf(alice.address);
    expect(lockedAmount).to.equal(0n);
    expect(unlockAt).to.equal(0n);
    expect(await token.balanceOf(await passport.getAddress())).to.equal(0n);
  });

  it("requires the user to approve enough VKT before locking", async function () {
    const { token, passport, alice, amount } = await deployFixture();
    await token.connect(alice).approve(await passport.getAddress(), amount - 1n);

    await expect(passport.connect(alice).lock(amount)).to.be.reverted;
    const [lockedAmount] = await passport.positionOf(alice.address);
    expect(lockedAmount).to.equal(0n);
    expect(await token.balanceOf(await passport.getAddress())).to.equal(0n);
  });

  it("allows withdrawal at the exact unlock timestamp", async function () {
    const { passport, alice, amount } = await deployFixture();
    const tx = await passport.connect(alice).lock(amount);
    const receipt = await tx.wait();
    const block = await ethers.provider.getBlock(receipt.blockNumber);
    const unlockAt = block.timestamp + 180 * 24 * 60 * 60;

    await time.setNextBlockTimestamp(unlockAt);
    await expect(passport.connect(alice).withdraw()).to.not.be.reverted;
    const [remainingAmount, remainingUnlockAt] = await passport.positionOf(alice.address);
    expect(remainingAmount).to.equal(0n);
    expect(remainingUnlockAt).to.equal(0n);
  });

  it("rejects a zero token address and non-contract token address", async function () {
    const Passport = await ethers.getContractFactory("VKTUtilityPassport");
    const [owner] = await ethers.getSigners();
    await expect(Passport.deploy(ethers.ZeroAddress)).to.be.revertedWithCustomError(Passport, "ZeroTokenAddress");
    await expect(Passport.deploy(owner.address)).to.be.revertedWithCustomError(Passport, "InvalidTokenContract");
  });
});
