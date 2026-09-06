import {
  CAMPAIGN_GOAL_ACTIVE,
  CAMPAIGN_GOAL_EXPLORER,
  CAMPAIGN_GOAL_FAMILY_DEBT,
  CAMPAIGN_GOAL_TREASURE,
  CAMPAIGN_GOAL_WHITE_WHALE,
  explorerWonderCatalog,
  familyDebtPayoffProjection,
  validateCampaignGoal
} from "./campaignGoals.js";
import {
  TREASURE_MAP_PIECE_COUNT,
  treasureAmbushComplete,
  treasureCampaignPhase
} from "./treasureCampaign.js";

export const CAMPAIGN_GOAL_REMINDER_DECISION_KEY = "campaign.goal-reminder.two-month-interval";
export const CAMPAIGN_GOAL_REMINDER_INTERVAL_DAYS = 60;

const MINUTES_PER_DAY = 24 * 60;
const CAMPAIGN_GOAL_REMINDER_INTERVAL_MINUTES =
  CAMPAIGN_GOAL_REMINDER_INTERVAL_DAYS * MINUTES_PER_DAY;

export function dueCampaignGoalReminderInterval({
  decisions,
  currentMinute,
  voyageStartMinute
}) {
  assertDecisions(decisions);
  assertSimulationMinute(currentMinute, "current");
  assertSimulationMinute(voyageStartMinute, "voyage start");
  const elapsedMinutes = Math.max(0, currentMinute - voyageStartMinute);
  const currentInterval = Math.floor(elapsedMinutes / CAMPAIGN_GOAL_REMINDER_INTERVAL_MINUTES);
  if (currentInterval < 1) return null;
  const deliveredInterval = decisions[CAMPAIGN_GOAL_REMINDER_DECISION_KEY] || 0;
  if (!Number.isInteger(deliveredInterval) || deliveredInterval < 0) {
    throw new Error(`Invalid campaign goal reminder interval: ${deliveredInterval}`);
  }
  return currentInterval > deliveredInterval ? currentInterval : null;
}

export function markCampaignGoalReminderDelivered(decisions, interval) {
  assertDecisions(decisions);
  if (!Number.isInteger(interval) || interval < 1) {
    throw new Error(`Invalid delivered campaign reminder interval: ${interval}`);
  }
  const previous = decisions[CAMPAIGN_GOAL_REMINDER_DECISION_KEY] || 0;
  if (!Number.isInteger(previous) || previous < 0 || interval < previous) {
    throw new Error(`Campaign goal reminder cannot move backwards: ${interval} < ${previous}`);
  }
  decisions[CAMPAIGN_GOAL_REMINDER_DECISION_KEY] = interval;
  return interval;
}

export function campaignGoalDepartureReminder(goal, {
  currentMinute,
  doubloons,
  discoveredIds,
  wonderCatalog,
  homePortName,
  contactName,
  reminderInterval
}) {
  validateCampaignGoal(goal);
  assertSimulationMinute(currentMinute, "current");
  assertNonNegativeInteger(doubloons, "campaign reminder doubloons");
  assertNonEmptyString(homePortName, "campaign reminder home port");
  assertNonEmptyString(contactName, "campaign reminder contact");
  if (!Number.isInteger(reminderInterval) || reminderInterval < 1) {
    throw new Error(`Invalid campaign reminder prose interval: ${reminderInterval}`);
  }
  if (goal.status !== CAMPAIGN_GOAL_ACTIVE) return null;

  if (goal.type === CAMPAIGN_GOAL_EXPLORER) {
    return explorerReminder(goal, {
      discoveredIds,
      wonderCatalog,
      homePortName,
      contactName,
      reminderInterval
    });
  }
  if (goal.type === CAMPAIGN_GOAL_FAMILY_DEBT) {
    return familyDebtReminder(goal, {
      currentMinute,
      doubloons,
      homePortName,
      contactName,
      reminderInterval
    });
  }
  if (goal.type === CAMPAIGN_GOAL_WHITE_WHALE) {
    return whiteWhaleReminder(goal, { homePortName, reminderInterval });
  }
  if (goal.type === CAMPAIGN_GOAL_TREASURE) {
    return treasureReminder(goal, { homePortName, reminderInterval });
  }
  throw new Error(`Campaign goal reminder is missing a goal type: ${goal.type}`);
}

