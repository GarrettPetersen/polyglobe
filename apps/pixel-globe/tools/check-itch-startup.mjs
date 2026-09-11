import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadPlaywright, browserExecutablePath, startStaticServer } from "./reachability/browser-runtime.mjs";

const archive = fileURLToPath(new URL("../build/marque-and-reprisal-demo-itch.zip", import.meta.url));
const rootDirectory = await mkdtemp(join(tmpdir(), "marque-itch-startup-"));
let server;
let browser;
try {
  execFileSync("unzip", ["-q", archive, "-d", rootDirectory]);
  const mountPath = "/html/test-build/";
  server = await startStaticServer({ rootDirectory, mountPath });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const playwright = loadPlaywright();
  browser = await playwright.chromium.launch({
    headless: true,
    executablePath: browserExecutablePath(playwright),
    args: ["--mute-audio"]
  });
  const page = await browser.newPage();
  const failures = [];
  page.on("pageerror", error => failures.push(error.message));
  page.on("response", response => {
    if (response.status() >= 400 && !response.url().endsWith("/favicon.ico")) {
      failures.push(`${response.status()} ${response.url()}`);
    }
  });
  await page.goto(`${origin}${mountPath}?saveRestoreSmoke=1`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => Boolean(window.__PIXEL_GLOBE_SAVE_RESTORE_SMOKE__) ||
    document.querySelector("#loading-screen")?.dataset.state === "failed", null, { timeout: 120_000 });
  const result = await page.evaluate(() => ({
    ready: Boolean(window.__PIXEL_GLOBE_SAVE_RESTORE_SMOKE__),
    loading: document.querySelector("#loading-screen")?.textContent
  }));
  assert.equal(result.ready, true, JSON.stringify({ result, failures }));
  assert.deepEqual(failures, []);
  console.log("Packaged itch demo initialized successfully beneath a nested hosting path.");
} finally {
  await browser?.close();
  if (server) await new Promise(resolve => server.close(resolve));
  await rm(rootDirectory, { recursive: true, force: true });
}
