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
import { GAME_STATE_VERSION, addPortNavigationWaypoint, deliverQuestCargoRequirement } from "../src/gameState.js";
import { readLocalSave } from "../src/localSave.js";
import { PORT_CATALOG_VERSION } from "../src/portCatalogMigration.js";
import { createCrewMember } from "../src/crewMembers.js";
import { cityRecruitableCrewAppearances } from "../city-visualizer/cityPeople.js";
import { characterWithBiography } from "../src/characterBiography.js";
import { maybeSpawnChefQuest, prepareChefBanquet, serveChefBanquet, completeChefBanquet } from "../src/chefQuest.js";
import { COLONIZATION_TARGETS } from "../src/colonialCities.js";
import { colonizationHistoryForTarget } from "../src/colonizationHistory.js";
import {
  assignColonizationQuest, beginColonizationExpedition, completeColonizationFetchStage,
  createColonizationQuestMemory, establishColony, landColonists, advanceColonizationAftermaths,
  commissionColonizationAftermath, inspectColonizationAftermath, advanceColonizationQuest
} from "../src/colonizationQuest.js";
import { gameplayReachabilityScenarioIds } from "../src/gameplayReachabilityScenarios.js";

const DENSE_RUNTIME_PLAYER_CHARACTER = Object.freeze(characterWithBiography({
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
  expressions: Object.freeze(["neutral", "happy"])
}));

