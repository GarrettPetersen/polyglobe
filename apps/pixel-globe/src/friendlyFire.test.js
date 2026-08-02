import assert from "node:assert/strict";
import test from "node:test";

import {
  FRIENDLY_FIRE_DIRECT,
  FRIENDLY_FIRE_ESCALATE,
  FRIENDLY_FIRE_SAME_VOLLEY,
  FRIENDLY_FIRE_WARNING,
  classifyPlayerCannonHit,
  clearFriendlyFireIncidents
} from "./friendlyFire.js";

function classify(incidents, overrides = {}) {
  return classifyPlayerCannonHit(incidents, {
    factionId: "france",
    volleyId: 7,
    targetAlreadyEngaged: false,
    firedDuringCombat: true,
    targetAlreadyHostile: false,
    ...overrides
  });
}

test("one stray broadside is forgiven per faction during a battle", () => {
  const incidents = new Map();

  assert.equal(classify(incidents), FRIENDLY_FIRE_WARNING);
  assert.equal(classify(incidents), FRIENDLY_FIRE_SAME_VOLLEY);
  assert.equal(classify(incidents, { volleyId: 8 }), FRIENDLY_FIRE_ESCALATE);
});

test("aimed and already-hostile cannon hits remain direct attacks", () => {
  const incidents = new Map();

  assert.equal(classify(incidents, { targetAlreadyEngaged: true }), FRIENDLY_FIRE_DIRECT);
  assert.equal(classify(incidents, { firedDuringCombat: false }), FRIENDLY_FIRE_DIRECT);
  assert.equal(classify(incidents, { targetAlreadyHostile: true }), FRIENDLY_FIRE_DIRECT);
  assert.equal(incidents.size, 0);
});

test("friendly-fire forgiveness resets after combat", () => {
  const incidents = new Map();
  assert.equal(classify(incidents), FRIENDLY_FIRE_WARNING);

  clearFriendlyFireIncidents(incidents);

  assert.equal(classify(incidents, { volleyId: 12 }), FRIENDLY_FIRE_WARNING);
});
