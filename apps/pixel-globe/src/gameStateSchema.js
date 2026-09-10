import { acceptPirateHavenQuest, pirateHavenQuestOffer, seizePirateRevengeItem, ruinPirateHaven } from "./pirateHavens.js";
import { EXETER_CANAL_MATERIALS } from "./exeterCanal.js";
import {
  CAMPAIGN_GOAL_EXPLORER,
  CAMPAIGN_GOAL_FAMILY_DEBT,
  CAMPAIGN_GOAL_TREASURE,
  CAMPAIGN_GOAL_WHITE_WHALE
} from "./campaignGoals.js";
import { createGameState } from "./gameState.js";
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
  const pirateContext = { havens: [haven], merchants: [{ id: "merchant-test", seed: 77, name: "Santa Maria", captainName: "Joao", role: "merchant", hitPoints: 10, currentPort: port }], sailingDistanceKm: () => 200, simMinute: 123456 };
  acceptPirateHavenQuest(pirateCampaign.memory.pirateHavens, pirateHavenQuestOffer(pirateCampaign.memory.pirateHavens, haven, pirateContext));
  acceptPirateHavenQuest(pirateCampaign.memory.pirateHavens, pirateHavenQuestOffer(pirateCampaign.memory.pirateHavens, port, pirateContext));
  seizePirateRevengeItem(pirateCampaign.memory.pirateHavens, pirateContext.merchants[0]);
  ruinPirateHaven(pirateCampaign.memory.pirateHavens, haven.cityId, 123456);
  return [
    ...campaignFixtures,
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
