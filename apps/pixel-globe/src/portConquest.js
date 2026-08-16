import { FACTIONS, NEUTRAL_FACTION_ID, assertFactionId } from "./factions.js";
import { rulerAtMinute } from "./rulers.js";
import { isChristianReligion } from "./religiousAttitudes.js";
import { greatCircleDistanceKm } from "./worldDistance.js";

export const PORT_CONQUEST_MIN_CREW = 36;
export const PORT_CONQUEST_NPC_LANDING_RANGE_PX = 28;
export const PORT_CONQUEST_NPC_CHANCE = 0.28;
export const PORT_CONQUEST_NPC_CAPITAL_CHANCE = 0.08;
export const PORT_CONQUEST_CAPITAL_TREASURY_BONUS = 2500;
export const CAPITAL_PEACE_ANNEXATION_CITY_LIMIT = 3;
export const CAPITAL_PEACE_TERM_ANNEXATION = "annexation";
export const CAPITAL_PEACE_TERM_VASSALAGE = "vassalage";
export const CAPITAL_PEACE_TERM_AUTONOMOUS_VASSALAGE = "autonomous-vassalage";
export const CAPITAL_PEACE_TERM_TRIBUTARY = "tributary-status";
export const CAPITAL_PEACE_TERM_CONCESSIONS = "territorial-concessions";
export const CAPITAL_PEACE_TERM_PAPAL_FAVOUR = "papal-favour";
export const CAPITAL_PEACE_TERM_PAPAL_EXCOMMUNICATION = "papal-excommunication";

const PORT_CONQUEST_EVENT_LIMIT = 80;
const PORT_CONQUEST_TREATY_LIMIT = 40;
const CAPITAL_PEACE_TERMS = new Set([
  CAPITAL_PEACE_TERM_ANNEXATION,
  CAPITAL_PEACE_TERM_VASSALAGE,
  CAPITAL_PEACE_TERM_AUTONOMOUS_VASSALAGE,
  CAPITAL_PEACE_TERM_TRIBUTARY,
  CAPITAL_PEACE_TERM_CONCESSIONS,
  CAPITAL_PEACE_TERM_PAPAL_FAVOUR,
  CAPITAL_PEACE_TERM_PAPAL_EXCOMMUNICATION
]);
const PLAYER_ASSAULT_FLAG_PREFIX = "playerPortAssaultUntil:";
const PLAYER_RAID_FLAG_PREFIX = "playerPortRaidedUntil:";

export function createPortConquestMemory() {
  return {
    portFactionOverrides: {},
    cityDisplayNameOverrides: {},
    factionCapitalOverrides: {},
    collapsedFactionIds: FACTIONS.filter((faction) => faction.emergent === true).map((faction) => faction.id),
    factionSuccessors: {},
    treaties: [],
    events: []
  };
}

export function validatePortConquestMemory(memory) {
  if (!memory || typeof memory !== "object" || Array.isArray(memory)) {
    throw new Error("Port conquest memory must be an object");
  }
  if (!memory.portFactionOverrides || typeof memory.portFactionOverrides !== "object" ||
      Array.isArray(memory.portFactionOverrides)) {
    throw new Error("Port conquest faction overrides must be an object");
  }
  for (const [portId, factionId] of Object.entries(memory.portFactionOverrides)) {
    if (portId.trim() === "") throw new Error("Port conquest override has an empty port id");
    assertFactionId(factionId);
  }
  if (!memory.cityDisplayNameOverrides || typeof memory.cityDisplayNameOverrides !== "object" ||
      Array.isArray(memory.cityDisplayNameOverrides)) {
    throw new Error("Conquest city display-name overrides must be an object");
  }
  for (const [portId, displayName] of Object.entries(memory.cityDisplayNameOverrides)) {
    if (portId.trim() === "" || typeof displayName !== "string" || displayName.trim() === "") {
      throw new Error(`Invalid conquest city display-name override: ${portId}`);
    }
  }
  if (!memory.factionCapitalOverrides ||
      typeof memory.factionCapitalOverrides !== "object" ||
      Array.isArray(memory.factionCapitalOverrides)) {
    throw new Error("Port conquest capital overrides must be an object");
  }
  for (const [factionId, portId] of Object.entries(memory.factionCapitalOverrides)) {
    assertFactionId(factionId);
    if (factionId === NEUTRAL_FACTION_ID || typeof portId !== "string" || portId.trim() === "") {
      throw new Error(`Invalid conquest capital override: ${factionId} -> ${portId}`);
    }
  }
  if (!Array.isArray(memory.collapsedFactionIds)) {
    throw new Error("Collapsed factions must be an array");
  }
  const collapsed = new Set();
  for (const factionId of memory.collapsedFactionIds) {
    assertFactionId(factionId);
    if (factionId === NEUTRAL_FACTION_ID) throw new Error("Neutral cannot be a collapsed empire");
    if (collapsed.has(factionId)) throw new Error(`Duplicate collapsed faction: ${factionId}`);
    collapsed.add(factionId);
  }
  if (!memory.factionSuccessors || typeof memory.factionSuccessors !== "object" ||
      Array.isArray(memory.factionSuccessors)) {
    throw new Error("Faction successor registry must be an object");
  }
  for (const [predecessorFactionId, successorFactionId] of Object.entries(memory.factionSuccessors)) {
    assertFactionId(predecessorFactionId);
    assertFactionId(successorFactionId);
    if (predecessorFactionId === successorFactionId) {
      throw new Error(`Faction cannot succeed itself: ${predecessorFactionId}`);
    }
  }
  if (!Array.isArray(memory.treaties) || memory.treaties.length > PORT_CONQUEST_TREATY_LIMIT) {
    throw new Error("Invalid conquest peace treaties");
  }
  for (const treaty of memory.treaties) validatePeaceTreaty(treaty);
  if (!Array.isArray(memory.events)) throw new Error("Port conquest events must be an array");
  return memory;
}

