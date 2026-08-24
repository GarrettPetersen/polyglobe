import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  PERFORMANCE_BENCHMARK_IDS,
  assertChartIntegrityTelemetryBenchmarkBudget,
  assertPausedOverlayBenchmarkBudget,
  performanceBenchmarkFromSearch,
  performanceBenchmarkRequiresChartIntegrityTelemetry,
  performanceBenchmarkRequiresPausedOverlayBudget
} from "../src/performanceBenchmark.js";

const require = createRequire(import.meta.url);
const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = parseArgs(process.argv.slice(2));
const playwright = loadPlaywright();
const server = args.baseUrl ? null : startBenchmarkServer(args.port);
const baseUrl = args.baseUrl || `http://127.0.0.1:${args.port}`;
const errors = [];

try {
  await waitForServer(baseUrl, server);
  const runtime = await launchBenchmarkRuntime(playwright, args);
  const { context, page } = runtime;
  let cdp = null;
  let cpuProfilerRunning = false;
  try {
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error" && benchmarkBrowserErrorIsActionable(message.text())) {
        errors.push(message.text());
      }
    });
    if (args.cpuThrottle > 1 || args.cpuProfile) {
      cdp = await context.newCDPSession(page);
    }
    if (args.cpuThrottle > 1) {
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: args.cpuThrottle });
    }
    if (args.cpuProfile) {
      await cdp.send("Profiler.enable");
      await cdp.send("Profiler.start");
      cpuProfilerRunning = true;
    }
    const url = benchmarkUrl(baseUrl, args);
    const loadStartedAt = performance.now();
    await page.bringToFront();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: args.timeoutMs });
    await page.waitForFunction(
      () => window.__PIXEL_GLOBE_BENCHMARK_READY__ === true || Boolean(window.__PIXEL_GLOBE_CAPTURE_ERROR__),
      null,
      { timeout: args.timeoutMs }
    );
    await throwPageError(page);
    await page.bringToFront();
    const readyMs = performance.now() - loadStartedAt;
    process.stdout.write(`  Scene ready in ${Math.round(readyMs)} ms; collecting frames...\n`);
    await page.waitForFunction(
      () => window.__PIXEL_GLOBE_BENCHMARK_RESULT__ !== null || Boolean(window.__PIXEL_GLOBE_CAPTURE_ERROR__),
      null,
      { timeout: args.timeoutMs }
    );
    await throwPageError(page);
    const result = await page.evaluate(() => window.__PIXEL_GLOBE_BENCHMARK_RESULT__);
    if (args.cpuProfile) {
      await saveCpuProfile(cdp, args.cpuProfile);
      cpuProfilerRunning = false;
    }
    if (errors.length > 0) throw new Error(`Browser errors:\n${errors.join("\n")}`);
    const report = {
      ...result,
      measuredAt: new Date().toISOString(),
      pageReadyMs: Math.round(readyMs),
      cpuThrottle: args.cpuThrottle,
      headless: args.headless,
      runtime: args.electron ? "electron" : "browser",
      url
    };
    await mkdir(path.dirname(args.output), { recursive: true });
    await writeFile(args.output, `${JSON.stringify(report, null, 2)}\n`);
    if (performanceBenchmarkRequiresChartIntegrityTelemetry(report.id)) {
      assertChartIntegrityTelemetryBenchmarkBudget(report);
    }
    if (performanceBenchmarkRequiresPausedOverlayBudget(report.id)) {
      assertPausedOverlayBenchmarkBudget(report);
    }
    printReport(report, args.output);
    if (args.cpuProfile) process.stdout.write(`  CPU profile: ${args.cpuProfile}\n`);
    if (args.minFps !== null && report.framesPerSecond < args.minFps) {
      throw new Error(`Benchmark FPS ${report.framesPerSecond} is below required ${args.minFps}`);
    }
  } finally {
    if (cpuProfilerRunning) {
      await saveCpuProfile(cdp, args.cpuProfile);
      process.stdout.write(`  Startup CPU profile: ${args.cpuProfile}\n`);
    }
    await runtime.close();
  }
} finally {
  if (server) server.kill("SIGTERM");
}

