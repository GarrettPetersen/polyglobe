import assert from "node:assert/strict";
import test from "node:test";

import {
  CHEAT_COMMAND_DISCOVER_ALL,
  CHEAT_COMMAND_MILLION_DOUBLOONS,
  CHEAT_MILLION_DOUBLOONS,
  createCheatCodeInputState,
  grantAllDiscoveriesForCheat,
  grantMillionDoubloonsForCheat,
  processCheatCodeKey
} from "./cheatCodes.js";
import {
  CAMPAIGN_GOAL_EXPLORER,
  CAMPAIGN_GOAL_FAMILY_DEBT,
  createCampaignGoal
} from "./campaignGoals.js";
import { createGameState, settleCampaignGoalAtHome } from "./gameState.js";

const PLAYER = Object.freeze({
  id: "cheat-test-player",
  name: "Test Captain",
  givenName: "Test",
  gender: "female",
  nameCulture: "english",
  nationalityId: "england",
  homePortTileId: 12,
  homePortName: "Test Harbor",
  expressions: ["neutral"]
});
const HOME = Object.freeze({
  tileId: 12,
  city: "Test Harbor",
  factionId: "neutral",
  lat: 51.5,
  lon: -0.1
});

test("backtick opens a cheat prompt and discoverall resolves case-insensitively", () => {
  const state = createCheatCodeInputState();
  assert.equal(processCheatCodeKey(state, { key: "`", code: "Backquote" }).status, "opened");
  for (const key of "DiscoverAll") processCheatCodeKey(state, { key });
  assert.deepEqual(processCheatCodeKey(state, { key: "Enter" }), {
    handled: true,
    status: "accepted",
    command: CHEAT_COMMAND_DISCOVER_ALL,
    code: "discoverall"
  });
  assert.deepEqual(state, { active: false, buffer: "" });
});

test("milliondb resolves separately while unknown codes fail visibly", () => {
  const state = createCheatCodeInputState();
  processCheatCodeKey(state, { key: "F8", code: "F8" });
  for (const key of "milliondb") processCheatCodeKey(state, { key });
  assert.equal(processCheatCodeKey(state, { key: "Enter" }).command, CHEAT_COMMAND_MILLION_DOUBLOONS);

  processCheatCodeKey(state, { key: "`", code: "Backquote" });
  for (const key of "nope") processCheatCodeKey(state, { key });
  assert.deepEqual(processCheatCodeKey(state, { key: "Enter" }), {
    handled: true,
    status: "unknown",
    command: null,
    code: "nope"
  });
});

test("discoverall records the live catalog once without queuing arrival dialogue", () => {
  const state = createGameState({ cargoCapacity: 10 });
  const catalog = [
    { id: "mount-a", kind: "mountain", displayName: "Mount A", detail: "1,000 m" },
    {
      id: "around-world",
      kind: "achievement",
      displayName: "Around the World",
      portArrivalDialogue: "We circumnavigated the globe."
    }
  ];
  const first = grantAllDiscoveriesForCheat(state, catalog);
  const second = grantAllDiscoveriesForCheat(state, catalog);
  assert.deepEqual(first, { granted: 2, total: 2 });
  assert.deepEqual(second, { granted: 0, total: 2 });
  assert.deepEqual(state.memory.discoveryOrder, ["mount-a", "around-world"]);
  assert.deepEqual(state.memory.pendingDiscoveryPortDialogueIds, []);
});

test("milliondb sets an exact test purse", () => {
  const state = createGameState({ cargoCapacity: 10 });
  assert.deepEqual(grantMillionDoubloonsForCheat(state), {
    previous: 360,
    current: CHEAT_MILLION_DOUBLOONS
  });
  assert.equal(state.doubloons, 1_000_000);
});

test("discoverall completes the explorer goal at the next home-port report", () => {
  const state = createGameState({ cargoCapacity: 10, playerCharacter: PLAYER });
  state.memory.campaignGoal = createCampaignGoal({
    playerCharacter: PLAYER,
    type: CAMPAIGN_GOAL_EXPLORER
  });
  const catalog = [
    { id: "wonder-a", kind: "landmark", displayName: "Wonder A", lat: HOME.lat, lon: HOME.lon },
    { id: "around-world", kind: "achievement", displayName: "Around the World" }
  ];
  grantAllDiscoveriesForCheat(state, catalog);
  const result = settleCampaignGoalAtHome(state, HOME, {
    currentMinute: 0,
    wonderCatalog: catalog
  });
  assert.equal(result.completed, true);
  assert.equal(result.reportedCount, 1);
  assert.equal(state.doubloons, 460);
});

test("milliondb pays the family debt in full at the next home-port accounting", () => {
  const state = createGameState({ cargoCapacity: 10, playerCharacter: PLAYER });
  state.memory.campaignGoal = createCampaignGoal({
    playerCharacter: PLAYER,
    type: CAMPAIGN_GOAL_FAMILY_DEBT
  });
  grantMillionDoubloonsForCheat(state);
  const result = settleCampaignGoalAtHome(state, HOME, { currentMinute: 0 });
  assert.equal(result.completed, true);
  assert.equal(result.payment, 100_000);
  assert.equal(state.doubloons, 900_000);
});
