import assert from "node:assert/strict";
import test from "node:test";

import {
  PANDA_COMPANION_ABOARD,
  PANDA_COMPANION_DECLINED,
  PANDA_COMPANION_PENDING,
  PANDA_COMPANION_WITH_NATURALIST,
  PANDA_NATURALIST_OFFER_DECLINED,
  acceptPandaCompanion,
  beginPandaRecruitment,
  createPandaCompanionMemory,
  declinePandaCompanion,
  declinePandaNaturalistOffer,
  migratePandaCompanionMemory,
  pandaCompanionCharacter,
  pandaCompanionConsumption,
  pandaNaturalistOfferIsAvailable,
  pandaNpcReaction,
  placePandaWithNaturalist,
  recordPandaNpcReaction,
  validatePandaCompanionMemory
} from "./pandaCompanion.js";

test("panda recruitment persists an explicit accept or decline decision", () => {
  const accepted = createPandaCompanionMemory();
  beginPandaRecruitment(accepted);
  assert.equal(accepted.status, PANDA_COMPANION_PENDING);
  acceptPandaCompanion(accepted, 123.9);
  assert.equal(accepted.status, PANDA_COMPANION_ABOARD);
  assert.equal(accepted.joinedMinute, 123);
  assert.deepEqual(pandaCompanionConsumption(accepted), {
    pandas: 1,
    foodConsumers: 3,
    waterConsumers: 1
  });

  const declined = createPandaCompanionMemory();
  beginPandaRecruitment(declined);
  declinePandaCompanion(declined);
  assert.equal(declined.status, PANDA_COMPANION_DECLINED);
  assert.deepEqual(pandaCompanionConsumption(declined), {
    pandas: 0,
    foodConsumers: 0,
    waterConsumers: 0
  });
});

test("the panda has a biography-ready useless companion identity", () => {
  const panda = pandaCompanionCharacter();
  assert.equal(panda.name, "Panda");
  assert.equal(panda.homePortName, "Sichuan");
  assert.deepEqual(panda.skillIds, ["useless"]);
  assert.match(panda.goal.text, /avoid all work/i);
  assert.ok(panda.expressions.some((entry) => entry.id === "happy"));
});

test("NPC reactions distinguish familiar Asian characters and never repeat", () => {
  const memory = createPandaCompanionMemory();
  beginPandaRecruitment(memory);
  acceptPandaCompanion(memory, 10);
  const familiar = pandaNpcReaction(memory, "port:1", { name: "Li Wei", nameCulture: "chinese" });
  assert.equal(familiar.familiar, true);
  recordPandaNpcReaction(memory, familiar.key);
  assert.equal(pandaNpcReaction(memory, "port:1", { name: "Li Wei", nameCulture: "chinese" }), null);
  validatePandaCompanionMemory(memory);
});

test("the naturalist offer can be declined once without removing the panda", () => {
  const memory = createPandaCompanionMemory();
  beginPandaRecruitment(memory);
  acceptPandaCompanion(memory, 10);
  assert.equal(pandaNaturalistOfferIsAvailable(memory), true);
  declinePandaNaturalistOffer(memory);
  assert.equal(memory.status, PANDA_COMPANION_ABOARD);
  assert.equal(memory.naturalistOffer, PANDA_NATURALIST_OFFER_DECLINED);
  assert.equal(pandaNaturalistOfferIsAvailable(memory), false);
  assert.equal(pandaCompanionConsumption(memory).pandas, 1);
});

test("an adopted panda leaves the ship without altering its historical encounter", () => {
  const memory = createPandaCompanionMemory();
  beginPandaRecruitment(memory);
  acceptPandaCompanion(memory, 10);
  placePandaWithNaturalist(memory);
  assert.equal(memory.status, PANDA_COMPANION_WITH_NATURALIST);
  assert.equal(pandaNaturalistOfferIsAvailable(memory), false);
  assert.deepEqual(pandaCompanionConsumption(memory), {
    pandas: 0,
    foodConsumers: 0,
    waterConsumers: 0
  });
});

test("version one panda memories migrate with an unresolved naturalist offer", () => {
  const migrated = migratePandaCompanionMemory({
    version: 1,
    status: PANDA_COMPANION_ABOARD,
    joinedMinute: 12,
    npcReactionKeys: []
  });
  assert.equal(migrated.version, 2);
  assert.equal(pandaNaturalistOfferIsAvailable(migrated), true);
});
