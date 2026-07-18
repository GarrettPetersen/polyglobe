import assert from "node:assert/strict";
import test from "node:test";

import { drunkenWineDialogue, wineEmergencyDialogue } from "./wineSurvival.js";

test("wine survival dialogue announces the emergency and rotates daily remarks", () => {
  assert.match(wineEmergencyDialogue(), /water casks are dry/i);
  assert.notEqual(drunkenWineDialogue(1), drunkenWineDialogue(2));
  assert.equal(drunkenWineDialogue(1), drunkenWineDialogue(5));
  assert.throws(() => drunkenWineDialogue(0), /Invalid wine-only day/);
});
