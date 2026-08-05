import { assertFactionId } from "./factions.js";

export const ILLICIT_TRADE_ENFORCEMENT_DURATION_MINUTES = 7 * 24 * 60;
export const ILLICIT_TRADE_MINIMUM_FINE = 80;
const ILLICIT_TRADE_MAX_INCIDENTS = 8;
const ILLICIT_TRADE_MAX_CHECKED_SHIPS = 32;

export function createIllicitTradeEnforcementMemory() {
  return {
    nextIncidentId: 1,
    incidents: []
  };
}

export function migrateIllicitTradeEnforcementMemory(memory) {
  if (memory === null || memory === undefined) return createIllicitTradeEnforcementMemory();
  validateIllicitTradeEnforcementMemory(memory);
  return {
    nextIncidentId: memory.nextIncidentId,
    incidents: memory.incidents.map(copyIncident)
  };
}

export function validateIllicitTradeEnforcementMemory(memory) {
  if (!memory || typeof memory !== "object" || Array.isArray(memory)) {
    throw new Error("Illicit trade enforcement memory must be an object");
  }
  if (!Number.isInteger(memory.nextIncidentId) || memory.nextIncidentId <= 0) {
    throw new Error(`Invalid next illicit trade incident id: ${memory.nextIncidentId}`);
  }
  if (!Array.isArray(memory.incidents) || memory.incidents.length > ILLICIT_TRADE_MAX_INCIDENTS) {
    throw new Error("Illicit trade enforcement incidents must be a bounded array");
  }
  const ids = new Set();
  for (const incident of memory.incidents) {
    validateIncident(incident);
    if (ids.has(incident.id)) throw new Error(`Duplicate illicit trade incident: ${incident.id}`);
    ids.add(incident.id);
  }
}

export function recordIllicitTradeDeparture(memory, visit, port, simMinute) {
  validateIllicitTradeEnforcementMemory(memory);
  validateVisit(visit);
  if (!port || !Number.isInteger(port.tileId) || port.tileId < 0) {
    throw new Error("Illicit trade departure requires a placed port");
  }
  if (!Number.isFinite(simMinute) || simMinute < 0) {
    throw new Error(`Invalid illicit trade departure minute: ${simMinute}`);
  }
  if (visit.transactionCount === 0 || visit.transactionValue === 0) return null;
  const incident = {
    id: `illicit-trade-${memory.nextIncidentId++}`,
    policyId: visit.policyId,
    enforcementFactionId: visit.enforcementFactionId,
    reputationPenalty: visit.reputationPenalty,
    originPortId: port.portId || `city-${port.tileId}`,
    originTileId: port.tileId,
    originName: port.displayCity || port.city || port.name,
    startedMinute: simMinute,
    expiresMinute: simMinute + ILLICIT_TRADE_ENFORCEMENT_DURATION_MINUTES,
    transactionCount: visit.transactionCount,
    transactionValue: visit.transactionValue,
    purchasedCargo: { ...visit.purchasedCargo },
    checkedShipIds: [],
    interceptingShipId: null,
    combatActive: false
  };
  validateIncident(incident);
  memory.incidents.push(incident);
  if (memory.incidents.length > ILLICIT_TRADE_MAX_INCIDENTS) {
    memory.incidents.splice(0, memory.incidents.length - ILLICIT_TRADE_MAX_INCIDENTS);
  }
  return Object.freeze(copyIncident(incident));
}

export function activeIllicitTradeIncidents(memory, simMinute) {
  validateIllicitTradeEnforcementMemory(memory);
  if (!Number.isFinite(simMinute) || simMinute < 0) {
    throw new Error(`Invalid illicit trade enforcement minute: ${simMinute}`);
  }
  memory.incidents = memory.incidents.filter((incident) => incident.expiresMinute > simMinute);
  return memory.incidents.map((incident) => Object.freeze(copyIncident(incident)));
}

export function illicitTradeIncidentForInspection(memory, factionId, npcShipId, simMinute) {
  const faction = assertFactionId(factionId);
  if (typeof npcShipId !== "string" || npcShipId === "") {
    throw new Error("Illicit trade inspection requires an NPC ship id");
  }
  return activeIllicitTradeIncidents(memory, simMinute).find((incident) => (
    incident.enforcementFactionId === faction &&
    incident.combatActive === false &&
    (incident.interceptingShipId === npcShipId || (
      incident.interceptingShipId === null && !incident.checkedShipIds.includes(npcShipId)
    ))
  )) || null;
}

