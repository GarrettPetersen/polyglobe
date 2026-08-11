import { greatCircleDistanceKm } from "./worldDistance.js";

export const EAST_ASIAN_MISSION_NINGBO = "ningbo-tally-dispute";
export const EAST_ASIAN_MISSION_TSUSHIMA = "tsushima-treaty-register";
export const EAST_ASIAN_MISSION_PORTUGUESE_GUNS = "captured-portuguese-guns";
export const EAST_ASIAN_MISSION_RYUKYU = "ryukyu-investiture";
export const EAST_ASIAN_MISSION_GREAT_RITES = "great-rites-memorial";
export const EAST_ASIAN_MISSION_YOSHIHARU = "yoshiharu-seal";
export const NINGBO_DEFECTION_BRIBE = 450;
export const NINGBO_RACE_BONUS = 250;

const NINGBO_FACTIONS = Object.freeze(["hosokawa", "ouchi"]);
const ALL_MISSION_IDS = Object.freeze([
  EAST_ASIAN_MISSION_NINGBO,
  EAST_ASIAN_MISSION_TSUSHIMA,
  EAST_ASIAN_MISSION_PORTUGUESE_GUNS,
  EAST_ASIAN_MISSION_RYUKYU,
  EAST_ASIAN_MISSION_GREAT_RITES,
  EAST_ASIAN_MISSION_YOSHIHARU
]);

const FIXED_MISSIONS = Object.freeze([
  missionDefinition({
    id: EAST_ASIAN_MISSION_TSUSHIMA,
    originName: "Tsushima Fuchu",
    originFactionId: "so",
    destinationName: "Hanseong",
    roleLabel: "Sō envoy",
    reward: 520,
    scenarioId: "east-asian-envoy",
    requiresOutcome: true
  }),
  missionDefinition({
    id: EAST_ASIAN_MISSION_PORTUGUESE_GUNS,
    originName: "Guangzhou",
    originFactionId: "ming",
    destinationName: "Nanjing",
    roleLabel: "artillery founder",
    reward: 640,
    scenarioId: "east-asian-artillery"
  }),
  missionDefinition({
    id: EAST_ASIAN_MISSION_RYUKYU,
    originName: "Fuzhou",
    originFactionId: "ming",
    destinationName: "Naha",
    roleLabel: "investiture envoy",
    reward: 560,
    scenarioId: "east-asian-envoy"
  }),
  missionDefinition({
    id: EAST_ASIAN_MISSION_GREAT_RITES,
    originName: "Nanjing",
    originFactionId: "ming",
    destinationName: "Beijing",
    roleLabel: "memorial bearer",
    reward: 600,
    scenarioId: "east-asian-scholar"
  }),
  missionDefinition({
    id: EAST_ASIAN_MISSION_YOSHIHARU,
    originName: "Kyoto",
    originFactionId: "japan",
    destinationName: "Yamaguchi",
    roleLabel: "shogunal messenger",
    reward: 520,
    scenarioId: "east-asian-envoy"
  })
]);

export function eastAsianMissionPlanForCity(state, city, portCities) {
  assertOfferContext(state, city, portCities);
  const quests = state.memory.quests;
  const ningboPlan = ningboMissionPlan(quests, city, portCities);
  if (ningboPlan) return ningboPlan;
  for (const definition of FIXED_MISSIONS) {
    if (missionAlreadyResolved(quests, definition.id)) continue;
    if (!portMatches(city, definition.originName, definition.originFactionId)) continue;
    const destination = requiredPort(portCities, definition.destinationName, definition.id);
    return freezePlan(definition, city, destination);
  }
  return null;
}

export function isEastAsianMissionQuest(quest) {
  return Boolean(quest && ALL_MISSION_IDS.includes(quest.eastAsianMissionId));
}