export function portConquestStatus({
  city,
  batteryDisabled,
  crew,
  crewCapacity,
  attackerFactionId,
  assaultChanceBonus = 0,
  auxiliaryTroops = 0
}) {
  assertCity(city);
  assertFactionId(attackerFactionId);
  assertCrew(crew, "crew");
  assertCrew(crewCapacity, "crew capacity");
  assertCrew(auxiliaryTroops, "auxiliary troops");
  if (crew > crewCapacity) throw new Error("Port conquest crew exceeds ship capacity");
  if (!Number.isFinite(assaultChanceBonus) || assaultChanceBonus < 0 || assaultChanceBonus > 0.5) {
    throw new Error(`Invalid port assault chance bonus: ${assaultChanceBonus}`);
  }

  const alreadyOwned = city.factionId === attackerFactionId;
  const largeWarship = crewCapacity >= PORT_CONQUEST_MIN_CREW;
  const landingForce = crew + auxiliaryTroops;
  const enoughCrew = landingForce >= PORT_CONQUEST_MIN_CREW;
  const canAttempt = !alreadyOwned && batteryDisabled === true && largeWarship && enoughCrew;
  const capital = city.isFactionCapital === true;
  const crewAdvantage = Math.max(0, landingForce - PORT_CONQUEST_MIN_CREW);
  const population = Math.max(1000, Number(city.population || 1000));
  if (!Number.isFinite(population)) throw new Error(`Invalid conquest port population: ${city.population}`);
  const populationPenalty = clamp((Math.log10(population) - 3.3) * 0.08, 0, 0.16);
  const crewChance = (capital ? 0.24 : 0.48) + crewAdvantage * (capital ? 0.003 : 0.005);
  const baseSuccessChance = clamp(
    crewChance - populationPenalty,
    capital ? 0.15 : 0.32,
    capital ? 0.42 : 0.72
  );
  const successChance = clamp(baseSuccessChance + assaultChanceBonus, 0, 0.9);
  const lossRange = capital
    ? crewLossRange(landingForce, 0.42, 0.66)
    : crewLossRange(landingForce, 0.27, 0.48);

  return {
    canAttempt,
    alreadyOwned,
    batteryDisabled: batteryDisabled === true,
    largeWarship,
    enoughCrew,
    capital,
    minimumCrew: PORT_CONQUEST_MIN_CREW,
    landingForce,
    auxiliaryTroops,
    populationPenalty,
    assaultChanceBonus,
    successChance,
    successPercent: Math.round(successChance * 100),
    failureCrewLossMin: lossRange.min,
    failureCrewLossMax: lossRange.max
  };
}

export function resolvePortConquest(status, successRoll, casualtyRoll) {
  if (!status?.canAttempt) throw new Error("Cannot resolve an ineligible port conquest");
  assertRoll(successRoll, "success");
  assertRoll(casualtyRoll, "casualty");
  if (successRoll < status.successChance) {
    return { success: true, crewLost: 0, auxiliaryLost: 0, totalLost: 0 };
  }
  const span = status.failureCrewLossMax - status.failureCrewLossMin + 1;
  const totalLost = status.failureCrewLossMin + Math.min(
    span - 1,
    Math.floor(casualtyRoll * span)
  );
  const auxiliaryLost = Math.min(status.auxiliaryTroops || 0, totalLost);
  return {
    success: false,
    crewLost: totalLost - auxiliaryLost,
    auxiliaryLost,
    totalLost
  };
}

export function npcPortConquestChance(city) {
  assertCity(city);
  return city.isFactionCapital ? PORT_CONQUEST_NPC_CAPITAL_CHANCE : PORT_CONQUEST_NPC_CHANCE;
}

export function portConquestPrize(city) {
  assertCity(city);
  const population = Math.max(0, Number(city.population || 0));
  if (!Number.isFinite(population)) throw new Error(`Invalid conquest port population: ${city.population}`);
  const portWealth = Math.min(1400, population / 75);
  const capitalTreasury = city.isFactionCapital ? PORT_CONQUEST_CAPITAL_TREASURY_BONUS : 0;
  return Math.round((600 + portWealth + capitalTreasury) / 50) * 50;
}

export function portRaidPrize(city) {
  return Math.max(100, Math.round((portConquestPrize(city) * 0.65) / 50) * 50);
}

export function recordPortCapture(memory, city, newFactionId, simMinute, source = "player") {
  validatePortConquestMemory(memory);
  assertCity(city);
  assertFactionId(newFactionId);
  if (!Number.isFinite(simMinute) || simMinute < 0) throw new Error(`Invalid conquest minute: ${simMinute}`);
  if (typeof source !== "string" || source.trim() === "") throw new Error("Port conquest source is required");
  const portId = portConquestPortId(city);
  const previousFactionId = assertFactionId(city.factionId);
  if (previousFactionId === newFactionId) throw new Error(`${portId} is already owned by ${newFactionId}`);

  memory.portFactionOverrides[portId] = newFactionId;
  const capitalCapturedFactionId = city.isFactionCapital &&
    city.capitalOfFactionId === previousFactionId
    ? previousFactionId
    : null;
  memory.events.push({
    id: `capture-${simMinute}-${portId}`,
    portId,
    cityTileId: city.tileId,
    cityName: city.displayCity || city.city,
    previousFactionId,
    newFactionId,
    capitalCapturedFactionId,
    collapsedFactionId: null,
    peaceTreatyId: null,
    simMinute,
    source
  });
  if (memory.events.length > PORT_CONQUEST_EVENT_LIMIT) {
    memory.events.splice(0, memory.events.length - PORT_CONQUEST_EVENT_LIMIT);
  }
  return memory.events[memory.events.length - 1];
}

