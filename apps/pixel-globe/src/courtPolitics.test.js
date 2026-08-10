import assert from "node:assert/strict";
import test from "node:test";

import {
  COURT_KIND_SHOGUNAL_MEDIATION,
  COURT_MATTER_COMMISSIONED,
  advanceCourtPolitics,
  commissionCourtMatter,
  completeCourtCommission,
  createCourtPolitics,
  deliverCourtCommission,
  migrateCourtPolitics
} from "./courtPolitics.js";
import {
  DIPLOMACY_HOSTILE,
  DIPLOMACY_NEUTRAL
} from "./factions.js";
import {
  createWorldDiplomacy,
  worldDiplomacyBetween
} from "./worldDiplomacy.js";

const SEVILLE = capital(1, "Seville", "Spain", "spain", 37.39, -5.99);
const PORT_ROYAL = port(2, "Port Royal", "Jamaica", "spain", 17.94, -76.84, {
  playerFoundedColony: true,
  foundingFactionId: "france"
});
const LISBON = capital(3, "Lisbon", "Portugal", "portugal", 38.72, -9.14);
const LONDON = capital(4, "London", "United Kingdom", "england", 51.51, -0.13);
const GOA = port(5, "Goa", "India", "portugal", 15.49, 73.83, {
  foundingFactionId: "portugal"
});
const KYOTO = capital(6, "Kyoto", "Japan", "japan", 35.01, 135.77);
const SAKAI = capital(7, "Sakai", "Japan", "hosokawa", 34.58, 135.47);
const YAMAGUCHI = capital(8, "Yamaguchi", "Japan", "ouchi", 34.18, 131.47);

test("player-founded colonies enter their current sovereign's administration network", () => {
  const memory = createCourtPolitics({ seedKey: "player-colony" });
  const diplomacy = createWorldDiplomacy({ seedKey: "player-colony" });

  const result = advanceCourtPolitics(memory, diplomacy, memory.nextActionMinute, {
    portCities: [SEVILLE, PORT_ROYAL]
  });

  assert.equal(result.mattersOpened.length, 1);
  assert.equal(memory.pendingMatter.authorityFactionId, "spain");
  assert.equal(memory.pendingMatter.origin.name, "Seville");
  assert.equal(memory.pendingMatter.destination.name, "Port Royal");
});

test("overseas administration follows conquest rather than a port's founding nation", () => {
  const portugueseMemory = createCourtPolitics({ seedKey: "goa-portuguese" });
  const portugueseDiplomacy = createWorldDiplomacy({ seedKey: "goa-portuguese" });
  advanceCourtPolitics(
    portugueseMemory,
    portugueseDiplomacy,
    portugueseMemory.nextActionMinute,
    { portCities: [LISBON, GOA] }
  );
  assert.equal(portugueseMemory.pendingMatter.authorityFactionId, "portugal");

  const conqueredGoa = { ...GOA, factionId: "england" };
  const englishMemory = createCourtPolitics({ seedKey: "goa-english" });
  const englishDiplomacy = createWorldDiplomacy({ seedKey: "goa-english" });
  advanceCourtPolitics(
    englishMemory,
    englishDiplomacy,
    englishMemory.nextActionMinute,
    { portCities: [LONDON, conqueredGoa] }
  );
  assert.equal(englishMemory.pendingMatter.authorityFactionId, "england");
  assert.equal(englishMemory.pendingMatter.destination.name, "Goa");
});

test("an accepted commission pauses the court decision until the captain returns", () => {
  const memory = createCourtPolitics({ seedKey: "commission" });
  const diplomacy = createWorldDiplomacy({ seedKey: "commission" });
  const ports = [SEVILLE, PORT_ROYAL];
  advanceCourtPolitics(memory, diplomacy, memory.nextActionMinute, { portCities: ports });
  const matterId = memory.pendingMatter.id;
  const decisionMinute = memory.pendingMatter.autonomousDecisionMinute;

  commissionCourtMatter(memory, {
    matterId,
    questId: "quest-1",
    acceptedMinute: memory.pendingMatter.createdMinute
  });
  assert.equal(memory.pendingMatter.status, COURT_MATTER_COMMISSIONED);
  const waiting = advanceCourtPolitics(memory, diplomacy, decisionMinute + 1, { portCities: ports });
  assert.equal(waiting.actions.length, 0);
  assert.equal(memory.pendingMatter.id, matterId);

  deliverCourtCommission(memory, {
    matterId,
    questId: "quest-1",
    simMinute: decisionMinute + 2
  });
  const completed = completeCourtCommission(memory, diplomacy, {
    matterId,
    questId: "quest-1",
    simMinute: decisionMinute + 3,
    portCities: ports
  });
  assert.equal(completed.action.source, "player-court-commission");
  assert.equal(memory.pendingMatter, null);
  assert.equal(memory.portServiceMinutes[matterPortId(PORT_ROYAL)], decisionMinute + 3);
});

test("Ashikaga policy can mediate between daimyo without absorbing their foreign policies", () => {
  const memory = createCourtPolitics({ seedKey: "seed-1" });
  const diplomacy = createWorldDiplomacy({ seedKey: "daimyo-mediation" });
  const ports = [KYOTO, SAKAI, YAMAGUCHI];
  assert.equal(worldDiplomacyBetween(diplomacy, "hosokawa", "ouchi"), DIPLOMACY_HOSTILE);

  advanceCourtPolitics(memory, diplomacy, memory.nextActionMinute, { portCities: ports });
  assert.equal(memory.pendingMatter.kind, COURT_KIND_SHOGUNAL_MEDIATION);
  const resolution = advanceCourtPolitics(
    memory,
    diplomacy,
    memory.pendingMatter.autonomousDecisionMinute,
    { portCities: ports }
  );

  assert.equal(resolution.actions.length, 1);
  assert.equal(worldDiplomacyBetween(diplomacy, "hosokawa", "ouchi"), DIPLOMACY_NEUTRAL);
});

test("legacy saves gain deterministic court memory without rewriting their diplomacy", () => {
  const diplomacy = createWorldDiplomacy({ seedKey: "old-save" });
  const relation = worldDiplomacyBetween(diplomacy, "hosokawa", "ouchi");
  const memory = migrateCourtPolitics(undefined, { startMinute: 7200, seedKey: "old-save" });

  assert.equal(memory.startMinute, 7200);
  assert.equal(memory.pendingMatter, null);
  assert.equal(worldDiplomacyBetween(diplomacy, "hosokawa", "ouchi"), relation);
});

function capital(tileId, city, country, factionId, lat, lon) {
  return port(tileId, city, country, factionId, lat, lon, {
    isFactionCapital: true,
    capitalOfFactionId: factionId
  });
}

function port(tileId, city, country, factionId, lat, lon, extra = {}) {
  return Object.freeze({ tileId, city, country, factionId, lat, lon, ...extra });
}

function matterPortId(port) {
  return `${port.city}|${port.country}|${port.tileId}`;
}
