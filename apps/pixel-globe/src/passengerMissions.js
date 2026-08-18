import {
  cityKey,
  cityLabel,
  cargoFree,
  factionReputation,
  isEnvoyQuest,
  sovereignTradeOpenToFaction
} from "./gameState.js";
import {
  DIPLOMACY_ALLY,
  DIPLOMACY_WAR,
  factionById
} from "./factions.js";
import { greatCircleDistanceKm } from "./worldDistance.js";
import { rulerAtMinute } from "./rulers.js";
import { QUEST_JOURNEY_TRIGGER_DESTINATION_CLOSER } from "./questJourneyDialogue.js";
import {
  SOVEREIGN_TRADE_ACCESS_POLICIES,
  sovereignTradePolicyById
} from "./sovereignTradeAccess.js";
import { islamicReligionForHome } from "./characterReligion.js";
import {
  isReligiousPassengerQuest,
  religiousMissionById,
  religiousMissionByScenarioId,
  religiousMissionDialogueText,
  religiousMissionRoleLabel,
  religiousPassengerDistanceIsAllowed,
  religiousPassengerPlan,
  SEPTEMBER_TESTAMENT_MISSION_ID
} from "./religiousMissions.js";
import {
  COURT_ENVOY_QUEST_KIND,
  STATUS_ENVOY_QUEST_KIND,
  TRIBUTE_ENVOY_QUEST_KIND,
  TRIBUTE_MISSION_REPUTATION_REQUIRED,
  diplomaticStatusMissionPlan,
  statusProposalText,
  tributeCargoSpace,
  tributeCargoSummary,
  tributeMissionPlan
} from "./diplomaticMissions.js";
import { courtMatterDialogue, courtMissionPlan } from "./courtPolitics.js";
import {
  CANONICAL_PORTS,
  findCanonicalPort,
  portMatchesCanonicalReference
} from "./canonicalPorts.js";
import {
  EAST_ASIAN_MISSION_NINGBO,
  eastAsianMissionDialogue,
  eastAsianMissionPlanForCity,
  isEastAsianMissionQuest,
  ningboDelegationManifest
} from "./eastAsianQuestlines.js";
import {
  QUEST_ITINERARY_OPEN,
  QUEST_ITINERARY_ORDERED,
  createQuestItinerary
} from "./questItinerary.js";
import {
  TREATY_OF_MADRID_MISSION_ID,
  isTreatyOfMadridQuest,
  treatyOfMadridMissionPlanForCity,
  treatyOfMadridOfferStillValid
} from "./treatyOfMadridMission.js";

export const PASSENGER_SPAWN_CHANCE = 0.12;
export const PASSENGER_MIN_DISTANCE_KM = 900;
export const PASSENGER_MAX_DISTANCE_KM = 4200;
export const PASSENGER_PREFERRED_DISTANCE_KM = 2400;
export const PASSENGER_ROLL_PERIOD_MINUTES = 7 * 24 * 60;
export const ENVOY_SPAWN_CHANCE = 0.08;
export const HAJJ_PASSENGER_SCENARIO_ID = "hajj";
export const HAJJ_PASSENGER_SCENARIO_CHANCE = 0.35;
export const HAJJ_RETURN_PASSENGER_SCENARIO_ID = "hajj-return";
export const HAJJ_RETURN_PASSENGER_SCENARIO_CHANCE = 0.65;
export const HAJJ_PASSENGER_MIN_DISTANCE_KM = 300;
export const HAJJ_PASSENGER_MAX_DISTANCE_KM = 16000;
export const SCRIPTED_RELIGIOUS_PASSENGER_OFFER_CHANNEL = "scripted-religious";

const HAJJ_PASSENGER_SCENARIO = Object.freeze({
  id: HAJJ_PASSENGER_SCENARIO_ID,
  expressionId: "attentive",
  namePort: "origin"
});

const HAJJ_RETURN_PASSENGER_SCENARIO = Object.freeze({
  id: HAJJ_RETURN_PASSENGER_SCENARIO_ID,
  expressionId: "happy",
  namePort: "destination"
});

export const PASSENGER_SCENARIOS = Object.freeze([
  Object.freeze({ id: "return-home", expressionId: "sad", namePort: "destination" }),
  Object.freeze({ id: "shipwrecked-sailor", expressionId: "afraid", namePort: "origin" }),
  Object.freeze({ id: "family-letter", expressionId: "sad", namePort: "origin" }),
  Object.freeze({ id: "patron-papers", expressionId: "neutral", namePort: "origin" })
]);

export function passengerOfferForCity(state, city, portCities, context = {}) {
  const quests = questMemory(state);
  if (quests.passengerActive || (quests.active && quests.active.kind !== "delivery")) return null;
  const treatyPlan = quests.active
    ? null
    : treatyOfMadridMissionPlanForCity(state, city, portCities, context);
  if (treatyPlan) {
    const existing = pendingPassengerOfferForCity(state, city);
    if (isTreatyOfMadridQuest(existing)) return existing;
    const quest = buildTreatyOfMadridQuest(treatyPlan, context);
    if (!passengerOfferWasDeclinedThisPeriod(quests, quest, context.simMinute)) {
      quests.passengerOffers[cityKey(city)] = quest;
      return quest;
    }
  }
  const existing = pendingOrdinaryPassengerOfferForCity(state, city);
  if (existing) return existing;

  const eastAsianPlan = eastAsianMissionPlanForCity(state, city, portCities);
  if (eastAsianPlan) {
    const quest = buildEastAsianPassengerQuest(eastAsianPlan);
    if (!passengerOfferWasDeclinedThisPeriod(quests, quest, context.simMinute)) {
      if (typeof context.createCharacter === "function") {
        const scenario = {
          id: eastAsianPlan.scenarioId,
          expressionId: "attentive",
          namePort: "origin"
        };
        const character = context.createCharacter({
          quest,
          origin: city,
          destination: eastAsianPlan.destination,
          scenario
        });
        if (character) {
          quest.passenger = character;
          quest.passengerName = character.name;
        }
      }
      quests.passengerOffers[cityKey(city)] = quest;
      return quest;
    }
  }

  const period = passengerRollPeriod(context.simMinute);
  const originKey = cityKey(city);
  const rollKey = `${originKey}|${period}`;
  const hajjReturnPlan = hajjReturnPassengerPlan(city, portCities, context, rollKey);
  const hajjPlan = hajjReturnPlan
    ? null
    : hajjPassengerPlan(city, portCities, context, rollKey);
  const religiousPlan = hajjReturnPlan || hajjPlan
    ? null
    : religiousPassengerPlan(state, city, portCities, {
        ...context,
        excludedReligiousMissionIds: context.religiousMissionId === undefined
          ? [
              ...(context.excludedReligiousMissionIds || []),
              SEPTEMBER_TESTAMENT_MISSION_ID
            ]
          : context.excludedReligiousMissionIds || []
      }, rollKey);
  const specialPlan = hajjReturnPlan || hajjPlan || religiousPlan;
  const forcedReligiousMission = context.religiousMissionId !== undefined ||
    religiousMissionByScenarioId(context.scenarioId) !== null;
  const forcedHajjMission = [
    HAJJ_PASSENGER_SCENARIO_ID,
    HAJJ_RETURN_PASSENGER_SCENARIO_ID
  ].includes(context.scenarioId);
  if ((forcedHajjMission || forcedReligiousMission) && !specialPlan) {
    return null;
  }
  const destination = specialPlan?.destination || choosePassengerDestination(city, portCities, context);
  if (!destination) return null;

  if (quests.passengerRolls[rollKey]) return null;
  quests.passengerRolls[rollKey] = true;

  const spawnChance = passengerSpawnChance(context.spawnChance);
  if (spawnChance < 1 && seededFraction(`${rollKey}|passenger`) >= spawnChance) return null;

  const distanceKm = specialPlan?.distanceKm ?? greatCircleDistanceKm(city, destination);
  const scenario = specialPlan?.scenario || choosePassengerScenario(
    `${rollKey}|${cityKey(destination)}`,
    context
  );
  const quest = createPassengerQuest(city, destination, scenario, distanceKm, period, context, {
    passengerReligionId: specialPlan?.passengerReligionId || null,
    religiousMissionId: religiousPlan?.religiousMissionId || null,
    catholicContraband: religiousPlan?.mission?.catholicContraband === true,
    religiousItinerary: religiousPlan?.itinerary || null
  });
  quests.passengerOffers[originKey] = quest;
  return quest;
}

