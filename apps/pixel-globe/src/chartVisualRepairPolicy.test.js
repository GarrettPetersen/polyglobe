import test from "node:test";
import assert from "node:assert/strict";
import { chooseChartVisualRepair } from "./chartVisualRepairPolicy.js";

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

test("large rotation alone requires a full moving cloud bank", () => {
  assert.equal(repairKind({
    drift: { ...calm, rotationDeg: 13 },
    terrainTear: attachedTerrain
  }), "full-cloud");
});

test("a modest local tear receives a partial cloud rather than a full-screen effect", () => {
  assert.equal(repairKind({
    drift: calm,
    terrainTear: { extraPx: 9, surface: "land", screenX: 250, screenY: 130 }
  }), "partial-cloud");
});

test("a severe distant tear closes the fog around the player", () => {
  assert.equal(repairKind({
    drift: calm,
    terrainTear: { extraPx: 30, surface: "land", screenX: 430, screenY: 20 }
  }), "closing-fog");
});

test("persistent polar fog repairs faults it already fully hides", () => {
  assert.equal(repairKind({
    drift: { ...calm, rmsDistortionPx: 7, maxDistortionPx: 9 },
    terrainTear: attachedTerrain,
    polarFogCoversFault: true
  }), "polar-fog");
});

function repairKind({
  drift,
  terrainTear,
  polarFogCoversFault = false,
  swellRepairAvailable = false
}) {
  return chooseChartVisualRepair({
    ...viewport,
    drift,
    terrainTear,
    distortionPoint: { x: 400, y: 40 },
    swellRepairAvailable,
    polarFogCoversFault
  }).kind;
}
