import assert from "node:assert/strict";
import test from "node:test";

import {
  CAMPAIGN_GOAL_EXPLORER,
  CAMPAIGN_GOAL_FAMILY_DEBT,
  CAMPAIGN_GOAL_WHITE_WHALE,
  createCampaignGoal
} from "./campaignGoals.js";
import {
  captainCharacterGoal,
  colonyLeaderCharacterGoal,
  detainedCaptiveCharacterGoal,
  namedCrewCharacterGoal,
  travelerCharacterGoal
} from "./characterGoals.js";

const CAPTAIN = Object.freeze({
  id: "goal-test-captain",
  name: "Test Captain",
  gender: "female",
  nationalityId: "portugal",
  homePortTileId: 12,
  homePortName: "Lisbon"
});

test("captain goals come from the campaign goal registry", () => {
  const explorer = createCampaignGoal({ playerCharacter: CAPTAIN, type: CAMPAIGN_GOAL_EXPLORER });
  const debt = createCampaignGoal({ playerCharacter: CAPTAIN, type: CAMPAIGN_GOAL_FAMILY_DEBT });
  const whale = createCampaignGoal({ playerCharacter: CAPTAIN, type: CAMPAIGN_GOAL_WHITE_WHALE });

  assert.match(captainCharacterGoal(explorer).text, /discover every wonder/i);
  assert.equal(captainCharacterGoal(debt).text, "Pay off the family debt");
  assert.equal(captainCharacterGoal(whale).text, "Hunt and kill the white whale");
  whale.whiteWhaleKilled = true;
  whale.whiteWhaleKilledMinute = 120;
  assert.equal(captainCharacterGoal(whale).text, "Return home after killing the white whale");
});

test("traveler and colony goals identify their current destination", () => {
  assert.deepEqual(
    travelerCharacterGoal({ id: "passenger-1", destinationName: "Calicut" }),
    { id: "travel:passenger-1", text: "Reach Calicut", destinationName: "Calicut" }
  );
  assert.deepEqual(
    travelerCharacterGoal({ id: "envoy-1", destinationName: "Lisbon", stage: "return" }),
    { id: "travel:envoy-1", text: "Reach Lisbon", destinationName: "Lisbon" }
  );
  assert.deepEqual(
    colonyLeaderCharacterGoal("New Bordeaux Colony"),
    {
      id: "colony:New Bordeaux Colony",
      text: "Found New Bordeaux Colony",
      destinationName: "New Bordeaux Colony"
    }
  );
});

test("a detained captive wants to escape custody before the handover", () => {
  assert.deepEqual(
    detainedCaptiveCharacterGoal("false-captive-1", "Azemmour"),
    {
      id: "captive:false-captive-1",
      text: "Escape custody before reaching Azemmour",
      destinationName: "Azemmour"
    }
  );
});

test("named crewmates can carry an explicit future quest goal", () => {
  assert.equal(namedCrewCharacterGoal({
    id: "crew-1",
    role: "crewmate",
    goal: "Chart the currents of the Indian Ocean"
  }).text, "Chart the currents of the Indian Ocean");
  assert.equal(namedCrewCharacterGoal({ id: "chef-1", role: "chef" }).text, "Keep the crew well fed");
});

test("rescued travelers normalize their explicit homecoming goal for the people screen", () => {
  const goal = namedCrewCharacterGoal({
    id: "pirate-captive:copenhagen",
    role: "pirate-captive",
    goal: "Reunite with family in Copenhagen"
  });

  assert.equal(goal.id, "character:pirate-captive:copenhagen");
  assert.equal(goal.text, "Reunite with family in Copenhagen");
});

test("structured traveler destinations fail loudly when malformed", () => {
  assert.throws(
    () => travelerCharacterGoal({ id: "lost-passenger", destinationName: "" }),
    /requires a destination/
  );
});