export function septemberTestamentOfferForCity(state, city, portCities, context = {}) {
  const quests = questMemory(state);
  if (quests.passengerActive || (quests.active && quests.active.kind !== "delivery")) return null;
  const existing = pendingPassengerOffersForCity(state, city)
    .find((offer) => offer.religiousMissionId === SEPTEMBER_TESTAMENT_MISSION_ID);
  if (existing) return existing;

  const period = passengerRollPeriod(context.simMinute);
  const originKey = cityKey(city);
  const plan = religiousPassengerPlan(state, city, portCities, {
    ...context,
    religiousMissionId: SEPTEMBER_TESTAMENT_MISSION_ID,
    religiousScenarioChance: 1
  }, `${originKey}|${period}|${SCRIPTED_RELIGIOUS_PASSENGER_OFFER_CHANNEL}`);
  if (!plan) return null;

  const quest = createPassengerQuest(
    city,
    plan.destination,
    plan.scenario,
    plan.distanceKm,
    period,
    context,
    {
      passengerReligionId: plan.passengerReligionId,
      religiousMissionId: plan.religiousMissionId,
      catholicContraband: plan.mission.catholicContraband === true,
      religiousItinerary: plan.itinerary
    }
  );
  if (quests.completed[quest.id] || quests.failed?.[quest.id]) return null;
  if (passengerOfferWasDeclinedThisPeriod(quests, quest, context.simMinute)) return null;
  quests.passengerOffers[passengerOfferStorageKey(quest)] = quest;
  return quest;
}

export function travelMissionOfferForCity(state, city, portCities, context = {}) {
  const quests = questMemory(state);
  if (!quests.active && treatyOfMadridMissionPlanForCity(state, city, portCities, context)) {
    return passengerOfferForCity(state, city, portCities, context);
  }
  const existing = pendingOrdinaryPassengerOfferForCity(state, city);
  if (existing || quests.passengerActive) return existing;
  if (quests.active && quests.active.kind !== "delivery") return null;
  if (eastAsianMissionPlanForCity(state, city, portCities)) {
    return passengerOfferForCity(state, city, portCities, context);
  }
  if (city?.isFactionCapital) {
    const envoy = quests.active ? null : envoyOfferForCapital(state, city, portCities, context);
    if (envoy) return envoy;
  }
  return passengerOfferForCity(state, city, portCities, context);
}

export function travelMissionOffersForCity(state, city, portCities, context = {}) {
  septemberTestamentOfferForCity(state, city, portCities, context);
  travelMissionOfferForCity(state, city, portCities, context);
  return pendingPassengerOffersForCity(state, city);
}

