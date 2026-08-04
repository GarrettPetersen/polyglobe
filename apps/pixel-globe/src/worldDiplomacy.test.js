import assert from "node:assert/strict";
import test from "node:test";

import {
  DIPLOMACY_ALLY,
  DIPLOMACY_FRIENDLY,
  DIPLOMACY_HOSTILE,
  DIPLOMACY_NEUTRAL,
  DIPLOMACY_WAR,
  PIRATE_FACTION_ID,
  diplomacyBetween
} from "./factions.js";
import {
  DIPLOMACY_HISTORY_LIMIT,
  DIPLOMACY_MIN_EVENT_DAYS,
  WORLD_DIPLOMACY_VERSION,
  advanceWorldDiplomacy,
  adjustDiplomaticStance,
  createWorldDiplomacy,
  declareDiplomaticWar,
  diplomaticContactBetween,
  diplomacyEventNotice,
  makeFactionPeaceWithAllEnemies,
  makeDiplomaticPeace,
  migrateWorldDiplomacy,
  playerDiplomacyBias,
  recordDiplomaticPortCall,
  recentDiplomacyEvents,
  validateWorldDiplomacy,
  worldDiplomacyBetween,
  rawWorldDiplomacyBetween
} from "./worldDiplomacy.js";

const DAY = 24 * 60;

test("world diplomacy begins from the historical 1522 matrix", () => {
  const state = createWorldDiplomacy({ startMinute: 100, seedKey: "voyage-a" });

  assert.equal(worldDiplomacyBetween(state, "england", "france"), DIPLOMACY_WAR);
  assert.equal(worldDiplomacyBetween(state, "england", "spain"), DIPLOMACY_ALLY);
  assert.equal(worldDiplomacyBetween(state, "venice", "genoa"), DIPLOMACY_HOSTILE);
  assert.equal(worldDiplomacyBetween(state, "ottoman", "habsburg"), DIPLOMACY_HOSTILE);
  assert.equal(worldDiplomacyBetween(state, PIRATE_FACTION_ID, "england"), DIPLOMACY_WAR);
  assert.ok(state.nextEventMinute >= 100 + DIPLOMACY_MIN_EVENT_DAYS * DAY);
});

test("vassals keep an internal stance while sharing their suzerain's foreign policy", () => {
  const state = createWorldDiplomacy({ startMinute: 0, seedKey: "vassal-policy" });
  assert.equal(rawWorldDiplomacyBetween(state, "crimea", "ottoman"), DIPLOMACY_FRIENDLY);
  assert.equal(worldDiplomacyBetween(state, "crimea", "portugal"), DIPLOMACY_WAR);
  assert.equal(worldDiplomacyBetween(state, "ottoman", "portugal"), DIPLOMACY_WAR);
  assert.equal(worldDiplomacyBetween(state, "hormuz", "crimea"), DIPLOMACY_WAR);
});

test("Charles V's crowns remain separate inside a shared dynastic foreign policy", () => {
  const state = createWorldDiplomacy({ startMinute: 0, seedKey: "habsburg-union" });
  assert.equal(worldDiplomacyBetween(state, "spain", "habsburg"), DIPLOMACY_ALLY);
  assert.equal(worldDiplomacyBetween(state, "spain", "hungary"), DIPLOMACY_ALLY);
  assert.equal(worldDiplomacyBetween(state, "habsburg", "portugal"), DIPLOMACY_FRIENDLY);
  assert.equal(recordDiplomaticPortCall(state, "spain", "habsburg", 20), null);

  const events = declareDiplomaticWar(state, "spain", "habsburg", 200 * DAY);
  assert.equal(events.some((event) => event.kind === "union-dissolved"), true);
  assert.equal(state.suzerainties.byVassalId.spain, undefined);
  assert.equal(worldDiplomacyBetween(state, "spain", "habsburg"), DIPLOMACY_WAR);
});