export function capitalPeaceTreatyOptions(memory, ports, captureEvent, {
  papalExcommunicationTargetFactionId = null,
  cities = ports
} = {}) {
  validatePortConquestMemory(memory);
  assertPortList(ports);
  assertTreatyCityList(cities, ports);
  assertCapitalCaptureEvent(captureEvent);
  const controlledPorts = factionControlledPorts(
    memory,
    ports,
    captureEvent.previousFactionId,
    captureEvent.portId
  );
  const controlledCities = factionControlledCities(
    memory,
    cities,
    captureEvent.previousFactionId,
    captureEvent.portId
  );
  const annexationAllowed = controlledCities.length <= CAPITAL_PEACE_ANNEXATION_CITY_LIMIT;
  const concessionCandidates = controlledCities.filter((city) => (
    portConquestPortId(city) !== captureEvent.portId && city.isFactionCapital !== true
  ));
  const previousPeaceMinute = memory.treaties
    .filter((treaty) => (
      (treaty.loserFactionId === captureEvent.previousFactionId &&
        treaty.winnerFactionId === captureEvent.newFactionId) ||
      (treaty.loserFactionId === captureEvent.newFactionId &&
        treaty.winnerFactionId === captureEvent.previousFactionId)
    ))
    .reduce((latest, treaty) => Math.max(latest, treaty.simMinute), -1);
  const occupiedCityIds = new Set(memory.events
    .filter((event) => (
      event.simMinute > previousPeaceMinute &&
      event.simMinute <= captureEvent.simMinute &&
      event.previousFactionId === captureEvent.previousFactionId &&
      event.newFactionId === captureEvent.newFactionId
    ))
    .map((event) => event.portId));
  const originalLosingCityIds = new Set([
    ...controlledCities.map(portConquestPortId),
    ...occupiedCityIds
  ]);
  const occupiedCityCount = occupiedCityIds.size;
  const winnerCityCount = cities.filter((city) => (
    effectivePortFactionId(memory, city) === captureEvent.newFactionId
  )).length;
  const decisionFactors = {
    originalLosingCityCount: originalLosingCityIds.size,
    occupiedCityCount,
    winnerCityCount,
    occupationRatio: occupiedCityCount /
      Math.max(1, originalLosingCityIds.size),
    concessionCandidateCount: concessionCandidates.length
  };
  const papalSettlement = isChristianCaptureOfPapacy(captureEvent);
  if (papalSettlement) {
    if (papalExcommunicationTargetFactionId !== null) {
      assertFactionId(papalExcommunicationTargetFactionId);
    }
    return Object.freeze({
      annexationAllowed: false,
      losingPortCount: controlledPorts.length,
      losingCityCount: controlledCities.length,
      concessionAvailable: false,
      papalSettlement: true,
      ...decisionFactors,
      terms: Object.freeze([
        CAPITAL_PEACE_TERM_PAPAL_FAVOUR,
        ...(papalExcommunicationTargetFactionId
          ? [CAPITAL_PEACE_TERM_PAPAL_EXCOMMUNICATION]
          : [])
      ])
    });
  }
  return Object.freeze({
    annexationAllowed,
    losingPortCount: controlledPorts.length,
    losingCityCount: controlledCities.length,
    concessionAvailable: concessionCandidates.length > 0,
    papalSettlement: false,
    ...decisionFactors,
    terms: Object.freeze([
      CAPITAL_PEACE_TERM_VASSALAGE,
      CAPITAL_PEACE_TERM_AUTONOMOUS_VASSALAGE,
      CAPITAL_PEACE_TERM_TRIBUTARY,
      ...(concessionCandidates.length > 0 ? [CAPITAL_PEACE_TERM_CONCESSIONS] : []),
      ...(annexationAllowed ? [CAPITAL_PEACE_TERM_ANNEXATION] : [])
    ])
  });
}

