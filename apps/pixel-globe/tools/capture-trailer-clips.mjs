import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { AUTOMATIC_CAPTURE_FRAME_RATE } from "../src/captureDirector.js";
import { captureScenarioIds } from "../src/captureScenarios.js";
import {
  assertCaptureServerReady,
  collectCapturePageErrors,
  launchCaptureBrowser
} from "./capture-browser.mjs";

const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FEATURED_SFX = Object.freeze({
  cannon: "assets/sfx/universfield-cannon-shot-352459.ogg",
  coin: "assets/sfx/floraphonic-coin-and-money-bag-3-185264.mp3",
  fishingNet: "assets/sfx/alex_jauk-water-splash-147014.mp3",
  whaleHarpoon: "assets/sfx/arrow-hit.ogg",
  whaleKill: "assets/sfx/universfield-wet-squelch-impact-352302.ogg"
});
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
await assertCaptureServerReady(args.baseUrl);

const browser = await launchCaptureBrowser({ headless: args.headless });
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

const finalManifest = args.includeExisting
  ? await loadExistingTrailerManifest()
  : manifest;
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
  clips: finalManifest
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
  const durationSeconds = frameCount / AUTOMATIC_CAPTURE_FRAME_RATE;
  await writeFile(eventsPath, `${JSON.stringify(sidecar, null, 2)}\n`);
  renderCaptureSfx(sidecar, sfxPath, scenarioId);
  const audioPeakDb = audibleAudioPeakDb(
    sfxPath,
    scenarioId,
    captureSequenceAllowsSilence(sidecar.scenario.sequence)
  );
  encodeNativeTrailerWebm(frameDir, sfxPath, videoPath, durationSeconds);
  encodeTrailerMp4(frameDir, sfxPath, mp4Path, captureFormat, durationSeconds);
  await rm(frameDir, { recursive: true, force: true });
  const probe = probeVideo(mp4Path);
  if (probe.width !== captureFormat.outputWidth || probe.height !== captureFormat.outputHeight ||
      probe.frameRate !== AUTOMATIC_CAPTURE_FRAME_RATE || !probe.hasAudio ||
      Math.abs(probe.durationSeconds - durationSeconds) > 0.04) {
    throw new Error(
      `${scenarioId} encoded incorrectly: ${probe.width}x${probe.height} at ${probe.frameRate} fps, ` +
      `duration=${probe.durationSeconds}, audio=${probe.hasAudio}`
    );
  }
  return manifestEntry({
    sidecar,
    scenarioId,
    category,
    durationSeconds,
    frameCount,
    videoPath,
    nativeVideoPath: videoPath,
    sfxPath,
    audioPeakDb,
    eventsPath
  });
}

async function loadExistingTrailerManifest() {
  const allTrailerIds = captureScenarioIds().filter((id) => id.startsWith("trailer-"));
  return Promise.all(allTrailerIds.map(async (scenarioId) => {
    const category = scenarioId.split("-")[1];
    const categoryDir = path.join(outputRoot, category);
    const eventsPath = path.join(categoryDir, `${scenarioId}.json`);
    const sfxPath = path.join(categoryDir, `${scenarioId}.sfx.ogg`);
    const nativeVideoPath = path.join(categoryDir, `${scenarioId}.webm`);
    const videoPath = path.join(categoryDir, `${scenarioId}.mp4`);
    for (const required of [eventsPath, sfxPath, nativeVideoPath, videoPath]) {
      if (!existsSync(required)) {
        throw new Error(`Cannot include incomplete trailer capture: ${required}`);
      }
    }
    const sidecar = JSON.parse(await readFile(eventsPath, "utf8"));
    verifySidecar(sidecar, scenarioId, captureFormat);
    const frameCount = captureFrameCount(sidecar, scenarioId);
    const durationSeconds = frameCount / AUTOMATIC_CAPTURE_FRAME_RATE;
    const probe = probeVideo(videoPath);
    if (probe.width !== captureFormat.outputWidth || probe.height !== captureFormat.outputHeight ||
        probe.frameRate !== AUTOMATIC_CAPTURE_FRAME_RATE || !probe.hasAudio ||
        Math.abs(probe.durationSeconds - durationSeconds) > 0.04) {
      throw new Error(`${scenarioId} existing capture failed delivery validation`);
    }
    return manifestEntry({
      sidecar,
      scenarioId,
      category,
      durationSeconds,
      frameCount,
      videoPath,
      nativeVideoPath,
      sfxPath,
      audioPeakDb: audibleAudioPeakDb(
        sfxPath,
        scenarioId,
        captureSequenceAllowsSilence(sidecar.scenario.sequence)
      ),
      eventsPath
    });
  }));
}