export function envoyOfferForCapital(state, city, portCities, context = {}) {
  const quests = questMemory(state);
  if (quests.active || quests.passengerActive) return null;
  const existing = pendingOrdinaryPassengerOfferForCity(state, city);
  if (existing) return existing;
  if (!city?.isFactionCapital || city.capitalOfFactionId !== city.factionId) return null;
  if (typeof context.relationBetween !== "function") {
    throw new Error("Envoy missions require a diplomacy resolver");
  }

  const period = passengerRollPeriod(context.simMinute);
  const originKey = cityKey(city);
  const rollKey = `${originKey}|${period}|envoy`;
  if (quests.passengerRolls[rollKey]) return null;
  quests.passengerRolls[rollKey] = true;

  const spawnChance = passengerSpawnChance(context.envoySpawnChance ?? ENVOY_SPAWN_CHANCE);
  if (spawnChance < 1 && seededFraction(`${rollKey}|spawn`) >= spawnChance) return null;

  const tradeAccessTarget = context.envoyKind === undefined || context.envoyKind === "friendly-envoy"
    ? tradeAccessOpeningTarget(state, city, portCities, context.simMinute ?? 0)
    : null;
  if (tradeAccessTarget) {
    const distanceKm = greatCircleDistanceKm(city, tradeAccessTarget.port);
    const quest = buildEnvoyQuest(
      city,
      tradeAccessTarget.port,
      "friendly-envoy",
      distanceKm,
      period,
      context.simMinute ?? 0,
      {
        tradeAccessPolicyId: tradeAccessTarget.policy.id,
        tradeAccessOpeningFactionId: state.playerCharacter.nationalityId
      }
    );
    attachEnvoyCharacter(quest, city, tradeAccessTarget.port, context);
    quests.passengerOffers[cityKey(city)] = quest;
    return quest;
  }
  const diplomaticSeed = `${rollKey}|diplomatic-mission`;
  const tributePlan = tributeMissionPlan(state, city, portCities);
  const tributeEligible = tributePlan &&
    factionReputation(state, city.factionId) >= TRIBUTE_MISSION_REPUTATION_REQUIRED &&
    cargoFree(state) >= tributeCargoSpace(tributePlan.requirements);
  if ((context.envoyKind === TRIBUTE_ENVOY_QUEST_KIND ||
      (context.envoyKind === undefined && tributeEligible && seededFraction(`${diplomaticSeed}|tribute`) < 0.45)) &&
      tributeEligible) {
    const destination = tributePlan.destination;
    const quest = buildEnvoyQuest(
      city,
      destination,
      TRIBUTE_ENVOY_QUEST_KIND,
      greatCircleDistanceKm(city, destination),
      period,
      context.simMinute ?? 0,
      {
        tributeCargoRequirements: tributePlan.requirements,
        tributeCargoLabel: tributePlan.cargoLabel
      }
    );
    attachEnvoyCharacter(quest, city, destination, context);
    quests.passengerOffers[originKey] = quest;
    return quest;
  }
  const statusPlan = diplomaticStatusMissionPlan(state, city, portCities, {
    relationBetween: context.relationBetween,
    seed: diplomaticSeed,
    force: context.envoyKind === STATUS_ENVOY_QUEST_KIND
  });
  if ((context.envoyKind === STATUS_ENVOY_QUEST_KIND ||
      (context.envoyKind === undefined && statusPlan && seededFraction(`${diplomaticSeed}|status`) < 0.22)) &&
      statusPlan) {
    const destination = statusPlan.destination;
    const { destination: _destination, ...statusProposal } = statusPlan;
    const quest = buildEnvoyQuest(
      city,
      destination,
      STATUS_ENVOY_QUEST_KIND,
      greatCircleDistanceKm(city, destination),
      period,
      context.simMinute ?? 0,
      { statusProposal }
    );
    attachEnvoyCharacter(quest, city, destination, context);
    quests.passengerOffers[originKey] = quest;
    return quest;
  }
  const courtPlan = courtMissionPlan(state.relations.courts, city, portCities);
  if ((context.envoyKind === COURT_ENVOY_QUEST_KIND ||
      (context.envoyKind === undefined && courtPlan && seededFraction(`${diplomaticSeed}|court`) < 0.55)) &&
      courtPlan) {
    const destination = courtPlan.destination;
    const quest = buildEnvoyQuest(
      city,
      destination,
      COURT_ENVOY_QUEST_KIND,
      greatCircleDistanceKm(city, destination),
      period,
      context.simMinute ?? 0,
      {
        courtCommissionKind: courtPlan.commissionKind,
        courtMatterId: courtPlan.matter.id,
        courtAuthorityFactionId: courtPlan.matter.authorityFactionId,
        courtMatter: courtPlan.matter
      }
    );
    attachEnvoyCharacter(quest, city, destination, context);
    quests.passengerOffers[originKey] = quest;
    return quest;
  }
  if ([TRIBUTE_ENVOY_QUEST_KIND, STATUS_ENVOY_QUEST_KIND, COURT_ENVOY_QUEST_KIND]
    .includes(context.envoyKind)) {
    return null;
  }
  const missionKind = chooseEnvoyKind(`${rollKey}|kind`, context.envoyKind);
  const destination = chooseEnvoyDestination(city, portCities, missionKind, context);
  if (!destination) return null;
  const distanceKm = greatCircleDistanceKm(city, destination);
  const quest = buildEnvoyQuest(city, destination, missionKind, distanceKm, period, context.simMinute ?? 0);
  attachEnvoyCharacter(quest, city, destination, context);
  quests.passengerOffers[originKey] = quest;
  return quest;
}

function attachEnvoyCharacter(quest, origin, destination, context) {
  if (typeof context.createCharacter === "function") {
    const scenario = {
      id: quest.kind,
      expressionId: ["hostile-envoy", STATUS_ENVOY_QUEST_KIND].includes(quest.kind)
        ? "stern"
        : "attentive",
      namePort: "origin"
    };
    const character = context.createCharacter({ quest, origin, destination, scenario });
    if (character) {
      quest.passenger = character;
      quest.passengerName = character.name;
    }
  }
}

export function pendingPassengerOffersForCity(state, city) {
  if (!state || !city) return [];
  const quests = questMemory(state);
  const originKey = cityKey(city);
  const offers = [];
  for (const [storageKey, offer] of Object.entries(quests.passengerOffers)) {
    if (offer?.originKey !== originKey) continue;
    if (!passengerOfferIsPending(state, quests, offer)) {
      delete quests.passengerOffers[storageKey];
      continue;
    }
    offers.push(offer);
  }
  return offers.sort((left, right) => (
    Number(isScriptedPassengerOffer(right)) - Number(isScriptedPassengerOffer(left)) ||
    left.id.localeCompare(right.id)
  ));
}

export function pendingPassengerOfferForCity(state, city) {
  return pendingPassengerOffersForCity(state, city)[0] || null;
}

function pendingOrdinaryPassengerOfferForCity(state, city) {
  return pendingPassengerOffersForCity(state, city)
    .find((offer) => !isScriptedPassengerOffer(offer)) || null;
}

function passengerOfferIsPending(state, quests, offer) {
  if (!offer || quests.completed[offer.id] || quests.failed?.[offer.id]) return false;
  if (!treatyOfMadridOfferStillValid(state, offer)) return false;
  if (offer.tradeAccessPolicyId && sovereignTradeOpenToFaction(
    state,
    offer.tradeAccessPolicyId,
    offer.tradeAccessOpeningFactionId
  )) return false;
  return !(offer.kind === "passenger" && !offer.tradeAccessPolicyId &&
    !isEastAsianMissionQuest(offer) && !passengerDistanceIsAllowed(offer));
}

export function activePassengerQuest(state) {
  return questMemory(state).passengerActive || null;
}

export function activeTravelMissionQuest(state) {
  const quests = questMemory(state);
  return isEnvoyQuest(quests.active) ? quests.active : (quests.passengerActive || null);
}

export function activeNamedTravelMission(state) {
  const quest = activeTravelMissionQuest(state);
  if (!quest?.passenger) return null;
  const kind = quest.kind === "passenger"
    ? "passenger"
    : isEnvoyQuest(quest) ? "envoy" : null;
  if (!kind) throw new Error(`Named travel mission has unsupported kind: ${quest.kind}`);
  return Object.freeze({ quest, kind, character: quest.passenger });
}

export function passengerQuestById(state, questId) {
  const quests = questMemory(state);
  if (quests.active?.id === questId) return quests.active;
  if (quests.passengerActive?.id === questId) return quests.passengerActive;
  for (const offer of Object.values(quests.passengerOffers)) {
    if (offer?.id === questId && !quests.completed[offer.id]) return offer;
  }
  return null;
}

export function markPassengerOfferSeen(state, quest) {
  if (!quest || (quest.kind !== "passenger" && !isEnvoyQuest(quest)) || !quest.originKey) return null;
  const quests = questMemory(state);
  const offer = Object.values(quests.passengerOffers).find((candidate) => candidate?.id === quest.id);
  if (!offer) return null;
  offer.seen = true;
  quest.seen = true;
  return offer;
}

export function declinePassengerOffer(state, quest, context = {}) {
  if (!quest || (quest.kind !== "passenger" && !isEnvoyQuest(quest)) || !quest.id) {
    throw new Error("Declining a passenger offer requires a passenger or envoy quest");
  }
  const quests = questMemory(state);
  for (const [storageKey, offer] of Object.entries(quests.passengerOffers)) {
    if (offer?.id === quest.id) delete quests.passengerOffers[storageKey];
  }
  quests.passengerRolls[passengerOfferDeclineKey(quest, context.simMinute)] = true;
}

