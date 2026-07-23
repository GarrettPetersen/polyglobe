import {
  dietOfWormsGossip,
  occasionalReligiousGreeting
} from "./religiousDialogue.js";

export const PORT_PERSONALITY_IDS = Object.freeze([
  "cordial",
  "vigilant",
  "gossipy",
  "austere",
  "enterprising",
  "reflective"
]);

const BASE_LINES = Object.freeze({
  cordial: {
    first: [
      (city) => `Welcome to ${city}, captain. Any honest sailor can find a chair by my fire.`,
      (city) => `${city} has room for another friendly face. Come in, captain.`
    ],
    returning: [
      (city) => `${city} remembers a familiar sail. Welcome back.`,
      () => "Back again, captain. It is good to see the sea returned you safely."
    ]
  },
  vigilant: {
    first: [
      (city) => `Welcome to ${city}. State your ship, cargo, and business plainly.`,
      () => "Come in, captain, but keep your papers ready. I trust a tidy manifest."
    ],
    returning: [
      () => "I know your sail now, captain. Let us see whether your papers remain in order.",
      (city) => `Back in ${city}. I hope you have kept a sharper watch than some.`
    ]
  },
  gossipy: {
    first: [
      (city) => `Welcome to ${city}. You have arrived on a day thick with rumors.`,
      () => "A new captain means new stories. Sit down before the quay invents its own."
    ],
    returning: [
      () => "There you are again. Half the quay has already guessed where you have been.",
      (city) => `${city} has been talking in your absence, captain.`
    ]
  },
  austere: {
    first: [
      (city) => `${city}. I am factor here. Keep your account straight and we will understand one another.`,
      () => "Your name, your ship, your business. Brevity saves us both coin."
    ],
    returning: [
      () => "You have returned. Your ledger remains open.",
      (city) => `${city} again, captain. Let us proceed without ceremony.`
    ]
  },
  enterprising: {
    first: [
      (city) => `Welcome to ${city}. A quick captain and a quick ledger can both prosper here.`,
      () => "Come in. Every new sail is a new market, if its captain has nerve."
    ],
    returning: [
      () => "Back with another hold to turn into coin, I hope.",
      (city) => `${city} welcomes repeat business, captain. So do I.`
    ]
  },
  reflective: {
    first: [
      (city) => `Welcome to ${city}. Every wake carries news, if one knows how to read it.`,
      () => "Sit, captain. The sea teaches quickly, but rarely explains itself."
    ],
    returning: [
      () => "You return with a different wake behind you. Voyages leave their mark.",
      (city) => `${city} is much as you left it, though no port is ever truly still.`
    ]
  }
});

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
  returning = false,
  localFlavor,
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
  listenerReligionId = null
}) {
  if (!PORT_PERSONALITY_IDS.includes(personalityId)) {
    throw new Error(`Unknown port personality: ${personalityId}`);
  }
  const phase = returning ? "returning" : "first";
  const seed = `${personalityId}|${cityName}|${visitCount}|${dayIndex}`;
  const baseFactory = choose(BASE_LINES[personalityId][phase], `${seed}|base`);
  const base = baseFactory(cityName);
  const topic = portGreetingTopic({ nearbyShips, stormy, playerStanding, rivalTerms, seed });
  const religiousGreeting = topic !== "pirates" && topic !== "storm" &&
    speakerReligionId && listenerReligionId
    ? occasionalReligiousGreeting({
        speakerReligionId,
        listenerReligionId,
        key: seed
      })
    : null;
  const rulerLine = shouldTellRulerRumor(topic, rulerRumor)
    ? rulerRumorLine(personalityId, rulerRumor)
    : null;
  const historyLine = !rulerLine && shouldTellHistoricalGossip(topic, historicalGossip)
    ? historicalGossipLine(
        personalityId,
        historicalGossip,
        speakerReligionId,
        listenerReligionId
      )
    : null;
  const shipyardLine = !rulerLine && !historyLine && shouldTellShipyardRumor(personalityId, topic, shipyardRumor, seed)
    ? shipyardRumorLine(personalityId, shipyardRumor)
    : null;
  const rumorLine = rulerLine || historyLine || shipyardLine;
  const contextLine = rumorLine || (topic ? contextLineFor(topic, personalityId, rivalTerms) : localFlavor);
  return Object.freeze({
    text: `${religiousGreeting || base} ${contextLine}`.trim(),
    expressionId: rulerLine
      ? "attentive"
      : historyLine
      ? (personalityId === "gossipy" ? "pleased" : "attentive")
      : shipyardLine
      ? (personalityId === "gossipy" ? "pleased" : "attentive")
      : topic
      ? TOPIC_EXPRESSION_IDS[topic]
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
  if (personalityId === "enterprising") return `${report} ${gossip.tradeImpact}`;
  if (personalityId === "reflective") return `${report} ${gossip.reflection}`;
  if (personalityId === "vigilant") return `Reports from ${gossip.place}: ${report}`;
  if (personalityId === "cordial") return `Travelers from ${gossip.place} say ${lowerFirst(report)}`;
  return `Have you heard? ${report}`;
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
  const realm = rumor.factionName;
  if (personalityId === "austere") return `Court notice: ${former} is gone. ${current} now rules the ${realm}.`;
  if (personalityId === "enterprising") return `${current} now rules the ${realm}. A new ruler always means new contracts.`;
  if (personalityId === "reflective") return `Crowns change hands: ${current} now rules the ${realm} after ${former}.`;
  if (personalityId === "vigilant") return `${current} has taken power in the ${realm}. The harbor watch expects policy to follow.`;
  if (personalityId === "cordial") return `News from the ${realm}: ${current} has succeeded ${former}. May the change be peaceful.`;
  return `Have you heard? ${former} is gone, and ${current} now rules the ${realm}.`;
}

function shouldTellShipyardRumor(personalityId, topic, rumor, seed) {
  if (!rumor || topic === "pirates" || topic === "storm") return false;
  if (personalityId === "gossipy") return true;
  return hashString32(`${seed}|shipyard-rumor`) % 3 === 0;
}

function shipyardRumorLine(personalityId, rumor) {
  const hull = lowerFirst(rumor.shipLabel);
  if (personalityId === "austere") return `Shipyard report: a new ${hull} is for sale in ${rumor.portName}.`;
  if (personalityId === "enterprising") return `There is profit in news: a new ${hull} is for sale in ${rumor.portName}.`;
  if (personalityId === "reflective") return `Word travels ahead of wakes. A new ${hull} is for sale in ${rumor.portName}.`;
  return `I hear there is a new ${hull} for sale in ${rumor.portName}.`;
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
