import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const MAIN_SOURCE = readFileSync(new URL("./main.js", import.meta.url), "utf8");

test("strategic worker application cannot pause responsive ship and projectile systems", () => {
  const start = MAIN_SOURCE.indexOf("function updateNpcShips(dt)");
  const end = MAIN_SOURCE.indexOf("\nfunction distantWorldRuntimeState()", start);
  assert.notEqual(start, -1, "main runtime has no NPC update function");
  assert.notEqual(end, -1, "NPC update function has no source boundary");
  const source = MAIN_SOURCE.slice(start, end);
  const workerRequestGate = source.match(/if \(!workerApplyPending\) \{([\s\S]*?)\n  \}/);
  assert.ok(workerRequestGate, "NPC update function has no strategic worker request gate");
  assert.doesNotMatch(
    workerRequestGate[1],
    /worldSimulationScheduler\.advance/,
    "strategic snapshot application must not gate responsive simulation"
  );
  assert.equal(
    [...source.matchAll(/worldSimulationScheduler\.advance\(dt\)/g)].length,
    1,
    "responsive world simulation must advance exactly once per frame"
  );
});

test("visible NPC motion can catch up after a slow rendered frame", () => {
  const start = MAIN_SOURCE.indexOf("function createWorldSimulationScheduler()");
  const end = MAIN_SOURCE.indexOf("\nfunction initializeDistantWorldWorker()", start);
  assert.notEqual(start, -1, "main runtime has no world scheduler factory");
  assert.notEqual(end, -1, "world scheduler factory has no source boundary");
  const source = MAIN_SOURCE.slice(start, end);
  assert.match(
    source,
    /id: "visible-npcs",\s+hz: NPC_VISUAL_UPDATE_HZ,\s+maxStepsPerAdvance: 2,\s+maxAccumulatedSteps: 3/,
    "visible NPC motion must retain bounded catch-up capacity"
  );
});
