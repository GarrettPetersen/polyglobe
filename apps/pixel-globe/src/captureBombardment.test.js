import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";

const source = readFileSync(new URL("./main.js", import.meta.url), "utf8");
const start = source.indexOf("function updateCapturePillage(");
const end = source.indexOf("function updateCaptureColonization(", start);
assert.ok(start >= 0 && end > start);

function verifyVolley({ hitPoints, startingHitPoints, disabled = false }) {
  const events = [];
  const context = vm.createContext({
    sequence: { variant: "bombard", cityId: "havana|cuba", batteryStartingHitPoints: startingHitPoints },
    capturePortCallById: () => ({}),
    ensureShoreBatteryState: () => ({ hitPoints, maxHitPoints: 16, engagedTargetIds: new Set() }),
    PLAYER_COMBAT_ID: "player", weatherClockMinutes: 0,
    captureCue: (id) => id === "verify-battery-hit",
    shoreBatteryIsDisabled: () => disabled,
    emitCaptureEvent: (_, event) => events.push(event)
  });
  vm.runInContext(`${source.slice(start, end)}\nupdateCapturePillage(sequence);`, context);
  return events[0].action;
}

test("one volley must damage a full-health port but need not destroy it", () => {
  assert.equal(verifyVolley({ hitPoints: 12 }), "battery-damaged-by-player-volley");
  assert.equal(verifyVolley({ hitPoints: 0, disabled: true }), "battery-disabled-by-player-volley");
  assert.throws(() => verifyVolley({ hitPoints: 16 }), /Capture volley failed/);
});

test("a staged weakened battery still must be disabled by the volley", () => {
  assert.equal(verifyVolley({ hitPoints: 0, startingHitPoints: 1, disabled: true }),
    "battery-disabled-by-player-volley");
  assert.throws(() => verifyVolley({ hitPoints: 1, startingHitPoints: 2 }), /Capture volley failed/);
});
