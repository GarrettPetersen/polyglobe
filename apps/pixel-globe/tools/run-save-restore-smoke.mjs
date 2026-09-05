import { monitorBrowserFailures } from "./reachability/browser-failures.mjs";
import { createServer } from "node:http";
import { createReadStream, existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  captureScenarioFromSearch
} from "../src/captureScenarios.js";
import { AUTOMATIC_CAPTURE_FRAME_RATE } from "../src/captureDirector.js";
import { GAME_STATE_VERSION } from "../src/gameState.js";
import { gameplayReachabilityScenarioIds } from "../src/gameplayReachabilityScenarios.js";

const DENSE_RUNTIME_PLAYER_CHARACTER = Object.freeze({
  id: "player:dense-save-captain",
  name: "Jane Smith",
  givenName: "Jane",
  familyName: "Smith",
  gender: "female",
  sex: "female",
  region: "northern-europe",
  sourceId: "blond-villager-women-portrait-pack-by-captainskeleto-blond-villager-women",
  sourceLabel: "Blond Villager Women",
  sourceRoles: Object.freeze(["factor", "civilian"]),
  sourceRegions: Object.freeze(["global", "europe", "northern-europe", "mediterranean"]),
  requiredReligionFamily: null,
  minAge: 20,
  maxAge: 34,
  age: 30,
  role: "player-captain",
  nameCulture: "english",
  nationalityId: "england",
  nationalityName: "Kingdom of England",
  nationalityAdjective: "English",
  homePortCityId: "london|united kingdom",
  homePortTileId: 1,
  homePortName: "London",
  homePortCountry: "United Kingdom",
  religionId: "roman-catholic",
  birthDate: Object.freeze({ year: 1492, month: 5, day: 18 }),
  birthDateLabel: "18 May 1492",
  expressions: Object.freeze(["neutral", "happy"])
});

const require = createRequire(import.meta.url);
const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST_ROOT = path.join(APP_ROOT, "dist");
const FIXTURE_ROOT = path.join(APP_ROOT, "src/test-fixtures/saves");
const RESTORE_TIMEOUT_MS = 10 * 60 * 1000;
const CITY_VISUALIZER_TIMEOUT_MS = 60 * 1000;
const GAMEPLAY_SCENARIO_TIMEOUT_MS = 10 * 60 * 1000;
const GAMEPLAY_SEQUENCE_KINDS = new Set(["sail", "fight", "pillage"]);
const CONTENT_TYPES = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".bin", "application/octet-stream"],
  [".mp3", "audio/mpeg"],
  [".ogg", "audio/ogg"],
  [".png", "image/png"],
  [".ttf", "font/ttf"],
  [".woff2", "font/woff2"]
]);

const fixtures = frozenSaveFixtures();
const reachabilityOptions = parseReachabilityArguments(process.argv.slice(2));
const releaseReachability = reachabilityOptions.release;
const gameplayScenarioIds = productionGameplayScenarioIds(
  releaseReachability,
  reachabilityOptions.scenarioId
);
const playwright = loadPlaywright();
const server = await startStaticServer();
const address = server.address();
if (!address || typeof address === "string") throw new Error("Save-restore server has no TCP address");
const baseUrl = `http://127.0.0.1:${address.port}`;
const browser = await playwright.chromium.launch({
  headless: true,
  executablePath: browserExecutablePath(playwright),
  ignoreDefaultArgs: ["--enable-unsafe-swiftshader"],
  args: [
    "--disable-background-timer-throttling",
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
    "--mute-audio"
  ]
});

