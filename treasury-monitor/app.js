import {
  BNB_TESTNET_CHAIN_ID,
  formatUnits,
  parseDecimals,
  validateConfig,
  validateSupply
} from "./core.mjs";

const $ = (id) => document.getElementById(id);

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
  status.textContent = "Checking BNB Testnet…";
  try {
    const chain = await rpc(rpcUrl, "eth_chainId", []);
    if (chain.toLowerCase() !== BNB_TESTNET_CHAIN_ID) {
      throw new Error("Wrong network. Expected BNB Smart Chain Testnet (chain ID 97).");
    }
    const code = await rpc(rpcUrl, "eth_getCode", [token, "latest"]);
    if (code === "0x") throw new Error("No contract bytecode found at the token address.");

    status.textContent = "Reading token supply and wallet balances…";
    const [supplyHex, decimalsHex, ownerHex, reserveHex] = await Promise.all([
      rpc(rpcUrl, "eth_call", [{ to: token, data: "0x18160ddd" }, "latest"]),
      rpc(rpcUrl, "eth_call", [{ to: token, data: "0x313ce567" }, "latest"]),
      rpc(rpcUrl, "eth_call", [{ to: token, data: callData("0x70a08231", owner) }, "latest"]),
      rpc(rpcUrl, "eth_call", [{ to: token, data: callData("0x70a08231", reserve) }, "latest"])
    ]);
    const decimals = parseDecimals(decimalsHex);
    const supply = BigInt(supplyHex);
    const ownerBalance = BigInt(ownerHex);
    const reserveBalance = BigInt(reserveHex);
    validateSupply({ supply, ownerBalance, reserveBalance, decimals });

    $("total").textContent = formatUnits(supply, decimals) + " VKT";
    $("total-sub").textContent = "On-chain total supply · " + decimals + " decimals";
    $("owner-balance").textContent = formatUnits(ownerBalance, decimals) + " VKT";
    $("reserve-balance").textContent = formatUnits(reserveBalance, decimals) + " VKT";
    status.textContent = "Verified RPC response · BNB Testnet · updated " + new Date().toLocaleTimeString();
  } finally {
    button.disabled = false;
  }
}

$("load").addEventListener("click", async () => {
  try {
    await load();
  } catch (error) {
    $("status").textContent = error instanceof Error ? error.message : "Unable to load on-chain data.";
  }
});
