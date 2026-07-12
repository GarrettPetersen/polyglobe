import {
  FRESH_WATER_GOOD_ID,
  HARDTACK_GOOD_ID,
  TRADE_GOODS,
  executePortPurchase,
  executePortSale,
  portMarket,
  quotePortPurchase,
  quotePortSale,
  tradeGoodById
} from "./economy.js";
import {
  DIPLOMACY_WAR,
  FACTIONS,
  NEUTRAL_FACTION_ID,
  PIRATE_FACTION_ID,
  assertFactionId,
  diplomacyBetween
} from "./factions.js";
import {
  CANNON_RESTOCK_COST,
  CREW_HIRE_COST,
  FOOD_PERSON_DAYS_PER_UNIT,
  WATER_PERSON_DAYS_PER_UNIT,
  WATER_RESTOCK_COST,
  crewHoldSpace,
  shipLoadoutPlan
} from "./shipLoadouts.js";
import { shipLabelForSlug } from "./shipStats.js";
import { greatCircleDistanceKm } from "./worldDistance.js";
import {
  BASIC_FISHING_NET_ID,
  fishingNetById
} from "./fishingNets.js";

export const STARTING_DOUBLOONS = 360;
export const REPUTATION_MIN = -100;
export const REPUTATION_MAX = 100;
export const HOME_FACTION_START_REPUTATION = 8;
export const ENEMY_FACTION_START_REPUTATION = -8;
export const PIRATE_START_REPUTATION = REPUTATION_MIN;
export const TRADE_REPUTATION_GAIN = 0.2;
export const DELIVERY_REPUTATION_GAIN = 2;
export const SHIP_ATTACK_REPUTATION_PENALTY = -35;
export const PIRACY_REPUTATION_PENALTY = -3;
export const LETTER_OF_MARQUE_REPUTATION_REQUIRED = 15;
export const LETTER_OF_MARQUE_POWER_REQUIRED = 20;
export const FISH_CARGO_GOOD_ID = "fish";
export const SHIP_ITEM_FISHING_NET = "fishing-net";
export const FRESH_WATER_CAPACITY = 100;
export const FRESH_WATER_DAYS = 21;
export const FRESH_WATER_CARGO_DAYS = 1;
export const FOOD_UNITS_PER_DAY = 1;
export const FOOD_TARGET_DAYS = 21;
export const STARTING_HARDTACK_UNITS = 10;

const MINUTES_PER_DAY = 24 * 60;
const FRESH_WATER_USE_PER_DAY = FRESH_WATER_CAPACITY / FRESH_WATER_DAYS;

export const SHIP_ITEM_CATALOG = Object.freeze([
  Object.freeze({
    id: SHIP_ITEM_FISHING_NET,
    label: "Fishing net",
    detail: "Can harvest nearby fisheries"
  })
]);

export function createGameState({ cargoCapacity, startMinute = 0, playerCharacter = null, shipStats = null }) {
  assertCargoCapacity(cargoCapacity);
  assertSimulationMinute(startMinute);
  if (playerCharacter !== null) assertPlayerCharacter(playerCharacter);
  if (shipStats !== null && shipStats.cargoCapacity !== cargoCapacity) {
    throw new Error(`Ship cargo capacity mismatch: state=${cargoCapacity} stats=${shipStats.cargoCapacity}`);
  }
  const playerFactionId = playerCharacter?.nationalityId || null;
  return {
    version: 6,
    playerCharacter,
    doubloons: STARTING_DOUBLOONS,
    cargoCapacity,
    cargo: {},
    ship: shipStats === null ? null : createPlayerShipState(shipStats),
    survival: createSurvivalState(
      startMinute,
      shipStats === null ? FRESH_WATER_CAPACITY : 1,
      shipStats === null ? FRESH_WATER_CAPACITY : 0
    ),
    inventory: {
      items: {},
      fishingNetId: BASIC_FISHING_NET_ID
    },
    accounts: {
      cargoCostBasis: {},
      realizedPnl: 0,
      nextEntryId: 2,
      ledger: [{
        id: 1,
        kind: "opening",
        simMinute: startMinute,
        location: "Aboard",
        country: "",
        description: "Opening balance",
        goodId: null,
        quantity: 0,
        amount: STARTING_DOUBLOONS,
        balance: STARTING_DOUBLOONS,
        costBasis: null,
        pnl: null
      }]
    },
    relations: {
      factionReputation: initialFactionReputation(playerFactionId),
      lettersOfMarque: {}
    },
    memory: {
      visitedPorts: {},
      decisions: {},
      flags: {},
      discoveries: {},
      discoveryOrder: [],
      navigation: {
        lastLongitudeDeg: null,
        cumulativeLongitudeDeg: 0
      },
      quests: {
        active: null,
        completed: {},
        passengerOffers: {},
        passengerRolls: {}
      }
    }
  };
}

export function recordDiscovery(state, discovery) {
  assertGameState(state);
  assertDiscovery(discovery);
  if (state.memory.discoveries[discovery.id]) return false;
  state.memory.discoveries[discovery.id] = {
    id: discovery.id,
    displayName: discovery.displayName,
    kind: discovery.kind,
    detail: discovery.detail || ""
  };
  state.memory.discoveryOrder.push(discovery.id);
  return true;
}

export function hasDiscovery(state, discoveryId) {
  assertGameState(state);
  return Boolean(state.memory.discoveries[discoveryId]);
}

export function discoveredEntries(state) {
  assertGameState(state);
  return state.memory.discoveryOrder.map((id) => {
    const discovery = state.memory.discoveries[id];
    if (!discovery) throw new Error(`Discovery order references missing discovery: ${id}`);
    return discovery;
  });
}

export function updateCircumnavigationProgress(state, longitudeDeg) {
  assertGameState(state);
  if (!Number.isFinite(longitudeDeg)) throw new Error(`Invalid navigation longitude: ${longitudeDeg}`);
  const navigation = state.memory.navigation;
  if (navigation.lastLongitudeDeg === null) {
    navigation.lastLongitudeDeg = longitudeDeg;
    return false;
  }

  const delta = normalizeLongitudeDelta(longitudeDeg - navigation.lastLongitudeDeg);
  navigation.lastLongitudeDeg = longitudeDeg;
  navigation.cumulativeLongitudeDeg += delta;
  return Math.abs(navigation.cumulativeLongitudeDeg) >= 360;
}

export function setCargoCapacity(state, cargoCapacity) {
  assertGameState(state);
  assertCargoCapacity(cargoCapacity);
  const used = cargoUsed(state);
  if (used > cargoCapacity) {
    throw new Error(`Cannot switch to cargo capacity ${cargoCapacity}; current cargo uses ${used}`);
  }
  state.cargoCapacity = cargoCapacity;
}

