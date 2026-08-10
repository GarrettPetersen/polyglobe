export const CREW_PER_HOLD_UNIT = 4;
export const FOOD_RATIONS_PER_HOLD_UNIT = 12;
export const WATER_PERSON_DAYS_PER_UNIT = 8;
export const CREW_HIRE_COST = 2;
export const CANNON_RESTOCK_COST = 8;
export const WATER_RESTOCK_COST = 1;
export const CUSTOM_LOADOUT_ID = "custom";
export const CUSTOM_LOADOUT_FIELDS = Object.freeze(["crew", "cannons", "foodUnits", "waterUnits"]);
export const STANDARD_CREW_RATIO = 0.5;

export const SHIP_LOADOUT_PRESETS = Object.freeze([
  preset("long-haul", "Long haul", "Deep stores, light armament", 0.65, 0.25, 45, 0.15),
  preset("short-haul", "Short haul", "Lean stores, maximum trade room", STANDARD_CREW_RATIO, 0.15, 14, 0.55),
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
  requireShipOperatingStats(stats);
  if (Number.isInteger(stats.crewCapacity) && stats.crewCapacity > 0) return stats.crewCapacity;
  return Math.max(2, Math.round(stats.mass / 12 + stats.cannons * 0.75));
}

export function shipMinimumCrew(stats) {
  return Math.max(1, Math.round(shipCrewCapacity(stats) * STANDARD_CREW_RATIO));
}

export function crewHoldSpace(crew) {
  if (!Number.isInteger(crew) || crew < 0) throw new Error(`Invalid crew count: ${crew}`);
  return Math.ceil(crew / CREW_PER_HOLD_UNIT);
}

export function shipLoadoutPlan(stats, loadoutId, options = {}) {
  requireShipLoadoutStats(stats);
  const selected = shipLoadoutPreset(loadoutId);
  const crewCapacity = shipCrewCapacity(stats);
  const minimumCrew = resolvedMinimumCrew(stats, options.minimumCrew);
  const crew = Math.max(
    minimumCrew,
    Math.min(crewCapacity, Math.round(crewCapacity * selected.crewRatio))
  );
  const cannons = Math.max(0, Math.min(stats.cannons, Math.round(stats.cannons * selected.cannonRatio)));
  const operationalSpace = crewHoldSpace(crew) + cannons;
  if (operationalSpace > stats.cargoCapacity) {
    throw new Error(
      `${selected.label} cannot fit ${crew} permanent crew and ${cannons} guns in ${stats.cargoCapacity} spaces`
    );
  }
  const reserveSpace = Math.max(0, Math.floor(stats.cargoCapacity * selected.reserveFraction));
  const availableStoreSpace = Math.max(0, stats.cargoCapacity - operationalSpace - reserveSpace);
  const consumers = crew;
  const desiredFood = Math.ceil(consumers * selected.targetDays / FOOD_RATIONS_PER_HOLD_UNIT);
  const desiredWater = Math.ceil(consumers * selected.targetDays / WATER_PERSON_DAYS_PER_UNIT);
  const stores = fitStores(desiredFood, desiredWater, availableStoreSpace);
  const foodDays = stores.foodUnits * FOOD_RATIONS_PER_HOLD_UNIT / consumers;
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

export function shipCustomLoadoutDraft(stats, currentPlan = null, options = {}) {
  requireShipLoadoutStats(stats);
  const base = currentPlan || shipLoadoutPlan(stats, "balanced");
  const minimumCrew = resolvedMinimumCrew(stats, options.minimumCrew);
  const draft = {
    crew: clampInteger(base.crew, minimumCrew, shipCrewCapacity(stats), "custom crew"),
    cannons: clampInteger(base.cannons, 0, stats.cannons, "custom cannons"),
    foodUnits: nonNegativeInteger(base.foodUnits, "custom food stores"),
    waterUnits: nonNegativeInteger(base.waterUnits, "custom water stores")
  };
  return fitShipCustomLoadoutDraft(stats, draft, { minimumCrew });
}

export function setShipCustomLoadoutValue(stats, draft, key, value, options = {}) {
  requireCustomDraft(draft);
  if (!CUSTOM_LOADOUT_FIELDS.includes(key)) throw new Error(`Unknown custom loadout field: ${key}`);
  if (!Number.isFinite(value)) throw new Error(`Invalid custom loadout ${key}: ${value}`);
  const bounds = shipCustomLoadoutBounds(stats, draft, key, options);
  return Object.freeze({
    ...draft,
    [key]: Math.max(bounds.min, Math.min(bounds.max, Math.round(value)))
  });
}

export function shipCustomLoadoutBounds(stats, draft, key, options = {}) {
  requireShipLoadoutStats(stats);
  requireCustomDraft(draft);
  if (!CUSTOM_LOADOUT_FIELDS.includes(key)) throw new Error(`Unknown custom loadout field: ${key}`);
  const cargoCapacity = stats.cargoCapacity;
  if (key === "crew") {
    const minimumCrew = resolvedMinimumCrew(stats, options.minimumCrew);
    let max = minimumCrew;
    for (let crew = minimumCrew; crew <= shipCrewCapacity(stats); crew++) {
      if (crewHoldSpace(crew) + draft.cannons + draft.foodUnits + draft.waterUnits > cargoCapacity) break;
      max = crew;
    }
    return Object.freeze({ min: minimumCrew, max });
  }
  const crewSpace = crewHoldSpace(draft.crew);
  if (key === "cannons") {
    return Object.freeze({
      min: 0,
      max: Math.min(stats.cannons, Math.max(0, cargoCapacity - crewSpace - draft.foodUnits - draft.waterUnits))
    });
  }
  const otherStores = key === "foodUnits" ? draft.waterUnits : draft.foodUnits;
  return Object.freeze({
    min: 0,
    max: Math.max(0, cargoCapacity - crewSpace - draft.cannons - otherStores)
  });
}

export function shipCustomLoadoutPlan(stats, draft, options = {}) {
  requireShipLoadoutStats(stats);
  requireCustomDraft(draft);
  const crewCapacity = shipCrewCapacity(stats);
  const minimumCrew = resolvedMinimumCrew(stats, options.minimumCrew);
  if (draft.crew < minimumCrew || draft.crew > crewCapacity) {
    throw new Error(`Custom loadout crew must be ${minimumCrew}-${crewCapacity}: ${draft.crew}`);
  }
  if (draft.cannons > stats.cannons) {
    throw new Error(`Custom loadout guns exceed ship capacity: ${draft.cannons}/${stats.cannons}`);
  }
  const operationalSpace = crewHoldSpace(draft.crew) + draft.cannons;
  const storesSpace = draft.foodUnits + draft.waterUnits;
  const totalSpace = operationalSpace + storesSpace;
  if (totalSpace > stats.cargoCapacity) {
    throw new Error(`Custom loadout uses ${totalSpace}/${stats.cargoCapacity} hold spaces`);
  }
  const consumers = draft.crew;
  return Object.freeze({
    id: CUSTOM_LOADOUT_ID,
    label: "Custom",
    detail: "Manually assigned crew, guns, and stores",
    crew: draft.crew,
    crewCapacity,
    cannons: draft.cannons,
    cannonCapacity: stats.cannons,
    foodUnits: draft.foodUnits,
    waterUnits: draft.waterUnits,
    foodDays: draft.foodUnits * FOOD_RATIONS_PER_HOLD_UNIT / consumers,
    waterDays: draft.waterUnits * WATER_PERSON_DAYS_PER_UNIT / consumers,
    reserveSpace: stats.cargoCapacity - totalSpace,
    operationalSpace,
    storesSpace,
    totalSpace
  });
}

export function fitShipCustomLoadoutPlan(stats, currentPlan, options = {}) {
  return shipCustomLoadoutPlan(stats, shipCustomLoadoutDraft(stats, currentPlan, options), options);
}

export function balancedProvisionTargets(foodTarget, waterTarget, availableSpace) {
  for (const [label, value] of Object.entries({ foodTarget, waterTarget, availableSpace })) {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error(`Invalid balanced provision ${label}: ${value}`);
    }
  }
  const space = Math.min(availableSpace, foodTarget + waterTarget);
  let waterUnits = Math.min(waterTarget, Math.ceil(space / 2));
  let foodUnits = Math.min(foodTarget, space - waterUnits);
  let remaining = space - foodUnits - waterUnits;
  const extraWater = Math.min(remaining, waterTarget - waterUnits);
  waterUnits += extraWater;
  remaining -= extraWater;
  foodUnits += Math.min(remaining, foodTarget - foodUnits);
  return Object.freeze({ foodUnits, waterUnits });
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

function fitShipCustomLoadoutDraft(stats, draft, options = {}) {
  const minimumCrew = resolvedMinimumCrew(stats, options.minimumCrew);
  let crew = Math.max(minimumCrew, Math.min(draft.crew, shipCrewCapacity(stats)));
  let cannons = Math.min(draft.cannons, stats.cannons);
  let foodUnits = draft.foodUnits;
  let waterUnits = draft.waterUnits;
  const totalSpace = () => crewHoldSpace(crew) + cannons + foodUnits + waterUnits;
  while (totalSpace() > stats.cargoCapacity && (foodUnits > 0 || waterUnits > 0)) {
    if (foodUnits >= waterUnits && foodUnits > 0) foodUnits -= 1;
    else if (waterUnits > 0) waterUnits -= 1;
    else foodUnits -= 1;
  }
  while (totalSpace() > stats.cargoCapacity && cannons > 0) cannons -= 1;
  while (totalSpace() > stats.cargoCapacity && crew > minimumCrew) crew -= 1;
  if (totalSpace() > stats.cargoCapacity) {
    throw new Error(`Ship cargo capacity cannot hold its minimum custom loadout: ${stats.cargoCapacity}`);
  }
  return Object.freeze({ crew, cannons, foodUnits, waterUnits });
}

function resolvedMinimumCrew(stats, requestedMinimum) {
  const minimum = requestedMinimum ?? shipMinimumCrew(stats);
  if (!Number.isInteger(minimum) || minimum < 1 || minimum > shipCrewCapacity(stats)) {
    throw new Error(`Invalid custom loadout minimum crew: ${minimum}`);
  }
  return Math.max(shipMinimumCrew(stats), minimum);
}

function requireCustomDraft(draft) {
  if (!draft || typeof draft !== "object") throw new Error("Custom loadout requires a draft");
  for (const key of CUSTOM_LOADOUT_FIELDS) nonNegativeInteger(draft[key], `custom ${key}`);
}

function nonNegativeInteger(value, label) {
  if (!Number.isInteger(value) || value < 0) throw new Error(`Invalid ${label}: ${value}`);
  return value;
}

function clampInteger(value, min, max, label) {
  nonNegativeInteger(value, label);
  return Math.max(min, Math.min(max, value));
}

function requireShipOperatingStats(stats) {
  if (!stats || typeof stats !== "object" ||
      !Number.isInteger(stats.cannons) || stats.cannons < 0 ||
      !Number.isInteger(stats.mass) || stats.mass <= 0) {
    throw new Error("Ship operating crew requires cannon and mass stats");
  }
  if (stats.crewCapacity !== undefined &&
      (!Number.isInteger(stats.crewCapacity) || stats.crewCapacity <= 0)) {
    throw new Error(`Invalid ship crew capacity: ${stats.crewCapacity}`);
  }
}

function requireShipLoadoutStats(stats) {
  requireShipOperatingStats(stats);
  if (!Number.isInteger(stats.cargoCapacity) || stats.cargoCapacity < 0) {
    throw new Error("Ship loadout requires cargo capacity");
  }
}
