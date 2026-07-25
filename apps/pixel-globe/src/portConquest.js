import { NEUTRAL_FACTION_ID, assertFactionId } from "./factions.js";

export const PORT_CONQUEST_MIN_CREW = 36;
export const PORT_CONQUEST_NPC_LANDING_RANGE_PX = 28;
export const PORT_CONQUEST_NPC_CHANCE = 0.28;
export const PORT_CONQUEST_NPC_CAPITAL_CHANCE = 0.08;
export const PORT_CONQUEST_CAPITAL_TREASURY_BONUS = 2500;
export const CAPITAL_PEACE_ANNEXATION_PORT_LIMIT = 3;
export const CAPITAL_PEACE_TERM_ANNEXATION = "annexation";
export const CAPITAL_PEACE_TERM_VASSALAGE = "vassalage";
export const CAPITAL_PEACE_TERM_CONCESSIONS = "territorial-concessions";

const PORT_CONQUEST_EVENT_LIMIT = 80;
const PORT_CONQUEST_TREATY_LIMIT = 40;
const CAPITAL_PEACE_TERMS = new Set([
  CAPITAL_PEACE_TERM_ANNEXATION,
  CAPITAL_PEACE_TERM_VASSALAGE,
  CAPITAL_PEACE_TERM_CONCESSIONS
]);
const PLAYER_ASSAULT_FLAG_PREFIX = "playerPortAssaultUntil:";

