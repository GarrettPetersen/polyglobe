import test from "node:test";
import assert from "node:assert/strict";
import { QUEST_OFFER_POLICIES, questOfferPolicy, questOfferRoll, questOfferWindowOpen, questOfferCooldownReady, recordQuestOffer } from "./questOfferPolicies.js";
import { arrivalOfferEligible, recordArrivalOffer } from "./arrivalOfferCadence.js";
import { createSovereignWarLoanMemory, createSovereignWarLoanOffer } from "./sovereignWarLoan.js";
const DAY = 1440;
test("every declared quest has a bounded spawn chance and positive cooldown", () => {
  for (const [kind, policy] of Object.entries(QUEST_OFFER_POLICIES)) {
    assert.ok(policy.spawnChance > 0 && policy.spawnChance <= 1, kind);
    assert.ok(policy.rollPeriodMinutes > 0 && policy.cooldownMinutes > 0, kind);
    assert.equal(typeof policy.repeatable, "boolean");
    assert.ok(Object.isFrozen(policy));
  }
  for (const kind of ["unknown", "toString", "__proto__"]) assert.throws(() => questOfferPolicy(kind), /no spawn policy/);
});
test("visiting repeatedly and reloading cannot reroll a monthly offer", () => {
  for (const kind of ["pirate-contract", "pirate-suppression", "war-loan", "shipyard"]) {
    const rolls = new Set();
    for (let seed = 0; seed < 100; seed++) {
      const first = questOfferRoll(`voyage-${seed}`, "lisbon|portugal", 0, kind);
      for (const minute of [1, 1440, 30 * DAY - 1]) assert.equal(questOfferRoll(`voyage-${seed}`, "lisbon|portugal", minute, kind), first);
      rolls.add(questOfferWindowOpen(`voyage-${seed}`, "lisbon|portugal", 0, kind));
    }
    assert.deepEqual([...rolls].sort(), [false, true], kind);
  }
  assert.throws(() => questOfferRoll("", "city", 0, "shipyard"), /Invalid/);
});
test("arrival pitches share a quiet fortnight and retain their own cooldown across reload", () => {
  const decisions = {};
  recordArrivalOffer(decisions, "pirate", 0);
  const restored = JSON.parse(JSON.stringify(decisions));
  assert.equal(arrivalOfferEligible(restored, "shipyard", 14 * DAY - 1), false);
  assert.equal(arrivalOfferEligible(restored, "shipyard", 14 * DAY), true);
  assert.equal(arrivalOfferEligible(restored, "pirate", 60 * DAY - 1), false);
  assert.equal(arrivalOfferEligible(restored, "pirate", 60 * DAY), true);
  // A first visit to the canal commissioner remains important even after a pirate pitch.
  assert.equal(arrivalOfferEligible(restored, "exeter", 1), true);
  recordArrivalOffer(restored, "exeter", 1);
  assert.equal(arrivalOfferEligible(restored, "exeter", 2), false);
  assert.throws(() => recordArrivalOffer(restored, "pirate", 2), /too soon/);
});
test("rescues have separate persistent elapsed-time cooldowns, including minute zero", () => {
  for (const kind of ["castaway", "pirate-captive"]) {
    const decisions = {};
    recordQuestOffer(decisions, kind, 0);
    const restored = JSON.parse(JSON.stringify(decisions));
    assert.equal(questOfferCooldownReady(restored, kind, 30 * DAY - 1), false);
    assert.equal(questOfferCooldownReady(restored, kind, 30 * DAY), true);
    assert.throws(() => recordQuestOffer(restored, kind, 1), /too soon/);
  }
});
test("declining one nation's loan prevents another court immediately asking for a million", () => {
  const memory = createSovereignWarLoanMemory();
  const capital = (factionId, cityId, tileId) => ({ factionId, cityId, tileId, isFactionCapital: true, capitalOfFactionId: factionId });
  const context = { borrowerFactionId: "portugal", enemyFactionId: "spain", capital: capital("portugal", "lisbon|portugal", 1), simMinute: 0, doubloons: 2000000, offerRoll: 0 };
  assert.ok(createSovereignWarLoanOffer(memory, context));
  memory.offer = null;
  const next = { ...context, borrowerFactionId: "spain", enemyFactionId: "portugal", capital: capital("spain", "seville|spain", 2) };
  assert.equal(createSovereignWarLoanOffer(memory, { ...next, simMinute: 180 * DAY - 1 }), null);
  assert.equal(createSovereignWarLoanOffer(memory, { ...next, simMinute: 180 * DAY, offerRoll: 0.9 }), null);
  assert.ok(createSovereignWarLoanOffer(memory, { ...next, simMinute: 180 * DAY }));
});
