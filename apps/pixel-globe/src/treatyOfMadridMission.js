import {
  CANONICAL_PORTS,
  canonicalPortDisplayName,
  findCanonicalPort,
  portMatchesCanonicalReference
} from "./canonicalPorts.js";
import { DIPLOMACY_WAR } from "./factions.js";
import { historicalEventOccurred } from "./historicalGossip.js";
import { QUEST_JOURNEY_TRIGGER_DESTINATION_CLOSER } from "./questJourneyDialogue.js";
import { gameMinuteForDate } from "./rulers.js";
import { adjustSovereignAuthority } from "./sovereignAuthority.js";
import { greatCircleDistanceKm } from "./worldDistance.js";
import { makeDiplomaticPeace, worldDiplomacyBetween } from "./worldDiplomacy.js";

export const TREATY_OF_MADRID_MISSION_ID = "treaty-of-madrid";
export const TREATY_OF_MADRID_FRENCH_SIDE = "french";
export const TREATY_OF_MADRID_IMPERIAL_SIDE = "imperial";
export const TREATY_OF_MADRID_ENVOY_COUNT = 2;
export const TREATY_OF_MADRID_REWARD = 900;
export const BATTLE_OF_PAVIA_MINUTE = gameMinuteForDate(1525, 2, 24);

const FRENCH_ORIGIN_REFS = Object.freeze([
  CANONICAL_PORTS.PARIS,
  CANONICAL_PORTS.BORDEAUX,
  CANONICAL_PORTS.MARSEILLE
]);
const IMPERIAL_ORIGIN_REFS = Object.freeze([
  CANONICAL_PORTS.BARCELONA,
  CANONICAL_PORTS.VALENCIA,
  CANONICAL_PORTS.SEVILLE,
  CANONICAL_PORTS.GENT
]);
const FRENCH_TARGET_REFS = Object.freeze([
  CANONICAL_PORTS.BARCELONA,
  CANONICAL_PORTS.VALENCIA,
  CANONICAL_PORTS.SEVILLE,
  CANONICAL_PORTS.GENT
]);
const IMPERIAL_TARGET_REFS = Object.freeze([
  CANONICAL_PORTS.BORDEAUX,
  CANONICAL_PORTS.PARIS,
  CANONICAL_PORTS.MARSEILLE
]);

export function treatyOfMadridMissionPlanForCity(state, city, portCities, context = {}) {
  if (!state?.memory?.quests || !city || !Array.isArray(portCities)) return null;
  const side = treatyOfferSide(city);
  if (!side || treatyMissionAlreadyResolved(state.memory.quests)) return null;
  const simMinute = context.simMinute ?? state.survival?.lastMinute ?? 0;
  if (simMinute < BATTLE_OF_PAVIA_MINUTE) return null;
  if (!historicalEventOccurred("battle-of-pavia", simMinute, context.historicalWorldState)) {
    return null;
  }
  const target = preferredTreatyTarget(side, portCities);
  if (!target) return null;
  const distanceKm = Math.round(greatCircleDistanceKm(city, target));
  return Object.freeze({
    id: TREATY_OF_MADRID_MISSION_ID,
    side,
    origin: city,
    destination: target,
    distanceKm,
    reward: TREATY_OF_MADRID_REWARD,
    envoyCount: TREATY_OF_MADRID_ENVOY_COUNT,
    roleLabel: side === TREATY_OF_MADRID_FRENCH_SIDE
      ? "French negotiator"
      : "Imperial commissioner",
    dialogue: treatyOfMadridDialogue(side, city, target)
  });
}

export function isTreatyOfMadridQuest(quest) {
  return quest?.treatyOfMadridMissionId === TREATY_OF_MADRID_MISSION_ID;
}

export function removeSiblingTreatyOfMadridOffers(quests, acceptedQuest) {
  if (!isTreatyOfMadridQuest(acceptedQuest)) {
    throw new Error(`Not a Treaty of Madrid mission: ${acceptedQuest?.id || "missing"}`);
  }
  if (!quests?.passengerOffers || typeof quests.passengerOffers !== "object") {
    throw new Error("Treaty of Madrid acceptance requires passenger offers");
  }
  for (const [key, offer] of Object.entries(quests.passengerOffers)) {
    if (isTreatyOfMadridQuest(offer)) delete quests.passengerOffers[key];
  }
}

export function treatyOfMadridOfferStillValid(state, quest) {
  if (!isTreatyOfMadridQuest(quest)) return true;
  if (treatyMissionAlreadyResolved(state.memory.quests)) return false;
  return worldDiplomacyBetween(state.relations.diplomacy, "france", "habsburg") === DIPLOMACY_WAR;
}

export function treatyOfMadridJournalTitle(quest) {
  if (!isTreatyOfMadridQuest(quest)) throw new Error("Treaty journal title requires its quest");
  return "TREATY OF MADRID";
}

export function treatyOfMadridJournalStep(quest) {
  if (!isTreatyOfMadridQuest(quest)) throw new Error("Treaty journal step requires its quest");
  return quest.stage === "return"
    ? `RETURN THE SEALED TREATY TO ${quest.originName.toUpperCase()}`
    : `CARRY THE DELEGATION TO ${quest.targetName.toUpperCase()}`;
}