function buildEnvoyQuest(origin, target, kind, distanceKm, period, simMinute, options = {}) {
  const originKey = cityKey(origin);
  const targetKey = cityKey(target);
  const seed = `${originKey}|${targetKey}|${kind}|${period}`;
  const reward = options.reward ?? (
    220 + Math.round(distanceKm / 24) + (hashString32(`${seed}|reward`) % 121) +
    (kind === TRIBUTE_ENVOY_QUEST_KIND ? 300 : 0)
  );
  const originRuler = rulerAtMinute(origin.factionId, simMinute);
  const targetRuler = rulerAtMinute(target.factionId, simMinute);
  if (!originRuler || !targetRuler) throw new Error("Envoy missions require sovereign origin and destination factions");
  const tradeAccessPolicyId = options.tradeAccessPolicyId || null;
  const tradeAccessOpeningFactionId = options.tradeAccessOpeningFactionId || null;
  if ((tradeAccessPolicyId === null) !== (tradeAccessOpeningFactionId === null)) {
    throw new Error("Trade-opening envoy requires both a policy and beneficiary faction");
  }
  if (tradeAccessPolicyId !== null && kind !== "friendly-envoy") {
    throw new Error("Trade opening requires a friendly envoy");
  }
  const tradeAccessPolicy = tradeAccessPolicyId
    ? sovereignTradePolicyById(tradeAccessPolicyId)
    : null;
  if (tradeAccessPolicy && target.factionId !== tradeAccessPolicy.hostFactionId) {
    throw new Error(`Trade-opening envoy target does not host ${tradeAccessPolicy.id}`);
  }
  return {
    id: options.id || `${kind}-${origin.tileId}-${target.tileId}-${hashString32(seed).toString(36)}`,
    kind,
    stage: "outbound",
    originKey,
    originTileId: origin.tileId,
    originName: cityLabel(origin),
    originCountry: origin.country || "",
    originFactionId: origin.factionId,
    originRulerName: originRuler.displayName,
    targetKey,
    targetTileId: target.tileId,
    targetName: cityLabel(target),
    targetCountry: target.country || "",
    targetFactionId: target.factionId,
    targetRulerName: targetRuler.displayName,
    destinationKey: targetKey,
    destinationTileId: target.tileId,
    destinationName: cityLabel(target),
    destinationCountry: target.country || "",
    distanceKm: Math.round(distanceKm),
    reward,
    passengerName: "Envoy",
    seen: false,
    envoySafePassageUntilMinute: {},
    ...(tradeAccessPolicy ? {
      tradeAccessPolicyId: tradeAccessPolicy.id,
      tradeAccessOpeningFactionId
    } : {}),
    ...(options.tributeCargoRequirements ? {
      tributeCargoRequirements: options.tributeCargoRequirements,
      tributeCargoLabel: options.tributeCargoLabel
    } : {}),
    ...(options.statusProposal ? { statusProposal: options.statusProposal } : {}),
    ...(options.courtCommissionKind ? {
      courtCommissionKind: options.courtCommissionKind,
      courtMatterId: options.courtMatterId,
      courtAuthorityFactionId: options.courtAuthorityFactionId
    } : {}),
    dialogue: options.dialogue || (tradeAccessPolicy
      ? tradeAccessOpeningDialogueText(
          origin,
          target,
          reward,
          originRuler,
          targetRuler,
          tradeAccessPolicy
        )
      : diplomaticEnvoyDialogueText(
          kind,
          origin,
          target,
          reward,
          seed,
          originRuler,
          targetRuler,
          options
        )
    )
  };
}

function buildTreatyOfMadridQuest(plan, context) {
  const period = passengerRollPeriod(context.simMinute);
  const quest = buildEnvoyQuest(
    plan.origin,
    plan.destination,
    "friendly-envoy",
    plan.distanceKm,
    period,
    context.simMinute ?? 0,
    {
      id: TREATY_OF_MADRID_MISSION_ID,
      reward: plan.reward,
      dialogue: plan.dialogue
    }
  );
  quest.treatyOfMadridMissionId = TREATY_OF_MADRID_MISSION_ID;
  quest.treatyOfMadridSide = plan.side;
  quest.passengerRoleLabel = plan.roleLabel;
  quest.envoyCount = plan.envoyCount;
  attachEnvoyCharacter(quest, plan.origin, plan.destination, context);
  return quest;
}

function diplomaticEnvoyDialogueText(kind, origin, target, reward, seed, originRuler, targetRuler, options) {
  if (kind === TRIBUTE_ENVOY_QUEST_KIND) {
    const cargoText = tributeCargoSummary(options.tributeCargoRequirements);
    return {
      offer: `${originRuler.displayName} entrusts you with ${options.tributeCargoLabel}. Carry me and the sealed cargo to ${cityLabel(target)}, then return with the court's receipt. Payment is ${reward} db. Cargo: ${cargoText}.`,
      underway: `The tribute remains under seal. It belongs to the court, not to us, until it is entered at ${cityLabel(target)}.`,
      negotiationOpening: `I present ${originRuler.displayName}'s tribute and ask that it be entered faithfully in the register.`,
      negotiation: "The tribute is accepted. Carry the receipt home.",
      returnUnderway: `The tribute is delivered. We carry its receipt home to ${cityLabel(origin)}.`,
      homecoming: `${originRuler.displayName} has received the court's receipt. The treasury will pay ${reward} db.`,
      intercession: "Hold your fire! This vessel carries tribute under the seals of both courts."
    };
  }
  if (kind === STATUS_ENVOY_QUEST_KIND) {
    const proposalText = statusProposalText(options.statusProposal);
    return {
      offer: `${originRuler.displayName} has chosen negotiation before war. Carry me to ${cityLabel(target)} with articles concerning tribute and allegiance, then return for ${reward} db.`,
      underway: `The articles remain sealed. Our audience awaits in ${cityLabel(target)}.`,
      negotiationOpening: `Under ${originRuler.displayName}'s seal, I place these articles before the court.`,
      negotiation: "The court has considered the articles. Carry its answer home.",
      returnUnderway: `The answer is sealed. Set our course back to ${cityLabel(origin)}.`,
      homecoming: `${originRuler.displayName} has received the answer. The treasury releases ${reward} db.`,
      intercession: "Stay your weapons! This ship carries articles of allegiance under diplomatic seal.",
      journeyEvents: outboundJourneyBriefing(
        "status-articles",
        `${proposalText} Those are the exact terms beneath the seal; the foreign court will answer them at our audience.`,
        "attentive"
      )
    };
  }
  if (kind === COURT_ENVOY_QUEST_KIND) {
    return courtMatterDialogue(options.courtMatter, {
      origin,
      destination: target,
      reward,
      rulerName: originRuler.displayName
    });
  }
  return envoyDialogueText(kind, origin, target, reward, seed, originRuler, targetRuler);
}

