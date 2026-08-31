import { ensureWorldEconomyPlayerShipyardBacking } from "./economy.js";
import { requireCityId } from "./entityIds.js";
import { shipyardAtPort } from "./shipyards.js";

export const SHIPYARD_INVESTMENT_MINIMUM_PURSE = 75000;
export const SHIPYARD_INVESTMENT_CAPITAL = 100000;
export const SHIPYARD_INVESTMENT_MATERIALS = Object.freeze({
  timber: 20,
  iron: 12,
  "naval-stores": 10
});
export const SHIPYARD_INVESTMENT_REOFFER_MINUTES = 60 * 24 * 60;

export const SHIPYARD_INVESTMENT_VERSION = 3;

export function createShipyardInvestmentMemory() {
  return {
    version: SHIPYARD_INVESTMENT_VERSION,
    project: null,
    backedPortCityIds: [],
    lastCompletedMinute: null
  };
}

export function migrateShipyardInvestmentMemory(memory) {
  if (!memory) return createShipyardInvestmentMemory();
  if (memory.version === 1) {
    validateLegacyShipyardInvestmentMemory(memory);
    const operatingProject = memory.project?.stage === "operating" ? memory.project : null;
    return {
      version: 2,
      project: operatingProject ? null : memory.project,
      backedPortTileIds: operatingProject ? [operatingProject.portTileId] : [],
      lastCompletedMinute: operatingProject?.offeredMinute ?? null
    };
  }
  validateShipyardInvestmentMemory(memory);
  return memory;
}

export function validateShipyardInvestmentMemory(memory) {
  if (memory?.version === 2) return validateLegacyShipyardInvestmentVersion2(memory);
  if (!memory || memory.version !== SHIPYARD_INVESTMENT_VERSION) {
    throw new Error(`Unsupported shipyard investment memory: ${memory?.version ?? "missing"}`);
  }
  if (!Array.isArray(memory.backedPortCityIds) ||
      memory.backedPortCityIds.some((cityId) => typeof cityId !== "string" || cityId === "") ||
      new Set(memory.backedPortCityIds).size !== memory.backedPortCityIds.length ||
      (memory.lastCompletedMinute !== null && !Number.isFinite(memory.lastCompletedMinute))) {
    throw new Error("Invalid player-backed shipyard portfolio");
  }
  if (memory.project === null) return memory;
  const project = memory.project;
  if (typeof project.portCityId !== "string" || project.portCityId === "" ||
      !Number.isInteger(project.portTileId) || typeof project.portName !== "string" ||
      project.portName === "" || project.stage !== "funding" ||
      !Number.isFinite(project.offeredMinute) || typeof project.capitalPaid !== "boolean" ||
      !project.materialsDelivered || typeof project.materialsDelivered !== "object" ||
      memory.backedPortCityIds.includes(project.portCityId)) {
    throw new Error("Invalid player shipyard project");
  }
  for (const [goodId, required] of Object.entries(SHIPYARD_INVESTMENT_MATERIALS)) {
    const delivered = project.materialsDelivered[goodId];
    if (!Number.isInteger(delivered) || delivered < 0 || delivered > required) {
      throw new Error(`Invalid shipyard material delivery: ${goodId}=${delivered}`);
    }
  }
  return memory;
}

export function shipyardInvestmentOfferAvailable(state, city, yard, simMinute = 0) {
  validateShipyardInvestmentMemory(state.memory.shipyardInvestment);
  if (!Number.isFinite(simMinute)) throw new Error(`Invalid shipyard offer minute: ${simMinute}`);
  const memory = state.memory.shipyardInvestment;
  const cooledDown = memory.lastCompletedMinute === null ||
    simMinute >= memory.lastCompletedMinute + SHIPYARD_INVESTMENT_REOFFER_MINUTES;
  return memory.project === null && cooledDown &&
    state.doubloons >= SHIPYARD_INVESTMENT_MINIMUM_PURSE &&
    yard?.famous === true &&
    yard?.playerBacking === null &&
    !memory.backedPortCityIds.includes(city?.cityId) &&
    city?.settlementType !== "village" &&
    city?.isPirateHideout !== true;
}

export function beginShipyardInvestment(state, city, yard, simMinute) {
  if (!shipyardInvestmentOfferAvailable(state, city, yard, simMinute)) {
    throw new Error(`Shipyard investment is unavailable at ${city?.displayCity || city?.city || "this port"}`);
  }
  if (!Number.isFinite(simMinute)) throw new Error(`Invalid shipyard offer minute: ${simMinute}`);
  const project = {
    portCityId: requireCityId(city, "Shipyard investment port"),
    portTileId: city.tileId,
    portName: city.displayCity || city.city,
    stage: "funding",
    offeredMinute: simMinute,
    capitalPaid: false,
    materialsDelivered: Object.fromEntries(
      Object.keys(SHIPYARD_INVESTMENT_MATERIALS).map((goodId) => [goodId, 0])
    )
  };
  state.memory.shipyardInvestment.project = project;
  return project;
}

export function shipyardInvestmentAtPort(state, city) {
  validateShipyardInvestmentMemory(state.memory.shipyardInvestment);
  const project = state.memory.shipyardInvestment.project;
  return project?.portCityId === city?.cityId ? project : null;
}