function manifestEntry({
  sidecar,
  scenarioId,
  category,
  durationSeconds,
  frameCount,
  videoPath,
  nativeVideoPath,
  sfxPath,
  audioPeakDb,
  eventsPath
}) {
  return {
    scenarioId,
    category,
    format: args.format,
    captureMethod: "deterministic-frame-step",
    durationSeconds,
    frameCount,
    video: path.relative(outputRoot, videoPath),
    nativeVideo: path.relative(outputRoot, nativeVideoPath),
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
  collectCapturePageErrors(page, consoleErrors);
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

function encodeNativeTrailerWebm(frameDir, sfxInput, output, durationSeconds) {
  execFileSync("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y",
    "-framerate", String(AUTOMATIC_CAPTURE_FRAME_RATE),
    "-i", path.join(frameDir, "frame-%05d.png"),
    "-i", sfxInput,
    "-vf", `fps=${AUTOMATIC_CAPTURE_FRAME_RATE}`,
    "-map", "0:v:0", "-map", "1:a:0",
    "-c:v", "libvpx-vp9", "-lossless", "1", "-pix_fmt", "yuv420p",
    "-c:a", "libopus", "-b:a", "160k", "-af", "apad", "-t", String(durationSeconds),
    output
  ], { stdio: "inherit" });
}

function renderCaptureSfx(sidecar, output, scenarioId) {
  const events = sidecar.events.filter((event) => event.type === "capture-sfx");
  const mustBeSilent = captureSequenceMustBeSilent(sidecar.scenario.sequence);
  const allowsSilence = captureSequenceAllowsSilence(sidecar.scenario.sequence);
  if (mustBeSilent && events.length > 0) {
    throw new Error(`${scenarioId} must be silent but emitted ${events.length} SFX events`);
  }
  if (events.length === 0) {
    if (!allowsSilence) throw new Error(`${scenarioId} emitted no deterministic SFX events`);
    renderSilentCaptureSfx(output, sidecar.durationMs / 1000);
    return;
  }
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
      `asetpts=PTS-STARTPTS,adelay=delays=${Math.round(event.t)}:all=1[${label}]`
    );
    labels.push(`[${label}]`);
  }
  const durationSeconds = sidecar.durationMs / 1000;
  filters.push(`aevalsrc=0:d=${durationSeconds}:s=48000:c=stereo[silence]`);
  filters.push(
    `[silence]${labels.join("")}amix=inputs=${labels.length + 1}:duration=first:normalize=0,` +
    `alimiter=limit=0.92,atrim=duration=${durationSeconds}[audio]`
  );
  execFileSync("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y",
    ...inputs,
    "-filter_complex", filters.join(";"),
    "-map", "[audio]", "-t", String(durationSeconds),
    "-c:a", "libopus", "-b:a", "160k", "-ar", "48000", "-ac", "2",
    output
  ], { stdio: "inherit" });
  verifyFeaturedSfxAudio(sidecar, output, scenarioId);
}

function renderSilentCaptureSfx(output, durationSeconds) {
  execFileSync("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y",
    "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo",
    "-t", String(durationSeconds),
    "-c:a", "libopus", "-b:a", "160k", "-ar", "48000", "-ac", "2",
    output
  ], { stdio: "inherit" });
}

