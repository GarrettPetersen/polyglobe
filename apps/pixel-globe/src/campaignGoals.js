import { explorerReportDialogueForDiscovery } from "./explorerDiscoveryDialogue.js";
import { FACTIONS, NEUTRAL_FACTION_ID, PIRATE_FACTION_ID } from "./factions.js";
import { greatCircleDistanceKm, MAX_GREAT_CIRCLE_DISTANCE_KM } from "./worldDistance.js";
import { WHITE_WHALE_ID } from "./whaleSpecies.js";
import { campaignRomanceEpilogue, validateCampaignVictoryRomance } from "./campaignRomance.js";
import { characterPronouns } from "./characterPronouns.js";
import {
  TREASURE_MAP_PIECE_COUNT,
  createTreasureCampaignFields,
  treasureAmbushComplete,
  treasureCampaignObjective,
  treasureCampaignPhase,
  treasurePirateHints,
  validateTreasureCampaignFields
} from "./treasureCampaign.js";

export const CAMPAIGN_GOAL_VERSION = 1;
export const CAMPAIGN_GOAL_EXPLORER = "explorer";
export const CAMPAIGN_GOAL_FAMILY_DEBT = "family-debt";
export const CAMPAIGN_GOAL_WHITE_WHALE = "white-whale-revenge";
export const CAMPAIGN_GOAL_TREASURE = "pirate-treasure";
export const CAMPAIGN_GOAL_TYPE_IDS = Object.freeze([
  CAMPAIGN_GOAL_EXPLORER,
  CAMPAIGN_GOAL_FAMILY_DEBT,
  CAMPAIGN_GOAL_WHITE_WHALE,
  CAMPAIGN_GOAL_TREASURE
]);
const CAMPAIGN_GOAL_INTRO_PHASE_BY_TYPE = Object.freeze({
  [CAMPAIGN_GOAL_EXPLORER]: "intro",
  [CAMPAIGN_GOAL_FAMILY_DEBT]: "family-debt-intro",
  [CAMPAIGN_GOAL_WHITE_WHALE]: "white-whale-revenge-intro",
  [CAMPAIGN_GOAL_TREASURE]: "pirate-treasure-intro"
});
const CAMPAIGN_DIALOGUE_PHASE_SUFFIXES = Object.freeze([
  "",
  "intro",
  "victory",
  "retirement-choice",
  "retirement-blocked",
  "retirement"
]);
const CAMPAIGN_DIALOGUE_PHASE_METADATA = new Map([
  ["intro", Object.freeze({ contactGoalType: CAMPAIGN_GOAL_EXPLORER, completesIntro: true })],
  ...CAMPAIGN_GOAL_TYPE_IDS.flatMap((goalType) => (
    CAMPAIGN_DIALOGUE_PHASE_SUFFIXES.map((suffix) => {
      const phase = suffix === "" ? goalType : `${goalType}-${suffix}`;
      return [phase, Object.freeze({
        contactGoalType: goalType,
        completesIntro: suffix === "intro"
      })];
    })
  )),
  // Running voyages from the original white-whale plot used this shorter phase.
  ["white-whale-intro", Object.freeze({
    contactGoalType: CAMPAIGN_GOAL_WHITE_WHALE,
    completesIntro: true
  })],
  ["pirate-treasure-blockade", Object.freeze({
    contactGoalType: CAMPAIGN_GOAL_TREASURE,
    completesIntro: false
  })]
]);
export const CAMPAIGN_GOAL_BASE_SELECTION_WEIGHT = 8;
export const CAMPAIGN_GOAL_UNDERPLAYED_BONUS_CAP = 3;
export const CAMPAIGN_GOAL_ACTIVE = "active";
export const CAMPAIGN_GOAL_COMPLETE = "complete";
export const EXPLORER_DISCOVERY_REWARD_MIN = 100;
export const EXPLORER_DISCOVERY_REWARD_MAX = 3000;
export const EXPLORER_MOUNTAIN_REWARD_MULTIPLIER = 0.5;
export const FAMILY_DEBT_PRINCIPAL = 100000;
export const FAMILY_DEBT_ANNUAL_RATE = 0.10;
export const FAMILY_DEBT_PROTECTED_PURSE = 100;
export const FAMILY_DEBT_RETURN_BUFFER_DAYS = 30;
export const CAMPAIGN_DESTINATION_DISCOVERY = "discovery";
export const CAMPAIGN_DESTINATION_HOME = "home";
export const CAMPAIGN_DESTINATION_WHITE_WHALE_SIGHTING = "white-whale-sighting";

export function campaignGoalIntroPhase(goalType) {
  const phase = CAMPAIGN_GOAL_INTRO_PHASE_BY_TYPE[goalType];
  if (!phase) throw new Error(`Unknown campaign goal intro phase: ${goalType}`);
  return phase;
}
export const CAMPAIGN_DESTINATION_TREASURE_PIRATE = "treasure-pirate";
export const CAMPAIGN_DESTINATION_TREASURE_ISLAND = "treasure-island";

const MINUTES_PER_DAY = 24 * 60;
const DAYS_PER_YEAR = 365.25;
const CAMPAIGN_GOAL_DEFINITIONS = Object.freeze({
  [CAMPAIGN_GOAL_EXPLORER]: Object.freeze({
    label: "Explorer",
    objective: () => "Discover every wonder and report them to your patron",
    createFields: () => ({
      reportedDiscoveryIds: [],
      currentLeadDiscoveryId: null,
      totalWonderCount: 0
    }),
    validate: validateExplorerGoal
  }),
  [CAMPAIGN_GOAL_FAMILY_DEBT]: Object.freeze({
    label: "Family Debt",
    objective: () => "Pay off the family debt",
    createFields: (startMinute) => ({
      debtBalance: FAMILY_DEBT_PRINCIPAL,
      annualInterestRate: FAMILY_DEBT_ANNUAL_RATE,
      lastAccruedMinute: startMinute,
      protectedPurse: FAMILY_DEBT_PROTECTED_PURSE,
      totalPaid: 0
    }),
    validate: validateFamilyDebtGoal
  }),
  [CAMPAIGN_GOAL_WHITE_WHALE]: Object.freeze({
    label: "The White Whale",
    objective: (goal) => goal.whiteWhaleKilled
      ? "Return home after killing the white whale"
      : "Hunt and kill the white whale",
    createFields: () => ({
      whiteWhaleId: WHITE_WHALE_ID,
      whiteWhaleKilled: false,
      whiteWhaleKilledMinute: null,
      sighting: null,
      checkedInteractionIds: []
    }),
    validate: validateWhiteWhaleGoal
  }),
  [CAMPAIGN_GOAL_TREASURE]: Object.freeze({
    label: "Captain's Treasure",
    objective: treasureCampaignObjective,
    createFields: (_startMinute, playerCharacter) => createTreasureCampaignFields(playerCharacter.id),
    validate: validateTreasureCampaignFields
  })
});
const CAMPAIGN_GOAL_TYPES = new Set(CAMPAIGN_GOAL_TYPE_IDS);
const SOVEREIGN_FACTION_IDS = Object.freeze(FACTIONS
  .map((faction) => faction.id)
  .filter((factionId) => ![NEUTRAL_FACTION_ID, PIRATE_FACTION_ID].includes(factionId)));

export function createCampaignGoal({ playerCharacter, startMinute = 0, type = null }) {
  assertCharacter(playerCharacter);
  assertSimulationMinute(startMinute);
  const selectedType = type || seededGoalType(playerCharacter.id);
  if (!CAMPAIGN_GOAL_TYPES.has(selectedType)) {
    throw new Error(`Unknown campaign goal type: ${selectedType}`);
  }
  const definition = campaignGoalDefinition(selectedType);
  const base = {
    version: CAMPAIGN_GOAL_VERSION,
    type: selectedType,
    status: CAMPAIGN_GOAL_ACTIVE,
    homePortTileId: playerCharacter.homePortTileId,
    introSeen: false,
    endingVariant: hashString32(`${playerCharacter.id}|campaign-ending`) % 4
  };
  const goal = { ...base, ...definition.createFields(startMinute, playerCharacter) };
  return validateCampaignGoal(goal);
}

export function validateCampaignGoal(goal) {
  if (!goal || typeof goal !== "object") throw new Error("Campaign goal must be an object");
  if (goal.version !== CAMPAIGN_GOAL_VERSION) {
    throw new Error(`Unsupported campaign goal version: ${goal.version ?? "missing"}`);
  }
  if (!CAMPAIGN_GOAL_TYPES.has(goal.type)) throw new Error(`Unknown campaign goal type: ${goal.type}`);
  if (![CAMPAIGN_GOAL_ACTIVE, CAMPAIGN_GOAL_COMPLETE].includes(goal.status)) {
    throw new Error(`Invalid campaign goal status: ${goal.status}`);
  }
  if (!Number.isInteger(goal.homePortTileId) || goal.homePortTileId < 0) {
    throw new Error(`Invalid campaign home port: ${goal.homePortTileId}`);
  }
  if (typeof goal.introSeen !== "boolean") throw new Error("Campaign goal intro state must be boolean");
  if (!Number.isInteger(goal.endingVariant) || goal.endingVariant < 0 || goal.endingVariant > 3) {
    throw new Error(`Invalid campaign ending variant: ${goal.endingVariant}`);
  }
  campaignGoalDefinition(goal.type).validate(goal);
  return goal;
}

export function markCampaignGoalIntroSeen(goal) {
  validateCampaignGoal(goal);
  goal.introSeen = true;
  return goal;
}

export function isExplorerWonder(discovery) {
  return Boolean(discovery && (
    discovery.kind !== "achievement" || discovery.countsTowardExplorerGoal === true
  ));
}

export function isExplorerLeadAssignable(discovery) {
  return isExplorerWonder(discovery) && discovery.explorerLeadAssignable !== false;
}

export function explorerWonderCatalog(discoveries) {
  if (!Array.isArray(discoveries)) throw new Error("Explorer wonder catalog must be an array");
  const wonders = discoveries.filter(isExplorerWonder);
  const ids = new Set();
  for (const wonder of wonders) {
    if (typeof wonder.id !== "string" || wonder.id === "") throw new Error("Explorer wonder has no id");
    if (ids.has(wonder.id)) throw new Error(`Duplicate explorer wonder: ${wonder.id}`);
    ids.add(wonder.id);
  }
  return wonders;
}

export function explorerDiscoveryReward(discovery, homePort) {
  if (!isExplorerWonder(discovery)) throw new Error("Explorer rewards require a wonder");
  if (discovery.explorerRewardDoubloons !== undefined) {
    if (!Number.isInteger(discovery.explorerRewardDoubloons) || discovery.explorerRewardDoubloons <= 0) {
      throw new Error(`Invalid fixed explorer reward: ${discovery.explorerRewardDoubloons}`);
    }
    return discovery.explorerRewardDoubloons;
  }
  const distanceKm = greatCircleDistanceKm(homePort, discovery);
  const distanceShare = Math.min(1, distanceKm / MAX_GREAT_CIRCLE_DISTANCE_KM);
  const distanceReward = EXPLORER_DISCOVERY_REWARD_MIN +
    (EXPLORER_DISCOVERY_REWARD_MAX - EXPLORER_DISCOVERY_REWARD_MIN) * distanceShare;
  const adjustedReward = discovery.kind === "mountain"
    ? distanceReward * EXPLORER_MOUNTAIN_REWARD_MULTIPLIER
    : distanceReward;
  const roundedReward = Math.round(adjustedReward / 50) * 50;
  return Math.max(EXPLORER_DISCOVERY_REWARD_MIN, roundedReward);
}

