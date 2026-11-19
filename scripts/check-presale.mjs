import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const root = resolve("presale");
const html = await readFile(resolve(root, "index.html"), "utf8");
const server = createServer(async (req, res) => {
  try {
    const path = req.url === "/" ? "index.html" : decodeURIComponent(req.url.slice(1));
    const file = resolve(root, path);
    if (!file.startsWith(root)) throw new Error("Invalid path");
    const body = await readFile(file);
    res.writeHead(200, { "content-type": extname(file) === ".html" ? "text/html; charset=utf-8" : "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
});

await new Promise((ok) => server.listen(4173, "127.0.0.1", ok));
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle" });

  assert.match(html, /<title>Vikasah Hardware Wallet/);
  assert.match(html, /property="og:title"/);
  assert.match(html, /name="twitter:card"/);
  assert.match(html, /Skip to main content/);
  assert.match(html, /prefers-reduced-motion/);
  assert.match(html, /no waitlist or signup form/i);
  assert.equal(await page.locator("form").count(), 0, "Preview must not collect visitor data");

  const mobile = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    pageWidth: document.documentElement.scrollWidth,
    comparisonScrolls: document.querySelector(".compare-wrap").scrollWidth > document.querySelector(".compare-wrap").clientWidth,
    main: Boolean(document.querySelector("main#main-content")),
    tableCaption: Boolean(document.querySelector("table caption")),
  }));
  assert.ok(mobile.pageWidth <= mobile.viewport + 1, `Mobile page has horizontal overflow: ${JSON.stringify(mobile)}`);
  assert.ok(mobile.comparisonScrolls, "Comparison table should scroll inside its own wrapper on mobile");
  assert.ok(mobile.main, "Main landmark and skip-link target must exist");
  assert.ok(mobile.tableCaption, "Comparison table needs a caption");

  await page.keyboard.press("Tab");
  assert.equal(await page.locator(":focus").getAttribute("href"), "#main-content", "First keyboard focus should be skip link");

  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  if (axe.violations.length) {
    for (const v of axe.violations) {
      console.error(`AXE ${v.id}: ${v.help}`);
      for (const node of v.nodes) console.error(`  ${node.target.join(", ")} — ${node.failureSummary ?? ""}`);
    }
  }
  assert.equal(axe.violations.length, 0, "Automated accessibility scan found WCAG A/AA violations");
  assert.deepEqual(errors, [], "Browser reported JavaScript errors");

  await page.setViewportSize({ width: 1440, height: 900 });
  const desktop = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, pageWidth: document.documentElement.scrollWidth }));
  assert.ok(desktop.pageWidth <= desktop.viewport + 1, `Desktop page has horizontal overflow: ${JSON.stringify(desktop)}`);

  console.log("PASS: mobile and desktop viewport smoke tests");
  console.log("PASS: keyboard skip-link, reduced-motion, metadata and no-form checks");
  console.log("PASS: axe-core WCAG 2.1 A/AA scan");
} finally {
  if (browser) await browser.close();
  await new Promise((ok) => server.close(ok));
}