export function illicitTradeIncidentById(memory, incidentId) {
  validateIllicitTradeEnforcementMemory(memory);
  return Object.freeze(copyIncident(requiredIncident(memory, incidentId)));
}

export function resolveIllicitTradeInspection(memory, incidentId, npcShipId, roll) {
  validateIllicitTradeEnforcementMemory(memory);
  if (typeof incidentId !== "string" || incidentId === "") {
    throw new Error("Illicit trade inspection requires an incident id");
  }
  if (typeof npcShipId !== "string" || npcShipId === "") {
    throw new Error("Illicit trade inspection requires an NPC ship id");
  }
  if (!Number.isFinite(roll) || roll < 0 || roll >= 1) {
    throw new Error(`Invalid illicit trade inspection roll: ${roll}`);
  }
  const incident = requiredIncident(memory, incidentId);
  if (incident.interceptingShipId !== null) {
    if (incident.interceptingShipId !== npcShipId) {
      throw new Error(`Incident ${incidentId} is already enforced by ${incident.interceptingShipId}`);
    }
    return Object.freeze({
      incident: Object.freeze(copyIncident(incident)),
      detected: true,
      newlyDetected: false,
      detectionChance: illicitTradeDetectionChance(incident),
      fine: illicitTradeFine(incident)
    });
  }
  if (incident.checkedShipIds.includes(npcShipId)) {
    throw new Error(`Ship ${npcShipId} already inspected incident ${incidentId}`);
  }
  const detectionChance = illicitTradeDetectionChance(incident);
  const detected = roll < detectionChance;
  if (detected) {
    incident.interceptingShipId = npcShipId;
  } else {
    incident.checkedShipIds.push(npcShipId);
    if (incident.checkedShipIds.length > ILLICIT_TRADE_MAX_CHECKED_SHIPS) {
      incident.checkedShipIds.splice(0, incident.checkedShipIds.length - ILLICIT_TRADE_MAX_CHECKED_SHIPS);
    }
  }
  return Object.freeze({
    incident: Object.freeze(copyIncident(incident)),
    detected,
    newlyDetected: detected,
    detectionChance,
    fine: illicitTradeFine(incident)
  });
}

export function resolveIllicitTradeIncident(memory, incidentId) {
  validateIllicitTradeEnforcementMemory(memory);
  const index = memory.incidents.findIndex((incident) => incident.id === incidentId);
  if (index < 0) throw new Error(`Unknown illicit trade incident: ${incidentId}`);
  const [incident] = memory.incidents.splice(index, 1);
  return Object.freeze(copyIncident(incident));
}

export function beginIllicitTradeEnforcementCombat(memory, incidentId) {
  validateIllicitTradeEnforcementMemory(memory);
  const incident = requiredIncident(memory, incidentId);
  if (incident.interceptingShipId === null) {
    throw new Error(`Cannot fight an illicit trade inspection that has not caught the player: ${incidentId}`);
  }
  incident.combatActive = true;
  return Object.freeze(copyIncident(incident));
}

export function activeIllicitTradeCombatFactionIds(memory, simMinute) {
  return [...new Set(activeIllicitTradeIncidents(memory, simMinute)
    .filter((incident) => incident.combatActive)
    .map((incident) => incident.enforcementFactionId))];
}

export function illicitTradeDetectionChance(incident) {
  validateIncident(incident);
  const valueRisk = Math.log2(1 + incident.transactionValue / 250) * 0.07;
  const repetitionRisk = Math.min(0.12, Math.max(0, incident.transactionCount - 1) * 0.02);
  return Math.min(0.68, 0.16 + valueRisk + repetitionRisk);
}

export function illicitTradeFine(incident) {
  validateIncident(incident);
  return Math.max(
    ILLICIT_TRADE_MINIMUM_FINE,
    Math.round(incident.transactionValue * 0.3 / 10) * 10
  );
}

export function illicitCargoAvailable(incident, cargo) {
  validateIncident(incident);
  if (!cargo || typeof cargo !== "object" || Array.isArray(cargo)) {
    throw new Error("Illicit cargo inspection requires a cargo manifest");
  }
  return Object.fromEntries(Object.entries(incident.purchasedCargo)
    .map(([goodId, quantity]) => [goodId, Math.min(quantity, cargo[goodId] || 0)])
    .filter(([, quantity]) => quantity > 0));
}

