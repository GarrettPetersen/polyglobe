/**
 * Load the demo with ?perf=1 and print [globe-perf] console lines (full object serialization).
 * Usage: VITE_URL=http://127.0.0.1:5199 node scripts/capture-perf-console.mjs
 * Optional: PERF_EXTRA_QUERY=dayLengthSec=15&cloudTick=10&cloudCoarseDriftMul=0.55  (after perf=1)
 * Optional: PERF_FRAME_REPORTS=3  (default 2) — wait for more averaged windows before exit.
 */
import { chromium } from "playwright";

const base = process.env.VITE_URL || "http://127.0.0.1:5173";
const extra = process.env.PERF_EXTRA_QUERY?.replace(/^\?/, "").trim();
const url = extra
  ? `${base.replace(/\/$/, "")}/?perf=1&${extra}`
  : `${base.replace(/\/$/, "")}/?perf=1`;
const wantReports = Math.max(
  1,
  Number.parseInt(process.env.PERF_FRAME_REPORTS || "2", 10) || 2,
);
const deadlineMs = Math.max(
  60_000,
  Number.parseInt(process.env.PERF_DEADLINE_MS || "300000", 10) || 300_000,
);
const lines = [];
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
/** Sync handler only: awaiting `arg.jsonValue()` on console messages can stall headless Chromium. */
page.on("console", (msg) => {
  const t = msg.text();
  if (!t.includes("[globe-perf]")) return;
  lines.push(t);
});
console.error("Opening", url, "…");
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
const deadline = Date.now() + deadlineMs;
let frameReports = 0;
while (Date.now() < deadline && frameReports < wantReports) {
  await page.waitForTimeout(2000);
  frameReports = lines.filter((l) => l.includes("frame CPU avg")).length;
}
for (const l of lines) console.log(l);
await browser.close();