export function campaignGoalDestination(goal, {
  discoveredIds = null,
  currentMinute = null,
  doubloons = null
} = {}) {
  return campaignGoalDestinations(goal, {
    discoveredIds,
    currentMinute,
    doubloons
  })[0] || null;
}

export function campaignGoalDestinations(goal, {
  discoveredIds = null,
  currentMinute = null,
  doubloons = null
} = {}) {
  validateCampaignGoal(goal);
  if (goal.status === CAMPAIGN_GOAL_COMPLETE) return [];
  if (goal.status !== CAMPAIGN_GOAL_ACTIVE) return [];
  if (goal.type === CAMPAIGN_GOAL_EXPLORER) {
    if (!(discoveredIds instanceof Set)) {
      throw new Error("Explorer destination requires discovered ids");
    }
    if (goal.currentLeadDiscoveryId === null) return [];
    return [discoveredIds.has(goal.currentLeadDiscoveryId)
      ? {
          kind: CAMPAIGN_DESTINATION_HOME,
          homePortTileId: goal.homePortTileId,
          reason: "report-discovery"
        }
      : {
          kind: CAMPAIGN_DESTINATION_DISCOVERY,
          discoveryId: goal.currentLeadDiscoveryId
        }];
  }

  if (goal.type === CAMPAIGN_GOAL_WHITE_WHALE) {
    if (goal.whiteWhaleKilled) {
      return [{
        kind: CAMPAIGN_DESTINATION_HOME,
        homePortTileId: goal.homePortTileId,
        reason: "return-after-white-whale"
      }];
    }
    if (!goal.sighting || goal.sighting.reached) return [];
    return [{
      kind: CAMPAIGN_DESTINATION_WHITE_WHALE_SIGHTING,
      latitudeDeg: goal.sighting.latitudeDeg,
      longitudeDeg: goal.sighting.longitudeDeg,
      reason: "white-whale-last-seen"
    }];
  }

  if (goal.type === CAMPAIGN_GOAL_TREASURE) {
    const phase = treasureCampaignPhase(goal);
    if (phase === "map-hunt") {
      return treasurePirateHints(goal).map((hint) => ({
        kind: CAMPAIGN_DESTINATION_TREASURE_PIRATE,
        pirateId: hint.pirateId,
        pirateName: hint.pirateName,
        pirateShipSlug: hint.pirateShipSlug,
        pirateShipLabel: hint.pirateShipLabel,
        latitudeDeg: hint.latitudeDeg,
        longitudeDeg: hint.longitudeDeg,
        reason: "treasure-map-pirate"
      }));
    }
    if (phase === "find-treasure") {
      if (!Number.isInteger(goal.treasureTileId)) {
        throw new Error("Completed treasure map has no island destination");
      }
      return [{
        kind: CAMPAIGN_DESTINATION_TREASURE_ISLAND,
        tileId: goal.treasureTileId,
        reason: "captains-treasure"
      }];
    }
    return [{
      kind: CAMPAIGN_DESTINATION_HOME,
      homePortTileId: goal.homePortTileId,
      reason: treasureAmbushComplete(goal) ? "return-with-treasure" : "treasure-home-ambush"
    }];
  }

  assertSimulationMinute(currentMinute);
  if (!Number.isInteger(doubloons) || doubloons < 0) {
    throw new Error(`Family debt destination requires a valid doubloon purse: ${doubloons}`);
  }
  const payoff = familyDebtPayoffProjection(
    goal,
    currentMinute,
    FAMILY_DEBT_RETURN_BUFFER_DAYS
  );
  return doubloons >= payoff.requiredDoubloons
    ? [{
        kind: CAMPAIGN_DESTINATION_HOME,
        homePortTileId: goal.homePortTileId,
        reason: "pay-family-debt",
        requiredDoubloons: payoff.requiredDoubloons
      }]
    : [];
}

export function familyDebtPayoffProjection(goal, currentMinute, additionalDays = 0) {
  validateCampaignGoal(goal);
  if (goal.type !== CAMPAIGN_GOAL_FAMILY_DEBT) {
    throw new Error("Debt payoff projection requires a family-debt goal");
  }
  assertSimulationMinute(currentMinute);
  if (!Number.isFinite(additionalDays) || additionalDays < 0) {
    throw new Error(`Invalid family debt projection days: ${additionalDays}`);
  }
  const projectionMinute = Math.max(currentMinute, goal.lastAccruedMinute);
  const recoveredClockMinutes = projectionMinute - currentMinute;
  const elapsedDays = (projectionMinute - goal.lastAccruedMinute) / MINUTES_PER_DAY + additionalDays;
  const projectedBalance = goal.debtBalance * Math.pow(
    1 + goal.annualInterestRate / DAYS_PER_YEAR,
    elapsedDays
  );
  return {
    projectedBalance,
    requiredDoubloons: Math.ceil(projectedBalance) + goal.protectedPurse,
    projectionMinute,
    recoveredClockMinutes
  };
}

export function settleExplorerHomecoming(goal, {
  discoveredIds,
  wonderCatalog,
  homePort,
  nextLeadDiscoveryId = null
}) {
  validateCampaignGoal(goal);
  if (goal.type !== CAMPAIGN_GOAL_EXPLORER) throw new Error("Explorer settlement requires an explorer goal");
  if (!(discoveredIds instanceof Set)) throw new Error("Explorer settlement requires discovered ids");
  if (!Number.isFinite(homePort?.lat) || !Number.isFinite(homePort?.lon)) {
    throw new Error("Explorer settlement requires a placed home port");
  }
  const wonders = explorerWonderCatalog(wonderCatalog);
  const reported = new Set(goal.reportedDiscoveryIds);
  const newlyReportedWonders = wonders
    .filter((wonder) => discoveredIds.has(wonder.id) && !reported.has(wonder.id));
  const newlyReported = newlyReportedWonders.map((wonder) => wonder.id);
  const rewardEntries = newlyReportedWonders.map((wonder) => ({
    discoveryId: wonder.id,
    reward: explorerDiscoveryReward(wonder, homePort)
  }));
  for (const discoveryId of newlyReported) {
    goal.reportedDiscoveryIds.push(discoveryId);
    reported.add(discoveryId);
  }
  goal.totalWonderCount = wonders.length;

  const nextLead = nextLeadDiscoveryId === null
    ? null
    : wonders.find((wonder) => wonder.id === nextLeadDiscoveryId);
  const unknownLead = nextLeadDiscoveryId !== null && !nextLead;
  if (unknownLead) throw new Error(`Explorer lead is not in the wonder catalog: ${nextLeadDiscoveryId}`);
  if (nextLead && !isExplorerLeadAssignable(nextLead)) {
    throw new Error(`Explorer lead has no map location: ${nextLeadDiscoveryId}`);
  }
  if (nextLeadDiscoveryId !== null && discoveredIds.has(nextLeadDiscoveryId)) {
    throw new Error(`Explorer lead is already discovered: ${nextLeadDiscoveryId}`);
  }
  goal.currentLeadDiscoveryId = nextLeadDiscoveryId;
  const remainingNonLocationObjectiveIds = wonders
    .filter((wonder) => !isExplorerLeadAssignable(wonder) && !reported.has(wonder.id))
    .map((wonder) => wonder.id);
  const completed = goal.reportedDiscoveryIds.length === wonders.length;
  if (completed) {
    goal.status = CAMPAIGN_GOAL_COMPLETE;
    goal.currentLeadDiscoveryId = null;
  }
  return {
    type: goal.type,
    newlyReportedIds: newlyReported,
    rewardEntries,
    reward: rewardEntries.reduce((sum, entry) => sum + entry.reward, 0),
    reportedCount: goal.reportedDiscoveryIds.length,
    totalWonderCount: wonders.length,
    nextLeadDiscoveryId: goal.currentLeadDiscoveryId,
    nextLeadReward: nextLead ? explorerDiscoveryReward(nextLead, homePort) : null,
    remainingNonLocationObjectiveIds,
    completed
  };
}

export function settleFamilyDebtHomecoming(goal, { currentMinute, doubloons }) {
  validateCampaignGoal(goal);
  if (goal.type !== CAMPAIGN_GOAL_FAMILY_DEBT) throw new Error("Debt settlement requires a family-debt goal");
  assertSimulationMinute(currentMinute);
  if (!Number.isInteger(doubloons) || doubloons < 0) throw new Error(`Invalid doubloon purse: ${doubloons}`);
  const previousBalance = goal.debtBalance;
  const projection = familyDebtPayoffProjection(goal, currentMinute);
  goal.debtBalance = projection.projectedBalance;
  goal.lastAccruedMinute = projection.projectionMinute;
  const accruedInterest = Math.max(0, goal.debtBalance - previousBalance);
  const availablePayment = Math.max(0, doubloons - goal.protectedPurse);
  const payment = Math.min(availablePayment, Math.ceil(goal.debtBalance));
  goal.debtBalance = Math.max(0, goal.debtBalance - payment);
  goal.totalPaid += payment;
  const completed = goal.debtBalance <= 0;
  if (completed) goal.status = CAMPAIGN_GOAL_COMPLETE;
  return {
    type: goal.type,
    previousBalance,
    accruedInterest,
    payment,
    remainingBalance: goal.debtBalance,
    protectedPurse: goal.protectedPurse,
    completed,
    insufficientPurse: doubloons < goal.protectedPurse,
    recoveredClockMinutes: projection.recoveredClockMinutes
  };
}

export function settleWhiteWhaleHomecoming(goal) {
  validateCampaignGoal(goal);
  if (goal.type !== CAMPAIGN_GOAL_WHITE_WHALE) {
    throw new Error("White whale homecoming requires a white-whale revenge goal");
  }
  if (!goal.whiteWhaleKilled) throw new Error("The white whale is still alive");
  goal.status = CAMPAIGN_GOAL_COMPLETE;
  return { type: goal.type, completed: true };
}

