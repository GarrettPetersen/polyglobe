import assert from "node:assert/strict";
import test from "node:test";

import {
  CAMPAIGN_GOAL_EXPLORER,
  campaignDialogueCharacter,
  campaignDialogueView,
  campaignVictorySummary,
  createCampaignDialogueSession,
  createCampaignGoal,
  selectCampaignDialogueOption
} from "./campaignGoals.js";
import {
  campaignRomanceDialogueSteps,
  createCampaignVictoryRomance
} from "./campaignRomance.js";

const MALE_CAPTAIN = Object.freeze({
  id: "captain-male",
  name: "Mateo Silva",
  sex: "male",
  gender: "male",
  nationalityId: "portugal",
  homePortTileId: 12,
  homePortName: "Lisbon"
});
const FEMALE_CAPTAIN = Object.freeze({
  ...MALE_CAPTAIN,
  id: "captain-female",
  name: "Ines Silva",
  sex: "female",
  gender: "female"
});
const CONTACT = Object.freeze({ id: "patron", name: "Duarte Costa" });

function crewmate(id, name, sex, birthYear) {
  return Object.freeze({
    id,
    name,
    sex,
    gender: sex,
    birthDate: Object.freeze({ year: birthYear, month: 1, day: 1 }),
    joinedCrew: true
  });
}

test("victory romance selects only an opposite-sex named crewmate over eighteen", () => {
  const adult = crewmate("adult-woman", "Beatriz Costa", "female", 1503);
  const exactlyEighteen = crewmate("young-woman", "Leonor Costa", "female", 1504);
  const sameSex = crewmate("adult-man", "Rui Costa", "male", 1490);
  const romance = createCampaignVictoryRomance({
    captain: MALE_CAPTAIN,
    namedCrew: [sameSex, exactlyEighteen, adult],
    currentMinute: 0
  });

  assert.equal(romance.companionId, adult.id);
  assert.ok(romance.childCount >= 2 && romance.childCount <= 10);
  assert.deepEqual(createCampaignVictoryRomance({
    captain: MALE_CAPTAIN,
    namedCrew: [sameSex, exactlyEighteen, adult],
    currentMinute: 0
  }), romance);
  assert.equal(createCampaignVictoryRomance({
    captain: MALE_CAPTAIN,
    namedCrew: [sameSex, exactlyEighteen],
    currentMinute: 0
  }), null);
});

test("male and female captains receive distinct mutual-confession dialogue", () => {
  const woman = crewmate("woman", "Beatriz Costa", "female", 1498);
  const man = crewmate("man", "Rui Costa", "male", 1498);
  const maleRomance = createCampaignVictoryRomance({
    captain: MALE_CAPTAIN,
    namedCrew: [woman],
    currentMinute: 100
  });
  const femaleRomance = createCampaignVictoryRomance({
    captain: FEMALE_CAPTAIN,
    namedCrew: [man],
    currentMinute: 100
  });
  const maleSteps = campaignRomanceDialogueSteps(maleRomance);
  const femaleSteps = campaignRomanceDialogueSteps(femaleRomance);

  assert.deepEqual(maleSteps.map((entry) => entry.speaker), ["companion", "player"]);
  assert.deepEqual(femaleSteps.map((entry) => entry.speaker), ["companion", "player"]);
  assert.match(maleSteps[0].text, /love/i);
  assert.match(femaleSteps[0].text, /love/i);
  assert.match(maleSteps[1].text, /love|so did i|answer/i);
  assert.match(femaleSteps[1].text, /love|so did i|answer/i);
  assert.notDeepEqual(maleSteps.map((entry) => entry.text), femaleSteps.map((entry) => entry.text));
});

test("campaign dialogue renders the confessing crewmate before the captain answers", () => {
  const companion = crewmate("woman", "Beatriz Costa", "female", 1498);
  const romance = createCampaignVictoryRomance({
    captain: MALE_CAPTAIN,
    namedCrew: [companion],
    currentMinute: 100
  });
  const session = createCampaignDialogueSession({
    cityTileId: MALE_CAPTAIN.homePortTileId,
    phase: "explorer-victory",
    steps: campaignRomanceDialogueSteps(romance),
    victoryOnClose: true,
    companionCharacter: companion
  });

  assert.equal(campaignDialogueCharacter(session, MALE_CAPTAIN, CONTACT), companion);
  assert.equal(campaignDialogueView(session, MALE_CAPTAIN, CONTACT).speaker, "Beatriz Costa, crewmate");
  assert.deepEqual(selectCampaignDialogueOption(session), { closed: false, action: null });
  assert.equal(campaignDialogueView(session, MALE_CAPTAIN, CONTACT).speaker, "Mateo Silva, captain");
});

test("the victory epilogue names the couple and their exact number of children", () => {
  const companion = crewmate("woman", "Beatriz Costa", "female", 1498);
  const romance = createCampaignVictoryRomance({
    captain: MALE_CAPTAIN,
    namedCrew: [companion],
    currentMinute: 100
  });
  const goal = createCampaignGoal({
    playerCharacter: MALE_CAPTAIN,
    type: CAMPAIGN_GOAL_EXPLORER
  });
  goal.status = "complete";
  const summary = campaignVictorySummary(goal, MALE_CAPTAIN, { romance });

  assert.match(
    summary.legacy,
    new RegExp(`Mateo Silva and Beatriz Costa married and had ${romance.childCount} children\\.`)
  );
  assert.equal((summary.legacy.match(/married/g) || []).length, 1);
});
