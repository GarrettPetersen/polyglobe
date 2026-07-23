import {
  cityKey,
  cityLabel,
  isEnvoyQuest,
  mingTradeOpenToFaction
} from "./gameState.js";
import {
  DIPLOMACY_ALLY,
  DIPLOMACY_WAR,
  factionById
} from "./factions.js";
import { greatCircleDistanceKm } from "./worldDistance.js";
import { rulerAtMinute } from "./rulers.js";
import { MING_FACTION_ID } from "./mingTradeRestrictions.js";

export const PASSENGER_SPAWN_CHANCE = 0.12;
export const PASSENGER_MIN_DISTANCE_KM = 900;
export const PASSENGER_MAX_DISTANCE_KM = 4200;
export const PASSENGER_PREFERRED_DISTANCE_KM = 2400;
export const PASSENGER_ROLL_PERIOD_MINUTES = 7 * 24 * 60;
export const ENVOY_SPAWN_CHANCE = 0.08;

export const PASSENGER_SCENARIOS = Object.freeze([
  Object.freeze({ id: "return-home", expressionId: "sad", namePort: "destination" }),
  Object.freeze({ id: "shipwrecked-sailor", expressionId: "afraid", namePort: "origin" }),
  Object.freeze({ id: "family-letter", expressionId: "sad", namePort: "origin" }),
  Object.freeze({ id: "patron-papers", expressionId: "neutral", namePort: "origin" })
]);

export function passengerOfferForCity(state, city, portCities, context = {}) {
  const quests = questMemory(state);
  if (quests.active) return null;
  const existing = pendingPassengerOfferForCity(state, city);
  if (existing) return existing;

  const destination = choosePassengerDestination(city, portCities, context);
  if (!destination) return null;

  const period = passengerRollPeriod(context.simMinute);
  const originKey = cityKey(city);
  const rollKey = `${originKey}|${period}`;
  if (quests.passengerRolls[rollKey]) return null;
  quests.passengerRolls[rollKey] = true;

  const spawnChance = passengerSpawnChance(context.spawnChance);
  if (spawnChance < 1 && seededFraction(`${rollKey}|passenger`) >= spawnChance) return null;

  const distanceKm = greatCircleDistanceKm(city, destination);
  const scenario = choosePassengerScenario(`${rollKey}|${cityKey(destination)}`, context);
  const quest = buildPassengerQuest(city, destination, scenario, distanceKm, period);
  if (typeof context.createCharacter === "function") {
    const character = context.createCharacter({ quest, origin: city, destination, scenario });
    if (character) {
      quest.passenger = character;
      quest.passengerName = character.name;
    }
  }
  quests.passengerOffers[originKey] = quest;
  return quest;
}

export function travelMissionOfferForCity(state, city, portCities, context = {}) {
  const existing = pendingPassengerOfferForCity(state, city);
  if (existing || questMemory(state).active) return existing;
  if (city?.isFactionCapital) {
    const envoy = envoyOfferForCapital(state, city, portCities, context);
    if (envoy) return envoy;
  }
  return passengerOfferForCity(state, city, portCities, context);
}

export function envoyOfferForCapital(state, city, portCities, context = {}) {
  const quests = questMemory(state);
  if (quests.active) return null;
  const existing = pendingPassengerOfferForCity(state, city);
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

  const mingTradeTarget = mingTradeOpeningTarget(state, city, portCities);
  if (mingTradeTarget) {
    const distanceKm = greatCircleDistanceKm(city, mingTradeTarget);
    const quest = buildEnvoyQuest(
      city,
      mingTradeTarget,
      "friendly-envoy",
      distanceKm,
      period,
      context.simMinute ?? 0,
      { mingTradeOpeningFactionId: state.playerCharacter.nationalityId }
    );
    attachEnvoyCharacter(quest, city, mingTradeTarget, context);
    quests.passengerOffers[cityKey(city)] = quest;
    return quest;
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
      expressionId: quest.kind === "friendly-envoy" ? "attentive" : "stern",
      namePort: "origin"
    };
    const character = context.createCharacter({ quest, origin, destination, scenario });
    if (character) {
      quest.passenger = character;
      quest.passengerName = character.name;
    }
  }
}

export function pendingPassengerOfferForCity(state, city) {
  if (!state || !city) return null;
  const quests = questMemory(state);
  const offer = quests.passengerOffers[cityKey(city)];
  if (!offer || quests.completed[offer.id]) return null;
  if (offer.mingTradeOpeningFactionId && mingTradeOpenToFaction(state, offer.mingTradeOpeningFactionId)) {
    delete quests.passengerOffers[cityKey(city)];
    return null;
  }
  if (!offer.mingTradeOpeningFactionId && !passengerDistanceIsMedium(offer.distanceKm)) {
    delete quests.passengerOffers[cityKey(city)];
    return null;
  }
  return offer;
}

export function activePassengerQuest(state) {
  const active = questMemory(state).active;
  return active?.kind === "passenger" ? active : null;
}

export function activeTravelMissionQuest(state) {
  const active = questMemory(state).active;
  return active?.kind === "passenger" || isEnvoyQuest(active) ? active : null;
}

export function passengerQuestById(state, questId) {
  const quests = questMemory(state);
  if (quests.active?.id === questId) return quests.active;
  for (const offer of Object.values(quests.passengerOffers)) {
    if (offer?.id === questId && !quests.completed[offer.id]) return offer;
  }
  return null;
}

export function markPassengerOfferSeen(state, quest) {
  if (!quest || (quest.kind !== "passenger" && !isEnvoyQuest(quest)) || !quest.originKey) return null;
  const quests = questMemory(state);
  const offer = quests.passengerOffers[quest.originKey];
  if (!offer || offer.id !== quest.id) return null;
  offer.seen = true;
  quest.seen = true;
  return offer;
}

