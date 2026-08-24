import assert from "node:assert/strict";
import test from "node:test";

import { resolveWhaleRamCollision, whaleRamAppliedDamage } from "./whaleRam.js";
import { WHALE_LIFE_STAGE_ADOLESCENT, WHALE_LIFE_STAGE_ADULT } from "./whaleSpecies.js";

function playerBody({ headingX = 0, headingY = 1, mass = 35 } = {}) {
  return {
    id: "player",
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    headingX,
    headingY,
    mass,
    footprint: [
      { x: 8, y: 4 },
      { x: 8, y: -4 },
      { x: -8, y: -4 },
      { x: -8, y: 4 }
    ]
  };
}

test("adult sperm-whale rams use collision mass and impact angle", () => {
  const broadside = resolveWhaleRamCollision(playerBody(), { x: 1, y: 0 }, WHALE_LIFE_STAGE_ADULT);
  const bow = resolveWhaleRamCollision(
    playerBody({ headingX: 1, headingY: 0 }),
    { x: 1, y: 0 },
    WHALE_LIFE_STAGE_ADULT
  );
  assert.equal(broadside.whaleMass, 430);
  assert.ok(broadside.player.damage > bow.player.damage, JSON.stringify({ broadside, bow }));
  assert.ok(broadside.closingSpeed > 0);
});

test("adolescent sperm whales have less ramming mass than adults", () => {
  const adolescent = resolveWhaleRamCollision(
    playerBody(),
    { x: 1, y: 0 },
    WHALE_LIFE_STAGE_ADOLESCENT
  );
  const adult = resolveWhaleRamCollision(playerBody(), { x: 1, y: 0 }, WHALE_LIFE_STAGE_ADULT);
  assert.ok(adolescent.whaleMass < adult.whaleMass);
  assert.ok(adolescent.player.damage <= adult.player.damage);
});

test("a whale ram stops above zero unless the ship was already at one hull point", () => {
  assert.equal(whaleRamAppliedDamage(10, 20), 9);
  assert.equal(whaleRamAppliedDamage(2, 4), 1);
  assert.equal(whaleRamAppliedDamage(1, 4), 4);
});