export function ningboDelegationManifest(questId, delegationOrigins, destinationPortId) {
  if (typeof questId !== "string" || questId === "") throw new Error("Ningbo delegation requires a quest id");
  if (!delegationOrigins || !Number.isInteger(destinationPortId)) {
    throw new Error("Ningbo delegation requires both origins and Ningbo");
  }
  return Object.freeze(NINGBO_FACTIONS.flatMap((factionId) => {
    const originPortId = delegationOrigins[factionId];
    if (!Number.isInteger(originPortId)) {
      throw new Error(`Ningbo delegation requires a ${factionId} origin`);
    }
    return [
      Object.freeze({
        id: `${questId}-${factionId}-courier`,
        factionId,
        role: "warship",
        shipSlug: "japanese-kuribune",
        originPortId,
        destinationPortId,
        delegationRole: "courier",
        departureDelayMinutes: 0,
        holdProgress: factionId === "hosokawa" ? 0.94 : 0.97
      }),
      Object.freeze({
        id: `${questId}-${factionId}-escort`,
        factionId,
        role: "warship",
        shipSlug: "japanese-sekibune",
        originPortId,
        destinationPortId,
        delegationRole: "escort",
        departureDelayMinutes: 30,
        holdProgress: factionId === "hosokawa" ? 0.90 : 0.93
      })
    ];
  }));
}

export function eastAsianMissionHasOutcomes(quest) {
  return isEastAsianMissionQuest(quest) && [
    EAST_ASIAN_MISSION_NINGBO,
    EAST_ASIAN_MISSION_TSUSHIMA
  ].includes(quest.eastAsianMissionId);
}

export function eastAsianMissionOutcomeOptions(quest) {
  assertMissionQuest(quest);
  if (quest.eastAsianMissionId === EAST_ASIAN_MISSION_NINGBO) {
    const origin = quest.eastAsianStartingFactionId === "hosokawa" ? "Hosokawa" : "Ouchi";
    const rival = quest.eastAsianStartingFactionId === "hosokawa" ? "Ouchi" : "Hosokawa";
    return Object.freeze([
      Object.freeze({ id: "support-origin", label: `Stand by the ${origin} delegation` }),
      Object.freeze({ id: "mediate", label: "Seek a joint hearing" }),
      Object.freeze({
        id: "support-rival",
        label: `Take the ${rival} purse  ${NINGBO_DEFECTION_BRIBE} db`
      })
    ]);
  }
  if (quest.eastAsianMissionId === EAST_ASIAN_MISSION_TSUSHIMA) {
    return Object.freeze([
      Object.freeze({ id: "renew-privileges", label: "Defend Tsushima's privileges" }),
      Object.freeze({ id: "reform-register", label: "Accept a stricter register" }),
      Object.freeze({ id: "expose-false-envoys", label: "Expose the false envoys" })
    ]);
  }
  return Object.freeze([]);
}

export function eastAsianMissionOutcomeResultText(quest, outcomeId) {
  validateMissionOutcome(quest, outcomeId);
  if (quest.eastAsianMissionId === EAST_ASIAN_MISSION_NINGBO) {
    const origin = quest.eastAsianStartingFactionId === "hosokawa" ? "Hosokawa" : "Ouchi";
    const rival = quest.eastAsianStartingFactionId === "hosokawa" ? "Ouchi" : "Hosokawa";
    if (outcomeId === "support-origin") {
      return `The ${rival} escort is beaten. Ningbo enters the ${origin} tally, though the Ming officials plainly resent bloodshed in their roadstead.`;
    }
    if (outcomeId === "mediate") {
      return "The shipping office enters both delegations under a single supervised register. Neither house is pleased enough to riot, which passes for triumph.";
    }
    return `The ${origin} escort is beaten. Ningbo enters the ${rival} tally, while both the Ming officials and your former patrons remember the price of your change of allegiance.`;
  }
  if (outcomeId === "renew-privileges") {
    return "Joseon's council renews Tsushima's trading privileges, but orders every Japanese envoy entered under the Sō seal.";
  }
  if (outcomeId === "reform-register") {
    return "The Sō envoy accepts a stricter register. Joseon keeps its safeguards, and Tsushima keeps the trade on which it lives.";
  }
  return "The forged credentials are laid before the council. Joseon thanks you; Tsushima will remember who opened the packet.";
}

