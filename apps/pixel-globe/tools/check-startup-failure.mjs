import assert from "node:assert/strict";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadPlaywright, browserExecutablePath, startStaticServer } from "./reachability/browser-runtime.mjs";

const playwright = loadPlaywright();
const server = await startStaticServer();
const browser = await playwright.chromium.launch({ executablePath: browserExecutablePath(playwright), headless: true });
try {
  for (const stage of ["capabilities", "cloud", "storage"]) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.addInitScript(stage => {
      if (stage === "storage") {
        Object.defineProperty(window, "localStorage", { get() { throw new Error("Storage unavailable"); } });
      }
      window.marqueSteamPlatform = {
        platformId: "steam",
        getCapabilities: async () => {
          if (stage !== "cloud") throw new Error("Injected Steam initialization failure");
          return { achievements: true, cloud: true, input: true, richPresence: true,
            screenshots: true, stats: true, timeline: true };
        },
        getCurrentGameLanguage: async () => "english",
        readCloudFile: async () => "invalid-cloud-profile",
        writeCloudFile: async () => { throw new Error("Unexpected cloud write during failed startup"); },
        setRichPresence() {}, setTimelineState() {}, addTimelineEvent() {},
        triggerScreenshot() {}, updateStats() {}, onPauseRequested() {}, toggleFullscreen() {}, quitGame() {}
      };
    }, stage);
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.locator('#loading-screen[data-state="failed"]').waitFor();
    await page.locator("#crash-copy-button").waitFor({ state: "visible" });
    assert.match(await page.locator("#loading-status-text").innerText(), /COULD NOT START/);
    if (stage !== "storage") {
      assert.match(await page.evaluate(() => localStorage.getItem("marque-and-reprisal.last-startup-failure")),
        /STARTUP FAILURE/);
    }
    await page.screenshot({ path: join(tmpdir(), `marque-startup-failure-${stage}.png`) });
    await context.close();
    console.log(`Startup failure presentation passed: ${stage}`);
  }
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.waitForFunction(() => document.getElementById("loading-screen")?.hidden, null, { timeout: 180000 });
  assert.deepEqual(errors, []);
  assert.equal(await page.evaluate(() => localStorage.getItem("marque-and-reprisal.last-startup-failure")), null);
  await context.close();
  console.log("Normal browser startup passed without a failure report");
} finally {
  await browser.close();
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}
