import assert from "node:assert/strict";
import test from "node:test";

import {
  COLONIZATION_EXPEDITION_CARGO_UNITS,
  COLONIZATION_FETCH_STAGES,
  COLONIZATION_RESUPPLY,
  COLONIZATION_RESUPPLY_DAYS,
  COLONIZATION_STAGE_AWAITING_RESUPPLY,
  COLONIZATION_STAGE_ESTABLISHED,
  COLONIZATION_STAGE_FAILED,
  COLONIZATION_STAGE_OUTBOUND,
  COLONIZATION_STAGE_READY,
  advanceColonizationQuest,
  assignColonizationTargetTile,
  assertColonizationResupplyDelivery,
  beginColonizationExpedition,
  colonizationObjective,
  colonizationShipEligibility,
  colonizationWorldRecord,
  completeColonizationFetchStage,
  createColonizationQuestMemory,
  establishColony,
  landColonists,
  validateColonizationQuestMemory
} from "./colonizationQuest.js";
import { shipStatsForSlug } from "./shipStats.js";

const DAY = 24 * 60;

test("the Port Royal expedition requires three ordered paid material stages", () => {
  const memory = createColonizationQuestMemory();
  assignColonizationTargetTile(memory, 123);

  assert.throws(
    () => completeColonizationFetchStage(memory, COLONIZATION_FETCH_STAGES[1].id),
    /Unexpected colonization material stage/
  );
  for (const stage of COLONIZATION_FETCH_STAGES) completeColonizationFetchStage(memory, stage.id);

  assert.equal(memory.stage, COLONIZATION_STAGE_READY);
  assert.equal(memory.fetchStageIndex, COLONIZATION_FETCH_STAGES.length);
  assert.equal(validateColonizationQuestMemory(memory), memory);
});

test("only capacious ocean-going ships can carry the colonists", () => {
  const brigantine = shipStatsForSlug("brigantine");
  const fishingBarque = shipStatsForSlug("fishing-lugger");

  assert.equal(
    colonizationShipEligibility(brigantine, COLONIZATION_EXPEDITION_CARGO_UNITS).eligible,
    true
  );
  assert.equal(colonizationShipEligibility(brigantine, COLONIZATION_EXPEDITION_CARGO_UNITS - 1).eligible, false);
  assert.equal(colonizationShipEligibility(fishingBarque, fishingBarque.cargoCapacity).eligible, false);
  assert.doesNotThrow(() => colonizationShipEligibility(brigantine, 1.3333333333333357));
  assert.equal(colonizationShipEligibility(brigantine, 1.3333333333333357).freeCargoUnits, 4 / 3);
  assert.equal(
    colonizationShipEligibility(brigantine, COLONIZATION_EXPEDITION_CARGO_UNITS + 1e-12).eligible,
    true
  );
});

test("landing creates a village and a one-year resupply objective after departure", () => {
  const memory = readyMemory();
  beginColonizationExpedition(memory);
  assert.equal(memory.stage, COLONIZATION_STAGE_OUTBOUND);
  assert.equal(colonizationWorldRecord(memory).hiddenSettlement, true);
  assert.equal(colonizationObjective(memory).kind, "found-colony");

  landColonists(memory, 1000);
  assert.equal(memory.stage, COLONIZATION_STAGE_AWAITING_RESUPPLY);
  assert.equal(memory.resupplyDeadlineMinute, 1000 + COLONIZATION_RESUPPLY_DAYS * DAY);
  assert.equal(colonizationWorldRecord(memory).settlementType, "village");
  assert.equal(colonizationObjective(memory), null);
  assert.throws(() => assertColonizationResupplyDelivery(memory, 1001), /must leave/);

  assert.equal(advanceColonizationQuest(memory, 1001, { awayFromColony: true }), true);
  assert.equal(colonizationObjective(memory).kind, "resupply-colony");
  assert.equal(assertColonizationResupplyDelivery(memory, 1001), COLONIZATION_RESUPPLY);
});

test("timely resupply creates a discounted French city", () => {
  const memory = awaitingResupplyMemory();
  establishColony(memory, 1200);
  const city = colonizationWorldRecord(memory);

  assert.equal(memory.stage, COLONIZATION_STAGE_ESTABLISHED);
  assert.equal(city.displayCity, "Port Royal");
  assert.equal(city.settlementType, "city");
  assert.equal(city.factionId, "france");
  assert.equal(city.playerFoundedColony, true);
  assert.ok(city.purchaseDiscountMultiplier < 1);
  assert.equal(colonizationObjective(memory), null);
});

test("late resupply leaves a burning dead village", () => {
  const memory = awaitingResupplyMemory();
  const lateMinute = memory.resupplyDeadlineMinute + 1;
  assert.equal(advanceColonizationQuest(memory, lateMinute, { awayFromColony: true }), true);
  const ruins = colonizationWorldRecord(memory);

  assert.equal(memory.stage, COLONIZATION_STAGE_FAILED);
  assert.equal(ruins.displayCity, "Port Royal Ruins");
  assert.equal(ruins.settlementType, "village");
  assert.equal(ruins.colonyBurning, true);
  assert.equal(ruins.factionId, "neutral");
  assert.throws(() => establishColony(memory, lateMinute), /during failed/);
});

function readyMemory() {
  const memory = createColonizationQuestMemory();
  assignColonizationTargetTile(memory, 123);
  for (const stage of COLONIZATION_FETCH_STAGES) completeColonizationFetchStage(memory, stage.id);
  return memory;
}

function awaitingResupplyMemory() {
  const memory = readyMemory();
  beginColonizationExpedition(memory);
  landColonists(memory, 1000);
  advanceColonizationQuest(memory, 1100, { awayFromColony: true });
  return memory;
}
