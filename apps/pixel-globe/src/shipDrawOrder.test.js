import assert from "node:assert/strict";
import test from "node:test";

import { compareShipDrawCalls } from "./shipDrawOrder.js";

test("player and NPC ships share normal screen-depth ordering", () => {
  const calls = [
    { id: "player", kind: "player", sortY: 128 },
    { id: "npc-behind", kind: "npc", sortY: 116 },
    { id: "npc-in-front", kind: "npc", sortY: 141 }
  ];

  calls.sort(compareShipDrawCalls);
  assert.deepEqual(calls.map(({ id }) => id), ["npc-behind", "player", "npc-in-front"]);
});

test("equal-depth ship ordering is deterministic without privileging the player", () => {
  const calls = [
    { id: "player", kind: "player", sortY: 128 },
    { id: "merchant-2", kind: "npc", sortY: 128 },
    { id: "merchant-1", kind: "npc", sortY: 128 }
  ];

  calls.sort(compareShipDrawCalls);
  assert.deepEqual(calls.map(({ id }) => id), ["merchant-1", "merchant-2", "player"]);
});