test("a hostile vassal can rebel and regain an independent foreign policy", () => {
  const state = createWorldDiplomacy({ startMinute: 0, seedKey: "vassal-rebellion" });
  adjustDiplomaticStance(state, "crimea", "ottoman", "worsen", 200 * DAY);
  adjustDiplomaticStance(state, "crimea", "ottoman", "worsen", 400 * DAY);
  assert.equal(worldDiplomacyBetween(state, "crimea", "ottoman"), DIPLOMACY_HOSTILE);
  const events = declareDiplomaticWar(state, "crimea", "ottoman", 600 * DAY);
  assert.equal(events.some((event) => event.kind === "rebellion"), true);
  assert.equal(state.suzerainties.byVassalId.crimea, undefined);
  assert.equal(worldDiplomacyBetween(state, "crimea", "ottoman"), DIPLOMACY_WAR);
});

test("version 1 diplomacy migrates without changing its simulation state", () => {
  const saved = createWorldDiplomacy({ startMinute: 100, seedKey: "old-voyage" });
  saved.version = 1;
  delete saved.contacts;
  const before = JSON.parse(JSON.stringify(saved));

  const migrated = migrateWorldDiplomacy(saved);

  assert.equal(migrated.version, WORLD_DIPLOMACY_VERSION);
  assert.deepEqual(migrated.contacts, {});
  const { contacts, ...withoutContacts } = migrated;
  assert.deepEqual({ ...withoutContacts, version: 1 }, before);
  assert.throws(() => migrateWorldDiplomacy({ version: 0 }), /Unsupported world diplomacy version/);
});

test("version 2 diplomacy gains an empty contact ledger", () => {
  const saved = createWorldDiplomacy({ startMinute: 100, seedKey: "recent-voyage" });
  saved.version = 2;
  delete saved.contacts;

  const migrated = migrateWorldDiplomacy(saved);

  assert.equal(migrated.version, WORLD_DIPLOMACY_VERSION);
  assert.deepEqual(migrated.contacts, {});
});

test("version 3 diplomacy drops the defeated Aztec state's dynamic records", () => {
  const saved = createWorldDiplomacy({ startMinute: 100, seedKey: "conquest-voyage" });
  saved.version = 3;
  saved.overrides["aztec|spain"] = DIPLOMACY_WAR;
  saved.pairLastChangedMinute["aztec|spain"] = 200;
  saved.contacts["aztec|spain"] = { firstContactMinute: 120, lastContactMinute: 180, portCalls: 2 };
  saved.history.push({
    id: "legacy-aztec-war",
    kind: "war",
    factionAId: "aztec",
    factionBId: "spain",
    simMinute: 200,
    headline: "Spain declares war on the Aztec Empire."
  });

  const migrated = migrateWorldDiplomacy(saved);

  assert.equal(migrated.version, WORLD_DIPLOMACY_VERSION);
  assert.equal(JSON.stringify(migrated).includes("aztec"), false);
});

test("procedural diplomacy changes slowly and deterministically per voyage", () => {
  const a = createWorldDiplomacy({ startMinute: 0, seedKey: "same-voyage" });
  const b = createWorldDiplomacy({ startMinute: 0, seedKey: "same-voyage" });
  const c = createWorldDiplomacy({ startMinute: 0, seedKey: "different-voyage" });
  const minute = 900 * DAY;
  for (const state of [a, b, c]) {
    recordDiplomaticPortCall(state, "england", "france", 10);
    recordDiplomaticPortCall(state, "ottoman", "habsburg", 20);
    recordDiplomaticPortCall(state, "portugal", "gujarat", 30);
  }

  const eventsA = advanceWorldDiplomacy(a, minute);
  const eventsB = advanceWorldDiplomacy(b, minute);
  advanceWorldDiplomacy(c, minute);

  assert.deepEqual(a, b);
  assert.deepEqual(eventsA, eventsB);
  assert.notDeepEqual(a, c);
  assert.ok(eventsA.length > 0);
  assert.ok(eventsA.every((event) => event.simMinute >= DIPLOMACY_MIN_EVENT_DAYS * DAY));
});