export function setPlayerShipStats(state, stats) {
  assertGameState(state);
  if (!state.ship) throw new Error("Cannot change stats without player ship state");
  const previous = {
    cargoCapacity: state.cargoCapacity,
    ship: { ...state.ship },
    freshWater: state.survival.freshWater,
    freshWaterCapacity: state.survival.freshWaterCapacity,
    hardtack: state.cargo[HARDTACK_GOOD_ID] || 0,
    hardtackBasis: state.accounts.cargoCostBasis[HARDTACK_GOOD_ID]
  };
  const loadoutId = state.ship.loadoutId || "short-haul";
  const plan = shipLoadoutPlan(stats, loadoutId);
  state.ship.crewCapacity = stats.crewCapacity;
  state.ship.cannonCapacity = stats.cannons;
  state.ship.crew = Math.min(state.ship.crew, plan.crew);
  state.ship.cannons = Math.min(state.ship.cannons, plan.cannons);
  state.ship.loadoutTargets = plan;
  state.survival.freshWaterCapacity = plan.waterUnits;
  state.survival.freshWater = Math.min(state.survival.freshWater, plan.waterUnits);
  trimCargoQuantity(state, HARDTACK_GOOD_ID, plan.foodUnits);
  if (cargoUsed(state) > stats.cargoCapacity) {
    state.cargoCapacity = previous.cargoCapacity;
    state.ship = previous.ship;
    state.survival.freshWater = previous.freshWater;
    state.survival.freshWaterCapacity = previous.freshWaterCapacity;
    if (previous.hardtack > 0) state.cargo[HARDTACK_GOOD_ID] = previous.hardtack;
    else delete state.cargo[HARDTACK_GOOD_ID];
    if (previous.hardtackBasis === undefined) delete state.accounts.cargoCostBasis[HARDTACK_GOOD_ID];
    else state.accounts.cargoCostBasis[HARDTACK_GOOD_ID] = previous.hardtackBasis;
    throw new Error(`Cannot switch to cargo capacity ${stats.cargoCapacity}; current hold will not fit`);
  }
  state.cargoCapacity = stats.cargoCapacity;
  return plan;
}

export function purchasePlayerShip(state, city, stats, price, context = {}) {
  assertGameState(state);
  if (!stats || typeof stats.slug !== "string") throw new Error("Ship purchase requires valid ship stats");
  if (!Number.isInteger(price) || price <= 0) throw new Error(`Invalid ship purchase price: ${price}`);
  if (state.doubloons < price) throw new Error(`Not enough doubloons to buy ${shipLabelForSlug(stats.slug)}`);
  const plan = setPlayerShipStats(state, stats);
  state.doubloons -= price;
  const label = shipLabelForSlug(stats.slug);
  recordDecision(state, `ship.purchase.${cityKey(city)}.${stats.slug}`, 1);
  recordLedgerEntry(state, city, context, {
    kind: "ship",
    description: `Purchase ${label}`,
    goodId: null,
    quantity: 1,
    amount: -price,
    costBasis: price,
    pnl: null
  });
  return { slug: stats.slug, label, price, plan };
}

export function cargoUsed(state) {
  assertGameState(state);
  let used = 0;
  for (const [goodId, quantity] of Object.entries(state.cargo)) {
    const good = goodById(goodId);
    assertQuantity(quantity, `cargo.${goodId}`);
    used += good.unitSize * quantity;
  }
  if (state.ship) {
    used += crewHoldSpace(state.ship.crew);
    used += state.ship.cannons;
    used += Math.ceil(state.survival.freshWater);
  }
  return used;
}

export function receiveSurrenderedLoot(state, loot, context = {}) {
  assertGameState(state);
  if (!loot || !Number.isInteger(loot.specie) || loot.specie < 0 || !loot.cargo || typeof loot.cargo !== "object") {
    throw new Error("Invalid surrendered ship loot");
  }

  state.doubloons += loot.specie;
  if (loot.specie > 0) {
    recordLedgerEntry(state, null, context, {
      kind: "prize",
      description: "Surrendered prize money",
      goodId: null,
      quantity: 0,
      amount: loot.specie,
      costBasis: 0,
      pnl: loot.specie
    });
  }

  const receivedCargo = {};
  let free = state.cargoCapacity - cargoUsed(state);
  for (const [goodId, available] of Object.entries(loot.cargo)) {
    const good = goodById(goodId);
    assertQuantity(available, `loot.${goodId}`);
    const quantity = Math.min(available, Math.floor(free / good.unitSize));
    if (quantity <= 0) continue;
    state.cargo[goodId] = (state.cargo[goodId] || 0) + quantity;
    state.accounts.cargoCostBasis[goodId] = state.accounts.cargoCostBasis[goodId] || 0;
    receivedCargo[goodId] = quantity;
    free -= quantity * good.unitSize;
    recordLedgerEntry(state, null, context, {
      kind: "prize",
      description: `Prize cargo ${good.label} x${quantity}`,
      goodId,
      quantity,
      amount: 0,
      costBasis: 0,
      pnl: null
    });
  }
  return { specie: loot.specie, cargo: receivedCargo };
}

export function cargoFree(state) {
  return state.cargoCapacity - cargoUsed(state);
}

export function cargoRows(state) {
  assertGameState(state);
  return TRADE_GOODS
    .map((good) => ({
      good,
      quantity: state.cargo[good.id] || 0
    }))
    .filter((row) => row.quantity > 0);
}

export function survivalStatus(state) {
  assertGameState(state);
  const foodUnits = edibleCargoRows(state).reduce((total, row) => total + row.quantity, 0);
  const consumption = shipConsumption(state);
  const foodDays = state.ship
    ? foodUnits * FOOD_PERSON_DAYS_PER_UNIT / consumption.foodConsumers
    : foodUnits / FOOD_UNITS_PER_DAY;
  const freshWaterCaskDays = state.ship
    ? state.survival.freshWater * WATER_PERSON_DAYS_PER_UNIT / consumption.waterConsumers
    : state.survival.freshWater / FRESH_WATER_USE_PER_DAY;
  const freshWaterReserveUnits = state.ship ? 0 : state.cargo[FRESH_WATER_GOOD_ID] || 0;
  const freshWaterReserveDays = state.ship ? 0 : freshWaterReserveUnits * FRESH_WATER_CARGO_DAYS;
  const freshWaterDays = freshWaterCaskDays + freshWaterReserveDays;
  const targetDays = state.ship?.loadoutTargets
    ? Math.max(1, Math.min(state.ship.loadoutTargets.foodDays, state.ship.loadoutTargets.waterDays))
    : FOOD_TARGET_DAYS;
  return {
    freshWater: state.survival.freshWater,
    freshWaterCapacity: state.survival.freshWaterCapacity,
    freshWaterDays,
    freshWaterCaskDays,
    freshWaterReserveUnits,
    freshWaterReserveDays,
    freshWaterTargetDays: state.ship?.loadoutTargets?.waterDays || FRESH_WATER_DAYS,
    freshWaterFraction: clamp01(freshWaterDays / (state.ship?.loadoutTargets?.waterDays || FRESH_WATER_DAYS)),
    foodUnits,
    foodDays,
    foodFraction: clamp01(foodDays / targetDays),
    foodDebt: state.survival.foodDebt,
    foodTargetDays: state.ship?.loadoutTargets?.foodDays || FOOD_TARGET_DAYS,
    consumers: consumption
  };
}

export function initializeProvisionalShipLoadout(state, stats) {
  assertGameState(state);
  requirePlayerShipState(state, stats);
  const plan = shipLoadoutPlan(stats, "short-haul");
  state.ship.loadoutId = null;
  state.ship.loadoutTargets = plan;
  state.ship.crew = plan.crew;
  state.ship.cannons = plan.cannons;
  state.survival.freshWaterCapacity = plan.waterUnits;
  state.survival.freshWater = plan.waterUnits;
  state.cargo[HARDTACK_GOOD_ID] = plan.foodUnits;
  state.accounts.cargoCostBasis[HARDTACK_GOOD_ID] = plan.foodUnits * tradeGoodById(HARDTACK_GOOD_ID).basePrice;
  recordDecision(state, "loadout.provisional.short-haul", 1);
  return plan;
}

