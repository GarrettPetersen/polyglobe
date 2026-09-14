import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { loadPlaywright } from "./reachability/browser-runtime.mjs";

// Requires the real Steam client. Supply a packaged executable, or the local
// Electron executable followed by the host directory. Never starts a voyage.
const [appId, executable, ...options] = process.argv.slice(2);
const requirePackaged = options.includes("--require-packaged");
const args = options.filter(value => value !== "--require-packaged");
const launchEnvironment = { ...process.env };
// A release gate must not accidentally test an overridden development asset directory.
delete launchEnvironment.MARQUE_STEAM_GAME_ROOT;
delete launchEnvironment.MARQUE_STEAM_INPUT_MANIFEST;
assert.ok(["4516500", "5029880"].includes(appId), "Expected full or demo Steam App ID");
assert.ok(executable, "Expected an Electron game executable");
const profile = await mkdtemp(join(tmpdir(), "marque-steam-launch-"));
let desktop;
let page;
const failures = [];
try {
  desktop = await loadPlaywright()._electron.launch({
    executablePath: resolve(executable),
    args: [...args, `--user-data-dir=${profile}`],
    env: { ...launchEnvironment, SteamAppId: appId, SteamGameId: appId,
      MARQUE_STEAM_APP_ID: appId, MARQUE_STEAM_EDITION: appId === "5029880" ? "demo" : "full",
      MARQUE_STEAM_REQUIRE_RELAUNCH: "0" },
    timeout: 90_000
  });
  if (requirePackaged) {
    assert.equal(await desktop.evaluate(({ app }) => app.isPackaged), true,
      "Steam upload gate requires the packaged application, not a development host");
  }
  desktop.process().stderr.on("data", chunk => {
    const text = chunk.toString();
    if (text.includes("desktop host failed") || text.includes("Uncaught Exception")) failures.push(text);
  });
  page = await desktop.firstWindow({ timeout: 90_000 });
  console.log(`Steam ${appId}: window created at ${page.url()}`);
  page.on("pageerror", error => failures.push(error.message));
  const rendererFailure = new Promise((_, reject) => {
    page.once("pageerror", error => reject(error));
  });
  await Promise.race([rendererFailure, page.waitForFunction(() => {
    const loading = document.querySelector("#loading-screen");
    return loading?.hidden || loading?.dataset.state === "failed";
  }, null, { timeout: 180_000 })]);
  assert.equal(await page.locator("#loading-screen").getAttribute("data-state"), "leaving");
  assert.equal(await desktop.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isVisible()), true);
  assert.deepEqual(failures, []);
  await page.screenshot({ path: join(tmpdir(), `marque-steam-${appId}-launch.png`) });
  console.log(`Steam ${appId}: real host window visible, production startup complete, no fatal errors`);
} catch (error) {
  console.error(error);
  if (page && !page.isClosed()) console.error(await page.evaluate(() => ({
    url: location.href, title: document.title,
    loading: document.querySelector("#loading-screen")?.outerHTML.slice(0, 2500),
    text: document.body.innerText.slice(0, 1500)
  })));
  console.error(failures);
  throw error;
} finally {
  if (desktop) {
    const child = desktop.process();
    // A native startup dialog must not keep a failed release gate alive forever.
    let forcedShutdown = false;
    const timeout = setTimeout(() => { forcedShutdown = true; child.kill("SIGKILL"); }, 5000);
    try { await desktop.close(); } finally { clearTimeout(timeout); }
    assert.equal(forcedShutdown, false, "Steam host did not quit within five seconds");
  }
  await rm(profile, { recursive: true, force: true });
}
