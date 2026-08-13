import assert from "node:assert/strict";
import test from "node:test";

import { recoveringPortBlocksArrival } from "./portEntryFlow.js";

const RECOVERY_STATUS = {
  attackerShipLabel: "your ship",
  disabledUntilMinute: 3000,
  daysRemaining: 2
};

test("a recovering vassal capital cannot be pillaged after its peace treaty", () => {
  assert.equal(recoveringPortBlocksArrival({
    entryStatus: {
      allowed: true,
      hostile: false,
      hostileLocalStanding: true,
      suzerainProtectsEntry: true
    },
    recoveryStatus: RECOVERY_STATUS,
    attackStatus: { commissioned: false, mode: "raid" },
    conquestStatus: {
      canAttempt: true,
      playerAssaultActive: false
    }
  }), true);
});

test("an active assault or conquest commission can continue at a disabled port", () => {
  const entryStatus = { allowed: true, hostile: false };

  assert.equal(recoveringPortBlocksArrival({
    entryStatus,
    recoveryStatus: RECOVERY_STATUS,
    attackStatus: { commissioned: false },
    conquestStatus: { playerAssaultActive: true }
  }), false);
  assert.equal(recoveringPortBlocksArrival({
    entryStatus,
    recoveryStatus: RECOVERY_STATUS,
    attackStatus: { commissioned: true },
    conquestStatus: { playerAssaultActive: false }
  }), false);
});

test("a recovering hostile port still follows hostile-port entry", () => {
  assert.equal(recoveringPortBlocksArrival({
    entryStatus: { allowed: false, hostile: true },
    recoveryStatus: RECOVERY_STATUS,
    attackStatus: { commissioned: false },
    conquestStatus: { playerAssaultActive: false }
  }), false);
});