export function restockShipLoadoutAtPort(state, city, stats, loadoutId, context = {}) {
  assertGameState(state);
  requirePlayerShipState(state, stats);
  const plan = shipLoadoutPlan(stats, loadoutId);
  const hardtack = tradeGoodById(HARDTACK_GOOD_ID);
  const before = shipStoresSnapshot(state);

  state.ship.loadoutId = plan.id;
  state.ship.loadoutTargets = plan;
  state.ship.crew = Math.min(state.ship.crew, plan.crew);
  state.ship.cannons = Math.min(state.ship.cannons, plan.cannons);
  trimCargoQuantity(state, HARDTACK_GOOD_ID, plan.foodUnits);
  state.survival.freshWaterCapacity = plan.waterUnits;
  state.survival.freshWater = Math.min(state.survival.freshWater, plan.waterUnits);

  let spent = 0;
  const additions = { crew: 0, cannons: 0, food: 0, water: 0 };
  const priorities = plan.id === "combat"
    ? ["crew", "cannons", "water", "food"]
    : ["crew", "water", "food", "cannons"];
  for (const kind of priorities) {
    const result = restockLoadoutKind(state, plan, kind, hardtack);
    spent += result.spent;
    additions[kind] += result.quantity;
  }

  if (spent > 0) {
    recordLedgerEntry(state, city, context, {
      kind: "provision",
      description: `${plan.label} loadout restock`,
      goodId: null,
      quantity: additions.crew + additions.cannons + additions.food + additions.water,
      amount: -spent,
      costBasis: null,
      pnl: null
    });
  }
  recordDecision(state, `loadout.select.${plan.id}`, 1);
  const after = shipStoresSnapshot(state);
  return {
    plan,
    spent,
    additions,
    removed: {
      crew: Math.max(0, before.crew - after.crew + additions.crew),
      cannons: Math.max(0, before.cannons - after.cannons + additions.cannons),
      food: Math.max(0, before.food - after.food + additions.food),
      water: Math.max(0, before.water - after.water + additions.water)
    },
    shortfalls: loadoutShortfalls(state, plan)
  };
}

export function restockSelectedShipLoadoutAtPort(state, city, stats, context = {}) {
  assertGameState(state);
  if (!state.ship?.loadoutId) return null;
  return restockShipLoadoutAtPort(state, city, stats, state.ship.loadoutId, context);
}

export function loseCrew(state, requestedLoss) {
  assertGameState(state);
  if (!Number.isInteger(requestedLoss) || requestedLoss < 0) {
    throw new Error(`Invalid crew loss: ${requestedLoss}`);
  }
  if (!state.ship || requestedLoss === 0) return 0;
  const lost = Math.min(state.ship.crew, requestedLoss);
  state.ship.crew -= lost;
  if (lost > 0) recordDecision(state, "crew.lost", lost);
  return lost;
}

export function rollCrewCasualtiesForDamage(state, damage, random = Math.random) {
  assertGameState(state);
  if (!Number.isFinite(damage) || damage < 0) throw new Error(`Invalid hull damage: ${damage}`);
  if (!state.ship || state.ship.crew <= 0 || damage <= 0) return 0;
  const chance = Math.min(0.65, damage * 0.07);
  if (random() >= chance) return 0;
  const maximumLoss = Math.max(1, Math.ceil(damage / 2));
  return loseCrew(state, 1 + Math.floor(random() * maximumLoss));
}

export function shipConsumption(state) {
  assertGameState(state);
  if (!state.ship) {
    return { crew: 0, passengers: 0, livestock: 0, foodConsumers: 1, waterConsumers: 1 };
  }
  const quest = state.memory.quests?.active || null;
  const passengers = quest?.kind === "passenger"
    ? 1
    : Math.max(0, Number(quest?.passengerCount || quest?.passengers?.length || 0));
  const livestock = Math.max(0, Number(quest?.livestockCount || quest?.livestock?.count || 0));
  const baseConsumers = 1 + state.ship.crew + passengers;
  const questFood = Math.max(0, Number(quest?.consumption?.food || 0));
  const questWater = Math.max(0, Number(quest?.consumption?.water || 0));
  return {
    crew: state.ship.crew,
    passengers,
    livestock,
    foodConsumers: Math.max(1, baseConsumers + livestock * 2 + questFood),
    waterConsumers: Math.max(1, baseConsumers + livestock * 2 + questWater)
  };
}

export function initializeShipProvisions(state, quantity = STARTING_HARDTACK_UNITS) {
  assertGameState(state);
  assertProvisionQuantity(quantity, "starting hardtack quantity");
  const good = goodById(HARDTACK_GOOD_ID);
  const stowable = Math.min(quantity, Math.floor(cargoFree(state) / good.unitSize));
  if (stowable <= 0) return { good, quantity: 0 };
  state.cargo[good.id] = (state.cargo[good.id] || 0) + stowable;
  state.accounts.cargoCostBasis[good.id] = roundLedgerMoney(
    (state.accounts.cargoCostBasis[good.id] || 0) + good.basePrice * stowable
  );
  recordDecision(state, `provisions.start.${good.id}`, stowable);
  return { good, quantity: stowable };
}

export function autoProvisionHardtackAtPort(state, economy, city, context = {}) {
  assertGameState(state);
  const good = goodById(HARDTACK_GOOD_ID);
  const currentFood = survivalStatus(state).foodUnits;
  const targetFood = Math.min(FOOD_TARGET_DAYS * FOOD_UNITS_PER_DAY, state.cargoCapacity);
  const needed = Math.max(0, Math.ceil(targetFood - currentFood));
  if (needed <= 0) return { good, quantity: 0, price: 0 };
  const freeCargoQuantity = Math.floor(cargoFree(state) / good.unitSize);
  if (freeCargoQuantity <= 0 || state.doubloons <= 0) return { good, quantity: 0, price: 0 };

  const row = marketRow(economy, city, HARDTACK_GOOD_ID);
  let quantity = Math.min(needed, freeCargoQuantity, row.stock);
  while (quantity > 0 && quotePortSale(economy, city, HARDTACK_GOOD_ID, quantity) > state.doubloons) {
    quantity -= 1;
  }
  if (quantity <= 0) return { good, quantity: 0, price: 0 };
  const purchase = buyGood(state, economy, city, HARDTACK_GOOD_ID, quantity, context);
  return { ...purchase, price: purchase.price };
}

export function autoProvisionFreshWaterAtPort(state, city, context = {}) {
  assertGameState(state);
  const good = goodById(FRESH_WATER_GOOD_ID);
  const missing = Math.max(0, state.survival.freshWaterCapacity - state.survival.freshWater);
  if (missing <= 0) return { good, quantity: 0, price: 0, filled: 0 };
  const neededUnits = Math.ceil(missing / FRESH_WATER_USE_PER_DAY);
  const quantity = Math.min(neededUnits, Math.floor(state.doubloons / good.basePrice));
  if (quantity <= 0) return { good, quantity: 0, price: 0, filled: 0 };
  const filled = Math.min(missing, quantity * FRESH_WATER_USE_PER_DAY);
  const price = quantity * good.basePrice;
  state.survival.freshWater = Math.min(state.survival.freshWaterCapacity, state.survival.freshWater + filled);
  state.doubloons -= price;
  recordDecision(state, `provisions.water.${good.id}`, quantity);
  recordLedgerEntry(state, city, context, {
    kind: "provision",
    description: `Take on ${good.label} x${quantity}`,
    goodId: good.id,
    quantity,
    amount: -price,
    costBasis: null,
    pnl: null
  });
  return { good, quantity, price, filled };
}

