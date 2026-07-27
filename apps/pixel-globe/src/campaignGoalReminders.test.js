import assert from "node:assert/strict";
import test from "node:test";

import {
  CAMPAIGN_GOAL_EXPLORER,
  CAMPAIGN_GOAL_FAMILY_DEBT,
  CAMPAIGN_GOAL_TREASURE,
  CAMPAIGN_GOAL_WHITE_WHALE,
  createCampaignGoal,
  markWhiteWhaleKilled
} from "./campaignGoals.js";
import {
  CAMPAIGN_GOAL_REMINDER_DECISION_KEY,
  CAMPAIGN_GOAL_REMINDER_INTERVAL_DAYS,
  campaignGoalDepartureReminder,
  dueCampaignGoalReminderInterval,
  markCampaignGoalReminderDelivered
} from "./campaignGoalReminders.js";
import { TREASURE_MAP_PIECE_COUNT } from "./treasureCampaign.js";

const CHARACTER = Object.freeze({
  id: "reminder-captain",
  name: "Marion MacLeod",
  givenName: "Marion",
  gender: "female",
  nameCulture: "scottish",
  nationalityId: "scotland",
  homePortTileId: 42,
  homePortName: "Edinburgh"
});
const WONDERS = Object.freeze([
  Object.freeze({
    id: "mount-atlas",
    kind: "mountain",
    displayName: "Mount Atlas",
    lat: 31,
    lon: -7
  }),
  Object.freeze({
    id: "great-pyramid",
    kind: "landmark",
    displayName: "the Great Pyramid",
    lat: 29.98,
    lon: 31.13
  })
]);

test("campaign reminders become due once per elapsed two-month interval", () => {
  const decisions = {};
  const intervalMinutes = CAMPAIGN_GOAL_REMINDER_INTERVAL_DAYS * 24 * 60;
  assert.equal(CAMPAIGN_GOAL_REMINDER_INTERVAL_DAYS, 60);
  assert.equal(dueCampaignGoalReminderInterval({
    decisions,
    currentMinute: intervalMinutes - 1,
    voyageStartMinute: 0
  }), null);
  assert.equal(dueCampaignGoalReminderInterval({
    decisions,
    currentMinute: intervalMinutes,
    voyageStartMinute: 0
  }), 1);

  markCampaignGoalReminderDelivered(decisions, 1);
  assert.equal(decisions[CAMPAIGN_GOAL_REMINDER_DECISION_KEY], 1);
  assert.equal(dueCampaignGoalReminderInterval({
    decisions,
    currentMinute: intervalMinutes * 2 - 1,
    voyageStartMinute: 0
  }), null);
  assert.equal(dueCampaignGoalReminderInterval({
    decisions,
    currentMinute: intervalMinutes * 3,
    voyageStartMinute: 0
  }), 3);
});

test("explorer reminders distinguish leads from discoveries awaiting a report", () => {
  const goal = createCampaignGoal({
    playerCharacter: CHARACTER,
    type: CAMPAIGN_GOAL_EXPLORER
  });
  goal.currentLeadDiscoveryId = "mount-atlas";
  goal.totalWonderCount = WONDERS.length;
  const lead = reminder(goal, {
    discoveredIds: new Set(),
    wonderCatalog: WONDERS
  });
  assert.match(lead.text, /Mount Atlas/);
  assert.match(lead.text, /Edinburgh/);

  const report = reminder(goal, {
    discoveredIds: new Set(["mount-atlas"]),
    wonderCatalog: WONDERS
  });
  assert.match(report.text, /tell Alistair Grant/);
  assert.match(report.text, /Mount Atlas/);
});

test("debt reminders show a rounded live balance and change when the purse can clear it", () => {
  const goal = createCampaignGoal({
    playerCharacter: CHARACTER,
    startMinute: 0,
    type: CAMPAIGN_GOAL_FAMILY_DEBT
  });
  const earning = reminder(goal, {
    currentMinute: 30 * 24 * 60,
    doubloons: 500
  });
  assert.match(earning.text, /100,\d00 doubloons/);
  assert.match(earning.text, /Alistair Grant/);

  const returning = reminder(goal, {
    currentMinute: 30 * 24 * 60,
    doubloons: 200000
  });
  assert.match(returning.text, /enough to clear the family debt/i);
  assert.match(returning.text, /Edinburgh/);
});

test("white whale reminders follow rumor, kill, and return-home state", () => {
  const goal = createCampaignGoal({
    playerCharacter: CHARACTER,
    type: CAMPAIGN_GOAL_WHITE_WHALE
  });
  assert.match(reminder(goal).text, /fresh word|ask after/i);
  goal.sighting = {
    latitudeDeg: -30,
    longitudeDeg: -20,
    reached: false,
    interactionKey: "rumor-1"
  };
  assert.match(reminder(goal).text, /marked on my chart/i);
  goal.sighting = null;
  markWhiteWhaleKilled(goal, 100);
  assert.match(reminder(goal, { currentMinute: 100 }).text, /home to Edinburgh/i);
});

test("treasure reminders report map progress and the completed map", () => {
  const goal = createCampaignGoal({
    playerCharacter: CHARACTER,
    type: CAMPAIGN_GOAL_TREASURE
  });
  assert.match(reminder(goal).text, /0 of 12 pieces/);

  goal.treasureTileId = 900;
  goal.mapPirates = Array.from({ length: TREASURE_MAP_PIECE_COUNT }, (_, index) => ({
    id: `pirate-${index}`,
    shipId: `ship-${index}`,
    hideoutTileId: index,
    shipSlug: "pirate-brig",
    captainName: `Pirate ${index}`
  }));
  goal.acquiredMapPiecePirateIds = goal.mapPirates.map((pirate) => pirate.id);
  assert.match(reminder(goal).text, /map is whole/i);
  assert.match(reminder(goal).text, /island is marked/i);
});

function reminder(goal, overrides = {}) {
  return campaignGoalDepartureReminder(goal, {
    currentMinute: 0,
    doubloons: 0,
    discoveredIds: new Set(),
    wonderCatalog: WONDERS,
    homePortName: "Edinburgh",
    contactName: "Alistair Grant",
    reminderInterval: 1,
    ...overrides
  });
}