export function createPortConquestMemory() {
  return {
    portFactionOverrides: {},
    collapsedFactionIds: [],
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
  assaultChanceBonus = 0
}) {
  assertCity(city);
  assertFactionId(attackerFactionId);
  assertCrew(crew, "crew");
  assertCrew(crewCapacity, "crew capacity");
  if (crew > crewCapacity) throw new Error("Port conquest crew exceeds ship capacity");
  if (!Number.isFinite(assaultChanceBonus) || assaultChanceBonus < 0 || assaultChanceBonus > 0.5) {
    throw new Error(`Invalid port assault chance bonus: ${assaultChanceBonus}`);
  }

  const alreadyOwned = city.factionId === attackerFactionId;
  const largeWarship = crewCapacity >= PORT_CONQUEST_MIN_CREW;
  const enoughCrew = crew >= PORT_CONQUEST_MIN_CREW;
  const canAttempt = !alreadyOwned && batteryDisabled === true && largeWarship && enoughCrew;
  const capital = city.isFactionCapital === true;
  const crewAdvantage = Math.max(0, crew - PORT_CONQUEST_MIN_CREW);
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
    ? crewLossRange(crew, 0.42, 0.66)
    : crewLossRange(crew, 0.27, 0.48);

  return {
    canAttempt,
    alreadyOwned,
    batteryDisabled: batteryDisabled === true,
    largeWarship,
    enoughCrew,
    capital,
    minimumCrew: PORT_CONQUEST_MIN_CREW,
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
    return { success: true, crewLost: 0 };
  }
  const span = status.failureCrewLossMax - status.failureCrewLossMin + 1;
  return {
    success: false,
    crewLost: status.failureCrewLossMin + Math.min(span - 1, Math.floor(casualtyRoll * span))
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

export function capitalPeaceTreatyOptions(memory, ports, captureEvent) {
  validatePortConquestMemory(memory);
  assertPortList(ports);
  assertCapitalCaptureEvent(captureEvent);
  const controlledPorts = factionControlledPorts(
    memory,
    ports,
    captureEvent.previousFactionId,
    captureEvent.portId
  );
  const annexationAllowed = controlledPorts.length <= CAPITAL_PEACE_ANNEXATION_PORT_LIMIT;
  const concessionCandidates = controlledPorts.filter((port) => (
    portConquestPortId(port) !== captureEvent.portId && port.isFactionCapital !== true
  ));
  return Object.freeze({
    annexationAllowed,
    losingPortCount: controlledPorts.length,
    concessionAvailable: concessionCandidates.length > 0,
    terms: Object.freeze([
      CAPITAL_PEACE_TERM_VASSALAGE,
      ...(concessionCandidates.length > 0 ? [CAPITAL_PEACE_TERM_CONCESSIONS] : []),
      ...(annexationAllowed ? [CAPITAL_PEACE_TERM_ANNEXATION] : [])
    ])
  });
}

export function chooseCapitalPeaceTerm(memory, ports, captureEvent, roll = 0.5) {
  assertRoll(roll, "capital peace");
  const options = capitalPeaceTreatyOptions(memory, ports, captureEvent);
  if (captureEvent.source === "player") {
    return options.annexationAllowed
      ? CAPITAL_PEACE_TERM_ANNEXATION
      : CAPITAL_PEACE_TERM_VASSALAGE;
  }
  if (options.annexationAllowed && roll < 0.35) return CAPITAL_PEACE_TERM_ANNEXATION;
  if (roll < 0.72 || !options.concessionAvailable) return CAPITAL_PEACE_TERM_VASSALAGE;
  return CAPITAL_PEACE_TERM_CONCESSIONS;
}

export function settleCapitalPeaceTreaty(memory, ports, captureEvent, term, simMinute) {
  validatePortConquestMemory(memory);
  assertPortList(ports);
  assertCapitalCaptureEvent(captureEvent);
  if (!CAPITAL_PEACE_TERMS.has(term)) throw new Error(`Invalid capital peace term: ${term}`);
  if (!Number.isFinite(simMinute) || simMinute < captureEvent.simMinute) {
    throw new Error(`Invalid capital peace minute: ${simMinute}`);
  }
  if (captureEvent.peaceTreatyId !== null) {
    throw new Error(`Capital capture already has a peace treaty: ${captureEvent.id}`);
  }
  const options = capitalPeaceTreatyOptions(memory, ports, captureEvent);
  if (term === CAPITAL_PEACE_TERM_ANNEXATION && !options.annexationAllowed) {
    throw new Error(
      `${captureEvent.previousFactionId} is too large to annex: ${options.losingPortCount} ports`
    );
  }
  const loserFactionId = captureEvent.previousFactionId;
  const winnerFactionId = captureEvent.newFactionId;
  const capital = ports.find((port) => portConquestPortId(port) === captureEvent.portId);
  if (!capital) throw new Error(`Captured capital is absent from the port list: ${captureEvent.portId}`);
  const concessionPortIds = [];
  let annexedFactionId = null;

  if (term === CAPITAL_PEACE_TERM_ANNEXATION) {
    for (const port of factionControlledPorts(memory, ports, loserFactionId, captureEvent.portId)) {
      memory.portFactionOverrides[portConquestPortId(port)] = winnerFactionId;
    }
    if (!memory.collapsedFactionIds.includes(loserFactionId)) {
      memory.collapsedFactionIds.push(loserFactionId);
    }
    annexedFactionId = loserFactionId;
  } else {
    memory.portFactionOverrides[captureEvent.portId] = loserFactionId;
    const existingConcessions = ports.filter((port) => (
      (port.foundingFactionId || port.factionId) === loserFactionId &&
      portConquestPortId(port) !== captureEvent.portId &&
      effectivePortFactionId(memory, port) === winnerFactionId
    ));
    concessionPortIds.push(...existingConcessions.map(portConquestPortId));
    if (term === CAPITAL_PEACE_TERM_CONCESSIONS && concessionPortIds.length === 0) {
      const concession = factionControlledPorts(memory, ports, loserFactionId, captureEvent.portId)
        .filter((port) => portConquestPortId(port) !== captureEvent.portId && port.isFactionCapital !== true)
        .sort(concessionPortOrder)[0];
      if (!concession) {
        throw new Error(`${loserFactionId} has no port available for a territorial concession`);
      }
      const concessionPortId = portConquestPortId(concession);
      memory.portFactionOverrides[concessionPortId] = winnerFactionId;
      concessionPortIds.push(concessionPortId);
    }
  }

  const treaty = {
    id: `treaty-${simMinute}-${captureEvent.portId}`,
    capitalPortId: captureEvent.portId,
    loserFactionId,
    winnerFactionId,
    term,
    annexedFactionId,
    concessionPortIds: [...new Set(concessionPortIds)].sort(),
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
  if (!Array.isArray(ports)) throw new Error("Port conquest ownership requires a port list");
  for (const city of ports) {
    assertCity(city);
    city.foundingFactionId = city.foundingFactionId || city.factionId;
    city.factionId = effectivePortFactionId(memory, city);
  }
  return ports;
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

function crewLossRange(crew, minRatio, maxRatio) {
  return {
    min: Math.max(1, Math.ceil(crew * minRatio)),
    max: Math.max(1, Math.ceil(crew * maxRatio))
  };
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

function concessionPortOrder(a, b) {
  const populationDifference = Number(a.population || 0) - Number(b.population || 0);
  return populationDifference || portConquestPortId(a).localeCompare(portConquestPortId(b));
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
  if (!Number.isFinite(treaty.simMinute) || treaty.simMinute < 0) {
    throw new Error(`Invalid conquest treaty minute: ${treaty.simMinute}`);
  }
}

function assertCrew(value, label) {
  if (!Number.isInteger(value) || value < 0) throw new Error(`Invalid conquest ${label}: ${value}`);
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