try {
  const context = await browser.newContext({
    viewport: { width: 455, height: 256 },
    deviceScaleFactor: 1
  });
  await context.addInitScript(() => {
    localStorage.setItem("marque-and-reprisal.telemetry-consent", "denied");
  });
  const page = await context.newPage();
  const browserErrors = monitorBrowserFailures(page);
  const cityStartedAt = performance.now();
  await page.goto(`${baseUrl}/city-visualizer/`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000
  });
  try {
    await page.waitForFunction(
      () => {
        const canvas = document.querySelector("#scene");
        const loading = document.querySelector("#loading");
        return loading?.hidden === true &&
          canvas?.getAttribute("aria-label") !== "Loading city view";
      },
      null,
      { timeout: CITY_VISUALIZER_TIMEOUT_MS }
    );
  } catch (error) {
    const cityFailureState = await page.evaluate(() => ({
      label: document.querySelector("#scene")?.getAttribute("aria-label") || null,
      loadingText: document.querySelector("#loading")?.textContent?.trim() || null,
      loadingHidden: document.querySelector("#loading")?.hidden ?? null
    }));
    throw new Error(
      `Standalone city visualizer did not initialize: ${JSON.stringify(cityFailureState)}\n` +
      `${browserErrors.join("\n") || error.message}`
    );
  }
  await assertNoBrowserFailure(page, browserErrors, "standalone city visualizer initialization");
  const cityState = await page.evaluate(() => ({
    label: document.querySelector("#scene")?.getAttribute("aria-label"),
    cityOptions: document.querySelector("#city-select")?.options.length ?? 0
  }));
  if (typeof cityState.label !== "string" || cityState.label.length === 0 || cityState.cityOptions === 0) {
    throw new Error("Standalone city visualizer initialized without a city scene and catalog");
  }
  process.stdout.write(
    `Standalone city visualizer initialized in ${Math.round(performance.now() - cityStartedAt)} ms\n`
  );
  await exerciseUninhabitedCityPreview(page, browserErrors);

  const startedAt = performance.now();
  await page.goto(`${baseUrl}/?saveRestoreSmoke=1`, {
    waitUntil: "domcontentloaded",
    timeout: 30_000
  });
  await page.waitForFunction(
    () => Boolean(window.__PIXEL_GLOBE_SAVE_RESTORE_SMOKE__) ||
      document.querySelector("#loading-screen")?.dataset.state === "failed",
    null,
    { timeout: RESTORE_TIMEOUT_MS }
  );
  await assertNoBrowserFailure(page, browserErrors, "runtime initialization");
  process.stdout.write(
    `Save-restore runtime initialized in ${Math.round(performance.now() - startedAt)} ms\n`
  );

  for (const fixture of fixtures) {
    const restored = await withTimeout(
      page.evaluate(async ({ serialized }) => (
        window.__PIXEL_GLOBE_SAVE_RESTORE_SMOKE__.restoreSerialized(serialized)
      ), fixture),
      RESTORE_TIMEOUT_MS,
      `${fixture.name} runtime restore`
    );
    await assertNoBrowserFailure(page, browserErrors, fixture.name);
    if (restored.gameStateVersion !== GAME_STATE_VERSION) {
      throw new Error(
        `${fixture.name} restored game-state version ${restored.gameStateVersion}/${GAME_STATE_VERSION}`
      );
    }
    if (restored.shipTypeSlug !== fixture.shipTypeSlug) {
      throw new Error(
        `${fixture.name} restored ship ${restored.shipTypeSlug}/${fixture.shipTypeSlug}`
      );
    }
    if (!Number.isInteger(restored.chartTileCount) || restored.chartTileCount <= 0) {
      throw new Error(`${fixture.name} restored without a populated chart`);
    }
    process.stdout.write(
      `  ${fixture.name}: v${fixture.gameStateVersion} -> v${restored.gameStateVersion}, ` +
        `${restored.shipTypeSlug}, ${restored.cityCallCount} visible cities\n`
    );
  }
  process.stdout.write(`Save-restore smoke passed for ${fixtures.length} frozen boundary fixtures.\n`);

  const gameplayFailures = [];
  for (const scenarioId of gameplayScenarioIds) {
    browserErrors.length = 0;
    try {
      await exerciseProductionGameplayScenario(page, browserErrors, baseUrl, scenarioId);
    } catch (error) {
      if (!releaseReachability || page.isClosed()) throw error;
      gameplayFailures.push({ scenarioId, message: error.message });
      process.stderr.write(`  FAILED ${scenarioId}: ${error.message}\n`);
    }
  }
  if (gameplayFailures.length > 0) {
    throw new Error(
      `Production gameplay reachability rejected ${gameplayFailures.length} scenario(s):\n` +
        gameplayFailures.map(({ scenarioId, message }) => `- ${scenarioId}: ${message}`).join("\n")
    );
  }
  process.stdout.write(
    `Production gameplay reachability passed for ${gameplayScenarioIds.length} ` +
      `${releaseReachability ? "release" : "representative"} scenarios.\n`
  );
  await context.close();
} finally {
  await browser.close();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

function parseReachabilityArguments(args) {
  const scenarioArguments = args.filter((argument) => argument.startsWith("--scenario="));
  const unknown = args.filter((argument) => (
    argument !== "--release-reachability" && !argument.startsWith("--scenario=")
  ));
  if (unknown.length > 0) {
    throw new Error(`Unknown production reachability argument: ${unknown.join(", ")}`);
  }
  if (scenarioArguments.length > 1) {
    throw new Error("Production reachability accepts only one scenario argument");
  }
  const release = args.includes("--release-reachability");
  const scenarioId = scenarioArguments.length === 1
    ? scenarioArguments[0].slice("--scenario=".length)
    : null;
  if (scenarioId === "") throw new Error("Production reachability scenario id is empty");
  if (release && scenarioId !== null) {
    throw new Error("Select release reachability or one scenario, not both");
  }
  return Object.freeze({ release, scenarioId });
}

function productionGameplayScenarioIds(release, scenarioId) {
  const releaseIds = gameplayReachabilityScenarioIds("release");
  if (scenarioId !== null && !releaseIds.includes(scenarioId)) {
    throw new Error(`Unknown production gameplay reachability scenario: ${scenarioId}`);
  }
  const ids = scenarioId === null
    ? gameplayReachabilityScenarioIds(release ? "release" : "fast")
    : Object.freeze([scenarioId]);
  if (ids.length === 0) throw new Error("Production gameplay reachability selected no scenarios");
  for (const id of ids) {
    const scenario = captureScenarioFromSearch(`?capture=${id}`);
    if (!GAMEPLAY_SEQUENCE_KINDS.has(scenario.sequence.kind)) {
      throw new Error(`Gameplay reachability scenario has unsupported kind: ${id}:${scenario.sequence.kind}`);
    }
  }
  if (scenarioId === null) {
    const representedKinds = new Set(ids.map((id) => (
      captureScenarioFromSearch(`?capture=${id}`).sequence.kind
    )));
    for (const kind of GAMEPLAY_SEQUENCE_KINDS) {
      if (!representedKinds.has(kind)) {
        throw new Error(`Production gameplay reachability has no ${kind} scenario`);
      }
    }
  }
  return Object.freeze(ids);
}

async function exerciseProductionGameplayScenario(page, browserErrors, baseUrl, scenarioId) {
  const scenario = captureScenarioFromSearch(`?capture=${scenarioId}`);
  const startedAt = performance.now();
  await page.goto(
    `${baseUrl}/?capture=${encodeURIComponent(scenarioId)}&captureFormat=steam&autocapture=frames`,
    { waitUntil: "domcontentloaded", timeout: 30_000 }
  );
  await page.waitForFunction(() => (
    window.__PIXEL_GLOBE_CAPTURE_READY__ === true ||
    typeof window.__PIXEL_GLOBE_CAPTURE_ERROR__ === "string"
  ), null, { timeout: GAMEPLAY_SCENARIO_TIMEOUT_MS });
  const initializationFailure = await page.evaluate(() => window.__PIXEL_GLOBE_CAPTURE_ERROR__ || null);
  if (initializationFailure) {
    throw new Error(`${scenarioId} failed to initialize: ${initializationFailure}`);
  }
  await assertNoBrowserFailure(page, browserErrors, `${scenarioId} initialization`);

  const frameCount = await page.evaluate(() => window.__PIXEL_GLOBE_CAPTURE_TOTAL_FRAMES__);
  const expectedFrameCount = scenario.sequence.durationSeconds * AUTOMATIC_CAPTURE_FRAME_RATE;
  if (frameCount !== expectedFrameCount) {
    throw new Error(`${scenarioId} exposed ${frameCount}/${expectedFrameCount} deterministic frames`);
  }
  for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
    const frame = await page.evaluate((index) => window.__PIXEL_GLOBE_CAPTURE_STEP__(index), frameIndex);
    const shouldBeComplete = frameIndex === frameCount - 1;
    if (
      frame?.frameIndex !== frameIndex ||
      frame?.totalFrames !== frameCount ||
      frame?.complete !== shouldBeComplete
    ) {
      throw new Error(`${scenarioId} returned malformed deterministic frame ${frameIndex}`);
    }
  }
  const result = await page.evaluate(() => ({
    error: window.__PIXEL_GLOBE_CAPTURE_ERROR__ || null,
    sidecar: window.__PIXEL_GLOBE_CAPTURE_SIDECAR__ || null
  }));
  if (result.error) throw new Error(`${scenarioId} failed while stepping: ${result.error}`);
  if (result.sidecar?.scenario?.id !== scenarioId) {
    throw new Error(`${scenarioId} completed without its deterministic event record`);
  }
  const combatSummary = assertGameplayScenarioEvidence(scenario, result.sidecar);
  await assertNoBrowserFailure(page, browserErrors, `${scenarioId} frame traversal`);
  process.stdout.write(
    `  ${scenario.sequence.kind} ${scenarioId}: ${frameCount} frames in ` +
      `${Math.round(performance.now() - startedAt)} ms${combatSummary ? `; ${combatSummary}` : ""}\n`
  );
}

