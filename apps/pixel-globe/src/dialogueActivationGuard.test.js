import assert from "node:assert/strict";
import test from "node:test";

import {
  ARRIVAL_RECRUITMENT_ACTIVATION_GUARD_MS,
  createArrivalRecruitmentActivationGuard,
  dialogueActionBlockedByActivationGuard
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
