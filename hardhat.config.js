require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const networks = {};
if (process.env.BSC_TESTNET_RPC_URL && process.env.DEPLOYER_PRIVATE_KEY) {
  networks.bscTestnet = {
    url: process.env.BSC_TESTNET_RPC_URL,
    chainId: 97,
    accounts: [process.env.DEPLOYER_PRIVATE_KEY]
  };
}
if (process.env.BSC_MAINNET_RPC_URL && process.env.DEPLOYER_PRIVATE_KEY) {
  networks.bscMainnet = {
    url: process.env.BSC_MAINNET_RPC_URL,
    chainId: 56,
    accounts: [process.env.DEPLOYER_PRIVATE_KEY]
  };
}

module.exports = {
  solidity: {
    // OpenZeppelin 5.x uses MCOPY; Solidity 0.8.26 and Cancun are required.
    version: "0.8.26",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "cancun"
    }
  },
  networks
};
