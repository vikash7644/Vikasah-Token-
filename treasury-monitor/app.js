import {
  BNB_TESTNET_CHAIN_ID,
  assertSameBlock,
  snapshotToCsv,
  buildSnapshot,
  formatUnits,
  parseDecimals,
  validateConfig,
  validateSupply
} from "./core.mjs";

const $ = (id) => document.getElementById(id);
let latestSnapshot = null;

async function rpc(url, method, params) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params })
  });
  if (!response.ok) throw new Error("RPC request failed (HTTP " + response.status + ")");
  const payload = await response.json();
  if (payload.error) throw new Error(payload.error.message || "RPC returned an error");
  if (payload.result === undefined) throw new Error("RPC response did not contain a result");
  return payload.result;
}

function callData(selector, address) {
  return selector + address.toLowerCase().replace(/^0x/, "").padStart(64, "0");
}

async function load() {
  const button = $("load");
  const status = $("status");
  const rpcUrl = $("rpc").value.trim();
  const token = $("token").value.trim();
  const owner = $("owner").value.trim();
  const reserve = $("reserve").value.trim();

  validateConfig({ rpcUrl, token, owner, reserve });
  button.disabled = true;
  $("export").disabled = true;
  $("export-csv").disabled = true;
  latestSnapshot = null;
  status.textContent = "Checking BNB Testnet…";
  try {
    const chain = await rpc(rpcUrl, "eth_chainId", []);
    if (chain.toLowerCase() !== BNB_TESTNET_CHAIN_ID) {
      throw new Error("Wrong network. Expected BNB Smart Chain Testnet (chain ID 97).");
    }
    const block = await rpc(rpcUrl, "eth_getBlockByNumber", ["latest", false]);
    if (!block || !block.number || !block.hash) throw new Error("RPC did not return a complete block reference.");
    const blockTag = block.number;
    const blockNumberBig = BigInt(blockTag);
    if (blockNumberBig > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("Block number exceeds the safe display range.");
    const blockNumber = Number(blockNumberBig);
    const code = await rpc(rpcUrl, "eth_getCode", [token, blockTag]);
    if (code === "0x") throw new Error("No contract bytecode found at the token address.");

    status.textContent = "Reading token supply and wallet balances at block " + blockNumber + "…";
    const [supplyHex, decimalsHex, ownerHex, reserveHex] = await Promise.all([
      rpc(rpcUrl, "eth_call", [{ to: token, data: "0x18160ddd" }, blockTag]),
      rpc(rpcUrl, "eth_call", [{ to: token, data: "0x313ce567" }, blockTag]),
      rpc(rpcUrl, "eth_call", [{ to: token, data: callData("0x70a08231", owner) }, blockTag]),
      rpc(rpcUrl, "eth_call", [{ to: token, data: callData("0x70a08231", reserve) }, blockTag])
    ]);
    const finalBlock = await rpc(rpcUrl, "eth_getBlockByNumber", [blockTag, false]);
    assertSameBlock(block.hash, finalBlock?.hash);
    const decimals = parseDecimals(decimalsHex);
    const supply = BigInt(supplyHex);
    const ownerBalance = BigInt(ownerHex);
    const reserveBalance = BigInt(reserveHex);
    validateSupply({ supply, ownerBalance, reserveBalance, decimals });

    latestSnapshot = buildSnapshot({
      token, owner, reserve, blockNumber, blockHash: block.hash,
      blockTimestamp: new Date(Number(BigInt(block.timestamp)) * 1000).toISOString(),
      decimals, supply, ownerBalance, reserveBalance, timestamp: new Date().toISOString()
    });
    $("total").textContent = formatUnits(supply, decimals) + " VKT";
    $("total-sub").textContent = "On-chain total supply · " + decimals + " decimals";
    $("owner-balance").textContent = formatUnits(ownerBalance, decimals) + " VKT";
    $("reserve-balance").textContent = formatUnits(reserveBalance, decimals) + " VKT";
    $("block").textContent = "Block " + blockNumber.toLocaleString("en-US") + " · chain time " + latestSnapshot.blockTimestamp;
    $("export").disabled = false;
    $("export-csv").disabled = false;
    status.textContent = "Verified RPC response · BNB Testnet · updated " + new Date().toLocaleTimeString();
  } finally {
    button.disabled = false;
  }
}

$("load").addEventListener("click", async () => {
  try {
    await load();
  } catch (error) {
    latestSnapshot = null;
    $("export").disabled = true;
    $("export-csv").disabled = true;
    $("status").textContent = error instanceof Error ? error.message : "Unable to load on-chain data.";
  }
});

$("export").addEventListener("click", () => {
  if (!latestSnapshot) return;
  const blob = new Blob([JSON.stringify(latestSnapshot, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "vkt-treasury-snapshot-" + latestSnapshot.blockNumber + ".json";
  link.click();
  URL.revokeObjectURL(url);
});

$("export-csv").addEventListener("click", () => {
  if (!latestSnapshot) return;
  const blob = new Blob([snapshotToCsv(latestSnapshot)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "vkt-treasury-snapshot-" + latestSnapshot.blockNumber + ".csv";
  link.click();
  URL.revokeObjectURL(url);
});
