import assert from "node:assert/strict";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { translate } from "../src/localization.js";
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
    assert.equal(
      await page.locator("#loading-status-text").innerText(),
      translate("en", "recovery.startupFailed")
    );
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
  for (const persistent of [false, true]) {
    const context = await browser.newContext();
    const page = await context.newPage();
    let attempts = 0;
    await page.route(/\/earth-globe-cache-8\.json\.part000(?:\?|$)/, async route => {
      attempts++;
      const response = await route.fetch();
      const body = Buffer.from(await response.body());
      if (persistent || attempts === 1) body[0] ^= 1;
      await route.fulfill({ response, body });
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    if (persistent) {
      await page.locator('#loading-screen[data-state="failed"]').waitFor({ timeout: 180000 });
      assert.equal(
        await page.locator("#loading-status-text").innerText(),
        translate("en", "recovery.startupFailed")
      );
      assert.match(
        await page.evaluate(() => localStorage.getItem("marque-and-reprisal.last-startup-failure")),
        /SHA-256 mismatch/
      );
      assert.equal(attempts, 5, "Persistent corruption must stop after bounded retries");
    } else {
      await page.waitForFunction(() => document.getElementById("loading-screen")?.hidden, null, { timeout: 180000 });
      assert.equal(attempts, 2, "Same-length corruption must retry the damaged chunk");
    }
    await context.close();
    console.log(`World chunk integrity passed: ${persistent ? "persistent corruption fails cleanly" : "transient corruption recovers"}`);
  }
} finally {
  await browser.close();
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}