function encodeTrailerMp4(frameDir, sfxInput, output, format, durationSeconds) {
  execFileSync("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y",
    "-framerate", String(AUTOMATIC_CAPTURE_FRAME_RATE),
    "-i", path.join(frameDir, "frame-%05d.png"),
    "-i", sfxInput,
    "-map", "0:v:0", "-map", "1:a:0",
    "-vf", `fps=30,scale=${format.outputWidth}:${format.outputHeight}:flags=neighbor`,
    "-c:v", "libx264", "-preset", "slow", "-crf", "12",
    "-c:a", "aac", "-b:a", "160k", "-af", "apad", "-t", String(durationSeconds),
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

function audibleAudioPeakDb(audioPath, scenarioId, allowSilence = false) {
  const result = spawnSync("ffmpeg", [
    "-hide_banner", "-nostats", "-i", audioPath,
    "-af", "volumedetect", "-f", "null", "-"
  ], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`${scenarioId} SFX analysis failed: ${result.stderr.trim()}`);
  }
  const match = result.stderr.match(/max_volume:\s*(-inf|-?[\d.]+) dB/);
  const peakDb = match?.[1] === "-inf" ? -100 : match ? Number(match[1]) : Number.NaN;
  if (!Number.isFinite(peakDb) || (!allowSilence && peakDb <= -70)) {
    throw new Error(`${scenarioId} captured a silent SFX track`);
  }
  return peakDb;
}

function verifyFeaturedSfxAudio(sidecar, audioPath, scenarioId) {
  const sequence = sidecar.scenario.sequence;
  const featuredEvents = [];
  if (sequence.kind === "trade") {
    featuredEvents.push(...sidecar.events.filter((event) => (
      event.type === "capture-sfx" && event.data?.assetPath === FEATURED_SFX.coin
    )));
  } else if (sequence.kind === "fish" || (sequence.kind === "panda" && sequence.variant === "fish")) {
    featuredEvents.push(...sidecar.events.filter((event) => (
      event.type === "capture-sfx" && event.data?.assetPath === FEATURED_SFX.fishingNet
    )));
  } else if (sequence.kind === "whale" && sequence.variant === "harpoon") {
    featuredEvents.push(...sidecar.events.filter((event) => (
      event.type === "capture-sfx" && event.data?.assetPath === FEATURED_SFX.whaleHarpoon
    )));
  } else if (sequence.kind === "whale" && sequence.variant === "finish") {
    featuredEvents.push(...sidecar.events.filter((event) => (
      event.type === "capture-sfx" && event.data?.assetPath === FEATURED_SFX.whaleKill
    )));
  } else if (sequence.kind === "fight" ||
      (sequence.kind === "pillage" && sequence.variant === "bombard")) {
    const playerCannonTimes = new Set(sidecar.events.filter((event) => (
      event.type === "weapon-fired" && event.data?.ownerId === "player" && event.data?.weapon === "cannon"
    )).map((event) => event.t));
    featuredEvents.push(...sidecar.events.filter((event) => (
      event.type === "capture-sfx" && event.data?.assetPath === FEATURED_SFX.cannon &&
      playerCannonTimes.has(event.t)
    )));
  }
  for (const cueTime of new Set(featuredEvents.map((event) => event.t))) {
    const startSeconds = cueTime / 1000;
    const durationSeconds = Math.min(0.3, sidecar.durationMs / 1000 - startSeconds);
    const result = spawnSync("ffmpeg", [
      "-hide_banner", "-nostats", "-ss", String(startSeconds), "-t", String(durationSeconds),
      "-i", audioPath, "-af", "volumedetect", "-f", "null", "-"
    ], { encoding: "utf8" });
    if (result.status !== 0) {
      throw new Error(`${scenarioId} could not inspect its SFX cue at ${cueTime}ms`);
    }
    const match = result.stderr.match(/max_volume:\s*(-inf|-?[\d.]+) dB/);
    const peakDb = match?.[1] === "-inf" ? -100 : match ? Number(match[1]) : Number.NaN;
    if (!Number.isFinite(peakDb) || peakDb <= -70) {
      throw new Error(`${scenarioId} has a silent featured SFX window at ${cueTime}ms`);
    }
  }
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
  verifyFeaturedSfx(sidecar, scenarioId);
  if (sidecar.scenario.sequence.kind === "sail") {
    const beamReach = sidecar.events.find((event) => (
      event.type === "capture-beat" && event.data?.action === "beam-reach"
    ));
    if (!beamReach || Math.abs(beamReach.data.angleFromWindDeg - 90) > 2 ||
        beamReach.data.attainableSpeedRatio < 0.9) {
      throw new Error(
        `${scenarioId} did not hold a fast beam reach: ${JSON.stringify(beamReach?.data || null)}`
      );
    }
  }
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

function verifyFeaturedSfx(sidecar, scenarioId) {
  const sequence = sidecar.scenario.sequence;
  const sfxEvents = sidecar.events.filter((event) => event.type === "capture-sfx");
  if (captureSequenceMustBeSilent(sequence)) {
    if (sfxEvents.length !== 0) {
      throw new Error(`${scenarioId} sailing montage emitted unwanted SFX`);
    }
    return;
  }
  if (sequence.kind === "trade") {
    const actions = sidecar.events.filter((event) => (
      event.type === "capture-beat" && event.data?.action === sequence.variant
    ));
    const coins = sfxEvents.filter((event) => event.data?.assetPath === FEATURED_SFX.coin);
    if (actions.length !== sequence.transactionCount || coins.length !== sequence.transactionCount) {
      throw new Error(
        `${scenarioId} expected ${sequence.transactionCount} ${sequence.variant} actions and coin cues, ` +
        `got ${actions.length} actions and ${coins.length} cues`
      );
    }
  }
  if (sequence.kind === "fish" || (sequence.kind === "panda" && sequence.variant === "fish")) {
    const netSounds = sfxEvents.filter((event) => event.data?.assetPath === FEATURED_SFX.fishingNet);
    if (netSounds.length === 0) {
      throw new Error(`${scenarioId} emitted no fishing-net SFX`);
    }
  }
  if (sequence.kind === "whale" && sequence.variant === "harpoon") {
    const harpoonBeat = sidecar.events.find((event) => (
      event.type === "capture-beat" && event.data?.action === "harpoon-whale"
    ));
    const harpoonSound = sfxEvents.find((event) => (
      event.data?.assetPath === FEATURED_SFX.whaleHarpoon && event.t >= (harpoonBeat?.t ?? Infinity)
    ));
    if (!harpoonBeat || !harpoonSound) {
      throw new Error(`${scenarioId} did not pair its whale harpoon with an impact SFX`);
    }
  }
  if (sequence.kind === "whale" && sequence.variant === "finish") {
    const killingBlow = sidecar.events.find((event) => (
      event.type === "capture-beat" && event.data?.action === "land-whale-killing-blow"
    ));
    const killSound = sfxEvents.find((event) => (
      event.t === killingBlow?.t && event.data?.assetPath === FEATURED_SFX.whaleKill
    ));
    if (!killingBlow || !killSound) {
      throw new Error(`${scenarioId} did not pair the whale killing blow with its SFX`);
    }
  }
  const requiresPlayerCannons = sequence.kind === "fight" ||
    (sequence.kind === "pillage" && sequence.variant === "bombard");
  if (requiresPlayerCannons) {
    const cannonEvents = sidecar.events.filter((event) => (
      event.type === "weapon-fired" && event.data?.ownerId === "player" && event.data?.weapon === "cannon"
    ));
    if (cannonEvents.length === 0) throw new Error(`${scenarioId} fired no player cannons`);
    for (const event of cannonEvents) {
      const cueCount = sfxEvents.filter((cue) => (
        cue.t === event.t && cue.data?.assetPath === FEATURED_SFX.cannon
      )).length;
      const volleyCount = cannonEvents.filter((volley) => volley.t === event.t).length;
      if (cueCount < volleyCount) {
        throw new Error(`${scenarioId} has a silent cannon volley at ${event.t}ms`);
      }
    }
  }
}

function captureSequenceMustBeSilent(sequence) {
  return sequence.kind === "sail";
}

function captureSequenceAllowsSilence(sequence) {
  return captureSequenceMustBeSilent(sequence) || (
    sequence.kind === "panda" && ["sail", "port-reaction", "naturalist"].includes(sequence.variant)
  );
}

function parseArgs(argv) {
  const parsed = {
    baseUrl: "http://127.0.0.1:5184",
    output: ".captures/trailer-clips",
    format: "shorts",
    ids: [],
    headless: true,
    includeExisting: false,
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
    else if (arg === "--include-existing") parsed.includeExisting = true;
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
