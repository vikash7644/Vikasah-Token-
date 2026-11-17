import { BrowserProvider, Contract, parseUnits } from "ethers";

export const BSC_TESTNET_CHAIN_ID = 97;
export const VKT_DECIMALS = 18;
const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)"
];

/** Connects to an injected EIP-1193 wallet. Never accepts or handles private keys. */
export async function connectVktWallet() {
  if (!globalThis.ethereum?.request) throw new Error("No compatible browser wallet was found.");
  const provider = new BrowserProvider(globalThis.ethereum);
  const accounts = await provider.send("eth_requestAccounts", []);
  if (!accounts?.[0]) throw new Error("Wallet connection was not approved.");
  const network = await provider.getNetwork();
  if (Number(network.chainId) !== BSC_TESTNET_CHAIN_ID) {
    throw new Error("Switch your wallet to BNB Smart Chain Testnet (chain ID 97).");
  }
  return { provider, signer: await provider.getSigner(), address: accounts[0] };
}

/** Sends an exact VKT transfer on BNB Smart Chain Testnet. */
export async function payVkt({ signer, tokenAddress, merchantAddress, amount }) {
  if (!signer) throw new Error("Connect a wallet first.");
  if (!/^0x[a-fA-F0-9]{40}$/.test(tokenAddress) || !/^0x[a-fA-F0-9]{40}$/.test(merchantAddress)) {
    throw new Error("A valid deployed token and merchant address are required.");
  }
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,18})?$/.test(String(amount)) || Number(amount) <= 0) {
    throw new Error("Amount must be a positive decimal with at most 18 places.");
  }
  const network = await signer.provider.getNetwork();
  if (Number(network.chainId) !== BSC_TESTNET_CHAIN_ID) throw new Error("Wrong network: BNB Smart Chain Testnet is required.");
  const token = new Contract(tokenAddress, ERC20_ABI, signer);
  const decimals = Number(await token.decimals());
  if (decimals !== VKT_DECIMALS) throw new Error("Unexpected VKT decimals; expected 18.");
  const tx = await token.transfer(merchantAddress, parseUnits(amountText, decimals));
  return { hash: tx.hash, wait: () => tx.wait(1) };
}

/** Requests server-side receipt verification; the server must independently validate the invoice. */
export async function verifyVktPayment({ apiBaseUrl, invoiceId, transactionHash }) {
  if (!apiBaseUrl || !invoiceId || !/^0x[a-fA-F0-9]{64}$/.test(transactionHash)) {
    throw new Error("apiBaseUrl, invoiceId and a valid transaction hash are required.");
  }
  const response = await fetch(new URL("/v1/payments/verify", apiBaseUrl), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ invoiceId, transactionHash })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Payment verification failed.");
  return data;
}


const PASSPORT_ABI = [
  "function positionOf(address account) view returns (uint256 amount, uint256 unlockAt)",
  "function hasActivePassport(address account) view returns (bool)"
];

/** Reads a wallet's 180-day VKT Utility Passport status; does not move tokens. */
export async function readVktUtilityPassport({ provider, passportAddress, account }) {
  if (!provider) throw new Error("A connected wallet provider is required.");
  if (!/^0x[a-fA-F0-9]{40}$/.test(passportAddress) || !/^0x[a-fA-F0-9]{40}$/.test(account)) {
    throw new Error("A valid deployed passport address and wallet address are required.");
  }
  const network = await provider.getNetwork();
  if (Number(network.chainId) !== BSC_TESTNET_CHAIN_ID) {
    throw new Error("Switch to BNB Smart Chain Testnet (chain ID 97).");
  }
  const passport = new Contract(passportAddress, PASSPORT_ABI, provider);
  const [position, active] = await Promise.all([
    passport.positionOf(account),
    passport.hasActivePassport(account)
  ]);
  return {
    amount: position.amount,
    unlockAt: Number(position.unlockAt),
    active
  };
}


const PASSPORT_WRITE_ABI = [
  "function lock(uint256 amount)",
  "function withdraw()"
];
const ERC20_APPROVAL_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)"
];

function requireContractAddress(label, value) {
  if (typeof value !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(value)) {
    throw new Error(`${label} must be a valid EVM address.`);
  }
  return value;
}

function requirePositiveTokenAmount(value) {
  const amountText = String(value);
  if (!/^(?:0|[1-9]\\d*)(?:\\.\\d{1,18})?$/.test(amountText) || !/[1-9]/.test(amountText)) {
    throw new Error("Amount must be a positive decimal with at most 18 places.");
  }
  return amountText;
}

async function requirePassportTestnet(signer) {
  if (!signer?.provider) throw new Error("Connect a wallet first.");
  const network = await signer.provider.getNetwork();
  if (Number(network.chainId) !== BSC_TESTNET_CHAIN_ID) {
    throw new Error("Switch to BNB Smart Chain Testnet (chain ID 97).");
  }
}

/** Approves only the chosen VKT amount for the 180-day Passport vault. */
export async function approveVktForPassport({ signer, tokenAddress, passportAddress, amount }) {
  await requirePassportTestnet(signer);
  requireContractAddress("VKT token address", tokenAddress);
  requireContractAddress("Passport address", passportAddress);
  const amountText = requirePositiveTokenAmount(amount);
  const token = new Contract(tokenAddress, ERC20_APPROVAL_ABI, signer);
  const decimals = Number(await token.decimals());
  if (decimals !== VKT_DECIMALS) throw new Error("Unexpected VKT decimals; expected 18.");
  const tx = await token.approve(passportAddress, parseUnits(amountText, decimals));
  return { hash: tx.hash, wait: () => tx.wait(1) };
}

/** Locks the chosen amount; the connected wallet must approve the vault first. */
export async function lockVktInPassport({ signer, passportAddress, amount }) {
  await requirePassportTestnet(signer);
  requireContractAddress("Passport address", passportAddress);
  const amountText = requirePositiveTokenAmount(amount);
  const passport = new Contract(passportAddress, PASSPORT_WRITE_ABI, signer);
  const tx = await passport.lock(parseUnits(amountText, VKT_DECIMALS));
  return { hash: tx.hash, wait: () => tx.wait(1) };
}

/** Requests withdrawal; the contract enforces the full 180-day lock period. */
export async function withdrawVktFromPassport({ signer, passportAddress }) {
  await requirePassportTestnet(signer);
  requireContractAddress("Passport address", passportAddress);
  const passport = new Contract(passportAddress, PASSPORT_WRITE_ABI, signer);
  const tx = await passport.withdraw();
  return { hash: tx.hash, wait: () => tx.wait(1) };
}