function tradeAccessOpeningTarget(state, origin, portCities, simMinute) {
  const playerFactionId = state.playerCharacter?.nationalityId || null;
  if (!playerFactionId || origin.factionId !== playerFactionId) return null;
  const candidates = SOVEREIGN_TRADE_ACCESS_POLICIES
    .filter((policy) => (
      policy.hostFactionId !== playerFactionId &&
      (policy.endMinute === null || simMinute < policy.endMinute) &&
      !sovereignTradeOpenToFaction(state, policy.id, playerFactionId)
    ))
    .map((policy) => ({
      policy,
      port: portCities.find((port) => (
        port.factionId === policy.hostFactionId &&
        port.isFactionCapital === true &&
        port.capitalOfFactionId === policy.hostFactionId &&
        Number.isFinite(port.lat) &&
        Number.isFinite(port.lon)
      )) || null
    }))
    .filter((candidate) => candidate.port)
    .map((candidate) => ({
      ...candidate,
      distanceKm: greatCircleDistanceKm(origin, candidate.port)
    }))
    .sort((left, right) => (
      left.distanceKm - right.distanceKm || left.policy.id.localeCompare(right.policy.id)
    ));
  return candidates[0] || null;
}

function tradeAccessOpeningDialogueText(origin, target, reward, originRuler, targetRuler, policy) {
  const home = cityLabel(origin);
  const foreign = cityLabel(target);
  return {
    offer: `${originRuler.displayName} seeks ${policy.envoyPurpose}. Carry me to ${foreign} and home again; the treasury will pay ${reward} db.`,
    underway: `The memorial remains sealed. Our audience awaits in ${foreign}.`,
    negotiationOpening: `I present ${originRuler.displayName}'s memorial in friendship and await the court's answer.`,
    negotiation: `${targetRuler.displayName}'s ministers accept your embassy. ${policy.envoyGrant}; carry our sealed answer home.`,
    returnUnderway: `The ${policy.permitLabel} is granted. Set our course back to ${home} so ${originRuler.displayName} can publish the accord.`,
    homecoming: `${originRuler.displayName} has received the ${policy.permitLabel}. Your ${reward} db is waiting at the treasury.`,
    intercession: "Hold your fire! This vessel carries an accredited trade embassy between our nations.",
    journeyEvents: outboundJourneyBriefing(
      "trade-access-memorial",
      `The memorial asks ${targetRuler.displayName} to ${policy.envoyMemorial}. In plain words, we seek ${policy.envoyRequest}. The wording has taken months.`,
      "thoughtful"
    )
  };
}

function outboundJourneyBriefing(id, text, expressionId) {
  return Object.freeze([
    Object.freeze({
      id,
      trigger: QUEST_JOURNEY_TRIGGER_DESTINATION_CLOSER,
      expressionId,
      text
    })
  ]);
}

function envoyDialogueText(kind, origin, target, reward, seed, originRuler, targetRuler) {
  const home = cityLabel(origin);
  const foreign = cityLabel(target);
  const homeFaction = factionById(origin.factionId).name;
  const targetFaction = factionById(target.factionId).name;
  const friendly = kind === "friendly-envoy";
  const variants = friendly ? FRIENDLY_ENVOY_DIALOGUE : HOSTILE_ENVOY_DIALOGUE;
  const variant = variants[hashString32(`${seed}|dialogue`) % variants.length];
  return Object.fromEntries(Object.entries(variant).map(([event, template]) => [event, template({
    home,
    foreign,
    homeFaction,
    targetFaction,
    homeRuler: originRuler.displayName,
    targetRuler: targetRuler.displayName,
    reward
  })]));
}

const FRIENDLY_ENVOY_DIALOGUE = Object.freeze([
  envoyDialogueVariant(
    ({ foreign, homeRuler, reward }) => `${homeRuler} believes our courts have more to gain from ink than iron. Carry me to ${foreign} and home again; the treasury will pay ${reward} db.`,
    ({ foreign, targetRuler }) => `My letters for ${foreign} are sealed for ${targetRuler}. Let us hope the ministers are ready.`,
    ({ targetFaction, targetRuler }) => `${targetRuler}'s court receives your proposals warmly. ${targetFaction} accepts this first accord; carry our sealed answer home.`,
    ({ home }) => `The agreement is signed. Set our course back to ${home}, captain.`,
    ({ homeRuler, reward }) => `${homeRuler} has accepted the accord. Your ${reward} db is waiting at the treasury.`,
    () => "Hold your fire! I travel under seal to improve relations between our nations. This ship has diplomatic protection."
  ),
  envoyDialogueVariant(
    ({ foreign, homeRuler, reward }) => `${homeRuler} has ordered a marriage of interests discussed in ${foreign}. I need a discreet ship there and back. The fee is ${reward} db.`,
    ({ foreign, targetRuler }) => `At ${foreign}, courtesy before ${targetRuler} will matter as much as the terms. I have rehearsed both.`,
    ({ homeFaction, targetFaction }) => `${targetFaction} has found common ground with ${homeFaction}. Take our signed reply to your court unchanged.`,
    ({ home }) => `The difficult words are behind us. Take me back to ${home} with the answer.`,
    ({ homeRuler, reward }) => `${homeRuler} approves the agreement, and your service. Accept ${reward} db with our thanks.`,
    () => "Stand down! An envoy is aboard under diplomatic seal. An attack would insult both courts."
  ),
  envoyDialogueVariant(
    ({ foreign, homeRuler, reward }) => `${homeRuler} wants trade and safe harbors put on the table in ${foreign}. Deliver me, wait for the talks, then return me for ${reward} db.`,
    ({ foreign, targetRuler }) => `If the winds favor us, perhaps ${targetRuler}'s ministers in ${foreign} will do the same.`,
    ({ targetFaction, targetRuler }) => `${targetRuler} accepts the opening terms for ${targetFaction}. Carry this goodwill home, and let our courts build upon it.`,
    ({ home }) => `Our work here is done. Home to ${home}, before cautious men reconsider.`,
    ({ homeRuler, reward }) => `The dispatches reached ${homeRuler}. The treasury releases your ${reward} db.`,
    () => "Cease your attack! This captain carries a peaceful embassy under the protection of both crowns."
  )
]);