export function chooseCapitalPeaceSettlement(memory, ports, captureEvent, roll = 0.5, context = {}) {
  assertRoll(roll, "capital peace");
  const options = capitalPeaceTreatyOptions(memory, ports, captureEvent, context);
  if (options.papalSettlement) {
    return Object.freeze({
      term: options.terms.includes(CAPITAL_PEACE_TERM_PAPAL_EXCOMMUNICATION) && roll < 0.38
        ? CAPITAL_PEACE_TERM_PAPAL_EXCOMMUNICATION
        : CAPITAL_PEACE_TERM_PAPAL_FAVOUR,
      additionalConcessionCount: 0
    });
  }
  const originalSize = Math.max(1, options.originalLosingCityCount);
  const winnerStrength = clamp(options.winnerCityCount / originalSize / 3, 0, 1);
  const annexationWeight = options.annexationAllowed
    ? (CAPITAL_PEACE_ANNEXATION_CITY_LIMIT + 1 - options.losingCityCount) * 3 +
      options.occupationRatio * 2 + winnerStrength
    : 0;
  const vassalageWeight = 2 + options.occupationRatio * 2 + winnerStrength * 2 +
    (options.losingCityCount <= 6 ? 0.8 : 0);
  const autonomousVassalageWeight = 2.4 + (1 - options.occupationRatio) * 1.4 +
    Math.min(2.5, options.losingCityCount * 0.22) + winnerStrength;
  const tributaryWeight = 1.5 + (1 - options.occupationRatio) * 2.2 +
    Math.min(3, options.losingCityCount * 0.3) + (1 - winnerStrength);
  const concessionsWeight = options.concessionAvailable
    ? 2 + Math.max(0, options.losingCityCount - CAPITAL_PEACE_ANNEXATION_CITY_LIMIT) * 0.65 +
      (1 - options.occupationRatio) * 2
    : 0;
  const weightedTerms = [
    [CAPITAL_PEACE_TERM_ANNEXATION, annexationWeight],
    [CAPITAL_PEACE_TERM_VASSALAGE, vassalageWeight],
    [CAPITAL_PEACE_TERM_AUTONOMOUS_VASSALAGE, autonomousVassalageWeight],
    [CAPITAL_PEACE_TERM_TRIBUTARY, tributaryWeight],
    [CAPITAL_PEACE_TERM_CONCESSIONS, concessionsWeight]
  ].filter(([, weight]) => weight > 0);
  const totalWeight = weightedTerms.reduce((sum, [, weight]) => sum + weight, 0);
  if (!(totalWeight > 0)) throw new Error("Capital peace settlement has no available sovereign terms");
  let cursor = roll * totalWeight;
  let selectedTerm = weightedTerms[weightedTerms.length - 1][0];
  let selectedTermRoll = 1;
  for (const [term, weight] of weightedTerms) {
    if (cursor < weight) {
      selectedTerm = term;
      selectedTermRoll = cursor / weight;
      break;
    }
    cursor -= weight;
  }
  const maximumAdditionalConcessions = Math.min(3, options.concessionCandidateCount);
  const decisivePressure = clamp(
    options.occupationRatio * 0.65 + winnerStrength * 0.35,
    0,
    1
  );
  const additionalConcessionCount = selectedTerm === CAPITAL_PEACE_TERM_CONCESSIONS
    ? clamp(
        1 + Math.floor(
          decisivePressure * Math.max(0, maximumAdditionalConcessions - 1) +
          selectedTermRoll * 0.35
        ),
        1,
        maximumAdditionalConcessions
      )
    : 0;
  return Object.freeze({ term: selectedTerm, additionalConcessionCount });
}

export function settleCapitalPeaceTreaty(
  memory,
  ports,
  captureEvent,
  term,
  simMinute,
  context = {}
) {
  validatePortConquestMemory(memory);
  assertPortList(ports);
  const cities = context.cities ?? ports;
  assertTreatyCityList(cities, ports);
  assertCapitalCaptureEvent(captureEvent);
  if (!CAPITAL_PEACE_TERMS.has(term)) throw new Error(`Invalid capital peace term: ${term}`);
  if (!Number.isFinite(simMinute) || simMinute < captureEvent.simMinute) {
    throw new Error(`Invalid capital peace minute: ${simMinute}`);
  }
  if (captureEvent.peaceTreatyId !== null) {
    throw new Error(`Capital capture already has a peace treaty: ${captureEvent.id}`);
  }
  const options = capitalPeaceTreatyOptions(memory, ports, captureEvent, context);
  if (!options.terms.includes(term)) {
    throw new Error(`Capital peace term is unavailable: ${term}`);
  }
  if (term === CAPITAL_PEACE_TERM_ANNEXATION && !options.annexationAllowed) {
    throw new Error(
      `${captureEvent.previousFactionId} is too large to annex: ${options.losingCityCount} cities`
    );
  }
  const loserFactionId = captureEvent.previousFactionId;
  const winnerFactionId = captureEvent.newFactionId;
  const capital = ports.find((port) => portConquestPortId(port) === captureEvent.portId);
  if (!capital) throw new Error(`Captured capital is absent from the port list: ${captureEvent.portId}`);
  const concessionCityIds = [];
  let annexedFactionId = null;
  const papalActionTargetFactionId = term === CAPITAL_PEACE_TERM_PAPAL_EXCOMMUNICATION
    ? context.papalExcommunicationTargetFactionId
    : term === CAPITAL_PEACE_TERM_PAPAL_FAVOUR
      ? winnerFactionId
      : null;
  if (term === CAPITAL_PEACE_TERM_PAPAL_EXCOMMUNICATION &&
      !papalActionTargetFactionId) {
    throw new Error("Papal excommunication peace requires a target faction");
  }

  if (term === CAPITAL_PEACE_TERM_ANNEXATION) {
    for (const city of factionControlledCities(memory, cities, loserFactionId, captureEvent.portId)) {
      memory.portFactionOverrides[portConquestPortId(city)] = winnerFactionId;
    }
    if (!memory.collapsedFactionIds.includes(loserFactionId)) {
      memory.collapsedFactionIds.push(loserFactionId);
    }
    delete memory.factionCapitalOverrides[loserFactionId];
    annexedFactionId = loserFactionId;
  } else {
    memory.portFactionOverrides[captureEvent.portId] = loserFactionId;
    const existingConcessions = cities.filter((city) => (
      (city.foundingFactionId || city.factionId) === loserFactionId &&
      portConquestPortId(city) !== captureEvent.portId &&
      effectivePortFactionId(memory, city) === winnerFactionId
    ));
    concessionCityIds.push(...existingConcessions.map(portConquestPortId));
    if (term === CAPITAL_PEACE_TERM_CONCESSIONS) {
      const additionalConcessionCount = context.additionalConcessionCount ?? 1;
      if (!Number.isInteger(additionalConcessionCount) || additionalConcessionCount < 1) {
        throw new Error(`Invalid additional territorial concession count: ${additionalConcessionCount}`);
      }
      const concessions = factionControlledCities(memory, cities, loserFactionId, captureEvent.portId)
        .filter((city) => (
          portConquestPortId(city) !== captureEvent.portId &&
          city.isFactionCapital !== true &&
          !concessionCityIds.includes(portConquestPortId(city))
        ))
        .sort((a, b) => concessionCityOrder(
          memory,
          cities,
          ports,
          capital,
          loserFactionId,
          winnerFactionId,
          a,
          b
        ));
      if (concessions.length < additionalConcessionCount) {
        throw new Error(
          `${loserFactionId} has only ${concessions.length} cities available for ` +
          `${additionalConcessionCount} territorial concessions`
        );
      }
      for (const concession of concessions.slice(0, additionalConcessionCount)) {
        const concessionCityId = portConquestPortId(concession);
        memory.portFactionOverrides[concessionCityId] = winnerFactionId;
        concessionCityIds.push(concessionCityId);
      }
    }
  }

  const uniqueConcessionCityIds = [...new Set(concessionCityIds)].sort();
  const cityById = new Map(cities.map((city) => [portConquestPortId(city), city]));
  const portIds = new Set(ports.map(portConquestPortId));
  const treaty = {
    id: `treaty-${simMinute}-${captureEvent.portId}`,
    capitalPortId: captureEvent.portId,
    loserFactionId,
    winnerFactionId,
    term,
    annexedFactionId,
    concessionCityIds: uniqueConcessionCityIds,
    concessionCityNames: uniqueConcessionCityIds.map((cityId) => cityDisplayName(cityById.get(cityId))),
    concessionPortIds: uniqueConcessionCityIds.filter((cityId) => portIds.has(cityId)),
    papalActionTargetFactionId,
    simMinute,
    source: captureEvent.source
  };
  captureEvent.peaceTreatyId = treaty.id;
  captureEvent.collapsedFactionId = annexedFactionId;
  memory.treaties.unshift(treaty);
  if (memory.treaties.length > PORT_CONQUEST_TREATY_LIMIT) {
    memory.treaties.length = PORT_CONQUEST_TREATY_LIMIT;
  }
  return treaty;
}

