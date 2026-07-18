import { execFileSync, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { AUTOMATIC_CAPTURE_FRAME_RATE } from "../src/captureDirector.js";
import { captureScenarioIds } from "../src/captureScenarios.js";

const require = createRequire(import.meta.url);
const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CAPTURE_FORMATS = Object.freeze({
  shorts: Object.freeze({
    queryValue: "shorts",
    logicalWidth: 270,
    logicalHeight: 480,
    outputWidth: 1080,
    outputHeight: 1920
  }),
  steam: Object.freeze({
    queryValue: "steam",
    logicalWidth: 480,
    logicalHeight: 270,
    outputWidth: 1920,
    outputHeight: 1080
  })
});
const playwright = loadPlaywright();
const args = parseArgs(process.argv.slice(2));
const captureFormat = CAPTURE_FORMATS[args.format];
if (!captureFormat) throw new Error(`Unknown trailer capture format: ${args.format}`);
const scenarioIds = args.ids.length > 0
  ? args.ids
  : captureScenarioIds().filter((id) => id.startsWith("trailer-"));

if (scenarioIds.length === 0) throw new Error("No trailer capture scenarios were selected");
const unknown = scenarioIds.filter((id) => !captureScenarioIds().includes(id));
if (unknown.length > 0) throw new Error(`Unknown capture scenarios: ${unknown.join(", ")}`);

const outputRoot = path.resolve(APP_ROOT, args.output);
await mkdir(outputRoot, { recursive: true });
await assertServerReady(args.baseUrl);

const browser = await playwright.chromium.launch({
  headless: args.headless,
  executablePath: browserExecutablePath(),
  args: ["--autoplay-policy=no-user-gesture-required"]
});
const manifest = new Array(scenarioIds.length);
try {
  let nextScenarioIndex = 0;
  const workerCount = Math.min(args.jobs, scenarioIds.length);
  await Promise.all(Array.from({ length: workerCount }, async () => {
    while (nextScenarioIndex < scenarioIds.length) {
      const index = nextScenarioIndex;
      nextScenarioIndex += 1;
      const scenarioId = scenarioIds[index];
      process.stdout.write(`[${index + 1}/${scenarioIds.length}] ${scenarioId}\n`);
      manifest[index] = await recordScenario(browser, scenarioId);
    }
  }));
} finally {
  await browser.close();
}

const manifestPath = path.join(outputRoot, "manifest.json");
await writeFile(manifestPath, `${JSON.stringify({
  version: 1,
  generatedAt: new Date().toISOString(),
  format: args.format,
  logicalViewport: {
    width: captureFormat.logicalWidth,
    height: captureFormat.logicalHeight
  },
  outputViewport: {
    width: captureFormat.outputWidth,
    height: captureFormat.outputHeight
  },
  clips: manifest
}, null, 2)}\n`);
process.stdout.write(`Trailer clips: ${outputRoot}\nManifest: ${manifestPath}\n`);

async function recordScenario(browser, scenarioId) {
  const category = scenarioId.split("-")[1];
  const categoryDir = path.join(outputRoot, category);
  const frameDir = path.join(categoryDir, `.${scenarioId}-frames`);
  await mkdir(categoryDir, { recursive: true });
  await rm(frameDir, { recursive: true, force: true });
  await mkdir(frameDir, { recursive: true });
  const { sidecar, frameCount } = await recordFramePass(browser, scenarioId, categoryDir, frameDir);
  verifySidecar(sidecar, scenarioId, captureFormat);

  const eventsPath = path.join(categoryDir, `${scenarioId}.json`);
  const sfxPath = path.join(categoryDir, `${scenarioId}.sfx.ogg`);
  const videoPath = path.join(categoryDir, `${scenarioId}.webm`);
  const mp4Path = path.join(categoryDir, `${scenarioId}.mp4`);
  await writeFile(eventsPath, `${JSON.stringify(sidecar, null, 2)}\n`);
  renderCaptureSfx(sidecar, sfxPath, scenarioId);
  const audioPeakDb = audibleAudioPeakDb(sfxPath, scenarioId);
  encodeNativeTrailerWebm(frameDir, sfxPath, videoPath);
  encodeTrailerMp4(frameDir, sfxPath, mp4Path, captureFormat);
  await rm(frameDir, { recursive: true, force: true });
  const probe = probeVideo(mp4Path);
  const durationSeconds = frameCount / AUTOMATIC_CAPTURE_FRAME_RATE;
  if (probe.width !== captureFormat.outputWidth || probe.height !== captureFormat.outputHeight ||
      probe.frameRate !== AUTOMATIC_CAPTURE_FRAME_RATE || !probe.hasAudio ||
      Math.abs(probe.durationSeconds - durationSeconds) > 0.04) {
    throw new Error(
      `${scenarioId} encoded incorrectly: ${probe.width}x${probe.height} at ${probe.frameRate} fps, ` +
      `duration=${probe.durationSeconds}, audio=${probe.hasAudio}`
    );
  }
  return {
    scenarioId,
    category,
    format: args.format,
    captureMethod: "deterministic-frame-step",
    durationSeconds,
    frameCount,
    video: path.relative(outputRoot, mp4Path),
    nativeVideo: path.relative(outputRoot, videoPath),
    sfxAudio: path.relative(outputRoot, sfxPath),
    audioPeakDb,
    events: path.relative(outputRoot, eventsPath),
    eventTypes: [...new Set(sidecar.events.map((event) => event.type))],
    captureBeats: sidecar.events
      .filter((event) => event.type === "capture-beat")
      .map((event) => event.data)
  };
}

async function recordFramePass(browser, scenarioId, categoryDir, frameDir) {
  const context = await browser.newContext({
    viewport: {
      width: captureFormat.logicalWidth,
      height: captureFormat.logicalHeight
    },
    deviceScaleFactor: 1
  });
  const page = await context.newPage();
  const consoleErrors = [];
  collectPageErrors(page, consoleErrors);
  try {
    await page.goto(captureUrl(scenarioId), {
      waitUntil: "domcontentloaded",
      timeout: args.loadTimeoutMs
    });
    await page.waitForFunction(() => (
      window.__PIXEL_GLOBE_CAPTURE_READY__ === true ||
      typeof window.__PIXEL_GLOBE_CAPTURE_ERROR__ === "string"
    ), null, { timeout: args.captureTimeoutMs });
    const failure = await page.evaluate(() => window.__PIXEL_GLOBE_CAPTURE_ERROR__ || null);
    if (failure) throw new Error(failure);
    const frameCount = await page.evaluate(() => window.__PIXEL_GLOBE_CAPTURE_TOTAL_FRAMES__);
    if (!Number.isInteger(frameCount) || frameCount < 2) {
      throw new Error(`${scenarioId} exposed invalid frame total: ${frameCount}`);
    }
    const canvas = page.locator("#view");
    for (let index = 0; index < frameCount; index += 1) {
      const frame = await page.evaluate((frameIndex) => (
        window.__PIXEL_GLOBE_CAPTURE_STEP__(frameIndex)
      ), index);
      if (frame?.frameIndex !== index || frame?.totalFrames !== frameCount ||
          frame.complete !== (index === frameCount - 1)) {
        throw new Error(`${scenarioId} returned malformed deterministic frame ${index}`);
      }
      const framePath = canvasFramePath(frameDir, index);
      await canvas.screenshot({ path: framePath, type: "png", animations: "disabled" });
      validateCapturedFrame(await readFile(framePath), index, captureFormat);
      if ((index + 1) % AUTOMATIC_CAPTURE_FRAME_RATE === 0) {
        process.stdout.write(`  ${scenarioId}: frames ${index + 1}/${frameCount}\n`);
      }
    }
    const sidecar = await page.evaluate(() => window.__PIXEL_GLOBE_CAPTURE_SIDECAR__ || null);
    if (!sidecar) throw new Error(`${scenarioId} did not expose a deterministic event sidecar`);
    if (captureFrameCount(sidecar, scenarioId) !== frameCount) {
      throw new Error(`${scenarioId} sidecar frame total disagrees with its frame pass`);
    }
    return { sidecar, frameCount };
  } catch (error) {
    const screenshotPath = path.join(categoryDir, `${scenarioId}.frames.failure.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    const consoleText = consoleErrors.length > 0 ? `\nBrowser errors:\n${consoleErrors.join("\n")}` : "";
    throw new Error(`${scenarioId} frame pass failed: ${error.message}${consoleText}\nScreenshot: ${screenshotPath}`);
  } finally {
    await context.close();
  }
}

function validateCapturedFrame(data, index, format) {
  const dimensions = pngDimensions(data);
  if (dimensions.width !== format.logicalWidth || dimensions.height !== format.logicalHeight) {
    throw new Error(
      `Captured frame ${index} is ${dimensions.width}x${dimensions.height}; expected ` +
      `${format.logicalWidth}x${format.logicalHeight}`
    );
  }
}

function captureUrl(scenarioId) {
  return `${args.baseUrl}/?capture=${encodeURIComponent(scenarioId)}` +
    `&captureFormat=${encodeURIComponent(captureFormat.queryValue)}` +
    "&autocapture=frames";
}

function collectPageErrors(page, errors) {
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
}

function captureFrameCount(sidecar, scenarioId) {
  const durationSeconds = sidecar?.scenario?.sequence?.durationSeconds;
  const exactFrames = durationSeconds * AUTOMATIC_CAPTURE_FRAME_RATE;
  if (!Number.isInteger(exactFrames) || exactFrames < 2) {
    throw new Error(`${scenarioId} has invalid deterministic frame total: ${exactFrames}`);
  }
  return exactFrames;
}

function pngDimensions(data) {
  const pngSignature = "89504e470d0a1a0a";
  if (data.length < 24 || data.subarray(0, 8).toString("hex") !== pngSignature ||
      data.subarray(12, 16).toString("ascii") !== "IHDR") {
    throw new Error("Automatic capture frame is not a valid PNG header");
  }
  return {
    width: data.readUInt32BE(16),
    height: data.readUInt32BE(20)
  };
}

function canvasFramePath(frameDir, index) {
  return path.join(frameDir, `frame-${String(index).padStart(5, "0")}.png`);
}

function encodeNativeTrailerWebm(frameDir, sfxInput, output) {
  execFileSync("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y",
    "-framerate", String(AUTOMATIC_CAPTURE_FRAME_RATE),
    "-i", path.join(frameDir, "frame-%05d.png"),
    "-i", sfxInput,
    "-vf", `fps=${AUTOMATIC_CAPTURE_FRAME_RATE}`,
    "-map", "0:v:0", "-map", "1:a:0",
    "-c:v", "libvpx-vp9", "-lossless", "1", "-pix_fmt", "yuv420p",
    "-c:a", "libopus", "-b:a", "160k", "-af", "apad", "-shortest",
    output
  ], { stdio: "inherit" });
}

function renderCaptureSfx(sidecar, output, scenarioId) {
  const events = sidecar.events.filter((event) => event.type === "capture-sfx");
  if (events.length === 0) throw new Error(`${scenarioId} emitted no deterministic SFX events`);
  const publicRoot = path.resolve(APP_ROOT, "public");
  const inputs = [];
  const filters = [];
  const labels = [];
  for (const [index, event] of events.entries()) {
    const { assetPath, volume, playbackRate } = event.data || {};
    if (typeof assetPath !== "string" || !assetPath.startsWith("assets/sfx/") ||
        !Number.isFinite(volume) || volume <= 0 || volume > 1 ||
        !Number.isFinite(playbackRate) || playbackRate < 0.5 || playbackRate > 2 ||
        !Number.isFinite(event.t) || event.t < 0 || event.t > sidecar.durationMs) {
      throw new Error(`${scenarioId} emitted malformed SFX event ${index}`);
    }
    const asset = path.resolve(publicRoot, assetPath);
    if (!asset.startsWith(`${publicRoot}${path.sep}`) || !existsSync(asset)) {
      throw new Error(`${scenarioId} references missing SFX asset: ${assetPath}`);
    }
    inputs.push("-i", asset);
    const label = `fx${index}`;
    filters.push(
      `[${index}:a]aresample=48000,atempo=${playbackRate},volume=${volume},` +
      `asetpts=PTS+${event.t / 1000}/TB[${label}]`
    );
    labels.push(`[${label}]`);
  }
  const durationSeconds = sidecar.durationMs / 1000;
  filters.push(`aevalsrc=0:d=${durationSeconds}:s=48000:c=stereo[silence]`);
  filters.push(
    `[silence]${labels.join("")}amix=inputs=${labels.length + 1}:duration=first:normalize=0,` +
    `atrim=duration=${durationSeconds}[audio]`
  );
  execFileSync("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y",
    ...inputs,
    "-filter_complex", filters.join(";"),
    "-map", "[audio]", "-t", String(durationSeconds),
    "-c:a", "libopus", "-b:a", "160k", "-ar", "48000", "-ac", "2",
    output
  ], { stdio: "inherit" });
}

function encodeTrailerMp4(frameDir, sfxInput, output, format) {
  execFileSync("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y",
    "-framerate", String(AUTOMATIC_CAPTURE_FRAME_RATE),
    "-i", path.join(frameDir, "frame-%05d.png"),
    "-i", sfxInput,
    "-map", "0:v:0", "-map", "1:a:0",
    "-vf", `fps=30,scale=${format.outputWidth}:${format.outputHeight}:flags=neighbor`,
    "-c:v", "libx264", "-preset", "slow", "-crf", "12",
    "-c:a", "aac", "-b:a", "160k", "-af", "apad", "-shortest",
    "-pix_fmt", "yuv420p", "-movflags", "+faststart",
    output
  ], { stdio: "inherit" });
}

function probeVideo(videoPath) {
  const output = execFileSync("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration:stream=codec_type,width,height,r_frame_rate",
    "-of", "json",
    videoPath
  ], { encoding: "utf8" });
  const probe = JSON.parse(output);
  const streams = probe.streams || [];
  const video = streams.find((stream) => stream.codec_type === "video");
  if (!video) throw new Error(`No video stream in ${videoPath}`);
  const [numerator, denominator] = video.r_frame_rate.split("/").map(Number);
  return {
    width: video.width,
    height: video.height,
    frameRate: numerator / denominator,
    hasAudio: streams.some((stream) => stream.codec_type === "audio"),
    durationSeconds: Number(probe.format?.duration)
  };
}

function audibleAudioPeakDb(audioPath, scenarioId) {
  const result = spawnSync("ffmpeg", [
    "-hide_banner", "-nostats", "-i", audioPath,
    "-af", "volumedetect", "-f", "null", "-"
  ], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`${scenarioId} SFX analysis failed: ${result.stderr.trim()}`);
  }
  const match = result.stderr.match(/max_volume:\s*(-?[\d.]+) dB/);
  const peakDb = match ? Number(match[1]) : Number.NaN;
  if (!Number.isFinite(peakDb) || peakDb <= -70) {
    throw new Error(`${scenarioId} captured a silent SFX track`);
  }
  return peakDb;
}

function verifySidecar(sidecar, scenarioId, format) {
  if (sidecar?.scenario?.id !== scenarioId) {
    throw new Error(`${scenarioId} sidecar identifies ${sidecar?.scenario?.id || "nothing"}`);
  }
  if (!Number.isFinite(sidecar.durationMs) || sidecar.durationMs < 3000) {
    throw new Error(`${scenarioId} has invalid duration ${sidecar.durationMs}`);
  }
  const types = new Set(sidecar.events.map((event) => event.type));
  for (const required of ["capture-start", "scenario-start", "capture-stop"]) {
    if (!types.has(required)) throw new Error(`${scenarioId} sidecar is missing ${required}`);
  }
  if (!types.has("capture-beat")) throw new Error(`${scenarioId} sidecar has no capture beats`);
  const captureStart = sidecar.events.find((event) => event.type === "capture-start");
  const viewport = captureStart?.data?.viewport;
  if (viewport?.width !== format.logicalWidth || viewport?.height !== format.logicalHeight) {
    throw new Error(
      `${scenarioId} sidecar viewport is ${viewport?.width}x${viewport?.height}; expected ` +
      `${format.logicalWidth}x${format.logicalHeight}`
    );
  }
  if (captureStart.data.frameRate !== AUTOMATIC_CAPTURE_FRAME_RATE) {
    throw new Error(
      `${scenarioId} frame pass reports ${captureStart.data.frameRate} fps; expected ` +
      `${AUTOMATIC_CAPTURE_FRAME_RATE}`
    );
  }
}

async function assertServerReady(baseUrl) {
  let response;
  try {
    response = await fetch(baseUrl);
  } catch (error) {
    throw new Error(`Pixel globe server is not reachable at ${baseUrl}: ${error.message}`);
  }
  if (!response.ok) throw new Error(`Pixel globe server returned HTTP ${response.status} at ${baseUrl}`);
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
  throw new Error(
    "Playwright is unavailable. Install it locally or set PLAYWRIGHT_MODULE_PATH to its package directory."
  );
}

function browserExecutablePath() {
  const candidates = [
    process.env.PIXEL_GLOBE_CAPTURE_BROWSER,
    playwright.chromium.executablePath(),
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  ].filter(Boolean);
  const executable = candidates.find(existsSync);
  if (!executable) {
    throw new Error("No Chromium browser is available for trailer capture");
  }
  return executable;
}

function parseArgs(argv) {
  const parsed = {
    baseUrl: "http://127.0.0.1:5184",
    output: ".captures/trailer-clips",
    format: "shorts",
    ids: [],
    headless: true,
    jobs: 2,
    loadTimeoutMs: 120_000,
    captureTimeoutMs: 120_000
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--base-url") parsed.baseUrl = requiredValue(argv, ++index, arg).replace(/\/$/, "");
    else if (arg === "--output") parsed.output = requiredValue(argv, ++index, arg);
    else if (arg === "--ids") parsed.ids = requiredValue(argv, ++index, arg).split(",").filter(Boolean);
    else if (arg === "--format") parsed.format = requiredValue(argv, ++index, arg);
    else if (arg === "--jobs") parsed.jobs = Number(requiredValue(argv, ++index, arg));
    else if (arg === "--headed") parsed.headless = false;
    else throw new Error(`Unknown trailer capture argument: ${arg}`);
  }
  if (!Number.isInteger(parsed.jobs) || parsed.jobs < 1 || parsed.jobs > 4) {
    throw new Error(`--jobs must be an integer from 1 to 4, got ${parsed.jobs}`);
  }
  return parsed;
}

function requiredValue(argv, index, flag) {
  const value = argv[index];
  if (!value || value.startsWith("--")) throw new Error(`${flag} requires a value`);
  return value;
}
