import assert from "node:assert/strict";
import test from "node:test";

import {
  PIRATE_CAPTIVE_STAGE_ABOARD,
  PIRATE_CAPTIVE_STAGE_HOMECOMING,
  PIRATE_CAPTIVE_EVENT_ESCAPE,
  PIRATE_CAPTIVE_EVENT_WARNING,
  PIRATE_CAPTIVE_KIND_FAKE_EVIL,
  PIRATE_CAPTIVE_KIND_FAKE_REFORMED,
  PIRATE_CAPTIVE_STATE_DETAINED,
  PIRATE_CAPTIVE_STATE_ESCAPED,
  PIRATE_CAPTIVE_STATE_MERCY,
  acceptPirateCaptiveQuest,
  completePirateCaptiveQuest,
  confrontPirateCaptive,
  createPirateCaptiveDialogueSession,
  createPirateCaptiveQuest,
  createPirateCaptiveQuestMemory,
  migratePirateCaptiveQuestMemory,
  ignorePirateCaptiveWarning,
  advancePirateCaptiveJourneyMilestone,
  pirateCaptiveDestination,
  pirateCaptiveAuthorityDefianceLine,
  pirateCaptiveGenderedText,
  pirateCaptiveKindForRoll,
  pirateCaptiveRevengeSpawnIsDue,
  pirateCaptiveRecaptureLine,
  pirateCaptiveDialogueView,
  pirateCaptiveRescueAppears,
  pirateCaptiveWarningMessage,
  preparePirateCaptiveHomecoming,
  recapturePirateCaptive,
  recordPirateCaptiveEscape,
  resolveReformedPirateCaptive,
  selectPirateCaptiveDialogueOption,
  warnPirateCaptive,
  validatePirateCaptiveQuestMemory
} from "./pirateCaptiveQuest.js";
import {
  RESCUED_TRAVELER_TYPE_PIRATE_CAPTIVE,
  rescuedTravelerQuestIdentity
} from "./rescuedTravelerQuest.js";

const homePort = Object.freeze({
  tileId: 41,
  city: "Porto",
  displayCity: "Porto",
  country: "Portugal"
});

const wantedPort = Object.freeze({
  tileId: 72,
  city: "Lisbon",
  displayCity: "Lisbon",
  country: "Portugal",
  factionId: "portugal"
});

function character(id, givenName, familyName) {
  return Object.freeze({
    id,
    name: `${givenName} ${familyName}`,
    givenName,
    familyName,
    sex: "female",
    birthDate: Object.freeze({ year: 1497, month: 4, day: 8 }),
    birthDateLabel: "8 April 1497",
    age: 24,
    nameCulture: "portuguese",
    skillIds: Object.freeze(["able-seaman"]),
    expressions: Object.freeze([
      Object.freeze({ id: "sad", src: "assets/characters/sad.png", width: 64, height: 64 }),
      Object.freeze({ id: "happy", src: "assets/characters/happy.png", width: 64, height: 64 })
    ])
  });
}

const captive = character("captive", "Brites", "Pereira");
const familyMember = character("family", "Joana", "Pereira");

test("pirate victories use one-in-three rescue odds whenever no captive quest is active", () => {
  assert.equal(pirateCaptiveRescueAppears(0), true);
  assert.equal(pirateCaptiveRescueAppears(1 / 3 - Number.EPSILON), true);
  assert.equal(pirateCaptiveRescueAppears(1 / 3), false);
  assert.equal(pirateCaptiveRescueAppears(0.99), false);
});

test("the warning identifies a deceptive captive with known pronouns", () => {
  assert.equal(
    pirateCaptiveWarningMessage(captive),
    "Captain, Brites knows a pirate's habits too well. I do not think she was ever a captive."
  );
  assert.equal(
    pirateCaptiveWarningMessage({ ...captive, givenName: "Nils", sex: "male" }),
    "Captain, Nils knows a pirate's habits too well. I do not think he was ever a captive."
  );
});