async function saveCpuProfile(cdp, outputPath) {
  const { profile } = await cdp.send("Profiler.stop");
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(profile)}\n`);
}

function benchmarkBrowserErrorIsActionable(message) {
  return !message.startsWith("Failed to load resource:") &&
    !message.startsWith("The AudioContext encountered an error from the audio device");
}

async function throwPageError(page) {
  const message = await page.evaluate(() => window.__PIXEL_GLOBE_CAPTURE_ERROR__ || null);
  if (message) throw new Error(`Benchmark runtime failure: ${message}`);
}

function benchmarkUrl(baseUrl, options) {
  const benchmark = performanceBenchmarkFromSearch(`?benchmark=${encodeURIComponent(options.benchmark)}`);
  const params = new URLSearchParams({
    capture: benchmark.captureScenarioId,
    captureFormat: "steam",
    benchmark: options.benchmark,
    benchmarkWarmup: String(options.warmupSeconds),
    benchmarkDuration: String(options.durationSeconds)
  });
  return `${baseUrl}/?${params}`;
}

function printReport(report, output) {
  const chartTelemetry = report.stages["chart.integrityTelemetry"];
  process.stdout.write(
    [
      `${report.id} performance benchmark`,
      `  Scene: ${report.scene.activeVisualNpcShips}/${report.scene.configuredNpcShips} NPC ships, ` +
        `${report.scene.stagedLandCarts} carts, ${report.scene.chartTiles} terrain tiles`,
      `  FPS: ${report.framesPerSecond} (${report.renderFramesPerSecond} rendered fps)`,
      `  Frame time: ${report.frameTimeMs.mean} ms mean, ${report.frameTimeMs.p95} ms p95, ` +
        `${report.frameTimeMs.max} ms max`,
      `  CPU time: ${report.cpuTimeMs.mean} ms mean, ${report.cpuTimeMs.p95} ms p95`,
      `  Stages: ${Object.entries(report.stages || {})
        .sort((a, b) => b[1].mean - a[1].mean)
        .map(([name, timing]) => `${name} ${timing.mean} ms/${timing.count}x`)
        .join(", ")}`,
      `  Long frames: ${report.longFrames.over20Ms} >20 ms, ${report.longFrames.over33Ms} >33 ms, ` +
        `${report.longFrames.over50Ms} >50 ms`,
      `  Estimated skipped frames: ${report.estimatedSkippedFrames}`,
      chartTelemetry
        ? `  Chart telemetry: ${chartTelemetry.mean} ms mean, ${chartTelemetry.p95} ms p95 across ` +
          `${chartTelemetry.count} samples; ${report.scene.chartIntegrityTelemetry.incidentsDetected} incidents`
        : "  Chart telemetry: paused-screen benchmark (not sampled)",
      `  Chart repairs: ${report.scene.chartVisualRepairs.cloudBanksStarted} cloud banks, ` +
        `${report.scene.chartVisualRepairs.partialCloudBanksStarted} partial, ` +
        `${report.scene.chartVisualRepairs.cloudBankSecondsScheduled.toFixed(1)} cloud-seconds, ` +
        `${report.scene.chartVisualRepairs.cloudTargetViewportEquivalents.toFixed(2)} viewport-equivalents, ` +
        `${report.scene.chartVisualRepairs.cloudReframesCompleted} cloud reframes, ` +
        `${report.scene.chartVisualRepairs.partialCloudRedrawsCompleted} partial redraws, ` +
        `${report.scene.chartVisualRepairs.cloudTilesReplaced} cloud-hidden tiles replaced, ` +
        `${report.scene.chartVisualRepairs.closingFogsStarted} closing fogs, ` +
        `${report.scene.chartVisualRepairs.closingFogSecondsScheduled.toFixed(1)} fog-seconds, ` +
        `${report.scene.chartVisualRepairs.heatHazesStarted} heat hazes, ` +
        `${report.scene.chartVisualRepairs.heatHazeSecondsScheduled.toFixed(1)} haze-seconds, ` +
        `${report.scene.chartVisualRepairs.heatHazeRepairPasses} haze passes / ` +
        `${report.scene.chartVisualRepairs.heatHazeTilesSettled} haze-settled tiles, ` +
        `${Math.round(report.scene.chartVisualRepairs.maximumFogDepthRatio * 100)}% max fog depth, ` +
        `${report.scene.chartVisualRepairs.polarFogRedrawsCompleted} polar fog redraws, ` +
        `${report.scene.chartVisualRepairs.fogTilesReplaced} fog-hidden tiles replaced, ` +
        `${report.scene.chartVisualRepairs.swellRepairPasses} swell passes / ` +
        `${report.scene.chartVisualRepairs.swellTilesSettled} tiles, ` +
        `burden ${report.scene.chartVisualRepairs.burdenScore}`,
      `  Ready in: ${report.pageReadyMs} ms; CPU throttle: ${report.cpuThrottle}x; ` +
        `runtime: ${report.runtime}; browser: ${report.headless ? "headless" : "headed"}`,
      `  Report: ${output}`
    ].join("\n") + "\n"
  );
}

async function launchBenchmarkRuntime(loadedPlaywright, options) {
  if (options.electron) {
    if (options.headless) throw new Error("Electron performance benchmarks must run headed");
    const electronApp = await loadedPlaywright._electron.launch({
      executablePath: electronExecutablePath(),
      args: [path.join(APP_ROOT, "tools/electron-benchmark-host.cjs")]
    });
    const page = await electronApp.firstWindow();
    return {
      context: page.context(),
      page,
      close: () => electronApp.close()
    };
  }
  const context = await loadedPlaywright.chromium.launchPersistentContext(options.profileDir, {
    headless: options.headless,
    executablePath: browserExecutablePath(),
    ignoreDefaultArgs: ["--enable-unsafe-swiftshader"],
    viewport: { width: 480, height: 270 },
    deviceScaleFactor: 1,
    args: [
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",
      "--mute-audio"
    ]
  });
  return {
    context,
    page: context.pages()[0] || await context.newPage(),
    close: () => context.close()
  };
}

function startBenchmarkServer(port) {
  return spawn(process.execPath, ["server.mjs"], {
    cwd: APP_ROOT,
    env: { ...process.env, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"]
  });
}

async function waitForServer(baseUrl, server) {
  const deadline = Date.now() + 30_000;
  let lastError = null;
  while (Date.now() < deadline) {
    if (server && server.exitCode !== null) {
      throw new Error(`Benchmark server exited with code ${server.exitCode}`);
    }
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Benchmark server did not start at ${baseUrl}: ${lastError?.message || "timeout"}`);
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
  throw new Error("Playwright is unavailable. Install it or set PLAYWRIGHT_MODULE_PATH.");
}

