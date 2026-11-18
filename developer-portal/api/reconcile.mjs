import "dotenv/config";
import Database from "better-sqlite3";
import { JsonRpcProvider } from "ethers";

const rpcUrl = process.env.BSC_TESTNET_RPC_URL;
if (!rpcUrl) throw new Error("Missing environment variable: BSC_TESTNET_RPC_URL.");
const provider = new JsonRpcProvider(rpcUrl, 97);
const database = new Database(process.env.DATABASE_PATH || "./vkt-payments.sqlite");
database.pragma("busy_timeout = 5000");

const paidInvoices = database.prepare(`
  SELECT id, transaction_hash, block_number, block_hash
  FROM invoices
  WHERE status = 'paid'
    AND transaction_hash IS NOT NULL
    AND block_number IS NOT NULL
    AND block_hash IS NOT NULL
  ORDER BY block_number ASC
`);
const resetPayment = database.prepare(`
  UPDATE invoices
  SET status = 'pending', transaction_hash = NULL, block_number = NULL, block_hash = NULL
  WHERE id = ? AND status = 'paid' AND transaction_hash = ? AND block_hash = ?
`);
const resetIfOrphaned = database.transaction((invoice) =>
  resetPayment.run(invoice.id, invoice.transaction_hash, invoice.block_hash)
);

let checked = 0;
let reset = 0;
try {
  const network = await provider.getNetwork();
  if (Number(network.chainId) !== 97) {
    throw new Error("RPC endpoint is not BNB Smart Chain Testnet (chain ID 97).");
  }
  for (const invoice of paidInvoices.iterate()) {
    checked += 1;
    let canonicalBlock;
    try {
      canonicalBlock = await provider.getBlock(invoice.block_number);
    } catch {
      // RPC failures are inconclusive: never reset a payment on a transport error.
      continue;
    }
    // A null response can mean a pruned/temporarily unavailable block; retry next run.
    if (!canonicalBlock?.hash) continue;
    if (canonicalBlock.hash.toLowerCase() !== invoice.block_hash.toLowerCase()) {
      const result = resetIfOrphaned(invoice);
      reset += result.changes;
    }
  }
  console.log(JSON.stringify({ checked, reset, network: "bsc-testnet", chainId: 97 }));
} finally {
  database.close();
  await provider.destroy();
}
