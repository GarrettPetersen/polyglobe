import { explorerReportDialogueForDiscovery } from "./explorerDiscoveryDialogue.js";
import { FACTIONS, NEUTRAL_FACTION_ID, PIRATE_FACTION_ID } from "./factions.js";
import { greatCircleDistanceKm, MAX_GREAT_CIRCLE_DISTANCE_KM } from "./worldDistance.js";
import { WHITE_WHALE_ID } from "./whaleSpecies.js";

export const CAMPAIGN_GOAL_VERSION = 1;
export const CAMPAIGN_GOAL_EXPLORER = "explorer";
export const CAMPAIGN_GOAL_FAMILY_DEBT = "family-debt";
export const CAMPAIGN_GOAL_WHITE_WHALE = "white-whale-revenge";
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

const MINUTES_PER_DAY = 24 * 60;
const DAYS_PER_YEAR = 365.25;
const CAMPAIGN_GOAL_TYPES = new Set([
  CAMPAIGN_GOAL_EXPLORER,
  CAMPAIGN_GOAL_FAMILY_DEBT,
  CAMPAIGN_GOAL_WHITE_WHALE
]);
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
  const base = {
    version: CAMPAIGN_GOAL_VERSION,
    type: selectedType,
    status: CAMPAIGN_GOAL_ACTIVE,
    homePortTileId: playerCharacter.homePortTileId,
    introSeen: false,
    endingVariant: hashString32(`${playerCharacter.id}|campaign-ending`) % 4
  };
  const goal = selectedType === CAMPAIGN_GOAL_EXPLORER
    ? {
        ...base,
        reportedDiscoveryIds: [],
        currentLeadDiscoveryId: null,
        totalWonderCount: 0
      }
    : selectedType === CAMPAIGN_GOAL_FAMILY_DEBT ? {
        ...base,
        debtBalance: FAMILY_DEBT_PRINCIPAL,
        annualInterestRate: FAMILY_DEBT_ANNUAL_RATE,
        lastAccruedMinute: startMinute,
        protectedPurse: FAMILY_DEBT_PROTECTED_PURSE,
        totalPaid: 0
      }
    : {
        ...base,
        whiteWhaleId: WHITE_WHALE_ID,
        whiteWhaleKilled: false,
        whiteWhaleKilledMinute: null,
        sighting: null,
        checkedInteractionIds: []
      };
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
  if (goal.type === CAMPAIGN_GOAL_EXPLORER) validateExplorerGoal(goal);
  else if (goal.type === CAMPAIGN_GOAL_FAMILY_DEBT) validateFamilyDebtGoal(goal);
  else validateWhiteWhaleGoal(goal);
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
  validateCampaignGoal(goal);
  if (goal.status !== CAMPAIGN_GOAL_ACTIVE) return null;
  if (goal.type === CAMPAIGN_GOAL_EXPLORER) {
    if (!(discoveredIds instanceof Set)) {
      throw new Error("Explorer destination requires discovered ids");
    }
    if (goal.currentLeadDiscoveryId === null) return null;
    return discoveredIds.has(goal.currentLeadDiscoveryId)
      ? {
          kind: CAMPAIGN_DESTINATION_HOME,
          homePortTileId: goal.homePortTileId,
          reason: "report-discovery"
        }
      : {
          kind: CAMPAIGN_DESTINATION_DISCOVERY,
          discoveryId: goal.currentLeadDiscoveryId
        };
  }

  if (goal.type === CAMPAIGN_GOAL_WHITE_WHALE) {
    if (goal.whiteWhaleKilled) {
      return {
        kind: CAMPAIGN_DESTINATION_HOME,
        homePortTileId: goal.homePortTileId,
        reason: "return-after-white-whale"
      };
    }
    if (!goal.sighting || goal.sighting.reached) return null;
    return {
      kind: CAMPAIGN_DESTINATION_WHITE_WHALE_SIGHTING,
      latitudeDeg: goal.sighting.latitudeDeg,
      longitudeDeg: goal.sighting.longitudeDeg,
      reason: "white-whale-last-seen"
    };
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
    ? {
        kind: CAMPAIGN_DESTINATION_HOME,
        homePortTileId: goal.homePortTileId,
        reason: "pay-family-debt",
        requiredDoubloons: payoff.requiredDoubloons
      }
    : null;
}