export function recordWhiteWhaleSighting(goal, {
  interactionKey,
  referenceCityName,
  referenceCityLatitudeDeg,
  referenceCityLongitudeDeg,
  whaleLatitudeDeg,
  whaleLongitudeDeg,
  reportedLatitudeDeg,
  reportedLongitudeDeg
}) {
  validateCampaignGoal(goal);
  if (goal.type !== CAMPAIGN_GOAL_WHITE_WHALE || goal.whiteWhaleKilled) return null;
  if (typeof interactionKey !== "string" || interactionKey === "") {
    throw new Error("White whale sighting requires an interaction key");
  }
  if (typeof referenceCityName !== "string" || referenceCityName.trim() === "") {
    throw new Error("White whale sighting requires a reference city");
  }
  for (const [label, value] of Object.entries({
    referenceCityLatitudeDeg,
    referenceCityLongitudeDeg,
    whaleLatitudeDeg,
    whaleLongitudeDeg,
    reportedLatitudeDeg,
    reportedLongitudeDeg
  })) {
    if (!Number.isFinite(value)) throw new Error(`White whale sighting has invalid ${label}`);
  }
  if (goal.checkedInteractionIds.includes(interactionKey)) return null;
  goal.checkedInteractionIds.push(interactionKey);
  if (goal.checkedInteractionIds.length > 128) goal.checkedInteractionIds.shift();
  const roll = hashString32(`${interactionKey}|white-whale-rumor`) % 20;
  if (roll !== 0) return null;
  goal.sighting = {
    latitudeDeg: reportedLatitudeDeg,
    longitudeDeg: reportedLongitudeDeg,
    reached: false,
    interactionKey
  };
  const direction = compassDirection(
    referenceCityLatitudeDeg,
    referenceCityLongitudeDeg,
    whaleLatitudeDeg,
    whaleLongitudeDeg
  );
  const city = referenceCityName.trim();
  const variants = [
    `I heard of a whale white as a winding sheet, last seen ${direction} of ${city}. The sailors who saw it have stopped laughing at old tales.`,
    `A pale spout was sighted ${direction} of ${city}, and beneath it a back like a snow-covered reef. If your quarry lives, it passed that way.`,
    `There are sober men in ${city} swearing they saw the white whale to the ${direction}. It sounded once and vanished, as though the sea had closed an eye.`,
    `Word came from waters ${direction} of ${city}: a great sperm whale, all white, carrying old iron in its hide. I thought you would want the bearing.`,
    `A ship ${direction} of ${city} reports a white whale that stove their boat with one turn of its flukes. They marked the waters before they fled.`,
    `Look ${direction} of ${city}. The crews there speak of a white brow rising through black water, terrible and calm. That is the whale you seek.`
  ];
  return {
    text: variants[hashString32(`${interactionKey}|white-whale-prose`) % variants.length],
    direction,
    referenceCityName: city,
    sighting: { ...goal.sighting }
  };
}

export function reachWhiteWhaleSighting(goal) {
  validateCampaignGoal(goal);
  if (goal.type !== CAMPAIGN_GOAL_WHITE_WHALE) throw new Error("Sighting arrival requires a white-whale goal");
  if (!goal.sighting || goal.sighting.reached) return null;
  goal.sighting.reached = true;
  const lines = [
    "This is the place. The sea keeps no footprints, yet I feel that white shadow beneath every wave.",
    "Here was the last pale spout. Somewhere beyond this empty water, the white whale still rolls on.",
    "The bearing ends here. No whale, only the indifferent sea. We will ask again, and follow again.",
    "This is the spot they marked. The white whale has sounded, but no depth will hide it forever."
  ];
  return lines[hashString32(`${goal.sighting.interactionKey}|arrival`) % lines.length];
}

export function markWhiteWhaleKilled(goal, currentMinute) {
  validateCampaignGoal(goal);
  if (goal.type !== CAMPAIGN_GOAL_WHITE_WHALE) return false;
  assertSimulationMinute(currentMinute);
  if (goal.whiteWhaleKilled) throw new Error("White whale campaign kill was already recorded");
  goal.whiteWhaleKilled = true;
  goal.whiteWhaleKilledMinute = currentMinute;
  goal.sighting = null;
  return true;
}

export function campaignGoalTypeForCharacter(playerCharacter, campaignStartsByGoal = {}) {
  assertCharacter(playerCharacter);
  return seededGoalType(playerCharacter.id, campaignStartsByGoal);
}

export function campaignGoalTypeForStoredLabel(label) {
  if (typeof label !== "string" || label.trim() === "") return null;
  return CAMPAIGN_GOAL_TYPE_IDS.find(
    (type) => CAMPAIGN_GOAL_DEFINITIONS[type].label === label
  ) || null;
}

export function campaignGoalSelectionWeights(campaignStartsByGoal = {}) {
  if (!campaignStartsByGoal || typeof campaignStartsByGoal !== "object" ||
      Array.isArray(campaignStartsByGoal)) {
    throw new Error("Campaign start counts must be an object");
  }
  const counts = CAMPAIGN_GOAL_TYPE_IDS.map((type) => {
    const count = campaignStartsByGoal[type] ?? 0;
    if (!Number.isInteger(count) || count < 0) {
      throw new Error(`Invalid campaign start count for ${type}: ${count}`);
    }
    return count;
  });
  const mostPlayedCount = Math.max(...counts);
  return Object.fromEntries(CAMPAIGN_GOAL_TYPE_IDS.map((type, index) => [
    type,
    CAMPAIGN_GOAL_BASE_SELECTION_WEIGHT + Math.min(
      CAMPAIGN_GOAL_UNDERPLAYED_BONUS_CAP,
      mostPlayedCount - counts[index]
    )
  ]));
}

export function campaignGoalIntroSteps(goal, playerCharacter, contactCharacter) {
  validateCampaignGoal(goal);
  assertCharacter(playerCharacter);
  assertPerson(contactCharacter);
  const culture = culturalStory(playerCharacter);
  if (goal.type === CAMPAIGN_GOAL_EXPLORER) {
    const patronOutlook = explorerPatronOutlook(playerCharacter);
    return [
      step("contact", "pleased", `${playerCharacter.givenName || playerCharacter.name}, travelers' tales contradict one another. ${patronOutlook} I trust your eyes; there is something exceptional in you. Bring me true accounts of the world's wonders.`),
      step("player", "thoughtful", `Since I was a child, I have dreamed of seeing the whole world with my own eyes: every impossible mountain, ancient city, and shore beyond the horizon. ${culture.explorerIntro}`),
      step("contact", "attentive", "Bring that world home to me. I reward every true account, especially rare and distant wonders. Each time you return, I will share the nearest rumor still worth chasing."),
      step("player", "determined", "I will follow those rumors to the edge of every chart. When I return, you will know these places as more than names, and I will finally have seen the world I imagined.")
    ];
  }
  if (goal.type === CAMPAIGN_GOAL_WHITE_WHALE) {
    return [
      step("contact", "concerned", `You still mean to follow that white whale, ${playerCharacter.givenName || playerCharacter.name}? Other captains call it a beast. You speak of it as judgment.`),
      step("player", "stern", "It took my boat, my comrades, and every quiet night since. Its white brow rises whenever I close my eyes. I will cross every sea until I set my iron in it."),
      step("contact", "attentive", "Take a blue-water hull and a sound harpoon. Ask in every port and hail passing ships; sailors repeat strange news to a listening captain."),
      step("player", "determined", "Let the chart be blank and the ocean without end. I know the mark I hunt. Towards that white shape I roll, though all the waves of the world lie between us.")
    ];
  }
  if (goal.type === CAMPAIGN_GOAL_TREASURE) {
    return [
      step("contact", "attentive", `Captain ${goal.treasureCaptainName} left an uncharted treasure. The old crew tore its map into ${TREASURE_MAP_PIECE_COUNT} pieces, one for each pirate who feared the rest.`),
      step("player", "thoughtful", "A dozen pirates, a dozen scraps, and one island somewhere beyond the lamps of any harbor. It sounds like the beginning of a hanging, not a fortune."),
      step("contact", "pleased", "Every piece is aboard a pirate ship. Ask in ports. Hail ships. Mark reliable bearings until the old crew shows its sails."),
      step("player", "determined", `I will take the pieces from Captain ${goal.treasureCaptainName}'s old crew, read the map whole, and come home with the gold.`)
    ];
  }
  const debtOrigin = familyDebtOriginExchange(playerCharacter);
  return [
    step("contact", "stern", `${playerCharacter.name}, your family owes ${formatDoubloons(FAMILY_DEBT_PRINCIPAL)} doubloons, secured by the estate. At ten percent interest, time now works for me. ${debtOrigin.creditor}`),
    step("player", "concerned", `${debtOrigin.player} ${culture.debtIntro}`),
    step("contact", "pleased", `I will leave you ${goal.protectedPurse} doubloons for necessities. Everything above that pays the debt. Return poorer, and your balance will keep growing.`),
    step("player", "determined", "Keep the deed close and your ink ready. One day you will write paid in full across it, and my family will keep what is ours.")
  ];
}

export function familyDebtOriginExchange(character) {
  assertCharacter(character);
  if (!Object.hasOwn(FAMILY_DEBT_ORIGINS_BY_FACTION, character.nationalityId)) {
    throw new Error(`Missing family debt origin for faction: ${character.nationalityId ?? "none"}`);
  }
  return FAMILY_DEBT_ORIGINS_BY_FACTION[character.nationalityId];
}

export function explorerPatronOutlook(character) {
  assertCharacter(character);
  if (!Object.hasOwn(EXPLORER_PATRON_OUTLOOKS_BY_FACTION, character.nationalityId)) {
    throw new Error(`Missing explorer patron outlook for faction: ${character.nationalityId ?? "none"}`);
  }
  return EXPLORER_PATRON_OUTLOOKS_BY_FACTION[character.nationalityId];
}

export function campaignHomecomingSteps(
  goal,
  outcome,
  playerCharacter,
  discoveryById,
  { buildEditionId = "full" } = {}
) {
  validateCampaignGoal(goal);
  assertCharacter(playerCharacter);
  if (!outcome || outcome.type !== goal.type) throw new Error("Campaign homecoming outcome does not match goal");
  if (goal.type === CAMPAIGN_GOAL_EXPLORER) {
    return explorerHomecomingSteps(goal, outcome, playerCharacter, discoveryById);
  }
  if (goal.type === CAMPAIGN_GOAL_FAMILY_DEBT) {
    return debtHomecomingSteps(goal, outcome, playerCharacter, { buildEditionId });
  }
  if (goal.type === CAMPAIGN_GOAL_TREASURE) {
    return [
      step("contact", "attentive", `Twelve sails followed you toward home, and twelve are gone. Tell me Captain ${goal.treasureCaptainName}'s treasure was worth the broadside.`),
      step("player", "thoughtful", "The island was where the joined map promised. The gold was real, and so was every old grudge that came hunting it. I have had my fill of both."),
      step("contact", "pleased", "Then come ashore while you still know the difference between treasure and a curse. The sea has had enough chances to spend you."),
      step("player", "happy", "Aye. The chart can hang over a quiet hearth now. I have seen what lies beneath the red X, and I prefer the road home.")
    ];
  }
  return [
    step("contact", "attentive", "Your ship has returned, but the old fury is gone from your face. Is it finished?"),
    step("player", "thoughtful", "The white whale is dead. I thought the sea would change when it sank. It did not. The waves closed over it, and for the first time they were only waves."),
    step("contact", "pleased", "Then come ashore. A life spent chasing one pale shadow is still a life, and yours has not ended with the chase."),
    step("player", "happy", "No. I have followed vengeance to the end of the chart. What comes next will be chosen in daylight.")
  ];
}

