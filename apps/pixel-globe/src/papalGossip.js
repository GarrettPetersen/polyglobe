import { factionById } from "./factions.js";
import {
  PAPAL_ACTION_CONDEMNATION,
  PAPAL_ACTION_CRUSADE,
  PAPAL_ACTION_EXCOMMUNICATION,
  PAPAL_ACTION_FAVOUR,
  PAPAL_ACTION_REVOCATION,
  PAPAL_COMMISSION_ALMS,
  PAPAL_COMMISSION_RELIEF,
  validatePapalPolitics
} from "./papalPolitics.js";
import { WEATHER_MINUTES_PER_DAY } from "./weather.js";

export const PAPAL_GOSSIP_DAYS = 180;

const EUROPEAN_CITY_TYPES = new Set(["northern-european", "mediterranean"]);
const EUROPEAN_PORTRAIT_REGIONS = new Set(["europe", "northern-europe", "mediterranean"]);

export function recentPapalGossipForPort(memory, city, simMinute) {
  validatePapalPolitics(memory);
  if (!city || typeof city !== "object") throw new Error("Papal port gossip requires a city");
  if (!EUROPEAN_CITY_TYPES.has(city.cityType) &&
      !EUROPEAN_PORTRAIT_REGIONS.has(city.character?.region)) {
    return null;
  }
  return recentPapalGossip(memory, simMinute);
}

export function recentPapalGossipForCharacter(
  memory,
  character,
  simMinute,
  {
    interactionKey,
    chanceDenominator = 3
  } = {}
) {
  validatePapalPolitics(memory);
  if (!character || typeof character !== "object") {
    throw new Error("Papal character gossip requires a character");
  }
  if (!EUROPEAN_PORTRAIT_REGIONS.has(character.region)) return null;
  if (typeof interactionKey !== "string" || interactionKey.trim() === "") {
    throw new Error("Papal character gossip requires an interaction key");
  }
  if (!Number.isInteger(chanceDenominator) || chanceDenominator < 1) {
    throw new Error(`Invalid papal gossip chance denominator: ${chanceDenominator}`);
  }
  const gossip = recentPapalGossip(memory, simMinute);
  if (!gossip) return null;
  return hashString32(`${interactionKey}|${gossip.actionId}|papal-gossip`) % chanceDenominator === 0
    ? gossip
    : null;
}

export function papalGossipDialogueLine(gossip) {
  validatePapalGossip(gossip);
  return `News from Rome: ${sentence(gossip.report)}`;
}

function recentPapalGossip(memory, simMinute) {
  validatePapalPolitics(memory);
  if (!Number.isFinite(simMinute) || simMinute < 0) {
    throw new Error(`Invalid papal gossip minute: ${simMinute}`);
  }
  const maxAgeMinutes = PAPAL_GOSSIP_DAYS * WEATHER_MINUTES_PER_DAY;
  const action = memory.history.find((entry) => (
    entry.simMinute <= simMinute && simMinute - entry.simMinute <= maxAgeMinutes
  ));
  return action ? papalGossipForAction(action) : null;
}

