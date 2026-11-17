require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const networks = {};
if (process.env.BSC_TESTNET_RPC_URL && process.env.DEPLOYER_PRIVATE_KEY) {
  networks.bscTestnet = {
    type: "http",
    chainType: "l1",
    url: process.env.BSC_TESTNET_RPC_URL,
    chainId: 97,
    accounts: [process.env.DEPLOYER_PRIVATE_KEY]
  };
}

module.exports = {
  solidity: {
    version: "0.8.24",
    settings: { optimizer: { enabled: true, runs: 200 } }
  },
  networks
};