export function campaignRetirementReturnSteps(goal, playerCharacter) {
  validateCampaignGoal(goal);
  assertCharacter(playerCharacter);
  if (goal.status !== CAMPAIGN_GOAL_COMPLETE) {
    throw new Error("Campaign retirement requires a completed goal");
  }
  if (goal.type === CAMPAIGN_GOAL_EXPLORER) {
    return [
      step("contact", "attentive", "The atlas is complete, captain. Will you close this voyage and take your place in history, or answer the sea once more?")
    ];
  }
  if (goal.type === CAMPAIGN_GOAL_FAMILY_DEBT) {
    return [
      step("contact", "stern", "Your account remains paid in full. You may retire with the estate secure, or keep sailing now that every mile is your own.")
    ];
  }
  if (goal.type === CAMPAIGN_GOAL_TREASURE) {
    return [
      step("contact", "attentive", `Captain ${goal.treasureCaptainName}'s treasure is home and the old crew are beaten. Will you retire with the prize, or tempt the sea again?`)
    ];
  }
  return [
    step("contact", "attentive", "The white whale is dead and your vengeance is finished. Will you end the voyage here, or choose another horizon?")
  ];
}

export function campaignRetirementBlockedSteps({
  travelerName,
  destinationName,
  additionalTravelerCount
}) {
  const name = requiredDialogueText(travelerName, "retirement traveler name");
  const destination = requiredDialogueText(destinationName, "retirement traveler destination");
  if (!Number.isInteger(additionalTravelerCount) || additionalTravelerCount < 0) {
    throw new Error(`Invalid additional retirement traveler count: ${additionalTravelerCount}`);
  }
  const text = additionalTravelerCount === 0
    ? `My own quest is finished, but ${name} is still counting on me for passage to ${destination}. I will see that promise kept before I retire.`
    : additionalTravelerCount === 1
      ? `My own quest is finished, but ${name} is still counting on me for passage to ${destination}, and one other traveler still depends on this ship. I will see them both to their destinations before I retire.`
      : `My own quest is finished, but ${name} is still counting on me for passage to ${destination}, and ${additionalTravelerCount} other travelers still depend on this ship. I will see them all to their destinations before I retire.`;
  return [step("player", "determined", text)];
}

function requiredDialogueText(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Missing ${label}`);
  }
  return value.trim();
}

export function drunkenCampaignHomecomingSteps(goal, playerCharacter) {
  validateCampaignGoal(goal);
  assertCharacter(playerCharacter);
  if (goal.type === CAMPAIGN_GOAL_FAMILY_DEBT) {
    return [
      step("player", "happy", "Good news: I have come to settle accounts. Better news: the floor has stopped listing to port."),
      step("contact", "annoyed", "That is the floor. It has never moved. Hand me the purse before you misplace gravity.")
    ];
  }
  if (goal.type === CAMPAIGN_GOAL_EXPLORER) {
    return [
      step("player", "happy", "I have returned with discoveries. Some of them are currently moving, but I wrote them down while they were still."),
      step("contact", "concerned", "Sit down, captain. I shall separate geography from wine before adding either to the atlas.")
    ];
  }
  if (goal.type === CAMPAIGN_GOAL_TREASURE) {
    return [
      step("player", "happy", "The map said X marked the spot. I found three Xs, two of them moving, and one demanding another bottle."),
      step("contact", "concerned", "Give me the treasure account after breakfast. For now, try not to bury yourself.")
    ];
  }
  return [
    step("player", "happy", "I found the white whale. Or a white whale. Or an extremely judgmental wave."),
    step("contact", "concerned", "Coffee first. Then bearings. Then whales.")
  ];
}

export function campaignVictorySummary(
  goal,
  playerCharacter,
  { romance = null, animalCompanionCount = 0 } = {}
) {
  validateCampaignGoal(goal);
  assertCharacter(playerCharacter);
  if (goal.status !== CAMPAIGN_GOAL_COMPLETE) throw new Error("Campaign victory requires a completed goal");
  if (romance) validateCampaignVictoryRomance(romance);
  if (!Number.isInteger(animalCompanionCount) || animalCompanionCount < 0) {
    throw new Error(`Invalid retiring animal companion count: ${animalCompanionCount}`);
  }
  const culture = culturalStory(playerCharacter);
  const personal = personalEnding(playerCharacter, goal.endingVariant, Boolean(romance));
  const romanceEnding = romance ? ` ${campaignRomanceEpilogue(romance, playerCharacter)}` : "";
  const animalEnding = animalCompanionCount === 0
    ? ""
    : animalCompanionCount === 1
      ? " The captain's animal companion came ashore too and remained a cherished, disorderly member of the household for the rest of its days."
      : " The captain's animal companions came ashore too and remained cherished, disorderly members of the household for the rest of their days.";
  if (goal.type === CAMPAIGN_GOAL_EXPLORER) {
    return {
      title: "THE GREATEST EXPLORER",
      reason: `Reported every known wonder to the patron of ${playerCharacter.homePortName}.`,
      legacy: `${playerCharacter.name} was remembered as the greatest explorer of the age. ${culture.explorerOutro} ${personal}${romanceEnding}${animalEnding}`
    };
  }
  if (goal.type === CAMPAIGN_GOAL_WHITE_WHALE) {
    return {
      title: "THE WHITE WHALE",
      reason: "Hunted the white whale across the world and returned home alive.",
      legacy: `${playerCharacter.name} returned with the white whale's story. The chase became legend, but the captain finally learned to live beyond it. ${personal}${romanceEnding}${animalEnding}`
    };
  }
  if (goal.type === CAMPAIGN_GOAL_TREASURE) {
    return {
      title: "CAPTAIN'S TREASURE",
      reason: `Recovered all ${TREASURE_MAP_PIECE_COUNT} pieces of Captain ${goal.treasureCaptainName}'s map, found the island, and fought the old crew home.`,
      legacy: `${playerCharacter.name} returned with Captain ${goal.treasureCaptainName}'s treasure. The map was locked away, the gold wisely spent, and no black sail ruled the captain's fate again. ${personal}${romanceEnding}${animalEnding}`
    };
  }
  return {
    title: "THE ESTATE IS SAVED",
    reason: "Repaid the family debt in full and reclaimed the estate.",
    legacy: `${playerCharacter.name} returned home free of debt and kept the family estate. ${culture.debtOutro} ${personal}${romanceEnding}${animalEnding}`
  };
}

export function campaignGoalLabel(goal) {
  return campaignGoalPresentation(goal).label;
}

export function campaignGoalPresentation(goal) {
  validateCampaignGoal(goal);
  const definition = campaignGoalDefinition(goal.type);
  const objective = definition.objective(goal);
  if (typeof objective !== "string" || objective.trim() === "") {
    throw new Error(`Campaign goal ${goal.type} has no objective text`);
  }
  return Object.freeze({
    type: goal.type,
    label: definition.label,
    objective
  });
}

export function createCampaignDialogueSession({
  cityTileId,
  steps,
  phase,
  continueToPortOnClose = false,
  nextPortNodeId = null,
  victoryOnClose = false,
  retirementChoiceOnClose = false,
  retirementBlockedOnClose = false,
  companionCharacter = null,
  participantCharacters = []
}) {
  if (!Number.isInteger(cityTileId) || cityTileId < 0) throw new Error(`Invalid campaign dialogue city: ${cityTileId}`);
  if (!Array.isArray(steps) || steps.length === 0) throw new Error("Campaign dialogue requires at least one step");
  if (typeof phase !== "string" || phase === "") throw new Error("Campaign dialogue requires a phase");
  const closingModes = [victoryOnClose, retirementChoiceOnClose, retirementBlockedOnClose]
    .filter(Boolean).length;
  if (closingModes > 1) {
    throw new Error("Campaign dialogue can have only one closing mode");
  }
  if (companionCharacter !== null) assertPerson(companionCharacter);
  if (!Array.isArray(participantCharacters)) {
    throw new Error("Campaign dialogue participants must be an array");
  }
  const participantIds = new Set();
  for (const character of participantCharacters) {
    assertPerson(character);
    if (participantIds.has(character.id)) {
      throw new Error(`Duplicate campaign dialogue participant: ${character.id}`);
    }
    participantIds.add(character.id);
  }
  for (const entry of steps) validateDialogueStep(entry, companionCharacter, participantIds);
  return {
    kind: "campaign-goal",
    cityTileId,
    phase,
    steps,
    stepIndex: 0,
    selectedIndex: 0,
    admittedToPort: continueToPortOnClose,
    continueToPortOnClose,
    nextPortNodeId,
    victoryOnClose,
    retirementChoiceOnClose,
    retirementBlockedOnClose,
    companionCharacter,
    participantCharacters
  };
}

export function campaignDialogueView(session, playerCharacter, contactCharacter) {
  assertCampaignDialogueSession(session);
  assertCharacter(playerCharacter);
  assertPerson(contactCharacter);
  const entry = session.steps[session.stepIndex];
  const speakerCharacter = campaignDialogueSpeaker(session, entry, playerCharacter, contactCharacter);
  const phaseMetadata = campaignDialoguePhaseMetadata(session.phase);
  const contactRole = phaseMetadata.contactGoalType === CAMPAIGN_GOAL_FAMILY_DEBT
    ? "creditor"
    : phaseMetadata.contactGoalType === CAMPAIGN_GOAL_WHITE_WHALE
      ? "old whaler"
      : phaseMetadata.contactGoalType === CAMPAIGN_GOAL_TREASURE ? "old buccaneer" : "patron";
  const role = entry.speaker === "player"
    ? "captain"
    : entry.speaker === "companion" || entry.speaker === "participant"
      ? speakerCharacter.role === "ship-animal-companion" ? "companion" : "crewmate"
      : contactRole;
  return {
    speaker: `${speakerCharacter.name}, ${role}`,
    expressionId: entry.expressionId,
    topic: entry.topic || null,
    text: entry.text,
    feedback: null,
    options: session.stepIndex === session.steps.length - 1 && session.retirementChoiceOnClose
      ? [
          {
            label: "End voyage",
            action: { type: "campaign-retire" }
          },
          {
            label: "Keep sailing",
            action: { type: "campaign-keep-sailing" }
          }
        ]
      : session.stepIndex === session.steps.length - 1 && session.retirementBlockedOnClose
        ? [{
            label: "Keep sailing",
            action: { type: "campaign-keep-sailing" }
          }]
      : [{
          label: session.stepIndex === session.steps.length - 1
            ? session.victoryOnClose ? "See my legacy" : session.continueToPortOnClose ? "Continue into port" : "Begin voyage"
            : "Continue",
          action: { type: "continue-campaign" }
        }]
  };
}

export function campaignDialogueCharacter(session, playerCharacter, contactCharacter) {
  assertCampaignDialogueSession(session);
  const entry = session.steps[session.stepIndex];
  return campaignDialogueSpeaker(session, entry, playerCharacter, contactCharacter);
}

