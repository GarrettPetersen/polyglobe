import { stationCaptureCommissionTroops, createCaptureCommissionTroops } from "./captureCommissionTroops.js";
import { acceptPirateHavenQuest, pirateHavenQuestOffer, seizePirateRevengeItem, ruinPirateHaven, collectPirateGoods } from "./pirateHavens.js";
import { EXETER_CANAL_MATERIALS } from "./exeterCanal.js";
import {
  CAMPAIGN_GOAL_EXPLORER,
  CAMPAIGN_GOAL_FAMILY_DEBT,
  CAMPAIGN_GOAL_TREASURE,
  CAMPAIGN_GOAL_WHITE_WHALE
} from "./campaignGoals.js";
import { createWorkshopSupplyOffer } from "./workshopSupplyQuest.js";
import { createWorldEconomy } from "./economy.js";
import { acceptQuest, createGameState } from "./gameState.js";
import { shipStatsForSlug } from "./shipStats.js";
import { createDenseSaveCompatibilityFixture } from "./test-fixtures/createDenseSaveCompatibilityFixture.js";

const SCHEMA_CAMPAIGN_GOAL_TYPES = Object.freeze([
  CAMPAIGN_GOAL_EXPLORER,
  CAMPAIGN_GOAL_FAMILY_DEBT,
  CAMPAIGN_GOAL_WHITE_WHALE,
  CAMPAIGN_GOAL_TREASURE
]);

const SCHEMA_PLAYER_CHARACTER = Object.freeze({
  id: "save-schema-captain",
  name: "Schema Captain",
  givenName: "Schema",
  familyName: "Captain",
  gender: "female",
  sex: "female",
  nameCulture: "english",
  nationalityId: "england",
  homePortCityId: "london|united kingdom",
  homePortTileId: 1,
  homePortName: "London",
  homePortCountry: "United Kingdom",
  religionId: "roman-catholic",
  expressions: Object.freeze(["neutral", "happy"])
});

export function canonicalGameStateSchemaEntries() {
  const entries = new Set();
  for (const { state } of canonicalGameStateFixtures()) {
    for (const entry of persistedValueSchemaEntries(state)) entries.add(entry);
  }
  return Object.freeze([...entries].sort());
}

