import assert from "node:assert/strict";
import test from "node:test";

import {
  CAMPAIGN_DESTINATION_DISCOVERY,
  CAMPAIGN_DESTINATION_HOME,
  CAMPAIGN_DESTINATION_WHITE_WHALE_SIGHTING,
  CAMPAIGN_GOAL_COMPLETE,
  CAMPAIGN_GOAL_EXPLORER,
  CAMPAIGN_GOAL_FAMILY_DEBT,
  CAMPAIGN_GOAL_TREASURE,
  CAMPAIGN_GOAL_WHITE_WHALE,
  FAMILY_DEBT_PRINCIPAL,
  FAMILY_DEBT_PROTECTED_PURSE,
  FAMILY_DEBT_RETURN_BUFFER_DAYS,
  campaignGoalDestination,
  campaignDialogueView,
  campaignGoalIntroSteps,
  campaignGoalPresentation,
  campaignHomecomingSteps,
  campaignVictorySummary,
  createCampaignDialogueSession,
  createCampaignGoal,
  drunkenCampaignHomecomingSteps,
  explorerDiscoveryReward,
  explorerPatronOutlook,
  familyDebtOriginExchange,
  familyDebtPayoffProjection,
  isExplorerLeadAssignable,
  markCampaignGoalIntroSeen,
  markWhiteWhaleKilled,
  reachWhiteWhaleSighting,
  recordWhiteWhaleSighting,
  selectCampaignDialogueOption,
  settleExplorerHomecoming,
  settleFamilyDebtHomecoming,
  settleWhiteWhaleHomecoming
} from "./campaignGoals.js";
import { CIRCUMNAVIGATION_DISCOVERY, WORLD_DISCOVERY_SPECS } from "./discoveries.js";

