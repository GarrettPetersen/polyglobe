import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  assertCaptureServerReady,
  collectCapturePageErrors,
  launchCaptureBrowser
} from "./capture-browser.mjs";
import {
  STEAM_SCREENSHOT_HEIGHT,
  STEAM_SCREENSHOT_LANGUAGES,
  STEAM_SCREENSHOT_SHOTS,
  STEAM_SCREENSHOT_WIDTH,
  steamScreenshotFileName
} from "./steam-screenshot-catalog.mjs";

const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = parseArgs(process.argv.slice(2));
const shots = selectById(STEAM_SCREENSHOT_SHOTS, args.shots, "shot");
const languages = selectById(STEAM_SCREENSHOT_LANGUAGES, args.languages, "language");
const outputRoot = path.resolve(APP_ROOT, args.output);

await mkdir(outputRoot, { recursive: true });
await assertCaptureServerReady(args.baseUrl);
const browser = await launchCaptureBrowser({ headless: args.headless });
const results = [];
try {
  let nextShotIndex = 0;
  const workerCount = Math.min(args.jobs, shots.length);
  await Promise.all(Array.from({ length: workerCount }, async () => {
    while (nextShotIndex < shots.length) {
      const shotIndex = nextShotIndex;
      nextShotIndex += 1;
      const shot = shots[shotIndex];
      process.stdout.write(`[${shotIndex + 1}/${shots.length}] ${shot.id}\n`);
      results.push(...await captureLocalizedScreenshots(browser, shot));
    }
  }));
} finally {
  await browser.close();
}

