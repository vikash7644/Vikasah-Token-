import "dotenv/config";
import express from "express";
import rateLimit from "express-rate-limit";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { mountVktMerchantProxy } from "./vkt-proxy.mjs";

const apiBaseUrl = process.env.VKT_API_BASE_URL;
const merchantApiKey = process.env.MERCHANT_API_KEY;
if (!apiBaseUrl || !merchantApiKey) {
  throw new Error("Set VKT_API_BASE_URL and MERCHANT_API_KEY in the server environment.");
}

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "16kb" }));
app.use("/api/vkt", rateLimit({
  windowMs: 60_000,
  limit: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many checkout requests. Try again shortly." }
}));
mountVktMerchantProxy(app, { apiBaseUrl, merchantApiKey });

const here = dirname(fileURLToPath(import.meta.url));
const staticRoot = resolve(here, "..");
app.use("/server", (_req, res) => res.sendStatus(404));
app.use(express.static(staticRoot, { dotfiles: "deny", index: "index.html", etag: true }));
app.use((error, _req, res, _next) => {
  if (error?.type === "entity.too.large") return res.status(413).json({ error: "Request body is too large." });
  if (error instanceof SyntaxError && error.status === 400) return res.status(400).json({ error: "Request body must contain valid JSON." });
  return res.status(500).json({ error: "Internal server error." });
});

const port = Number(process.env.PORT || 8788);
if (!Number.isSafeInteger(port) || port < 1 || port > 65535) throw new Error("PORT must be a valid TCP port.");
const server = app.listen(port, "0.0.0.0", () => {
  console.log("VKT Merchant Studio server listening on port " + port);
});
let closing = false;
function shutdown(signal) {
  if (closing) return;
  closing = true;
  console.log("Received " + signal + "; closing Merchant Studio.");
  server.close(error => {
    if (error) {
      console.error("Merchant Studio shutdown failed.");
      process.exitCode = 1;
    }
  });
}
process.once("SIGTERM", () => shutdown("SIGTERM"));
process.once("SIGINT", () => shutdown("SIGINT"));
