import assert from "node:assert/strict";
import test from "node:test";

import {
  recoveringPortBlocksArrival,
  resolvePortArrivalDialogueNode,
  resolvePortDialogueContinuation
} from "./portEntryFlow.js";

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

test("a quest continuation does not reopen a barred node after peace changes port entry", () => {
  assert.equal(resolvePortDialogueContinuation({
    requestedNodeId: "barred",
    admittedToPort: false,
    entryStatus: { allowed: true, hostile: false },
    recoveryStatus: null,
    attackStatus: { commissioned: false },
    conquestStatus: { canAttempt: false, playerAssaultActive: false }
  }), "greeting");
  assert.equal(resolvePortDialogueContinuation({
    requestedNodeId: "barred",
    admittedToPort: true,
    entryStatus: { allowed: true, hostile: false },
    recoveryStatus: null,
    attackStatus: { commissioned: false },
    conquestStatus: { canAttempt: false, playerAssaultActive: false }
  }), "root");
});

test("a still-hostile quest destination resumes its barred harbor guard", () => {
  assert.equal(resolvePortDialogueContinuation({
    requestedNodeId: "barred",
    admittedToPort: false,
    entryStatus: { allowed: false, hostile: true },
    recoveryStatus: null,
    attackStatus: { commissioned: false },
    conquestStatus: { canAttempt: false, playerAssaultActive: false }
  }), "barred");
});

test("a port visit presents its arrival greeting only once across dialogue continuations", () => {
  assert.equal(resolvePortArrivalDialogueNode({
    requestedNodeId: "greeting",
    arrivalGreetingPresented: false
  }), "greeting");
  assert.equal(resolvePortArrivalDialogueNode({
    requestedNodeId: "greeting",
    arrivalGreetingPresented: true
  }), "root");
  assert.equal(resolvePortArrivalDialogueNode({
    requestedNodeId: "loadout",
    arrivalGreetingPresented: true
  }), "loadout");
});

test("a recreated admitted port session cannot repeat an acknowledged greeting", () => {
  assert.equal(resolvePortDialogueContinuation({
    requestedNodeId: "greeting",
    admittedToPort: true,
    arrivalGreetingPresented: true,
    entryStatus: { allowed: true, hostile: false },
    recoveryStatus: null,
    attackStatus: { commissioned: false },
    conquestStatus: { canAttempt: false, playerAssaultActive: false }
  }), "root");
});