const require = createRequire(import.meta.url);
const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST_ROOT = path.join(APP_ROOT, "dist");
const FIXTURE_ROOT = path.join(APP_ROOT, "src/test-fixtures/saves");
const RESTORE_TIMEOUT_MS = 10 * 60 * 1000;
const CITY_VISUALIZER_TIMEOUT_MS = 60 * 1000;
const GAMEPLAY_SCENARIO_TIMEOUT_MS = 10 * 60 * 1000;
const GAMEPLAY_SEQUENCE_KINDS = new Set(["sail", "fight", "pillage", "colonize", "whale", "city"]);
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
  // Simulate catalogs changing underneath a cached JavaScript release. The
  // production bundles must contain their own compatible data and never ask
  // these unversioned endpoints for a later deployment's city definitions.
  const catalogRequests = [];
  await context.route(/\/(?:assets\/data\/(?:land-roads|port-sailing-distances)\.json|city-visualizer\/data\/cities\.json|shared\/datasets\/urbanization-dominance-pruned\/urbanization-dominance-pruned\.csv)(?:\?|$)/, (route) => {
    catalogRequests.push(route.request().url());
    return route.abort("failed");
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
  await exerciseSenegambiaCityPreviews(page, browserErrors);

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
  await exerciseCrewManagementSaveRoundTrips(page, browserErrors);
  await exerciseDjenneSaveRoundTrips(page, browserErrors);
  await exerciseColonySaveRoundTrips(page, browserErrors);
  await exerciseChefSaveRoundTrips(page, browserErrors);

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
  if (catalogRequests.length) throw new Error(`Production loaded mutable city catalogs: ${catalogRequests.join(", ")}`);
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
  let previousWhaleMotion = null;
  let earlierWhaleMotion = null;
  let movingTowFrames = 0;
  for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
    const frame = await page.evaluate((index) => window.__PIXEL_GLOBE_CAPTURE_STEP__(index), frameIndex);
    if (scenario.sequence.kind === "whale") {
      const motion = frame.whaleMotion;
      if (!motion || !Number.isFinite(motion.lifeSeconds) || !Number.isFinite(motion.timeMs)) {
        throw new Error(`${scenarioId} omitted its whale motion evidence`);
      }
      if (previousWhaleMotion?.phase === "tethered" && motion.phase === "tethered") {
        const elapsedSeconds = (motion.timeMs - previousWhaleMotion.timeMs) / 1000;
        const movementSeconds = motion.lifeSeconds - previousWhaleMotion.lifeSeconds;
        if (movementSeconds > elapsedSeconds + 1e-7) {
          throw new Error(`${scenarioId} batched ${movementSeconds}s of tow movement into a ${elapsedSeconds}s frame`);
        }
        if (movementSeconds > 0) movingTowFrames++;
      }
      if (scenario.sequence.variant === "harpoon" &&
          [earlierWhaleMotion, previousWhaleMotion, motion].every((sample) =>
            sample?.phase === "tethered" && sample.destination)) {
        const a = earlierWhaleMotion.destination;
        const b = previousWhaleMotion.destination;
        const c = motion.destination;
        // Allow a single pixel at a raster boundary, but reject the several-pixel
        // back-and-forth caused by a whale and player advancing on different clocks.
        if ((c.x - b.x) * (b.x - a.x) + (c.y - b.y) * (b.y - a.y) < -1) {
          throw new Error(`${scenarioId} reversed its rendered tow motion on consecutive frames`);
        }
      }
      earlierWhaleMotion = previousWhaleMotion;
      previousWhaleMotion = motion;
    }
    if (scenario.sequence.kind === "colonize" && scenario.sequence.variant === "found" && frameIndex === 210) {
      // Neither a repeated confirmation nor Escape may interrupt the landing
      // and apply a hidden resupply action or close its port scene.
      await page.keyboard.press("Enter");
      await page.keyboard.press("Escape");
    }
    const shouldBeComplete = frameIndex === frameCount - 1;
    if (
      frame?.frameIndex !== frameIndex ||
      frame?.totalFrames !== frameCount ||
      frame?.complete !== shouldBeComplete
    ) {
      throw new Error(`${scenarioId} returned malformed deterministic frame ${frameIndex}`);
    }
  }
  if (scenario.sequence.kind === "whale" && movingTowFrames < 10) {
    throw new Error(`${scenarioId} exercised only ${movingTowFrames} moving tow frames`);
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
  if (scenario.sequence.variant === "chef-feast") {
    const cuts = sidecar.events.filter((event) => event.type === "chef-feast-time-cut");
    if (cuts.length !== 2 || cuts[0].data.phase !== "served" || cuts[1].data.phase !== "afterwards" ||
        cuts[1].data.minute <= cuts[0].data.minute ||
        !sidecar.events.some((event) => event.type === "chef-feast-guests-gathered") ||
        !sidecar.events.some((event) => event.type === "chef-feast-recruited")) {
      throw new Error(`${scenario.id} failed its sunset feast, night aftermath, or recruitment`);
    }
    return `feast clock advanced ${Math.round(cuts[1].data.minute - cuts[0].data.minute)} minutes into night`;
  }
  if (scenario.sequence.kind === "colonize") {
    const cityId = scenario.sequence.cityId;
    const sceneEvents = sidecar.events.filter((event) =>
      event.type === "colony-scene-ready" && event.data.cityId === cityId);
    const stages = new Set(sceneEvents.map((event) => event.data.settlementStage));
    const requiredStages = scenario.sequence.variant === "found" ? ["uninhabited"] :
      scenario.sequence.variant === "resupply" ? ["colony", "city"] :
      ["investigate", "ruins"].includes(scenario.sequence.variant) ? ["ruins"] : ["city"];
    for (const stage of requiredStages) {
      if (!stages.has(stage)) throw new Error(`${scenario.id} never rendered the ${stage} colony stage`);
    }
    if (scenario.sequence.variant === "investigate") {
      const clueEvents = sidecar.events.filter((event) => event.type === "roanoke-clue-inspected");
      if (clueEvents.length !== 1 || clueEvents[0].data.sceneReady !== true ||
          !sidecar.events.some((event) => event.type === "roanoke-ruins-arrival") ||
          !sidecar.events.some((event) => event.type === "roanoke-investigation-departed")) {
        throw new Error(`${scenario.id} failed its visible investigation, clue click, or return to ship`);
      }
    }
    if (scenario.sequence.variant === "found") {
      const arrivals = sidecar.events.filter((event) => event.type === "colony-proximity-arrival" && event.data.cityId === cityId);
      if (arrivals.length !== 1) throw new Error(`${scenario.id} did not automatically arrive exactly once`);
      const ashore = sidecar.events.filter((event) => event.type === "colonists-ashore" && event.data.cityId === cityId);
      if (ashore.length !== 1) throw new Error(`${scenario.id} did not complete exactly one colonist landing`);
      if (stages.has("colony")) throw new Error(`${scenario.id} built homes during the founding visit`);
    }
    return `colony stages: ${[...stages].join(", ")}`;
  }
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

async function exerciseSenegambiaCityPreviews(page, browserErrors) {
  await page.locator("#drawer").evaluate((drawer) => { drawer.open = true; });
  for (const [cityId, label] of [["dienne|senegal", "Djenne"], ["rufisque|senegal", "Rufisque"]]) {
    await page.locator("#city-select").selectOption(cityId);
    await page.waitForFunction((label) => document.querySelector("#scene")?.getAttribute("aria-label")?.startsWith(label), label);
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await assertNoBrowserFailure(page, browserErrors, `${label} city scene`);
  }
  await page.locator("#drawer").evaluate((drawer) => { drawer.open = false; });
  process.stdout.write("  Djenne and Rufisque city scenes rendered with their catalog labels.\n");
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

async function exerciseDjenneSaveRoundTrips(page, browserErrors) {
  const source = fixtures.find((fixture) => fixture.gameStateVersion === GAME_STATE_VERSION);
  const save = JSON.parse(source.serialized);
  save.payload.portCatalogVersion = 3;
  addPortNavigationWaypoint(save.payload.gameState, {
    destinationCityId: "dienne|senegal", destinationTileId: 636087,
    destinationName: "Dienne", reason: "PLAYER HEADING"
  });
  let serialized = JSON.stringify(save);
  for (let pass = 0; pass < 3; pass++) {
    const restored = await withTimeout(page.evaluate((serialized) =>
      window.__PIXEL_GLOBE_SAVE_RESTORE_SMOKE__.restoreSerialized(serialized), serialized),
    RESTORE_TIMEOUT_MS, `Djenne save/load ${pass + 1}`);
    await assertNoBrowserFailure(page, browserErrors, "Djenne save/load");
    const saved = readLocalSave({ storage: { getItem: () => restored.serialized } });
    if (saved.status !== "ready") throw saved.error;
    const waypoint = saved.save.payload.gameState.memory.navigation.optionalWaypoints
      .find(({ destinationCityId }) => destinationCityId === "dienne|senegal");
    if (saved.save.payload.portCatalogVersion !== PORT_CATALOG_VERSION ||
        waypoint?.destinationTileId !== 162642 || waypoint.destinationName !== "Djenne") {
      throw new Error(`Djenne save/load did not preserve the corrected waypoint: ${JSON.stringify(waypoint)}`);
    }
    serialized = restored.serialized;
  }
  process.stdout.write("  Djenne: three save/load round trips preserved the corrected city reference.\n");
}

async function exerciseCrewManagementSaveRoundTrips(page, browserErrors) {
  const source = fixtures.find((fixture) => fixture.gameStateVersion === GAME_STATE_VERSION);
  const save = JSON.parse(source.serialized);
  const cities = JSON.parse(readFileSync(path.join(APP_ROOT, "city-visualizer/data/cities.json"), "utf8")).cities;
  const origins = [
    ["naha|japan", "ryukyuan", "kami-buddhist", "ronin"],
    ["akkeshi kotan|japan", "ainu", "ainu-traditional", "hunter"],
    ["hafnarfjordur|iceland", "icelandic", "roman-catholic", "sailor"]
  ];
  const extraCrew = Math.max(0, origins.length - save.payload.gameState.crewRoster.length);
  save.payload.gameState.ship.crew += extraCrew;
  if (save.payload.gameState.ship.crew > save.payload.gameState.ship.crewCapacity) throw new Error("Crew smoke fixture has too few berths");
  for (const [index, [cityId, nameCulture, religionId, crewTypeId]] of origins.entries()) {
    const city = cities.find((entry) => entry.cityId === cityId);
    const appearance = cityRecruitableCrewAppearances(city).find((entry) => entry.crewTypeId === crewTypeId);
    if (!appearance) throw new Error(`Crew smoke origin has no ${crewTypeId}: ${cityId}`);
    save.payload.gameState.crewRoster[index] = createCrewMember({
      id: `crew-smoke:${nameCulture}`, name: `Crew ${index + 1}`, nameCulture, religionId,
      nationalityId: city.factionId, homePort: city, ...appearance, recruitedAtMinute: 0
    });
  }
  let serialized = JSON.stringify(save);
  for (let pass = 0; pass < 2; pass++) {
    const restored = await page.evaluate((serialized) =>
      window.__PIXEL_GLOBE_SAVE_RESTORE_SMOKE__.restoreSerialized(serialized), serialized);
    const inspected = await page.evaluate(() => window.__PIXEL_GLOBE_SAVE_RESTORE_SMOKE__.inspectCrew());
    await assertNoBrowserFailure(page, browserErrors, "crew management after save/load");
    for (const [, culture] of origins) {
      if (!inspected.some((entry) => entry.id === `crew-smoke:${culture}` && entry.culture === culture)) {
        throw new Error(`Crew management lost the saved ${culture} recruit`);
      }
    }
    serialized = restored.serialized;
  }
  process.stdout.write("  Ryukyuan ronin, Ainu hunter and Icelandic sailor: saved, loaded and inspected in the crew menu twice.\n");
}

async function exerciseColonySaveRoundTrips(page, browserErrors) {
  const source = fixtures.find((fixture) => fixture.gameStateVersion === GAME_STATE_VERSION);
  const cities = JSON.parse(readFileSync(path.join(APP_ROOT, "city-visualizer/data/cities.json"), "utf8")).cities;
  for (const [cityId, originCityId, legacyTileId] of [
    ["lima|peru", "seville|spain"], ["port royal|canada", "bordeaux|france"],
    ["asuncion|paraguay", "seville|spain", 431742],
    ["roanoke|united states of america", "london|united kingdom"]
  ]) {
    const target = COLONIZATION_TARGETS.find((city) => city.cityId === cityId);
    const placement = cities.find((city) => city.cityId === target.cityId);
    const origin = cities.find((city) => city.cityId === originCityId);
    const stages = cityId === "roanoke|united states of america"
      ? ["investigating", "reporting", "failed"] : ["awaiting-resupply", "established"];
    for (const stage of stages) {
      const save = JSON.parse(source.serialized);
      const memory = createColonizationQuestMemory();
      assignColonizationQuest(memory, { target: { ...target, tileId: placement.tileId }, origin });
      for (const fetch of colonizationHistoryForTarget(target).fetchStages) {
        completeColonizationFetchStage(memory, fetch.id);
      }
      beginColonizationExpedition(memory);
      landColonists(memory, Math.floor(save.payload.worldClock.currentMinute));
      if (["established", "investigating", "reporting"].includes(stage)) {
        establishColony(memory, Math.floor(save.payload.worldClock.currentMinute));
      }
      if (["investigating", "reporting"].includes(stage)) {
        const minute = memory.aftermath.dueMinute + 1;
        save.payload.worldClock.currentMinute = minute;
        advanceColonizationAftermaths(memory, minute, { isTileVisible: () => false });
        commissionColonizationAftermath(memory, origin, minute);
        if (stage === "reporting") inspectColonizationAftermath(memory, target, minute);
      } else if (stage === "failed") {
        const minute = memory.resupplyDeadlineMinute + 1;
        save.payload.worldClock.currentMinute = minute;
        advanceColonizationQuest(memory, minute, { awayFromColony: true });
      }
      save.payload.gameState.memory.colonization = legacyTileId === undefined
        ? memory : { ...memory, targetTileId: legacyTileId };
      if (legacyTileId !== undefined) save.payload.portCatalogVersion = 2;
      let serialized = JSON.stringify(save);
      // The second restore sees a port promoted by the first restore. Read the
      // actual newly written save each time, so this covers saving as well as load.
      for (let pass = 0; pass < 3; pass++) {
        const restored = await withTimeout(page.evaluate((serialized) =>
          window.__PIXEL_GLOBE_SAVE_RESTORE_SMOKE__.restoreSerialized(serialized), serialized),
        RESTORE_TIMEOUT_MS, `${stage} colony save/load ${pass + 1}`);
        await assertNoBrowserFailure(page, browserErrors, `${stage} colony save/load`);
        if (JSON.stringify(restored.colonization) !== JSON.stringify(memory)) {
          const changedFields = Object.keys(memory).filter((key) =>
            JSON.stringify(restored.colonization[key]) !== JSON.stringify(memory[key]));
          throw new Error(`${stage} colony save/load changed the colony's persistent history: ` +
            JSON.stringify(changedFields.map((key) => ({ key, expected: memory[key], actual: restored.colonization[key] }))));
        }
        if (typeof restored.serialized !== "string" || restored.serialized.length === 0) {
          throw new Error(`${stage} colony did not write a save`);
        }
        serialized = restored.serialized;
      }
      process.stdout.write(`  ${target.city} ${stage}: three save/load round trips preserved colony history.\n`);
    }
  }
}

async function exerciseChefSaveRoundTrips(page, browserErrors) {
  const source = fixtures.find((fixture) => fixture.gameStateVersion === GAME_STATE_VERSION);
  const cities = JSON.parse(readFileSync(path.join(APP_ROOT, "city-visualizer/data/cities.json"), "utf8")).cities;
  const city = cities.find((city) => city.cityId === "lisbon|portugal");
  for (const stage of ["preparing", "feasting", "recruitment"]) {
    const save = JSON.parse(source.serialized);
    const state = save.payload.gameState;
    const quest = maybeSpawnChefQuest(state, city, { spawnChance: 1 });
    for (const ingredient of quest.ingredients) {
      state.cargo[ingredient.goodId] = 1;
      deliverQuestCargoRequirement(state, city, ingredient.goodId, 1, ingredient.requirementId);
    }
    prepareChefBanquet(state, city);
    if (stage !== "preparing") serveChefBanquet(state, city, 120);
    if (stage === "recruitment") completeChefBanquet(state, city, 300);
    const expected = JSON.stringify(state.memory.quests.chef);
    let serialized = JSON.stringify(save);
    for (let pass = 0; pass < 2; pass++) {
      const restored = await withTimeout(page.evaluate((serialized) =>
        window.__PIXEL_GLOBE_SAVE_RESTORE_SMOKE__.restoreSerialized(serialized), serialized),
        RESTORE_TIMEOUT_MS, `${stage} feast save/load ${pass + 1}`);
      await assertNoBrowserFailure(page, browserErrors, `${stage} feast save/load`);
      if (JSON.stringify(restored.chef) !== expected) throw new Error(`${stage} feast save/load changed quest history`);
      if (typeof restored.serialized !== "string") throw new Error(`${stage} feast did not write a save`);
      serialized = restored.serialized;
    }
    process.stdout.write(`  Chef ${stage}: two save/load round trips preserved feast history.\n`);
  }
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