export function effectivePortFactionId(memory, city) {
  validatePortConquestMemory(memory);
  assertCity(city);
  const override = memory.portFactionOverrides[portConquestPortId(city)];
  if (override) return assertFactionId(override);
  const foundingFactionId = assertFactionId(city.foundingFactionId || city.factionId);
  return memory.collapsedFactionIds.includes(foundingFactionId) ? NEUTRAL_FACTION_ID : foundingFactionId;
}

export function applyPortConquestOwnership(memory, ports) {
  validatePortConquestMemory(memory);
  if (!Array.isArray(ports)) throw new Error("Conquest ownership requires a city list");
  const capitalFactionByPortId = new Map(
    Object.entries(memory.factionCapitalOverrides).map(([factionId, portId]) => [portId, factionId])
  );
  for (const city of ports) {
    assertCity(city);
    city.foundingFactionId = city.foundingFactionId || city.factionId;
    if (!("foundingDisplayCity" in city)) {
      city.foundingDisplayCity = city.displayCity || city.city;
    }
    if (!("foundingCapitalOfFactionId" in city)) {
      city.foundingCapitalOfFactionId = city.capitalOfFactionId || null;
    }
    city.factionId = effectivePortFactionId(memory, city);
    const portId = portConquestPortId(city);
    city.displayCity = memory.cityDisplayNameOverrides[portId] || city.foundingDisplayCity;
    const overrideCapitalFactionId = capitalFactionByPortId.get(portId) || null;
    const foundingCapitalFactionId = city.foundingCapitalOfFactionId;
    const foundingCapitalWasMoved = foundingCapitalFactionId !== null &&
      memory.factionCapitalOverrides[foundingCapitalFactionId] !== undefined;
    city.capitalOfFactionId = overrideCapitalFactionId ||
      (!foundingCapitalWasMoved && foundingCapitalFactionId === city.factionId
        ? foundingCapitalFactionId
        : null);
    city.isFactionCapital = city.capitalOfFactionId !== null;
  }
  return ports;
}

export function recordCityDisplayName(memory, city, displayName) {
  validatePortConquestMemory(memory);
  assertCity(city);
  if (typeof displayName !== "string" || displayName.trim() === "") {
    throw new Error("Conquest city display name must be non-empty");
  }
  memory.cityDisplayNameOverrides[portConquestPortId(city)] = displayName.trim();
  return displayName.trim();
}