export function selectCampaignDialogueOption(session, optionIndex = session.selectedIndex) {
  assertCampaignDialogueSession(session);
  if (session.stepIndex < session.steps.length - 1) {
    if (optionIndex !== 0) throw new Error(`Invalid campaign dialogue option index: ${optionIndex}`);
    session.stepIndex += 1;
    session.selectedIndex = 0;
    return { closed: false, action: null };
  }
  if (session.retirementChoiceOnClose) {
    if (optionIndex !== 0 && optionIndex !== 1) {
      throw new Error(`Invalid campaign retirement option index: ${optionIndex}`);
    }
    return optionIndex === 0
      ? { closed: true, action: { type: "campaign-retire" } }
      : { closed: true, action: { type: "campaign-keep-sailing" } };
  }
  if (session.retirementBlockedOnClose) {
    if (optionIndex !== 0) {
      throw new Error(`Invalid blocked campaign retirement option index: ${optionIndex}`);
    }
    return {
      closed: true,
      action: { type: "campaign-keep-sailing" }
    };
  }
  if (optionIndex !== 0) throw new Error(`Invalid campaign dialogue option index: ${optionIndex}`);
  return {
    closed: true,
    action: session.victoryOnClose
      ? { type: "campaign-victory" }
      : campaignDialoguePhaseMetadata(session.phase).completesIntro
        ? { type: "campaign-intro-complete" }
        : null
  };
}

function campaignDialoguePhaseMetadata(phase) {
  const metadata = CAMPAIGN_DIALOGUE_PHASE_METADATA.get(phase);
  if (!metadata) throw new Error(`Unknown campaign dialogue phase: ${phase}`);
  return metadata;
}

function explorerHomecomingSteps(goal, outcome, playerCharacter, discoveryById) {
  if (!(discoveryById instanceof Map)) throw new Error("Explorer dialogue requires a discovery catalog map");
  const steps = [];
  if (outcome.newlyReportedIds.length === 0) {
    steps.push(step("contact", "attentive", "No new wonders for my atlas today. The world has not grown smaller while you were away."));
  } else {
    for (const [index, discoveryId] of outcome.newlyReportedIds.entries()) {
      const discovery = discoveryById.get(discoveryId);
      if (!discovery) throw new Error(`Missing reported discovery: ${discoveryId}`);
      const report = explorerReportDialogueForDiscovery(discovery);
      const topic = `REPORT ${index + 1}/${outcome.newlyReportedIds.length}: ${discovery.displayName}`;
      steps.push(step("player", "happy", report.player, topic));
      steps.push(step("contact", "pleased", report.patron, topic));
    }
    steps.push(step(
      "contact",
      "pleased",
      `${outcome.newlyReportedIds.length === 1 ? "That account earns" : "Those accounts earn"} ${formatDoubloons(outcome.reward)} doubloons. We now hold ${outcome.reportedCount} of ${outcome.totalWonderCount} wonders.`
    ));
  }
  if (outcome.completed) {
    steps.push(step("contact", "happy", `All ${outcome.totalWonderCount}. There is no blank left in my book. No living captain can match what you have done.`));
    steps.push(step("player", "thoughtful", "Then perhaps it is time to hang my sea coat by the hearth and learn how still ground feels again."));
  } else if (outcome.nextLeadDiscoveryId) {
    const lead = discoveryById.get(outcome.nextLeadDiscoveryId);
    if (!lead) throw new Error(`Missing explorer lead discovery: ${outcome.nextLeadDiscoveryId}`);
    steps.push(step("contact", "attentive", `The nearest untested report is ${lead.displayName}: ${lead.detail || "a wonder missing from our atlas"}. A true account earns ${formatDoubloons(outcome.nextLeadReward)} doubloons. I marked the bearing.`));
  } else if (outcome.remainingNonLocationObjectiveIds.length > 0) {
    const objectiveId = outcome.remainingNonLocationObjectiveIds[0];
    const objective = discoveryById.get(objectiveId);
    if (!objective) throw new Error(`Missing non-location explorer objective: ${objectiveId}`);
    if (typeof objective.explorerChallengeDialogue !== "string" || objective.explorerChallengeDialogue === "") {
      throw new Error(`Non-location explorer objective has no patron challenge: ${objectiveId}`);
    }
    steps.push(step("contact", "attentive", objective.explorerChallengeDialogue));
  }
  return steps;
}

function debtHomecomingSteps(goal, outcome, playerCharacter, { buildEditionId }) {
  const captainName = playerCharacter.givenName || playerCharacter.name;
  const steps = [step(
    "contact",
    "stern",
    outcome.accruedInterest >= 0.5
      ? `Ah, ${captainName}. I kept the account warm while you were away. Interest added ${formatDoubloons(outcome.accruedInterest)} doubloons, bringing the balance to ${formatDoubloons(outcome.previousBalance + outcome.accruedInterest)}. The sea may ignore calendars. I do not.`
      : `Back already, ${captainName}? The ink on our last accounting is scarcely dry. You still owe ${formatDoubloons(outcome.previousBalance + outcome.accruedInterest)} doubloons.`
  )];
  if (outcome.completed) {
    steps.push(step("contact", "annoyed", `There. Your final ${formatDoubloons(outcome.payment)} doubloons settle the account. Against my expectations, the estate is yours again. I had nearly decided where my seal would hang.`));
    steps.push(step("player", "happy", "Choose another wall. Write paid in full carefully; my family will frame the receipt where your claim once hung."));
    if (buildEditionId === "demo") {
      steps.push(step(
        "contact",
        "attentive",
        "The full version offers stranger ambitions: chart the wonders of the world, hunt the white whale, or seek pirate treasure. All are less predictable than compound interest."
      ));
    }
  } else if (outcome.payment > 0) {
    steps.push(step("contact", "stern", `${formatDoubloons(outcome.payment)} doubloons. Respectable enough to delay my plans, not enough to end them. I have left you ${outcome.protectedPurse}; the remaining balance is ${formatDoubloons(outcome.remainingBalance)}.`));
    steps.push(step("player", "determined", "You count what remains. I count how far I have come. The next payment will be larger."));
  } else if (outcome.insufficientPurse) {
    steps.push(step("contact", "angry", `Not even ${outcome.protectedPurse} doubloons in your purse? Did the ocean swallow your profit, or did you never find any? Your family chose a poor champion.`));
    steps.push(step("player", "stern", "Enjoy the insult. It earns you no interest, and I will remember it when the debt is gone."));
  } else {
    steps.push(step("contact", "annoyed", `Exactly ${outcome.protectedPurse} doubloons. You have preserved your purse and wasted my afternoon. The remaining ${formatDoubloons(outcome.remainingBalance)} continues to grow.`));
    steps.push(step("player", "determined", "Then keep the chair warm. I will bring you a payment worth standing up to count."));
  }
  return steps;
}

function culturalStory(character) {
  const storyCulture = CULTURAL_STORY_ALIASES[character.nameCulture] || character.nameCulture;
  const stories = CULTURAL_STORIES[storyCulture] || CULTURAL_STORIES.maritime;
  return stories;
}

const CULTURAL_STORY_ALIASES = Object.freeze({
  bengali: "southAsian",
  cebuano: "maritime",
  centralAsian: "persian",
  cham: "maritime",
  crimeanTatar: "ottoman",
  czech: "maritime",
  ethiopian: "eastAfrican",
  finnish: "nordic",
  gujarati: "southAsian",
  hausa: "westAfrican",
  indoMuslim: "southAsian",
  irish: "maritime",
  javanese: "maritime",
  jewish: "maritime",
  kanuri: "westAfrican",
  khoikhoi: "westAfrican",
  kongo: "westAfrican",
  lao: "maritime",
  malay: "maritime",
  malayali: "southAsian",
  malukan: "maritime",
  mande: "westAfrican",
  monBurmese: "maritime",
  northIndian: "southAsian",
  shona: "eastAfrican",
  sinhalese: "southAsian",
  sikh: "southAsian",
  somali: "eastAfrican",
  southIndian: "southAsian",
  swahili: "eastAfrican",
  tatar: "ottoman",
  thai: "maritime",
  vietnamese: "maritime",
  yoruba: "westAfrican"
});

const CULTURAL_STORIES = Object.freeze({
  chinese: story(
    "I failed the imperial examinations, but perhaps the oceans will judge my learning more kindly than the examination hall did.",
    "On a later attempt, the captain passed the imperial examinations and presented the court with an atlas no scholar could rival.",
    "Our ancestral hall and family fields will not be surrendered for a creditor's arithmetic.",
    "The restored estate supported a school, and the captain's later examination essays were written without fear of ruin."
  ),
  korean: story(
    "The examinations did not open a court office to me. A true chart of distant seas may prove another kind of scholarship.",
    "The royal court preserved copies of the captain's charts beside the finest geographic works of Joseon.",
    "My clan register will not record that I let our household lands pass to a moneylender.",
    "The household prospered again, and its library became known among local scholars."
  ),
  japanese: story(
    "The coastal guilds know every familiar inlet. I mean to bring them knowledge of seas no pilot here has named.",
    "The captain founded a respected house of pilots whose charts crossed every sea-road in Japan.",
    "My house has weathered war and fire. It will not fall to an inked account.",
    "The family house was rebuilt, its storehouses full and its name secure."
  ),
  portuguese: story(
    "Every quay is full of rumors from Africa and India. I intend to learn which ones deserve a place on a royal chart.",
    "Pilots carried copies of the captain's charts from Lisbon to every Portuguese factory.",
    "Our quinta has belonged to the family longer than any voyage. I will buy it back with the profits of the sea.",
    "The family quinta flourished, shaded by trees brought home from distant ports."
  ),
  spanish: story(
    "The court rewards bold claims. I would rather return with observations no courtier can dispute.",
    "The captain's account was read at court and copied by cosmographers for generations.",
    "The estate bears my family's name. No creditor will erase it while I can command a deck.",
    "The recovered estate became prosperous, and its chapel kept a model of the captain's final ship."
  ),
  ottoman: story(
    "The imperial mapmakers know the inland seas. I will bring them an account of the whole turning world.",
    "The captain's charts entered an imperial collection and guided merchants far beyond the Mediterranean.",
    "Our courtyard, orchard, and family rooms are more than a line in a debt book.",
    "The family home was restored around a fine courtyard, where sailors and scholars were always welcome."
  ),
  arabic: story(
    "The old geographers measured the world with patience. I would add what a sailor's own eyes can prove.",
    "The captain's geography was copied from Aden to Alexandria and discussed by generations of navigators.",
    "My family's house and date garden will not be sold while I can still follow the monsoon.",
    "The household's trade recovered, and its shaded reception room filled with maps and travelers' stories."
  ),
  persian: story(
    "Poets have imagined every marvel. I want to learn which wonders are stranger than poetry.",
    "The captain retired among books and gardens, with an atlas celebrated by merchants and poets alike.",
    "The garden and house carry my family's memory. I will not yield them to a creditor.",
    "The restored garden became famous for welcoming scholars, merchants, and returned sailors."
  ),
  southAsian: story(
    "Merchants speak of every coast the monsoon touches. I mean to follow their stories beyond the familiar routes.",
    "The captain's charts became prized in counting houses across the Indian Ocean.",
    "Our house and warehouse were built by generations of careful trade. One disastrous account will not end them.",
    "The family counting house reopened without debt and prospered through fair trade."
  ),
  nahua: story(
    "Our painted books remember cities and rulers. I will make one that remembers the shape and wonders of the seas.",
    "The captain's painted atlas preserved distant lands in brilliant color for generations.",
    "Our household land binds the living to our ancestors. I will not let a creditor break that bond.",
    "The family lands supported a thriving household, and the voyage was preserved in a painted book."
  ),
  polynesian: story(
    "My teachers gave me the stars, swells, and flights of birds. I will carry that knowledge to shores beyond our oldest routes.",
    "The captain taught a new generation of wayfinders, joining distant islands in memory and song.",
    "Land belongs to the family stories tied to it. I will cross every sea before I let debt cut those ties.",
    "The family lands remained whole, and the captain's voyages became part of their descendants' recitations."
  ),
  westAfrican: story(
    "Caravans bring stories from the north, and ships bring stories from the horizon. I will test both against the world itself.",
    "The captain's house became a meeting place for navigators, scholars, and merchants from many coasts.",
    "Our family compound has sheltered generations. I will not let a creditor empty it.",
    "The family compound prospered again and became known for its hospitality to travelers."
  ),
  eastAfrican: story(
    "The monsoon carries a hundred languages into our harbors. I will follow it until every rumor has a place on my chart.",
    "The captain's charts were copied along the Swahili coast and carried on monsoon voyages for generations.",
    "Our coral-stone house faces the sea because my family earned that place. I will earn it again.",
    "The sea-facing house was restored, and its carved door welcomed merchants from across the ocean."
  ),
  nordic: story(
    "The old sagas sailed west and vanished into rumor. I would bring back bearings, distances, and names.",
    "The captain's voyages entered northern chronicles beside the oldest sea sagas.",
    "The farm has endured darker winters than this debt. I will not be the one who loses it.",
    "The farm prospered, and winter evenings were spent retelling voyages beside a well-fed hearth."
  ),
  maritime: story(
    "Every sailor inherits a world half chart and half rumor. I intend to learn which half is true.",
    "The captain's atlas guided generations of sailors and scholars.",
    "My family built that home over generations. I will not be the one who surrenders it.",
    "The estate prospered again and became a welcoming home for sailors returned from distant seas."
  )
});