test("only foreign port calls activate bilateral political change", () => {
  const state = createWorldDiplomacy({ startMinute: 0, seedKey: "contacts" });

  assert.equal(recordDiplomaticPortCall(state, "gujarat", "gujarat", 10), null);
  assert.equal(recordDiplomaticPortCall(state, "gujarat", "neutral", 10), null);
  assert.equal(diplomaticContactBetween(state, "gujarat", "portugal"), null);

  recordDiplomaticPortCall(state, "portugal", "gujarat", 20);
  recordDiplomaticPortCall(state, "gujarat", "portugal", 35);
  const contact = diplomaticContactBetween(state, "gujarat", "portugal");

  assert.deepEqual(contact, { firstContactMinute: 20, lastContactMinute: 35, portCalls: 2 });
  assert.equal(diplomaticContactBetween(state, "gujarat", "muscovy"), null);
  assert.equal(diplomaticContactBetween(state, "gujarat", "inca"), null);
});

test("no port contact means no procedural diplomatic events", () => {
  const state = createWorldDiplomacy({ startMinute: 0, seedKey: "isolated-world" });
  const events = advanceWorldDiplomacy(state, 900 * DAY);

  assert.deepEqual(events, []);
  assert.deepEqual(state.overrides, {});
});

test("wars can end in peace and later relation changes obey pair cooldowns", () => {
  const state = createWorldDiplomacy({ startMinute: 0, seedKey: "peace" });
  const events = makeDiplomaticPeace(state, "england", "france", 200 * DAY);

  assert.equal(events.length, 1);
  assert.equal(events[0].kind, "peace");
  assert.equal(worldDiplomacyBetween(state, "england", "france"), DIPLOMACY_HOSTILE);
  assert.match(diplomacyEventNotice(events[0]), /^PEACE:/);
  validateWorldDiplomacy(JSON.parse(JSON.stringify(state)));
});

test("a defeated capital settlement ends every war involving that power", () => {
  const state = createWorldDiplomacy({ startMinute: 0, seedKey: "general-peace" });

  assert.equal(worldDiplomacyBetween(state, "france", "england"), DIPLOMACY_WAR);
  assert.equal(worldDiplomacyBetween(state, "france", "spain"), DIPLOMACY_WAR);
  assert.equal(worldDiplomacyBetween(state, "france", "habsburg"), DIPLOMACY_WAR);
  assert.equal(worldDiplomacyBetween(state, "habsburg", "venice"), DIPLOMACY_WAR);

  const events = makeFactionPeaceWithAllEnemies(state, "france", 200 * DAY, {
    eventReason: "capital-peace-treaty"
  });

  assert.ok(events.length >= 3);
  assert.equal(worldDiplomacyBetween(state, "france", "england"), DIPLOMACY_HOSTILE);
  assert.equal(worldDiplomacyBetween(state, "france", "spain"), DIPLOMACY_HOSTILE);
  assert.equal(worldDiplomacyBetween(state, "france", "habsburg"), DIPLOMACY_HOSTILE);
  assert.equal(worldDiplomacyBetween(state, "habsburg", "venice"), DIPLOMACY_WAR);
});

test("diplomacy notices use country nouns rather than nationality adjectives", () => {
  const state = createWorldDiplomacy({ startMinute: 0, seedKey: "country-nouns" });
  const [event] = makeDiplomaticPeace(state, "portugal", "morocco", 200 * DAY);

  assert.equal(diplomacyEventNotice(event), "PEACE: PORTUGAL / MOROCCO");
});

test("diplomatic relations improve and worsen one stance at a time", () => {
  const state = createWorldDiplomacy({ startMinute: 0, seedKey: "stances" });
  makeDiplomaticPeace(state, "england", "france", 200 * DAY);
  assert.equal(worldDiplomacyBetween(state, "england", "france"), DIPLOMACY_HOSTILE);

  adjustDiplomaticStance(state, "england", "france", "improve", 400 * DAY);
  assert.equal(worldDiplomacyBetween(state, "england", "france"), DIPLOMACY_NEUTRAL);
  adjustDiplomaticStance(state, "england", "france", "improve", 600 * DAY);
  assert.equal(worldDiplomacyBetween(state, "england", "france"), DIPLOMACY_FRIENDLY);
  adjustDiplomaticStance(state, "england", "france", "improve", 800 * DAY);
  assert.equal(worldDiplomacyBetween(state, "england", "france"), DIPLOMACY_ALLY);
  adjustDiplomaticStance(state, "england", "france", "worsen", 1000 * DAY);
  assert.equal(worldDiplomacyBetween(state, "england", "france"), DIPLOMACY_FRIENDLY);
});

