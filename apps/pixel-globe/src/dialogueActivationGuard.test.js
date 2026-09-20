import assert from "node:assert/strict";
import test from "node:test";

import {
  ARRIVAL_RECRUITMENT_ACTIVATION_GUARD_MS,
  createArrivalRecruitmentActivationGuard,
  dialogueActionBlockedByActivationGuard,
  displayedDialogueOptionAt
} from "./dialogueActivationGuard.js";

test("arrival recruitment ignores a spilled hire activation without blocking its exit", () => {
  const session = {};
  const guard = createArrivalRecruitmentActivationGuard(session, 1000);

  assert.equal(dialogueActionBlockedByActivationGuard(
    guard,
    session,
    { type: "hire-crew-member", memberId: "crew:test" },
    1000
  ), true);
  assert.equal(dialogueActionBlockedByActivationGuard(
    guard,
    session,
    { type: "node", nodeId: "root" },
    1000
  ), false);
  assert.equal(dialogueActionBlockedByActivationGuard(
    guard,
    session,
    { type: "hire-crew-member", memberId: "crew:test" },
    1000 + ARRIVAL_RECRUITMENT_ACTIVATION_GUARD_MS
  ), false);
});

test("a recruitment guard cannot block a later dialogue session", () => {
  const firstSession = {};
  const guard = createArrivalRecruitmentActivationGuard(firstSession, 1000);
  assert.equal(dialogueActionBlockedByActivationGuard(
    guard,
    {},
    { type: "hire-crew-member", memberId: "crew:test" },
    1000
  ), false);
});

test("stale confirm input cannot select an option absent from the displayed view", () => {
  const option = Object.freeze({ label: "Trade", action: Object.freeze({ type: "market" }) });
  assert.equal(displayedDialogueOptionAt([option], 0), option);
  assert.equal(displayedDialogueOptionAt([], 0), null);
  assert.equal(displayedDialogueOptionAt([option], 1), null);
});

test("dialogue selection rejects malformed input contracts", () => {
  assert.throws(() => displayedDialogueOptionAt(null, 0), /displayed options/);
  assert.throws(() => displayedDialogueOptionAt([], -1), /selection index/);
  assert.throws(() => displayedDialogueOptionAt([], 0.5), /selection index/);
});
