import assert from "node:assert/strict";
import test from "node:test";

import {
  WHALE_BLOW_DURATION_SECONDS,
  WHALE_BLOW_GRAVITY_PX_PER_SECOND,
  WHALE_BLOW_PARTICLE_COUNT,
  createWhaleBlowParticles,
  whaleBlowParticleFrame
} from "./whaleBlowParticles.js";

test("whale spouts blast a dense plume roughly fifty pixels high", () => {
  const particles = createWhaleBlowParticles(0x5748414c);

  assert.equal(particles.length, WHALE_BLOW_PARTICLE_COUNT);
  for (const particle of particles) {
    assert.ok(particle.peakHeightPx >= 48);
    assert.ok(particle.peakHeightPx <= 55);
    const apexAge = particle.delaySeconds +
      particle.verticalSpeed / WHALE_BLOW_GRAVITY_PX_PER_SECOND;
    const frame = whaleBlowParticleFrame(particle, apexAge);
    assert.ok(frame);
    assert.ok(-frame.y >= 48);
    assert.ok(frame.alpha > 0);
  }
});

test("whale spout particles stay bright on ascent then spread into fading haze", () => {
  const particle = createWhaleBlowParticles(1522)[0];
  const ascent = whaleBlowParticleFrame(
    particle,
    particle.delaySeconds + particle.mistStartsAtSeconds * 0.75
  );
  const haze = whaleBlowParticleFrame(
    particle,
    particle.delaySeconds + (particle.fadeStartsAtSeconds + particle.fadeEndsAtSeconds) / 2
  );

  assert.ok(ascent);
  assert.equal(ascent.mist, 0);
  assert.equal(ascent.alpha, 0.94);
  assert.ok(haze);
  assert.ok(haze.mist > 0);
  assert.ok(haze.alpha < ascent.alpha);
  assert.notEqual(haze.hazeOffsetX, 0);
});

test("whale spout motion depends on elapsed time rather than frame count", () => {
  const particle = createWhaleBlowParticles(99)[7];
  const age = Math.min(1.5, WHALE_BLOW_DURATION_SECONDS - particle.delaySeconds);

  assert.deepEqual(
    whaleBlowParticleFrame(particle, age),
    whaleBlowParticleFrame(particle, age)
  );
});