function assertGameplayScenarioEvidence(scenario, sidecar) {
  if (scenario.sequence.variant !== "2v2-broadside") return null;
  const evaluatedNpcIds = scenario.sequence.evaluatedNpcIds;
  if (!Array.isArray(evaluatedNpcIds) || evaluatedNpcIds.length !== 3 ||
      new Set(evaluatedNpcIds).size !== evaluatedNpcIds.length) {
    throw new Error(`${scenario.id} requires three unique evaluated NPC ids`);
  }
  const evaluatedNpcIdSet = new Set(evaluatedNpcIds);
  const cannonVolleys = sidecar.events.filter((event) => (
    event.type === "weapon-fired" &&
    event.data.weapon === "cannon" &&
    evaluatedNpcIdSet.has(event.data.ownerId)
  ));
  const cannonHits = sidecar.events.filter((event) => (
    event.type === "projectile-hit" &&
    event.data.weapon === "cannon" &&
    evaluatedNpcIdSet.has(event.data.ownerId) &&
    typeof event.data.combatVolleyId === "string"
  ));
  const hitVolleyIds = new Set(cannonHits.map((event) => event.data.combatVolleyId));
  const effectiveVolleys = cannonVolleys.filter((event) => hitVolleyIds.has(event.data.combatVolleyId));
  const opportunisticVolleys = cannonVolleys.filter((event) => event.data.opportunistic === true);
  const effectiveOpportunisticVolleys = opportunisticVolleys.filter(
    (event) => hitVolleyIds.has(event.data.combatVolleyId)
  );
  if (cannonVolleys.length < evaluatedNpcIds.length) {
    const targetChanges = sidecar.events
      .filter((event) => event.type === "combat-target-changed" && evaluatedNpcIdSet.has(event.data.shipId))
      .map((event) => event.data);
    throw new Error(
      `${scenario.id} produced only ${cannonVolleys.length} evaluated NPC broadside volleys: ` +
      `${JSON.stringify(cannonVolleys.map((event) => event.data))}; targets: ${JSON.stringify(targetChanges)}`
    );
  }
  if (opportunisticVolleys.length === 0) {
    throw new Error(
      `${scenario.id} never exercised an opportunistic broadside: ` +
      JSON.stringify(cannonVolleys.map((event) => event.data))
    );
  }
  const volleyHitRate = effectiveVolleys.length / cannonVolleys.length;
  const opportunisticHitRate = effectiveOpportunisticVolleys.length / opportunisticVolleys.length;
  if (volleyHitRate < 0.5) {
    throw new Error(`${scenario.id} useful NPC broadside rate was ${(volleyHitRate * 100).toFixed(1)}%`);
  }
  if (opportunisticHitRate < 0.5) {
    throw new Error(
      `${scenario.id} useful opportunistic broadside rate was ${(opportunisticHitRate * 100).toFixed(1)}%`
    );
  }
  return `${cannonVolleys.length} NPC volleys, ${(volleyHitRate * 100).toFixed(0)}% useful; ` +
    `${opportunisticVolleys.length} opportunistic, ${(opportunisticHitRate * 100).toFixed(0)}% useful`;
}

