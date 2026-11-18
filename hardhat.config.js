require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const { subtask } = require("hardhat/config");
const { TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD } = require("hardhat/builtin-tasks/task-names");

// Use the exact npm-pinned solc build so CI does not depend on the Solidity
// binary-list endpoint being reachable.
subtask(TASK_COMPILE_SOLIDITY_GET_SOLC_BUILD).setAction(async ({ solcVersion }, _hre, runSuper) => {
  if (solcVersion === "0.8.26") {
    const solc = require("solc");
    return {
      compilerPath: require.resolve("solc/soljson.js"),
      isSolcJs: true,
      version: solcVersion,
      longVersion: solc.version()
    };
  }
  return runSuper();
});

const networks = {};
if (process.env.BSC_TESTNET_RPC_URL) {
  networks.bscTestnet = {
    url: process.env.BSC_TESTNET_RPC_URL,
    chainId: 97
  };
  if (process.env.DEPLOYER_PRIVATE_KEY) {
    networks.bscTestnet.accounts = [process.env.DEPLOYER_PRIVATE_KEY];
  }
}

module.exports = {
  solidity: {
    version: "0.8.26",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "cancun"
    }
  },
  networks
};