test("captive actions use the known person's sex", () => {
  const maleCaptive = { ...captive, givenName: "Nils", sex: "male" };
  assert.equal(pirateCaptiveGenderedText(maleCaptive, "confront"), "Confront him");
  assert.equal(pirateCaptiveGenderedText(captive, "confront"), "Confront her");
  assert.equal(pirateCaptiveGenderedText(maleCaptive, "take-home"), "Take him home");
  assert.equal(pirateCaptiveGenderedText(captive, "turn-in"), "Turn her in");
  assert.equal(
    pirateCaptiveGenderedText(maleCaptive, "bind-hands", "Azemmour"),
    "Bind his hands. The authorities in Azemmour have a warrant waiting."
  );
  assert.equal(
    pirateCaptiveGenderedText(captive, "tie-hands", "Lisbon"),
    "Tie her properly this time. We sail for the authorities in Lisbon."
  );
  assert.throws(() => pirateCaptiveGenderedText(captive, "bind-hands"), /requires a destination/);
});

function createQuest(memory, familySurvivedRoll, captiveKindRoll = 0.9) {
  return createPirateCaptiveQuest(memory, {
    pirateShipId: "pirate-17",
    sourceTileId: 17,
    homePort,
    wantedPort,
    character: captive,
    familyMember: familySurvivedRoll < 0.5 ? familyMember : null,
    distanceKm: 2300,
    familySurvivedRoll,
    captiveKindRoll
  });
}

test("a rescued pirate captive fixes the family outcome and transitions aboard", () => {
  const memory = createPirateCaptiveQuestMemory();
  const quest = createQuest(memory, 0.49);
  assert.equal(quest.familySurvived, true);
  assert.equal(quest.familyMember.familyName, quest.character.familyName);
  assert.equal(quest.rewardDoubloons % 50, 0);

  const session = createPirateCaptiveDialogueSession(quest, { phase: "offer" });
  const offer = pirateCaptiveDialogueView(session, quest);
  assert.equal(offer.expressionId, "crying");
  assert.match(offer.text, /pirates kept me locked below/i);

  selectPirateCaptiveDialogueOption(session, quest, memory, 0);
  assert.equal(quest.stage, PIRATE_CAPTIVE_STAGE_ABOARD);
  const accepted = pirateCaptiveDialogueView(session, quest);
  assert.equal(accepted.expressionId, "overjoyed");
  assert.match(accepted.text, /set a course for Porto/i);
});