async function exerciseUninhabitedCityPreview(page, browserErrors) {
  await page.locator("#drawer").evaluate((drawer) => { drawer.open = true; });
  const toggle = page.getByLabel("Uninhabited", { exact: true });
  await page.locator("#fort-override").selectOption("on");
  await page.locator("#dock-override").selectOption("stone");
  await page.getByLabel("Bombarded and burning").check();
  await toggle.check();
  await waitForCityFrame();
  for (const selector of ["#fort-override", "#dock-override", "#left-bank-city-override", "#bombardment-toggle"]) {
    if (!await page.locator(selector).isDisabled()) {
      throw new Error(`Uninhabited city did not disable settlement control ${selector}`);
    }
  }
  await assertNoBrowserFailure(page, browserErrors, "uninhabited city rendering");
  await toggle.uncheck();
  await waitForCityFrame();
  if (await page.locator("#dock-override").isDisabled() ||
      await page.locator("#dock-override").inputValue() !== "stone" ||
      await page.locator("#fort-override").inputValue() !== "on" ||
      !await page.getByLabel("Bombarded and burning").isChecked()) {
    throw new Error("Inhabited city did not restore its previous settlement overrides");
  }
  await toggle.check();
  await page.locator("#reset-overrides").click();
  await waitForCityFrame();
  if (await toggle.isChecked() || await page.locator("#dock-override").isDisabled() ||
      await page.locator("#dock-override").inputValue() !== "auto" ||
      await page.getByLabel("Bombarded and burning").isChecked()) {
    throw new Error("City preview reset did not restore the inhabited geography defaults");
  }
  await assertNoBrowserFailure(page, browserErrors, "inhabited city restoration");
  await page.locator("#drawer").evaluate((drawer) => { drawer.open = false; });
  process.stdout.write("  Uninhabited city toggle, override restoration and reset passed.\n");

  async function waitForCityFrame() {
    await page.evaluate(() => new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    }));
  }
}

