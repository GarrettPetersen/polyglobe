#!/usr/bin/env node
/**
 * Load the demo in a headless browser and capture console.log (especially [tree-debug]).
 * Usage: node scripts/capture-console.mjs [baseUrl]
 * Default baseUrl: http://localhost:5173
 */
import { chromium } from "playwright";

const baseUrl = process.argv[2] || "http://localhost:5173";

const logs = [];
const errors = [];

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on("console", (msg) => {
    const type = msg.type();
    const text = msg.text();
    if (type === "error") errors.push(text);
    logs.push({ type, text });
  });

  try {
    await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 30000 });
  } catch (e) {
    console.error("Page load failed:", e.message);
    await browser.close();
    process.exit(1);
  }

  // Wait for async build (globe → plant GLTF load → createVegetationLayer → tree-debug logs)
  const waitMs = Number(process.env.CAPTURE_CONSOLE_WAIT_MS) || 60000;
  await page.waitForTimeout(waitMs);

  const treeLogs = logs.filter((l) => l.text.includes("[tree-debug]") || l.text.includes("tree"));
  console.log("=== [tree-debug] and tree-related logs ===\n");
  treeLogs.forEach((l) => console.log(l.text));
  console.log("\n=== All console.log (first 80) ===\n");
  logs.filter((l) => l.type === "log").slice(0, 80).forEach((l) => console.log(l.text));
  if (errors.length > 0) {
    console.log("\n=== Console errors ===\n");
    errors.forEach((e) => console.error(e));
  }

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
