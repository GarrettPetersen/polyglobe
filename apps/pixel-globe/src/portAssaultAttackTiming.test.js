import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PORT_ASSAULT_ATTACK_CUES, portAssaultAttackTiming, portAssaultProjectileFlightMs } from "./portAssaultAttackTiming.js";
import { PORT_ASSAULT_PROFILE_ID } from "./portAssaultBattle.js";
import { cityAnimationFrame, CITY_ANIMATION_PLAYBACK } from "../city-visualizer/cityAnimationFrame.js";
import { cityAssaultImpactParticles } from "../city-visualizer/cityAssaultFeedback.js";
const manifest = JSON.parse(readFileSync(new URL("../city-visualizer/assets/minifolks/manifest.json", import.meta.url)));

test("every combat profile and palette variant has an atlas-verified contact cue", () => {
  assert.deepEqual(Object.keys(PORT_ASSAULT_ATTACK_CUES).sort(), Object.values(PORT_ASSAULT_PROFILE_ID).sort());
  for (const [profileId, cue] of Object.entries(PORT_ASSAULT_ATTACK_CUES)) {
    const appearances = manifest.appearances.filter(a => a.archetypeId === cue.archetypeId);
    assert.ok(appearances.length > 0, profileId);
    for (const appearance of appearances) {
      const frames = appearance.animations.attack;
      assert.equal(frames.slice(0, cue.contactFrame).reduce((sum,f)=>sum+f.duration,0), cue.sourceContactMs, appearance.id);
      assert.equal(frames.reduce((sum,f)=>sum+f.duration,0), cue.sourceDurationMs, appearance.id);
      for (const attackType of ["melee", "arrow", "firearm"]) {
        const timing = portAssaultAttackTiming(profileId, attackType);
        assert.equal(cityAnimationFrame(frames, timing.contactMs, CITY_ANIMATION_PLAYBACK.ONCE, timing), frames[cue.contactFrame], `${appearance.id}/${attackType}`);
        assert.equal(cityAnimationFrame(frames, timing.contactMs - 1, CITY_ANIMATION_PLAYBACK.ONCE, timing), frames[cue.contactFrame - 1]);
      }
    }
  }
  assert.throws(()=>portAssaultAttackTiming("unknown", "melee"), /cue/);
  assert.throws(()=>portAssaultProjectileFlightMs("unknown"), /projectile/);
});

test("impact flecks are bounded, deterministic and use only the victim palette", () => {
  for (const incomingX of [-1, 1]) {
    const input = {ageMs: 200, incomingX, incomingY: 0, colors: ["255, 255, 255", "20, 40, 80"]};
    const particles = cityAssaultImpactParticles(input);
    assert.equal(particles.length,3);
    assert.deepEqual(particles, cityAssaultImpactParticles(input));
    for (const p of particles) { assert.ok(input.colors.includes(p.color)); assert.ok(p.x * incomingX > 0); }
    assert.deepEqual(cityAssaultImpactParticles({...input,ageMs:360}), []);
  }
  assert.throws(()=>cityAssaultImpactParticles({ageMs:0,incomingX:0,incomingY:0,colors:[]}), /Invalid/);
});
