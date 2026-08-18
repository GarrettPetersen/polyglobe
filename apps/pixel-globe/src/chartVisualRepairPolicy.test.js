import test from "node:test";
import assert from "node:assert/strict";
import {
  CHART_SEVERE_REPAIR_CONFIRMATION_MS,
  CHART_WEATHER_REPAIR_CONFIRMATION_MS,
  advanceChartWeatherRepairConfirmation,
  chartVisualRepairMayEnterCooldown,
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

test("chart weather repairs cool down only after their fault is settled", () => {
  assert.equal(chartVisualRepairMayEnterCooldown({
    pendingTileRepairs: false,
    faultRemains: false
  }), true);
  assert.equal(chartVisualRepairMayEnterCooldown({
    pendingTileRepairs: true,
    faultRemains: false
  }), false);
  assert.equal(chartVisualRepairMayEnterCooldown({
    pendingTileRepairs: false,
    faultRemains: true
  }), false);
});

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

test("frame-wide rotation uses frame-wide weather when swell repair is unavailable", () => {
  assert.equal(repairKind({
    drift: { ...calm, rotationDeg: 20, maxDistortionPx: 40 },
    terrainTear: { extraPx: 40, surface: "water", screenX: 430, screenY: 20 },
    distortionSurface: "water"
  }), "full-cloud");
});

test("existing polar fog takes priority over a new general weather effect", () => {
  assert.equal(repairKind({
    drift: { ...calm, rotationDeg: 20, maxDistortionPx: 40 },
    terrainTear: { extraPx: 40, surface: "land", screenX: 430, screenY: 20 },
    distortionSurface: "land",
    polarFogCoversFault: true
  }), "polar-fog");
});

test("large sustained-looking land rotation targets a sparse cloud repair group", () => {
  assert.equal(repairKind({
    drift: { ...calm, rotationDeg: 13 },
    terrainTear: attachedTerrain,
    distortionSurface: "land"
  }), "full-cloud");
});

test("hot dry rotation uses ambient heat haze before summoning clouds", () => {
  assert.equal(repairKind({
    drift: { ...calm, rotationDeg: 13 },
    terrainTear: attachedTerrain,
    distortionSurface: "land",
    heatHazeAvailable: true
  }), "heat-haze");
});

test("minor local faults do not summon last-resort weather", () => {
  assert.equal(repairKind({
    drift: calm,
    terrainTear: { extraPx: 7, surface: "land", screenX: 250, screenY: 130 }
  }), "none");
});

test("the first actionable terrain fault receives a repair instead of a policy gap", () => {
  assert.equal(repairKind({
    drift: calm,
    terrainTear: { extraPx: 8, surface: "land", screenX: 250, screenY: 130 }
  }), "partial-cloud");
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

test("catastrophic structural faults start repair immediately", () => {
  const candidate = repairCandidate({
    drift: calm,
    terrainTear: { extraPx: 114, surface: "coast", screenX: 430, screenY: 20 }
  });
  const result = advanceChartWeatherRepairConfirmation({
    pending: null,
    candidate,
    nowMs: 100
  });
  assert.equal(candidate.confirmationMs, 0);
  assert.equal(result.repair, candidate);
});

test("benchmark-breaking frame distortion bypasses weather cooldown", () => {
  const candidate = repairCandidate({
    drift: { ...calm, rotationDeg: -5.21, rmsDistortionPx: 13.69, maxDistortionPx: 21.81 },
    terrainTear: {
      extraPx: 1.33,
      surface: "coast",
      screenX: 430,
      screenY: 20
    },
    distortionSurface: "water"
  });
  const result = advanceChartWeatherRepairConfirmation({
    pending: null,
    candidate,
    nowMs: 100
  });

  assert.equal(candidate.kind, "full-cloud");
  assert.equal(candidate.confirmationMs, 0);
  assert.equal(result.repair, candidate);
});

test("broad distortion keeps one confirmation window when its worst point moves", () => {
  const firstCandidate = repairCandidate({
    drift: { ...calm, rmsDistortionPx: 14, maxDistortionPx: 17 },
    terrainTear: attachedTerrain,
    distortionSurface: "land"
  });
  const first = advanceChartWeatherRepairConfirmation({
    pending: null,
    candidate: firstCandidate,
    nowMs: 0
  });
  const movedCandidate = {
    ...firstCandidate,
    fault: { ...firstCandidate.fault, x: 20, y: 220 }
  };
  const confirmed = advanceChartWeatherRepairConfirmation({
    pending: first.pending,
    candidate: movedCandidate,
    nowMs: CHART_SEVERE_REPAIR_CONFIRMATION_MS
  });
  assert.equal(firstCandidate.frameWide, true);
  assert.equal(confirmed.repair, movedCandidate);
});

test("broad distortion keeps one confirmation window when its sampled surface changes", () => {
  const landCandidate = repairCandidate({
    drift: { ...calm, rmsDistortionPx: 20.4, maxDistortionPx: 22.5 },
    terrainTear: attachedTerrain,
    distortionSurface: "land"
  });
  const first = advanceChartWeatherRepairConfirmation({
    pending: null,
    candidate: landCandidate,
    nowMs: 0
  });
  const coastCandidate = repairCandidate({
    drift: { ...calm, rmsDistortionPx: 20.4, maxDistortionPx: 22.5 },
    terrainTear: attachedTerrain,
    distortionSurface: "coast"
  });
  const confirmed = advanceChartWeatherRepairConfirmation({
    pending: first.pending,
    candidate: coastCandidate,
    nowMs: CHART_SEVERE_REPAIR_CONFIRMATION_MS
  });

  assert.equal(landCandidate.frameWide, true);
  assert.equal(coastCandidate.frameWide, true);
  assert.equal(confirmed.repair, coastCandidate);
});

function repairKind({
  drift,
  terrainTear,
  polarFogCoversFault = false,
  swellRepairAvailable = false,
  distortionSurface = "land",
  heatHazeAvailable = false
}) {
  return repairCandidate({
    drift,
    terrainTear,
    polarFogCoversFault,
    swellRepairAvailable,
    distortionSurface,
    heatHazeAvailable
  }).kind;
}

function repairCandidate({
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
  });
}
