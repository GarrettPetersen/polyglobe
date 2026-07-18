import { execFileSync, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import process from "node:process";
import { captureScenarioIds } from "../src/captureScenarios.js";

const require = createRequire(import.meta.url);
const CANVAS_CAPTURE_FPS = 10;
const playwright = loadPlaywright();
const args = parseArgs(process.argv.slice(2));
const scenarioIds = args.ids.length > 0
  ? args.ids
  : captureScenarioIds().filter((id) => id.startsWith("trailer-"));

if (scenarioIds.length === 0) throw new Error("No trailer capture scenarios were selected");
const unknown = scenarioIds.filter((id) => !captureScenarioIds().includes(id));
if (unknown.length > 0) throw new Error(`Unknown capture scenarios: ${unknown.join(", ")}`);

const outputRoot = path.resolve(args.output);
await mkdir(outputRoot, { recursive: true });
await assertServerReady(args.baseUrl);

const browser = await playwright.chromium.launch({
  headless: args.headless,
  executablePath: browserExecutablePath(),
  args: ["--autoplay-policy=no-user-gesture-required"]
});
const manifest = [];
try {
  for (const [index, scenarioId] of scenarioIds.entries()) {
    process.stdout.write(`[${index + 1}/${scenarioIds.length}] ${scenarioId}\n`);
    manifest.push(await recordScenario(browser, scenarioId));
  }
} finally {
  await browser.close();
}

const manifestPath = path.join(outputRoot, "manifest.json");
await writeFile(manifestPath, `${JSON.stringify({
  version: 1,
  generatedAt: new Date().toISOString(),
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
  const context = await browser.newContext({
    acceptDownloads: true,
    viewport: { width: 540, height: 960 },
    deviceScaleFactor: 1
  });
  const page = await context.newPage();
  const downloads = [];
  const downloadTasks = [];
  page.on("download", (download) => {
    const suggested = download.suggestedFilename();
    const suffix = suggested.endsWith(".sfx.webm") ? ".sfx.webm" : path.extname(suggested);
    const destination = path.join(categoryDir, `${scenarioId}${suffix}`);
    downloads.push(destination);
    downloadTasks.push(download.saveAs(destination));
  });
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  const url = `${args.baseUrl}/?capture=${encodeURIComponent(scenarioId)}&autocapture=1`;
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: args.loadTimeoutMs });
    await page.waitForFunction(() => (
      window.__PIXEL_GLOBE_CAPTURE_COMPLETE__ === true ||
      typeof window.__PIXEL_GLOBE_CAPTURE_ERROR__ === "string"
    ), null, { timeout: args.captureTimeoutMs });
    const failure = await page.evaluate(() => window.__PIXEL_GLOBE_CAPTURE_ERROR__ || null);
    if (failure) throw new Error(failure);
    const frames = await page.evaluate(() => window.__PIXEL_GLOBE_CAPTURE_FRAMES__ || null);
    if (!frames) throw new Error(`${scenarioId} did not expose captured canvas frames`);
    await writeCapturedFrames(frameDir, frames);
    await waitFor(() => downloads.length === 2, args.downloadTimeoutMs, `SFX and event downloads for ${scenarioId}`);
    await Promise.all(downloadTasks);
  } catch (error) {
    const screenshotPath = path.join(categoryDir, `${scenarioId}.failure.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    const consoleText = consoleErrors.length > 0 ? `\nBrowser errors:\n${consoleErrors.join("\n")}` : "";
    throw new Error(`${scenarioId} failed: ${error.message}${consoleText}\nScreenshot: ${screenshotPath}`);
  } finally {
    await context.close();
  }

  const eventsPath = requiredDownloadedPath(downloads, ".json", scenarioId);
  const rawSfxPath = requiredDownloadedPath(downloads, ".sfx.webm", scenarioId);
  const sfxPath = path.join(categoryDir, `${scenarioId}.sfx.ogg`);
  const videoPath = path.join(categoryDir, `${scenarioId}.webm`);
  const mp4Path = path.join(categoryDir, `${scenarioId}.mp4`);
  const sidecar = JSON.parse(await readFile(eventsPath, "utf8"));
  verifySidecar(sidecar, scenarioId);
  sanitizeCaptureSfx(rawSfxPath, sfxPath);
  await rm(rawSfxPath, { force: true });
  const audioPeakDb = audibleAudioPeakDb(sfxPath, scenarioId);
  await padCanvasFrames(frameDir, sidecar.durationMs);
  encodeNativeTrailerWebm(frameDir, sfxPath, videoPath);
  encodeTrailerMp4(frameDir, sfxPath, mp4Path);
  await rm(frameDir, { recursive: true, force: true });
  const probe = probeVideo(mp4Path);
  if (probe.width !== 1080 || probe.height !== 1920 || probe.frameRate !== 30 || !probe.hasAudio) {
    throw new Error(
      `${scenarioId} encoded incorrectly: ${probe.width}x${probe.height} at ${probe.frameRate} fps, audio=${probe.hasAudio}`
    );
  }
  return {
    scenarioId,
    category,
    durationSeconds: Math.round(sidecar.durationMs / 10) / 100,
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

async function writeCapturedFrames(frameDir, capture) {
  if (capture?.frameRate !== CANVAS_CAPTURE_FPS || !Array.isArray(capture.frames) || capture.frames.length < 2) {
    throw new Error(`Invalid automatic canvas capture: ${JSON.stringify(capture)?.slice(0, 200)}`);
  }
  let outputIndex = 0;
  for (let sourceIndex = 0; sourceIndex < capture.frames.length; sourceIndex += 1) {
    const frame = capture.frames[sourceIndex];
    const nextTime = capture.frames[sourceIndex + 1]?.t ?? frame.t + 1000 / CANVAS_CAPTURE_FPS;
    if (!Number.isFinite(frame.t) || !Number.isFinite(nextTime) || nextTime < frame.t) {
      throw new Error(`Invalid captured frame timing at ${sourceIndex}`);
    }
    if (typeof frame.pngDataUrl !== "string" || !frame.pngDataUrl.startsWith("data:image/png;base64,")) {
      throw new Error(`Invalid captured PNG at ${sourceIndex}`);
    }
    const data = Buffer.from(frame.pngDataUrl.slice("data:image/png;base64,".length), "base64");
    const endIndex = Math.max(outputIndex + 1, Math.ceil(nextTime * CANVAS_CAPTURE_FPS / 1000));
    while (outputIndex < endIndex) {
      await writeCanvasFrame(frameDir, outputIndex, data);
      outputIndex += 1;
    }
  }
}

async function padCanvasFrames(frameDir, durationMs) {
  const expectedFrames = Math.max(2, Math.ceil(durationMs * CANVAS_CAPTURE_FPS / 1000));
  const names = (await readdir(frameDir)).filter((name) => name.endsWith(".png")).sort();
  if (names.length === 0) throw new Error("Cannot pad an empty canvas-frame sequence");
  const latestFrame = await readFile(path.join(frameDir, names.at(-1)));
  for (let index = names.length; index < expectedFrames; index += 1) {
    await writeCanvasFrame(frameDir, index, latestFrame);
  }
}

function writeCanvasFrame(frameDir, index, data) {
  return writeFile(path.join(frameDir, `frame-${String(index).padStart(5, "0")}.png`), data);
}

function encodeNativeTrailerWebm(frameDir, sfxInput, output) {
  execFileSync("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y",
    "-framerate", String(CANVAS_CAPTURE_FPS),
    "-i", path.join(frameDir, "frame-%05d.png"),
    "-i", sfxInput,
    "-vf", "fps=30",
    "-map", "0:v:0", "-map", "1:a:0",
    "-c:v", "libvpx-vp9", "-lossless", "1", "-pix_fmt", "yuv420p",
    "-c:a", "libopus", "-b:a", "160k", "-af", "apad", "-shortest",
    output
  ], { stdio: "inherit" });
}

function sanitizeCaptureSfx(input, output) {
  execFileSync("ffmpeg", [
    "-hide_banner", "-loglevel", "fatal", "-y",
    "-i", input,
    "-vn", "-c:a", "libopus", "-b:a", "160k",
    output
  ], { stdio: "inherit" });
}

function encodeTrailerMp4(frameDir, sfxInput, output) {
  execFileSync("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y",
    "-framerate", String(CANVAS_CAPTURE_FPS),
    "-i", path.join(frameDir, "frame-%05d.png"),
    "-i", sfxInput,
    "-map", "0:v:0", "-map", "1:a:0",
    "-vf", "fps=30,scale=1080:1920:flags=neighbor",
    "-c:v", "libx264", "-preset", "slow", "-crf", "12",
    "-c:a", "aac", "-b:a", "160k", "-af", "apad", "-shortest",
    "-pix_fmt", "yuv420p", "-movflags", "+faststart",
    output
  ], { stdio: "inherit" });
}