const FAMILY_DEBT_ORIGINS_BY_FACTION = Object.freeze({
  england: debtOrigin(
    "The duke's fall made many signatures expensive. Yours among them.",
    "Our name was entered in his household books. When he fell, every old favor became a charge and every guarantee became ours."
  ),
  scotland: debtOrigin(
    "Flodden left Scotland short of heirs and long on unpaid accounts. Yours survived nicely.",
    "We furnished horses and grain for the army that crossed the Tweed. The men did not return, but every lender did."
  ),
  france: debtOrigin(
    "Marignano made the king glorious. It made your family available to me.",
    "We provisioned the march into Lombardy on sealed promises. Victory came home; payment did not."
  ),
  spain: debtOrigin(
    "Villalar settled the Comuneros' quarrel. It also settled your estate beneath my seal.",
    "Our seal was found in their account book. The Crown took the land, and the lender kept the note."
  ),
  portugal: debtOrigin(
    "Goa enriched the Crown. Your missing carrack enriched my ledger.",
    "We fitted that carrack for the taking of Goa, then borrowed again when its cargo failed to return."
  ),
  hormuz: debtOrigin(
    "The Portuguese fortress remained after your island's revolt. So did every note your family signed to provision it.",
    "We backed the men who tried to cast the Portuguese from Hormuz. Their rising failed, and the cost of surviving it became this debt."
  ),
  "burgundian-netherlands": debtOrigin(
    "The Emperor's purse drew upon Antwerp and Augsburg alike. Your father's bond was drawn upon the nearer countinghouse.",
    "He advanced silver upon the Emperor's seal. Great lords kept their promises to one another; our house kept the debt."
  ),
  habsburg: debtOrigin(
    "Ferdinand's new household required old Austrian obligations to be reckoned anew. Yours was reckoned in full.",
    "We furnished horses and plate when the archduke took up the Austrian government. The court changed hands; the lender's seal did not."
  ),
  hungary: debtOrigin(
    "Belgrade fell. Your quartermaster fled. My claim remained.",
    "We mortgaged the estate to provision the fortress. The receipts vanished with the man who signed them."
  ),
  bohemia: imperialDebtOrigin("Bohemia"),
  mainz: imperialDebtOrigin("Mainz"),
  "cologne-electorate": imperialDebtOrigin("the Cologne Electorate"),
  trier: imperialDebtOrigin("Trier"),
  palatinate: imperialDebtOrigin("the Palatinate"),
  "electoral-saxony": imperialDebtOrigin("Electoral Saxony"),
  brandenburg: imperialDebtOrigin("Brandenburg"),
  "ducal-saxony": imperialDebtOrigin("Ducal Saxony"),
  liege: imperialDebtOrigin("Liege"),
  magdeburg: imperialDebtOrigin("Magdeburg"),
  utrecht: imperialDebtOrigin("Utrecht"),
  "cleves-mark": imperialDebtOrigin("Cleves-Mark"),
  calenberg: imperialDebtOrigin("Calenberg"),
  augsburg: imperialDebtOrigin("Augsburg"),
  cologne: imperialDebtOrigin("Cologne"),
  nuremberg: imperialDebtOrigin("Nuremberg"),
  lubeck: imperialDebtOrigin("Lubeck"),
  hamburg: imperialDebtOrigin("Hamburg"),
  bremen: imperialDebtOrigin("Bremen"),
  speyer: imperialDebtOrigin("Speyer"),
  regensburg: imperialDebtOrigin("Regensburg"),
  worms: imperialDebtOrigin("Worms"),
  metz: imperialDebtOrigin("Metz"),
  ottoman: debtOrigin(
    "Your family chose a prince poorly. I chose collateral better.",
    "We backed him before the old Sultan yielded the throne. The victor spared our lives, but not our property."
  ),
  venice: debtOrigin(
    "The Republic calls its demands forced loans. I prefer to call mine enforceable.",
    "Venice called for one loan after another while the mainland burned. Cambrai ended; our obligations did not."
  ),
  genoa: debtOrigin(
    "Genoa may change masters again. This deed will not.",
    "Our warehouse was pledged under one lord and seized when the next banner rose. The ink never had time to dry."
  ),
  florence: debtOrigin(
    "Florence may debate liberty and the Medici in every hall. This bond admits no faction.",
    "Our house advanced silver while Cardinal Giulio's men reordered the government. The magistrates changed; the seal remained."
  ),
  "papal-states": debtOrigin(
    "His Holiness's treasury forgot its wagons. Mine remembers every creditor.",
    "We supplied the army sent against Urbino. Rome exhausted its treasury before it settled our account."
  ),
  hospitallers: debtOrigin(
    "The Grand Master's walls may withstand Suleiman. Your mortgage has no such confidence.",
    "We pledged the estate to provision Rhodes before the siege. Powder, grain, and timber reached the harbor; repayment did not."
  ),
  ming: debtOrigin(
    "The court struck your uncle from the rebels' roll. It did not strike your family seal from this note.",
    "His name appeared among the Prince of Ning's papers. Proving his innocence cost the family nearly everything."
  ),
  inca: debtOrigin(
    "Imperial tallies are excellent promises, provided one does not need payment.",
    "The northern campaign took our llamas, grain, and sons. The tallies came back honored; the goods did not."
  ),
  safavid: debtOrigin(
    "Chaldiran scattered armies and caravans. Your debt alone kept formation.",
    "Our finest caravan was in Tabriz when the western army entered. We borrowed before learning none would return."
  ),
  muscovy: debtOrigin(
    "Smolensk changed hands. This deed did not.",
    "We fitted wagons and horses for the long siege. The court's promise of payment proved less durable than the fortress."
  ),
  kazan: debtOrigin(
    "The khan rode against Moscow and returned with glory. Your family's account returned unpaid.",
    "We supplied horses and grain for Sahib Giray's campaign. The spoils passed to greater hands before our wagons came home."
  ),
  crimea: debtOrigin(
    "The khan returned from Moscow with captives and glory. Your family's wagons returned empty.",
    "We provisioned the great raid of 1521 on promises of a share. The court celebrated; its suppliers were left to their creditors."
  ),
  wallachia: debtOrigin(
    "Princes change in Targoviste. A sealed debt survives every throne.",
    "Our house provisioned one claimant before another took the princely seat. The claimant fled; his creditors found us."
  ),
  moldavia: debtOrigin(
    "Moldavia pays tribute southward. Your family may begin by paying what it owes here.",
    "We supplied horses and grain when the frontier rose in alarm. The court settled with the Sultan before it settled with us."
  ),
  ragusa: debtOrigin(
    "Ragusa pays for peace with every great power. Your family merely added one more payment.",
    "We guaranteed a caravan under the Republic's seal. Its cargo vanished inland, while the guarantee returned to our door."
  ),
  hejaz: debtOrigin(
    "Pilgrims bring coin to Jeddah. None of it cancels your father's bond.",
    "We fitted ships to guard the pilgrim road when new masters came from Egypt. The service ended; its loans did not."
  ),
  "poland-lithuania": debtOrigin(
    "The Prussian truce rested the cavalry. It did nothing for their guarantors.",
    "We raised that cavalry on a royal warrant. Peace came before the treasury found our name."
  ),
  sweden: debtOrigin(
    "The regent has found credit in Lubeck. Your family found it here, at a less patriotic rate.",
    "We pledged our iron and timber to provision the rising. The Danish bailiff took the cargo; the note survived him."
  ),
  "denmark-norway": debtOrigin(
    "Stockholm yielded more readily than your royal paymaster.",
    "We mortgaged the farm to outfit the king's ships. The payment vanished into court quarrels."
  ),
  songhai: debtOrigin(
    "Agadez sends tribute to Gao. None of it bears your family's mark.",
    "We advanced salt, grain, and camels for Askia's march. Not one cowrie of the tribute reached our house."
  ),
  morocco: debtOrigin(
    "Azemmour cost your family twice: once to Portugal, once to me.",
    "Our warehouses stood there when the Portuguese came. We ransomed kin, rebuilt inland, and signed your terms."
  ),
  ethiopia: debtOrigin(
    "Mahfuz is gone. The notes signed during his raids are not.",
    "We borrowed to replace burned herds, then borrowed once more to arm the men who finally stopped him."
  ),
  vijayanagara: debtOrigin(
    "Raichur's victory procession was splendid. I noticed your paymaster absent from it.",
    "We bought Arabian horses for that campaign. Victory passed our door; payment did not."
  ),
  gujarat: debtOrigin(
    "Diu kept its walls free of Portugal. Your estate was less fortunate with me.",
    "We financed ships to make that refusal credible. The ships were lost; the refusal was not."
  ),
  bengal: debtOrigin(
    "Chittagong changed hands enough. Your estate need only change hands once.",
    "Our ships were caught in the fighting. By the time the port was ours again, three rulers claimed the cargo."
  ),
  delhi: debtOrigin(
    "Ibrahim forgot many of Jalal's friends. Your kinsman's guarantee was not among them.",
    "He guaranteed a noble who chose Jalal when the old Sultan died. Ibrahim took the noble's lands; the guarantee survived."
  ),
  mughal: debtOrigin(
    "Babur won Delhi with cannon. Your family debt survived the field without firing a shot.",
    "We supplied men who joined Babur before Panipat. They came home with honors; their unpaid account reached Delhi first."
  ),
  ayutthaya: debtOrigin(
    "Malacca lost a warehouse. I acquired excellent security.",
    "The warehouse was ours until the Portuguese took the city. It disappeared, but its bills crossed the sea intact."
  ),
  ternate: debtOrigin(
    "Cloves drew the Portuguese to your shore. Your family mistook their appetite for a guarantee.",
    "We provisioned the alliance my father welcomed, then borrowed again when its promises soured. The cloves sold; our account did not."
  ),
  tidore: debtOrigin(
    "Castilian sails brought Sultan al-Mansur promises. Your family accepted their drafts as though promises were silver.",
    "We provisioned the strangers who swore friendship against Ternate and Portugal. Their ships departed lighter; our house kept the weight."
  ),
  japan: debtOrigin(
    "The Hosokawa changed sides. The terms of this note did not.",
    "Our house backed the wrong side at Funaokayama. The survivors changed allegiance; our creditors changed the seal."
  ),
  hosokawa: debtOrigin(
    "Kyoto's offices reward a quick change of allegiance. Creditors prefer consistency.",
    "Our house financed Takakuni's return to power. His victory restored the council, but not our purse."
  ),
  ouchi: debtOrigin(
    "Yamaguchi can imitate Kyoto in every art except forgiving a debt.",
    "We equipped an Ouchi expedition eastward. The army returned with honors and left us its accounts."
  ),
  shimazu: debtOrigin(
    "Satsuma's divided branches agree on at least one thing: your bond is valid.",
    "We pledged the estate during the Shimazu succession quarrel. Peace changed the lord, not the lender."
  ),
  so: debtOrigin(
    "Tsushima lives between two courts. Your debt found recognition in both.",
    "We financed licensed trade with Joseon after the Three Ports rising. The permits returned; the cargo did not."
  ),
  shoni: debtOrigin(
    "The Ouchi press into northern Kyushu. I merely press this claim.",
    "Our family provisioned the Shoni defense against Yamaguchi. Defeat consumed the stores and spared the mortgage."
  ),
  nagao: debtOrigin(
    "Echigo's governor and deputy may dispute authority. Neither disputes my seal.",
    "We backed the Nagao campaigns that made Kasugayama powerful. Soldiers were paid before suppliers."
  ),
  ando: debtOrigin(
    "Hiyama grows rich on northern trade. Your family managed to owe money on every voyage.",
    "We advanced rice and iron for the Ezo trade. One bad season turned an account into an inheritance."
  ),
  kakizaki: debtOrigin(
    "Kaminokuni stands by trade and Ando favor. Your bond enjoys firmer foundations.",
    "We borrowed to fortify the southern Ezo settlements and bargain for peace. The peace held longer than our purse."
  ),
  ryukyu: debtOrigin(
    "Naha's tribute ships return laden from China. Yours returned with this note.",
    "We financed a voyage from Shuri to Fujian. Storms took the cargo, but the court tally still named our house."
  ),
  ainu: debtOrigin(
    "The southern traders remember every iron blade they advanced. They remember your household best.",
    "We borrowed iron and rice against the next season's catch. The fish ran thin, and the account grew fat."
  ),
  joseon: debtOrigin(
    "The court erased a reformer's office. It left the family obligations untouched.",
    "A cousin signed their memorials before the purge. Saving the clan lands cost everything else."
  )
});