export function canonicalGameStateFixtures() {
  const shipStats = shipStatsForSlug("brigantine");
  const campaignFixtures = SCHEMA_CAMPAIGN_GOAL_TYPES.map((campaignGoalType) => ({
    campaignGoalType,
    state: createGameState({
      cargoCapacity: shipStats.cargoCapacity,
      startMinute: 123456,
      playerCharacter: SCHEMA_PLAYER_CHARACTER,
      shipStats,
      campaignGoalType,
      voyageSeed: `save-schema-${campaignGoalType}`
    })
  }));
  const canalConstruction = structuredClone(campaignFixtures[0].state);
  canalConstruction.relations.factionReputation.spain = -25;
  canalConstruction.relations.factionReputationChanges.spain = { before: 0, after: -25, reason: "attack", simMinute: 123456 };
  canalConstruction.memory.quests.exeterCanal = { version: 1, accepted: true, startedMinute: 123456 };
  for (const material of EXETER_CANAL_MATERIALS) canalConstruction.memory.quests.cargoDeliveries[material.requirementId] = material.quantity;
  const pirateCampaign = structuredClone(campaignFixtures[0].state);
  const haven = { cityId: "pirate-haven-1", city: "Black Gull Cove", isPirateHideout: true };
  const port = { cityId: "lisbon|portugal", city: "Lisbon" };
  const pirateContext = { offerRoll: 0, contractKind: "revenge", havens: [haven], merchants: [{ id: "merchant-test", seed: 77, name: "Santa Maria", captainName: "Joao", role: "merchant", hitPoints: 10, currentPort: port }], sailingDistanceKm: () => 200, simMinute: 123456 };
  acceptPirateHavenQuest(pirateCampaign.memory.pirateHavens, pirateHavenQuestOffer(pirateCampaign.memory.pirateHavens, haven, pirateContext));
  acceptPirateHavenQuest(pirateCampaign.memory.pirateHavens, pirateHavenQuestOffer(pirateCampaign.memory.pirateHavens, port, pirateContext));
  seizePirateRevengeItem(pirateCampaign.memory.pirateHavens, pirateContext.merchants[0]);
  ruinPirateHaven(pirateCampaign.memory.pirateHavens, haven.cityId, 123456);
  const pirateSmuggling = structuredClone(campaignFixtures[0].state);
  const pickup = pirateHavenQuestOffer(pirateSmuggling.memory.pirateHavens, haven, {
    ...pirateContext, contractKind: "smuggling", ports: [port], contactForPort: () => ({ id: "lisbon-merchant", name: "Joao" })
  });
  acceptPirateHavenQuest(pirateSmuggling.memory.pirateHavens, pickup);
  collectPirateGoods(pirateSmuggling.memory.pirateHavens, port.cityId, 22);
  const workshop = structuredClone(campaignFixtures[0].state);
  const ports = [
    {cityId: "lisbon|portugal", city: "Lisbon", country: "Portugal", cityType: "mediterranean", factionId: "portugal", tileId: 1, population: 70000, lat: 38.72, lon: -9.14},
    {cityId: "stockholm|sweden", city: "Stockholm", country: "Sweden", cityType: "northern-european", factionId: "sweden", tileId: 2, population: 20000, lat: 59.3, lon: 18.1}
  ];
  const economy = createWorldEconomy({ports, startMinute: 0});
  economy.portStates.get(ports[0].cityId).goods.get("iron").stock = 0;
  acceptQuest(workshop, createWorkshopSupplyOffer(economy, ports[0], ports, {
    offerPeriod: 0, sailingDistanceKm: () => 700
  }));
  const commission = structuredClone(campaignFixtures[0].state);
  const warrant = { id: "schema-warrant", kind: "capture-port", stage: "capture", petitioned: false,
    originCityId: "london|united kingdom", targetCityId: "calais|france" };
  warrant.commissionTroops = createCaptureCommissionTroops(warrant,
    { cityId: warrant.originCityId, populationProfileId: "european" },
    { cityId: warrant.targetCityId, population: 50000 }, 0);
  warrant.commissionTroops[0].alive = false;
  commission.memory.quests.captureActive = warrant;
  const garrison = structuredClone(commission);
  stationCaptureCommissionTroops(garrison.memory.quests, warrant.targetCityId, "england");
  garrison.memory.quests.captureActive = null;
  return [
    ...campaignFixtures,
    { campaignGoalType: "commission-garrison", state: garrison },
    { campaignGoalType: "capture-company", state: commission },
    { campaignGoalType: "workshop-supply", state: workshop },
    { campaignGoalType: "pirate-stolen-goods", state: pirateSmuggling },
    { campaignGoalType: "pirate-haven-campaign", state: pirateCampaign },
    { campaignGoalType: "exeter-canal-construction", state: canalConstruction },
    {
      campaignGoalType: "dense-save-compatibility",
      state: createDenseSaveCompatibilityFixture().payload.gameState
    }
  ];
}

export function persistedValueSchemaEntries(value) {
  const entries = [];
  visitPersistedValue(value, "", entries, new Set());
  return entries.sort();
}

function visitPersistedValue(value, pointer, entries, ancestors) {
  const type = persistedValueType(value);
  entries.push(`${pointer || "/"}|${type}`);
  if (type === "array") {
    if (ancestors.has(value)) throw new Error(`Persisted schema contains a cycle at ${pointer || "/"}`);
    const nextAncestors = new Set(ancestors).add(value);
    for (const entry of value) {
      visitPersistedValue(entry, `${pointer}/*`, entries, nextAncestors);
    }
    return;
  }
  if (type !== "object") return;
  if (Object.getPrototypeOf(value) !== Object.prototype) {
    throw new Error(`Persisted schema contains a non-plain object at ${pointer || "/"}`);
  }
  if (ancestors.has(value)) throw new Error(`Persisted schema contains a cycle at ${pointer || "/"}`);
  const nextAncestors = new Set(ancestors).add(value);
  for (const key of Object.keys(value).sort()) {
    visitPersistedValue(
      value[key],
      `${pointer}/${escapeJsonPointerSegment(key)}`,
      entries,
      nextAncestors
    );
  }
}

function persistedValueType(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  const type = typeof value;
  if (["boolean", "number", "object", "string"].includes(type)) return type;
  throw new Error(`Persisted schema contains unsupported ${type} value`);
}

function escapeJsonPointerSegment(value) {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}