test("allied powers can be dragged into a new war", () => {
  let joined = null;
  for (let seed = 0; seed < 100 && !joined; seed++) {
    const state = createWorldDiplomacy({ startMinute: 0, seedKey: `alliance-${seed}` });
    makeDiplomaticPeace(state, "england", "france", 150 * DAY);
    const events = declareDiplomaticWar(state, "england", "france", 300 * DAY);
    if (events.some((event) => event.kind === "alliance-war")) joined = { state, events };
  }

  assert.ok(joined, "expected at least one deterministic seed to invoke an alliance");
  const allianceEvent = joined.events.find((event) => event.kind === "alliance-war");
  assert.equal(worldDiplomacyBetween(joined.state, allianceEvent.factionAId, allianceEvent.factionBId), DIPLOMACY_WAR);
  assert.equal(diplomacyBetween(allianceEvent.factionAId, allianceEvent.factionBId), DIPLOMACY_NEUTRAL);
});

test("player conduct biases diplomacy around the captain's home faction", () => {
  const peaceful = {
    homeFactionId: "england",
    homeFactionInGoodStanding: true,
    reputation: { france: 40 },
    decisions: {
      "reputation.trade.france": 24,
      "reputation.delivery.france": 3,
      "reputation.mission.france": 2
    }
  };
  const hostile = {
    homeFactionId: "england",
    homeFactionInGoodStanding: true,
    reputation: { france: -80 },
    decisions: {
      "reputation.attack.france": 3,
      "reputation.piracy.france": 2
    }
  };

  assert.ok(playerDiplomacyBias(peaceful, "england", "france", "peace") > 1);
  assert.ok(playerDiplomacyBias(peaceful, "england", "france", "war") < 1);
  assert.ok(playerDiplomacyBias(hostile, "england", "france", "war") > 1);
  assert.ok(playerDiplomacyBias(hostile, "england", "france", "peace") < 1);
  assert.equal(playerDiplomacyBias(hostile, "spain", "france", "war"), 1);
  assert.equal(playerDiplomacyBias({
    ...peaceful,
    homeFactionInGoodStanding: false
  }, "england", "france", "peace"), 1);
});

test("ordinary missions and commissioned attacks push national relations in opposite directions", () => {
  const mission = {
    homeFactionId: "england",
    homeFactionInGoodStanding: true,
    reputation: {},
    decisions: { "reputation.mission.france": 4 }
  };
  const commissionedAttack = {
    homeFactionId: "england",
    homeFactionInGoodStanding: true,
    reputation: {},
    decisions: { "reputation.attack.france": 1 }
  };

  assert.ok(playerDiplomacyBias(mission, "england", "france", "peace") > 1);
  assert.ok(playerDiplomacyBias(mission, "england", "france", "war") < 1);
  assert.ok(playerDiplomacyBias(commissionedAttack, "england", "france", "war") > 1);
  assert.ok(playerDiplomacyBias(commissionedAttack, "england", "france", "peace") < 1);
});

test("diplomacy history remains bounded in saved state", () => {
  const state = createWorldDiplomacy({ startMinute: 0, seedKey: "history" });
  for (let index = 0; index < DIPLOMACY_HISTORY_LIMIT + 10; index++) {
    const minute = (200 + index * 130) * DAY;
    if (worldDiplomacyBetween(state, "england", "france") === DIPLOMACY_WAR) {
      makeDiplomaticPeace(state, "england", "france", minute);
    } else {
      declareDiplomaticWar(state, "england", "france", minute);
    }
  }

  assert.equal(recentDiplomacyEvents(state, 100).length, DIPLOMACY_HISTORY_LIMIT);
  assert.doesNotThrow(() => validateWorldDiplomacy(JSON.parse(JSON.stringify(state))));
});
