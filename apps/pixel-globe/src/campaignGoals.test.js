import assert from "node:assert/strict";
import test from "node:test";

import {
  CAMPAIGN_DESTINATION_DISCOVERY,
  CAMPAIGN_DESTINATION_HOME,
  CAMPAIGN_GOAL_COMPLETE,
  CAMPAIGN_GOAL_EXPLORER,
  CAMPAIGN_GOAL_FAMILY_DEBT,
  FAMILY_DEBT_PRINCIPAL,
  FAMILY_DEBT_RETURN_BUFFER_DAYS,
  campaignGoalDestination,
  campaignGoalIntroSteps,
  campaignHomecomingSteps,
  campaignVictorySummary,
  createCampaignDialogueSession,
  createCampaignGoal,
  explorerDiscoveryReward,
  familyDebtPayoffProjection,
  markCampaignGoalIntroSeen,
  selectCampaignDialogueOption,
  settleExplorerHomecoming,
  settleFamilyDebtHomecoming
} from "./campaignGoals.js";
import { WORLD_DISCOVERY_SPECS } from "./discoveries.js";

const CHARACTER = Object.freeze({
  id: "player-test",
  name: "Li Wei",
  givenName: "Wei",
  gender: "male",
  nameCulture: "chinese",
  homePortTileId: 42,
  homePortName: "Nanjing"
});
const CONTACT = Object.freeze({ id: "factor-test", name: "Zhao Min", homePortTileId: 42 });
const HOME = Object.freeze({ tileId: 42, city: "Nanjing", lat: 32.06, lon: 118.80 });
const WONDERS = Object.freeze([
  Object.freeze({ id: "mount-a", kind: "mountain", displayName: "Mount A", detail: "1,000 m", lat: HOME.lat, lon: HOME.lon }),
  Object.freeze({ id: "lake-b", kind: "landmark", displayName: "Lake B", detail: "A great lake", lat: -HOME.lat, lon: HOME.lon - 180 }),
  Object.freeze({ id: "around", kind: "achievement", displayName: "Around the world" })
]);

test("explorer reports each wonder once and uses the dynamic catalog total", () => {
  const goal = createCampaignGoal({ playerCharacter: CHARACTER, type: CAMPAIGN_GOAL_EXPLORER });
  const first = settleExplorerHomecoming(goal, {
    discoveredIds: new Set(["mount-a"]),
    wonderCatalog: WONDERS,
    homePort: HOME,
    nextLeadDiscoveryId: "lake-b"
  });
  assert.equal(first.reward, 100);
  assert.deepEqual(first.rewardEntries, [{ discoveryId: "mount-a", reward: 100 }]);
  assert.equal(first.nextLeadReward, 3000);
  assert.equal(first.totalWonderCount, 2);
  assert.equal(goal.currentLeadDiscoveryId, "lake-b");

  const repeated = settleExplorerHomecoming(goal, {
    discoveredIds: new Set(["mount-a"]),
    wonderCatalog: WONDERS,
    homePort: HOME,
    nextLeadDiscoveryId: "lake-b"
  });
  assert.equal(repeated.reward, 0);

  const final = settleExplorerHomecoming(goal, {
    discoveredIds: new Set(["mount-a", "lake-b"]),
    wonderCatalog: WONDERS,
    homePort: HOME,
    nextLeadDiscoveryId: null
  });
  assert.equal(final.reward, 3000);
  assert.equal(final.completed, true);
  assert.equal(goal.status, CAMPAIGN_GOAL_COMPLETE);
});

test("explorer rewards scale with distance and pay mountains half as much", () => {
  const antipode = { id: "far-wonder", kind: "landmark", lat: -HOME.lat, lon: HOME.lon - 180 };
  const farMountain = { ...antipode, id: "far-mountain", kind: "mountain" };
  const nearbyMountain = { id: "near-mountain", kind: "mountain", lat: HOME.lat, lon: HOME.lon };

  assert.equal(explorerDiscoveryReward(nearbyMountain, HOME), 100);
  assert.equal(explorerDiscoveryReward(antipode, HOME), 3000);
  assert.equal(explorerDiscoveryReward(farMountain, HOME), 1500);
});

test("explorer destination returns home after finding the patron's assigned wonder", () => {
  const goal = createCampaignGoal({ playerCharacter: CHARACTER, type: CAMPAIGN_GOAL_EXPLORER });
  goal.currentLeadDiscoveryId = "lake-b";

  assert.deepEqual(campaignGoalDestination(goal, {
    discoveredIds: new Set(["mount-a"])
  }), {
    kind: CAMPAIGN_DESTINATION_DISCOVERY,
    discoveryId: "lake-b"
  });
  assert.deepEqual(campaignGoalDestination(goal, {
    discoveredIds: new Set(["mount-a", "lake-b"])
  }), {
    kind: CAMPAIGN_DESTINATION_HOME,
    homePortTileId: CHARACTER.homePortTileId,
    reason: "report-discovery"
  });
});