export function completeTreatyOfMadridMission(state, quest, simMinute) {
  if (!isTreatyOfMadridQuest(quest)) {
    throw new Error(`Treaty completion requires its mission: ${quest?.id || "missing"}`);
  }
  if (!Number.isFinite(simMinute) || simMinute < 0) {
    throw new Error(`Invalid Treaty of Madrid completion minute: ${simMinute}`);
  }
  if (quest.treatyOfMadridResolution) return quest.treatyOfMadridResolution;
  const diplomacyEvents = [
    ...makeDiplomaticPeace(
      state.relations.diplomacy,
      "france",
      "habsburg",
      simMinute,
      { reason: "Treaty of Madrid" }
    ),
    ...makeDiplomaticPeace(
      state.relations.diplomacy,
      "france",
      "spain",
      simMinute,
      { reason: "Treaty of Madrid" }
    )
  ];
  const authorityEvents = [
    adjustSovereignAuthority(state.relations.authority, "habsburg", 1.2, {
      simMinute,
      source: "treaty-of-madrid",
      detail: "Francis I accepts Charles V's release terms"
    }),
    adjustSovereignAuthority(state.relations.authority, "spain", 0.4, {
      simMinute,
      source: "treaty-of-madrid",
      detail: "The Treaty of Madrid is signed"
    }),
    adjustSovereignAuthority(state.relations.authority, "france", -0.6, {
      simMinute,
      source: "treaty-of-madrid",
      detail: "Francis I accepts captivity terms"
    })
  ].filter(Boolean);
  quest.treatyOfMadridResolution = Object.freeze({
    francisReleased: true,
    diplomacyEvents: Object.freeze(diplomacyEvents),
    authorityEvents: Object.freeze(authorityEvents)
  });
  return quest.treatyOfMadridResolution;
}

function treatyOfferSide(city) {
  if (city.factionId === "france" && matchesAny(city, FRENCH_ORIGIN_REFS)) {
    return TREATY_OF_MADRID_FRENCH_SIDE;
  }
  if (["spain", "habsburg"].includes(city.factionId) && matchesAny(city, IMPERIAL_ORIGIN_REFS)) {
    return TREATY_OF_MADRID_IMPERIAL_SIDE;
  }
  return null;
}

function preferredTreatyTarget(side, portCities) {
  const references = side === TREATY_OF_MADRID_FRENCH_SIDE
    ? FRENCH_TARGET_REFS
    : IMPERIAL_TARGET_REFS;
  const factionIds = side === TREATY_OF_MADRID_FRENCH_SIDE
    ? new Set(["spain", "habsburg"])
    : new Set(["france"]);
  for (const reference of references) {
    const port = findCanonicalPort(portCities, reference, "Treaty of Madrid mission");
    if (port && factionIds.has(port.factionId)) return port;
  }
  return null;
}

function treatyMissionAlreadyResolved(quests) {
  if (quests.completed?.[TREATY_OF_MADRID_MISSION_ID] || quests.failed?.[TREATY_OF_MADRID_MISSION_ID]) {
    return true;
  }
  return isTreatyOfMadridQuest(quests.active) || isTreatyOfMadridQuest(quests.passengerActive);
}

function matchesAny(city, references) {
  return references.some((reference) => portMatchesCanonicalReference(city, reference));
}

function treatyOfMadridDialogue(side, origin, target) {
  const originName = canonicalPortDisplayName(origin);
  const targetName = canonicalPortDisplayName(target);
  if (side === TREATY_OF_MADRID_FRENCH_SIDE) {
    return Object.freeze({
      offer: `Francis I is a prisoner in Madrid. Louise of Savoy sends negotiators to seek his release. Carry us to ${targetName}; an Imperial escort will take us inland, then bring us home with Charles V's answer.`,
      underway: `Our safe conduct leads through ${targetName} to Madrid. The king's freedom depends on what Charles will put under seal.`,
      negotiationOpening: `Our Imperial safe conduct is ready. We go overland to Madrid now; keep the ship at ${targetName} until we return.`,
      negotiation: "The envoys return with the Treaty of Madrid under seal. Francis accepts Charles's terms; at the Bidasoa, the king will be exchanged for his two sons.",
      returnUnderway: `The treaty is sealed. Carry us to ${originName}; Louise must arrange the exchange before Francis crosses into France.`,
      homecoming: "The treaty has reached the French court. Francis will cross the Bidasoa into France while his sons enter Imperial custody.",
      intercession: "Stay your fire! This ship carries the Treaty of Madrid delegation under Imperial and French safe conduct.",
      journeyEvents: treatyTermsJourneyEvent(side)
    });
  }
  return Object.freeze({
    offer: `Francis I remains prisoner in Madrid. Charles V sends his release articles to Louise of Savoy's council. Carry us to ${targetName}, then bring her sealed answer back.`,
    underway: `The Emperor's articles are bound for ${targetName}. France must answer before Francis can leave Madrid.`,
    negotiationOpening: "The Emperor's articles are ready for the French regent's agents. Take us ashore; their answer must return under the same seal.",
    negotiation: "Louise's agents accept negotiations on Charles's terms. Their sealed answer will go to Madrid, where the treaty and Francis's exchange can be completed.",
    returnUnderway: `We carry France's sealed answer to ${originName}. Charles's ministers in Madrid can now finish the treaty.`,
    homecoming: "Charles has received France's answer. The Treaty of Madrid is signed, and Francis will be exchanged for his sons at the Bidasoa.",
    intercession: "Stay your fire! This ship carries the Treaty of Madrid delegation under Imperial and French safe conduct.",
    journeyEvents: treatyTermsJourneyEvent(side)
  });
}

function treatyTermsJourneyEvent(side) {
  return Object.freeze([
    Object.freeze({
      id: `treaty-of-madrid-terms-${side}`,
      speakerKind: "quest-passenger",
      trigger: QUEST_JOURNEY_TRIGGER_DESTINATION_CLOSER,
      expressionId: "concerned",
      text: "Charles demands Burgundy, Francis's claims in Italy, marriage to Eleanor, and the king's sons as hostages. Freedom has acquired a very long invoice."
    })
  ]);
}