const EXPLORER_PATRON_OUTLOOKS_BY_FACTION = Object.freeze({
  england: "Cabot's western landfall brought Bristol questions, not answers. I mean to know what lies beyond it.",
  scotland: "The Great Michael is gone to France, and with it our court's boldest seaward ambition. I would see Scottish sails look outward again.",
  france: "Breton and Norman fishermen return from western banks with coastlines no court map agrees upon. I want a true one.",
  spain: "Columbus found a western world, and Balboa another ocean beyond it. Court boasts are plentiful; reliable accounts are not.",
  portugal: "Our pilots have rounded Africa and reached India and Malacca, yet the Crown keeps each chart close. I want the world considered as one.",
  hormuz: "Portuguese cannon commands our strait, but Hormuzi merchants still know every Gulf harbor worth naming. I want their knowledge carried beyond another empire's fortress.",
  "burgundian-netherlands": "Bruges and Gent hear sailors speak of western coasts and southern passages. I would have their reckonings gathered before another court locks them away.",
  habsburg: "Ferdinand's court looks east along the Danube, yet the merchants of Vienna hear news from every sea. I would see their scattered reports made into one true chart.",
  hungary: "Belgrade's fall has narrowed every gaze to the frontier. That is precisely when someone must remember the world is larger.",
  bohemia: imperialExplorerOutlook("Bohemia"),
  mainz: imperialExplorerOutlook("Mainz"),
  "cologne-electorate": imperialExplorerOutlook("the Cologne Electorate"),
  trier: imperialExplorerOutlook("Trier"),
  palatinate: imperialExplorerOutlook("the Palatinate"),
  "electoral-saxony": imperialExplorerOutlook("Electoral Saxony"),
  brandenburg: imperialExplorerOutlook("Brandenburg"),
  "ducal-saxony": imperialExplorerOutlook("Ducal Saxony"),
  liege: imperialExplorerOutlook("Liege"),
  magdeburg: imperialExplorerOutlook("Magdeburg"),
  utrecht: imperialExplorerOutlook("Utrecht"),
  "cleves-mark": imperialExplorerOutlook("Cleves-Mark"),
  calenberg: imperialExplorerOutlook("Calenberg"),
  augsburg: imperialExplorerOutlook("Augsburg"),
  cologne: imperialExplorerOutlook("Cologne"),
  nuremberg: imperialExplorerOutlook("Nuremberg"),
  lubeck: imperialExplorerOutlook("Lubeck"),
  hamburg: imperialExplorerOutlook("Hamburg"),
  bremen: imperialExplorerOutlook("Bremen"),
  speyer: imperialExplorerOutlook("Speyer"),
  regensburg: imperialExplorerOutlook("Regensburg"),
  worms: imperialExplorerOutlook("Worms"),
  metz: imperialExplorerOutlook("Metz"),
  ottoman: "Piri Reis set western discoveries beside eastern charts. His map proves no court owns all useful knowledge.",
  venice: "The Portuguese ocean road drains spice from our galleys. I would learn the routes reshaping Venice before they finish doing so.",
  genoa: "A Genoese sailor crossed the western ocean beneath Castile's flag. The next great account should not leave our harbor under another name.",
  florence: "Florentine presses multiply every doubtful voyage into ten confident accounts. Bring me observations fit to survive the argument.",
  "papal-states": "Reports from lands beyond the Atlantic reach Rome mixed with conversion, gold, and boasting. I want an account concerned first with truth.",
  hospitallers: "Rhodes hears every rumor passing between Christendom and the Levant. I want the Order to possess knowledge no siege can consume.",
  ming: "The court lets Admiral Zheng's sea roads fade because no treasure fleet now follows them. I do not share that lack of curiosity.",
  inca: "The Sapa Inca's roads bind mountains beyond counting, yet every official map stops at the sea. Mine need not.",
  safavid: "Ottoman armies close one road and Portuguese cannon command another at Hormuz. Knowledge may reveal a third.",
  muscovy: "Novgorod's merchants know the Baltic by price and rumor. I want bearings that reach beyond their counting houses.",
  kazan: "The Volga brings merchants from Muscovy, Persia, and the steppe, each with a different world in his telling. Set their roads upon one chart.",
  crimea: "Ottoman galleys hold the southern coast while our riders know the northern steppe. I want a Crimean chart of the seas between and beyond them.",
  wallachia: "The Danube carries Ottoman, Hungarian, and Black Sea news past our shore. I want to know the waters beyond their quarrels.",
  moldavia: "Merchants reach us from the Black Sea and Poland with maps that agree on very little. Bring me a captain's evidence.",
  ragusa: "Our republic lives by knowing every harbor between east and west. I want that knowledge to reach beyond the Adriatic.",
  hejaz: "Pilgrims reach Jeddah from seas our own pilots seldom cross. I want their scattered routes joined into one true chart.",
  "poland-lithuania": "Danzig hears of western lands and eastern seas from a dozen tongues. I want one captain's measured account.",
  sweden: "Gustav Eriksson buys ships to break the Union, but a free kingdom will need charts as much as cannon. I would have Sweden look beyond this war.",
  "denmark-norway": "Our sagas remember western shores, while the king's ships fight over Sweden. I would rather recover the horizon than another crown.",
  songhai: "Timbuktu gathers the world in books and Gao in caravans. I want the Atlantic to answer what neither can.",
  morocco: "Portuguese forts advance along our coast as if the ocean belongs to them. A true chart is one way to dispute that claim.",
  ethiopia: "Envoys from Portugal have crossed half the world to reach our court. I mean to understand the world they crossed.",
  vijayanagara: "Portuguese horses and gunners arrive through Goa carrying news of seas beyond Arabia. I want knowledge without their price.",
  gujarat: "Diu hears every sea language, while Portuguese cannon tries to decide which routes remain open. A chart is another kind of defense.",
  bengal: "Portuguese sails have reached Chittagong, bringing maps as uncertain as their intentions. We should know more than our visitors.",
  delhi: "Caravans describe oceans beyond Gujarat and Bengal, each story altered by ten merchants. I want one witness.",
  mughal: "Babur has won a new empire, but its maps still end where caravan reports begin. Bring Agra a captain's account of the seas.",
  ayutthaya: "The Portuguese arrived after taking Malacca and now speak of seas beyond Africa. I would hear the world without their interpreter.",
  ternate: "Portuguese stone rises beside our clove groves while Castilian sails favor Tidore. I want a Ternatan account of the world both crowns claim.",
  tidore: "Castilian survivors reached our island with tales of an ocean beyond the Moluccas, while Portugal arms Ternate. I want a Tidorese account no foreign crown can keep from us.",
  japan: "Ming merchants and island pilots carry fragments of distant coasts. I want them joined before rumor distorts them further.",
  hosokawa: "Sakai's merchants see farther than Kyoto's courtiers. I want their scattered routes made into one useful chart.",
  ouchi: "Yamaguchi receives scholars, merchants, and Ming envoys. Their maps ought to meet before their quarrels do.",
  shimazu: "Satsuma faces the southern islands and the routes beyond them. I want a chart worthy of that horizon.",
  so: "Tsushima pilots cross between Japan and Joseon as others cross a harbor. Show me where those roads lead beyond both courts.",
  shoni: "Hakata hears news from every shore of the eastern sea. I want measured bearings instead of a merchant's boast.",
  nagao: "The Sea of Japan brings northern pilots and western traders to Echigo. Join their coastlines into one account.",
  ando: "Our ships trade from Dewa into Ezo while southern maps fade into rumor. Carry northern knowledge around the world.",
  kakizaki: "Kaminokuni looks north into Ainu waters and south toward Japan. Sail far enough to place both on one honest chart.",
  ryukyu: "Naha receives ships from China, Japan, Korea, and the southern seas. Shuri should possess a chart worthy of that crossroads.",
  ainu: "Southern traders know one coast and our fishers another. Sail far enough to show how all those waters join.",
  joseon: "Our old world maps reach far beyond Joseon, but copied names are not witnessed places. A captain can test what scholars inherited."
});