const manifest = {
  version: 1,
  dimensions: { width: STEAM_SCREENSHOT_WIDTH, height: STEAM_SCREENSHOT_HEIGHT },
  captureMethod: "deterministic-frame-step",
  languages: languages.map(({ id, label, nativeLabel, steamCode }) => ({
    id,
    label,
    nativeLabel,
    steamCode
  })),
  shots: shots.map(({ order, id, title, scenarioId, atSeconds, frameIndex }) => ({
    order,
    id,
    title,
    scenarioId,
    atSeconds,
    frameIndex,
    files: Object.fromEntries(languages.map((language) => [
      language.steamCode,
      steamScreenshotFileName(
        { order, id },
        language
      )
    ]))
  }))
};
await writeFile(path.join(outputRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

for (const result of results) {
  if (result.width !== STEAM_SCREENSHOT_WIDTH || result.height !== STEAM_SCREENSHOT_HEIGHT) {
    throw new Error(`${result.fileName} has invalid dimensions after capture`);
  }
}
process.stdout.write(
  `Steam screenshots: ${results.length} files in ${outputRoot}\n` +
  `Manifest: ${path.join(outputRoot, "manifest.json")}\n`
);

async function captureLocalizedScreenshots(browser, shot) {
  const context = await browser.newContext({
    viewport: { width: STEAM_SCREENSHOT_WIDTH, height: STEAM_SCREENSHOT_HEIGHT },
    deviceScaleFactor: 1
  });
  const page = await context.newPage();
  const errors = [];
  collectCapturePageErrors(page, errors);
  const failureName = `.${String(shot.order).padStart(2, "0")}_${shot.id}.failure.png`;
  try {
    await page.goto(captureUrl(shot.scenarioId, languages[0].id), {
      waitUntil: "domcontentloaded",
      timeout: args.loadTimeoutMs
    });
    await page.waitForFunction(() => (
      window.__PIXEL_GLOBE_CAPTURE_READY__ === true ||
      typeof window.__PIXEL_GLOBE_CAPTURE_ERROR__ === "string"
    ), null, { timeout: args.captureTimeoutMs });
    const state = await page.evaluate(() => ({
      error: window.__PIXEL_GLOBE_CAPTURE_ERROR__ || null,
      language: document.documentElement.lang,
      frameCount: window.__PIXEL_GLOBE_CAPTURE_TOTAL_FRAMES__,
      canSwitchLanguage: typeof window.__PIXEL_GLOBE_CAPTURE_SET_LANGUAGE__ === "function"
    }));
    if (state.error) throw new Error(state.error);
    if (state.language !== languages[0].id) {
      throw new Error(`Expected locale ${languages[0].id}, game loaded ${state.language}`);
    }
    if (!state.canSwitchLanguage) throw new Error("Capture language switch is unavailable");
    if (!Number.isInteger(state.frameCount) || shot.frameIndex >= state.frameCount) {
      throw new Error(`${shot.id} cannot capture frame ${shot.frameIndex}/${state.frameCount}`);
    }
    for (let frameIndex = 0; frameIndex <= shot.frameIndex; frameIndex += 1) {
      const frame = await page.evaluate((index) => window.__PIXEL_GLOBE_CAPTURE_STEP__(index), frameIndex);
      if (frame?.frameIndex !== frameIndex || frame?.totalFrames !== state.frameCount) {
        throw new Error(`${shot.id} returned malformed deterministic frame ${frameIndex}`);
      }
    }
    const shotResults = [];
    for (const language of languages) {
      const activeLanguage = await page.evaluate(async (languageId) => {
        window.__PIXEL_GLOBE_CAPTURE_SET_LANGUAGE__(languageId);
        await document.fonts.ready;
        return window.__PIXEL_GLOBE_CAPTURE_SET_LANGUAGE__(languageId);
      }, language.id);
      if (activeLanguage !== language.id) {
        throw new Error(`Expected locale ${language.id}, game rendered ${activeLanguage}`);
      }
      const fileName = steamScreenshotFileName(shot, language);
      const outputPath = path.join(outputRoot, fileName);
      await page.locator("#view").screenshot({
        path: outputPath,
        type: "png",
        animations: "disabled"
      });
      const dimensions = pngDimensions(await readFile(outputPath));
      if (dimensions.width !== STEAM_SCREENSHOT_WIDTH || dimensions.height !== STEAM_SCREENSHOT_HEIGHT) {
        throw new Error(
          `${fileName} is ${dimensions.width}x${dimensions.height}; expected ` +
          `${STEAM_SCREENSHOT_WIDTH}x${STEAM_SCREENSHOT_HEIGHT}`
        );
      }
      shotResults.push({ fileName, ...dimensions });
      process.stdout.write(`  ${language.steamCode}\n`);
    }
    if (errors.length > 0) {
      throw new Error(`Browser errors while capturing ${shot.id}:\n${errors.join("\n")}`);
    }
    return shotResults;
  } catch (error) {
    const failurePath = path.join(outputRoot, failureName);
    await page.screenshot({ path: failurePath, fullPage: true });
    throw new Error(`${shot.id} failed: ${error.message}\nScreenshot: ${failurePath}`);
  } finally {
    await context.close();
  }
}

function captureUrl(scenarioId, languageId) {
  const params = new URLSearchParams({
    capture: scenarioId,
    captureFormat: "steam",
    autocapture: "frames",
    lang: languageId
  });
  return `${args.baseUrl}/?${params}`;
}

function pngDimensions(data) {
  const pngSignature = "89504e470d0a1a0a";
  if (data.length < 24 || data.subarray(0, 8).toString("hex") !== pngSignature ||
      data.subarray(12, 16).toString("ascii") !== "IHDR") {
    throw new Error("Steam screenshot is not a valid PNG");
  }
  return {
    width: data.readUInt32BE(16),
    height: data.readUInt32BE(20)
  };
}

function selectById(catalog, requestedIds, label) {
  if (requestedIds.length === 0) return catalog;
  const selected = requestedIds.map((id) => catalog.find((entry) => entry.id === id));
  const missing = requestedIds.filter((_, index) => !selected[index]);
  if (missing.length > 0) throw new Error(`Unknown Steam screenshot ${label}s: ${missing.join(", ")}`);
  return selected;
}

function parseArgs(argv) {
  const parsed = {
    baseUrl: "http://127.0.0.1:5184",
    output: "promotional-materials/steam-screenshots",
    shots: [],
    languages: [],
    jobs: 2,
    headless: true,
    loadTimeoutMs: 120_000,
    captureTimeoutMs: 120_000
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--base-url") parsed.baseUrl = requiredValue(argv, ++index, arg).replace(/\/$/, "");
    else if (arg === "--output") parsed.output = requiredValue(argv, ++index, arg);
    else if (arg === "--shots") parsed.shots = commaList(requiredValue(argv, ++index, arg));
    else if (arg === "--languages") parsed.languages = commaList(requiredValue(argv, ++index, arg));
    else if (arg === "--jobs") parsed.jobs = Number(requiredValue(argv, ++index, arg));
    else if (arg === "--headed") parsed.headless = false;
    else throw new Error(`Unknown Steam screenshot capture argument: ${arg}`);
  }
  if (!Number.isInteger(parsed.jobs) || parsed.jobs < 1 || parsed.jobs > 4) {
    throw new Error(`--jobs must be an integer from 1 to 4, got ${parsed.jobs}`);
  }
  return parsed;
}

function commaList(value) {
  return value.split(",").map((entry) => entry.trim()).filter(Boolean);
}

function requiredValue(argv, index, flag) {
  const value = argv[index];
  if (!value || value.startsWith("--")) throw new Error(`${flag} requires a value`);
  return value;
}
