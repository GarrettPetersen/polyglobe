import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const APP_ROOT = new URL("..", import.meta.url);

test("port assaults bundle dedicated, credited melee cues", () => {
  for (const filename of [
    "three-kingdoms-stratagem-melee-swing.ogg",
    "three-kingdoms-stratagem-melee-hit.ogg"
  ]) {
    const sound = readFileSync(new URL(`public/assets/sfx/${filename}`, APP_ROOT));
    assert.equal(sound.toString("ascii", 0, 4), "OggS");
    assert.ok(sound.length > 3000);
  }

  const credits = readFileSync(new URL("public/assets/CREDITS.md", APP_ROOT), "utf8");
  assert.match(credits, /Three Kingdoms Stratagem - melee swing and hit cues/);
  const provenance = readFileSync(
    new URL("public/assets/licenses/three-kingdoms-stratagem-melee-sfx.txt", APP_ROOT),
    "utf8"
  );
  assert.match(provenance, /whiff\.ogg and public\/assets\/sfx\/slash\.ogg/);
});

test("port assault firearm and melee events use loud, dedicated sound pools", () => {
  const source = readFileSync(new URL("src/main.js", APP_ROOT), "utf8");
  assert.match(source, /SFX_PORT_ASSAULT_FIREARM_VOLUME = 0\.92/);
  assert.match(source, /soundEffects\?\.meleeSwing, SFX_PORT_ASSAULT_MELEE_SWING_VOLUME/);
  assert.match(source, /soundEffects\?\.meleeHit, SFX_PORT_ASSAULT_MELEE_HIT_VOLUME/);
  assert.doesNotMatch(
    source,
    /event\.attackType === "melee"\) \{\s*playSoundEffect\(soundEffects\?\.impact/
  );
  assert.match(
    source,
    /event\.type === "ship-hit"\) \{\s*playCannonImpactSound\(0\)/
  );
});