export function updateSurvival(state, previousMinute, currentMinute, options = {}) {
  assertGameState(state);
  assertSimulationMinute(previousMinute);
  assertSimulationMinute(currentMinute);
  const result = {
    changed: false,
    freshWaterRefilled: false,
    waterConsumed: 0,
    waterCargoConsumed: 0,
    foodConsumed: [],
    dehydrated: false,
    starved: false
  };
  if (options.freshwater) {
    if (state.survival.freshWater < state.survival.freshWaterCapacity) {
      state.survival.freshWater = state.survival.freshWaterCapacity;
      result.freshWaterRefilled = true;
      result.changed = true;
    }
  }

  const elapsedMinutes = Math.max(0, currentMinute - previousMinute);
  if (elapsedMinutes <= 0) {
    state.survival.lastMinute = currentMinute;
    return result;
  }

  const elapsedDays = elapsedMinutes / MINUTES_PER_DAY;
  const consumption = shipConsumption(state);
  if (!options.freshwater) {
    const waterUse = state.ship
      ? elapsedDays * consumption.waterConsumers / WATER_PERSON_DAYS_PER_UNIT
      : elapsedDays * FRESH_WATER_USE_PER_DAY;
    const water = consumeFreshWater(state, waterUse, !state.ship);
    result.waterConsumed = water.waterConsumed;
    result.waterCargoConsumed = water.cargoConsumed;
    if (water.changed) {
      result.changed = true;
    }
    if (water.dehydrated) result.dehydrated = true;
  }

  state.survival.foodDebt += state.ship
    ? elapsedDays * consumption.foodConsumers / FOOD_PERSON_DAYS_PER_UNIT
    : elapsedDays * FOOD_UNITS_PER_DAY;
  while (state.survival.foodDebt >= 1) {
    const consumed = consumeCheapestFoodUnit(state);
    if (!consumed) {
      result.starved = true;
      break;
    }
    state.survival.foodDebt -= 1;
    result.foodConsumed.push(consumed);
    result.changed = true;
  }
  state.survival.lastMinute = currentMinute;
  return result;
}

export function cargoCostBasis(state, goodId) {
  assertGameState(state);
  goodById(goodId);
  const quantity = state.cargo[goodId] || 0;
  const known = Object.prototype.hasOwnProperty.call(state.accounts.cargoCostBasis, goodId);
  const total = known ? state.accounts.cargoCostBasis[goodId] : 0;
  if (!Number.isFinite(total) || total < 0) throw new Error(`Invalid ${goodId} cargo cost basis: ${total}`);
  return {
    known: known && quantity > 0,
    total,
    average: quantity > 0 ? total / quantity : 0
  };
}

export function shipItemRows(state) {
  assertGameState(state);
  return SHIP_ITEM_CATALOG
    .map((item) => item.id === SHIP_ITEM_FISHING_NET
      ? fishingNetItemRow(state)
      : { ...item, quantity: state.inventory.items[item.id] || 0 })
    .filter((item) => item.quantity > 0);
}

export function hasShipItem(state, itemId) {
  assertGameState(state);
  if (typeof itemId !== "string" || itemId.trim() === "") throw new Error(`Invalid ship item id: ${itemId}`);
  if (itemId === SHIP_ITEM_FISHING_NET) return Boolean(state.inventory.fishingNetId);
  return (state.inventory.items[itemId] || 0) > 0;
}

export function playerFishingNet(state) {
  assertGameState(state);
  return fishingNetById(state.inventory.fishingNetId);
}

export function purchaseFishingNet(state, city, netId, context = {}) {
  assertGameState(state);
  const current = playerFishingNet(state);
  const next = fishingNetById(netId);
  if (next.tier <= current.tier) {
    throw new Error(`${next.label} is not an upgrade over ${current.label}`);
  }
  if (state.doubloons < next.price) {
    throw new Error(`Not enough doubloons to buy ${next.label}`);
  }
  state.doubloons -= next.price;
  state.inventory.fishingNetId = next.id;
  recordLedgerEntry(state, city, context, {
    kind: "equipment",
    description: `Buy ${next.label}`,
    goodId: null,
    quantity: 1,
    amount: -next.price,
    costBasis: next.price,
    pnl: null
  });
  return { previous: current, net: next, price: next.price };
}

export function ledgerEntries(state) {
  assertGameState(state);
  return state.accounts.ledger.slice();
}

export function realizedTradePnl(state) {
  assertGameState(state);
  return state.accounts.realizedPnl;
}

export function factionReputation(state, factionId) {
  assertGameState(state);
  const id = assertFactionId(factionId);
  return state.relations.factionReputation[id];
}

export function adjustFactionReputation(state, factionId, delta) {
  assertGameState(state);
  const id = assertFactionId(factionId);
  assertReputationDelta(delta);
  const current = state.relations.factionReputation[id];
  const next = roundReputation(clampReputation(current + delta));
  state.relations.factionReputation[id] = next;
  return next;
}

export function recordTradeWithFaction(state, factionId) {
  assertGameState(state);
  const id = assertFactionId(factionId);
  if (id === NEUTRAL_FACTION_ID || id === PIRATE_FACTION_ID) return factionReputation(state, id);
  const before = factionReputation(state, id);
  const after = adjustFactionReputation(state, id, TRADE_REPUTATION_GAIN);
  if (after !== before) recordDecision(state, `reputation.trade.${id}`, 1);
  return after;
}

export function recordDeliveryForFaction(state, factionId) {
  assertGameState(state);
  const id = assertFactionId(factionId);
  if (id === NEUTRAL_FACTION_ID || id === PIRATE_FACTION_ID) return factionReputation(state, id);
  const before = factionReputation(state, id);
  const after = adjustFactionReputation(state, id, DELIVERY_REPUTATION_GAIN);
  if (after !== before) recordDecision(state, `reputation.delivery.${id}`, 1);
  return after;
}

export function recordAttackAgainstFaction(state, factionId) {
  assertGameState(state);
  const id = assertFactionId(factionId);
  if (id === NEUTRAL_FACTION_ID || id === PIRATE_FACTION_ID) return factionReputation(state, id);
  const before = factionReputation(state, id);
  const after = adjustFactionReputation(state, id, SHIP_ATTACK_REPUTATION_PENALTY);
  if (after !== before) recordDecision(state, `reputation.attack.${id}`, 1);
  return after;
}

export function recordPiracyAgainstFaction(state, victimFactionId, options = {}) {
  assertGameState(state);
  const victimId = assertFactionId(victimFactionId);
  const includeVictim = options.includeVictim !== false;
  if (victimId === PIRATE_FACTION_ID) return {};

  const changes = {};
  for (const faction of FACTIONS) {
    if (faction.id === PIRATE_FACTION_ID) continue;
    if (faction.id === victimId && !includeVictim) continue;
    const before = factionReputation(state, faction.id);
    const penalty = faction.id === victimId ? SHIP_ATTACK_REPUTATION_PENALTY : PIRACY_REPUTATION_PENALTY;
    const after = adjustFactionReputation(state, faction.id, penalty);
    if (after !== before) changes[faction.id] = { before, after };
  }
  if (Object.keys(changes).length > 0) recordDecision(state, `reputation.piracy.${victimId}`, 1);
  return changes;
}

export function hasLetterOfMarqueFrom(state, factionId) {
  assertGameState(state);
  const id = assertFactionId(factionId);
  return Boolean(state.relations.lettersOfMarque[id]);
}

export function hasPrivateeringAuthorityAgainst(state, targetFactionId) {
  assertGameState(state);
  const targetId = assertFactionId(targetFactionId);
  if (targetId === NEUTRAL_FACTION_ID || targetId === PIRATE_FACTION_ID) return false;
  for (const issuerId of Object.keys(state.relations.lettersOfMarque)) {
    assertFactionId(issuerId);
    if (diplomacyBetween(issuerId, targetId) === DIPLOMACY_WAR) return true;
  }
  return false;
}