function browserExecutablePath() {
  const candidates = [
    process.env.PIXEL_GLOBE_CAPTURE_BROWSER,
    playwright.chromium.executablePath(),
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  ].filter(Boolean);
  const executable = candidates.find(existsSync);
  if (!executable) throw new Error("No Chromium browser is available for performance benchmarking");
  return executable;
}

function electronExecutablePath() {
  const candidates = [
    process.env.PIXEL_GLOBE_ELECTRON,
    path.join(APP_ROOT, "steam-host/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron"),
    path.join(APP_ROOT, "steam-host/node_modules/electron/dist/electron.exe"),
    path.join(APP_ROOT, "steam-host/node_modules/electron/dist/electron")
  ].filter(Boolean);
  const executable = candidates.find(existsSync);
  if (!executable) throw new Error("No Electron executable is available for desktop performance benchmarking");
  return executable;
}

function parseArgs(argv) {
  const parsed = {
    benchmark: "busy-world",
    baseUrl: null,
    port: 5191,
    warmupSeconds: 2,
    durationSeconds: 8,
    cpuThrottle: 1,
    cpuProfile: null,
    headless: false,
    electron: false,
    minFps: null,
    timeoutMs: 120_000,
    profileDir: path.join(APP_ROOT, "build/performance/browser-profile"),
    output: null
  };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--benchmark") parsed.benchmark = requiredValue(argv, ++index, arg);
    else if (arg === "--base-url") parsed.baseUrl = requiredValue(argv, ++index, arg).replace(/\/$/, "");
    else if (arg === "--port") parsed.port = positiveNumber(requiredValue(argv, ++index, arg), arg);
    else if (arg === "--warmup") parsed.warmupSeconds = positiveNumber(requiredValue(argv, ++index, arg), arg);
    else if (arg === "--duration") parsed.durationSeconds = positiveNumber(requiredValue(argv, ++index, arg), arg);
    else if (arg === "--cpu-throttle") parsed.cpuThrottle = positiveNumber(requiredValue(argv, ++index, arg), arg);
    else if (arg === "--cpu-profile") parsed.cpuProfile = path.resolve(APP_ROOT, requiredValue(argv, ++index, arg));
    else if (arg === "--headless") parsed.headless = true;
    else if (arg === "--electron") parsed.electron = true;
    else if (arg === "--min-fps") parsed.minFps = positiveNumber(requiredValue(argv, ++index, arg), arg);
    else if (arg === "--timeout-ms") parsed.timeoutMs = positiveNumber(requiredValue(argv, ++index, arg), arg);
    else if (arg === "--profile") parsed.profileDir = path.resolve(APP_ROOT, requiredValue(argv, ++index, arg));
    else if (arg === "--output") parsed.output = path.resolve(APP_ROOT, requiredValue(argv, ++index, arg));
    else throw new Error(`Unknown benchmark argument: ${arg}`);
  }
  if (!PERFORMANCE_BENCHMARK_IDS.includes(parsed.benchmark)) {
    throw new Error(`Unknown performance benchmark: ${parsed.benchmark}`);
  }
  if (!parsed.output) {
    parsed.output = path.join(APP_ROOT, `build/performance/${parsed.benchmark}-latest.json`);
  }
  return parsed;
}

function requiredValue(argv, index, flag) {
  const value = argv[index];
  if (!value || value.startsWith("--")) throw new Error(`${flag} requires a value`);
  return value;
}

function positiveNumber(raw, label) {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${label} requires a positive number`);
  return value;
}
