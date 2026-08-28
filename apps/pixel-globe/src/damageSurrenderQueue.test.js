import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  clearDamageSurrenderDecisions,
  consumeDamageSurrenderDecision,
  enqueueDamageSurrenderDecision,
  pendingDamageSurrenderDecision
} from "./damageSurrenderQueue.js";

const MAIN_SOURCE = readFileSync(new URL("./main.js", import.meta.url), "utf8");

function functionSource(name, nextName) {
  const start = MAIN_SOURCE.indexOf(`function ${name}(`);
  const end = MAIN_SOURCE.indexOf(`function ${nextName}(`, start + 1);
  assert.ok(start >= 0, `${name} is missing`);
  assert.ok(end > start, `${name} has no ${nextName} boundary`);
  return MAIN_SOURCE.slice(start, end);
}

test("simultaneous damaged surrenders wait in combat resolution order", () => {
  const queue = [];
  assert.equal(enqueueDamageSurrenderDecision(queue, {
    npcShipId: "pirate-one",
    cause: "self-defense"
  }), true);
  assert.equal(enqueueDamageSurrenderDecision(queue, {
    npcShipId: "pirate-two",
    cause: "deliberate"
  }), true);

  assert.deepEqual(pendingDamageSurrenderDecision(queue), {
    npcShipId: "pirate-one",
    cause: "self-defense"
  });
  assert.equal(consumeDamageSurrenderDecision(queue, "pirate-one").npcShipId, "pirate-one");
  assert.equal(pendingDamageSurrenderDecision(queue).npcShipId, "pirate-two");
});

test("a damaged surrender is queued once and conflicting causes fail loudly", () => {
  const queue = [];
  const decision = { npcShipId: "pirate-one", cause: "accidental" };
  assert.equal(enqueueDamageSurrenderDecision(queue, decision), true);
  assert.equal(enqueueDamageSurrenderDecision(queue, decision), false);
  assert.throws(() => enqueueDamageSurrenderDecision(queue, {
    ...decision,
    cause: "deliberate"
  }), /changed cause/);
  assert.throws(
    () => consumeDamageSurrenderDecision(queue, "pirate-two"),
    /not headed by pirate-two/
  );

  clearDamageSurrenderDecisions(queue);
  assert.equal(pendingDamageSurrenderDecision(queue), null);
});

test("combat routes blocked surrender prompts into the foreground queue", () => {
  assert.match(MAIN_SOURCE, /if \(presentPendingDamageSurrenderDecision\(\)\) dirty = true;/);
  assert.match(
    functionSource("handleNpcSurrender", "receivePlayerSurrenderedShipLoot"),
    /requestDamageSurrenderDecision\(loserId, surrenderCause\)/
  );
  const request = functionSource(
    "requestDamageSurrenderDecision",
    "presentPendingDamageSurrenderDecision"
  );
  assert.match(request, /combatHailIsBlockedByOverlay\(\)/);
  assert.match(request, /enqueueDamageSurrenderDecision/);
  const present = functionSource(
    "presentPendingDamageSurrenderDecision",
    "openDamageSurrenderDecision"
  );
  assert.match(present, /npcShipHasCombatGrace/);
  assert.match(present, /consumeDamageSurrenderDecision/);
});