export function familyDebtPayoffProjection(goal, currentMinute, additionalDays = 0) {
  validateCampaignGoal(goal);
  if (goal.type !== CAMPAIGN_GOAL_FAMILY_DEBT) {
    throw new Error("Debt payoff projection requires a family-debt goal");
  }
  assertSimulationMinute(currentMinute);
  if (currentMinute < goal.lastAccruedMinute) {
    throw new Error(`Campaign debt cannot project backwards: ${currentMinute} < ${goal.lastAccruedMinute}`);
  }
  if (!Number.isFinite(additionalDays) || additionalDays < 0) {
    throw new Error(`Invalid family debt projection days: ${additionalDays}`);
  }
  const elapsedDays = (currentMinute - goal.lastAccruedMinute) / MINUTES_PER_DAY + additionalDays;
  const projectedBalance = goal.debtBalance * Math.pow(
    1 + goal.annualInterestRate / DAYS_PER_YEAR,
    elapsedDays
  );
  return {
    projectedBalance,
    requiredDoubloons: Math.ceil(projectedBalance) + goal.protectedPurse
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
  goal.debtBalance = familyDebtPayoffProjection(goal, currentMinute).projectedBalance;
  goal.lastAccruedMinute = currentMinute;
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
    insufficientPurse: doubloons < goal.protectedPurse
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
  observerLatitudeDeg,
  observerLongitudeDeg,
  whaleLatitudeDeg,
  whaleLongitudeDeg
}) {
  validateCampaignGoal(goal);
  if (goal.type !== CAMPAIGN_GOAL_WHITE_WHALE || goal.whiteWhaleKilled) return null;
  if (typeof interactionKey !== "string" || interactionKey === "") {
    throw new Error("White whale sighting requires an interaction key");
  }
  for (const [label, value] of Object.entries({
    observerLatitudeDeg,
    observerLongitudeDeg,
    whaleLatitudeDeg,
    whaleLongitudeDeg
  })) {
    if (!Number.isFinite(value)) throw new Error(`White whale sighting has invalid ${label}`);
  }
  if (goal.checkedInteractionIds.includes(interactionKey)) return null;
  goal.checkedInteractionIds.push(interactionKey);
  if (goal.checkedInteractionIds.length > 128) goal.checkedInteractionIds.shift();
  const roll = hashString32(`${interactionKey}|white-whale-rumor`) % 20;
  if (roll !== 0) return null;
  goal.sighting = {
    latitudeDeg: whaleLatitudeDeg,
    longitudeDeg: whaleLongitudeDeg,
    reached: false,
    interactionKey
  };
  const direction = compassDirection(
    observerLatitudeDeg,
    observerLongitudeDeg,
    whaleLatitudeDeg,
    whaleLongitudeDeg
  );
  const variants = [
    `I heard of a whale white as a winding sheet, last seen ${direction} of here. The sailors who saw it have stopped laughing at old tales.`,
    `A pale spout was sighted ${direction} of here, and beneath it a back like a snow-covered reef. If your quarry lives, it passed that way.`,
    `There are sober men swearing they saw the white whale ${direction} of here. It sounded once and vanished, as though the sea had closed an eye.`,
    `Word came from ${direction}: a great sperm whale, all white, carrying old iron in its hide. I thought you would want the bearing.`,
    `A ship from ${direction} reports a white whale that stove their boat with one turn of its flukes. They marked the place before they fled.`,
    `Look ${direction}. The crews there speak of a white brow rising through black water, terrible and calm. That is the whale you seek.`
  ];
  return {
    text: variants[hashString32(`${interactionKey}|white-whale-prose`) % variants.length],
    direction,
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

export function campaignGoalTypeForCharacter(playerCharacter) {
  assertCharacter(playerCharacter);
  return seededGoalType(playerCharacter.id);
}

export function campaignGoalIntroSteps(goal, playerCharacter, contactCharacter) {
  validateCampaignGoal(goal);
  assertCharacter(playerCharacter);
  assertPerson(contactCharacter);
  const culture = culturalStory(playerCharacter);
  if (goal.type === CAMPAIGN_GOAL_EXPLORER) {
    const patronOutlook = explorerPatronOutlook(playerCharacter);
    return [
      step("contact", "pleased", `${playerCharacter.givenName || playerCharacter.name}, travelers bring me tales of the world's wonders, and most contradict the last. I want an account from someone whose eyes I trust. ${patronOutlook} You notice what other captains sail past; I believe there is something exceptional in you.`),
      step("player", "thoughtful", `Since I was a child, I have dreamed of seeing the whole world with my own eyes: every impossible mountain, ancient city, and shore beyond the horizon. ${culture.explorerIntro}`),
      step("contact", "attentive", "Then bring that world home to me. I want to know not merely where each wonder stands, but what makes it worthy of wonder. I will reward every true account, and pay most richly for the rarest wonders at the farthest reaches of your voyage. Each time you return, I will share the nearest rumor still worth chasing."),
      step("player", "determined", "I will follow those rumors to the edge of every chart. When I return, you will know these places as more than names, and I will finally have seen the world I imagined.")
    ];
  }
  if (goal.type === CAMPAIGN_GOAL_WHITE_WHALE) {
    return [
      step("contact", "concerned", `You still mean to follow that white whale, ${playerCharacter.givenName || playerCharacter.name}? Other captains call it a beast. You speak of it as judgment.`),
      step("player", "stern", "It took my boat, my comrades, and every quiet night since. Its white brow rises whenever I close my eyes. I will cross every sea until I set my iron in it."),
      step("contact", "attentive", "Then take a hull fit for blue water and a harpoon fit for the work. Ask in every port and hail every passing ship. Sailors repeat strange news when a drink or a listening ear loosens them."),
      step("player", "determined", "Let the chart be blank and the ocean without end. I know the mark I hunt. Towards that white shape I roll, though all the waves of the world lie between us.")
    ];
  }
  const debtOrigin = familyDebtOriginExchange(playerCharacter);
  return [
    step("contact", "stern", `${playerCharacter.name}, your family's signature is here, beneath a debt of ${formatDoubloons(FAMILY_DEBT_PRINCIPAL)} doubloons. The estate secures every coin. At ten percent interest, time now works for me. ${debtOrigin.creditor}`),
    step("player", "concerned", `${debtOrigin.player} ${culture.debtIntro}`),
    step("contact", "pleased", `I am not unreasonable. Each time you return, I will leave you ${goal.protectedPurse} doubloons for bread, rope, and whatever courage remains. Everything above it comes to me. Arrive poorer, and we shall learn what your promises are worth.`),
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

export function campaignHomecomingSteps(goal, outcome, playerCharacter, discoveryById) {
  validateCampaignGoal(goal);
  assertCharacter(playerCharacter);
  if (!outcome || outcome.type !== goal.type) throw new Error("Campaign homecoming outcome does not match goal");
  if (goal.type === CAMPAIGN_GOAL_EXPLORER) {
    return explorerHomecomingSteps(goal, outcome, playerCharacter, discoveryById);
  }
  if (goal.type === CAMPAIGN_GOAL_FAMILY_DEBT) return debtHomecomingSteps(goal, outcome, playerCharacter);
  return [
    step("contact", "attentive", "Your ship has returned, but the old fury is gone from your face. Is it finished?"),
    step("player", "thoughtful", "The white whale is dead. I thought the sea would change when it sank. It did not. The waves closed over it, and for the first time they were only waves."),
    step("contact", "pleased", "Then come ashore. A life spent chasing one pale shadow is still a life, and yours has not ended with the chase."),
    step("player", "happy", "No. I have followed vengeance to the end of the chart. What comes next will be chosen in daylight.")
  ];
}

export function campaignVictorySummary(goal, playerCharacter) {
  validateCampaignGoal(goal);
  assertCharacter(playerCharacter);
  if (goal.status !== CAMPAIGN_GOAL_COMPLETE) throw new Error("Campaign victory requires a completed goal");
  const culture = culturalStory(playerCharacter);
  const personal = personalEnding(playerCharacter, goal.endingVariant);
  if (goal.type === CAMPAIGN_GOAL_EXPLORER) {
    return {
      title: "THE GREATEST EXPLORER",
      reason: `Reported every known wonder to the patron of ${playerCharacter.homePortName}.`,
      legacy: `${playerCharacter.name} was remembered as the greatest explorer of the age. ${culture.explorerOutro} ${personal}`
    };
  }
  if (goal.type === CAMPAIGN_GOAL_WHITE_WHALE) {
    return {
      title: "THE WHITE WHALE",
      reason: "Hunted the white whale across the world and returned home alive.",
      legacy: `${playerCharacter.name} came home with the white whale's story and no need to embellish it. The chase became legend; the captain, having survived the thing that consumed so many dreams, finally learned to live beyond it. ${personal}`
    };
  }
  return {
    title: "THE ESTATE IS SAVED",
    reason: "Repaid the family debt in full and reclaimed the estate.",
    legacy: `${playerCharacter.name} returned home free of debt and kept the family estate. ${culture.debtOutro} ${personal}`
  };
}

export function campaignGoalLabel(goal) {
  validateCampaignGoal(goal);
  if (goal.type === CAMPAIGN_GOAL_EXPLORER) return "Explorer";
  if (goal.type === CAMPAIGN_GOAL_FAMILY_DEBT) return "Family Debt";
  return "The White Whale";
}

export function createCampaignDialogueSession({
  cityTileId,
  steps,
  phase,
  continueToPortOnClose = false,
  nextPortNodeId = null,
  victoryOnClose = false
}) {
  if (!Number.isInteger(cityTileId) || cityTileId < 0) throw new Error(`Invalid campaign dialogue city: ${cityTileId}`);
  if (!Array.isArray(steps) || steps.length === 0) throw new Error("Campaign dialogue requires at least one step");
  if (typeof phase !== "string" || phase === "") throw new Error("Campaign dialogue requires a phase");
  for (const entry of steps) validateDialogueStep(entry);
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
    victoryOnClose
  };
}

export function campaignDialogueView(session, playerCharacter, contactCharacter) {
  assertCampaignDialogueSession(session);
  assertCharacter(playerCharacter);
  assertPerson(contactCharacter);
  const entry = session.steps[session.stepIndex];
  const speakerCharacter = entry.speaker === "player" ? playerCharacter : contactCharacter;
  const role = entry.speaker === "player"
    ? "captain"
    : session.phase.startsWith("family-debt")
      ? "creditor"
      : session.phase.startsWith("white-whale") ? "old whaler" : "patron";
  return {
    speaker: `${speakerCharacter.name}, ${role}`,
    expressionId: entry.expressionId,
    topic: entry.topic || null,
    text: entry.text,
    feedback: null,
    options: [{
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
  return entry.speaker === "player" ? playerCharacter : contactCharacter;
}

export function selectCampaignDialogueOption(session, optionIndex = session.selectedIndex) {
  assertCampaignDialogueSession(session);
  if (optionIndex !== 0) throw new Error(`Invalid campaign dialogue option index: ${optionIndex}`);
  if (session.stepIndex < session.steps.length - 1) {
    session.stepIndex += 1;
    session.selectedIndex = 0;
    return { closed: false, action: null };
  }
  return {
    closed: true,
    action: session.victoryOnClose
      ? { type: "campaign-victory" }
      : session.phase === "intro" || session.phase.endsWith("-intro")
        ? { type: "campaign-intro-complete" }
        : null
  };
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
      `For ${outcome.newlyReportedIds.length === 1 ? "that account" : "those accounts"}, here are ${formatDoubloons(outcome.reward)} doubloons. Our record now holds ${outcome.reportedCount} of ${outcome.totalWonderCount} wonders.`
    ));
  }
  if (outcome.completed) {
    steps.push(step("contact", "happy", `All ${outcome.totalWonderCount}. There is no blank left in my book. No living captain can match what you have done.`));
    steps.push(step("player", "thoughtful", "Then perhaps it is time to hang my sea coat by the hearth and learn how still ground feels again."));
  } else if (outcome.nextLeadDiscoveryId) {
    const lead = discoveryById.get(outcome.nextLeadDiscoveryId);
    if (!lead) throw new Error(`Missing explorer lead discovery: ${outcome.nextLeadDiscoveryId}`);
    steps.push(step("contact", "attentive", `The nearest untested report concerns ${lead.displayName}: ${lead.detail || "a wonder not yet entered in our atlas"}. I can offer ${formatDoubloons(outcome.nextLeadReward)} doubloons for a true account. I have marked the bearing for you.`));
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

function debtHomecomingSteps(goal, outcome, playerCharacter) {
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
  const stories = CULTURAL_STORIES[character.nameCulture] || CULTURAL_STORIES.maritime;
  return stories;
}

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
  habsburg: debtOrigin(
    "Imperial crowns are costly. Your father should have remembered that guarantors do not wear them.",
    "He guaranteed loans gathered to win that crown. The electors were paid; smaller guarantors were forgotten."
  ),
  hungary: debtOrigin(
    "Belgrade fell. Your quartermaster fled. My claim remained.",
    "We mortgaged the estate to provision the fortress. The receipts vanished with the man who signed them."
  ),
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
  "papal-states": debtOrigin(
    "His Holiness's treasury forgot its wagons. Mine remembers every creditor.",
    "We supplied the army sent against Urbino. Rome exhausted its treasury before it settled our account."
  ),
  ming: debtOrigin(
    "The court struck your uncle from the rebels' roll. It did not strike your family seal from this note.",
    "His name appeared among the Prince of Ning's papers. Proving his innocence cost the family nearly everything."
  ),
  aztec: debtOrigin(
    "Causeways can be rebuilt. Debts survive even fire.",
    "When the causeways closed and the lake city burned, our stores fed three households. We borrowed to rebuild them."
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
  "poland-lithuania": debtOrigin(
    "The Prussian truce rested the cavalry. It did nothing for their guarantors.",
    "We raised that cavalry on a royal warrant. Peace came before the treasury found our name."
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
  ayutthaya: debtOrigin(
    "Malacca lost a warehouse. I acquired excellent security.",
    "The warehouse was ours until the Portuguese took the city. It disappeared, but its bills crossed the sea intact."
  ),
  japan: debtOrigin(
    "The Hosokawa changed sides. The terms of this note did not.",
    "Our house backed the wrong side at Funaokayama. The survivors changed allegiance; our creditors changed the seal."
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
  habsburg: "The Emperor's realms now face oceans no single court understands. A private atlas may tell the truth ceremony conceals.",
  hungary: "Belgrade's fall has narrowed every gaze to the frontier. That is precisely when someone must remember the world is larger.",
  ottoman: "Piri Reis set western discoveries beside eastern charts. His map proves no court owns all useful knowledge.",
  venice: "The Portuguese ocean road drains spice from our galleys. I would learn the routes reshaping Venice before they finish doing so.",
  genoa: "A Genoese sailor crossed the western ocean beneath Castile's flag. The next great account should not leave our harbor under another name.",
  "papal-states": "Reports from lands beyond the Atlantic reach Rome mixed with conversion, gold, and boasting. I want an account concerned first with truth.",
  ming: "The court lets Admiral Zheng's sea roads fade because no treasure fleet now follows them. I do not share that lack of curiosity.",
  aztec: "Strangers came from an eastern horizon our painted books did not contain. We must know the world that sent them.",
  inca: "The Sapa Inca's roads bind mountains beyond counting, yet every official map stops at the sea. Mine need not.",
  safavid: "Ottoman armies close one road and Portuguese cannon command another at Hormuz. Knowledge may reveal a third.",
  muscovy: "Novgorod's merchants know the Baltic by price and rumor. I want bearings that reach beyond their counting houses.",
  "poland-lithuania": "Danzig hears of western lands and eastern seas from a dozen tongues. I want one captain's measured account.",
  "denmark-norway": "Our sagas remember western shores, while the king's ships fight over Sweden. I would rather recover the horizon than another crown.",
  songhai: "Timbuktu gathers the world in books and Gao in caravans. I want the Atlantic to answer what neither can.",
  morocco: "Portuguese forts advance along our coast as if the ocean belongs to them. A true chart is one way to dispute that claim.",
  ethiopia: "Envoys from Portugal have crossed half the world to reach our court. I mean to understand the world they crossed.",
  vijayanagara: "Portuguese horses and gunners arrive through Goa carrying news of seas beyond Arabia. I want knowledge without their price.",
  gujarat: "Diu hears every sea language, while Portuguese cannon tries to decide which routes remain open. A chart is another kind of defense.",
  bengal: "Portuguese sails have reached Chittagong, bringing maps as uncertain as their intentions. We should know more than our visitors.",
  delhi: "Caravans describe oceans beyond Gujarat and Bengal, each story altered by ten merchants. I want one witness.",
  ayutthaya: "The Portuguese arrived after taking Malacca and now speak of seas beyond Africa. I would hear the world without their interpreter.",
  japan: "Ming merchants and island pilots carry fragments of distant coasts. I want them joined before rumor distorts them further.",
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

function assertExactKeys(label, actualKeys, expectedKeys) {
  const actual = [...actualKeys].sort();
  const expected = [...expectedKeys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new Error(`${label} must exactly cover: ${expected.join(", ")}`);
  }
}

function personalEnding(character, variant) {
  const pronouns = character.gender === "female"
    ? { subject: "She", possessive: "her" }
    : { subject: "He", possessive: "his" };
  const endings = [
    `${pronouns.subject} later married and filled ${pronouns.possessive} home with children, charts, and loud stories of the sea.`,
    `${pronouns.subject} never stopped traveling entirely, but every later voyage ended at a home chosen freely.`,
    `${pronouns.subject} trained young captains and lived long enough to see them return with discoveries of their own.`,
    `${pronouns.subject} spent later years writing a plain account of the voyage, which became far more famous than intended.`
  ];
  return endings[variant];
}

function step(speaker, expressionId, text, topic = null) {
  return Object.freeze({ speaker, expressionId, text, ...(topic === null ? {} : { topic }) });
}

function seededGoalType(identityKey) {
  return [
    CAMPAIGN_GOAL_EXPLORER,
    CAMPAIGN_GOAL_FAMILY_DEBT,
    CAMPAIGN_GOAL_WHITE_WHALE
  ][hashString32(`${identityKey}|campaign-goal`) % 3];
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
  validateDialogueStep(session.steps[session.stepIndex]);
}

function validateDialogueStep(entry) {
  if (!entry || !["player", "contact"].includes(entry.speaker)) {
    throw new Error(`Invalid campaign dialogue speaker: ${entry?.speaker}`);
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
