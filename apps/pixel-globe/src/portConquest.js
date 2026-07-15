import { NEUTRAL_FACTION_ID, assertFactionId } from "./factions.js";

export const PORT_CONQUEST_MIN_CREW = 36;
export const PORT_CONQUEST_NPC_LANDING_RANGE_PX = 28;
export const PORT_CONQUEST_NPC_CHANCE = 0.12;
export const PORT_CONQUEST_NPC_CAPITAL_CHANCE = 0.03;
export const PORT_CONQUEST_CAPITAL_TREASURY_BONUS = 2500;

const PORT_CONQUEST_EVENT_LIMIT = 80;
const PLAYER_ASSAULT_FLAG_PREFIX = "playerPortAssaultUntil:";

export function createPortConquestMemory() {
  return {
    portFactionOverrides: {},
    collapsedFactionIds: [],
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
  if (!Array.isArray(memory.events)) throw new Error("Port conquest events must be an array");
  return memory;
}

export function portConquestStatus({ city, batteryDisabled, crew, crewCapacity, attackerFactionId }) {
  assertCity(city);
  assertFactionId(attackerFactionId);
  assertCrew(crew, "crew");
  assertCrew(crewCapacity, "crew capacity");
  if (crew > crewCapacity) throw new Error("Port conquest crew exceeds ship capacity");

  const alreadyOwned = city.factionId === attackerFactionId;
  const largeWarship = crewCapacity >= PORT_CONQUEST_MIN_CREW;
  const enoughCrew = crew >= PORT_CONQUEST_MIN_CREW;
  const canAttempt = !alreadyOwned && batteryDisabled === true && largeWarship && enoughCrew;
  const capital = city.isFactionCapital === true;
  const crewAdvantage = Math.max(0, crew - PORT_CONQUEST_MIN_CREW);
  const successChance = clamp(
    (capital ? 0.24 : 0.48) + crewAdvantage * (capital ? 0.003 : 0.005),
    capital ? 0.24 : 0.48,
    capital ? 0.42 : 0.72
  );
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
  const collapsedFactionId = city.isFactionCapital && city.capitalOfFactionId === previousFactionId &&
    !memory.collapsedFactionIds.includes(previousFactionId)
    ? previousFactionId
    : null;
  if (collapsedFactionId) memory.collapsedFactionIds.push(collapsedFactionId);
  memory.events.push({
    portId,
    cityTileId: city.tileId,
    cityName: city.displayCity || city.city,
    previousFactionId,
    newFactionId,
    collapsedFactionId,
    simMinute,
    source
  });
  if (memory.events.length > PORT_CONQUEST_EVENT_LIMIT) {
    memory.events.splice(0, memory.events.length - PORT_CONQUEST_EVENT_LIMIT);
  }
  return memory.events[memory.events.length - 1];
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