export function validateMissionOutcome(quest, outcomeId) {
  assertMissionQuest(quest);
  const valid = eastAsianMissionOutcomeOptions(quest).some((option) => option.id === outcomeId);
  if (!valid) throw new Error(`Invalid ${quest.eastAsianMissionId} outcome: ${outcomeId}`);
  return outcomeId;
}

export function removeSiblingEastAsianOffers(quests, acceptedQuest) {
  assertMissionQuest(acceptedQuest);
  if (!quests?.passengerOffers || typeof quests.passengerOffers !== "object") {
    throw new Error("East Asian mission acceptance requires passenger offers");
  }
  for (const [key, offer] of Object.entries(quests.passengerOffers)) {
    if (offer?.eastAsianMissionId === acceptedQuest.eastAsianMissionId) delete quests.passengerOffers[key];
  }
}

export function eastAsianMissionDialogue(plan) {
  if (!plan || !ALL_MISSION_IDS.includes(plan.id)) throw new Error(`Unknown East Asian mission plan: ${plan?.id}`);
  if (plan.id === EAST_ASIAN_MISSION_NINGBO) {
    const house = plan.startingFactionId === "hosokawa" ? "Hosokawa" : "Ouchi";
    const rival = plan.startingFactionId === "hosokawa" ? "Ouchi" : "Hosokawa";
    return Object.freeze({
      offer: `${house} merchants have a tally for the Ming trade at Ningbo. The ${rival} have sent a rival mission. Carry me there before their papers reach the shipping office.`,
      underway: `At Ningbo, order matters as much as ink. Our support ships have sailed, and so have the ${rival}. We must reach the shipping office first.`,
      arrival: "Both tallies are before the Ningbo shipping office. The rival escorts wait offshore while the officials demand a settlement."
    });
  }
  if (plan.id === EAST_ASIAN_MISSION_TSUSHIMA) {
    return Object.freeze({
      offer: "Joseon's treaty grants Tsushima limited trade, but false envoys have made every seal suspect. Carry me to Hanseong with the Sō register before the privilege is withdrawn.",
      underway: "Tsushima survives by the Korean crossing. One forged embassy can endanger a hundred honest voyages.",
      arrival: "Joseon's councillors compare the Sō register against a pile of doubtful Japanese credentials. They ask what guarantee Tsushima will give."
    });
  }
  if (plan.id === EAST_ASIAN_MISSION_PORTUGUESE_GUNS) {
    return Object.freeze({
      offer: "We captured Portuguese breech-loading guns and the men who know their measure. Carry me, the patterns, and two proof pieces to Nanjing's arsenals.",
      underway: "The Portuguese gun is not magic. Its advantage is a pattern that can be copied, drilled, and mounted before an enemy returns.",
      arrival: "Nanjing's founders have measured the captured guns. Copies will reinforce the batteries at Guangzhou, Ningbo, and Fuzhou."
    });
  }
  if (plan.id === EAST_ASIAN_MISSION_RYUKYU) {
    return Object.freeze({
      offer: "The investiture patent for the king of Ryukyu is sealed at Fuzhou. Carry me and the imperial gifts to Naha, where Shuri's court is waiting.",
      underway: "Silk, seals, and calendars travel outward; sulfur and island wares return. Ceremony keeps the sea road legible.",
      arrival: "Ryukyu's ministers receive the patent and imperial gifts. The investiture may proceed at Shuri."
    });
  }
  if (plan.id === EAST_ASIAN_MISSION_GREAT_RITES) {
    return Object.freeze({
      offer: "Nanjing's scholars have filled another memorial on the emperor's ancestral rites. Carry it to Beijing before the court decides that silence means consent.",
      underway: "The memorial argues over the name of a dead father. In Beijing, that question can end a living official's career.",
      arrival: "The Grand Secretariat enters the memorial. The Jiajing Emperor has heard one more careful objection, and remains the emperor."
    });
  }
  return Object.freeze({
    offer: "Shogun Ashikaga Yoshiharu has sealed an order confirming the western sea lords' obligations. Carry it from Kyoto to Yamaguchi before private war answers first.",
    underway: "A shogunal seal weighs almost nothing. Whether the Ouchi obey it will reveal how much authority remains behind it.",
    arrival: "Yamaguchi receives Yoshiharu's order in public ceremony. Obedience has been recorded, however carefully its limits were worded."
  });
}