assertExactKeys(
  "family debt faction origins",
  Object.keys(FAMILY_DEBT_ORIGINS_BY_FACTION),
  SOVEREIGN_FACTION_IDS
);
assertExactKeys(
  "explorer patron faction outlooks",
  Object.keys(EXPLORER_PATRON_OUTLOOKS_BY_FACTION),
  SOVEREIGN_FACTION_IDS
);

function story(explorerIntro, explorerOutro, debtIntro, debtOutro) {
  return Object.freeze({ explorerIntro, explorerOutro, debtIntro, debtOutro });
}

function debtOrigin(creditor, player) {
  if (typeof creditor !== "string" || creditor.trim() === "") {
    throw new Error("Family debt origin requires creditor dialogue");
  }
  if (typeof player !== "string" || player.trim() === "") {
    throw new Error("Family debt origin requires player dialogue");
  }
  return Object.freeze({ creditor, player });
}

function imperialDebtOrigin(polityName) {
  return debtOrigin(
    `Assessors may quarrel over ${polityName}'s levy until Candlemas. Your bond fell due at Michaelmas.`,
    `My house furnished wagons and pay for ${polityName}'s levy. Their reckoning stalled; the lender's tally did not.`
  );
}

function imperialExplorerOutlook(polityName) {
  return `${polityName}'s merchants bring me one coast in ink and three in boasts. Bring me soundings, bearings, and shores set down by your own hand.`;
}

function assertExactKeys(label, actualKeys, expectedKeys) {
  const actual = [...actualKeys].sort();
  const expected = [...expectedKeys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new Error(`${label} must exactly cover: ${expected.join(", ")}`);
  }
}

function personalEnding(character, variant, hasRomance = false) {
  const pronouns = characterPronouns(character, { capitalizeSubject: true });
  const endings = [
    hasRomance
      ? `${pronouns.subject} filled ${pronouns.possessiveDeterminer} home with charts and loud stories of the sea.`
      : `${pronouns.subject} later married and filled ${pronouns.possessiveDeterminer} home with children, charts, and loud stories of the sea.`,
    `${pronouns.subject} never stopped traveling entirely, but every later voyage ended at a home chosen freely.`,
    `${pronouns.subject} trained young captains and lived long enough to see them return with discoveries of their own.`,
    `${pronouns.subject} spent later years writing a plain account of the voyage, which became far more famous than intended.`
  ];
  return endings[variant];
}

function step(speaker, expressionId, text, topic = null) {
  return Object.freeze({ speaker, expressionId, text, ...(topic === null ? {} : { topic }) });
}

function seededGoalType(identityKey, campaignStartsByGoal = {}) {
  const weights = campaignGoalSelectionWeights(campaignStartsByGoal);
  const totalWeight = CAMPAIGN_GOAL_TYPE_IDS.reduce((total, type) => total + weights[type], 0);
  let roll = hashString32(`${identityKey}|campaign-goal`) % totalWeight;
  for (const type of CAMPAIGN_GOAL_TYPE_IDS) {
    if (roll < weights[type]) return type;
    roll -= weights[type];
  }
  throw new Error("Campaign goal weighting did not select a goal");
}

function validateExplorerGoal(goal) {
  if (!Array.isArray(goal.reportedDiscoveryIds) || new Set(goal.reportedDiscoveryIds).size !== goal.reportedDiscoveryIds.length) {
    throw new Error("Explorer goal has invalid reported discoveries");
  }
  if (goal.reportedDiscoveryIds.some((id) => typeof id !== "string" || id === "")) {
    throw new Error("Explorer reported discovery ids must be non-empty strings");
  }
  if (goal.currentLeadDiscoveryId !== null && (typeof goal.currentLeadDiscoveryId !== "string" || goal.currentLeadDiscoveryId === "")) {
    throw new Error("Explorer lead must be null or a discovery id");
  }
  if (!Number.isInteger(goal.totalWonderCount) || goal.totalWonderCount < 0) {
    throw new Error(`Invalid explorer wonder count: ${goal.totalWonderCount}`);
  }
}

function assertCampaignDialogueSession(session) {
  if (!session || session.kind !== "campaign-goal") throw new Error("Missing campaign dialogue session");
  if (!Array.isArray(session.steps) || session.steps.length === 0) throw new Error("Campaign dialogue has no steps");
  if (!Number.isInteger(session.stepIndex) || session.stepIndex < 0 || session.stepIndex >= session.steps.length) {
    throw new Error(`Invalid campaign dialogue step: ${session.stepIndex}`);
  }
  if (session.companionCharacter !== null && session.companionCharacter !== undefined) {
    assertPerson(session.companionCharacter);
  }
  const participantCharacters = session.participantCharacters || [];
  if (!Array.isArray(participantCharacters)) {
    throw new Error("Campaign dialogue participants must be an array");
  }
  const participantIds = new Set();
  for (const character of participantCharacters) {
    assertPerson(character);
    if (participantIds.has(character.id)) {
      throw new Error(`Duplicate campaign dialogue participant: ${character.id}`);
    }
    participantIds.add(character.id);
  }
  validateDialogueStep(
    session.steps[session.stepIndex],
    session.companionCharacter || null,
    participantIds
  );
}

function validateDialogueStep(entry, companionCharacter = null, participantIds = new Set()) {
  if (!entry || !["player", "contact", "companion", "participant"].includes(entry.speaker)) {
    throw new Error(`Invalid campaign dialogue speaker: ${entry?.speaker}`);
  }
  if (entry.speaker === "companion" && !companionCharacter) {
    throw new Error("Campaign companion dialogue requires a named crewmate");
  }
  if (entry.speaker === "participant" && !participantIds.has(entry.participantId)) {
    throw new Error(`Campaign dialogue participant is missing: ${entry.participantId}`);
  }
  if (entry.listenerParticipantId !== undefined && !participantIds.has(entry.listenerParticipantId)) {
    throw new Error(`Campaign dialogue listener is missing: ${entry.listenerParticipantId}`);
  }
  if (typeof entry.expressionId !== "string" || entry.expressionId === "") {
    throw new Error("Campaign dialogue requires an expression");
  }
  if (typeof entry.text !== "string" || entry.text.trim() === "") {
    throw new Error("Campaign dialogue requires text");
  }
  if (entry.topic !== undefined && (typeof entry.topic !== "string" || entry.topic.trim() === "")) {
    throw new Error("Campaign dialogue topic must be a non-empty string");
  }
}

function campaignDialogueSpeaker(session, entry, playerCharacter, contactCharacter) {
  if (entry.speaker === "player") return playerCharacter;
  if (entry.speaker === "contact") return contactCharacter;
  if (entry.speaker === "companion") {
    if (!session.companionCharacter) throw new Error("Campaign dialogue lost its companion character");
    return session.companionCharacter;
  }
  const participant = session.participantCharacters?.find(({ id }) => id === entry.participantId);
  if (!participant) throw new Error(`Campaign dialogue lost participant: ${entry.participantId}`);
  return participant;
}

function campaignGoalDefinition(type) {
  const definition = CAMPAIGN_GOAL_DEFINITIONS[type];
  if (!definition) throw new Error(`Unknown campaign goal type: ${type}`);
  return definition;
}

function validateFamilyDebtGoal(goal) {
  if (!Number.isFinite(goal.debtBalance) || goal.debtBalance < 0) {
    throw new Error(`Invalid family debt balance: ${goal.debtBalance}`);
  }
  if (!Number.isFinite(goal.annualInterestRate) || goal.annualInterestRate <= 0) {
    throw new Error(`Invalid family debt interest: ${goal.annualInterestRate}`);
  }
  assertSimulationMinute(goal.lastAccruedMinute);
  if (!Number.isInteger(goal.protectedPurse) || goal.protectedPurse < 0) {
    throw new Error(`Invalid protected purse: ${goal.protectedPurse}`);
  }
  if (!Number.isInteger(goal.totalPaid) || goal.totalPaid < 0) {
    throw new Error(`Invalid family debt payments: ${goal.totalPaid}`);
  }
}

function validateWhiteWhaleGoal(goal) {
  if (goal.whiteWhaleId !== WHITE_WHALE_ID) {
    throw new Error(`White whale campaign targets an unknown individual: ${goal.whiteWhaleId}`);
  }
  if (typeof goal.whiteWhaleKilled !== "boolean") throw new Error("White whale goal requires kill state");
  if (goal.whiteWhaleKilledMinute !== null) assertSimulationMinute(goal.whiteWhaleKilledMinute);
  if (goal.whiteWhaleKilled !== (goal.whiteWhaleKilledMinute !== null)) {
    throw new Error("White whale kill state and time disagree");
  }
  if (goal.sighting !== null) {
    if (!Number.isFinite(goal.sighting.latitudeDeg) || !Number.isFinite(goal.sighting.longitudeDeg)) {
      throw new Error("White whale sighting has invalid coordinates");
    }
    if (typeof goal.sighting.reached !== "boolean" ||
      typeof goal.sighting.interactionKey !== "string" || goal.sighting.interactionKey === "") {
      throw new Error("White whale sighting has invalid state");
    }
  }
  if (!Array.isArray(goal.checkedInteractionIds) ||
    goal.checkedInteractionIds.some((value) => typeof value !== "string" || value === "")) {
    throw new Error("White whale goal has invalid checked interactions");
  }
  if (new Set(goal.checkedInteractionIds).size !== goal.checkedInteractionIds.length) {
    throw new Error("White whale goal has duplicate checked interactions");
  }
}

function compassDirection(fromLatDeg, fromLonDeg, toLatDeg, toLonDeg) {
  const fromLat = fromLatDeg * Math.PI / 180;
  const toLat = toLatDeg * Math.PI / 180;
  const deltaLon = (toLonDeg - fromLonDeg) * Math.PI / 180;
  const y = Math.sin(deltaLon) * Math.cos(toLat);
  const x = Math.cos(fromLat) * Math.sin(toLat) -
    Math.sin(fromLat) * Math.cos(toLat) * Math.cos(deltaLon);
  const bearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  const directions = ["north", "northeast", "east", "southeast", "south", "southwest", "west", "northwest"];
  return directions[Math.round(bearing / 45) % directions.length];
}

function assertCharacter(character) {
  assertPerson(character);
  if (!Number.isInteger(character.homePortTileId) || character.homePortTileId < 0) {
    throw new Error("Campaign character requires a home port");
  }
}

function assertPerson(character) {
  if (!character || typeof character !== "object" || typeof character.id !== "string" || character.id === "") {
    throw new Error("Campaign dialogue requires a character identity");
  }
  if (typeof character.name !== "string" || character.name.trim() === "") {
    throw new Error("Campaign dialogue character requires a name");
  }
}

function assertSimulationMinute(value) {
  if (!Number.isFinite(value) || value < 0) throw new Error(`Invalid simulation minute: ${value}`);
}

function formatDoubloons(value) {
  return Math.round(value).toLocaleString("en-US");
}

function hashString32(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);
  hash ^= hash >>> 16;
  return hash >>> 0;
}
