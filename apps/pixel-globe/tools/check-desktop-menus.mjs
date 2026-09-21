import { browserAdaptedDenseFixture } from "./reachability/dense-save-fixture.mjs";
import assert from "node:assert/strict";
import { readFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadPlaywright, browserExecutablePath, startStaticServer } from "./reachability/browser-runtime.mjs";
import { PLATFORM_CLOUD_STORAGE_KEYS } from "../src/platformServices.js";

const fullSave = JSON.stringify(browserAdaptedDenseFixture(JSON.parse(readFileSync(new URL("../src/test-fixtures/saves/dense-local-save-v2-game-state-v113.json", import.meta.url), "utf8")), "desktop save"));
const output = join(tmpdir(), "marque-desktop-menu-smoke");
mkdirSync(output, { recursive: true });
const playwright = loadPlaywright();
const browser = await playwright.chromium.launch({ executablePath: browserExecutablePath(playwright), headless: true,
  args: ["--mute-audio"] });
try {
  for (const edition of ["full", "demo", "browser"]) {
    const server = await startStaticServer({ rootDirectory: fileURLToPath(new URL(edition === "demo" ? "../dist-demo/" : "../dist/", import.meta.url)) });
    // No persistent profile: this must never read, overwrite, or delete the developer's saves.
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    try {
      const page = await context.newPage();
      await page.addInitScript(() => localStorage.setItem("marque-and-reprisal.telemetry-consent", "denied"));
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      let profile = JSON.stringify({ version: 4, savedAt: 1800000000113,
        values: Object.fromEntries(PLATFORM_CLOUD_STORAGE_KEYS.map(key => [key,
          key === "marque-and-reprisal.save" ? fullSave
            : key === "marque-and-reprisal.telemetry-consent" ? "granted" : null
        ])) });
      let quitCount = 0;
      if (edition !== "browser") {
        await page.exposeFunction("readTestProfile", () => profile);
        await page.exposeFunction("writeTestProfile", serialized => { profile = serialized; return true; });
        await page.exposeFunction("quitTestDesktop", () => { quitCount++; });
        await page.addInitScript(edition => {
          window.marqueSteamPlatform = {
            platformId: "steam",
            // Exercise the host's durable local-profile path with Cloud switched off.
            getCapabilities: async () => ({ achievements: edition === "full", stats: edition === "full",
              cloud: false, input: true, richPresence: true, screenshots: true, timeline: true }),
            getCurrentGameLanguage: async () => "english",
            readCloudFile: () => window.readTestProfile(), writeCloudFile: (_name, serialized) => window.writeTestProfile(serialized),
            setRichPresence() {}, setTimelineState() {}, addTimelineEvent() {}, triggerScreenshot() {},
            updateStats() {}, onPauseRequested() {}, getFullscreen: async () => true,
            onFullscreenChanged() {}, toggleFullscreen: async () => false,
            quitGame: () => window.quitTestDesktop(), openWishlist() {}
          };
        }, edition);
      }
      await page.route("**/src/bootstrap.js*", async route => {
        const response = await route.fetch();
        await route.fulfill({ response, body: (await response.text()) + `
window.desktopMenuSmoke = {
  ready: () => regularGameLoopStarted && worldFramePresented,
  snapshot: () => ({ edition: BUILD_EDITION_ID, saved: localSaveResult.status,
    quitRow: OPTIONS_ROW_QUIT, rowCount: OPTIONS_ROW_COUNT, started: hasStartedVoyage }),
  begin: async () => {
    if (localSaveResult.status === "ready") await continueSavedVoyage();
    else startNewVoyage();
    openOptionsMenu();
    optionsMenu.selectedIndex = steamPlatformBridge ? OPTIONS_ROW_QUIT : OPTIONS_ROW_START_MENU;
    optionsMenu.scrollOffset = Math.max(0, optionsMenu.selectedIndex - 2);
    dirty = true;
  }
};` });
      });
      await page.goto(`http://127.0.0.1:${server.address().port}/`, { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => window.desktopMenuSmoke?.ready() || document.querySelector('#loading-screen[data-state="failed"]'), null, { timeout: 180000 });
      assert.deepEqual(errors, []);
      assert.equal(await page.evaluate(() => window.desktopMenuSmoke?.ready()), true,
        await page.locator("#loading-status-text").textContent());
      const initial = await page.evaluate(() => window.desktopMenuSmoke.snapshot());
      assert.equal(initial.saved, edition === "full" ? "ready" : "empty");
      assert.equal(initial.quitRow >= 0, edition !== "browser");
      console.log(`Desktop startup passed: ${edition}`);
      await page.evaluate(() => window.desktopMenuSmoke.begin());
      await page.waitForTimeout(300);
      await page.screenshot({ path: join(output, `${edition}-pause.png`) });
      if (edition !== "browser") {
        await page.keyboard.press("Enter");
        const deadline = Date.now() + 45000;
        while (quitCount === 0 && Date.now() < deadline) await page.waitForTimeout(50);
        assert.equal(quitCount, 1, "quit only after persistence completes");
        const values = JSON.parse(profile).values;
        assert.ok(values[edition === "demo" ? "marque-and-reprisal.demo-save" : "marque-and-reprisal.save"]);
        if (edition === "demo") assert.equal(values["marque-and-reprisal.save"], fullSave, "demo leaves the full voyage byte-for-byte intact");
      }
      assert.deepEqual(errors, []);
      console.log(`Desktop menu smoke passed: ${edition}; screenshot ${join(output, `${edition}-pause.png`)}`);
    } finally {
      await context.close();
      await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
  }
} finally {
  await browser.close();
}