export function letterOfMarqueStatus(state, city, shipPower = 0) {
  assertGameState(state);
  assertLetterOfMarqueShipPower(shipPower);
  const factionId = letterOfMarqueFactionId(city);
  if (!factionId) {
    return {
      available: false,
      reason: "Letters of marque are issued only at sovereign capitals."
    };
  }
  const reputation = factionReputation(state, factionId);
  const granted = hasLetterOfMarqueFrom(state, factionId);
  const missing = [];
  if (reputation < LETTER_OF_MARQUE_REPUTATION_REQUIRED) {
    missing.push(`standing ${formatSignedReputation(LETTER_OF_MARQUE_REPUTATION_REQUIRED)}`);
  }
  if (shipPower < LETTER_OF_MARQUE_POWER_REQUIRED) {
    missing.push(`ship strength ${LETTER_OF_MARQUE_POWER_REQUIRED}`);
  }
  return {
    available: true,
    factionId,
    granted,
    eligible: !granted && missing.length === 0,
    missing,
    reputation,
    shipPower,
    reputationRequired: LETTER_OF_MARQUE_REPUTATION_REQUIRED,
    shipPowerRequired: LETTER_OF_MARQUE_POWER_REQUIRED
  };
}

export function grantLetterOfMarque(state, city, shipPower = 0, context = {}) {
  const status = letterOfMarqueStatus(state, city, shipPower);
  if (!status.available) throw new Error(status.reason);
  if (status.granted) return { ...status, grantedNow: false };
  if (!status.eligible) {
    throw new Error(`Letter of marque requirements unmet: ${status.missing.join(", ")}`);
  }
  const simMinute = context.simMinute ?? null;
  if (simMinute !== null) assertSimulationMinute(simMinute);
  state.relations.lettersOfMarque[status.factionId] = {
    factionId: status.factionId,
    simMinute
  };
  recordDecision(state, `marque.grant.${status.factionId}`, 1);
  return { ...status, granted: true, grantedNow: true };
}

export function buyGood(state, economy, city, goodId, quantity = 1, context = {}) {
  assertGameState(state);
  assertQuantity(quantity, "buy quantity");
  const row = marketRow(economy, city, goodId);
  const tradeFactionId = tradeReputationFactionId(city);
  if (row.stock < quantity) throw new Error(`${cityLabel(city)} has only ${row.stock} ${row.good.label}`);
  const total = quotePortSale(economy, city, goodId, quantity);
  if (state.doubloons < total) {
    throw new Error(`Not enough doubloons to buy ${quantity} ${row.good.label}`);
  }
  if (cargoFree(state) < row.good.unitSize * quantity) {
    throw new Error(`Not enough cargo space to buy ${quantity} ${row.good.label}`);
  }
  executePortSale(economy, city, goodId, quantity);
  state.doubloons -= total;
  state.cargo[row.good.id] = (state.cargo[row.good.id] || 0) + quantity;
  state.accounts.cargoCostBasis[row.good.id] = roundLedgerMoney(
    (state.accounts.cargoCostBasis[row.good.id] || 0) + total
  );
  recordDecision(state, `trade.buy.${cityKey(city)}.${row.good.id}`, quantity);
  recordLedgerEntry(state, city, context, {
    kind: "buy",
    description: `Buy ${row.good.label} x${quantity}`,
    goodId: row.good.id,
    quantity,
    amount: -total,
    costBasis: total,
    pnl: null
  });
  if (tradeFactionId) recordTradeWithFaction(state, tradeFactionId);
  return { good: row.good, quantity, price: total, costBasis: total };
}

export function sellGood(state, economy, city, goodId, quantity = 1, context = {}) {
  assertGameState(state);
  assertQuantity(quantity, "sell quantity");
  const row = marketRow(economy, city, goodId);
  const tradeFactionId = tradeReputationFactionId(city);
  const held = state.cargo[row.good.id] || 0;
  if (row.good.sellable === false) {
    throw new Error(`${row.good.label} is a ship supply and cannot be sold`);
  }
  if (held < quantity) throw new Error(`Cannot sell ${quantity} ${row.good.label}; hold has ${held}`);
  const total = quotePortPurchase(economy, city, goodId, quantity);
  if (row.portSpecie < total) throw new Error(`${cityLabel(city)} market lacks specie for ${row.good.label}`);
  const basis = cargoCostBasis(state, row.good.id);
  const soldCost = basis.known ? basis.total * quantity / held : 0;
  const pnl = basis.known ? total - soldCost : null;
  executePortPurchase(economy, city, goodId, quantity);
  state.doubloons += total;
  const remaining = held - quantity;
  if (remaining > 0) {
    state.cargo[row.good.id] = remaining;
    if (basis.known) state.accounts.cargoCostBasis[row.good.id] = roundLedgerMoney(basis.total - soldCost);
  } else {
    delete state.cargo[row.good.id];
    delete state.accounts.cargoCostBasis[row.good.id];
  }
  if (pnl !== null) state.accounts.realizedPnl = roundLedgerMoney(state.accounts.realizedPnl + pnl);
  recordDecision(state, `trade.sell.${cityKey(city)}.${row.good.id}`, quantity);
  recordLedgerEntry(state, city, context, {
    kind: "sell",
    description: `Sell ${row.good.label} x${quantity}`,
    goodId: row.good.id,
    quantity,
    amount: total,
    costBasis: soldCost,
    pnl
  });
  if (tradeFactionId) recordTradeWithFaction(state, tradeFactionId);
  return { good: row.good, quantity, price: total, costBasis: soldCost, pnl };
}

export function receiveFishCatch(state, catchResult, context = {}) {
  assertGameState(state);
  if (!catchResult || typeof catchResult !== "object") throw new Error("Fish catch requires a catch result");
  const quantity = catchResult.quantity;
  assertQuantity(quantity, "fish catch quantity");
  const good = tradeGoodById(FISH_CARGO_GOOD_ID);
  if (cargoFree(state) < good.unitSize * quantity) {
    throw new Error(`Not enough cargo space to stow ${quantity} ${good.label}`);
  }
  state.cargo[good.id] = (state.cargo[good.id] || 0) + quantity;
  state.accounts.cargoCostBasis[good.id] = state.accounts.cargoCostBasis[good.id] || 0;
  const speciesLabel = typeof catchResult.speciesLabel === "string" && catchResult.speciesLabel.trim() !== ""
    ? catchResult.speciesLabel
    : good.label;
  recordDecision(state, `fish.catch.${catchResult.stockKey || "unknown"}`, quantity);
  recordLedgerEntry(state, null, context, {
    kind: "catch",
    description: `Catch ${speciesLabel} x${quantity}`,
    goodId: good.id,
    quantity,
    amount: 0,
    costBasis: 0,
    pnl: null
  });
  return { good, quantity, speciesLabel };
}

export function visitPort(state, city) {
  assertGameState(state);
  const memory = portMemory(state, city);
  memory.visits += 1;
}

export function portMemory(state, city) {
  assertGameState(state);
  const key = cityKey(city);
  let memory = state.memory.visitedPorts[key];
  if (!memory) {
    memory = { visits: 0 };
    state.memory.visitedPorts[key] = memory;
  }
  return memory;
}

export function deliveryQuestForCity(city, portCities) {
  const factionId = deliveryFactionId(city);
  const regionKey = deliveryRegionKey(city);
  if (!factionId || !regionKey) return null;
  const candidates = portCities
    .filter((port) => (
      port.tileId !== city.tileId &&
      port.factionId === factionId &&
      deliveryRegionKey(port) === regionKey
    ))
    .sort((a, b) => cityKey(a).localeCompare(cityKey(b)));
  if (candidates.length === 0) return null;
  const index = hashString32(`delivery|${cityKey(city)}`) % candidates.length;
  const destination = candidates[index];
  const reward = 65 + (hashString32(`reward|${cityKey(city)}|${cityKey(destination)}`) % 96);
  return {
    id: `delivery-${city.tileId}-${destination.tileId}`,
    kind: "delivery",
    originTileId: city.tileId,
    originName: cityLabel(city),
    factionId,
    regionKey,
    destinationTileId: destination.tileId,
    destinationName: cityLabel(destination),
    distanceKm: Math.round(greatCircleDistanceKm(city, destination)),
    reward
  };
}