test("a surviving family shares a surname and gives money plus a high-value item", () => {
  const memory = createPirateCaptiveQuestMemory();
  const quest = createQuest(memory, 0.1);
  acceptPirateCaptiveQuest(memory, quest.id);
  preparePirateCaptiveHomecoming(memory, quest.id, {
    id: "lead-sheathing",
    label: "Lead Hull Sheathing"
  });
  assert.equal(quest.stage, PIRATE_CAPTIVE_STAGE_HOMECOMING);

  const session = createPirateCaptiveDialogueSession(quest, {
    phase: "homecoming",
    cityTileId: homePort.tileId,
    admittedToPort: true
  });
  assert.equal(pirateCaptiveDialogueView(session, quest).speaker, familyMember.name);
  assert.match(pirateCaptiveDialogueView(session, quest).text, /Brites, we thought we'd never see you again!/);
  selectPirateCaptiveDialogueOption(session, quest, memory, 0);
  selectPirateCaptiveDialogueOption(session, quest, memory, 0);
  const reward = pirateCaptiveDialogueView(session, quest);
  assert.match(reward.text, /Lead Hull Sheathing/);
  assert.match(reward.text, new RegExp(String(quest.rewardDoubloons)));
  selectPirateCaptiveDialogueOption(session, quest, memory, 0);
  const farewell = pirateCaptiveDialogueView(session, quest);
  assert.equal(farewell.expressionId, "overjoyed");
  assert.equal(farewell.options[0].action.type, "complete-rescued-traveler-reunion");
  completePirateCaptiveQuest(memory, quest.id);
  assert.equal(memory.active, null);
  assert.equal(memory.completedCount, 1);
});

test("a surviving family can complete a repeat rescue with a cash-only reward", () => {
  const memory = createPirateCaptiveQuestMemory();
  const quest = createQuest(memory, 0.1);
  acceptPirateCaptiveQuest(memory, quest.id);
  preparePirateCaptiveHomecoming(memory, quest.id, null);
  assert.equal(quest.stage, PIRATE_CAPTIVE_STAGE_HOMECOMING);
  assert.equal(quest.rewardItemId, null);

  const session = createPirateCaptiveDialogueSession(quest, {
    phase: "homecoming",
    cityTileId: homePort.tileId,
    admittedToPort: true
  });
  selectPirateCaptiveDialogueOption(session, quest, memory, 0);
  selectPirateCaptiveDialogueOption(session, quest, memory, 0);
  const reward = pirateCaptiveDialogueView(session, quest);
  assert.match(reward.text, new RegExp(String(quest.rewardDoubloons)));
  assert.doesNotMatch(reward.text, /null|undefined| and with/i);
});

test("a prepared reunion can explicitly revise an unavailable item to cash-only", () => {
  const memory = createPirateCaptiveQuestMemory();
  const quest = createQuest(memory, 0.1);
  acceptPirateCaptiveQuest(memory, quest.id);
  preparePirateCaptiveHomecoming(memory, quest.id, {
    id: "lead-sheathing",
    label: "Lead Hull Sheathing"
  });

  preparePirateCaptiveHomecoming(memory, quest.id, null);
  assert.equal(quest.stage, PIRATE_CAPTIVE_STAGE_HOMECOMING);
  assert.equal(quest.rewardItemId, null);
  assert.equal(quest.rewardItemLabel, null);
});

test("a captive whose family was lost asks to remain as permanent crew", () => {
  const memory = createPirateCaptiveQuestMemory();
  const quest = createQuest(memory, 0.5);
  assert.equal(quest.familySurvived, false);
  acceptPirateCaptiveQuest(memory, quest.id);
  preparePirateCaptiveHomecoming(memory, quest.id, null);
  const session = createPirateCaptiveDialogueSession(quest, {
    phase: "homecoming",
    cityTileId: homePort.tileId,
    admittedToPort: true
  });
  assert.equal(pirateCaptiveDialogueView(session, quest).expressionId, "crying");
  selectPirateCaptiveDialogueOption(session, quest, memory, 0);
  const request = pirateCaptiveDialogueView(session, quest);
  assert.match(request.text, /may I stay aboard/i);
  assert.equal(request.options[0].action.type, "recruit-rescued-traveler");
});

test("a later rare pirate captive quest can begin after one is completed", () => {
  const memory = createPirateCaptiveQuestMemory();
  assert.equal(
    rescuedTravelerQuestIdentity(memory, RESCUED_TRAVELER_TYPE_PIRATE_CAPTIVE, "pirate-17"),
    "pirate-captive:pirate-17:0"
  );
  const quest = createQuest(memory, 0.1);
  acceptPirateCaptiveQuest(memory, quest.id);
  preparePirateCaptiveHomecoming(memory, quest.id, {
    id: "lead-sheathing",
    label: "Lead Hull Sheathing"
  });
  completePirateCaptiveQuest(memory, quest.id);
  assert.equal(
    rescuedTravelerQuestIdentity(memory, RESCUED_TRAVELER_TYPE_PIRATE_CAPTIVE, "pirate-17"),
    "pirate-captive:pirate-17:1"
  );
  const second = createPirateCaptiveQuest(memory, {
    pirateShipId: "pirate-17",
    sourceTileId: 18,
    homePort,
    character: captive,
    familyMember,
    distanceKm: 1800,
    familySurvivedRoll: 0.1
  });
  assert.equal(second.id, "pirate-captive:pirate-17:1");
  validatePirateCaptiveQuestMemory(memory);
});

test("legacy pirate captive saves migrate into the shared rescue schema", () => {
  const memory = createPirateCaptiveQuestMemory();
  const quest = createQuest(memory, 0.75);
  const {
    rescueType: _rescueType,
    sourceId,
    emergencyAid: _emergencyAid,
    emergencyAidReceived: _emergencyAidReceived,
    ...legacyQuest
  } = quest;
  memory.active = { ...legacyQuest, pirateShipId: sourceId };

  const migrated = migratePirateCaptiveQuestMemory(memory);
  assert.equal(migrated.active.rescueType, "pirate-captive");
  assert.equal(migrated.active.sourceId, "pirate-17");
  assert.equal(migrated.active.emergencyAid, null);
  assert.equal(migrated.active.emergencyAidReceived, false);
  assert.equal(migrated.active.captiveKind, "real");
  assert.equal(migrated.active.deception, null);
});

test("fake captive identities are uncommon and split between evil and reformed", () => {
  assert.equal(pirateCaptiveKindForRoll(0.01), PIRATE_CAPTIVE_KIND_FAKE_EVIL);
  assert.equal(pirateCaptiveKindForRoll(0.149), PIRATE_CAPTIVE_KIND_FAKE_EVIL);
  assert.equal(pirateCaptiveKindForRoll(0.15), PIRATE_CAPTIVE_KIND_FAKE_REFORMED);
  assert.equal(pirateCaptiveKindForRoll(0.3), "real");
});

test("a companion warns halfway and an ignored evil impostor escapes halfway through the remaining leg", () => {
  const memory = createPirateCaptiveQuestMemory();
  const quest = createQuest(memory, 0.2, 0.05);
  acceptPirateCaptiveQuest(memory, quest.id);
  assert.equal(advancePirateCaptiveJourneyMilestone(quest, {
    currentTileId: 50,
    originDistance: 6,
    destinationDistance: 4,
    witnessId: "passenger-1"
  }), PIRATE_CAPTIVE_EVENT_WARNING);
  assert.equal(quest.deception.halfwayTileId, 50);
  warnPirateCaptive(quest, "passenger-1");
  ignorePirateCaptiveWarning(quest);
  assert.equal(advancePirateCaptiveJourneyMilestone(quest, {
    currentTileId: 75,
    originDistance: 2.6,
    destinationDistance: 2.4,
    witnessId: "passenger-1"
  }), PIRATE_CAPTIVE_EVENT_ESCAPE);
});

test("an unwitnessed evil impostor still uses the two halfway milestones", () => {
  const memory = createPirateCaptiveQuestMemory();
  const quest = createQuest(memory, 0.2, 0.05);
  acceptPirateCaptiveQuest(memory, quest.id);
  assert.equal(advancePirateCaptiveJourneyMilestone(quest, {
    currentTileId: 50,
    originDistance: 4,
    destinationDistance: 4,
    witnessId: null
  }), null);
  assert.equal(quest.deception.halfwayTileId, null);
  assert.equal(advancePirateCaptiveJourneyMilestone(quest, {
    currentTileId: 51,
    originDistance: 4.1,
    destinationDistance: 3.9,
    witnessId: null
  }), null);
  assert.equal(quest.deception.halfwayTileId, 51);
  assert.equal(advancePirateCaptiveJourneyMilestone(quest, {
    currentTileId: 75,
    originDistance: 2.4,
    destinationDistance: 2.5,
    witnessId: null
  }), null);
  assert.equal(advancePirateCaptiveJourneyMilestone(quest, {
    currentTileId: 76,
    originDistance: 2.6,
    destinationDistance: 2.4,
    witnessId: null
  }), PIRATE_CAPTIVE_EVENT_ESCAPE);
});

test("an armed confrontation detains an evil impostor for a preselected capital", () => {
  const memory = createPirateCaptiveQuestMemory();
  const quest = createQuest(memory, 0.2, 0.05);
  acceptPirateCaptiveQuest(memory, quest.id);
  warnPirateCaptive(quest, "crew-1");
  const result = confrontPirateCaptive(quest, {
    weaponItemId: "katana",
    currentMinute: 3000
  });
  assert.equal(result.outcome, "evil-detained");
  assert.equal(quest.deception.state, PIRATE_CAPTIVE_STATE_DETAINED);
  assert.equal(
    pirateCaptiveAuthorityDefianceLine(quest),
    "A warrant is only paper. I shall deny every word on it."
  );
  assert.deepEqual(pirateCaptiveDestination(quest), {
    tileId: wantedPort.tileId,
    name: wantedPort.city,
    country: wantedPort.country,
    kind: "authority"
  });
});

test("a reformed impostor may be shown mercy and still taken home", () => {
  const memory = createPirateCaptiveQuestMemory();
  const quest = createQuest(memory, 0.2, 0.2);
  acceptPirateCaptiveQuest(memory, quest.id);
  warnPirateCaptive(quest, "crew-1");
  assert.equal(confrontPirateCaptive(quest, {
    currentMinute: 3000
  }).outcome, "reformed-choice");
  resolveReformedPirateCaptive(quest, { detain: false, currentMinute: 3000 });
  assert.equal(quest.deception.state, PIRATE_CAPTIVE_STATE_MERCY);
  assert.equal(pirateCaptiveDestination(quest).tileId, homePort.tileId);
});

test("an escaped evil impostor returns later and can be recaptured", () => {
  const memory = createPirateCaptiveQuestMemory();
  const quest = createQuest(memory, 0.2, 0.05);
  acceptPirateCaptiveQuest(memory, quest.id);
  recordPirateCaptiveEscape(quest, {
    currentMinute: 5000,
    escapeOriginPortTileId: 81,
    stolenPossession: { kind: "cargo", id: "wine", label: "Wine", quantity: 1 }
  });
  assert.equal(quest.deception.state, PIRATE_CAPTIVE_STATE_ESCAPED);
  assert.equal(pirateCaptiveRevengeSpawnIsDue(quest, 5000), false);
  assert.equal(pirateCaptiveRevengeSpawnIsDue(quest, 5000 + 2 * 24 * 60), true);
  quest.deception.revengeSpawned = true;
  recapturePirateCaptive(quest, 9000);
  assert.equal(quest.deception.state, PIRATE_CAPTIVE_STATE_DETAINED);
  assert.equal(quest.deception.revengeDefeated, true);
  assert.equal(
    pirateCaptiveRecaptureLine(quest),
    "You again, captain? I should have stolen a faster rowboat."
  );
  assert.equal(
    pirateCaptiveAuthorityDefianceLine(quest),
    "You caught me; the rest is hearsay. I shall deny it under oath."
  );
});

test("an evil impostor receives a fresh powerful return after every escape", () => {
  const memory = createPirateCaptiveQuestMemory();
  const quest = createQuest(memory, 0.2, 0.05);
  acceptPirateCaptiveQuest(memory, quest.id);
  recordPirateCaptiveEscape(quest, {
    currentMinute: 5000,
    escapeOriginPortTileId: 81
  });
  const firstShipId = quest.deception.revengeShipId;
  quest.deception.revengeSpawned = true;
  recapturePirateCaptive(quest, 9000);

  recordPirateCaptiveEscape(quest, {
    currentMinute: 11000,
    escapeOriginPortTileId: 82
  });
  assert.equal(quest.deception.escapeCount, 2);
  assert.notEqual(quest.deception.revengeShipId, firstShipId);
  assert.equal(quest.deception.revengeSpawned, false);
  assert.equal(quest.deception.revengeDefeated, false);
  assert.equal(pirateCaptiveRevengeSpawnIsDue(quest, 11000 + 2 * 24 * 60), true);
  quest.deception.revengeSpawned = true;
  recapturePirateCaptive(quest, 15000);
  assert.equal(pirateCaptiveRecaptureLine(quest), "Again? I am beginning to take this personally.");
});
