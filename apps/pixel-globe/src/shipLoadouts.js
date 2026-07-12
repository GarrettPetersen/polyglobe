export const CREW_PER_HOLD_UNIT = 4;
export const FOOD_PERSON_DAYS_PER_UNIT = 12;
export const WATER_PERSON_DAYS_PER_UNIT = 8;
export const CREW_HIRE_COST = 2;
export const CANNON_RESTOCK_COST = 8;
export const WATER_RESTOCK_COST = 1;

export const SHIP_LOADOUT_PRESETS = Object.freeze([
  preset("long-haul", "Long haul", "Deep stores, light armament", 0.65, 0.25, 45, 0.15),
  preset("short-haul", "Short haul", "Lean stores, maximum trade room", 0.5, 0.15, 14, 0.55),
  preset("combat", "Combat focused", "Full gun ports and fighting crew", 1, 1, 10, 0.1),
  preset("balanced", "Balanced", "Useful endurance, guns, and cargo", 0.75, 0.6, 25, 0.3)
]);

const PRESETS_BY_ID = new Map(SHIP_LOADOUT_PRESETS.map((entry) => [entry.id, entry]));

export function shipLoadoutPreset(loadoutId) {
  const preset = PRESETS_BY_ID.get(loadoutId);
  if (!preset) throw new Error(`Unknown ship loadout: ${loadoutId}`);
  return preset;
}

export function shipCrewCapacity(stats) {
  requireShipStats(stats);
  if (Number.isInteger(stats.crewCapacity) && stats.crewCapacity > 0) return stats.crewCapacity;
  return Math.max(2, Math.round(stats.mass / 12 + stats.cannons * 0.75));
}

export function crewHoldSpace(crew) {
  if (!Number.isInteger(crew) || crew < 0) throw new Error(`Invalid crew count: ${crew}`);
  return Math.ceil(crew / CREW_PER_HOLD_UNIT);
}

export function shipLoadoutPlan(stats, loadoutId) {
  requireShipStats(stats);
  const selected = shipLoadoutPreset(loadoutId);
  const crewCapacity = shipCrewCapacity(stats);
  const crew = Math.max(1, Math.min(crewCapacity, Math.round(crewCapacity * selected.crewRatio)));
  const cannons = Math.max(0, Math.min(stats.cannons, Math.round(stats.cannons * selected.cannonRatio)));
  const operationalSpace = crewHoldSpace(crew) + cannons;
  const reserveSpace = Math.max(0, Math.floor(stats.cargoCapacity * selected.reserveFraction));
  const availableStoreSpace = Math.max(0, stats.cargoCapacity - operationalSpace - reserveSpace);
  const consumers = crew + 1;
  const desiredFood = Math.ceil(consumers * selected.targetDays / FOOD_PERSON_DAYS_PER_UNIT);
  const desiredWater = Math.ceil(consumers * selected.targetDays / WATER_PERSON_DAYS_PER_UNIT);
  const stores = fitStores(desiredFood, desiredWater, availableStoreSpace);
  const foodDays = stores.foodUnits * FOOD_PERSON_DAYS_PER_UNIT / consumers;
  const waterDays = stores.waterUnits * WATER_PERSON_DAYS_PER_UNIT / consumers;

  return Object.freeze({
    id: selected.id,
    label: selected.label,
    detail: selected.detail,
    crew,
    crewCapacity,
    cannons,
    cannonCapacity: stats.cannons,
    foodUnits: stores.foodUnits,
    waterUnits: stores.waterUnits,
    foodDays,
    waterDays,
    reserveSpace,
    operationalSpace,
    storesSpace: stores.foodUnits + stores.waterUnits,
    totalSpace: operationalSpace + stores.foodUnits + stores.waterUnits
  });
}

function fitStores(desiredFood, desiredWater, availableSpace) {
  const desiredTotal = desiredFood + desiredWater;
  if (desiredTotal <= availableSpace) return { foodUnits: desiredFood, waterUnits: desiredWater };
  if (availableSpace <= 0) return { foodUnits: 0, waterUnits: 0 };
  let foodUnits = Math.floor(availableSpace * desiredFood / desiredTotal);
  let waterUnits = availableSpace - foodUnits;
  if (desiredFood > 0 && foodUnits === 0 && availableSpace > 1) {
    foodUnits = 1;
    waterUnits = availableSpace - 1;
  }
  if (desiredWater > 0 && waterUnits === 0 && availableSpace > 1) {
    waterUnits = 1;
    foodUnits = availableSpace - 1;
  }
  return { foodUnits, waterUnits };
}

function preset(id, label, detail, crewRatio, cannonRatio, targetDays, reserveFraction) {
  return Object.freeze({ id, label, detail, crewRatio, cannonRatio, targetDays, reserveFraction });
}

function requireShipStats(stats) {
  if (!stats || !Number.isInteger(stats.cargoCapacity) || stats.cargoCapacity < 0) {
    throw new Error("Ship loadout requires cargo capacity");
  }
  if (!Number.isInteger(stats.cannons) || stats.cannons < 0 || !Number.isInteger(stats.mass) || stats.mass <= 0) {
    throw new Error("Ship loadout requires cannon and mass stats");
  }
}
