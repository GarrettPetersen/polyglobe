import {
  dietOfWormsGossip,
  occasionalReligiousGreeting
} from "./religiousDialogue.js";
import { factionNounPhrase } from "./factions.js";
import { shipyardListingCondition } from "./shipyardListingPresentation.js";
import { PORT_CITY_STAFF_GREETING_STYLE } from "./portGreetingStyle.js";

export const PORT_PERSONALITY_IDS = Object.freeze([
  "cordial",
  "vigilant",
  "gossipy",
  "austere",
  "enterprising",
  "reflective"
]);

const CONTEXT_LINES = Object.freeze({
  pirates: {
    cordial: "Pirate sails have been seen nearby. Hospitality ends where their cannon range begins.",
    vigilant: "Pirates are close. Keep a watch posted before you cast off.",
    gossipy: "The quay swears pirates are nearby, and for once I believe every word.",
    austere: "Pirate warning: nearby waters are unsafe.",
    enterprising: "Pirates are fouling the sea lanes and raising every honest rate in port.",
    reflective: "Pirates gather where patrol routes thin. That is no accident."
  },
  storm: {
    cordial: "The weather is turning. Better a crowded hearth than an empty place at sea.",
    vigilant: "A storm is working nearby. Check every line before departure.",
    gossipy: "Every old sailor on the quay predicts a storm, each by a different knee.",
    austere: "Storm weather. Remain in shelter if your hull is doubtful.",
    enterprising: "The storm has delayed arrivals; scarce cargo may fetch a handsome price.",
    reflective: "A storm makes equals of proud captains and cautious ones."
  },
  warships: {
    cordial: "The patrol ships are close today. Their crews have made the taverns lively.",
    vigilant: "Warships are patrolling nearby. Give them no reason to inspect your hold twice.",
    gossipy: "The warships outside have everyone guessing whose orders they carry.",
    austere: "Patrols are active. Keep clear of their course.",
    enterprising: "Warships in the roadstead mean contracts for some and searches for others.",
    reflective: "A harbor full of warships is peaceful only in the narrowest sense."
  },
  merchants: {
    cordial: "The roadstead is full of merchant sails. There should be good company ashore tonight.",
    vigilant: "Merchant traffic is heavy. Watch for careless helms near the harbor mouth.",
    gossipy: "So many merchants came in today that every warehouse keeper claims a shortage.",
    austere: "Merchant arrivals are heavy. Berths and labor are limited.",
    enterprising: "Merchant sails are crowding the roadstead. Prices will not sit still for long.",
    reflective: "Merchant wakes cross here from half the world, each following the same hope."
  },
  fishermen: {
    cordial: "The fishing boats are working close by. Fresh catch may reach the stalls by evening.",
    vigilant: "Fishing boats are thick near shore. Mind their nets when you depart.",
    gossipy: "The fishermen say the shoals have shifted. They say that whenever the catch is poor.",
    austere: "Fishing craft are working nearby. Keep outside their nets.",
    enterprising: "The fishing fleet is active. A strong catch will soften food prices.",
    reflective: "The fishermen read these waters more closely than any chartmaker."
  },
  disliked: {
    cordial: "I will offer civility, captain, though your name has reached us ahead of you.",
    vigilant: "Your reputation has reached the customs house. Expect close attention.",
    gossipy: "People here know your name, captain, and not from a flattering song.",
    austere: "Your standing is poor. Conduct yourself accordingly.",
    enterprising: "Bad credit closes doors faster than cannon fire. Improve yours.",
    reflective: "A reputation is another wake: difficult to outrun once made."
  },
  liked: {
    cordial: "Your good name reached us before your sail did. You are welcome here.",
    vigilant: "Your record is sound. That makes every other matter simpler.",
    gossipy: "For once the quay speaks well of a captain, and that captain is you.",
    austere: "Your standing is satisfactory. We can do business directly.",
    enterprising: "Good credit is cargo that takes no hold space. Yours is improving.",
    reflective: "Trust travels slowly between ports, but yours has arrived."
  },
  politics: {
    cordial: ({ noun }) => `Relations with ${noun} are strained. I would rather see their merchants than their guns.`,
    vigilant: ({ adjective }) => `${adjective} agents are watched closely here. These are unsettled times.`,
    gossipy: ({ noun }) => `Half the quay expects trouble with ${noun}; the other half is selling supplies for it.`,
    austere: ({ sentenceNoun }) => `${sentenceNoun} remains an enemy power. Speak carefully.`,
    enterprising: ({ noun }) => `Conflict with ${noun} closes one market and opens three less respectable ones.`,
    reflective: ({ noun }) => `Our quarrel with ${noun} began before this tide and may outlast many more.`
  }
});

const TOPIC_EXPRESSION_IDS = Object.freeze({
  pirates: "afraid",
  storm: "concerned",
  warships: "wary",
  merchants: "attentive",
  fishermen: "pleased",
  disliked: "wary",
  liked: "happy",
  politics: "stern"
});

