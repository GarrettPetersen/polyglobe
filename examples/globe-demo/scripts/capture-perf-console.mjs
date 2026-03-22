/**
 * Load the demo with ?perf=1 and print [globe-perf] console lines (full object serialization).
 * Usage: VITE_URL=http://127.0.0.1:5199 node scripts/capture-perf-console.mjs
 */
import { chromium } from "playwright";

const base = process.env.VITE_URL || "http://127.0.0.1:5173";
const url = `${base.replace(/\/$/, "")}/?perf=1`;
const lines = [];
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.on("console", async (msg) => {
  if (!msg.text().includes("[globe-perf]")) return;
  try {
    const parts = [];
    for (const a of msg.args()) {
      const j = await a.jsonValue().catch(() => null);
      parts.push(j !== undefined && j !== null ? JSON.stringify(j) : String(a));
    }
    lines.push(parts.join(" "));
  } catch {
    lines.push(msg.text());
  }
});
console.error("Opening", url, "…");
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
const deadline = Date.now() + 300000;
let frameReports = 0;
while (Date.now() < deadline && frameReports < 2) {
  await page.waitForTimeout(2000);
  frameReports = lines.filter((l) => l.includes("frame CPU avg")).length;
}
for (const l of lines) console.log(l);
await browser.close();
