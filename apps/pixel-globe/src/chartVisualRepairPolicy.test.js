import test from "node:test";
import assert from "node:assert/strict";
import {
  CHART_WEATHER_REPAIR_CONFIRMATION_MS,
  advanceChartWeatherRepairConfirmation,
  chooseChartVisualRepair
} from "./chartVisualRepairPolicy.js";

const viewport = { viewportWidth: 455, viewportHeight: 256 };
const calm = {
  sampleCount: 4,
  rotationDeg: 0,
  rmsDistortionPx: 0,
  maxDistortionPx: 0
};
const attachedTerrain = { extraPx: 0, surface: null, screenX: 350, screenY: 100 };

test("stable charts do not summon concealment effects", () => {
  assert.equal(repairKind({ drift: calm, terrainTear: attachedTerrain }), "none");
});

test("elastic open ocean leaves correction to the swell", () => {
  assert.equal(repairKind({
    drift: { ...calm, rotationDeg: 20 },
    terrainTear: { extraPx: 40, surface: "water", screenX: 430, screenY: 20 },
    swellRepairAvailable: true
  }), "none");
});

test("protected-water faults use weather when swell repair is unavailable", () => {
  assert.equal(repairKind({
    drift: { ...calm, rotationDeg: 20, maxDistortionPx: 40 },
    terrainTear: { extraPx: 40, surface: "water", screenX: 430, screenY: 20 },
    distortionSurface: "water"
  }), "closing-fog");
});

test("large sustained-looking land rotation targets a sparse cloud repair group", () => {
  assert.equal(repairKind({
    drift: { ...calm, rotationDeg: 13 },
    terrainTear: attachedTerrain,
    distortionSurface: "land"
  }), "full-cloud");
});

test("minor local faults do not summon last-resort weather", () => {
  assert.equal(repairKind({
    drift: calm,
    terrainTear: { extraPx: 9, surface: "land", screenX: 250, screenY: 130 }
  }), "none");
});

test("a material local tear receives a partial cloud rather than a full-screen effect", () => {
  assert.equal(repairKind({
    drift: calm,
    terrainTear: { extraPx: 18, surface: "land", screenX: 250, screenY: 130 }
  }), "partial-cloud");
});

test("a severe distant tear closes the fog around the player", () => {
  assert.equal(repairKind({
    drift: calm,
    terrainTear: { extraPx: 40, surface: "land", screenX: 430, screenY: 20 }
  }), "closing-fog");
});

test("a severe distant tear uses heat haze instead of implausible desert fog", () => {
  assert.equal(repairKind({
    drift: calm,
    terrainTear: { extraPx: 40, surface: "land", screenX: 430, screenY: 20 },
    heatHazeAvailable: true
  }), "heat-haze");
});

test("persistent polar fog repairs faults it already fully hides", () => {
  assert.equal(repairKind({
    drift: { ...calm, rmsDistortionPx: 12, maxDistortionPx: 24 },
    terrainTear: { ...attachedTerrain, surface: "land" },
    distortionSurface: "land",
    polarFogCoversFault: true
  }), "polar-fog");
});

test("weather repair requires a persistent fault rather than one bad measurement", () => {
  const candidate = {
    kind: "partial-cloud",
    fault: { x: 20, y: 30, sizePx: 20, surface: "land" }
  };
  const first = advanceChartWeatherRepairConfirmation({
    pending: null,
    candidate,
    nowMs: 100
  });
  assert.equal(first.repair.kind, "none");
  const transient = advanceChartWeatherRepairConfirmation({
    pending: first.pending,
    candidate: { kind: "none" },
    nowMs: 5_000
  });
  assert.equal(transient.pending, null);
  const restarted = advanceChartWeatherRepairConfirmation({
    pending: transient.pending,
    candidate,
    nowMs: 6_000
  });
  const confirmed = advanceChartWeatherRepairConfirmation({
    pending: restarted.pending,
    candidate,
    nowMs: 6_000 + CHART_WEATHER_REPAIR_CONFIRMATION_MS
  });
  assert.equal(confirmed.repair, candidate);
});

test("weather persistence does not accumulate across unrelated fault locations", () => {
  const first = advanceChartWeatherRepairConfirmation({
    pending: null,
    candidate: {
      kind: "partial-cloud",
      fault: { x: 20, y: 30, sizePx: 20, surface: "land" }
    },
    nowMs: 0
  });
  const moved = advanceChartWeatherRepairConfirmation({
    pending: first.pending,
    candidate: {
      kind: "partial-cloud",
      fault: { x: 250, y: 30, sizePx: 20, surface: "land" }
    },
    nowMs: CHART_WEATHER_REPAIR_CONFIRMATION_MS
  });
  assert.equal(moved.repair.kind, "none");
  assert.equal(moved.pending.startedAtMs, CHART_WEATHER_REPAIR_CONFIRMATION_MS);
});

function repairKind({
  drift,
  terrainTear,
  polarFogCoversFault = false,
  swellRepairAvailable = false,
  distortionSurface = "land",
  heatHazeAvailable = false
}) {
  return chooseChartVisualRepair({
    ...viewport,
    drift,
    terrainTear,
    distortionPoint: { x: 400, y: 40 },
    swellRepairAvailable,
    distortionSurface,
    polarFogCoversFault,
    heatHazeAvailable
  }).kind;
}
