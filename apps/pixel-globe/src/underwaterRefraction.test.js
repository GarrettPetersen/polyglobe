import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  UNDERWATER_REFRACTION_PERIOD_MS,
  UNDERWATER_REFRACTION_SHADER_TIME_COEFFICIENT,
  WATER_SURFACE_REFRACTION_PX,
  underwaterRefractionPhase,
  waterSurfaceRefractionPx
} from "./underwaterRefraction.js";

test("underwater refraction uses one calm four-second cycle", () => {
  assert.equal(UNDERWATER_REFRACTION_PERIOD_MS, 4000);
  assert.equal(UNDERWATER_REFRACTION_SHADER_TIME_COEFFICIENT, 4 / 4000);
  assert.equal(underwaterRefractionPhase(0), 0);
  assert.ok(Math.abs(underwaterRefractionPhase(4000) - Math.PI * 2) < 1e-12);
});

test("underwater refraction rejects malformed time", () => {
  assert.throws(() => underwaterRefractionPhase(Number.NaN), /finite time/);
});

test("unfrozen water terrain receives one pixel of row refraction", () => {
  assert.equal(WATER_SURFACE_REFRACTION_PX, 1);
  assert.equal(waterSurfaceRefractionPx({
    isWaterSurface: true,
    hasSurfaceIce: false,
    reducedMotion: false
  }), 1);
  for (const options of [
    { isWaterSurface: false, hasSurfaceIce: false, reducedMotion: false },
    { isWaterSurface: true, hasSurfaceIce: true, reducedMotion: false },
    { isWaterSurface: true, hasSurfaceIce: false, reducedMotion: true }
  ]) {
    assert.equal(waterSurfaceRefractionPx(options), 0);
  }
});

test("water surface refraction rejects ambiguous state", () => {
  assert.throws(() => waterSurfaceRefractionPx({
    isWaterSurface: true,
    hasSurfaceIce: false,
    reducedMotion: null
  }), /boolean reducedMotion/);
});

test("terrain and fish submit visible pixel-grid refraction to the world renderer", async () => {
  const mainSource = await readFile(new URL("./main.js", import.meta.url), "utf8");
  const terrainSprites = mainSource.match(
    /function terrainPersistentSprites[\s\S]*?\n}\n\nfunction currentOceanSwellPresentation/
  )?.[0];
  assert.ok(terrainSprites, "terrain sprite submission function must remain discoverable");
  assert.match(terrainSprites, /waterSurfaceRefractionPx\(/);
  assert.match(
    terrainSprites,
    /sprites\.push\(\{ source, destinationRect, swellPosition, reframeMotion, refractionPx \}\)/
  );
  assert.doesNotMatch(mainSource, /refractionPx:\s*0\.45/);
});
