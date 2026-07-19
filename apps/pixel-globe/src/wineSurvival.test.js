import assert from "node:assert/strict";
import test from "node:test";

import {
  DRUNK_PORT_ARRIVAL_MINUTES,
  captainIsDrunkAtPort,
  drunkenWineDialogue,
  wineEmergencyDialogue
} from "./wineSurvival.js";

test("wine survival dialogue announces the emergency and rotates daily remarks", () => {
  assert.match(wineEmergencyDialogue(), /water casks are dry/i);
  assert.notEqual(drunkenWineDialogue(1), drunkenWineDialogue(2));
  assert.equal(drunkenWineDialogue(1), drunkenWineDialogue(5));
  assert.throws(() => drunkenWineDialogue(0), /Invalid wine-only day/);
});

test("a captain is drunk after a substantial wine-only stretch", () => {
  assert.equal(captainIsDrunkAtPort({ survival: { wineOnlyMinutes: DRUNK_PORT_ARRIVAL_MINUTES - 1 } }), false);
  assert.equal(captainIsDrunkAtPort({ survival: { wineOnlyMinutes: DRUNK_PORT_ARRIVAL_MINUTES } }), true);
});
