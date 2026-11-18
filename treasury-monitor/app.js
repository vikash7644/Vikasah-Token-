const $ = (id) => document.getElementById(id);
const CHAIN_ID = "0x61";
const MAX_SUPPLY = 1_000_000_000n;
const MAX_UINT256 = (1n << 256n) - 1n;
const addressPattern = /^0x[a-fA-F0-9]{40}$/;
const format = (raw, decimals = 18) => {
  const unit = 10n ** BigInt(decimals);
  const whole = raw / unit;
  const fraction = (raw % unit).toString().padStart(decimals, "0").slice(0, 4).replace(/0+$/, "");
  return whole.toLocaleString("en-US") + (fraction ? "." + fraction : "");
};
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
  if (!/^https:\/\//i.test(rpcUrl)) throw new Error("Use an HTTPS RPC endpoint.");
  if (![token, owner, reserve].every((value) => addressPattern.test(value))) {
    throw new Error("Enter valid token, owner allocation and reserve addresses.");
  }
  if (owner.toLowerCase() === reserve.toLowerCase()) throw new Error("Owner and reserve wallets must be different.");
  button.disabled = true;
  status.textContent = "Checking BNB Testnet…";
  try {
    const chain = await rpc(rpcUrl, "eth_chainId", []);
    if (chain.toLowerCase() !== CHAIN_ID) throw new Error("Wrong network. Expected BNB Smart Chain Testnet (chain ID 97).");
    const code = await rpc(rpcUrl, "eth_getCode", [token, "latest"]);
    if (code === "0x") throw new Error("No contract bytecode found at the token address.");
    status.textContent = "Reading token supply and wallet balances…";
    const [supplyHex, decimalsHex, ownerHex, reserveHex] = await Promise.all([
      rpc(rpcUrl, "eth_call", [{to: token, data: "0x18160ddd"}, "latest"]),
      rpc(rpcUrl, "eth_call", [{to: token, data: "0x313ce567"}, "latest"]),
      rpc(rpcUrl, "eth_call", [{to: token, data: callData("0x70a08231", owner)}, "latest"]),
      rpc(rpcUrl, "eth_call", [{to: token, data: callData("0x70a08231", reserve)}, "latest"])
    ]);
    const supply = BigInt(supplyHex);
    const decimals = Number(BigInt(decimalsHex));
    if (!Number.isInteger(decimals) || decimals < 0 || decimals > 36) throw new Error("Token returned an unsupported decimals value.");
    const ownerBalance = BigInt(ownerHex);
    const reserveBalance = BigInt(reserveHex);
    if (supply > MAX_SUPPLY * (10n ** BigInt(decimals)) || ownerBalance + reserveBalance > supply) {
      throw new Error("On-chain values violate the configured supply sanity checks.");
    }
    $("total").textContent = format(supply, decimals) + " VKT";
    $("total-sub").textContent = "On-chain total supply · " + decimals + " decimals";
    $("owner-balance").textContent = format(ownerBalance, decimals) + " VKT";
    $("reserve-balance").textContent = format(reserveBalance, decimals) + " VKT";
    status.textContent = "Verified RPC response · BNB Testnet · updated " + new Date().toLocaleTimeString();
  } finally {
    button.disabled = false;
  }
}
$("load").addEventListener("click", async () => {
  try { await load(); }
  catch (error) { $("status").textContent = error instanceof Error ? error.message : "Unable to load on-chain data."; }
});