export function questStateForCity(state, city, portCities) {
  assertGameState(state);
  const quests = questMemory(state);
  const active = quests.active;
  if (active) {
    if (active.destinationTileId === city.tileId) return { kind: "ready-to-complete", quest: active };
    if (active.originTileId === city.tileId) return { kind: "in-progress-here", quest: active };
    return { kind: "busy", quest: active };
  }
  const quest = deliveryQuestForCity(city, portCities);
  if (!quest) return { kind: "unavailable", quest: null };
  if (quests.completed[quest.id]) return { kind: "completed", quest };
  return { kind: "available", quest };
}

export function acceptQuest(state, quest) {
  assertGameState(state);
  const quests = questMemory(state);
  if (quests.active) throw new Error("Cannot accept a quest while another quest is active");
  if (quests.completed[quest.id]) throw new Error(`Quest already completed: ${quest.id}`);
  quests.active = { ...quest };
  if (quest.kind === "passenger" && quest.originKey) delete quests.passengerOffers[quest.originKey];
  recordDecision(state, `quest.accept.${quest.id}`, 1);
}

export function completeQuest(state, city, context = {}) {
  assertGameState(state);
  const quests = questMemory(state);
  const active = quests.active;
  if (!active) throw new Error("No active quest to complete");
  if (active.destinationTileId !== city.tileId) {
    throw new Error(`Quest destination is ${active.destinationName}, not ${cityLabel(city)}`);
  }
  state.doubloons += active.reward;
  quests.completed[active.id] = true;
  quests.active = null;
  recordDecision(state, `quest.complete.${active.id}`, 1);
  if (active.kind === "delivery" && active.factionId) recordDeliveryForFaction(state, active.factionId);
  recordLedgerEntry(state, city, context, {
    kind: "income",
    description: active.kind === "passenger" ? "Passenger fare" : "Delivery reward",
    goodId: null,
    quantity: 1,
    amount: active.reward,
    costBasis: null,
    pnl: null
  });
  return active;
}

export function cityKey(city) {
  return `${city.displayCity || city.city}|${city.country}|${city.tileId}`;
}

export function cityLabel(city) {
  return city.displayCity || city.city;
}

function createPlayerShipState(stats) {
  return {
    loadoutId: null,
    loadoutTargets: null,
    crew: 0,
    crewCapacity: stats.crewCapacity,
    cannons: 0,
    cannonCapacity: stats.cannons
  };
}

function createSurvivalState(startMinute, freshWaterCapacity = FRESH_WATER_CAPACITY, freshWater = freshWaterCapacity) {
  return {
    freshWater,
    freshWaterCapacity,
    foodDebt: 0,
    lastMinute: startMinute
  };
}

function restockLoadoutKind(state, plan, kind, hardtack) {
  let spent = 0;
  let quantity = 0;
  if (kind === "crew") {
    while (state.ship.crew < plan.crew) {
      const nextCrew = state.ship.crew + 1;
      const space = crewHoldSpace(nextCrew) - crewHoldSpace(state.ship.crew);
      if (state.doubloons < CREW_HIRE_COST || cargoFree(state) < space) break;
      state.ship.crew = nextCrew;
      state.doubloons -= CREW_HIRE_COST;
      spent += CREW_HIRE_COST;
      quantity += 1;
    }
  } else if (kind === "cannons") {
    while (state.ship.cannons < plan.cannons) {
      if (state.doubloons < CANNON_RESTOCK_COST || cargoFree(state) < 1) break;
      state.ship.cannons += 1;
      state.doubloons -= CANNON_RESTOCK_COST;
      spent += CANNON_RESTOCK_COST;
      quantity += 1;
    }
  } else if (kind === "food") {
    while ((state.cargo[HARDTACK_GOOD_ID] || 0) < plan.foodUnits) {
      if (state.doubloons < hardtack.basePrice || cargoFree(state) < hardtack.unitSize) break;
      state.cargo[HARDTACK_GOOD_ID] = (state.cargo[HARDTACK_GOOD_ID] || 0) + 1;
      state.accounts.cargoCostBasis[HARDTACK_GOOD_ID] = roundLedgerMoney(
        (state.accounts.cargoCostBasis[HARDTACK_GOOD_ID] || 0) + hardtack.basePrice
      );
      state.doubloons -= hardtack.basePrice;
      spent += hardtack.basePrice;
      quantity += 1;
    }
  } else if (kind === "water") {
    while (state.survival.freshWater < plan.waterUnits) {
      const added = Math.min(1, plan.waterUnits - state.survival.freshWater);
      const space = Math.ceil(state.survival.freshWater + added) - Math.ceil(state.survival.freshWater);
      if (state.doubloons < WATER_RESTOCK_COST || cargoFree(state) < space) break;
      state.survival.freshWater += added;
      state.doubloons -= WATER_RESTOCK_COST;
      spent += WATER_RESTOCK_COST;
      quantity += added;
    }
  } else {
    throw new Error(`Unknown loadout restock kind: ${kind}`);
  }
  return { spent, quantity };
}

function trimCargoQuantity(state, goodId, maximumQuantity) {
  const held = state.cargo[goodId] || 0;
  if (held <= maximumQuantity) return 0;
  const removed = held - maximumQuantity;
  const basis = cargoCostBasis(state, goodId);
  if (maximumQuantity > 0) {
    state.cargo[goodId] = maximumQuantity;
    if (basis.known) {
      state.accounts.cargoCostBasis[goodId] = roundLedgerMoney(basis.total * maximumQuantity / held);
    }
  } else {
    delete state.cargo[goodId];
    delete state.accounts.cargoCostBasis[goodId];
  }
  return removed;
}

function shipStoresSnapshot(state) {
  return {
    crew: state.ship?.crew || 0,
    cannons: state.ship?.cannons || 0,
    food: state.cargo[HARDTACK_GOOD_ID] || 0,
    water: state.survival.freshWater
  };
}

function loadoutShortfalls(state, plan) {
  return {
    crew: Math.max(0, plan.crew - state.ship.crew),
    cannons: Math.max(0, plan.cannons - state.ship.cannons),
    food: Math.max(0, plan.foodUnits - (state.cargo[HARDTACK_GOOD_ID] || 0)),
    water: Math.max(0, plan.waterUnits - state.survival.freshWater)
  };
}

function requirePlayerShipState(state, stats) {
  if (!state.ship) throw new Error("Ship loadouts require player ship state");
  if (!stats || stats.cargoCapacity !== state.cargoCapacity) {
    throw new Error("Ship loadout stats do not match game state");
  }
  if (state.ship.crewCapacity !== stats.crewCapacity || state.ship.cannonCapacity !== stats.cannons) {
    throw new Error("Ship loadout capacities do not match game state");
  }
}

function edibleCargoRows(state) {
  return TRADE_GOODS
    .filter((good) => good.category === "food")
    .map((good) => ({
      good,
      quantity: state.cargo[good.id] || 0
    }))
    .filter((row) => row.quantity > 0);
}

