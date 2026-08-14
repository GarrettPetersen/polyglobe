import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
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
  STEAM_SCREENSHOT_LOGICAL_HEIGHT,
  STEAM_SCREENSHOT_LOGICAL_WIDTH,
  STEAM_SCREENSHOT_SHOTS,
  STEAM_SCREENSHOT_WIDTH,
  steamScreenshotFileName
} from "./steam-screenshot-catalog.mjs";
import { localizeText } from "../src/localization.js";
import { integerPixelScaleForDimensions } from "../src/screenshotExport.js";

const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = parseArgs(process.argv.slice(2));
const shots = selectById(STEAM_SCREENSHOT_SHOTS, args.shots, "shot");
const languages = selectById(STEAM_SCREENSHOT_LANGUAGES, args.languages, "language");
const outputRoot = path.resolve(APP_ROOT, args.output);
const manifestPath = path.join(outputRoot, "manifest.json");

await mkdir(outputRoot, { recursive: true });
await removeStaleFailureScreenshots(outputRoot);
if (args.manifestOnly) {
  if (args.shots.length > 0 || args.languages.length > 0) {
    throw new Error("--manifest-only always validates the complete catalog");
  }
  const manifest = steamScreenshotManifest(
    STEAM_SCREENSHOT_SHOTS,
    STEAM_SCREENSHOT_LANGUAGES
  );
  await validateManifestFiles(manifest);
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  process.stdout.write(`Validated complete Steam screenshot manifest: ${manifestPath}\n`);
} else {
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

  const capturedManifest = steamScreenshotManifest(shots, languages);
  const existingManifest = await readExistingManifest(manifestPath);
  const manifest = mergeSteamScreenshotManifests(existingManifest, capturedManifest);
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  for (const result of results) {
    if (result.width !== STEAM_SCREENSHOT_WIDTH || result.height !== STEAM_SCREENSHOT_HEIGHT) {
      throw new Error(`${result.fileName} has invalid dimensions after capture`);
    }
  }
  process.stdout.write(
    `Steam screenshots: ${results.length} files in ${outputRoot}\n` +
    `Manifest: ${manifestPath}\n`
  );
}

function steamScreenshotManifest(manifestShots, manifestLanguages) {
  return {
    version: 1,
    dimensions: { width: STEAM_SCREENSHOT_WIDTH, height: STEAM_SCREENSHOT_HEIGHT },
    captureMethod: "deterministic-logical-canvas",
    languages: manifestLanguages.map(({ id, label, nativeLabel, steamCode }) => ({
      id,
      label,
      nativeLabel,
      steamCode
    })),
    shots: manifestShots.map(({ order, id, title, scenarioId, atSeconds, frameIndex }) => ({
      order,
      id,
      title,
      scenarioId,
      atSeconds,
      frameIndex,
      files: Object.fromEntries(manifestLanguages.map((language) => [
        language.steamCode,
        steamScreenshotFileName({ order, id }, language)
      ]))
    }))
  };
}

async function validateManifestFiles(manifest) {
  for (const shot of manifest.shots) {
    for (const fileName of Object.values(shot.files)) {
      let dimensions;
      try {
        dimensions = pngDimensions(await readFile(path.join(outputRoot, fileName)));
      } catch (error) {
        throw new Error(`Invalid Steam screenshot ${fileName}: ${error.message}`);
      }
      if (dimensions.width !== manifest.dimensions.width || dimensions.height !== manifest.dimensions.height) {
        throw new Error(
          `${fileName} is ${dimensions.width}x${dimensions.height}; expected ` +
          `${manifest.dimensions.width}x${manifest.dimensions.height}`
        );
      }
    }
  }
}