const CHARACTER = Object.freeze({
  id: "player-test",
  name: "Li Wei",
  givenName: "Wei",
  gender: "male",
  nameCulture: "chinese",
  nationalityId: "ming",
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
const EXPLORER_OBJECTIVES = Object.freeze([
  ...WONDERS.slice(0, 2),
  CIRCUMNAVIGATION_DISCOVERY
]);

test("every campaign goal exposes a persistent journal and character objective", () => {
  const presentations = [
    CAMPAIGN_GOAL_EXPLORER,
    CAMPAIGN_GOAL_FAMILY_DEBT,
    CAMPAIGN_GOAL_WHITE_WHALE,
    CAMPAIGN_GOAL_TREASURE
  ].map((type) => campaignGoalPresentation(createCampaignGoal({ playerCharacter: CHARACTER, type })));

  assert.deepEqual(presentations.map((entry) => entry.label), [
    "Explorer",
    "Family Debt",
    "The White Whale",
    "Captain's Treasure"
  ]);
  assert.match(presentations[0].objective, /discover every wonder/i);
  assert.match(presentations[1].objective, /pay off the family debt/i);
  assert.match(presentations[2].objective, /kill the white whale/i);
  assert.match(presentations[3].objective, /treasure map/i);
});

test("treasure dialogue keeps the three-rumor cap as an invisible backend constraint", () => {
  const goal = createCampaignGoal({ playerCharacter: CHARACTER, type: CAMPAIGN_GOAL_TREASURE });
  const intro = campaignGoalIntroSteps(goal, CHARACTER, CONTACT);
  const text = intro.map((entry) => entry.text).join(" ");

  assert.match(text, /Ask in ports\. Hail ships\./);
  assert.doesNotMatch(text, /three rumors|no more than three/i);
});

test("drunk homecomings open with role-specific captain banter", () => {
  const explorer = createCampaignGoal({ playerCharacter: CHARACTER, type: CAMPAIGN_GOAL_EXPLORER });
  const debt = createCampaignGoal({ playerCharacter: CHARACTER, type: CAMPAIGN_GOAL_FAMILY_DEBT });
  const whale = createCampaignGoal({ playerCharacter: CHARACTER, type: CAMPAIGN_GOAL_WHITE_WHALE });
  const treasure = createCampaignGoal({ playerCharacter: CHARACTER, type: CAMPAIGN_GOAL_TREASURE });
  assert.match(drunkenCampaignHomecomingSteps(explorer, CHARACTER)[1].text, /atlas/i);
  assert.match(drunkenCampaignHomecomingSteps(debt, CHARACTER)[1].text, /purse/i);
  assert.match(drunkenCampaignHomecomingSteps(whale, CHARACTER)[1].text, /whales/i);
  assert.match(drunkenCampaignHomecomingSteps(treasure, CHARACTER)[1].text, /treasure account/i);
  assert.equal(drunkenCampaignHomecomingSteps(explorer, CHARACTER)[0].speaker, "player");
});

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

test("adding a wonder preserves an existing patron lead from an older save", () => {
  const goal = createCampaignGoal({ playerCharacter: CHARACTER, type: CAMPAIGN_GOAL_EXPLORER });
  goal.currentLeadDiscoveryId = "lake-b";
  goal.totalWonderCount = 1;

  const outcome = settleExplorerHomecoming(goal, {
    discoveredIds: new Set(),
    wonderCatalog: [
      ...WONDERS,
      {
        id: "landmark-great-barrier-reef",
        kind: "landmark",
        displayName: "Great Barrier Reef",
        lat: -18.4,
        lon: 147.2
      }
    ],
    homePort: HOME,
    nextLeadDiscoveryId: goal.currentLeadDiscoveryId
  });

  assert.equal(goal.currentLeadDiscoveryId, "lake-b");
  assert.equal(goal.totalWonderCount, 3);
  assert.equal(outcome.nextLeadDiscoveryId, "lake-b");
  assert.equal(outcome.completed, false);
});

test("explorer rewards scale with distance and pay mountains half as much", () => {
  const antipode = { id: "far-wonder", kind: "landmark", lat: -HOME.lat, lon: HOME.lon - 180 };
  const farMountain = { ...antipode, id: "far-mountain", kind: "mountain" };
  const nearbyMountain = { id: "near-mountain", kind: "mountain", lat: HOME.lat, lon: HOME.lon };

  assert.equal(explorerDiscoveryReward(nearbyMountain, HOME), 100);
  assert.equal(explorerDiscoveryReward(antipode, HOME), 3000);
  assert.equal(explorerDiscoveryReward(farMountain, HOME), 1500);
});

test("circumnavigation pays 3,000 doubloons without replacing an existing map lead", () => {
  const goal = createCampaignGoal({ playerCharacter: CHARACTER, type: CAMPAIGN_GOAL_EXPLORER });
  goal.currentLeadDiscoveryId = "lake-b";

  assert.equal(isExplorerLeadAssignable(CIRCUMNAVIGATION_DISCOVERY), false);
  assert.equal(explorerDiscoveryReward(CIRCUMNAVIGATION_DISCOVERY, HOME), 3000);
  assert.deepEqual(campaignGoalDestination(goal, {
    discoveredIds: new Set([CIRCUMNAVIGATION_DISCOVERY.id])
  }), {
    kind: CAMPAIGN_DESTINATION_DISCOVERY,
    discoveryId: "lake-b"
  });

  const outcome = settleExplorerHomecoming(goal, {
    discoveredIds: new Set([CIRCUMNAVIGATION_DISCOVERY.id]),
    wonderCatalog: EXPLORER_OBJECTIVES,
    homePort: HOME,
    nextLeadDiscoveryId: "lake-b"
  });
  assert.equal(outcome.reward, 3000);
  assert.equal(outcome.reportedCount, 1);
  assert.equal(outcome.totalWonderCount, 3);
  assert.equal(outcome.nextLeadDiscoveryId, "lake-b");
  assert.equal(outcome.completed, false);

  const steps = campaignHomecomingSteps(
    goal,
    outcome,
    CHARACTER,
    new Map(EXPLORER_OBJECTIVES.map((discovery) => [discovery.id, discovery]))
  );
  assert.ok(steps.some((entry) => /world joined behind us/i.test(entry.text)));
  assert.ok(steps.some((entry) => /3,000 doubloons/i.test(entry.text)));
  assert.ok(steps.some((entry) => /Lake B/i.test(entry.text)));
});

test("circumnavigation can remain as the final non-location explorer objective", () => {
  const goal = createCampaignGoal({ playerCharacter: CHARACTER, type: CAMPAIGN_GOAL_EXPLORER });
  const locationReports = settleExplorerHomecoming(goal, {
    discoveredIds: new Set(["mount-a", "lake-b"]),
    wonderCatalog: EXPLORER_OBJECTIVES,
    homePort: HOME
  });
  assert.equal(locationReports.completed, false);
  assert.deepEqual(locationReports.remainingNonLocationObjectiveIds, [CIRCUMNAVIGATION_DISCOVERY.id]);

  const final = settleExplorerHomecoming(goal, {
    discoveredIds: new Set(["mount-a", "lake-b", CIRCUMNAVIGATION_DISCOVERY.id]),
    wonderCatalog: EXPLORER_OBJECTIVES,
    homePort: HOME
  });
  assert.equal(final.reward, 3000);
  assert.equal(final.completed, true);
  assert.equal(goal.status, CAMPAIGN_GOAL_COMPLETE);
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

test("family debt projection holds at its ledger checkpoint when the world clock is stale", () => {
  const checkpointMinute = 120000.75;
  const staleMinute = checkpointMinute - 46.5;
  const goal = createCampaignGoal({
    playerCharacter: CHARACTER,
    startMinute: checkpointMinute,
    type: CAMPAIGN_GOAL_FAMILY_DEBT
  });
  const payoff = familyDebtPayoffProjection(goal, staleMinute);
  assert.equal(payoff.projectedBalance, FAMILY_DEBT_PRINCIPAL);
  assert.equal(payoff.projectionMinute, checkpointMinute);
  assert.equal(payoff.recoveredClockMinutes, 46.5);
  assert.equal(goal.lastAccruedMinute, checkpointMinute);
  assert.equal(campaignGoalDestination(goal, {
    currentMinute: staleMinute,
    doubloons: 0
  }), null);
});

test("family debt settlement never moves its ledger checkpoint backward", () => {
  const checkpointMinute = 120000.75;
  const goal = createCampaignGoal({
    playerCharacter: CHARACTER,
    startMinute: checkpointMinute,
    type: CAMPAIGN_GOAL_FAMILY_DEBT
  });
  const stale = settleFamilyDebtHomecoming(goal, {
    currentMinute: checkpointMinute - 46.5,
    doubloons: FAMILY_DEBT_PROTECTED_PURSE
  });
  assert.equal(stale.accruedInterest, 0);
  assert.equal(stale.recoveredClockMinutes, 46.5);
  assert.equal(goal.lastAccruedMinute, checkpointMinute);

  const advanced = settleFamilyDebtHomecoming(goal, {
    currentMinute: checkpointMinute + 24 * 60,
    doubloons: FAMILY_DEBT_PROTECTED_PURSE
  });
  assert.ok(advanced.accruedInterest > 0);
  assert.equal(advanced.recoveredClockMinutes, 0);
  assert.equal(goal.lastAccruedMinute, checkpointMinute + 24 * 60);
});

test("family debt dialogue gives the creditor a concise recurring voice", () => {
  const goal = createCampaignGoal({ playerCharacter: CHARACTER, type: CAMPAIGN_GOAL_FAMILY_DEBT });
  const intro = campaignGoalIntroSteps(goal, CHARACTER, CONTACT);
  assert.equal(intro.length, 4);
  assert.ok(intro.some((entry) => /time now works for me/i.test(entry.text)));
  assert.ok(intro.some((entry) => /bread, rope/i.test(entry.text)));

  const outcome = settleFamilyDebtHomecoming(goal, {
    currentMinute: 40 * 24 * 60,
    doubloons: 500
  });
  const homecoming = campaignHomecomingSteps(goal, outcome, CHARACTER, new Map());
  assert.equal(homecoming.length, 3);
  assert.match(homecoming[0].text, /the sea may ignore calendars\. i do not/i);
  assert.match(homecoming[1].text, /respectable enough to delay my plans/i);
  assert.match(homecoming[2].text, /count how far i have come/i);
  assert.ok([...intro, ...homecoming].every((entry) => entry.text.length < 300));
});

test("family debt origins use faction-specific recent history", () => {
  const cases = [
    ["scotland", /Flodden/i, /crossed the Tweed/i],
    ["spain", /Villalar/i, /account book/i],
    ["habsburg", /Imperial crowns/i, /electors were paid/i],
    ["papal-states", /treasury forgot its wagons/i, /Urbino/i],
    ["ming", /rebels' roll/i, /Prince of Ning/i],
    ["safavid", /Chaldiran/i, /Tabriz/i],
    ["songhai", /Agadez/i, /Askia's march/i],
    ["vijayanagara", /Raichur/i, /Arabian horses/i],
    ["joseon", /reformer's office/i, /memorials before the purge/i]
  ];
  for (const [nationalityId, expectedCreditor, expectedPlayer] of cases) {
    const exchange = familyDebtOriginExchange({ ...CHARACTER, nationalityId });
    assert.match(exchange.creditor, expectedCreditor);
    assert.match(exchange.player, expectedPlayer);
    assert.ok(exchange.creditor.length < 120, `${nationalityId} creditor debt origin is too long`);
    assert.ok(exchange.player.length < 140, `${nationalityId} player debt origin is too long`);
  }

  assert.throws(
    () => familyDebtOriginExchange({ ...CHARACTER, nationalityId: "neutral" }),
    /Missing family debt origin for faction: neutral/
  );
});

test("Ming debt intro lets both sides allude to the Ning rebellion", () => {
  const goal = createCampaignGoal({ playerCharacter: CHARACTER, type: CAMPAIGN_GOAL_FAMILY_DEBT });
  const intro = campaignGoalIntroSteps(goal, CHARACTER, CONTACT);

  assert.match(intro[0].text, /court struck your uncle from the rebels' roll/i);
  assert.match(intro[1].text, /name appeared among the Prince of Ning's papers/i);
  assert.ok(intro.every((entry) => entry.text.length < 300));
});

test("campaign dialogue and endings include cultural story material", () => {
  const goal = createCampaignGoal({ playerCharacter: CHARACTER, type: CAMPAIGN_GOAL_EXPLORER });
  const intro = campaignGoalIntroSteps(goal, CHARACTER, CONTACT);
  assert.ok(intro.some((entry) => entry.text.includes("imperial examinations")));
  assert.ok(intro.some((entry) => /dreamed of seeing the whole world/i.test(entry.text)));
  assert.ok(intro.some((entry) => /something exceptional in you/i.test(entry.text)));
  assert.ok(intro.some((entry) => /reward every true account/i.test(entry.text)));
  assert.ok(intro.some((entry) => /Admiral Zheng's sea roads/i.test(entry.text)));
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

test("explorer patrons frame discovery through faction-specific recent history", () => {
  const cases = [
    ["ming", /Admiral Zheng's sea roads/i],
    ["spain", /Columbus.*Balboa/i],
    ["ottoman", /Piri Reis/i],
    ["ethiopia", /Envoys from Portugal/i],
    ["ayutthaya", /Portuguese.*Malacca/i]
  ];
  for (const [nationalityId, expected] of cases) {
    const outlook = explorerPatronOutlook({ ...CHARACTER, nationalityId });
    assert.match(outlook, expected);
    assert.ok(outlook.length < 170, `${nationalityId} explorer patron outlook is too long`);
  }
  assert.throws(
    () => explorerPatronOutlook({ ...CHARACTER, nationalityId: "neutral" }),
    /Missing explorer patron outlook for faction: neutral/
  );
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
  assert.equal(steps[0].topic, "REPORT 1/1: The Great Pyramid");
  assert.equal(steps[1].topic, "REPORT 1/1: The Great Pyramid");
});

test("explorer homecoming labels every exchange in a multi-wonder report", () => {
  const discoveries = [
    WORLD_DISCOVERY_SPECS.find((item) => item.id === "landmark-great-pyramid"),
    WORLD_DISCOVERY_SPECS.find((item) => item.id === "landmark-grand-canal")
  ];
  assert.ok(discoveries.every(Boolean));
  const goal = createCampaignGoal({ playerCharacter: CHARACTER, type: CAMPAIGN_GOAL_EXPLORER });
  const outcome = settleExplorerHomecoming(goal, {
    discoveredIds: new Set(discoveries.map((discovery) => discovery.id)),
    wonderCatalog: discoveries,
    homePort: HOME
  });
  const steps = campaignHomecomingSteps(
    goal,
    outcome,
    CHARACTER,
    new Map(discoveries.map((discovery) => [discovery.id, discovery]))
  );

  assert.deepEqual(steps.slice(0, 4).map((entry) => entry.topic), [
    "REPORT 1/2: The Great Pyramid",
    "REPORT 1/2: The Great Pyramid",
    "REPORT 2/2: The Grand Canal",
    "REPORT 2/2: The Grand Canal"
  ]);
  const session = createCampaignDialogueSession({
    cityTileId: CHARACTER.homePortTileId,
    phase: CAMPAIGN_GOAL_EXPLORER,
    steps
  });
  assert.equal(campaignDialogueView(session, CHARACTER, CONTACT).topic, "REPORT 1/2: The Great Pyramid");
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

test("white-whale rumors point to a sighting until the captain reaches it", () => {
  const goal = createCampaignGoal({ playerCharacter: CHARACTER, type: CAMPAIGN_GOAL_WHITE_WHALE });
  let rumor = null;
  for (let index = 0; index < 100 && !rumor; index++) {
    rumor = recordWhiteWhaleSighting(goal, {
      interactionKey: `test-port-${index}`,
      referenceCityName: "Makassar",
      referenceCityLatitudeDeg: -5.1,
      referenceCityLongitudeDeg: 119.4,
      whaleLatitudeDeg: -20,
      whaleLongitudeDeg: 125,
      reportedLatitudeDeg: -18.2,
      reportedLongitudeDeg: 127.7
    });
  }
  assert.ok(rumor);
  assert.match(rumor.text, /white|pale/i);
  assert.match(rumor.text, /Makassar/);
  assert.equal(rumor.referenceCityName, "Makassar");
  assert.deepEqual(campaignGoalDestination(goal), {
    kind: CAMPAIGN_DESTINATION_WHITE_WHALE_SIGHTING,
    latitudeDeg: -18.2,
    longitudeDeg: 127.7,
    reason: "white-whale-last-seen"
  });
  assert.match(reachWhiteWhaleSighting(goal), /place|spot|bearing/i);
  assert.equal(campaignGoalDestination(goal), null);
});

test("killing the white whale sends the captain home and completes the revenge voyage", () => {
  const goal = createCampaignGoal({ playerCharacter: CHARACTER, type: CAMPAIGN_GOAL_WHITE_WHALE });
  const intro = campaignGoalIntroSteps(goal, CHARACTER, CONTACT);
  assert.match(intro.map((entry) => entry.text).join(" "), /white whale|white shape/i);

  assert.equal(markWhiteWhaleKilled(goal, 1200), true);
  assert.deepEqual(campaignGoalDestination(goal), {
    kind: CAMPAIGN_DESTINATION_HOME,
    homePortTileId: CHARACTER.homePortTileId,
    reason: "return-after-white-whale"
  });
  const outcome = settleWhiteWhaleHomecoming(goal);
  assert.equal(outcome.completed, true);
  assert.equal(goal.status, CAMPAIGN_GOAL_COMPLETE);
  assert.match(campaignVictorySummary(goal, CHARACTER).legacy, /chase became legend/i);
});
