import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import {
  beginMainThreadFreezeFrame, createMainThreadFreezeMonitor,
  finishMainThreadFreezeFrame, recordMainThreadWork
} from "./mainThreadFreeze.js";

const main = readFileSync(new URL("./main.js", import.meta.url), "utf8");
const start = main.indexOf("function drawLakeBattlePortAssault(");
const end = main.indexOf("function drawHistoricalBattleMode(", start);
assert.ok(start >= 0 && end > start);
const drawSource = main.slice(start, end);

for (const slowStage of ["render.city.raster", "render.city.gpu.upload", "render.city.gpu.present", "render.city.emissive"]) {
  test(`duel assault freezes identify ${slowStage}`, () => {
    const monitor = createMainThreadFreezeMonitor();
    beginMainThreadFreezeFrame(monitor, 0);
    let nowMs = 0;
    const context = vm.createContext({
      lakeBattleMode: { portAssault: { battle: {} } },
      portCityRuntime: { render: () => 1, drawEmissiveOverlay: () => {} },
      lakeBattlePortAssaultElapsedMs: () => 0,
      portAssaultShipImpactShakeAt: () => ({ x: 0, y: 0 }),
      REDUCED_MOTION_MEDIA_QUERY: { matches: false },
      worldRenderer: { beginFrame() {}, endFrame() {} },
      SCREEN_W: 450, SCREEN_H: 259, screenCtx: {},
      lakeBattlePortAssaultPaletteVariant: () => "day",
      drawPortCitySceneChunk() {}, drawPortAssaultBattleStatus() {},
      lakeBattlePortAssaultResultIsReady: () => false,
      measurePerformanceBenchmarkStage(name, callback) {
        const value = callback();
        const durationMs = name === slowStage ? 1_100 : 1;
        nowMs += durationMs;
        recordMainThreadWork(monitor, name, durationMs, nowMs);
        return value;
      }
    });
    vm.runInContext(`${drawSource}\ndrawLakeBattlePortAssault(0);`, context);
    finishMainThreadFreezeFrame(monitor, nowMs);
    assert.equal(beginMainThreadFreezeFrame(monitor, nowMs + 16).cause, slowStage);
  });
}