function frozenSaveFixtures() {
  const fixtures = readdirSync(FIXTURE_ROOT)
    .filter((name) => name.startsWith("dense-local-save-") && name.endsWith(".json"))
    .sort()
    .map((name) => {
      const serialized = readFileSync(path.join(FIXTURE_ROOT, name), "utf8");
      const save = browserAdaptedDenseFixture(JSON.parse(serialized), name);
      const gameStateVersion = save.payload?.gameState?.version;
      const shipTypeSlug = save.payload?.playerShip?.typeSlug;
      if (!Number.isInteger(gameStateVersion) || typeof shipTypeSlug !== "string") {
        throw new Error(`Malformed save compatibility fixture: ${name}`);
      }
      return {
        name,
        serialized: JSON.stringify(save),
        gameStateVersion,
        shipTypeSlug
      };
    });
  if (fixtures.length === 0) {
    throw new Error("Save-restore smoke requires browser-adaptable frozen save fixtures");
  }
  if (!fixtures.some((fixture) => fixture.gameStateVersion === GAME_STATE_VERSION)) {
    throw new Error(`Save-restore smoke has no fixture for game-state version ${GAME_STATE_VERSION}`);
  }
  return fixtures;
}

function browserAdaptedDenseFixture(save, name) {
  const captain = save.payload?.gameState?.playerCharacter;
  if (captain?.id !== "player:dense-save-captain") {
    throw new Error(`${name} has lost its dense-fixture captain identity`);
  }
  if (
    captain.name === "Dense Save Captain" &&
    captain.givenName === "Dense" &&
    captain.familyName === "Captain" &&
    captain.nameCulture === "english"
  ) {
    save.payload.gameState.playerCharacter = {
      ...structuredClone(DENSE_RUNTIME_PLAYER_CHARACTER),
      skillIds: structuredClone(captain.skillIds)
    };
  }
  const runtimeCaptain = save.payload.gameState.playerCharacter;
  if (
    runtimeCaptain.name !== "Jane Smith" ||
    runtimeCaptain.sourceId !==
      "blond-villager-women-portrait-pack-by-captainskeleto-blond-villager-women" ||
    runtimeCaptain.role !== "player-captain" ||
    typeof runtimeCaptain.birthDateLabel !== "string" ||
    typeof runtimeCaptain.nationalityAdjective !== "string"
  ) {
    throw new Error(`${name} has an invalid dense-fixture runtime captain`);
  }
  return save;
}