async function readExistingManifest(manifestPath) {
  try {
    return JSON.parse(await readFile(manifestPath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw new Error(`Could not read existing Steam screenshot manifest: ${error.message}`);
  }
}

function mergeSteamScreenshotManifests(existing, captured) {
  if (!existing) return captured;
  if (
    existing.version !== captured.version ||
    existing.captureMethod !== captured.captureMethod ||
    existing.dimensions?.width !== captured.dimensions.width ||
    existing.dimensions?.height !== captured.dimensions.height ||
    !Array.isArray(existing.languages) ||
    !Array.isArray(existing.shots)
  ) {
    throw new Error("Existing Steam screenshot manifest is incompatible with this capture");
  }

  const languageById = new Map(existing.languages.map((language) => [language.id, language]));
  for (const language of captured.languages) languageById.set(language.id, language);

  const shotById = new Map(existing.shots.map((shot) => [shot.id, shot]));
  for (const shot of captured.shots) {
    const previous = shotById.get(shot.id);
    shotById.set(shot.id, {
      ...shot,
      files: { ...(previous?.files || {}), ...shot.files }
    });
  }

  return {
    ...captured,
    languages: STEAM_SCREENSHOT_LANGUAGES
      .map(({ id }) => languageById.get(id))
      .filter(Boolean),
    shots: STEAM_SCREENSHOT_SHOTS
      .map(({ id }) => shotById.get(id))
      .filter(Boolean)
  };
}

async function captureLocalizedScreenshots(browser, shot) {
  const context = await browser.newContext({
    viewport: { width: STEAM_SCREENSHOT_WIDTH, height: STEAM_SCREENSHOT_HEIGHT },
    deviceScaleFactor: 1
  });
  const page = await context.newPage();
  const errors = [];
  collectCapturePageErrors(page, errors);
  const failureName = `.${String(shot.order).padStart(2, "0")}_${shot.id}.failure.png`;
  await removeStaleFailureScreenshot(path.join(outputRoot, failureName));
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
      canSwitchLanguage: typeof window.__PIXEL_GLOBE_CAPTURE_SET_LANGUAGE__ === "function",
      canExportScreenshot: typeof window.__PIXEL_GLOBE_CAPTURE_SCREENSHOT__ === "function"
    }));
    if (state.error) throw new Error(state.error);
    if (state.language !== languages[0].id) {
      throw new Error(`Expected locale ${languages[0].id}, game loaded ${state.language}`);
    }
    if (!state.canSwitchLanguage) throw new Error("Capture language switch is unavailable");
    if (!state.canExportScreenshot) throw new Error("Pixel-perfect screenshot export is unavailable");
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
      const renderedText = await page.evaluate(() => window.__PIXEL_GLOBE_CAPTURE_RENDERED_TEXT__ || []);
      const untranslated = renderedText.filter(({ source, rendered }) => (
        source === rendered && (
          localizeText(language.id, source) !== source ||
          isSubstantiveEnglishScreenText(source)
        )
      ));
      if (language.id !== "en" && untranslated.length > 0) {
        throw new Error(
          `${language.id} rendered English-only screen text:\n` +
          untranslated.map(({ source }) => `  ${source}`).join("\n")
        );
      }
      const fileName = steamScreenshotFileName(shot, language);
      const outputPath = path.join(outputRoot, fileName);
      const scale = integerPixelScaleForDimensions({
        sourceWidth: STEAM_SCREENSHOT_LOGICAL_WIDTH,
        sourceHeight: STEAM_SCREENSHOT_LOGICAL_HEIGHT,
        targetWidth: STEAM_SCREENSHOT_WIDTH,
        targetHeight: STEAM_SCREENSHOT_HEIGHT
      });
      const capture = await page.evaluate(
        (pixelScale) => window.__PIXEL_GLOBE_CAPTURE_SCREENSHOT__(pixelScale),
        scale
      );
      assertPixelPerfectCapture(capture, scale, fileName);
      await writeFile(outputPath, pngDataUrlBytes(capture.dataUrl));
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
    const actionableErrors = errors.filter((message) => !isIgnorableStillCaptureBrowserError(message));
    if (actionableErrors.length > 0) {
      throw new Error(`Browser errors while capturing ${shot.id}:\n${actionableErrors.join("\n")}`);
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

function isIgnorableStillCaptureBrowserError(message) {
  return /^The AudioContext encountered an error from the audio device or the WebAudio renderer\.?$/.test(
    String(message).trim()
  );
}

function assertPixelPerfectCapture(capture, scale, fileName) {
  if (
    capture?.logicalWidth !== STEAM_SCREENSHOT_LOGICAL_WIDTH ||
    capture?.logicalHeight !== STEAM_SCREENSHOT_LOGICAL_HEIGHT ||
    capture?.width !== STEAM_SCREENSHOT_WIDTH ||
    capture?.height !== STEAM_SCREENSHOT_HEIGHT ||
    capture?.scale !== scale
  ) {
    throw new Error(`${fileName} returned malformed pixel-perfect capture geometry`);
  }
}

function pngDataUrlBytes(dataUrl) {
  const prefix = "data:image/png;base64,";
  if (typeof dataUrl !== "string" || !dataUrl.startsWith(prefix)) {
    throw new Error("Pixel-perfect screenshot export did not return a PNG data URL");
  }
  return Buffer.from(dataUrl.slice(prefix.length), "base64");
}

function isSubstantiveEnglishScreenText(value) {
  if (typeof value !== "string" || !/\s/.test(value)) return false;
  if (/MARQUE-AND-REPRISAL\.COM/i.test(value)) return false;
  if (/\b(?:Dogica|Galmuri11)\b/.test(value)) return false;
  const englishGrammarWords = new Set([
    "and", "are", "at", "can", "could", "for", "from", "has", "have",
    "in", "into", "is", "of", "on", "our", "should", "that", "the", "this", "to",
    "was", "we", "were", "will", "with", "you", "your"
  ]);
  const words = (value.match(/[A-Za-z]+/g) || []).map((word) => word.toLowerCase());
  return new Set(words.filter((word) => englishGrammarWords.has(word))).size >= 2;
}

async function removeStaleFailureScreenshot(failurePath) {
  try {
    await unlink(failurePath);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

async function removeStaleFailureScreenshots(directory) {
  const entries = await readdir(directory);
  await Promise.all(entries
    .filter((entry) => /^\..+\.failure\.png$/.test(entry))
    .map((entry) => removeStaleFailureScreenshot(path.join(directory, entry))));
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
    captureTimeoutMs: 120_000,
    manifestOnly: false
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--base-url") parsed.baseUrl = requiredValue(argv, ++index, arg).replace(/\/$/, "");
    else if (arg === "--output") parsed.output = requiredValue(argv, ++index, arg);
    else if (arg === "--shots") parsed.shots = commaList(requiredValue(argv, ++index, arg));
    else if (arg === "--languages") parsed.languages = commaList(requiredValue(argv, ++index, arg));
    else if (arg === "--jobs") parsed.jobs = Number(requiredValue(argv, ++index, arg));
    else if (arg === "--load-timeout-ms") parsed.loadTimeoutMs = Number(requiredValue(argv, ++index, arg));
    else if (arg === "--capture-timeout-ms") {
      parsed.captureTimeoutMs = Number(requiredValue(argv, ++index, arg));
    }
    else if (arg === "--manifest-only") parsed.manifestOnly = true;
    else if (arg === "--headed") parsed.headless = false;
    else throw new Error(`Unknown Steam screenshot capture argument: ${arg}`);
  }
  if (!Number.isInteger(parsed.jobs) || parsed.jobs < 1 || parsed.jobs > 4) {
    throw new Error(`--jobs must be an integer from 1 to 4, got ${parsed.jobs}`);
  }
  for (const [flag, value] of [
    ["--load-timeout-ms", parsed.loadTimeoutMs],
    ["--capture-timeout-ms", parsed.captureTimeoutMs]
  ]) {
    if (!Number.isInteger(value) || value < 1) {
      throw new Error(`${flag} must be a positive integer, got ${value}`);
    }
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