function consumeCheapestFoodUnit(state) {
  const candidates = edibleCargoRows(state)
    .map((row) => {
      const basis = cargoCostBasis(state, row.good.id);
      return {
        ...row,
        averageCost: basis.known ? basis.average : row.good.basePrice
      };
    })
    .sort((a, b) => (
      a.averageCost - b.averageCost ||
      a.good.basePrice - b.good.basePrice ||
      a.good.label.localeCompare(b.good.label)
    ));
  const row = candidates[0];
  if (!row) return null;

  const held = state.cargo[row.good.id] || 0;
  const basis = cargoCostBasis(state, row.good.id);
  const consumedCost = basis.known && held > 0 ? basis.total / held : 0;
  const remaining = held - 1;
  if (remaining > 0) {
    state.cargo[row.good.id] = remaining;
    if (basis.known) {
      state.accounts.cargoCostBasis[row.good.id] = roundLedgerMoney(basis.total - consumedCost);
    }
  } else {
    delete state.cargo[row.good.id];
    delete state.accounts.cargoCostBasis[row.good.id];
  }
  recordDecision(state, `provisions.consume.${row.good.id}`, 1);
  return {
    goodId: row.good.id,
    label: row.good.label,
    costBasis: consumedCost
  };
}

function consumeFreshWater(state, waterUse, allowCargoReserve = true) {
  let remainingUse = Math.max(0, waterUse);
  let waterConsumed = 0;
  let cargoConsumed = 0;
  let changed = false;

  const caskUse = Math.min(state.survival.freshWater, remainingUse);
  if (caskUse > 0) {
    state.survival.freshWater -= caskUse;
    remainingUse -= caskUse;
    waterConsumed += caskUse;
    changed = true;
  }

  while (allowCargoReserve && remainingUse > 1e-8 && (state.cargo[FRESH_WATER_GOOD_ID] || 0) > 0) {
    const unit = consumeCargoUnit(state, FRESH_WATER_GOOD_ID);
    if (!unit) break;
    cargoConsumed += 1;
    const unitWater = FRESH_WATER_USE_PER_DAY * FRESH_WATER_CARGO_DAYS;
    const unitUse = Math.min(unitWater, remainingUse);
    waterConsumed += unitUse;
    remainingUse -= unitUse;
    const leftover = unitWater - unitUse;
    if (leftover > 0) {
      state.survival.freshWater = Math.min(state.survival.freshWaterCapacity, state.survival.freshWater + leftover);
    }
    changed = true;
  }

  return {
    changed,
    waterConsumed,
    cargoConsumed,
    dehydrated: remainingUse > 1e-8
  };
}

function consumeCargoUnit(state, goodId) {
  const held = state.cargo[goodId] || 0;
  if (held <= 0) return null;
  const basis = cargoCostBasis(state, goodId);
  const consumedCost = basis.known ? basis.total / held : 0;
  const remaining = held - 1;
  if (remaining > 0) {
    state.cargo[goodId] = remaining;
    if (basis.known) {
      state.accounts.cargoCostBasis[goodId] = roundLedgerMoney(basis.total - consumedCost);
    }
  } else {
    delete state.cargo[goodId];
    delete state.accounts.cargoCostBasis[goodId];
  }
  recordDecision(state, `provisions.consume.${goodId}`, 1);
  return { goodId, costBasis: consumedCost };
}

function marketRow(economy, city, goodId) {
  tradeGoodById(goodId);
  const row = portMarket(economy, city).find((item) => item.good.id === goodId);
  if (!row) throw new Error(`${cityLabel(city)} does not trade ${goodId}`);
  return row;
}

function initialFactionReputation(playerFactionId) {
  const homeFactionId = playerFactionId === null ? null : assertFactionId(playerFactionId);
  return Object.fromEntries(FACTIONS.map((faction) => {
    if (faction.id === PIRATE_FACTION_ID) return [faction.id, PIRATE_START_REPUTATION];
    if (homeFactionId === null) return [faction.id, 0];
    if (faction.id === homeFactionId) return [faction.id, HOME_FACTION_START_REPUTATION];
    if (diplomacyBetween(homeFactionId, faction.id) === DIPLOMACY_WAR) {
      return [faction.id, ENEMY_FACTION_START_REPUTATION];
    }
    return [faction.id, 0];
  }));
}

function tradeReputationFactionId(city) {
  if (!city || !city.factionId) return null;
  const factionId = assertFactionId(city.factionId);
  if (factionId === NEUTRAL_FACTION_ID || factionId === PIRATE_FACTION_ID) return null;
  return factionId;
}

function deliveryFactionId(city) {
  if (!city || !city.factionId) return null;
  const factionId = assertFactionId(city.factionId);
  if (factionId === NEUTRAL_FACTION_ID || factionId === PIRATE_FACTION_ID) return null;
  return factionId;
}

function deliveryRegionKey(city) {
  return typeof city?.cityType === "string" && city.cityType.trim() !== "" ? city.cityType : null;
}

function letterOfMarqueFactionId(city) {
  if (!city || typeof city !== "object") return null;
  const factionId = city.capitalOfFactionId || (city.isFactionCapital ? city.factionId : null);
  if (!factionId) return null;
  const id = assertFactionId(factionId);
  if (id === NEUTRAL_FACTION_ID || id === PIRATE_FACTION_ID) return null;
  return id;
}

function goodById(goodId) {
  return tradeGoodById(goodId);
}

function recordDecision(state, key, amount) {
  state.memory.decisions[key] = (state.memory.decisions[key] || 0) + amount;
}

function recordLedgerEntry(state, city, context, entry) {
  const simMinute = context.simMinute ?? null;
  if (simMinute !== null) assertSimulationMinute(simMinute);
  state.accounts.ledger.push({
    id: state.accounts.nextEntryId++,
    kind: entry.kind,
    simMinute,
    location: city ? cityLabel(city) : "Aboard",
    country: city?.country || "",
    description: entry.description,
    goodId: entry.goodId,
    quantity: entry.quantity,
    amount: roundLedgerMoney(entry.amount),
    balance: state.doubloons,
    costBasis: entry.costBasis === null ? null : roundLedgerMoney(entry.costBasis),
    pnl: entry.pnl === null ? null : roundLedgerMoney(entry.pnl)
  });
}

function roundLedgerMoney(value) {
  return Math.round(value * 10000) / 10000;
}

function fishingNetItemRow(state) {
  const net = fishingNetById(state.inventory.fishingNetId);
  return {
    id: SHIP_ITEM_FISHING_NET,
    label: net.label,
    detail: `Catch x${net.catchRateMultiplier.toFixed(2)}, max haul ${net.maxCatch}`,
    quantity: 1,
    netId: net.id
  };
}

