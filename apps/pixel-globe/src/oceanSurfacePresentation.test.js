import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const MAIN_SOURCE = readFileSync(new URL("./main.js", import.meta.url), "utf8");

function functionSource(name, nextName) {
  const start = MAIN_SOURCE.indexOf(`function ${name}(`);
  const end = MAIN_SOURCE.indexOf(`function ${nextName}(`, start + 1);
  assert.ok(start >= 0, `${name} is missing`);
  assert.ok(end > start, `${name} has no ${nextName} boundary`);
  return MAIN_SOURCE.slice(start, end);
}

test("featureless open ocean receives no topology overlay", () => {
  const eligibility = functionSource(
    "staticSurfaceDetailTileCallAffectsLayer",
    "waterForegroundTileCallAffectsLayer"
  );

  assert.doesNotMatch(eligibility, /isPentagon/);
  assert.doesNotMatch(MAIN_SOURCE, /drawTerrainPentagonMarker/);
});
