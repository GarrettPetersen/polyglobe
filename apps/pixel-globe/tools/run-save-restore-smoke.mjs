import { createServer } from "node:http";
import { createReadStream, existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { GAME_STATE_VERSION } from "../src/gameState.js";

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
  const browserErrors = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
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
  await context.close();
} finally {
  await browser.close();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
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
      const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
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
