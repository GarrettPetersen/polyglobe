import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  collectCapturePageErrors,
  launchCaptureBrowser
} from "./capture-browser.mjs";
import {
  startBenchmarkServer,
  waitForBenchmarkServer
} from "./benchmark-server.mjs";
import {
  CITY_VISUALIZER_BENCHMARK_CAMERA_MODES,
  CITY_VISUALIZER_BENCHMARK_ID
} from "../city-visualizer/cityVisualizerBenchmark.js";

const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = parseArgs(process.argv.slice(2));
const server = args.baseUrl ? null : startBenchmarkServer({ appRoot: APP_ROOT, port: args.port });
const baseUrl = args.baseUrl || `http://127.0.0.1:${args.port}`;

try {
  await waitForBenchmarkServer({ baseUrl, server });
  const browser = await launchCaptureBrowser({ headless: args.headless });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errors = [];
    collectCapturePageErrors(page, errors);
    const url = benchmarkUrl(baseUrl, args);
    const loadStartedAtMs = performance.now();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: args.timeoutMs });
    await page.waitForFunction(
      () => window.__CITY_VISUALIZER_BENCHMARK_READY__ === true,
      null,
      { timeout: args.timeoutMs }
    );
    const readyMs = performance.now() - loadStartedAtMs;
    process.stdout.write(`  Scene ready in ${Math.round(readyMs)} ms; collecting frames...\n`);
    await page.waitForFunction(
      () => window.__CITY_VISUALIZER_BENCHMARK_RESULT__ !== null,
      null,
      { timeout: args.timeoutMs }
    );
    const result = await page.evaluate(() => window.__CITY_VISUALIZER_BENCHMARK_RESULT__);
    if (errors.length > 0) throw new Error(`Browser errors:\n${errors.join("\n")}`);
    const report = {
      ...result,
      measuredAt: new Date().toISOString(),
      pageReadyMs: Math.round(readyMs),
      headless: args.headless,
      url
    };
    await mkdir(path.dirname(args.output), { recursive: true });
    await writeFile(args.output, `${JSON.stringify(report, null, 2)}\n`);
    printReport(report, args.output);
  } finally {
    await browser.close();
  }
} finally {
  if (server) server.kill("SIGTERM");
}

function benchmarkUrl(baseUrl, options) {
  const params = new URLSearchParams({
    city: options.cityId,
    benchmark: CITY_VISUALIZER_BENCHMARK_ID,
    benchmarkWarmup: String(options.warmupSeconds),
    benchmarkDuration: String(options.durationSeconds),
    benchmarkCamera: options.cameraMode
  });
  return `${baseUrl}/city-visualizer/?${params}`;
}

function printReport(report, output) {
  const workload = report.scene.renderWorkload;
  process.stdout.write([
    `${report.id} performance benchmark`,
    `  City: ${report.scene.cityId} (${report.scene.approach}, ${report.scene.cameraMode})`,
    `  FPS: ${report.framesPerSecond}`,
    `  Frame time: ${report.frameTimeMs.mean} ms mean, ${report.frameTimeMs.p95} ms p95`,
    `  CPU time: ${report.cpuTimeMs.mean} ms mean, ${report.cpuTimeMs.p95} ms p95`,
    `  Render: ${report.stages["render.scene"]?.mean ?? 0} ms mean, ` +
      `${report.stages["render.scene"]?.p95 ?? 0} ms p95`,
    `  Scene work: ${workload.entries} entries, ${workload.staticEntries} static in ` +
      `${workload.staticBatches} cached batches, ${workload.dynamicEntries} dynamic`,
    `  Static cache: ${workload.staticCacheBuilds} builds, ${workload.staticCacheHits} hits`,
    `  Long frames: ${report.longFrames.over20Ms} >20 ms, ${report.longFrames.over33Ms} >33 ms`,
    `  Ready in: ${report.pageReadyMs} ms; browser: ${report.headless ? "headless" : "headed"}`,
    `  Report: ${output}`
  ].join("\n") + "\n");
}

function parseArgs(argv) {
  const parsed = {
    baseUrl: null,
    cityId: "london|united kingdom",
    cameraMode: "stationary",
    port: 5192,
    warmupSeconds: 2,
    durationSeconds: 8,
    headless: false,
    timeoutMs: 120_000,
    output: path.join(APP_ROOT, "build/performance/city-visualizer-latest.json")
  };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--base-url") parsed.baseUrl = requiredValue(argv, ++index, arg).replace(/\/$/, "");
    else if (arg === "--city") parsed.cityId = requiredValue(argv, ++index, arg);
    else if (arg === "--camera") parsed.cameraMode = requiredValue(argv, ++index, arg);
    else if (arg === "--port") parsed.port = positiveNumber(requiredValue(argv, ++index, arg), arg);
    else if (arg === "--warmup") parsed.warmupSeconds = positiveNumber(requiredValue(argv, ++index, arg), arg);
    else if (arg === "--duration") parsed.durationSeconds = positiveNumber(requiredValue(argv, ++index, arg), arg);
    else if (arg === "--headless") parsed.headless = true;
    else if (arg === "--timeout-ms") parsed.timeoutMs = positiveNumber(requiredValue(argv, ++index, arg), arg);
    else if (arg === "--output") parsed.output = path.resolve(APP_ROOT, requiredValue(argv, ++index, arg));
    else throw new Error(`Unknown city benchmark argument: ${arg}`);
  }
  if (!CITY_VISUALIZER_BENCHMARK_CAMERA_MODES.includes(parsed.cameraMode)) {
    throw new Error(`Unknown city benchmark camera mode: ${parsed.cameraMode}`);
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
