import assert from "node:assert/strict";
import test from "node:test";

import {
  COMBAT_THREAT_BIG,
  COMBAT_THREAT_SMALL,
  combatMusicTrackForThreat
} from "./combatMusic.js";

test("combat threat selects the intended small or large battle score", () => {
  assert.equal(combatMusicTrackForThreat(COMBAT_THREAT_SMALL), "combatSmall");
  assert.equal(combatMusicTrackForThreat(COMBAT_THREAT_BIG), "combatBig");
});

test("combat music rejects a threat with no authored score", () => {
  assert.throws(() => combatMusicTrackForThreat("ordinary"), /Unknown combat music threat/);
});