async function assertNoBrowserFailure(page, browserErrors, label) {
  if (!await page.locator("#crash-copy-button").isHidden()) {
    browserErrors.push("The game displayed its fatal crash control");
  }
  if (browserErrors.length > 0) {
    throw new Error(`${label} produced browser errors:\n${browserErrors.join("\n")}`);
  }
}

async function withTimeout(promise, timeoutMs, label) {
  let timeoutId = null;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs} ms`)), timeoutMs);
      })
    ]);
  } finally {
    if (timeoutId !== null) clearTimeout(timeoutId);
  }
}

function loadPlaywright() {
  const candidates = [
    "playwright",
    process.env.PLAYWRIGHT_MODULE_PATH,
    path.join(
      homedir(),
      ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright"
    )
  ].filter(Boolean);
  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch (error) {
      if (error?.code !== "MODULE_NOT_FOUND") throw error;
    }
  }
  throw new Error("Playwright is unavailable for the save-restore deployment smoke test");
}

function browserExecutablePath(playwrightModule) {
  const candidates = [
    process.env.PIXEL_GLOBE_CAPTURE_BROWSER,
    playwrightModule.chromium.executablePath(),
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  ].filter(Boolean);
  const executable = candidates.find(existsSync);
  if (!executable) throw new Error("No Chromium browser is available for save-restore testing");
  return executable;
}

async function startStaticServer() {
  if (!existsSync(path.join(DIST_ROOT, "index.html"))) {
    throw new Error("Save-restore smoke requires a completed production build");
  }
  const server = createServer((request, response) => {
    try {
      const requestUrl = new URL(request.url || "/", "http://127.0.0.1");
      const pathname = decodeURIComponent(requestUrl.pathname);
      const relativePath = pathname.endsWith("/")
        ? `${pathname.replace(/^\/+/, "")}index.html`
        : pathname.replace(/^\/+/, "");
      const filePath = path.resolve(DIST_ROOT, relativePath);
      const relation = path.relative(DIST_ROOT, filePath);
      if (relation.startsWith("..") || path.isAbsolute(relation)) {
        response.writeHead(403).end("Forbidden");
        return;
      }
      const file = statSync(filePath);
      if (!file.isFile()) throw new Error("not a file");
      response.writeHead(200, {
        "content-type": CONTENT_TYPES.get(path.extname(filePath)) || "application/octet-stream",
        "content-length": file.size,
        "cache-control": "no-cache"
      });
      createReadStream(filePath).pipe(response);
    } catch {
      response.writeHead(404).end("Not found");
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return server;
}