export function markFactionCollapsedByConquest(memory, {
  factionId,
  successorFactionId,
  simMinute,
  source
}) {
  validatePortConquestMemory(memory);
  assertFactionId(factionId);
  assertFactionId(successorFactionId);
  if (factionId === successorFactionId || factionId === NEUTRAL_FACTION_ID) {
    throw new Error("Conquest collapse requires distinct sovereign factions");
  }
  if (!Number.isFinite(simMinute) || simMinute < 0) {
    throw new Error(`Invalid conquest collapse minute: ${simMinute}`);
  }
  if (typeof source !== "string" || source.trim() === "") {
    throw new Error("Conquest collapse source is required");
  }
  if (memory.collapsedFactionIds.includes(factionId)) return null;
  memory.collapsedFactionIds.push(factionId);
  memory.factionSuccessors[factionId] = successorFactionId;
  delete memory.factionCapitalOverrides[factionId];
  const event = {
    id: `collapse-${simMinute}-${factionId}`,
    kind: "faction-collapse",
    factionId,
    successorFactionId,
    simMinute,
    source
  };
  memory.events.push(event);
  if (memory.events.length > PORT_CONQUEST_EVENT_LIMIT) {
    memory.events.splice(0, memory.events.length - PORT_CONQUEST_EVENT_LIMIT);
  }
  validatePortConquestMemory(memory);
  return Object.freeze(event);
}

export function restoreCollapsedFactionAtCities(memory, cities, {
  factionId,
  capitalCity,
  simMinute,
  source
}) {
  validatePortConquestMemory(memory);
  assertFactionId(factionId);
  if (factionId === NEUTRAL_FACTION_ID) throw new Error("Neutral cannot be restored as a faction");
  if (!memory.collapsedFactionIds.includes(factionId)) {
    throw new Error(`Faction restoration requires a collapsed faction: ${factionId}`);
  }
  if (!Array.isArray(cities) || cities.length === 0) {
    throw new Error("Faction restoration requires at least one city");
  }
  for (const city of cities) assertCity(city);
  assertCity(capitalCity);
  const capitalPortId = portConquestPortId(capitalCity);
  if (!cities.some((city) => portConquestPortId(city) === capitalPortId)) {
    throw new Error("Faction restoration capital must be among its granted cities");
  }
  if (!Number.isFinite(simMinute) || simMinute < 0) {
    throw new Error(`Invalid faction restoration minute: ${simMinute}`);
  }
  if (typeof source !== "string" || source.trim() === "") {
    throw new Error("Faction restoration source is required");
  }

  for (const city of cities) {
    memory.portFactionOverrides[portConquestPortId(city)] = factionId;
  }
  memory.collapsedFactionIds = memory.collapsedFactionIds.filter((id) => id !== factionId);
  memory.factionCapitalOverrides[factionId] = capitalPortId;
  const event = {
    id: `restoration-${simMinute}-${factionId}`,
    kind: "faction-restoration",
    factionId,
    capitalPortId,
    cityPortIds: cities.map(portConquestPortId),
    simMinute,
    source
  };
  memory.events.push(event);
  if (memory.events.length > PORT_CONQUEST_EVENT_LIMIT) {
    memory.events.splice(0, memory.events.length - PORT_CONQUEST_EVENT_LIMIT);
  }
  validatePortConquestMemory(memory);
  return event;
}

export function replaceFactionAtControlledCities(memory, cities, {
  predecessorFactionId,
  successorFactionId,
  capitalCity,
  simMinute,
  source
}) {
  validatePortConquestMemory(memory);
  assertFactionId(predecessorFactionId);
  assertFactionId(successorFactionId);
  if (predecessorFactionId === successorFactionId) {
    throw new Error("Faction succession requires two different factions");
  }
  if (!Array.isArray(cities) || cities.length === 0) {
    throw new Error("Faction succession requires a city list");
  }
  for (const city of cities) assertCity(city);
  assertCity(capitalCity);
  if (!Number.isFinite(simMinute) || simMinute < 0) {
    throw new Error(`Invalid faction succession minute: ${simMinute}`);
  }
  if (typeof source !== "string" || source.trim() === "") {
    throw new Error("Faction succession source is required");
  }
  if (effectivePortFactionId(memory, capitalCity) !== predecessorFactionId) {
    throw new Error(`Faction succession capital is not controlled by ${predecessorFactionId}`);
  }
  if (!memory.collapsedFactionIds.includes(successorFactionId)) {
    throw new Error(`Faction succession requires inactive successor: ${successorFactionId}`);
  }
  const controlledCities = cities.filter((city) => (
    effectivePortFactionId(memory, city) === predecessorFactionId
  ));
  if (controlledCities.length === 0) {
    throw new Error(`Faction succession found no ${predecessorFactionId} cities`);
  }

  for (const city of controlledCities) {
    memory.portFactionOverrides[portConquestPortId(city)] = successorFactionId;
  }
  if (!memory.collapsedFactionIds.includes(predecessorFactionId)) {
    memory.collapsedFactionIds.push(predecessorFactionId);
  }
  memory.collapsedFactionIds = memory.collapsedFactionIds.filter((id) => id !== successorFactionId);
  delete memory.factionCapitalOverrides[predecessorFactionId];
  const capitalPortId = portConquestPortId(capitalCity);
  memory.factionCapitalOverrides[successorFactionId] = capitalPortId;
  memory.factionSuccessors[predecessorFactionId] = successorFactionId;
  const event = {
    id: `succession-${simMinute}-${predecessorFactionId}-${successorFactionId}`,
    kind: "faction-succession",
    predecessorFactionId,
    successorFactionId,
    capitalPortId,
    cityPortIds: controlledCities.map(portConquestPortId),
    simMinute,
    source
  };
  memory.events.push(event);
  if (memory.events.length > PORT_CONQUEST_EVENT_LIMIT) {
    memory.events.splice(0, memory.events.length - PORT_CONQUEST_EVENT_LIMIT);
  }
  validatePortConquestMemory(memory);
  return Object.freeze(event);
}

