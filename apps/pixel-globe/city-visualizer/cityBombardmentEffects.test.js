import assert from "node:assert/strict";
import test from "node:test";

import { RESURRECT_64_HEX } from "../src/waterLatitudePalette.js";
import { cityChimneySmokeParticles } from "./cityChimneySmoke.js";
import {
  CITY_BOMBARDMENT_SMOKE_FRAME_MS,
  cityBombardmentEffectGeometry,
  cityBombardmentEffectIntersectsViewport
} from "./cityBombardmentEffects.js";

const effect = () => cityBombardmentEffectGeometry({
  damage: {
    edge: "top",
    holeBounds: { x: 18, y: 4, width: 12, height: 10 }
  },
  sourceWidth: 64,
  sourceHeight: 48,
  destination: { x: 300, y: 120, width: 128, height: 96 },
  seed: 917
});

test("bombardment flames include an unmasked crown above the breached silhouette", () => {
  const geometry = effect();
  const scaledOpeningTop = 120 + 4 / 48 * 96;
  assert.ok(geometry.exteriorFlame.y < scaledOpeningTop);
  assert.ok(geometry.exteriorFlame.height > 1);
  assert.ok(geometry.breachFlame.height > geometry.exteriorFlame.height);
  assert.deepEqual(effect(), geometry, "effect geometry must be deterministic");
});

test("burning buildings produce a dense, wind-driven Resurrect 64 smoke plume", () => {
  const { smokeEmitter } = effect();
  const smoke = cityChimneySmokeParticles(smokeEmitter, 5000, {
    flowDirectionRad: 0,
    strength: 1
  });
  const calm = cityChimneySmokeParticles(smokeEmitter, 5000, {
    flowDirectionRad: 0,
    strength: 0
  });
  assert.ok(smoke.length >= 40, `expected a dense plume, got ${smoke.length} particles`);
  assert.ok(meanX(smoke) > meanX(calm));
  assert.ok(smoke.some((particle) => particle.y < smokeEmitter.y - 30));
  assert.ok(smokeEmitter.maximumSize >= 4);
  assert.ok(smokeEmitter.colors.every((color) => RESURRECT_64_HEX.includes(color.slice(1))));
  assert.equal(CITY_BOMBARDMENT_SMOKE_FRAME_MS, 100);
});

test("distant burning buildings retain smoke but scale its render cost", () => {
  const geometry = cityBombardmentEffectGeometry({
    damage: {
      edge: "left",
      holeBounds: { x: 0, y: 14, width: 9, height: 12 }
    },
    sourceWidth: 64,
    sourceHeight: 48,
    destination: { x: 20, y: 30, width: 16, height: 12 },
    seed: 311
  });
  const smoke = cityChimneySmokeParticles(geometry.smokeEmitter, 5000);
  assert.ok(smoke.length >= 10);
  assert.ok(smoke.length < cityChimneySmokeParticles(effect().smokeEmitter, 5000).length);
  assert.equal(geometry.smokeEmitter.maximumSize, 1);
});

test("bombardment effects cull distant work but retain smoke drifting in from an edge", () => {
  assert.equal(cityBombardmentEffectIntersectsViewport({
    destination: { x: 460, y: 100, width: 30, height: 40 },
    viewportWidth: 455,
    viewportHeight: 256
  }), true);
  assert.equal(cityBombardmentEffectIntersectsViewport({
    destination: { x: 700, y: 100, width: 30, height: 40 },
    viewportWidth: 455,
    viewportHeight: 256
  }), false);
  assert.equal(cityBombardmentEffectIntersectsViewport({
    destination: { x: 100, y: 500, width: 30, height: 40 },
    viewportWidth: 455,
    viewportHeight: 256
  }), false);
});

test("bombardment effect geometry rejects malformed openings and destinations", () => {
  assert.throws(
    () => cityBombardmentEffectGeometry({
      damage: { edge: "bottom", holeBounds: { x: 0, y: 0, width: 1, height: 1 } },
      sourceWidth: 10,
      sourceHeight: 10,
      destination: { x: 0, y: 0, width: 10, height: 10 },
      seed: 1
    }),
    /effect source/
  );
  assert.throws(
    () => cityBombardmentEffectGeometry({
      damage: { edge: "top", holeBounds: { x: 9, y: 0, width: 2, height: 1 } },
      sourceWidth: 10,
      sourceHeight: 10,
      destination: { x: 0, y: 0, width: 10, height: 10 },
      seed: 1
    }),
    /opening bounds/
  );
});

function meanX(particles) {
  return particles.reduce((sum, particle) => sum + particle.x, 0) / particles.length;
}
