import assert from "node:assert/strict";
import test from "node:test";

import {
  COMBAT_THREAT_BIG,
  COMBAT_THREAT_SMALL,
  combatMusicTrackForThreat,
  continuingPortBombardmentThreat
} from "./combatMusic.js";

test("combat threat selects the intended small or large battle score", () => {
  assert.equal(combatMusicTrackForThreat(COMBAT_THREAT_SMALL), "combatSmall");
  assert.equal(combatMusicTrackForThreat(COMBAT_THREAT_BIG), "combatBig");
});

test("combat music rejects a threat with no authored score", () => {
  assert.throws(() => combatMusicTrackForThreat("ordinary"), /Unknown combat music threat/);
});

test("a disabled battery keeps combat music through the landing and assault handoff", () => {
  assert.equal(continuingPortBombardmentThreat({
    playerAttackActive: true,
    batteryDisabled: true,
    gunCount: 4
  }), COMBAT_THREAT_BIG);
  assert.equal(continuingPortBombardmentThreat({
    playerAttackActive: true,
    batteryDisabled: true,
    gunCount: 1
  }), COMBAT_THREAT_SMALL);
  assert.equal(continuingPortBombardmentThreat({
    playerAttackActive: false,
    batteryDisabled: true,
    gunCount: 4
  }), null);
  assert.equal(continuingPortBombardmentThreat({
    playerAttackActive: true,
    batteryDisabled: false,
    gunCount: 4
  }), null);
});

test("the port bombardment music handoff rejects malformed combat state", () => {
  assert.throws(
    () => continuingPortBombardmentThreat({
      playerAttackActive: "yes",
      batteryDisabled: true,
      gunCount: 2
    }),
    /Invalid port bombardment player attack state/
  );
  assert.throws(
    () => continuingPortBombardmentThreat({
      playerAttackActive: true,
      batteryDisabled: true,
      gunCount: 0
    }),
    /Invalid port bombardment gun count/
  );
});