const HOSTILE_ENVOY_DIALOGUE = Object.freeze([
  envoyDialogueVariant(
    ({ foreign, homeRuler, reward }) => `I bear ${homeRuler}'s protest to ${foreign}, face to face. Carry me there and back for ${reward} db.`,
    ({ foreign, targetRuler }) => `${targetRuler}'s court at ${foreign} will dislike every line. That is why it must be read aloud.`,
    ({ targetFaction, targetRuler }) => `${targetRuler} rejects your demands on behalf of ${targetFaction}. Carry that answer home, as cold as the sea outside.`,
    ({ home }) => `We have said what honor required. Return me to ${home} with their refusal.`,
    ({ homeRuler, reward }) => `${homeRuler} has heard their answer. Here is ${reward} db for your loyal service.`,
    () => "Hold! I am an accredited envoy bearing formal demands. You will grant this vessel diplomatic passage."
  ),
  envoyDialogueVariant(
    ({ foreign, homeRuler, reward }) => `${homeRuler}'s warning must reach ${foreign} before rumor does. I require passage there and home; payment is ${reward} db.`,
    ({ foreign, targetRuler }) => `No smiles will soften the warning I carry to ${targetRuler} in ${foreign}. Keep the ship ready for a quick departure.`,
    ({ homeFaction, targetFaction }) => `${targetFaction} will not yield to ${homeFaction}. Take that answer home, and remember how it was delivered.`,
    ({ home }) => `There is nothing more to discuss. Take me home to ${home}.`,
    ({ homeRuler, reward }) => `${homeRuler} finds your service beyond reproach. The promised ${reward} db is yours.`,
    () => "Do not fire! I carry an official warning under diplomatic privilege. Let this ship pass for seven days."
  ),
  envoyDialogueVariant(
    ({ foreign, homeRuler, reward }) => `${homeRuler}'s grievances have gone unanswered. Take me to ${foreign} with the final articles, then home for ${reward} db.`,
    ({ foreign, targetRuler }) => `At ${foreign}, keep the tide beneath us. Talks with ${targetRuler} may end quickly.`,
    ({ targetFaction, targetRuler }) => `${targetRuler} answers pride with pride for ${targetFaction}. You have our words, and no reason to linger.`,
    ({ home }) => `Set every useful sail for ${home}. My report belongs before the council.`,
    ({ homeRuler, reward }) => `${homeRuler}'s council has your name in its record. Take ${reward} db for completing the mission.`,
    () => "By diplomatic law, stay your weapons! This vessel bears an envoy between our governments."
  )
]);

function envoyDialogueVariant(offer, underway, negotiation, returnUnderway, homecoming, intercession) {
  return Object.freeze({
    offer,
    underway,
    negotiationOpening: ({ homeRuler, targetRuler, targetFaction }) =>
      `I speak under ${homeRuler}'s seal. ${targetRuler}, I place our court's terms before you and await the answer of ${targetFaction}.`,
    negotiation,
    returnUnderway,
    homecoming,
    intercession
  });
}

export function passengerName(quest) {
  return quest?.passenger?.name || quest?.passengerName || "Passenger";
}

export function isHajjPassengerQuest(quest) {
  return quest?.kind === "passenger" && quest.scenarioId === HAJJ_PASSENGER_SCENARIO_ID;
}

export function isHajjReturnPassengerQuest(quest) {
  return quest?.kind === "passenger" &&
    quest.scenarioId === HAJJ_RETURN_PASSENGER_SCENARIO_ID;
}

export function passengerRoleLabel(quest) {
  if (isEastAsianMissionQuest(quest)) return quest.passengerRoleLabel;
  if (isTreatyOfMadridQuest(quest)) return quest.passengerRoleLabel;
  if (isEnvoyQuest(quest)) return "envoy";
  if (isHajjPassengerQuest(quest)) return "pilgrim";
  return religiousMissionRoleLabel(quest) || "passenger";
}

function buildEastAsianPassengerQuest(plan) {
  const origin = plan.origin;
  const destination = plan.destination;
  const originKey = cityKey(origin);
  const destinationKey = cityKey(destination);
  const sideSuffix = plan.startingFactionId ? `-${plan.startingFactionId}` : "";
  const id = `east-asian-${plan.id}${sideSuffix}-${origin.tileId}-${destination.tileId}`;
  return {
    id,
    kind: "passenger",
    eastAsianMissionId: plan.id,
    eastAsianStartingFactionId: plan.startingFactionId,
    eastAsianRequiresOutcome: plan.requiresOutcome,
    originKey,
    originTileId: origin.tileId,
    originName: cityLabel(origin),
    originCountry: origin.country || "",
    originFactionId: origin.factionId,
    destinationKey,
    destinationTileId: destination.tileId,
    destinationName: cityLabel(destination),
    destinationCountry: destination.country || "",
    distanceKm: plan.distanceKm,
    reward: plan.reward,
    scenarioId: plan.scenarioId,
    passengerRoleLabel: plan.roleLabel,
    passengerName: plan.roleLabel,
    seen: false,
    dialogue: eastAsianMissionDialogue(plan),
    ...(plan.itinerary
      ? {
        itinerary: createQuestItinerary(
          plan.itinerary.map((stop, index) => ({
            key: cityKey(stop),
            tileId: stop.tileId,
            name: cityLabel(stop),
            country: stop.country || "",
            upgradesBattery: index > 0
          })),
          {
            mode: QUEST_ITINERARY_OPEN,
            openingStopTileId: plan.itinerary[0].tileId
          }
        ),
        eastAsianBatteryUpgrades: []
      }
      : {}),
    ...(plan.id === EAST_ASIAN_MISSION_NINGBO
      ? {
        eastAsianStage: "race",
        eastAsianDelegationShips: ningboDelegationManifest(
          id,
          plan.delegationOrigins,
          plan.destination.tileId
        )
      }
      : {})
  };
}

function createPassengerQuest(origin, destination, scenario, distanceKm, period, context, options = {}) {
  const quest = buildPassengerQuest(origin, destination, scenario, distanceKm, period, options);
  if (typeof context.createCharacter !== "function") return quest;
  let character = context.createCharacter({ quest, origin, destination, scenario });
  if (!character) return quest;
  if (quest.passengerReligionId && character.religionId !== quest.passengerReligionId) {
    character = Object.freeze({
      ...character,
      religionId: quest.passengerReligionId
    });
  }
  quest.passenger = character;
  quest.passengerName = character.name;
  return quest;
}

function buildPassengerQuest(origin, destination, scenario, distanceKm, period, options = {}) {
  const originKey = cityKey(origin);
  const destinationKey = cityKey(destination);
  const seed = `${originKey}|${destinationKey}|${scenario.id}|${period}`;
  const reward = 150 + Math.round(distanceKm / 18) + (hashString32(`${seed}|reward`) % 101);
  const id = `passenger-${origin.tileId}-${destination.tileId}-${hashString32(seed).toString(36)}`;
  return {
    id,
    kind: "passenger",
    originKey,
    originTileId: origin.tileId,
    originName: cityLabel(origin),
    originCountry: origin.country || "",
    originFactionId: origin.factionId,
    destinationKey,
    destinationTileId: destination.tileId,
    destinationName: cityLabel(destination),
    destinationCountry: destination.country || "",
    distanceKm: Math.round(distanceKm),
    reward,
    scenarioId: scenario.id,
    ...(options.passengerReligionId
      ? { passengerReligionId: options.passengerReligionId }
      : {}),
    ...(options.religiousMissionId
      ? { religiousMissionId: options.religiousMissionId }
      : {}),
    ...(options.catholicContraband
      ? { catholicContraband: true }
      : {}),
    ...(options.religiousItinerary?.length > 1
      ? {
        itinerary: createQuestItinerary(options.religiousItinerary, {
          mode: QUEST_ITINERARY_ORDERED
        })
      }
      : {}),
    passengerName: "Passenger",
    seen: false,
    dialogue: passengerDialogueText(
      scenario.id,
      origin,
      destination,
      reward,
      options.religiousMissionId
    )
  };
}