test("family debt compounds daily and preserves the last 100 doubloons", () => {
  const goal = createCampaignGoal({
    playerCharacter: CHARACTER,
    startMinute: 0,
    type: CAMPAIGN_GOAL_FAMILY_DEBT
  });
  const result = settleFamilyDebtHomecoming(goal, {
    currentMinute: 365.25 * 24 * 60,
    doubloons: 1100
  });
  assert.ok(Math.abs(result.previousBalance - FAMILY_DEBT_PRINCIPAL) < 0.001);
  const expectedInterest = FAMILY_DEBT_PRINCIPAL * (Math.pow(1 + 0.10 / 365.25, 365.25) - 1);
  assert.ok(Math.abs(result.accruedInterest - expectedInterest) < 0.001);
  assert.equal(result.payment, 1000);
  assert.ok(Math.abs(result.remainingBalance - (FAMILY_DEBT_PRINCIPAL + expectedInterest - 1000)) < 0.001);

  const repeated = settleFamilyDebtHomecoming(goal, {
    currentMinute: 365.25 * 24 * 60,
    doubloons: 100
  });
  assert.ok(repeated.accruedInterest < 0.001);
  assert.equal(repeated.payment, 0);
});

test("family debt completes only after the balance can be paid above the reserve", () => {
  const goal = createCampaignGoal({ playerCharacter: CHARACTER, type: CAMPAIGN_GOAL_FAMILY_DEBT });
  const result = settleFamilyDebtHomecoming(goal, {
    currentMinute: 0,
    doubloons: FAMILY_DEBT_PRINCIPAL + 100
  });
  assert.equal(result.payment, FAMILY_DEBT_PRINCIPAL);
  assert.equal(result.completed, true);
  assert.equal(goal.status, CAMPAIGN_GOAL_COMPLETE);
});

test("family debt points home only with the debt, reserve, and one month of interest covered", () => {
  const startMinute = 114074.09888;
  const goal = createCampaignGoal({
    playerCharacter: CHARACTER,
    startMinute,
    type: CAMPAIGN_GOAL_FAMILY_DEBT
  });
  const payoff = familyDebtPayoffProjection(goal, startMinute, FAMILY_DEBT_RETURN_BUFFER_DAYS);
  assert.ok(payoff.projectedBalance > FAMILY_DEBT_PRINCIPAL);

  assert.equal(campaignGoalDestination(goal, {
    currentMinute: startMinute,
    doubloons: payoff.requiredDoubloons - 1
  }), null);
  assert.deepEqual(campaignGoalDestination(goal, {
    currentMinute: startMinute,
    doubloons: payoff.requiredDoubloons
  }), {
    kind: CAMPAIGN_DESTINATION_HOME,
    homePortTileId: CHARACTER.homePortTileId,
    reason: "pay-family-debt",
    requiredDoubloons: payoff.requiredDoubloons
  });
});

test("campaign dialogue and endings include cultural story material", () => {
  const goal = createCampaignGoal({ playerCharacter: CHARACTER, type: CAMPAIGN_GOAL_EXPLORER });
  const intro = campaignGoalIntroSteps(goal, CHARACTER, CONTACT);
  assert.ok(intro.some((entry) => entry.text.includes("imperial examinations")));
  assert.ok(intro.some((entry) => /dreamed of seeing the whole world/i.test(entry.text)));
  assert.ok(intro.some((entry) => /something exceptional in you/i.test(entry.text)));
  assert.ok(intro.some((entry) => /reward every true account/i.test(entry.text)));
  assert.ok(intro.every((entry) => !/1,?000 doubloons/i.test(entry.text)));
  markCampaignGoalIntroSeen(goal);
  settleExplorerHomecoming(goal, {
    discoveredIds: new Set(["mount-a", "lake-b"]),
    wonderCatalog: WONDERS,
    homePort: HOME,
    nextLeadDiscoveryId: null
  });
  const victory = campaignVictorySummary(goal, CHARACTER);
  assert.match(victory.legacy, /passed the imperial examinations/);
});

test("explorer homecoming gives each discovery a specific captain and patron exchange", () => {
  const pyramid = WORLD_DISCOVERY_SPECS.find((item) => item.id === "landmark-great-pyramid");
  const goal = createCampaignGoal({ playerCharacter: CHARACTER, type: CAMPAIGN_GOAL_EXPLORER });
  const outcome = settleExplorerHomecoming(goal, {
    discoveredIds: new Set([pyramid.id]),
    wonderCatalog: [pyramid],
    homePort: HOME
  });
  const steps = campaignHomecomingSteps(
    goal,
    outcome,
    CHARACTER,
    new Map([[pyramid.id, pyramid]])
  );

  assert.match(steps[0].text, /stone course is taller than a person/i);
  assert.match(steps[1].text, /kingdom vanished/i);
  assert.equal(steps[0].speaker, "player");
  assert.equal(steps[1].speaker, "contact");
});

test("the final homecoming dialogue closes into the campaign victory action", () => {
  const session = createCampaignDialogueSession({
    cityTileId: CHARACTER.homePortTileId,
    phase: "explorer-victory",
    steps: [
      { speaker: "contact", expressionId: "happy", text: "The atlas is complete." },
      { speaker: "player", expressionId: "thoughtful", text: "Then I am going home." }
    ],
    victoryOnClose: true
  });

  assert.deepEqual(selectCampaignDialogueOption(session), { closed: false, action: null });
  assert.deepEqual(selectCampaignDialogueOption(session), {
    closed: true,
    action: { type: "campaign-victory" }
  });
});