export function shipyardInvestmentMaterialProgress(project) {
  if (!project?.materialsDelivered || typeof project.materialsDelivered !== "object") {
    throw new Error("Shipyard material progress requires an active project");
  }
  return Object.freeze(Object.entries(SHIPYARD_INVESTMENT_MATERIALS).map(([goodId, required]) => {
    const delivered = project.materialsDelivered[goodId];
    if (!Number.isInteger(delivered) || delivered < 0 || delivered > required) {
      throw new Error(`Invalid shipyard material delivery: ${goodId}=${delivered}`);
    }
    return Object.freeze({
      goodId,
      required,
      delivered,
      remaining: required - delivered
    });
  }));
}

export function shipyardInvestmentComplete(project) {
  return project.capitalPaid && shipyardInvestmentMaterialProgress(project).every(
    ({ remaining }) => remaining === 0
  );
}

export function completeShipyardInvestment(memory, project, simMinute) {
  validateShipyardInvestmentMemory(memory);
  if (!Number.isFinite(simMinute)) throw new Error(`Invalid shipyard completion minute: ${simMinute}`);
  if (memory.project !== project) throw new Error("Shipyard completion requires the active project");
  if (project.stage !== "funding" || !shipyardInvestmentComplete(project)) {
    throw new Error("Shipyard investment cannot begin operating before it is fully funded");
  }
  const completed = Object.freeze({
    portCityId: project.portCityId,
    portTileId: project.portTileId,
    portName: project.portName,
    investedMinute: simMinute,
    seedCapital: SHIPYARD_INVESTMENT_CAPITAL,
    materialContributions: Object.freeze({ ...project.materialsDelivered })
  });
  memory.backedPortCityIds.push(project.portCityId);
  memory.lastCompletedMinute = simMinute;
  memory.project = null;
  return completed;
}

export function playerBackedShipyardAtPort(state, city) {
  validateShipyardInvestmentMemory(state.memory.shipyardInvestment);
  return state.memory.shipyardInvestment.backedPortCityIds.includes(city?.cityId);
}

export function reconcilePlayerShipyardInvestmentWorld(
  memory,
  economy,
  citiesById,
  simulationMinute
) {
  validateShipyardInvestmentMemory(memory);
  if (!(citiesById instanceof Map)) {
    throw new Error("Player shipyard reconciliation requires a city catalog map");
  }
  if (!Number.isFinite(simulationMinute)) {
    throw new Error(`Invalid player shipyard reconciliation minute: ${simulationMinute}`);
  }

  const investedMinute = Math.min(memory.lastCompletedMinute ?? simulationMinute, simulationMinute);
  const repairedPorts = [];
  for (const portCityId of memory.backedPortCityIds) {
    const city = citiesById.get(portCityId);
    if (!city) {
      throw new Error(`Player-backed shipyard port is missing from the city catalog: ${portCityId}`);
    }
    const result = ensureWorldEconomyPlayerShipyardBacking(economy, city, {
      investedMinute,
      seedCapital: SHIPYARD_INVESTMENT_CAPITAL,
      materialContributions: SHIPYARD_INVESTMENT_MATERIALS
    });
    if (!result.repaired) continue;
    const portName = city.portAlias || city.displayCity || city.city;
    if (typeof portName !== "string" || portName.trim() === "") {
      throw new Error(`Player-backed shipyard has no port name: ${portCityId}`);
    }
    repairedPorts.push(portName);
  }
  return Object.freeze(repairedPorts);
}

export function assertPlayerShipyardInvestmentWorldConsistency(memory, economy, citiesById) {
  validateShipyardInvestmentMemory(memory);
  if (!(citiesById instanceof Map)) {
    throw new Error("Player shipyard consistency requires a city catalog map");
  }
  for (const portCityId of memory.backedPortCityIds) {
    const city = citiesById.get(portCityId);
    if (!city) {
      throw new Error(`Player-backed shipyard port is missing from the city catalog: ${portCityId}`);
    }
    const yard = shipyardAtPort(economy.shipyards, city);
    if (!yard.playerBacking || !yard.playerAccounts) {
      throw new Error(`Player-backed shipyard world state is incomplete at ${portCityId}`);
    }
  }
  return true;
}

function validateLegacyShipyardInvestmentMemory(memory) {
  if (!memory || memory.version !== 1) throw new Error("Invalid legacy shipyard investment memory");
  if (memory.project === null) return memory;
  const project = memory.project;
  if (!Number.isInteger(project.portTileId) || typeof project.portName !== "string" ||
      project.portName === "" || !["funding", "operating"].includes(project.stage) ||
      !Number.isFinite(project.offeredMinute) || typeof project.capitalPaid !== "boolean" ||
      !project.materialsDelivered || typeof project.materialsDelivered !== "object") {
    throw new Error("Invalid legacy player shipyard project");
  }
  for (const [goodId, required] of Object.entries(SHIPYARD_INVESTMENT_MATERIALS)) {
    const delivered = project.materialsDelivered[goodId];
    if (!Number.isInteger(delivered) || delivered < 0 || delivered > required) {
      throw new Error(`Invalid legacy shipyard material delivery: ${goodId}=${delivered}`);
    }
  }
  return memory;
}

function validateLegacyShipyardInvestmentVersion2(memory) {
  if (!Array.isArray(memory.backedPortTileIds) ||
      memory.backedPortTileIds.some((tileId) => !Number.isInteger(tileId)) ||
      new Set(memory.backedPortTileIds).size !== memory.backedPortTileIds.length ||
      (memory.lastCompletedMinute !== null && !Number.isFinite(memory.lastCompletedMinute))) {
    throw new Error("Invalid legacy player-backed shipyard portfolio");
  }
  if (memory.project !== null) validateLegacyShipyardInvestmentMemory({
    version: 1,
    project: memory.project
  });
  return memory;
}