const PERSONALITY_EXPRESSION_IDS = Object.freeze({
  cordial: "happy",
  vigilant: "attentive",
  gossipy: "pleased",
  austere: "stern",
  enterprising: "attentive",
  reflective: "thoughtful"
});

export function portPersonalityForKey(identityKey) {
  if (typeof identityKey !== "string" || identityKey.trim() === "") {
    throw new Error("Port personality requires an identity key");
  }
  return PORT_PERSONALITY_IDS[hashString32(identityKey) % PORT_PERSONALITY_IDS.length];
}

export function portGreetingForPersonality({
  ...options
}) {
  return portGreetingPresentationForPersonality(options).text;
}

export function portGreetingPresentationForPersonality({
  personalityId,
  cityName,
  localHour,
  localFlavor,
  prioritizeLocalFlavor = false,
  visitCount = 1,
  dayIndex = 0,
  nearbyShips = {},
  stormy = false,
  playerStanding = 0,
  rivalTerms = null,
  shipyardRumor = null,
  rulerRumor = null,
  historicalGossip = null,
  speakerReligionId = null,
  listenerReligionId = null,
  greetingStyleId
}) {
  if (!PORT_PERSONALITY_IDS.includes(personalityId)) {
    throw new Error(`Unknown port personality: ${personalityId}`);
  }
  if (typeof localFlavor !== "string" || localFlavor.trim() === "") {
    throw new Error("Port greeting requires local arrival flavor");
  }
  if (typeof prioritizeLocalFlavor !== "boolean") {
    throw new Error("Port greeting local-flavor priority must be boolean");
  }
  if (!Number.isFinite(localHour) || localHour < 0 || localHour >= 24) {
    throw new Error(`Port greeting requires a valid local hour: ${localHour}`);
  }
  if (!Object.values(PORT_CITY_STAFF_GREETING_STYLE).includes(greetingStyleId)) {
    throw new Error(`Unknown port greeting style: ${greetingStyleId}`);
  }
  const communityLeader = greetingStyleId === PORT_CITY_STAFF_GREETING_STYLE.COMMUNITY_LEADER;
  const seed = `${personalityId}|${cityName}|${visitCount}|${dayIndex}`;
  const salutation = communityLeader ? null : localTimeGreeting(localHour);
  const topic = portGreetingTopic({ nearbyShips, stormy, playerStanding, rivalTerms, seed });
  const prioritizeArrival = (prioritizeLocalFlavor || communityLeader) &&
    topic !== "pirates" && topic !== "storm";
  const presentedTopic = prioritizeArrival ? null : topic;
  const religiousGreeting = presentedTopic !== "pirates" && presentedTopic !== "storm" &&
    speakerReligionId && listenerReligionId
    ? occasionalReligiousGreeting({
        speakerReligionId,
        listenerReligionId,
        key: seed
      })
    : null;
  const rulerLine = !prioritizeArrival && shouldTellRulerRumor(presentedTopic, rulerRumor)
    ? rulerRumorLine(personalityId, rulerRumor)
    : null;
  const historyLine = !prioritizeArrival && !rulerLine && shouldTellHistoricalGossip(presentedTopic, historicalGossip)
    ? historicalGossipLine(
        personalityId,
        historicalGossip,
        speakerReligionId,
        listenerReligionId
      )
    : null;
  const shipyardLine = !prioritizeArrival && !rulerLine && !historyLine &&
    shouldTellShipyardRumor(personalityId, presentedTopic, shipyardRumor, seed)
    ? shipyardRumorLine(personalityId, shipyardRumor)
    : null;
  const rumorLine = rulerLine || historyLine || shipyardLine;
  const contextLine = prioritizeArrival
    ? localFlavor
    : rumorLine || (presentedTopic ? contextLineFor(presentedTopic, personalityId, rivalTerms) : localFlavor);
  const opening = religiousGreeting || salutation;
  return Object.freeze({
    text: opening ? `${opening}  ${contextLine}` : contextLine,
    expressionId: rulerLine
      ? "attentive"
      : historyLine
      ? (personalityId === "gossipy" ? "pleased" : "attentive")
      : shipyardLine
      ? (personalityId === "gossipy" ? "pleased" : "attentive")
      : presentedTopic
      ? TOPIC_EXPRESSION_IDS[presentedTopic]
      : PERSONALITY_EXPRESSION_IDS[personalityId]
  });
}

function shouldTellHistoricalGossip(topic, gossip) {
  return Boolean(gossip) && topic !== "pirates" && topic !== "storm";
}

function historicalGossipLine(
  personalityId,
  gossip,
  speakerReligionId,
  listenerReligionId
) {
  if (gossip.id === "diet-of-worms" && speakerReligionId && listenerReligionId) {
    return dietOfWormsGossip({ speakerReligionId, listenerReligionId });
  }
  const report = sentence(gossip.report);
  if (personalityId === "austere") return `News from ${gossip.place}: ${report}`;
  if (personalityId === "vigilant") return `Reports from ${gossip.place}: ${report}`;
  if (personalityId === "cordial") return `Travelers from ${gossip.place} say ${lowerFirst(report)}`;
  if (personalityId === "enterprising" || personalityId === "reflective") return report;
  return `Have you heard? ${report}`;
}

