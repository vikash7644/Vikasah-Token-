import "dotenv/config";
import { timingSafeEqual } from "node:crypto";
import express from "express";
import Database from "better-sqlite3";
import { Interface, JsonRpcProvider, getAddress, isAddress, parseUnits } from "ethers";

const required = ["BSC_TESTNET_RPC_URL", "VKT_TOKEN_ADDRESS", "VKT_MERCHANT_ADDRESS", "MERCHANT_API_KEY"];
for (const key of required) if (!process.env[key]) throw new Error(`Missing environment variable: ${key}`);
if (Buffer.byteLength(process.env.MERCHANT_API_KEY, "utf8") < 32) {
  throw new Error("MERCHANT_API_KEY must contain at least 32 bytes of random secret material.");
}
const merchantApiKey = Buffer.from(process.env.MERCHANT_API_KEY, "utf8");
function hasValidMerchantApiKey(header) {
  if (typeof header !== "string") return false;
  const supplied = Buffer.from(header, "utf8");
  return supplied.length === merchantApiKey.length && timingSafeEqual(supplied, merchantApiKey);
}
if (!isAddress(process.env.VKT_TOKEN_ADDRESS) || !isAddress(process.env.VKT_MERCHANT_ADDRESS)) {
  throw new Error("VKT_TOKEN_ADDRESS and VKT_MERCHANT_ADDRESS must be valid addresses.");
}
const tokenAddress = getAddress(process.env.VKT_TOKEN_ADDRESS);
const merchantAddress = getAddress(process.env.VKT_MERCHANT_ADDRESS);
const zeroAddress = "0x0000000000000000000000000000000000000000";
if (tokenAddress === zeroAddress || merchantAddress === zeroAddress || tokenAddress === merchantAddress) {
  throw new Error("VKT token and merchant addresses must be non-zero and distinct.");
}
const maxSupplyWei = parseUnits("1000000000", 18);
const minConfirmations = Number(process.env.MIN_CONFIRMATIONS || 3);
if (!Number.isSafeInteger(minConfirmations) || minConfirmations < 1) throw new Error("MIN_CONFIRMATIONS must be a positive integer.");
const verifyRateLimit = Number(process.env.VERIFY_RATE_LIMIT_PER_MINUTE || 120);
if (!Number.isSafeInteger(verifyRateLimit) || verifyRateLimit < 1) {
  throw new Error("VERIFY_RATE_LIMIT_PER_MINUTE must be a positive integer.");
}
const provider = new JsonRpcProvider(process.env.BSC_TESTNET_RPC_URL, 97);
const db = new Database(process.env.DATABASE_PATH || "./vkt-payments.sqlite");
db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS api_rate_limits (
    id TEXT PRIMARY KEY CHECK (id = 'verify'),
    window_started_at INTEGER NOT NULL,
    request_count INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    amount_wei TEXT NOT NULL,
    payer_address TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    transaction_hash TEXT UNIQUE,
    block_number INTEGER,
    block_hash TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);
const invoiceColumns = new Set(db.prepare("PRAGMA table_info(invoices)").all().map(column => column.name));
if (!invoiceColumns.has("block_number")) db.exec("ALTER TABLE invoices ADD COLUMN block_number INTEGER");
if (!invoiceColumns.has("block_hash")) db.exec("ALTER TABLE invoices ADD COLUMN block_hash TEXT");
const insertInvoice = db.prepare("INSERT INTO invoices (id, amount_wei, payer_address) VALUES (?, ?, ?)");
const getInvoice = db.prepare("SELECT * FROM invoices WHERE id = ?");
const getByHash = db.prepare("SELECT * FROM invoices WHERE transaction_hash = ?");
const markPaid = db.prepare("UPDATE invoices SET status='paid', transaction_hash=?, block_number=?, block_hash=? WHERE id=? AND status='pending'");
const resetReorgedPayment = db.prepare("UPDATE invoices SET status='pending', transaction_hash=NULL, block_number=NULL, block_hash=NULL WHERE id=? AND status='paid' AND transaction_hash=?");
const reconcileReorg = db.transaction((invoiceId, transactionHash) => resetReorgedPayment.run(invoiceId, transactionHash));
const settleInvoice = db.transaction((transactionHash, invoiceId, blockNumber, blockHash) => {
  const invoice = getInvoice.get(invoiceId);
  if (!invoice) return { outcome: "missing" };
  if (invoice.status === "paid") {
    return invoice.transaction_hash === transactionHash
      ? { outcome: "already_paid", invoice }
      : { outcome: "invoice_paid", invoice };
  }
  const existing = getByHash.get(transactionHash);
  if (existing) return { outcome: "hash_used", invoice: existing };
  const changed = markPaid.run(transactionHash, blockNumber, blockHash, invoiceId);
  if (changed.changes !== 1) return { outcome: "conflict" };
  return { outcome: "paid" };
});
const consumeVerifyRateLimit = db.prepare(`
  INSERT INTO api_rate_limits (id, window_started_at, request_count)
  VALUES ('verify', ?, 1)
  ON CONFLICT(id) DO UPDATE SET
    request_count = CASE
      WHEN api_rate_limits.window_started_at <= ? THEN 1
      ELSE api_rate_limits.request_count + 1
    END,
    window_started_at = CASE
      WHEN api_rate_limits.window_started_at <= ? THEN excluded.window_started_at
      ELSE api_rate_limits.window_started_at
    END
  RETURNING request_count, window_started_at
`);
const iface = new Interface(["event Transfer(address indexed from, address indexed to, uint256 value)"]);
const corsAllowedOrigins = new Set(
  (process.env.CORS_ALLOWED_ORIGINS || "")
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean)
);
for (const origin of corsAllowedOrigins) {
  let parsed;
  try { parsed = new URL(origin); } catch {
    throw new Error("CORS_ALLOWED_ORIGINS must contain valid origins.");
  }
  const localHttp = parsed.protocol === "http:" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
  if ((!localHttp && parsed.protocol !== "https:") || parsed.origin !== origin) {
    throw new Error("CORS origins must be HTTPS origins (HTTP is allowed only for localhost).");
  }
}
const app = express();
app.use((req, res, next) => {
  const origin = req.get("origin");
  if (!origin) return next();
  if (!corsAllowedOrigins.has(origin)) {
    return res.status(403).json({ error: "Origin is not allowed." });
  }
  res.set("Access-Control-Allow-Origin", origin);
  res.set("Vary", "Origin");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(204).end();
  return next();
});
app.use(express.json({ limit: "16kb" }));

