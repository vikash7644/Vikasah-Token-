import "dotenv/config";
import express from "express";
import Database from "better-sqlite3";
import { Interface, JsonRpcProvider, getAddress, isAddress, parseUnits } from "ethers";

const required = ["BSC_TESTNET_RPC_URL", "VKT_TOKEN_ADDRESS", "VKT_MERCHANT_ADDRESS", "MERCHANT_API_KEY"];
for (const key of required) if (!process.env[key]) throw new Error(`Missing environment variable: ${key}`);
if (!isAddress(process.env.VKT_TOKEN_ADDRESS) || !isAddress(process.env.VKT_MERCHANT_ADDRESS)) {
  throw new Error("VKT_TOKEN_ADDRESS and VKT_MERCHANT_ADDRESS must be valid addresses.");
}
const tokenAddress = getAddress(process.env.VKT_TOKEN_ADDRESS);
const merchantAddress = getAddress(process.env.VKT_MERCHANT_ADDRESS);
const minConfirmations = Number(process.env.MIN_CONFIRMATIONS || 3);
if (!Number.isSafeInteger(minConfirmations) || minConfirmations < 1) throw new Error("MIN_CONFIRMATIONS must be a positive integer.");
const provider = new JsonRpcProvider(process.env.BSC_TESTNET_RPC_URL, 97);
const db = new Database(process.env.DATABASE_PATH || "./vkt-payments.sqlite");
db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    amount_wei TEXT NOT NULL,
    payer_address TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    transaction_hash TEXT UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);
const insertInvoice = db.prepare("INSERT INTO invoices (id, amount_wei, payer_address) VALUES (?, ?, ?)");
const getInvoice = db.prepare("SELECT * FROM invoices WHERE id = ?");
const getByHash = db.prepare("SELECT * FROM invoices WHERE transaction_hash = ?");
const markPaid = db.prepare("UPDATE invoices SET status='paid', transaction_hash=? WHERE id=? AND status='pending'");
const settleInvoice = db.transaction((transactionHash, invoiceId) => {
  const invoice = getInvoice.get(invoiceId);
  if (!invoice) return { outcome: "missing" };
  if (invoice.status === "paid") {
    return invoice.transaction_hash === transactionHash
      ? { outcome: "already_paid", invoice }
      : { outcome: "invoice_paid", invoice };
  }
  const existing = getByHash.get(transactionHash);
  if (existing) return { outcome: "hash_used", invoice: existing };
  const changed = markPaid.run(transactionHash, invoiceId);
  if (changed.changes !== 1) return { outcome: "conflict" };
  return { outcome: "paid" };
});
const iface = new Interface(["event Transfer(address indexed from, address indexed to, uint256 value)"]);
const app = express();
app.use(express.json({ limit: "16kb" }));

app.get("/health", (_req, res) => res.json({ ok: true, network: "bsc-testnet", chainId: 97 }));

app.post("/v1/invoices", (req, res) => {
  if (req.get("authorization") !== `Bearer ${process.env.MERCHANT_API_KEY}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const { invoiceId, amount, payerAddress } = req.body || {};
  if (typeof invoiceId !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(invoiceId)) {
    return res.status(400).json({ error: "invoiceId must be 1-80 letters, numbers, _ or -." });
  }
  if (!isAddress(payerAddress)) return res.status(400).json({ error: "A valid expected payerAddress is required." });
  if (typeof amount !== "string" || !/^(?:0|[1-9]\d*)(?:\.\d{1,18})?$/.test(amount)) {
    return res.status(400).json({ error: "amount must be a positive decimal with at most 18 places." });
  }
  try {
    const amountWei = parseUnits(amount, 18);
    if (amountWei <= 0n) return res.status(400).json({ error: "amount must be greater than zero." });
    insertInvoice.run(invoiceId, amountWei.toString(), getAddress(payerAddress));
    return res.status(201).json({ invoiceId, amount, currency: "VKT", status: "pending" });
  } catch {
    return res.status(409).json({ error: "Invoice ID already exists." });
  }
});

app.post("/v1/payments/verify", async (req, res) => {
  const { invoiceId, transactionHash } = req.body || {};
  if (typeof invoiceId !== "string" || typeof transactionHash !== "string" || !/^0x[a-fA-F0-9]{64}$/.test(transactionHash)) {
    return res.status(400).json({ error: "A valid invoiceId and transactionHash are required." });
  }
  const invoice = getInvoice.get(invoiceId);
  if (!invoice) return res.status(404).json({ error: "Invoice not found." });
  try {
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== 97) throw new Error("RPC endpoint is not BNB Smart Chain Testnet.");
    const code = await provider.getCode(tokenAddress);
    if (code === "0x") return res.status(503).json({ error: "Configured VKT contract has no code on testnet." });
    const receipt = await provider.getTransactionReceipt(transactionHash);
    if (!receipt) return res.status(202).json({ status: "pending", message: "Transaction is not mined yet." });
    if (receipt.status !== 1) return res.status(422).json({ error: "Transaction failed on-chain." });
    const head = await provider.getBlockNumber();
    if (head - receipt.blockNumber + 1 < minConfirmations) {
      return res.status(202).json({ status: "confirming", confirmations: head - receipt.blockNumber + 1, required: minConfirmations });
    }

    let matched = false;
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== tokenAddress.toLowerCase()) continue;
      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name === "Transfer" &&
            getAddress(parsed.args.from) === invoice.payer_address &&
            getAddress(parsed.args.to) === merchantAddress &&
            parsed.args.value.toString() === invoice.amount_wei) {
          matched = true;
          break;
        }
      } catch { /* Ignore unrelated or malformed logs. */ }
    }
    if (!matched) return res.status(422).json({ error: "No matching VKT Transfer from the expected payer to the configured merchant for this invoice amount." });
    const settlement = settleInvoice(transactionHash.toLowerCase(), invoiceId);
    if (settlement.outcome === "already_paid") {
      return res.json({ invoiceId, status: "paid", transactionHash: settlement.invoice.transaction_hash });
    }
    if (settlement.outcome === "invoice_paid") {
      return res.status(409).json({ error: "This invoice was already paid with a different transaction." });
    }
    if (settlement.outcome === "hash_used") {
      return res.status(409).json({ error: "Transaction hash has already been assigned to an invoice." });
    }
    if (settlement.outcome !== "paid") {
      return res.status(409).json({ error: "Invoice was already processed; reload its status." });
    }
    return res.json({ invoiceId, status: "paid", transactionHash, confirmations: head - receipt.blockNumber + 1 });
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({ error: "Transaction hash has already been assigned to an invoice." });
    }
    return res.status(502).json({ error: "Could not verify the transaction.", detail: error.message });
  }
});

app.listen(Number(process.env.PORT || 8787), () => {
  console.log(`VKT testnet verifier listening on port ${process.env.PORT || 8787}`);
});
