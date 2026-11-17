const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VikasahToken", function () {
  async function deployToken() {
    const [owner, ownerAllocation, reserve, alice, outsider] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("VikasahToken");
    const token = await Token.deploy(owner.address, ownerAllocation.address, reserve.address);
    await token.waitForDeployment();
    return { token, owner, ownerAllocation, reserve, alice, outsider };
  }

  it("sets token metadata and mints the exact capped allocation", async function () {
    const { token, ownerAllocation, reserve } = await deployToken();
    expect(await token.name()).to.equal("Vikasah Token");
    expect(await token.symbol()).to.equal("VKT");
    expect(await token.decimals()).to.equal(18);
    expect(await token.totalSupply()).to.equal(ethers.parseEther("1000000000"));
    expect(await token.MAX_SUPPLY()).to.equal(ethers.parseEther("1000000000"));
    expect(await token.OWNER_ALLOCATION()).to.equal(ethers.parseEther("300000000"));
    expect(await token.DISTRIBUTION_RESERVE()).to.equal(ethers.parseEther("700000000"));
    expect(await token.balanceOf(ownerAllocation.address)).to.equal(ethers.parseEther("300000000"));
    expect(await token.balanceOf(reserve.address)).to.equal(ethers.parseEther("700000000"));
  });

  it("allows transfers and burns", async function () {
    const { token, reserve, alice } = await deployToken();
    await token.connect(reserve).transfer(alice.address, ethers.parseEther("25"));
    expect(await token.balanceOf(alice.address)).to.equal(ethers.parseEther("25"));
    await token.connect(alice).burn(ethers.parseEther("5"));
    expect(await token.totalSupply()).to.equal(ethers.parseEther("999999995"));
  });

  it("allows only the owner to pause and unpause transfers", async function () {
    const { token, owner, reserve, alice, outsider } = await deployToken();
    await expect(token.connect(outsider).pause()).to.be.reverted;
    await token.connect(owner).pause();
    await expect(token.connect(reserve).transfer(alice.address, 1n)).to.be.reverted;
    await token.connect(owner).unpause();
    await expect(token.connect(reserve).transfer(alice.address, 1n)).to.not.be.reverted;
  });

  it("does not expose an owner mint function", async function () {
    const { token } = await deployToken();
    expect(token.interface.hasFunction("mint(address,uint256)")).to.equal(false);
  });

  it("uses two-step ownership transfer", async function () {
    const { token, owner, alice } = await deployToken();
    await token.connect(owner).transferOwnership(alice.address);
    expect(await token.owner()).to.equal(owner.address);
    await token.connect(alice).acceptOwnership();
    expect(await token.owner()).to.equal(alice.address);
  });

  it("rejects zero addresses and duplicate allocation wallets", async function () {
    const Token = await ethers.getContractFactory("VikasahToken");
    const [owner, wallet] = await ethers.getSigners();
    await expect(Token.deploy(ethers.ZeroAddress, wallet.address, owner.address)).to.be.reverted;
    await expect(Token.deploy(owner.address, ethers.ZeroAddress, wallet.address)).to.be.reverted;
    await expect(Token.deploy(owner.address, wallet.address, ethers.ZeroAddress)).to.be.reverted;
    await expect(Token.deploy(owner.address, wallet.address, wallet.address)).to.be.reverted;
  });
});
