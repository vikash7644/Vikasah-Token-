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

module.exports = {
  solidity: {
    // OpenZeppelin 5.x uses the MCOPY opcode in Bytes.sol; Solidity 0.8.25+
    // is required to compile that source. Cancun is supported by BSC.
    version: "0.8.26",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "cancun"
    }
  },
  networks
};
