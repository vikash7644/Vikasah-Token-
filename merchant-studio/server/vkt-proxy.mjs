const invoicePattern = /^[a-zA-Z0-9_-]{1,80}$/;
const transactionPattern = /^0x[a-fA-F0-9]{64}$/;
const amountPattern = /^(?:0|[1-9]\d*)(?:\.\d{1,18})?$/;

function normalizeApiUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error("VKT_API_BASE_URL must be a valid HTTPS URL."); }
  const localHttp = url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if ((url.protocol !== "https:" && !localHttp) || url.username || url.password || url.search || url.hash) {
    throw new Error("VKT_API_BASE_URL must be HTTPS (HTTP only on localhost) and contain no credentials, query or fragment.");
  }
  return url.toString().replace(/\/$/, "");
}

export function mountVktMerchantProxy(app, {
  apiBaseUrl = process.env.VKT_API_BASE_URL,
  merchantApiKey = process.env.MERCHANT_API_KEY,
  fetchImpl = globalThis.fetch
} = {}) {
  const baseUrl = normalizeApiUrl(apiBaseUrl || "");
  if (typeof merchantApiKey !== "string" || Buffer.byteLength(merchantApiKey, "utf8") < 32) {
    throw new Error("MERCHANT_API_KEY must contain at least 32 bytes.");
  }
  if (typeof fetchImpl !== "function") throw new Error("A fetch implementation is required.");

  async function upstream(path, options = {}) {
    const response = await fetchImpl(new URL(path, baseUrl), {
      ...options,
      headers: { accept: "application/json", ...(options.headers || {}) },
      signal: AbortSignal.timeout(10_000)
    });
    const payload = await response.json().catch(() => ({}));
    return { status: response.status, payload };
  }

  app.post("/api/vkt/invoices", async (req, res) => {
    const { invoiceId, amount, payerAddress } = req.body || {};
    if (typeof invoiceId !== "string" || !invoicePattern.test(invoiceId) ||
        typeof amount !== "string" || !amountPattern.test(amount) ||
        typeof payerAddress !== "string" || !/^0x[a-fA-F0-9]{40}$/.test(payerAddress) ||
        /^0x0{40}$/i.test(payerAddress)) {
      return res.status(400).json({ error: "A valid invoiceId, positive decimal amount and non-zero payerAddress are required." });
    }
    try {
      const [whole, fraction = ""] = amount.split(".");
      const amountWei = BigInt(whole) * 10n ** 18n + BigInt((fraction + "0".repeat(18)).slice(0, 18));
      if (amountWei <= 0n || amountWei > 1_000_000_000n * 10n ** 18n) {
        return res.status(400).json({ error: "Invoice amount must be greater than zero and no more than 1,000,000,000 VKT." });
      }
      const result = await upstream("/v1/invoices", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: "Bearer " + merchantApiKey },
        body: JSON.stringify({ invoiceId, amount, payerAddress })
      });
      return res.status(result.status).json(result.payload);
    } catch {
      return res.status(502).json({ error: "VKT invoice service is unavailable. Retry later." });
    }
  });

  app.get("/api/vkt/invoices/:invoiceId", async (req, res) => {
    if (typeof req.params.invoiceId !== "string" || !invoicePattern.test(req.params.invoiceId)) {
      return res.status(400).json({ error: "A valid invoiceId is required." });
    }
    try {
      const result = await upstream("/v1/invoices/" + encodeURIComponent(req.params.invoiceId), {
        headers: { authorization: "Bearer " + merchantApiKey }
      });
      return res.status(result.status).json(result.payload);
    } catch {
      return res.status(502).json({ error: "VKT invoice service is unavailable. Retry later." });
    }
  });

  app.post("/api/vkt/payments/verify", async (req, res) => {
    const { invoiceId, transactionHash } = req.body || {};
    if (typeof invoiceId !== "string" || !invoicePattern.test(invoiceId) ||
        typeof transactionHash !== "string" || !transactionPattern.test(transactionHash)) {
      return res.status(400).json({ error: "A valid invoiceId and transactionHash are required." });
    }
    try {
      const result = await upstream("/v1/payments/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ invoiceId, transactionHash })
      });
      return res.status(result.status).json(result.payload);
    } catch {
      return res.status(502).json({ error: "VKT payment verification service is unavailable. Retry later." });
    }
  });
}