app.get("/health", (_req, res) => res.json({ ok: true, network: "bsc-testnet", chainId: 97 }));

app.post("/v1/invoices", (req, res) => {
  const authorization = req.get("authorization");
  const bearerMatch = typeof authorization === "string" ? authorization.match(/^Bearer (\S+)$/i) : null;
  const suppliedKey = bearerMatch?.[1];
  if (!hasValidMerchantApiKey(suppliedKey)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const { invoiceId, amount, payerAddress } = req.body || {};
  if (typeof invoiceId !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(invoiceId)) {
    return res.status(400).json({ error: "invoiceId must be 1-80 letters, numbers, _ or -." });
  }
  if (!isAddress(payerAddress) || getAddress(payerAddress) === zeroAddress) {
    return res.status(400).json({ error: "A valid non-zero expected payerAddress is required." });
  }
  if (typeof amount !== "string" || !/^(?:0|[1-9]\d*)(?:\.\d{1,18})?$/.test(amount)) {
    return res.status(400).json({ error: "amount must be a positive decimal with at most 18 places." });
  }
  try {
    const amountWei = parseUnits(amount, 18);
    if (amountWei <= 0n) return res.status(400).json({ error: "amount must be greater than zero." });
    if (amountWei > maxSupplyWei) return res.status(400).json({ error: "amount cannot exceed the fixed VKT maximum supply of 1000000000." });
    insertInvoice.run(invoiceId, amountWei.toString(), getAddress(payerAddress));
    return res.status(201).json({ invoiceId, amount, currency: "VKT", status: "pending" });
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_PRIMARYKEY" || error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({ error: "Invoice ID already exists." });
    }
    return res.status(500).json({ error: "Could not create the invoice." });
  }
});

app.post("/v1/payments/verify", async (req, res) => {
  const { invoiceId, transactionHash } = req.body || {};
  if (typeof invoiceId !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/.test(invoiceId) ||
      typeof transactionHash !== "string" || !/^0x[a-fA-F0-9]{64}$/.test(transactionHash)) {
    return res.status(400).json({ error: "A valid invoiceId and transactionHash are required." });
  }
  let invoice = getInvoice.get(invoiceId);
  if (!invoice) return res.status(404).json({ error: "Invoice not found." });
  const now = Date.now();
  const rate = consumeVerifyRateLimit.get(now, now - 60_000, now - 60_000);
  if (rate.request_count > verifyRateLimit) {
    const retryAfter = Math.max(1, Math.ceil((rate.window_started_at + 60_000 - now) / 1000));
    res.set("Retry-After", String(retryAfter));
    return res.status(429).json({ error: "Verification rate limit exceeded. Retry later." });
  }
  try {
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== 97) throw new Error("RPC endpoint is not BNB Smart Chain Testnet.");
    const code = await provider.getCode(tokenAddress);
    if (code === "0x") return res.status(503).json({ error: "Configured VKT contract has no code on testnet." });
    if (invoice.status === "paid" && invoice.transaction_hash && invoice.block_number !== null && invoice.block_hash) {
      const canonicalBlock = await provider.getBlock(invoice.block_number);
      if (!canonicalBlock || canonicalBlock.hash?.toLowerCase() !== invoice.block_hash.toLowerCase()) {
        reconcileReorg(invoiceId, invoice.transaction_hash);
        invoice = getInvoice.get(invoiceId);
      }
    }
    const receipt = await provider.getTransactionReceipt(transactionHash);
    if (!receipt) return res.status(202).json({ status: "pending", message: "Transaction is not mined yet." });
    if (receipt.status !== 1) return res.status(422).json({ error: "Transaction failed on-chain." });
    const canonicalBlock = await provider.getBlock(receipt.blockNumber);
    if (!canonicalBlock || canonicalBlock.hash?.toLowerCase() !== receipt.blockHash?.toLowerCase()) {
      return res.status(202).json({ status: "confirming", message: "Receipt block is not yet canonical; retry verification." });
    }
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
    const settlement = settleInvoice(transactionHash.toLowerCase(), invoiceId, receipt.blockNumber, receipt.blockHash);
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
    return res.status(502).json({ error: "Could not verify the transaction. Retry later or contact the merchant." });
  }
});

app.use((error, _req, res, _next) => {
  if (error?.type === "entity.too.large") {
    return res.status(413).json({ error: "Request body is too large." });
  }
  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return res.status(400).json({ error: "Request body must contain valid JSON." });
  }
  return res.status(500).json({ error: "Internal server error." });
});

app.listen(Number(process.env.PORT || 8787), () => {
  console.log(`VKT testnet verifier listening on port ${process.env.PORT || 8787}`);
});
