import { explorerReportDialogueForDiscovery } from "./explorerDiscoveryDialogue.js";
import { FACTIONS, NEUTRAL_FACTION_ID, PIRATE_FACTION_ID } from "./factions.js";
import { greatCircleDistanceKm, MAX_GREAT_CIRCLE_DISTANCE_KM } from "./worldDistance.js";

export const CAMPAIGN_GOAL_VERSION = 1;
export const CAMPAIGN_GOAL_EXPLORER = "explorer";
export const CAMPAIGN_GOAL_FAMILY_DEBT = "family-debt";
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

const MINUTES_PER_DAY = 24 * 60;
const DAYS_PER_YEAR = 365.25;
const CAMPAIGN_GOAL_TYPES = new Set([
  CAMPAIGN_GOAL_EXPLORER,
  CAMPAIGN_GOAL_FAMILY_DEBT
]);

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
    : {
        ...base,
        debtBalance: FAMILY_DEBT_PRINCIPAL,
        annualInterestRate: FAMILY_DEBT_ANNUAL_RATE,
        lastAccruedMinute: startMinute,
        protectedPurse: FAMILY_DEBT_PROTECTED_PURSE,
        totalPaid: 0
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
  else validateFamilyDebtGoal(goal);
  return goal;
}

export function markCampaignGoalIntroSeen(goal) {
  validateCampaignGoal(goal);
  goal.introSeen = true;
  return goal;
}

