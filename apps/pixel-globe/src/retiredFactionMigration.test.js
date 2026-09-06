import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { migrateGameState, validateGameState } from "./gameState.js";
import { shipStatsForSlug } from "./shipStats.js";
import { testCrewMigrationOptions } from "./test-fixtures/crewTestFixtures.js";
import { adjustSovereignAuthority } from "./sovereignAuthority.js";
import { establishSuzerainty } from "./suzerainty.js";
import { recordTradeEmbargoPurchase } from "./tradeEmbargoes.js";

function releasedState() {
  return JSON.parse(readFileSync(new URL(
    "./test-fixtures/save-schemas/canonical-states-v101.json", import.meta.url), "utf8")).states[0].state;
}

test("released Kazan voyages retire sovereign offices while preserving people and divergent conquests", () => {
  const saved = releasedState();
  saved.playerCharacter.nationalityId = "kazan";
  saved.relations.factionReputation.england = -27;
  saved.relations.factionReputation.neutral = 14;
  saved.relations.lettersOfMarque.kazan = { factionId: "kazan", simMinute: 0 };
  saved.relations.diplomacy.overrides["england|france"] = "friendly";
  saved.relations.diplomacy.overrides["kazan|muscovy"] = "war";
  saved.memory.conquest.portFactionOverrides["kazan|russian federation"] = "england";
  saved.memory.conquest.portFactionOverrides["london|united kingdom"] = "kazan";
  saved.memory.conquest.factionCapitalOverrides.kazan = "london|united kingdom";
  saved.memory.conquest.collapsedFactionIds.push("kazan");
  saved.memory.conquest.factionSuccessors.kazan = "england";
  const original = structuredClone(saved);
  const migrated = migrateGameState(saved, shipStatsForSlug(saved.ship.slug), {
    ...testCrewMigrationOptions(), legacyCityIdForPortReference: () => "london|united kingdom"
  });
  validateGameState(migrated);
  assert.deepEqual(saved, original, "migration must not mutate caller-owned save data");
  assert.equal(migrated.playerCharacter.nationalityId, "neutral");
  assert.equal(migrated.playerCharacter.name, original.playerCharacter.name);
  assert.equal(migrated.relations.factionReputation.england, -27);
  assert.equal(migrated.relations.factionReputation.neutral, 14);
  assert.equal(migrated.relations.lettersOfMarque.kazan, undefined);
  assert.equal(migrated.relations.diplomacy.overrides["kazan|muscovy"], undefined);
  assert.equal(migrated.relations.diplomacy.overrides["england|france"], "friendly");
  assert.equal(migrated.memory.conquest.portFactionOverrides["kazan|russian federation"], "england");
  assert.equal(migrated.memory.conquest.portFactionOverrides["london|united kingdom"], "neutral");
  assert.equal(migrated.memory.conquest.factionCapitalOverrides.kazan, undefined);
  assert.equal(migrated.memory.conquest.factionSuccessors.kazan, undefined);
  assert.equal(migrated.memory.conquest.collapsedFactionIds.includes("kazan"), false);
  assert.deepEqual(migrateGameState(structuredClone(migrated), shipStatsForSlug(saved.ship.slug)), migrated);
});

test("retired sovereign relationships and embargoes cannot become authority over all independent settlements", () => {
  const saved = releasedState();
  const authority = saved.relations.authority;
  // Construct valid historical records through the current domain operations,
  // then give the source records the sovereign ID present in release 101.
  delete authority.scores.kazan;
  adjustSovereignAuthority(authority, "muscovy", -3, { simMinute: authority.lastUpdateMinute, source: "naval-defeat" });
  authority.history[0] = { ...authority.history[0], subjectId: "kazan" };
  const suzerainties = saved.relations.diplomacy.suzerainties;
  establishSuzerainty(suzerainties, { vassalFactionId: "england", suzerainFactionId: "muscovy", simMinute: 0 });
  suzerainties.byVassalId.england = { ...suzerainties.byVassalId.england, suzerainFactionId: "kazan" };
  suzerainties.history[0] = { ...suzerainties.history[0], suzerainFactionId: "kazan" };
  const embargoes = saved.relations.tradeEmbargoes;
  const national = embargoes.orders.find(({authorityKind}) => authorityKind === "national");
  const independent = { ...structuredClone(national), id: "independent-embargo",
    targetFactionId: "neutral" };
  const retired = { ...structuredClone(national), id: "retired-embargo",
    issuerFactionId: "kazan", followerFactionIds: ["kazan"] };
  const retiredTarget = { ...structuredClone(national), id: "retired-target-embargo", targetFactionId: "kazan" };
  embargoes.orders.push(independent, retired, retiredTarget);
  const historicalOrder = embargoes.history.find(({orderId}) => orderId === national.id);
  embargoes.history.push({ ...structuredClone(historicalOrder), id: "retired-embargo-event",
    orderId: retired.id, issuerFactionId: "kazan", followerFactionIds: ["kazan"] });
  recordTradeEmbargoPurchase(saved.memory.tradeEmbargoEnforcement, [independent,
    { ...retired, issuerFactionId: "muscovy", followerFactionIds: ["muscovy"] }], {
    port: { cityId: "london|united kingdom", tileId: 12, city: "London" },
    goodId: "fish", quantity: 1, transactionValue: 10, simMinute: 0
  });
  const papal = embargoes.orders.find(({authorityKind}) => authorityKind === "papal");
  papal.followerFactionIds.push("kazan");
  papal.followerFactionIds.sort();
  const original = structuredClone(saved);
  const migrated = migrateGameState(saved, shipStatsForSlug(saved.ship.slug), {
    ...testCrewMigrationOptions(), legacyCityIdForPortReference: () => "london|united kingdom"
  });

  validateGameState(migrated);
  assert.deepEqual(saved, original);
  assert.deepEqual(migrated.relations.authority.history, []);
  assert.equal(migrated.relations.diplomacy.suzerainties.byVassalId.england, undefined);
  assert.deepEqual(migrated.relations.diplomacy.suzerainties.history, []);
  const migratedOrders = migrated.relations.tradeEmbargoes.orders;
  assert.equal(migratedOrders.find(({id}) => id === independent.id).liftedMinute, null);
  assert.equal(migratedOrders.find(({id}) => id === retired.id), undefined);
  assert.equal(migratedOrders.find(({id}) => id === retiredTarget.id).liftedMinute, embargoes.lastUpdateMinute);
  assert.equal(migratedOrders.find(({id}) => id === papal.id).followerFactionIds.includes("neutral"), false);
  assert.equal(migrated.relations.tradeEmbargoes.history.some(({orderId}) => orderId === retired.id), false);
  assert.deepEqual(migrated.memory.tradeEmbargoEnforcement.incidents.map(({orderId}) => orderId), [independent.id]);
  assert.deepEqual(migrated.cargo, original.cargo, "retiring enforcement cannot discard physical cargo");
});
