import assert from "node:assert/strict";
import test from "node:test";

import {
  WHALE_KILL_EFFECT_DURATION_MS,
  createWhaleKillEffect,
  whaleKillEffectComplete,
  whaleKillEffectFrame
} from "./whaleKillParticles.js";

const PIXELS = Object.freeze([
  Object.freeze({ x: 10, y: 10, color: "#111111", alpha: 1 }),
  Object.freeze({ x: 11, y: 10, color: "#222222", alpha: 0.8 }),
  Object.freeze({ x: 12, y: 11, color: "#333333", alpha: 1 }),
  Object.freeze({ x: 9, y: 11, color: "#444444", alpha: 0.9 })
]);

function effect() {
  return createWhaleKillEffect({
    id: "whale-1",
    pixels: PIXELS,
    centerX: 10.5,
    centerY: 10.5,
    startedAtMs: 1000,
    seed: 1522
  });
}

test("every visible whale pixel becomes a deterministic kill particle", () => {
  const first = effect();
  const second = effect();
  assert.equal(first.particles.length, PIXELS.length);
  assert.deepEqual(first, second);
  const opening = whaleKillEffectFrame(first, 1000, { x: 100, y: 80 });
  assert.deepEqual(
    opening.particles.map(({ x, y, color, alpha }) => ({ x, y, color, alpha })),
    PIXELS
  );
});

test("whale pixels burst outward and then converge on the ship", () => {
  const state = effect();
  const target = { x: 100, y: 80 };
  const burst = whaleKillEffectFrame(state, 1480, target);
  const stream = whaleKillEffectFrame(state, 2300, target);
  const suction = whaleKillEffectFrame(state, 3400, target);
  assert.ok(burst.particles.some((particle, index) => (
    particle.x !== PIXELS[index].x || particle.y !== PIXELS[index].y
  )));
  assert.ok(
    Math.max(...burst.particles.map((particle) => particle.x)) -
      Math.min(...burst.particles.map((particle) => particle.x)) > 10,
    "the opening burst should break apart the whale silhouette"
  );
  const burstDistance = averageDistance(burst.particles, target);
  const streamDistances = stream.particles.map((particle) => (
    Math.hypot(particle.x - target.x, particle.y - target.y)
  ));
  const suctionDistance = averageDistance(suction.particles, target);
  assert.ok(
    Math.max(...streamDistances) - Math.min(...streamDistances) > 15,
    "particles should form a staggered stream during suction"
  );
  assert.ok(stream.particles.some((particle) => particle.trailAlpha > 0));
  assert.ok(suctionDistance < burstDistance * 0.25, `${suctionDistance} is not close enough to ${target.x},${target.y}`);
  assert.ok(suction.particles.every((particle) => Number.isInteger(particle.x) && Number.isInteger(particle.y)));
});

test("submerged pixels become visible and foam accents mark the impact", () => {
  const state = createWhaleKillEffect({
    id: "submerged-whale",
    pixels: [{ x: 10, y: 10, color: "#111111", alpha: 0.34 }],
    centerX: 10,
    centerY: 10,
    startedAtMs: 1000,
    seed: 1522
  });
  const opening = whaleKillEffectFrame(state, 1000, { x: 100, y: 80 }).particles[0];
  assert.ok(opening.alpha >= 0.7);
  assert.equal(opening.accentAlpha, 1);
  assert.equal(opening.trailAlpha, 0);
});

test("the suction target follows the player ship and completes on time", () => {
  const state = effect();
  const left = whaleKillEffectFrame(state, 3400, { x: 80, y: 80 });
  const right = whaleKillEffectFrame(state, 3400, { x: 120, y: 80 });
  assert.ok(averageX(right.particles) > averageX(left.particles) + 20);
  assert.equal(whaleKillEffectComplete(state, 1000 + WHALE_KILL_EFFECT_DURATION_MS - 1), false);
  assert.equal(whaleKillEffectComplete(state, 1000 + WHALE_KILL_EFFECT_DURATION_MS), true);
  assert.deepEqual(
    whaleKillEffectFrame(state, 1000 + WHALE_KILL_EFFECT_DURATION_MS, { x: 100, y: 80 }),
    { complete: true, particles: [] }
  );
});

test("whale kill particles reject malformed effects and targets", () => {
  assert.throws(() => createWhaleKillEffect({
    id: "bad",
    pixels: [],
    centerX: 0,
    centerY: 0,
    startedAtMs: 0,
    seed: 1
  }), /requires visible sprite pixels/);
  assert.throws(() => whaleKillEffectFrame(effect(), 1000, { x: NaN, y: 0 }), /finite ship target/);
});

function averageDistance(particles, target) {
  return particles.reduce((sum, particle) => (
    sum + Math.hypot(particle.x - target.x, particle.y - target.y)
  ), 0) / particles.length;
}

function averageX(particles) {
  return particles.reduce((sum, particle) => sum + particle.x, 0) / particles.length;
}