export function isExplorerWonder(discovery) {
  return Boolean(discovery && discovery.kind !== "achievement");
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
  const wonderIds = new Set(wonders.map((wonder) => wonder.id));
  const reported = new Set(goal.reportedDiscoveryIds);
  const newlyReportedWonders = wonders
    .filter((wonder) => discoveredIds.has(wonder.id) && !reported.has(wonder.id));
  const newlyReported = newlyReportedWonders.map((wonder) => wonder.id);
  const rewardEntries = newlyReportedWonders.map((wonder) => ({
    discoveryId: wonder.id,
    reward: explorerDiscoveryReward(wonder, homePort)
  }));
  for (const discoveryId of newlyReported) goal.reportedDiscoveryIds.push(discoveryId);
  goal.totalWonderCount = wonders.length;

  const unknownLead = nextLeadDiscoveryId !== null && !wonderIds.has(nextLeadDiscoveryId);
  if (unknownLead) throw new Error(`Explorer lead is not in the wonder catalog: ${nextLeadDiscoveryId}`);
  if (nextLeadDiscoveryId !== null && discoveredIds.has(nextLeadDiscoveryId)) {
    throw new Error(`Explorer lead is already discovered: ${nextLeadDiscoveryId}`);
  }
  goal.currentLeadDiscoveryId = nextLeadDiscoveryId;
  const nextLead = goal.currentLeadDiscoveryId === null
    ? null
    : wonders.find((wonder) => wonder.id === goal.currentLeadDiscoveryId);
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

export function campaignGoalIntroSteps(goal, playerCharacter, contactCharacter) {
  validateCampaignGoal(goal);
  assertCharacter(playerCharacter);
  assertPerson(contactCharacter);
  const culture = culturalStory(playerCharacter);
  if (goal.type === CAMPAIGN_GOAL_EXPLORER) {
    return [
      step("contact", "pleased", `${playerCharacter.givenName || playerCharacter.name}, I have spent years buying travelers' tales of the world's wonders, and most contradict the last. I want an account from someone whose eyes I trust. You notice what other captains sail past. I believe there is something exceptional in you.`),
      step("player", "thoughtful", `Since I was a child, I have dreamed of seeing the whole world with my own eyes: every impossible mountain, ancient city, and shore beyond the horizon. ${culture.explorerIntro}`),
      step("contact", "attentive", "Then bring that world home to me. I want to know not merely where each wonder stands, but what makes it worthy of wonder. I will reward every true account, and pay most richly for the rarest wonders at the farthest reaches of your voyage. Each time you return, I will share the nearest rumor still worth chasing."),
      step("player", "determined", "I will follow those rumors to the edge of every chart. When I return, you will know these places as more than names, and I will finally have seen the world I imagined.")
    ];
  }
  return [
    step("contact", "stern", `${playerCharacter.name}, your family's signature is here, beneath a debt of ${formatDoubloons(FAMILY_DEBT_PRINCIPAL)} doubloons. The estate secures every coin. At ten percent interest, time now works for me.`),
    step("player", "concerned", `${familyDebtOriginDialogue(playerCharacter)} ${culture.debtIntro}`),
    step("contact", "pleased", `I am not unreasonable. Each time you return, I will leave you ${goal.protectedPurse} doubloons for bread, rope, and whatever courage remains. Everything above it comes to me. Arrive poorer, and we shall learn what your promises are worth.`),
    step("player", "determined", "Keep the deed close and your ink ready. One day you will write paid in full across it, and my family will keep what is ours.")
  ];
}

export function familyDebtOriginDialogue(character) {
  assertCharacter(character);
  if (!Object.hasOwn(FAMILY_DEBT_ORIGINS_BY_FACTION, character.nationalityId)) {
    throw new Error(`Missing family debt origin for faction: ${character.nationalityId ?? "none"}`);
  }
  return FAMILY_DEBT_ORIGINS_BY_FACTION[character.nationalityId];
}

export function campaignHomecomingSteps(goal, outcome, playerCharacter, discoveryById) {
  validateCampaignGoal(goal);
  assertCharacter(playerCharacter);
  if (!outcome || outcome.type !== goal.type) throw new Error("Campaign homecoming outcome does not match goal");
  if (goal.type === CAMPAIGN_GOAL_EXPLORER) {
    return explorerHomecomingSteps(goal, outcome, playerCharacter, discoveryById);
  }
  return debtHomecomingSteps(goal, outcome, playerCharacter);
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
  return {
    title: "THE ESTATE IS SAVED",
    reason: "Repaid the family debt in full and reclaimed the estate.",
    legacy: `${playerCharacter.name} returned home free of debt and kept the family estate. ${culture.debtOutro} ${personal}`
  };
}

export function campaignGoalLabel(goal) {
  validateCampaignGoal(goal);
  return goal.type === CAMPAIGN_GOAL_EXPLORER ? "Explorer" : "Family Debt";
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
    : session.phase.startsWith("family-debt") ? "creditor" : "patron";
  return {
    speaker: `${speakerCharacter.name}, ${role}`,
    expressionId: entry.expressionId,
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
      : session.phase === "intro" || session.phase === "family-debt-intro"
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
    for (const discoveryId of outcome.newlyReportedIds) {
      const discovery = discoveryById.get(discoveryId);
      if (!discovery) throw new Error(`Missing reported discovery: ${discoveryId}`);
      const report = explorerReportDialogueForDiscovery(discovery);
      steps.push(step("player", "happy", report.player));
      steps.push(step("contact", "pleased", report.patron));
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
  england: "Our name was entered in a great duke's household books. When the duke fell, every old favor became a charge and every guarantee became ours.",
  scotland: "We furnished horses and grain for the army that crossed the Tweed. The men did not return from Flodden, but every lender did.",
  france: "We provisioned the king's first march into Lombardy on promises sealed before Marignano. Victory came home; payment did not.",
  spain: "Our seal was found in a Comunero account book after Villalar. The Crown took the land, and the lender kept the note.",
  portugal: "We fitted a carrack for the taking of Goa, then borrowed again when its cargo failed to return. The Crown kept the port; we kept the debt.",
  habsburg: "My father guaranteed loans gathered to win an imperial crown. The electors were paid; smaller guarantors were forgotten.",
  hungary: "We mortgaged the estate to provision Belgrade. When the fortress fell, the quartermaster vanished with the receipts.",
  ottoman: "Our household backed the wrong prince when the old Sultan yielded the throne. The victor spared our lives, but not our property.",
  venice: "The Republic called for one forced loan after another while the mainland burned. Cambrai ended; our obligations did not.",
  genoa: "Our warehouse was pledged under one lord and seized when the next banner rose. Genoa changed masters faster than the ink could dry.",
  "papal-states": "We supplied wagons to the army sent against Urbino. Rome exhausted its treasury before settling our account, so the lender settled it for us.",
  ming: "An uncle's name appeared among the Prince of Ning's papers. The court cleared him of rebellion only after the family pledged nearly everything.",
  aztec: "When the causeways closed and the lake city burned, our stores fed three households. Rebuilding them all required a lender with a long memory.",
  inca: "The northern campaign took our llamas, grain, and sons, all on imperial tallies. The tallies came back honored; the goods did not.",
  safavid: "Our finest caravan was in Tabriz when the western army entered after Chaldiran. We borrowed against its return before learning none would come.",
  muscovy: "We fitted wagons and horses for the long siege of Smolensk. The fortress changed hands; the court's promise of payment did not.",
  "poland-lithuania": "We raised cavalry for the Prussian war on a royal warrant. The truce came before the treasury found our name.",
  "denmark-norway": "We mortgaged the farm to outfit ships for the king's Swedish crown. Stockholm yielded, then the payment vanished into court quarrels.",
  songhai: "We advanced salt, grain, and camels for Askia's march on Agadez. Tribute came downriver to Gao, but not one cowrie reached our house.",
  morocco: "Our warehouses stood at Azemmour when the Portuguese came. We ransomed kin, rebuilt inland, and signed whatever terms the lender set.",
  ethiopia: "Year after year the frontier riders came with Mahfuz. We borrowed to replace burned herds, then borrowed once more to arm the men who stopped him.",
  vijayanagara: "We bought Arabian horses for the Raichur campaign. The victory procession passed our door; the paymaster did not.",
  gujarat: "When the Portuguese demanded a fortress at Diu, our family financed ships to make the refusal credible. The ships were lost; the refusal was not.",
  bengal: "Our ships were caught in the fighting for Chittagong. By the time the port was ours again, three rulers claimed the cargo and the lender claimed the house.",
  delhi: "A kinsman guaranteed a noble who chose Jalal Khan when the old Sultan died. Ibrahim took the noble's lands; the guarantee survived.",
  ayutthaya: "Our family kept a warehouse in Malacca until the Portuguese took the city. The warehouse disappeared, but its bills crossed the sea intact.",
  japan: "Our house backed the wrong Hosokawa at Funaokayama. The survivors changed allegiance; our creditors merely changed the seal on the deed.",
  joseon: "A cousin signed the reformers' memorials before the purge. His name was erased from office, and saving the clan lands cost everything else."
});

assertExactKeys(
  "family debt faction origins",
  Object.keys(FAMILY_DEBT_ORIGINS_BY_FACTION),
  FACTIONS
    .map((faction) => faction.id)
    .filter((factionId) => ![NEUTRAL_FACTION_ID, PIRATE_FACTION_ID].includes(factionId))
);

function story(explorerIntro, explorerOutro, debtIntro, debtOutro) {
  return Object.freeze({ explorerIntro, explorerOutro, debtIntro, debtOutro });
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

function step(speaker, expressionId, text) {
  return Object.freeze({ speaker, expressionId, text });
}

function seededGoalType(identityKey) {
  return hashString32(`${identityKey}|campaign-goal`) % 2 === 0
    ? CAMPAIGN_GOAL_EXPLORER
    : CAMPAIGN_GOAL_FAMILY_DEBT;
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