function assertGameState(state) {
  if (!state || typeof state !== "object") throw new Error("Missing game state");
  if (state.playerCharacter !== null) assertPlayerCharacter(state.playerCharacter);
  assertCargoCapacity(state.cargoCapacity);
  if (!Number.isInteger(state.doubloons) || state.doubloons < 0) {
    throw new Error(`Invalid doubloon balance: ${state.doubloons}`);
  }
  if (!state.cargo || typeof state.cargo !== "object") throw new Error("Game state cargo must be an object");
  ensureSurvivalState(state);
  if (state.ship !== null && state.ship !== undefined) assertPlayerShipState(state.ship);
  if (!state.inventory || typeof state.inventory !== "object") {
    state.inventory = { items: {} };
  }
  if (!state.inventory.items || typeof state.inventory.items !== "object") {
    state.inventory.items = {};
  }
  if (typeof state.inventory.fishingNetId !== "string") {
    state.inventory.fishingNetId = BASIC_FISHING_NET_ID;
  }
  fishingNetById(state.inventory.fishingNetId);
  if (!state.accounts || typeof state.accounts !== "object") throw new Error("Game state accounts must be an object");
  if (!state.accounts.cargoCostBasis || typeof state.accounts.cargoCostBasis !== "object") {
    throw new Error("Game state cargo cost basis must be an object");
  }
  assertFactionReputationTable(state.relations?.factionReputation);
  assertLettersOfMarqueTable(state.relations?.lettersOfMarque);
  if (!Number.isFinite(state.accounts.realizedPnl)) throw new Error("Invalid realized trade P/L");
  if (!Array.isArray(state.accounts.ledger)) throw new Error("Game state ledger must be an array");
  if (!Number.isInteger(state.accounts.nextEntryId) || state.accounts.nextEntryId <= 0) {
    throw new Error(`Invalid next ledger entry id: ${state.accounts.nextEntryId}`);
  }
  if (!state.memory || typeof state.memory !== "object") throw new Error("Game state memory must be an object");
  if (!state.memory.discoveries || typeof state.memory.discoveries !== "object") {
    throw new Error("Game state discoveries must be an object");
  }
  if (!Array.isArray(state.memory.discoveryOrder)) {
    throw new Error("Game state discovery order must be an array");
  }
  if (!state.memory.navigation || typeof state.memory.navigation !== "object") {
    throw new Error("Game state navigation memory must be an object");
  }
  const { lastLongitudeDeg, cumulativeLongitudeDeg } = state.memory.navigation;
  if (lastLongitudeDeg !== null && !Number.isFinite(lastLongitudeDeg)) {
    throw new Error(`Invalid last navigation longitude: ${lastLongitudeDeg}`);
  }
  if (!Number.isFinite(cumulativeLongitudeDeg)) {
    throw new Error(`Invalid cumulative navigation longitude: ${cumulativeLongitudeDeg}`);
  }
}

function assertPlayerShipState(ship) {
  if (!ship || typeof ship !== "object") throw new Error("Invalid player ship state");
  for (const key of ["crew", "crewCapacity", "cannons", "cannonCapacity"]) {
    if (!Number.isInteger(ship[key]) || ship[key] < 0) throw new Error(`Invalid ship ${key}: ${ship[key]}`);
  }
  if (ship.crew > ship.crewCapacity) throw new Error("Player crew exceeds ship capacity");
  if (ship.cannons > ship.cannonCapacity) throw new Error("Player cannons exceed ship capacity");
  if (ship.loadoutId !== null && typeof ship.loadoutId !== "string") {
    throw new Error(`Invalid ship loadout id: ${ship.loadoutId}`);
  }
}

function questMemory(state) {
  if (!state.memory.quests || typeof state.memory.quests !== "object") {
    state.memory.quests = { active: null, completed: {} };
  }
  const quests = state.memory.quests;
  if (!quests.completed || typeof quests.completed !== "object") quests.completed = {};
  if (!quests.passengerOffers || typeof quests.passengerOffers !== "object") quests.passengerOffers = {};
  if (!quests.passengerRolls || typeof quests.passengerRolls !== "object") quests.passengerRolls = {};
  return quests;
}

function assertPlayerCharacter(character) {
  if (!character || typeof character !== "object") throw new Error("Invalid player character");
  if (typeof character.name !== "string" || character.name.trim() === "") {
    throw new Error("Player character requires a name");
  }
  if (!Array.isArray(character.expressions) || character.expressions.length < 2) {
    throw new Error("Player character requires multiple expressions");
  }
  if (character.nationalityId !== undefined) assertFactionId(character.nationalityId);
}

function assertFactionReputationTable(reputation) {
  if (!reputation || typeof reputation !== "object") {
    throw new Error("Game state faction reputation must be an object");
  }
  for (const faction of FACTIONS) {
    if (!Object.prototype.hasOwnProperty.call(reputation, faction.id)) {
      throw new Error(`Missing faction reputation: ${faction.id}`);
    }
    assertReputationValue(reputation[faction.id], `reputation.${faction.id}`);
  }
}

function assertLettersOfMarqueTable(letters) {
  if (!letters || typeof letters !== "object") {
    throw new Error("Game state letters of marque must be an object");
  }
  for (const [factionId, letter] of Object.entries(letters)) {
    assertFactionId(factionId);
    if (!letter || typeof letter !== "object") throw new Error(`Invalid letter of marque: ${factionId}`);
    if (letter.factionId !== factionId) throw new Error(`Letter of marque faction mismatch: ${factionId}`);
    if (letter.simMinute !== null && !Number.isFinite(letter.simMinute)) {
      throw new Error(`Invalid letter of marque issue minute: ${letter.simMinute}`);
    }
  }
}

function assertReputationValue(value, label) {
  if (!Number.isFinite(value) || value < REPUTATION_MIN || value > REPUTATION_MAX) {
    throw new Error(`Invalid ${label}: ${value}`);
  }
}

function assertReputationDelta(delta) {
  if (!Number.isFinite(delta)) throw new Error(`Invalid reputation delta: ${delta}`);
}

function assertLetterOfMarqueShipPower(shipPower) {
  if (!Number.isFinite(shipPower) || shipPower < 0) throw new Error(`Invalid ship strength: ${shipPower}`);
}

function clampReputation(value) {
  return Math.min(REPUTATION_MAX, Math.max(REPUTATION_MIN, value));
}

function roundReputation(value) {
  return Math.round(value * 1000) / 1000;
}

function formatSignedReputation(value) {
  return `${value >= 0 ? "+" : ""}${value}`;
}

function assertDiscovery(discovery) {
  if (!discovery || typeof discovery.id !== "string" || discovery.id === "") {
    throw new Error("Cannot record a discovery without an id");
  }
  if (typeof discovery.displayName !== "string" || discovery.displayName === "") {
    throw new Error(`Discovery ${discovery.id} has no display name`);
  }
  if (!["mountain", "landmark", "legend", "achievement"].includes(discovery.kind)) {
    throw new Error(`Discovery ${discovery.id} has invalid kind: ${discovery.kind}`);
  }
}

function normalizeLongitudeDelta(deltaDeg) {
  return ((((deltaDeg + 180) % 360) + 360) % 360) - 180;
}

function assertCargoCapacity(cargoCapacity) {
  if (!Number.isInteger(cargoCapacity) || cargoCapacity < 0) {
    throw new Error(`Invalid cargo capacity: ${cargoCapacity}`);
  }
}

function assertSimulationMinute(simMinute) {
  if (!Number.isFinite(simMinute)) throw new Error(`Invalid simulation minute: ${simMinute}`);
}

function assertQuantity(quantity, label) {
  if (!Number.isInteger(quantity) || quantity <= 0) throw new Error(`Invalid ${label}: ${quantity}`);
}

function assertProvisionQuantity(quantity, label) {
  if (!Number.isInteger(quantity) || quantity < 0) throw new Error(`Invalid ${label}: ${quantity}`);
}

function ensureSurvivalState(state) {
  if (!state.survival || typeof state.survival !== "object") {
    state.survival = createSurvivalState(0);
  }
  if (!Number.isFinite(state.survival.freshWaterCapacity) || state.survival.freshWaterCapacity <= 0) {
    state.survival.freshWaterCapacity = FRESH_WATER_CAPACITY;
  }
  if (!Number.isFinite(state.survival.freshWater) || state.survival.freshWater < 0) {
    state.survival.freshWater = state.survival.freshWaterCapacity;
  }
  state.survival.freshWater = Math.min(state.survival.freshWater, state.survival.freshWaterCapacity);
  if (!Number.isFinite(state.survival.foodDebt) || state.survival.foodDebt < 0) {
    state.survival.foodDebt = 0;
  }
  if (!Number.isFinite(state.survival.lastMinute)) {
    state.survival.lastMinute = 0;
  }
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function hashString32(value) {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