function papalGossipForAction(action) {
  const target = factionById(action.targetFactionId);
  if (action.kind === PAPAL_ACTION_REVOCATION) {
    if (action.revokedActionKind === PAPAL_ACTION_EXCOMMUNICATION) {
      return gossip({
        action,
        report: `${action.popeName} has restored ${action.targetRulerName} to the communion of the Church`,
        tradeImpact: "Envoys and lenders are waiting to see which courts renew their dealings.",
        reflection: "Absolution opens a door, though old quarrels do not pass through it so quickly."
      });
    }
    if (action.revokedActionKind === PAPAL_ACTION_CRUSADE) {
      return gossip({
        action,
        report: `${action.popeName} has withdrawn the crusade proclaimed against ${target.name}`,
        tradeImpact: "Shipowners expect levies and armed convoys to ease, though no peace is assured.",
        reflection: "Rome may furl the cross without stilling every prince's guns."
      });
    }
    if (action.revokedActionKind === PAPAL_ACTION_FAVOUR) {
      return gossip({
        action,
        report: `${action.popeName} has withdrawn the bull issued in favour of ${target.name}`,
        tradeImpact: "Courtiers and merchants are reckoning which privileges will survive.",
        reflection: "What a seal grants, another seal may take away."
      });
    }
    return gossip({
      action,
      report: `${action.popeName} has withdrawn the condemnation of ${target.name}`,
      tradeImpact: "Printers and envoys are carrying the new judgment from court to court.",
      reflection: "A withdrawn censure mends the law sooner than it mends men's regard."
    });
  }
  if (action.logistics?.kind === PAPAL_COMMISSION_RELIEF) {
    const recipient = factionById(action.logistics.recipientFactionId);
    const opponent = factionById(action.logistics.opponentFactionId);
    return gossip({
      action,
      report: `${action.popeName} has sent grain, powder, and a nuncio to ${recipient.name} against ${opponent.name}`,
      tradeImpact: "Relief buyers are seeking grain, powder, ships, and trustworthy captains.",
      reflection: "A bull may summon princes, but a hungry garrison still needs ships and stores."
    });
  }
  if (action.logistics?.kind === PAPAL_COMMISSION_ALMS) {
    const recipient = factionById(action.logistics.recipientFactionId);
    return gossip({
      action,
      report: `${action.popeName} has sent grain alms to the poor of ${recipient.name}`,
      tradeImpact: "Church agents are buying grain and hiring honest carriers.",
      reflection: "Mercy travels by the same roads and sea lanes as commerce."
    });
  }
  if (action.kind === PAPAL_ACTION_FAVOUR) {
    return gossip({
      action,
      report: `${action.popeName} has issued a bull in favour of ${target.name}`,
      tradeImpact: "Courtiers and merchants are already asking what privileges may follow.",
      reflection: "A line written in Rome can alter friendships far beyond Italy."
    });
  }
  if (action.kind === PAPAL_ACTION_EXCOMMUNICATION) {
    return gossip({
      action,
      report: `${action.popeName} has excommunicated ${action.targetRulerName}`,
      tradeImpact: "Envoys and lenders are watching every Catholic court for its response.",
      reflection: "A ruler may command armies and still fear exclusion from the Church."
    });
  }
  if (action.kind === PAPAL_ACTION_CONDEMNATION) {
    return gossip({
      action,
      report: `${action.popeName} has issued a bull condemning ${target.name}`,
      tradeImpact: "Printers, preachers, and diplomatic couriers are all unusually busy.",
      reflection: "Condemnation from Rome travels farther than the messenger who bears it."
    });
  }
  if (action.kind === PAPAL_ACTION_CRUSADE) {
    return gossip({
      action,
      report: `${action.popeName} has proclaimed a crusade against ${target.name}`,
      tradeImpact: "Shipowners expect new levies, armed convoys, and dearer insurance.",
      reflection: "Princes will now decide whether zeal and policy point in the same direction."
    });
  }
  throw new Error(`Unknown papal gossip action: ${action.kind}`);
}

function gossip({ action, report, tradeImpact, reflection }) {
  return Object.freeze({
    id: `papal-gossip:${action.id}`,
    actionId: action.id,
    place: "Rome",
    report,
    tradeImpact,
    reflection,
    simMinute: action.simMinute
  });
}

function validatePapalGossip(gossipRecord) {
  if (!gossipRecord || typeof gossipRecord !== "object" ||
      typeof gossipRecord.actionId !== "string" || gossipRecord.actionId === "") {
    throw new Error("Invalid papal gossip");
  }
  for (const field of ["place", "report", "tradeImpact", "reflection"]) {
    if (typeof gossipRecord[field] !== "string" || gossipRecord[field].trim() === "") {
      throw new Error(`Papal gossip requires ${field}`);
    }
  }
}

function sentence(value) {
  const text = String(value || "").trim();
  if (text === "") throw new Error("Papal gossip has no report");
  const capitalized = text.charAt(0).toUpperCase() + text.slice(1);
  return /[.!?]$/.test(capitalized) ? capitalized : `${capitalized}.`;
}

function hashString32(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
