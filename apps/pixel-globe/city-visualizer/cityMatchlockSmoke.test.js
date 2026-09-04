import assert from "node:assert/strict";
import test from "node:test";

import { PORT_ASSAULT_FIREARM_SMOKE_DURATION_MS } from "../src/portAssaultBattle.js";
import { RESURRECT_64_HEX } from "../src/waterLatitudePalette.js";
import {
  CITY_MATCHLOCK_SMOKE_MAX_PUFFS,
  cityMatchlockSmokeParticles
} from "./cityMatchlockSmoke.js";

const CALM = Object.freeze({ flowX: 1, flowY: 0, strength: 0 });

test("one matchlock discharge creates a bounded deterministic pixel plume", () => {
  const input = {
    shotId: "gunner-3|4200",
    ageMs: 700,
    facingRight: true,
    wind: CALM
  };
  const particles = cityMatchlockSmokeParticles(input);

  assert.deepEqual(cityMatchlockSmokeParticles(input), particles);
  assert.ok(particles.length > 1 && particles.length <= CITY_MATCHLOCK_SMOKE_MAX_PUFFS);
  assert.ok(particles.every((particle) => (
    Number.isInteger(particle.x) &&
    Number.isInteger(particle.y) &&
    Number.isInteger(particle.size) &&
    particle.size >= 1 && particle.size <= 3 &&
    Number.isInteger(particle.shape) &&
    particle.shape >= 0 && particle.shape <= 3 &&
    particle.alpha >= 0 && particle.alpha <= 0.88 &&
    RESURRECT_64_HEX.includes(particle.color.slice(1))
  )));
});

test("matchlock smoke rises, drifts with live wind, and expires", () => {
  const common = {
    shotId: "teppo-1|8200",
    ageMs: 1100,
    facingRight: true
  };
  const east = cityMatchlockSmokeParticles({
    ...common,
    wind: { flowX: 1, flowY: 0, strength: 1 }
  });
  const west = cityMatchlockSmokeParticles({
    ...common,
    wind: { flowX: -1, flowY: 0, strength: 1 }
  });

  assert.ok(east.every(({ y }) => y <= 1));
  assert.ok(mean(east, "x") > mean(west, "x"));
  assert.deepEqual(cityMatchlockSmokeParticles({
    ...common,
    ageMs: PORT_ASSAULT_FIREARM_SMOKE_DURATION_MS,
    wind: CALM
  }), []);
});

test("the initial powder jet follows the matchlock's firing direction", () => {
  const common = {
    shotId: "gunner-8|200",
    ageMs: 40,
    wind: CALM
  };
  const right = cityMatchlockSmokeParticles({ ...common, facingRight: true });
  const left = cityMatchlockSmokeParticles({ ...common, facingRight: false });

  assert.ok(mean(right, "x") > mean(left, "x"));
});

function mean(particles, key) {
  return particles.reduce((sum, particle) => sum + particle[key], 0) / particles.length;
}