export function portConquestPortId(city) {
  assertCity(city);
  return city.portId || `city-${city.tileId}`;
}

export function markPlayerPortAssault(flags, city, untilMinute) {
  assertFlags(flags);
  assertCity(city);
  if (!Number.isFinite(untilMinute) || untilMinute <= 0) {
    throw new Error(`Invalid player port assault expiry: ${untilMinute}`);
  }
  flags[playerAssaultFlagKey(city)] = untilMinute;
  return untilMinute;
}

export function playerPortAssaultIsActive(flags, city, simMinute) {
  assertFlags(flags);
  assertCity(city);
  if (!Number.isFinite(simMinute) || simMinute < 0) throw new Error(`Invalid assault minute: ${simMinute}`);
  const value = flags[playerAssaultFlagKey(city)];
  if (value === undefined) return false;
  if (!Number.isFinite(value) || value <= 0) throw new Error(`Invalid stored port assault expiry: ${value}`);
  if (simMinute < value) return true;
  delete flags[playerAssaultFlagKey(city)];
  return false;
}

export function clearPlayerPortAssault(flags, city) {
  assertFlags(flags);
  assertCity(city);
  delete flags[playerAssaultFlagKey(city)];
}

export function markPlayerPortRaided(flags, city, untilMinute) {
  assertFlags(flags);
  assertCity(city);
  if (!Number.isFinite(untilMinute) || untilMinute <= 0) {
    throw new Error(`Invalid player port raid expiry: ${untilMinute}`);
  }
  flags[playerRaidFlagKey(city)] = untilMinute;
  return untilMinute;
}

export function playerPortRaidIsActive(flags, city, simMinute) {
  assertFlags(flags);
  assertCity(city);
  if (!Number.isFinite(simMinute) || simMinute < 0) throw new Error(`Invalid raid minute: ${simMinute}`);
  const value = flags[playerRaidFlagKey(city)];
  if (value === undefined) return false;
  if (!Number.isFinite(value) || value <= 0) throw new Error(`Invalid stored port raid expiry: ${value}`);
  if (simMinute < value) return true;
  delete flags[playerRaidFlagKey(city)];
  return false;
}

export function clearPlayerPortRaid(flags, city) {
  assertFlags(flags);
  assertCity(city);
  delete flags[playerRaidFlagKey(city)];
}

function crewLossRange(crew, minRatio, maxRatio) {
  return {
    min: Math.max(1, Math.ceil(crew * minRatio)),
    max: Math.max(1, Math.ceil(crew * maxRatio))
  };
}

function playerRaidFlagKey(city) {
  return `${PLAYER_RAID_FLAG_PREFIX}${portConquestPortId(city)}`;
}

function assertCity(city) {
  if (!city || !Number.isInteger(city.tileId) || !city.factionId) {
    throw new Error("Port conquest requires a faction city");
  }
}

function assertPortList(ports) {
  if (!Array.isArray(ports) || ports.length === 0) {
    throw new Error("Capital peace treaty requires ports");
  }
  for (const port of ports) assertCity(port);
}

function assertCapitalCaptureEvent(event) {
  if (!event || typeof event !== "object" || !event.capitalCapturedFactionId ||
      event.capitalCapturedFactionId !== event.previousFactionId) {
    throw new Error("Capital peace treaty requires an unsettled capital capture");
  }
  assertFactionId(event.previousFactionId);
  assertFactionId(event.newFactionId);
}

function factionControlledPorts(memory, ports, factionId, capturedCapitalPortId) {
  return ports.filter((port) => {
    const portId = portConquestPortId(port);
    return portId === capturedCapitalPortId ||
      effectivePortFactionId(memory, port) === factionId;
  });
}

function factionControlledCities(memory, cities, factionId, capturedCapitalPortId) {
  return cities.filter((city) => {
    const cityId = portConquestPortId(city);
    return cityId === capturedCapitalPortId ||
      effectivePortFactionId(memory, city) === factionId;
  });
}

function isChristianCaptureOfPapacy(captureEvent) {
  if (captureEvent.previousFactionId !== "papal-states") return false;
  const ruler = rulerAtMinute(captureEvent.newFactionId, captureEvent.simMinute);
  return ruler !== null && isChristianReligion(ruler.religionId);
}

function concessionCityOrder(
  memory,
  cities,
  ports,
  capital,
  loserFactionId,
  winnerFactionId,
  a,
  b
) {
  const occupiedEnemyCities = cities.filter((city) => (
    (city.foundingFactionId || city.factionId) === loserFactionId &&
    effectivePortFactionId(memory, city) === winnerFactionId
  ));
  const winnerCities = occupiedEnemyCities.length > 0
    ? occupiedEnemyCities
    : cities.filter((city) => effectivePortFactionId(memory, city) === winnerFactionId);
  const portIds = new Set(ports.map(portConquestPortId));
  const scoreDifference = concessionCityScore(b, capital, winnerCities, portIds) -
    concessionCityScore(a, capital, winnerCities, portIds);
  return scoreDifference || portConquestPortId(a).localeCompare(portConquestPortId(b));
}

