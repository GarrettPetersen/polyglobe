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
  advanceWorldDiplomacy,
  adjustDiplomaticStance,
  createWorldDiplomacy,
  declareDiplomaticWar,
  diplomaticContactBetween,
  diplomacyEventNotice,
  makeDiplomaticPeace,
  migrateWorldDiplomacy,
  playerDiplomacyBias,
  recordDiplomaticPortCall,
  recentDiplomacyEvents,
  validateWorldDiplomacy,
  worldDiplomacyBetween
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

test("version 1 diplomacy migrates without changing its simulation state", () => {
  const saved = createWorldDiplomacy({ startMinute: 100, seedKey: "old-voyage" });
  saved.version = 1;
  delete saved.contacts;
  const before = JSON.parse(JSON.stringify(saved));

  const migrated = migrateWorldDiplomacy(saved);

  assert.equal(migrated.version, 3);
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

  assert.equal(migrated.version, 3);
  assert.deepEqual(migrated.contacts, {});
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
  assert.equal(diplomaticContactBetween(state, "gujarat", "aztec"), null);
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
    reputation: { france: 40 },
    decisions: {
      "reputation.trade.france": 24,
      "reputation.delivery.france": 3
    }
  };
  const hostile = {
    homeFactionId: "england",
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