function explorerReminder(goal, {
  discoveredIds,
  wonderCatalog,
  homePortName,
  contactName,
  reminderInterval
}) {
  if (!(discoveredIds instanceof Set)) {
    throw new Error("Explorer reminder requires discovered ids");
  }
  const wonders = explorerWonderCatalog(wonderCatalog, discoveredIds);
  const wonderById = new Map(wonders.map((wonder) => [wonder.id, wonder]));
  const reported = new Set(goal.reportedDiscoveryIds);
  const unreported = wonders.filter(
    (wonder) => discoveredIds.has(wonder.id) && !reported.has(wonder.id)
  );
  if (unreported.length === 1) {
    return {
      text: `I must tell ${contactName} in ${homePortName} what I saw at ` +
        `${discoveryName(unreported[0])}.`,
      expressionId: "happy"
    };
  }
  if (unreported.length > 1) {
    return {
      text: `I have ${unreported.length} new discoveries to lay before ${contactName}. ` +
        `I must report back in ${homePortName}.`,
      expressionId: "happy"
    };
  }
  if (goal.currentLeadDiscoveryId !== null) {
    const lead = wonderById.get(goal.currentLeadDiscoveryId);
    if (!lead) {
      throw new Error(`Explorer reminder cannot find assigned lead: ${goal.currentLeadDiscoveryId}`);
    }
    const variants = [
      `I must seek ${discoveryName(lead)} and bring a true account back to ${contactName} in ${homePortName}.`,
      `${contactName} believes ${discoveryName(lead)} is within reach. I should find it, then return to ${homePortName}.`
    ];
    return {
      text: variants[reminderInterval % variants.length],
      expressionId: "neutral"
    };
  }
  const remaining = wonders.filter((wonder) => !reported.has(wonder.id)).length;
  return {
    text: `${remaining} ${remaining === 1 ? "wonder remains" : "wonders remain"} unreported. ` +
      `I must keep searching, then return to ${contactName} in ${homePortName}.`,
    expressionId: "neutral"
  };
}

function familyDebtReminder(goal, {
  currentMinute,
  doubloons,
  homePortName,
  contactName,
  reminderInterval
}) {
  const payoff = familyDebtPayoffProjection(goal, currentMinute);
  if (doubloons >= payoff.requiredDoubloons) {
    return {
      text: `We have enough to clear the family debt. I must return to ${contactName} in ${homePortName}.`,
      expressionId: "happy"
    };
  }
  const roundedBalance = Math.max(100, Math.ceil(payoff.projectedBalance / 100) * 100);
  const variants = [
    `The family debt stands at about ${roundedBalance.toLocaleString("en-US")} doubloons. ` +
      `I must earn enough to settle with ${contactName} in ${homePortName}.`,
    `${contactName} is still owed about ${roundedBalance.toLocaleString("en-US")} doubloons. ` +
      `Every profitable voyage brings the family estate closer to safety.`
  ];
  return {
    text: variants[reminderInterval % variants.length],
    expressionId: "stern"
  };
}

function whiteWhaleReminder(goal, { homePortName, reminderInterval }) {
  if (goal.whiteWhaleKilled) {
    return {
      text: `The white whale is dead. I must carry word of it home to ${homePortName}.`,
      expressionId: "stern"
    };
  }
  if (goal.sighting && !goal.sighting.reached) {
    return {
      text: "The latest report of the white whale is marked on my chart. I must follow it before the trail goes cold.",
      expressionId: "stern"
    };
  }
  const variants = [
    "The white whale still swims beyond the horizon. I need fresh word from ports and passing ships.",
    "No sea is empty while that white shadow lives. I will ask after its wake wherever we make port."
  ];
  return {
    text: variants[reminderInterval % variants.length],
    expressionId: "stern"
  };
}

function treasureReminder(goal, { homePortName, reminderInterval }) {
  const phase = treasureCampaignPhase(goal);
  if (phase === "map-hunt") {
    const pieceCount = goal.acquiredMapPiecePirateIds.length;
    const hintCount = goal.pirateHints.length;
    const rumorText = hintCount > 0
      ? `${hintCount} ${hintCount === 1 ? "pirate is" : "pirates are"} marked on my chart.`
      : "I need fresh rumors from ports and passing ships.";
    return {
      text: `I hold ${pieceCount} of ${TREASURE_MAP_PIECE_COUNT} pieces of Captain ` +
        `${goal.treasureCaptainName}'s map. ${rumorText}`,
      expressionId: "stern"
    };
  }
  if (phase === "find-treasure") {
    return {
      text: `Captain ${goal.treasureCaptainName}'s map is whole. The island is marked; now we must find the treasure.`,
      expressionId: "stern"
    };
  }
  if (!treasureAmbushComplete(goal)) {
    const remaining = TREASURE_MAP_PIECE_COUNT - goal.ambushDefeatedPirateIds.length;
    return {
      text: `The treasure is aboard, but ${remaining} of Captain ${goal.treasureCaptainName}'s old crew ` +
        `${remaining === 1 ? "still bars" : "still bar"} the way home to ${homePortName}.`,
      expressionId: "stern"
    };
  }
  const variants = [
    `The old crew is beaten. I must carry Captain ${goal.treasureCaptainName}'s treasure home to ${homePortName}.`,
    `One last course remains: home to ${homePortName}, with the treasure safe aboard.`
  ];
  return {
    text: variants[reminderInterval % variants.length],
    expressionId: "happy"
  };
}

function discoveryName(discovery) {
  const name = discovery?.displayName || discovery?.name;
  assertNonEmptyString(name, `discovery ${discovery?.id || "unknown"} name`);
  return name;
}

function assertDecisions(decisions) {
  if (!decisions || typeof decisions !== "object" || Array.isArray(decisions)) {
    throw new Error("Campaign goal reminders require decision memory");
  }
}

function assertSimulationMinute(value, label) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`Invalid ${label} campaign reminder minute: ${value}`);
  }
}

function assertNonNegativeInteger(value, label) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`Invalid ${label}: ${value}`);
  }
}

function assertNonEmptyString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Missing ${label}`);
  }
}