function ningboMissionPlan(quests, city, portCities) {
  if (!NINGBO_FACTIONS.includes(city.factionId) || city.isFactionCapital !== true) return null;
  if (missionAlreadyResolved(quests, EAST_ASIAN_MISSION_NINGBO)) return null;
  const destination = requiredPort(portCities, "Ningbo", EAST_ASIAN_MISSION_NINGBO);
  const delegationOrigins = Object.fromEntries(NINGBO_FACTIONS.map((factionId) => {
    const capital = portCities.find((candidate) => (
      candidate.factionId === factionId && candidate.isFactionCapital === true
    ));
    if (!capital) throw new Error(`Ningbo mission requires a ${factionId} capital`);
    return [factionId, capital.tileId];
  }));
  return freezePlan(missionDefinition({
    id: EAST_ASIAN_MISSION_NINGBO,
    originName: displayName(city),
    originFactionId: city.factionId,
    destinationName: "Ningbo",
    roleLabel: `${city.factionId === "hosokawa" ? "Hosokawa" : "Ouchi"} tally envoy`,
    reward: 700,
    scenarioId: "east-asian-envoy",
    requiresOutcome: true,
    startingFactionId: city.factionId,
    delegationOrigins: Object.freeze(delegationOrigins)
  }), city, destination);
}

function freezePlan(definition, origin, destination) {
  return Object.freeze({
    ...definition,
    origin,
    destination,
    distanceKm: Math.round(greatCircleDistanceKm(origin, destination))
  });
}

function missionAlreadyResolved(quests, missionId) {
  if (quests.active?.eastAsianMissionId === missionId || quests.passengerActive?.eastAsianMissionId === missionId) {
    return true;
  }
  return Object.keys(quests.completed || {}).some((questId) => (
    questId.startsWith(`east-asian-${missionId}-`)
  ));
}

function requiredPort(portCities, expectedName, missionId) {
  const port = portCities.find((candidate) => normalizeName(displayName(candidate)) === normalizeName(expectedName));
  if (!port) throw new Error(`${missionId} requires the placed port ${expectedName}`);
  return port;
}

function portMatches(city, expectedName, factionId) {
  return city.factionId === factionId && normalizeName(displayName(city)) === normalizeName(expectedName);
}

function displayName(city) {
  const value = city?.portAlias || city?.displayCity || city?.city;
  if (typeof value !== "string" || !value.trim()) throw new Error("East Asian mission port has no display name");
  return value.trim();
}

function normalizeName(value) {
  return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function missionDefinition(definition) {
  if (!definition?.id || !definition.originName || !definition.destinationName || !definition.originFactionId) {
    throw new Error("East Asian mission definition is incomplete");
  }
  return Object.freeze({ requiresOutcome: false, startingFactionId: null, ...definition });
}

function assertOfferContext(state, city, portCities) {
  if (!state?.memory?.quests) throw new Error("East Asian missions require quest memory");
  if (!city || !Number.isInteger(city.tileId)) throw new Error("East Asian mission origin is not a placed port");
  if (!Array.isArray(portCities)) throw new Error("East Asian missions require the placed port catalog");
}

function assertMissionQuest(quest) {
  if (!isEastAsianMissionQuest(quest)) throw new Error(`Not an East Asian mission quest: ${quest?.id}`);
}