function localTimeGreeting(localHour) {
  if (localHour >= 5 && localHour < 12) return "Good morning, captain.";
  if (localHour < 18) return "Good afternoon, captain.";
  return "Good evening, captain.";
}

function sentence(value) {
  const text = String(value || "").trim();
  if (text === "") throw new Error("Historical gossip has an empty report");
  const capitalized = text.charAt(0).toUpperCase() + text.slice(1);
  return /[.!?]$/.test(capitalized) ? capitalized : `${capitalized}.`;
}

function shouldTellRulerRumor(topic, rumor) {
  return Boolean(rumor) && topic !== "pirates" && topic !== "storm";
}

function rulerRumorLine(personalityId, rumor) {
  const former = rumor.previousRuler.displayName;
  const current = rumor.displayName;
  const realm = factionNounPhrase(rumor.factionId);
  if (personalityId === "austere") return `Court notice: ${former} is gone. ${current} now rules ${realm}.`;
  if (personalityId === "enterprising") return `${current} now rules ${realm}. A new ruler always means new contracts.`;
  if (personalityId === "reflective") return `Crowns change hands: ${current} now rules ${realm} after ${former}.`;
  if (personalityId === "vigilant") return `${current} has taken power in ${realm}. The harbor watch expects policy to follow.`;
  if (personalityId === "cordial") return `News from ${realm}: ${current} has succeeded ${former}. May the change be peaceful.`;
  return `Have you heard? ${former} is gone, and ${current} now rules ${realm}.`;
}

function shouldTellShipyardRumor(personalityId, topic, rumor, seed) {
  if (!rumor || topic === "pirates" || topic === "storm") return false;
  if (rumor.local === true) return true;
  if (personalityId === "gossipy") return true;
  return hashString32(`${seed}|shipyard-rumor`) % 3 === 0;
}

function shipyardRumorLine(personalityId, rumor) {
  if (typeof rumor.shipProseLabel !== "string" || rumor.shipProseLabel === "") {
    throw new Error("Shipyard rumor requires a prose-form ship label");
  }
  const hull = rumor.shipProseLabel;
  shipyardListingCondition(rumor.source);
  const preOwned = rumor.source === "trade-in";
  if (rumor.local === true) {
    return preOwned
      ? `Our shipyard has a pre-owned ${hull} for sale.`
      : `Our shipyard has a new ${hull} for sale.`;
  }
  if (personalityId === "austere") {
    return preOwned
      ? `Shipyard report: a pre-owned ${hull} is for sale in ${rumor.portName}.`
      : `Shipyard report: a new ${hull} is for sale in ${rumor.portName}.`;
  }
  if (personalityId === "enterprising") {
    return preOwned
      ? `There is profit in news: a pre-owned ${hull} is for sale in ${rumor.portName}.`
      : `There is profit in news: a new ${hull} is for sale in ${rumor.portName}.`;
  }
  if (personalityId === "reflective") {
    return preOwned
      ? `Word travels ahead of wakes. A pre-owned ${hull} is for sale in ${rumor.portName}.`
      : `Word travels ahead of wakes. A new ${hull} is for sale in ${rumor.portName}.`;
  }
  return preOwned
    ? `I hear there is a pre-owned ${hull} for sale in ${rumor.portName}.`
    : `I hear there is a new ${hull} for sale in ${rumor.portName}.`;
}

function lowerFirst(value) {
  const text = String(value || "ship");
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function portGreetingTopic({ nearbyShips, stormy, playerStanding, rivalTerms, seed }) {
  if ((nearbyShips.pirates || 0) > 0) return "pirates";
  const candidates = [];
  if (stormy) candidates.push("storm");
  if ((nearbyShips.warships || 0) > 0) candidates.push("warships");
  if ((nearbyShips.merchants || 0) >= 2) candidates.push("merchants");
  if ((nearbyShips.fishermen || 0) > 0) candidates.push("fishermen");
  if (playerStanding <= -15) candidates.push("disliked");
  else if (playerStanding >= 10) candidates.push("liked");
  if (rivalTerms) candidates.push("politics");
  return candidates.length > 0 ? choose(candidates, `${seed}|topic`) : null;
}

function contextLineFor(topic, personalityId, rivalTerms) {
  const line = CONTEXT_LINES[topic]?.[personalityId];
  if (!line) throw new Error(`Missing ${topic} line for ${personalityId}`);
  if (typeof line !== "function") return line;
  assertRivalTerms(rivalTerms);
  return line(rivalTerms);
}

function assertRivalTerms(rivalTerms) {
  if (!rivalTerms || typeof rivalTerms !== "object") throw new Error("Political gossip requires rival terms");
  for (const form of ["noun", "sentenceNoun", "adjective"]) {
    if (typeof rivalTerms[form] !== "string" || rivalTerms[form].trim() === "") {
      throw new Error(`Political gossip requires rival ${form}`);
    }
  }
}

function choose(values, key) {
  return values[hashString32(key) % values.length];
}

function hashString32(value) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