function passengerOfferStorageKey(offer) {
  if (isScriptedPassengerOffer(offer)) {
    return `${offer.originKey}|${SCRIPTED_RELIGIOUS_PASSENGER_OFFER_CHANNEL}|${offer.religiousMissionId}`;
  }
  return offer.originKey;
}

function isScriptedPassengerOffer(offer) {
  return offer?.religiousMissionId === SEPTEMBER_TESTAMENT_MISSION_ID;
}

function passengerDialogueText(scenarioId, origin, destination, reward, religiousMissionId = null) {
  const originName = cityLabel(origin);
  const destinationName = cityLabel(destination);
  if (religiousMissionId) {
    religiousMissionById(religiousMissionId);
    return religiousMissionDialogueText(religiousMissionId, origin, destination, reward);
  }
  if (scenarioId === HAJJ_PASSENGER_SCENARIO_ID) {
    return {
      offer: `For years I have saved to make the Hajj to Mecca. Jeddah is its sea gate; from there I will join the road inland. Carry me to ${destinationName} and I will pay ${reward} db.`,
      underway: `Each day brings us nearer to ${destinationName} and the road to Mecca. I have waited years for the Hajj; I pray our passage remains safe.`,
      arrival: `${destinationName} at last—the sea gate to Mecca. From here the pilgrims take the road inland. You have carried me to the threshold of the Hajj.`
    };
  }
  if (scenarioId === HAJJ_RETURN_PASSENGER_SCENARIO_ID) {
    return {
      offer: `Praise be to God, my Hajj is complete. Now I need passage home to ${destinationName}. Carry me there and I will pay ${reward} db.`,
      underway: `After the crowds of Mecca, the quiet sea is welcome. I am returning home to ${destinationName} from the Hajj.`,
      arrival: `${destinationName} at last. I left home a pilgrim and return from the Hajj. You have my thanks.`
    };
  }
  if (scenarioId === "return-home") {
    return {
      offer: `Captain, I was born in ${destinationName}. My last berth ended here, and I have no kin in this harbor. Carry me home and I will pay ${reward} db.`,
      underway: `Every league toward ${destinationName} feels like a debt lifting. Tell me when we make the harbor.`,
      arrival: `${destinationName}. I know that smell of water and smoke. You have brought me home; here is the fare I promised.`
    };
  }
  if (scenarioId === "shipwrecked-sailor") {
    return {
      offer: `Our ship broke up before we reached ${originName}. I can stand a night watch and keep quiet. Land me at ${destinationName} for ${reward} db.`,
      underway: `I will stay out of the crew's way until ${destinationName}. A dry deck is more mercy than I expected.`,
      arrival: `There is ${destinationName}. I will find a berth from here. Take the ${reward} db, captain, and my thanks.`
    };
  }
  if (scenarioId === "family-letter") {
    return {
      offer: `A letter found me in ${originName}. My family in ${destinationName} needs me before the season turns. Please take me there; I can pay ${reward} db.`,
      underway: `If the wind holds, ${destinationName} is close enough to hope for. I will not forget this passage.`,
      arrival: `${destinationName} at last. My family will hear your name kindly. Here is the ${reward} db I owe.`
    };
  }
  return {
    offer: `I carry papers for a patron in ${destinationName}, and the roads are closed to me. Passage by sea is safer. Take me there for ${reward} db.`,
    underway: `The papers are still dry, and ${destinationName} is still ahead. That is enough fortune for now.`,
    arrival: `This is the quay I needed. My patron can settle the rest, but your ${reward} db is ready now.`
  };
}

function chooseEnvoyKind(seed, forcedKind) {
  if (forcedKind !== undefined) {
    if (!["friendly-envoy", "hostile-envoy"].includes(forcedKind)) {
      throw new Error(`Unknown envoy mission kind: ${forcedKind}`);
    }
    return forcedKind;
  }
  return seededFraction(seed) < 0.5 ? "friendly-envoy" : "hostile-envoy";
}

function chooseEnvoyDestination(origin, portCities, missionKind, context) {
  const candidates = portCities
    .filter((port) => port.tileId !== origin.tileId)
    .filter((port) => port.isFactionCapital && port.capitalOfFactionId === port.factionId)
    .filter((port) => Number.isFinite(port.lat) && Number.isFinite(port.lon))
    .map((port) => ({
      port,
      distanceKm: greatCircleDistanceKm(origin, port),
      relation: context.relationBetween(origin.factionId, port.factionId)
    }))
    .filter(({ distanceKm }) => passengerDistanceIsMedium(distanceKm))
    .filter(({ relation }) => missionKind === "friendly-envoy"
      ? relation !== DIPLOMACY_ALLY
      : relation !== DIPLOMACY_WAR);
  if (context.destinationTileId !== undefined) {
    return candidates.find(({ port }) => port.tileId === context.destinationTileId)?.port || null;
  }
  if (candidates.length === 0) return null;
  const seed = `${cityKey(origin)}|${passengerRollPeriod(context.simMinute)}|${missionKind}|target`;
  return candidates
    .map((candidate) => ({
      ...candidate,
      score: destinationScore(seed, candidate.port, candidate.distanceKm)
    }))
    .sort((a, b) => a.score - b.score)[0].port;
}

function choosePassengerDestination(origin, portCities, context) {
  if (context.destinationTileId !== undefined) {
    const destination = portCities.find((port) => port.tileId === context.destinationTileId) || null;
    if (!destination) return null;
    return passengerDistanceIsMedium(greatCircleDistanceKm(origin, destination)) ? destination : null;
  }
  const candidates = portCities
    .filter((port) => port.tileId !== origin.tileId)
    .filter((port) => Number.isFinite(port.lat) && Number.isFinite(port.lon))
    .map((port) => ({ port, distanceKm: greatCircleDistanceKm(origin, port) }))
    .filter(({ distanceKm }) => passengerDistanceIsMedium(distanceKm));
  if (candidates.length === 0) return null;
  const seed = `${cityKey(origin)}|${passengerRollPeriod(context.simMinute)}|destination`;
  return candidates
    .map((candidate) => ({
      ...candidate,
      score: destinationScore(seed, candidate.port, candidate.distanceKm)
    }))
    .sort((a, b) => a.score - b.score)[0].port;
}