function requiredIncident(memory, incidentId) {
  const incident = memory.incidents.find((entry) => entry.id === incidentId);
  if (!incident) throw new Error(`Unknown illicit trade incident: ${incidentId}`);
  return incident;
}

function validateVisit(visit) {
  if (!visit || typeof visit !== "object" || Array.isArray(visit)) {
    throw new Error("Illicit trade departure requires a visit record");
  }
  validatePolicyFields(visit);
  if (!Number.isInteger(visit.transactionCount) || visit.transactionCount < 0) {
    throw new Error(`Invalid illicit trade transaction count: ${visit.transactionCount}`);
  }
  if (!Number.isFinite(visit.transactionValue) || visit.transactionValue < 0) {
    throw new Error(`Invalid illicit trade transaction value: ${visit.transactionValue}`);
  }
  validatePurchasedCargo(visit.purchasedCargo);
}

function validateIncident(incident) {
  if (!incident || typeof incident !== "object" || Array.isArray(incident)) {
    throw new Error("Illicit trade incident must be an object");
  }
  if (typeof incident.id !== "string" || incident.id === "") {
    throw new Error("Illicit trade incident requires an id");
  }
  validatePolicyFields(incident);
  if (typeof incident.originPortId !== "string" || incident.originPortId === "" ||
      !Number.isInteger(incident.originTileId) || incident.originTileId < 0 ||
      typeof incident.originName !== "string" || incident.originName === "") {
    throw new Error(`Invalid illicit trade incident origin: ${incident.id}`);
  }
  if (!Number.isFinite(incident.startedMinute) || incident.startedMinute < 0 ||
      !Number.isFinite(incident.expiresMinute) || incident.expiresMinute <= incident.startedMinute) {
    throw new Error(`Invalid illicit trade incident time: ${incident.id}`);
  }
  if (!Number.isInteger(incident.transactionCount) || incident.transactionCount <= 0 ||
      !Number.isFinite(incident.transactionValue) || incident.transactionValue <= 0) {
    throw new Error(`Invalid illicit trade incident volume: ${incident.id}`);
  }
  validatePurchasedCargo(incident.purchasedCargo);
  if (!Array.isArray(incident.checkedShipIds) ||
      incident.checkedShipIds.length > ILLICIT_TRADE_MAX_CHECKED_SHIPS ||
      incident.checkedShipIds.some((id) => typeof id !== "string" || id === "") ||
      new Set(incident.checkedShipIds).size !== incident.checkedShipIds.length) {
    throw new Error(`Invalid illicit trade inspection history: ${incident.id}`);
  }
  if (incident.interceptingShipId !== null &&
      (typeof incident.interceptingShipId !== "string" || incident.interceptingShipId === "")) {
    throw new Error(`Invalid illicit trade interceptor: ${incident.id}`);
  }
  if (typeof incident.combatActive !== "boolean" ||
      (incident.combatActive && incident.interceptingShipId === null)) {
    throw new Error(`Invalid illicit trade combat state: ${incident.id}`);
  }
}

function validatePolicyFields(entry) {
  if (typeof entry.policyId !== "string" || entry.policyId === "") {
    throw new Error("Illicit trade record requires a policy id");
  }
  assertFactionId(entry.enforcementFactionId);
  if (!Number.isInteger(entry.reputationPenalty) || entry.reputationPenalty <= 0) {
    throw new Error(`Invalid illicit trade reputation penalty: ${entry.reputationPenalty}`);
  }
}

function validatePurchasedCargo(cargo) {
  if (!cargo || typeof cargo !== "object" || Array.isArray(cargo)) {
    throw new Error("Illicit trade record requires purchased cargo");
  }
  for (const [goodId, quantity] of Object.entries(cargo)) {
    if (goodId === "" || !Number.isFinite(quantity) || quantity <= 0) {
      throw new Error(`Invalid illicit cargo quantity: ${goodId}=${quantity}`);
    }
  }
}

function copyIncident(incident) {
  return {
    ...incident,
    purchasedCargo: { ...incident.purchasedCargo },
    checkedShipIds: [...incident.checkedShipIds]
  };
}