function concessionCityScore(city, capital, winnerCities, portIds) {
  const port = portIds.has(portConquestPortId(city));
  const overseasPort = port &&
    typeof city.country === "string" &&
    typeof capital.country === "string" &&
    city.country !== capital.country;
  const frontierDistanceKm = nearestCityDistanceKm(city, winnerCities);
  const frontierScore = Number.isFinite(frontierDistanceKm)
    ? Math.max(0, 1600 - frontierDistanceKm) * 0.75
    : 0;
  const population = Math.max(1000, Number(city.population || 1000));
  if (!Number.isFinite(population)) {
    throw new Error(`Invalid territorial concession population: ${city.population}`);
  }
  return frontierScore +
    (port ? 500 : 0) +
    (overseasPort ? 2000 : 0) +
    Math.log10(population) * 100;
}

function nearestCityDistanceKm(city, destinations) {
  if (!Number.isFinite(city.lat) || !Number.isFinite(city.lon)) return Number.POSITIVE_INFINITY;
  let nearest = Number.POSITIVE_INFINITY;
  for (const destination of destinations) {
    if (!Number.isFinite(destination.lat) || !Number.isFinite(destination.lon)) continue;
    nearest = Math.min(nearest, greatCircleDistanceKm(city, destination));
  }
  return nearest;
}

function cityDisplayName(city) {
  if (!city) throw new Error("Territorial concession city is absent from the treaty catalog");
  const name = city.displayCity || city.city;
  if (typeof name !== "string" || name.trim() === "") {
    throw new Error(`Territorial concession city ${portConquestPortId(city)} has no display name`);
  }
  return name;
}

function validatePeaceTreaty(treaty) {
  if (!treaty || typeof treaty !== "object" || typeof treaty.id !== "string" || treaty.id === "") {
    throw new Error("Invalid conquest peace treaty");
  }
  assertFactionId(treaty.loserFactionId);
  assertFactionId(treaty.winnerFactionId);
  if (!CAPITAL_PEACE_TERMS.has(treaty.term)) {
    throw new Error(`Invalid conquest peace term: ${treaty.term}`);
  }
  if (!Array.isArray(treaty.concessionPortIds) ||
      treaty.concessionPortIds.some((portId) => typeof portId !== "string" || portId === "")) {
    throw new Error(`Invalid territorial concessions in treaty ${treaty.id}`);
  }
  const concessionCityIds = treaty.concessionCityIds ?? treaty.concessionPortIds;
  if (!Array.isArray(concessionCityIds) ||
      concessionCityIds.some((cityId) => typeof cityId !== "string" || cityId === "" ||
        !cityId.trim())) {
    throw new Error(`Invalid territorial cities in treaty ${treaty.id}`);
  }
  if (treaty.concessionCityIds &&
      treaty.concessionPortIds.some((portId) => !treaty.concessionCityIds.includes(portId))) {
    throw new Error(`Treaty ports are not included in its territorial cities: ${treaty.id}`);
  }
  if (treaty.concessionCityNames !== undefined && (
    !Array.isArray(treaty.concessionCityNames) ||
    treaty.concessionCityNames.length !== concessionCityIds.length ||
    treaty.concessionCityNames.some((name) => typeof name !== "string" || name.trim() === "")
  )) {
    throw new Error(`Invalid territorial city names in treaty ${treaty.id}`);
  }
  if (treaty.term === CAPITAL_PEACE_TERM_PAPAL_FAVOUR) {
    if (treaty.loserFactionId !== "papal-states" ||
        treaty.papalActionTargetFactionId !== treaty.winnerFactionId) {
      throw new Error(`Invalid papal favour treaty ${treaty.id}`);
    }
  } else if (treaty.term === CAPITAL_PEACE_TERM_PAPAL_EXCOMMUNICATION) {
    if (treaty.loserFactionId !== "papal-states" ||
        typeof treaty.papalActionTargetFactionId !== "string") {
      throw new Error(`Invalid papal excommunication treaty ${treaty.id}`);
    }
    assertFactionId(treaty.papalActionTargetFactionId);
  } else if (treaty.papalActionTargetFactionId !== undefined &&
      treaty.papalActionTargetFactionId !== null) {
    throw new Error(`Ordinary treaty has a papal action target: ${treaty.id}`);
  }
  if (!Number.isFinite(treaty.simMinute) || treaty.simMinute < 0) {
    throw new Error(`Invalid conquest treaty minute: ${treaty.simMinute}`);
  }
}

function assertCrew(value, label) {
  if (!Number.isInteger(value) || value < 0) throw new Error(`Invalid conquest ${label}: ${value}`);
}

function assertTreatyCityList(cities, ports) {
  if (!Array.isArray(cities) || cities.length === 0) {
    throw new Error("Capital peace treaty requires cities");
  }
  const cityIds = new Set();
  for (const city of cities) {
    assertCity(city);
    const cityId = portConquestPortId(city);
    if (cityIds.has(cityId)) throw new Error(`Duplicate treaty city: ${cityId}`);
    cityIds.add(cityId);
  }
  for (const port of ports) {
    const portId = portConquestPortId(port);
    if (!cityIds.has(portId)) throw new Error(`Treaty city list is missing port: ${portId}`);
  }
}

function assertFlags(flags) {
  if (!flags || typeof flags !== "object" || Array.isArray(flags)) {
    throw new Error("Port assault flags must be an object");
  }
}

function playerAssaultFlagKey(city) {
  return `${PLAYER_ASSAULT_FLAG_PREFIX}${portConquestPortId(city)}`;
}

function assertRoll(value, label) {
  if (!Number.isFinite(value) || value < 0 || value >= 1) throw new Error(`Invalid conquest ${label} roll: ${value}`);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