function hajjPassengerPlan(origin, portCities, context, rollKey) {
  const forcedHajj = context.scenarioId === HAJJ_PASSENGER_SCENARIO_ID;
  if (context.scenarioId && !forcedHajj) return null;
  const destination = findCanonicalPort(portCities, CANONICAL_PORTS.JEDDAH, "Hajj passenger mission");
  if (!destination || destination.tileId === origin.tileId) return null;
  const passengerReligionId = islamicReligionForHome(
    origin,
    `${rollKey}|hajj-passenger`
  );
  if (!passengerReligionId) return null;
  const distanceKm = passengerTravelDistanceKm(origin, destination, context);
  if (!hajjPassengerDistanceIsAllowed(distanceKm)) return null;
  const chance = hajjPassengerScenarioChance(context.hajjScenarioChance);
  if (!forcedHajj && chance < 1 && seededFraction(`${rollKey}|hajj`) >= chance) return null;
  return {
    destination,
    distanceKm,
    passengerReligionId,
    scenario: HAJJ_PASSENGER_SCENARIO
  };
}

function hajjReturnPassengerPlan(origin, portCities, context, rollKey) {
  const forcedReturn = context.scenarioId === HAJJ_RETURN_PASSENGER_SCENARIO_ID;
  if (context.scenarioId && !forcedReturn) return null;
  if (!portMatchesCanonicalReference(origin, CANONICAL_PORTS.JEDDAH)) return null;

  const candidates = portCities
    .filter((port) => port.tileId !== origin.tileId)
    .filter((port) => Number.isFinite(port.lat) && Number.isFinite(port.lon))
    .filter((port) => (
      context.destinationTileId === undefined || port.tileId === context.destinationTileId
    ))
    .map((port) => {
      const distanceKm = passengerTravelDistanceKm(origin, port, context);
      const passengerReligionId = islamicReligionForHome(
        port,
        `${rollKey}|hajj-return|${cityKey(port)}`
      );
      return { port, distanceKm, passengerReligionId };
    })
    .filter(({ distanceKm, passengerReligionId }) => (
      passengerReligionId && hajjPassengerDistanceIsAllowed(distanceKm)
    ));
  if (candidates.length === 0) return null;

  const chance = hajjReturnPassengerScenarioChance(context.hajjReturnScenarioChance);
  if (!forcedReturn && chance < 1 && seededFraction(`${rollKey}|hajj-return`) >= chance) {
    return null;
  }
  const selected = candidates
    .map((candidate) => ({
      ...candidate,
      score: destinationScore(`${rollKey}|hajj-return`, candidate.port, candidate.distanceKm)
    }))
    .sort((a, b) => a.score - b.score)[0];
  return {
    destination: selected.port,
    distanceKm: selected.distanceKm,
    passengerReligionId: selected.passengerReligionId,
    scenario: HAJJ_RETURN_PASSENGER_SCENARIO
  };
}

function passengerTravelDistanceKm(origin, destination, context) {
  if (typeof context.sailingDistanceKm === "function") {
    return context.sailingDistanceKm(origin, destination);
  }
  return greatCircleDistanceKm(origin, destination);
}

function destinationScore(seed, port, distanceKm) {
  const random = seededFraction(`${seed}|${cityKey(port)}`);
  const distanceSpan = Math.max(
    PASSENGER_PREFERRED_DISTANCE_KM - PASSENGER_MIN_DISTANCE_KM,
    PASSENGER_MAX_DISTANCE_KM - PASSENGER_PREFERRED_DISTANCE_KM
  );
  const distancePenalty = Math.abs(distanceKm - PASSENGER_PREFERRED_DISTANCE_KM) / distanceSpan;
  return random + distancePenalty * 0.5;
}

function passengerDistanceIsMedium(distanceKm) {
  return Number.isFinite(distanceKm) &&
    distanceKm >= PASSENGER_MIN_DISTANCE_KM &&
    distanceKm <= PASSENGER_MAX_DISTANCE_KM;
}

function hajjPassengerDistanceIsAllowed(distanceKm) {
  return Number.isFinite(distanceKm) &&
    distanceKm >= HAJJ_PASSENGER_MIN_DISTANCE_KM &&
    distanceKm <= HAJJ_PASSENGER_MAX_DISTANCE_KM;
}

function passengerDistanceIsAllowed(quest) {
  return isHajjPassengerQuest(quest) || isHajjReturnPassengerQuest(quest)
    ? hajjPassengerDistanceIsAllowed(quest.distanceKm)
    : isReligiousPassengerQuest(quest)
      ? religiousPassengerDistanceIsAllowed(quest.distanceKm, quest.religiousMissionId)
      : passengerDistanceIsMedium(quest.distanceKm);
}

function choosePassengerScenario(seed, context) {
  if (context.scenarioId === HAJJ_PASSENGER_SCENARIO_ID) return HAJJ_PASSENGER_SCENARIO;
  if (context.scenarioId === HAJJ_RETURN_PASSENGER_SCENARIO_ID) {
    return HAJJ_RETURN_PASSENGER_SCENARIO;
  }
  if (context.scenarioId) {
    const forced = PASSENGER_SCENARIOS.find((scenario) => scenario.id === context.scenarioId);
    if (forced) return forced;
  }
  return PASSENGER_SCENARIOS[hashString32(`${seed}|scenario`) % PASSENGER_SCENARIOS.length];
}

function hajjPassengerScenarioChance(value) {
  if (!Number.isFinite(value)) return HAJJ_PASSENGER_SCENARIO_CHANCE;
  return Math.max(0, Math.min(1, value));
}

function hajjReturnPassengerScenarioChance(value) {
  if (!Number.isFinite(value)) return HAJJ_RETURN_PASSENGER_SCENARIO_CHANCE;
  return Math.max(0, Math.min(1, value));
}

function passengerSpawnChance(value) {
  if (!Number.isFinite(value)) return PASSENGER_SPAWN_CHANCE;
  return Math.max(0, Math.min(1, value));
}

function passengerRollPeriod(simMinute) {
  if (!Number.isFinite(simMinute)) return 0;
  return Math.floor(simMinute / PASSENGER_ROLL_PERIOD_MINUTES);
}

function passengerOfferWasDeclinedThisPeriod(quests, quest, simMinute) {
  return quests.passengerRolls[passengerOfferDeclineKey(quest, simMinute)] === true;
}

function passengerOfferDeclineKey(quest, simMinute) {
  return `declined|${quest.id}|${passengerRollPeriod(simMinute)}`;
}

function seededFraction(value) {
  return hashString32(value) / 0x100000000;
}

function questMemory(state) {
  if (!state?.memory || typeof state.memory !== "object") throw new Error("Passenger missions require game state memory");
  if (!state.memory.quests || typeof state.memory.quests !== "object") {
    state.memory.quests = { active: null, passengerActive: null, completed: {} };
  }
  const quests = state.memory.quests;
  if (quests.passengerActive === undefined) quests.passengerActive = null;
  if (!quests.completed || typeof quests.completed !== "object") quests.completed = {};
  if (!quests.passengerOffers || typeof quests.passengerOffers !== "object") quests.passengerOffers = {};
  if (!quests.passengerRolls || typeof quests.passengerRolls !== "object") quests.passengerRolls = {};
  return quests;
}

function hashString32(value) {
  let h = 0x811c9dc5;
  const text = String(value);
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