function buildEnvoyQuest(origin, target, kind, distanceKm, period, simMinute, options = {}) {
  const originKey = cityKey(origin);
  const targetKey = cityKey(target);
  const seed = `${originKey}|${targetKey}|${kind}|${period}`;
  const reward = 220 + Math.round(distanceKm / 24) + (hashString32(`${seed}|reward`) % 121);
  const originRuler = rulerAtMinute(origin.factionId, simMinute);
  const targetRuler = rulerAtMinute(target.factionId, simMinute);
  if (!originRuler || !targetRuler) throw new Error("Envoy missions require sovereign origin and destination factions");
  const mingTradeOpeningFactionId = options.mingTradeOpeningFactionId || null;
  if (mingTradeOpeningFactionId !== null && kind !== "friendly-envoy") {
    throw new Error("Ming trade opening requires a friendly envoy");
  }
  return {
    id: `${kind}-${origin.tileId}-${target.tileId}-${hashString32(seed).toString(36)}`,
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
    ...(mingTradeOpeningFactionId ? { mingTradeOpeningFactionId } : {}),
    dialogue: mingTradeOpeningFactionId
      ? mingTradeOpeningDialogueText(origin, target, reward, originRuler, targetRuler)
      : envoyDialogueText(kind, origin, target, reward, seed, originRuler, targetRuler)
  };
}

function mingTradeOpeningTarget(state, origin, portCities) {
  const playerFactionId = state.playerCharacter?.nationalityId || null;
  if (!playerFactionId || playerFactionId === MING_FACTION_ID ||
      origin.factionId !== playerFactionId || mingTradeOpenToFaction(state, playerFactionId)) {
    return null;
  }
  return portCities.find((port) => (
    port.factionId === MING_FACTION_ID &&
    port.isFactionCapital === true &&
    port.capitalOfFactionId === MING_FACTION_ID &&
    Number.isFinite(port.lat) &&
    Number.isFinite(port.lon)
  )) || null;
}

function mingTradeOpeningDialogueText(origin, target, reward, originRuler, targetRuler) {
  const home = cityLabel(origin);
  const foreign = cityLabel(target);
  return {
    offer: `${originRuler.displayName} seeks lawful trade with the Ming Empire. Carry me to ${foreign} and home again; the treasury will pay ${reward} db.`,
    underway: `My memorial asks ${targetRuler.displayName} to open Ming markets to our merchants. The wording has taken months.`,
    negotiationOpening: `I present ${originRuler.displayName}'s memorial in friendship. We ask leave for our merchants to enter Ming ports under lawful seal, customs, and the emperor's peace.`,
    negotiation: `${targetRuler.displayName}'s ministers accept your embassy. Ming ports are now open to your nation's lawful trade; carry our sealed answer home.`,
    returnUnderway: `The trade seal is granted. Set our course back to ${home} so ${originRuler.displayName} can publish the accord.`,
    homecoming: `${originRuler.displayName} has received the Ming trade seal. Your ${reward} db is waiting at the treasury.`,
    intercession: "Hold your fire! This vessel carries an accredited trade embassy between our nations."
  };
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

function buildPassengerQuest(origin, destination, scenario, distanceKm, period) {
  const originKey = cityKey(origin);
  const destinationKey = cityKey(destination);
  const seed = `${originKey}|${destinationKey}|${scenario.id}|${period}`;
  const reward = 90 + Math.round(distanceKm / 45) + (hashString32(`${seed}|reward`) % 76);
  const id = `passenger-${origin.tileId}-${destination.tileId}-${hashString32(seed).toString(36)}`;
  return {
    id,
    kind: "passenger",
    originKey,
    originTileId: origin.tileId,
    originName: cityLabel(origin),
    originCountry: origin.country || "",
    destinationKey,
    destinationTileId: destination.tileId,
    destinationName: cityLabel(destination),
    destinationCountry: destination.country || "",
    distanceKm: Math.round(distanceKm),
    reward,
    scenarioId: scenario.id,
    passengerName: "Passenger",
    seen: false,
    dialogue: passengerDialogueText(scenario.id, origin, destination, reward)
  };
}

function passengerDialogueText(scenarioId, origin, destination, reward) {
  const originName = cityLabel(origin);
  const destinationName = cityLabel(destination);
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
    if (forcedKind !== "friendly-envoy" && forcedKind !== "hostile-envoy") {
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

function choosePassengerScenario(seed, context) {
  if (context.scenarioId) {
    const forced = PASSENGER_SCENARIOS.find((scenario) => scenario.id === context.scenarioId);
    if (forced) return forced;
  }
  return PASSENGER_SCENARIOS[hashString32(`${seed}|scenario`) % PASSENGER_SCENARIOS.length];
}

function passengerSpawnChance(value) {
  if (!Number.isFinite(value)) return PASSENGER_SPAWN_CHANCE;
  return Math.max(0, Math.min(1, value));
}

function passengerRollPeriod(simMinute) {
  if (!Number.isFinite(simMinute)) return 0;
  return Math.floor(simMinute / PASSENGER_ROLL_PERIOD_MINUTES);
}

function seededFraction(value) {
  return hashString32(value) / 0x100000000;
}

function questMemory(state) {
  if (!state?.memory || typeof state.memory !== "object") throw new Error("Passenger missions require game state memory");
  if (!state.memory.quests || typeof state.memory.quests !== "object") {
    state.memory.quests = { active: null, completed: {} };
  }
  const quests = state.memory.quests;
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