function probeVideo(videoPath) {
  const output = execFileSync("ffprobe", [
    "-v", "error",
    "-show_entries", "stream=codec_type,width,height,r_frame_rate",
    "-of", "json",
    videoPath
  ], { encoding: "utf8" });
  const streams = JSON.parse(output).streams || [];
  const video = streams.find((stream) => stream.codec_type === "video");
  if (!video) throw new Error(`No video stream in ${videoPath}`);
  const [numerator, denominator] = video.r_frame_rate.split("/").map(Number);
  return {
    width: video.width,
    height: video.height,
    frameRate: numerator / denominator,
    hasAudio: streams.some((stream) => stream.codec_type === "audio")
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

function verifySidecar(sidecar, scenarioId) {
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
}

function requiredDownloadedPath(downloads, extension, scenarioId) {
  const matches = downloads.filter((entry) => entry.endsWith(extension));
  if (matches.length !== 1) {
    throw new Error(`${scenarioId} produced ${matches.length} ${extension} downloads`);
  }
  return matches[0];
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

async function waitFor(predicate, timeoutMs, label) {
  const startedAt = Date.now();
  while (!predicate()) {
    if (Date.now() - startedAt >= timeoutMs) throw new Error(`Timed out waiting for ${label}`);
    await new Promise((resolve) => setTimeout(resolve, 50));
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
    output: "apps/pixel-globe/.captures/trailer-clips",
    ids: [],
    headless: true,
    loadTimeoutMs: 120_000,
    captureTimeoutMs: 120_000,
    downloadTimeoutMs: 15_000
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--base-url") parsed.baseUrl = requiredValue(argv, ++index, arg).replace(/\/$/, "");
    else if (arg === "--output") parsed.output = requiredValue(argv, ++index, arg);
    else if (arg === "--ids") parsed.ids = requiredValue(argv, ++index, arg).split(",").filter(Boolean);
    else if (arg === "--headed") parsed.headless = false;
    else throw new Error(`Unknown trailer capture argument: ${arg}`);
  }
  return parsed;
}

function requiredValue(argv, index, flag) {
  const value = argv[index];
  if (!value || value.startsWith("--")) throw new Error(`${flag} requires a value`);
  return value;
}
