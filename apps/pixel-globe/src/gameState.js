import {
  FORAGED_FOOD_GOOD_ID,
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
  DIPLOMACY_HOSTILE,
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
  balancedProvisionTargets,
  crewHoldSpace,
  shipLoadoutPlan
} from "./shipLoadouts.js";
import { shipLabelForSlug } from "./shipStats.js";
import { greatCircleDistanceKm } from "./worldDistance.js";
import {
  BASIC_FISHING_NET_ID,
  fishingNetById
} from "./fishingNets.js";
import {
  STANDARD_CANNON_EQUIPMENT_ID,
  cannonEquipmentById
} from "./cannonEquipment.js";
import {
  EQUIPMENT_STOCK_CANNON,
  EQUIPMENT_STOCK_FISHING_NET,
  equipmentAvailableAtPort
} from "./portEquipment.js";
import {
  adjustDiplomaticStance,
  advanceWorldDiplomacy,
  createWorldDiplomacy,
  recordDiplomaticPortCall,
  migrateWorldDiplomacy,
  recentDiplomacyEvents,
  validateWorldDiplomacy,
  worldDiplomacyBetween
} from "./worldDiplomacy.js";
import {
  DEFAULT_MING_OPEN_TRADE_FACTION_IDS,
  MING_FACTION_ID,
  mingTradeAccess
} from "./mingTradeRestrictions.js";
import { NAVAL_WEAPON_ARROW } from "./navalWeapons.js";
import { createPortConquestMemory, validatePortConquestMemory } from "./portConquest.js";
import {
  CAMPAIGN_GOAL_EXPLORER,
  createCampaignGoal,
  settleExplorerHomecoming,
  settleFamilyDebtHomecoming,
  validateCampaignGoal
} from "./campaignGoals.js";
import {
  createColonizationQuestMemory,
  validateColonizationQuestMemory
} from "./colonizationQuest.js";

export const STARTING_DOUBLOONS = 360;
export const GAME_STATE_VERSION = 15;
export const REPUTATION_MIN = -100;
export const REPUTATION_MAX = 100;
export const HOME_FACTION_START_REPUTATION = 8;
export const ENEMY_FACTION_START_REPUTATION = -8;
export const PIRATE_START_REPUTATION = REPUTATION_MIN;
export const PIRATE_REPUTATION_GAIN_PER_PIRACY = 8;
export const PIRATE_HIDEOUT_REPUTATION_REQUIRED = -25;
export const TRADE_REPUTATION_GAIN = 0.2;
export const DELIVERY_REPUTATION_GAIN = 2;
export const SHIP_ATTACK_REPUTATION_PENALTY = -35;
export const PIRACY_REPUTATION_PENALTY = -3;
export const LETTER_OF_MARQUE_REPUTATION_REQUIRED = 15;
export const LETTER_OF_MARQUE_POWER_REQUIRED = 20;
export const HOSTILE_PORT_REPUTATION_THRESHOLD = -75;
export const PORT_DISGUISE_SUCCESS_CHANCE = 0.6;
export const PORT_DISGUISE_LOCK_DAYS = 14;
export const FACTION_SAFE_PASSAGE_DAYS = 30;
export const FACTION_SAFE_PASSAGE_REFUSAL_DAYS = 2;
export const FISH_CARGO_GOOD_ID = "fish";
export const SHIP_ITEM_FISHING_NET = "fishing-net";
export const SHIP_ITEM_CANNON_EQUIPMENT = "cannon-equipment";
export const FRESH_WATER_CAPACITY = 100;
export const FRESH_WATER_DAYS = 21;
export const FRESH_WATER_CARGO_DAYS = 1;
export const RAIN_WATER_COLLECTION_PER_DAY = 0.08;
export const FOOD_UNITS_PER_DAY = 1;
export const FOOD_TARGET_DAYS = 21;
export const STARTING_HARDTACK_UNITS = 10;
export const EMERGENCY_SHIP_AID_UNITS = 3;
export const ENVOY_SAFE_PASSAGE_DAYS = 7;
export const ENVOY_TARGET_FRIENDLY_REPUTATION = 5;
export const ENVOY_TARGET_HOSTILE_REPUTATION = -8;
export const ENVOY_HOME_REPUTATION = 8;

const MINUTES_PER_DAY = 24 * 60;
export const SURVIVAL_DEHYDRATION_INTERVAL_MINUTES = 12 * 60;
export const SURVIVAL_STARVATION_INTERVAL_MINUTES = 5 * MINUTES_PER_DAY;
const PORT_DISGUISE_LOCK_MINUTES = PORT_DISGUISE_LOCK_DAYS * MINUTES_PER_DAY;
const FACTION_SAFE_PASSAGE_MINUTES = FACTION_SAFE_PASSAGE_DAYS * MINUTES_PER_DAY;
const FACTION_SAFE_PASSAGE_REFUSAL_MINUTES = FACTION_SAFE_PASSAGE_REFUSAL_DAYS * MINUTES_PER_DAY;
const ENVOY_SAFE_PASSAGE_MINUTES = ENVOY_SAFE_PASSAGE_DAYS * MINUTES_PER_DAY;
const ENVOY_QUEST_KINDS = new Set(["friendly-envoy", "hostile-envoy"]);
const FRESH_WATER_USE_PER_DAY = FRESH_WATER_CAPACITY / FRESH_WATER_DAYS;

export const SHIP_ITEM_CATALOG = Object.freeze([
  Object.freeze({
    id: SHIP_ITEM_FISHING_NET,
    label: "Fishing net",
    detail: "Can harvest nearby fisheries"
  }),
  Object.freeze({
    id: SHIP_ITEM_CANNON_EQUIPMENT,
    label: "Cannon battery",
    detail: "Installed naval ordnance"
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
    version: GAME_STATE_VERSION,
    activePlaySeconds: 0,
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
      fishingNetId: BASIC_FISHING_NET_ID,
      cannonEquipmentId: STANDARD_CANNON_EQUIPMENT_ID
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
      lettersOfMarque: {},
      safePassageUntilMinute: {},
      safePassageRefusalUntilMinute: {},
      mingOpenTradeFactionIds: [...DEFAULT_MING_OPEN_TRADE_FACTION_IDS],
      diplomacy: createWorldDiplomacy({
        startMinute,
        seedKey: worldDiplomacySeedKey(playerCharacter, startMinute)
      })
    },
    memory: {
      visitedPorts: {},
      decisions: {},
      flags: {},
      discoveries: {},
      discoveryOrder: [],
      pendingDiscoveryPortDialogueIds: [],
      navigation: {
        lastLongitudeDeg: null,
        cumulativeLongitudeDeg: 0
      },
      quests: {
        active: null,
        completed: {},
        passengerOffers: {},
        passengerRolls: {}
      },
      cargoReservations: {},
      colonization: createColonizationQuestMemory(),
      conquest: createPortConquestMemory(),
      campaignGoal: playerCharacterSupportsCampaignGoal(playerCharacter)
        ? createCampaignGoal({ playerCharacter, startMinute })
        : null,
      cartography: createCartographyMemory()
    }
  };
}

export function validateGameState(state) {
  if (state?.version !== GAME_STATE_VERSION) {
    throw new Error(`Unsupported game state version: ${state?.version ?? "missing"}`);
  }
  assertGameState(state);
  return state;
}

export function migrateGameState(state, shipStats) {
  if (state?.version === GAME_STATE_VERSION) return validateGameState(state);
  if (![8, 9, 10, 11, 12, 13, 14].includes(state?.version)) {
    throw new Error(`Unsupported game state version: ${state?.version ?? "missing"}`);
  }
  if (state.ship && (!shipStats || typeof shipStats !== "object")) {
    throw new Error("Game state migration requires canonical ship stats");
  }
  if (state.ship && shipStats.cargoCapacity !== state.cargoCapacity) {
    throw new Error("Saved ship capacity does not match its hull during migration");
  }
  if (!state.relations || typeof state.relations !== "object") {
    throw new Error("Game state migration requires relations");
  }

  const migratedDiplomacy = state.relations.diplomacy
    ? migrateWorldDiplomacy(state.relations.diplomacy)
    : createWorldDiplomacy({
        startMinute: savedGameStartMinute(state),
        seedKey: worldDiplomacySeedKey(state.playerCharacter, savedGameStartMinute(state))
      });
  const migrated = {
    ...state,
    version: GAME_STATE_VERSION,
    ship: state.ship ? {
      ...state.ship,
      mass: shipStats.mass,
      navalWeaponKind: shipStats.navalWeaponKind
    } : state.ship,
    relations: {
      ...state.relations,
      safePassageUntilMinute: state.version === 8 ? {} : state.relations.safePassageUntilMinute,
      safePassageRefusalUntilMinute: {},
      mingOpenTradeFactionIds: [...DEFAULT_MING_OPEN_TRADE_FACTION_IDS],
      diplomacy: migratedDiplomacy
    },
    memory: {
      ...state.memory,
      cargoReservations: state.memory?.cargoReservations || {},
      colonization: state.memory?.colonization || createColonizationQuestMemory(),
      conquest: state.memory?.conquest || createPortConquestMemory(),
      campaignGoal: state.memory?.campaignGoal || (playerCharacterSupportsCampaignGoal(state.playerCharacter)
        ? createCampaignGoal({ playerCharacter: state.playerCharacter, startMinute: savedGameStartMinute(state) })
        : null),
      cartography: state.memory?.cartography || createCartographyMemory()
    }
  };
  return validateGameState(migrated);
}

export function advanceActivePlayTime(state, elapsedSeconds) {
  assertGameState(state);
  if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) {
    throw new Error(`Invalid active play duration: ${elapsedSeconds}`);
  }
  state.activePlaySeconds += elapsedSeconds;
  return state.activePlaySeconds;
}

export function diplomacyBetweenForState(state, factionAId, factionBId) {
  if (!state?.relations?.diplomacy) throw new Error("Game state has no world diplomacy");
  return worldDiplomacyBetween(state.relations.diplomacy, factionAId, factionBId);
}

export function advanceGameDiplomacy(state, currentMinute) {
  assertGameState(state);
  assertSimulationMinute(currentMinute);
  return advanceWorldDiplomacy(state.relations.diplomacy, currentMinute, {
    homeFactionId: state.playerCharacter?.nationalityId || null,
    reputation: state.relations.factionReputation,
    decisions: state.memory.decisions
  });
}

export function recentGameDiplomacyEvents(state, limit = 3) {
  assertGameState(state);
  return recentDiplomacyEvents(state.relations.diplomacy, limit);
}

export function recordDiscovery(state, discovery) {
  assertGameState(state);
  assertDiscovery(discovery);
  if (state.memory.discoveries[discovery.id]) return false;
  const entry = {
    id: discovery.id,
    displayName: discovery.displayName,
    kind: discovery.kind,
    detail: discovery.detail || ""
  };
  if (discovery.portArrivalDialogue) {
    entry.portArrivalDialogue = discovery.portArrivalDialogue;
    entry.portArrivalExpressionId = discovery.portArrivalExpressionId || "attentive";
    state.memory.pendingDiscoveryPortDialogueIds.push(discovery.id);
  }
  state.memory.discoveries[discovery.id] = entry;
  state.memory.discoveryOrder.push(discovery.id);
  return true;
}

export function consumePendingDiscoveryPortDialogue(state) {
  assertGameState(state);
  while (state.memory.pendingDiscoveryPortDialogueIds.length > 0) {
    const discoveryId = state.memory.pendingDiscoveryPortDialogueIds.shift();
    const discovery = state.memory.discoveries[discoveryId];
    if (!discovery?.portArrivalDialogue) continue;
    return {
      discoveryId,
      message: discovery.portArrivalDialogue,
      expressionId: discovery.portArrivalExpressionId || "attentive"
    };
  }
  return null;
}

export function hasDiscovery(state, discoveryId) {
  assertGameState(state);
  return Boolean(state.memory.discoveries[discoveryId]);
}

export function settleCampaignGoalAtHome(state, city, {
  currentMinute,
  wonderCatalog = [],
  nextLeadDiscoveryId = null
} = {}) {
  assertGameState(state);
  if (!city || !Number.isInteger(city.tileId)) throw new Error("Campaign homecoming requires a port city");
  assertSimulationMinute(currentMinute);
  const goal = state.memory.campaignGoal;
  if (!goal) throw new Error("Player character has no campaign goal");
  if (city.tileId !== goal.homePortTileId) {
    throw new Error(`Campaign homecoming is not at the player's home port: ${city.tileId}`);
  }

  const outcome = goal.type === CAMPAIGN_GOAL_EXPLORER
    ? settleExplorerHomecoming(goal, {
        discoveredIds: new Set(state.memory.discoveryOrder),
        wonderCatalog,
        homePort: city,
        nextLeadDiscoveryId
      })
    : settleFamilyDebtHomecoming(goal, {
        currentMinute,
        doubloons: state.doubloons
      });
  const amount = goal.type === CAMPAIGN_GOAL_EXPLORER ? outcome.reward : -outcome.payment;
  if (amount !== 0) {
    state.doubloons += amount;
    if (state.doubloons < 0) throw new Error("Campaign settlement overdraws the player's purse");
    recordLedgerEntry(state, city, { simMinute: currentMinute }, {
      kind: "campaign",
      description: goal.type === CAMPAIGN_GOAL_EXPLORER
        ? `Patron rewards ${outcome.newlyReportedIds.length} discoveries`
        : "Family debt payment",
      goodId: null,
      quantity: goal.type === CAMPAIGN_GOAL_EXPLORER ? outcome.newlyReportedIds.length : 0,
      amount,
      costBasis: null,
      pnl: amount > 0 ? amount : null
    });
  }
  return outcome;
}

export function updateCartographyMemory(state, seenTilesBase64, seenTileCount) {
  assertGameState(state);
  if (typeof seenTilesBase64 !== "string") throw new Error("Cartography tile mask must be a string");
  if (!Number.isInteger(seenTileCount) || seenTileCount < 0) {
    throw new Error(`Invalid mapped tile count: ${seenTileCount}`);
  }
  state.memory.cartography = { seenTilesBase64, seenTileCount };
  return state.memory.cartography;
}

export function discoveredEntries(state) {
  assertGameState(state);
  return state.memory.discoveryOrder.map((id) => {
    const discovery = state.memory.discoveries[id];
    if (!discovery) throw new Error(`Discovery order references missing discovery: ${id}`);
    return discovery;
  });
}

export function receiveDiscoveryCargo(state, discovery, goodId, context = {}) {
  assertGameState(state);
  assertDiscovery(discovery);
  if (!state.memory.discoveries[discovery.id]) {
    throw new Error(`Cannot receive cargo for undiscovered site: ${discovery.displayName}`);
  }
  const good = goodById(goodId);
  const rewardKey = `discovery.cargo.${discovery.id}.${good.id}`;
  if (Object.prototype.hasOwnProperty.call(state.memory.decisions, rewardKey)) {
    return { good, quantity: 0, alreadyReceived: true };
  }

  const quantity = Math.floor(Math.max(0, cargoFree(state)) / good.unitSize);
  recordDecision(state, rewardKey, quantity);
  if (quantity <= 0) return { good, quantity: 0, alreadyReceived: false };

  state.cargo[good.id] = (state.cargo[good.id] || 0) + quantity;
  state.accounts.cargoCostBasis[good.id] = state.accounts.cargoCostBasis[good.id] || 0;
  recordLedgerEntry(state, null, context, {
    kind: "discovery",
    description: `Treasure from ${discovery.displayName}: ${good.label} x${quantity}`,
    goodId: good.id,
    quantity,
    amount: 0,
    costBasis: 0,
    pnl: null
  });
  return { good, quantity, alreadyReceived: false };
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
  state.ship.mass = stats.mass;
  state.ship.navalWeaponKind = stats.navalWeaponKind;
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
  const label = shipLabelForSlug(stats.slug);
  const plan = replacePlayerShipAndRecord(state, city, stats, context, {
    description: `Purchase ${label}`,
    amount: -price,
    costBasis: price
  }, () => {
    state.doubloons -= price;
    recordDecision(state, `ship.purchase.${cityKey(city)}.${stats.slug}`, 1);
  });
  return { slug: stats.slug, label, price, plan };
}

export function awardPlayerShip(state, city, stats, description, context = {}) {
  assertGameState(state);
  if (!stats || typeof stats.slug !== "string") throw new Error("Ship award requires valid ship stats");
  if (typeof description !== "string" || description.trim() === "") {
    throw new Error("Ship award requires a ledger description");
  }
  const label = shipLabelForSlug(stats.slug);
  const plan = replacePlayerShipAndRecord(state, city, stats, context, {
    description,
    amount: 0,
    costBasis: 0
  });
  return { slug: stats.slug, label, price: 0, plan };
}

function replacePlayerShipAndRecord(state, city, stats, context, ledger, beforeLedger = null) {
  const plan = setPlayerShipStats(state, stats);
  if (beforeLedger) beforeLedger();
  recordLedgerEntry(state, city, context, {
    kind: "ship",
    description: ledger.description,
    goodId: null,
    quantity: 1,
    amount: ledger.amount,
    costBasis: ledger.costBasis,
    pnl: null
  });
  return plan;
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
  for (const units of Object.values(state.memory.cargoReservations)) used += units;
  return used;
}

export function reserveCargoSpace(state, reservationId, units) {
  assertGameState(state);
  assertCargoReservationId(reservationId);
  if (!Number.isInteger(units) || units <= 0) {
    throw new Error(`Invalid cargo reservation size: ${units}`);
  }
  if (Object.prototype.hasOwnProperty.call(state.memory.cargoReservations, reservationId)) {
    throw new Error(`Cargo reservation already exists: ${reservationId}`);
  }
  if (cargoFree(state) < units) {
    throw new Error(`Cannot reserve ${units} cargo units; only ${cargoFree(state)} remain`);
  }
  state.memory.cargoReservations[reservationId] = units;
  return units;
}

export function releaseCargoSpace(state, reservationId) {
  assertGameState(state);
  assertCargoReservationId(reservationId);
  const units = state.memory.cargoReservations[reservationId];
  if (!Number.isInteger(units) || units <= 0) {
    throw new Error(`Cargo reservation does not exist: ${reservationId}`);
  }
  delete state.memory.cargoReservations[reservationId];
  return units;
}

export function cargoReservationUnits(state, reservationId) {
  assertGameState(state);
  assertCargoReservationId(reservationId);
  return state.memory.cargoReservations[reservationId] || 0;
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
  let free = cargoFree(state);
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

export function receivePortConquestPrize(state, city, amount, context = {}) {
  assertGameState(state);
  if (!city || !Number.isInteger(city.tileId)) throw new Error("Port conquest prize requires a city");
  if (!Number.isInteger(amount) || amount <= 0) throw new Error(`Invalid port conquest prize: ${amount}`);
  state.doubloons += amount;
  recordLedgerEntry(state, city, context, {
    kind: "conquest",
    description: `${cityLabel(city)} conquest prize`,
    goodId: null,
    quantity: 0,
    amount,
    costBasis: 0,
    pnl: amount
  });
  return { amount, balance: state.doubloons };
}

export function receiveQuestPayment(state, city, amount, description, context = {}) {
  assertGameState(state);
  if (!Number.isInteger(amount) || amount <= 0) throw new Error(`Invalid quest payment: ${amount}`);
  if (typeof description !== "string" || description.trim() === "") {
    throw new Error("Quest payment requires a ledger description");
  }
  state.doubloons += amount;
  recordLedgerEntry(state, city, context, {
    kind: "quest",
    description,
    goodId: null,
    quantity: 0,
    amount,
    costBasis: 0,
    pnl: amount
  });
  return { amount, balance: state.doubloons };
}

export function cargoFree(state) {
  const reservation = loadoutProvisionReservation(state);
  return state.cargoCapacity - cargoUsed(state) - reservation.missingFood - reservation.missingWater;
}

export function cargoFreeForGood(state, goodId) {
  const good = tradeGoodById(goodId);
  return good.category === "food" ? provisionCargoFree(state, "food") : cargoFree(state);
}

export function refillFreshWaterFromShore(state) {
  assertGameState(state);
  const missing = Math.max(0, state.survival.freshWaterCapacity - state.survival.freshWater);
  const availableSpace = provisionCargoFree(state, "water");
  const filled = Math.min(missing, availableSpace);
  if (filled <= 0) return 0;
  state.survival.freshWater += filled;
  recordDecision(state, "scavenge.water", Math.ceil(filled));
  return filled;
}

export function stowForagedFood(state, requestedQuantity) {
  assertGameState(state);
  if (!Number.isInteger(requestedQuantity) || requestedQuantity < 0) {
    throw new Error(`Invalid foraged food quantity: ${requestedQuantity}`);
  }
  const good = tradeGoodById(FORAGED_FOOD_GOOD_ID);
  const quantity = Math.min(requestedQuantity, Math.floor(provisionCargoFree(state, "food") / good.unitSize));
  if (quantity <= 0) return 0;
  state.cargo[good.id] = (state.cargo[good.id] || 0) + quantity;
  state.accounts.cargoCostBasis[good.id] = state.accounts.cargoCostBasis[good.id] || 0;
  recordDecision(state, "scavenge.food", quantity);
  return quantity;
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

export function shipEmergencyAidNeed(state, npcShipId) {
  assertGameState(state);
  assertNpcShipId(npcShipId);
  const status = survivalStatus(state);
  const needsFood = status.foodUnits <= 0;
  const needsWater = status.freshWater <= 0;
  const alreadyReceived = (state.memory.decisions[emergencyShipAidKey(npcShipId)] || 0) > 0;
  return {
    needsFood,
    needsWater,
    alreadyReceived,
    available: (needsFood || needsWater) && !alreadyReceived && (
      provisionCargoFree(state, "food") >= 1 ||
      provisionCargoFree(state, "water") >= 1
    )
  };
}

export function receiveEmergencyShipAid(state, npcShipId) {
  const need = shipEmergencyAidNeed(state, npcShipId);
  if (need.alreadyReceived) throw new Error(`Emergency aid already received from ship: ${npcShipId}`);
  if (!need.needsFood && !need.needsWater) {
    throw new Error("Emergency ship aid requires depleted food or water");
  }
  if (!need.available) throw new Error("Emergency ship aid requires free hold space");

  const desired = { food: EMERGENCY_SHIP_AID_UNITS, water: EMERGENCY_SHIP_AID_UNITS };
  const granted = { food: 0, water: 0 };
  const order = ["water", "food"];
  while (granted.food < desired.food || granted.water < desired.water) {
    let changed = false;
    for (const kind of order) {
      if (provisionCargoFree(state, kind) < 1 || granted[kind] >= desired[kind]) continue;
      if (kind === "food") {
        state.cargo[HARDTACK_GOOD_ID] = (state.cargo[HARDTACK_GOOD_ID] || 0) + 1;
        granted.food += 1;
      } else {
        const missingWater = Math.floor(state.survival.freshWaterCapacity - state.survival.freshWater);
        if (missingWater <= 0) continue;
        state.survival.freshWater += 1;
        granted.water += 1;
      }
      changed = true;
    }
    if (!changed) break;
  }

  if (granted.food > 0) {
    state.accounts.cargoCostBasis[HARDTACK_GOOD_ID] = state.accounts.cargoCostBasis[HARDTACK_GOOD_ID] || 0;
  }
  if (granted.food <= 0 && granted.water <= 0) throw new Error("Emergency ship aid transferred no provisions");
  recordDecision(state, emergencyShipAidKey(npcShipId), 1);
  return granted;
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
    ? ["crew", "cannons", "provisions"]
    : ["crew", "provisions", "cannons"];
  for (const kind of priorities) {
    if (kind === "provisions") {
      const result = restockBalancedProvisions(state, plan, hardtack);
      spent += result.spent;
      additions.food += result.food;
      additions.water += result.water;
    } else {
      const result = restockLoadoutKind(state, plan, kind);
      spent += result.spent;
      additions[kind] += result.quantity;
    }
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

export function applySurvivalDeprivation(state, { dehydration, starvation }) {
  assertGameState(state);
  assertDeprivationSeverity(dehydration, "dehydration");
  assertDeprivationSeverity(starvation, "starvation");
  const crewLost = loseCrew(state, dehydration + starvation);
  const dehydrationCrewLost = Math.min(dehydration, crewLost);
  const starvationCrewLost = crewLost - dehydrationCrewLost;
  return {
    crewLost,
    dehydrationCrewLost,
    starvationCrewLost,
    crewDepleted: crewLost > 0 && state.ship.crew <= 0
  };
}

function assertDeprivationSeverity(value, label) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`Invalid ${label} severity: ${value}`);
  }
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
  const passengers = quest?.kind === "passenger" || isEnvoyQuest(quest)
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
  const stowable = Math.min(quantity, Math.floor(provisionCargoFree(state, "food") / good.unitSize));
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
  const freeCargoQuantity = Math.floor(cargoFreeForGood(state, good.id) / good.unitSize);
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
  const rainfall = options.rainfall ?? 0;
  if (!Number.isFinite(rainfall) || rainfall < 0 || rainfall > 1) {
    throw new Error(`Invalid rainfall strength: ${rainfall}`);
  }
  const result = {
    changed: false,
    freshWaterRefilled: false,
    rainWaterCollected: 0,
    waterConsumed: 0,
    waterCargoConsumed: 0,
    foodConsumed: [],
    dehydrated: false,
    starved: false
  };
  if (options.safePort) {
    state.survival.lastMinute = currentMinute;
    return result;
  }
  if (options.freshwater) {
    if (state.survival.freshWater < state.survival.freshWaterCapacity) {
      const filled = state.ship
        ? Math.min(
          state.survival.freshWaterCapacity - state.survival.freshWater,
          provisionCargoFree(state, "water")
        )
        : state.survival.freshWaterCapacity - state.survival.freshWater;
      if (filled > 0) {
        state.survival.freshWater += filled;
        result.freshWaterRefilled = true;
        result.changed = true;
      }
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
    const rainWater = elapsedDays * rainfall * RAIN_WATER_COLLECTION_PER_DAY;
    const water = consumeFreshWater(state, Math.max(0, waterUse - rainWater), !state.ship);
    result.rainWaterCollected = Math.min(waterUse, rainWater);
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

export function deliverQuestCargo(state, city, goodId, quantity, questId, context = {}) {
  assertGameState(state);
  const good = goodById(goodId);
  assertQuantity(quantity, "quest cargo quantity");
  if (typeof questId !== "string" || questId.trim() === "") {
    throw new Error(`Invalid cargo quest id: ${questId}`);
  }
  const held = state.cargo[good.id] || 0;
  if (held < quantity) {
    throw new Error(`Cannot deliver ${quantity} ${good.label}; hold has ${held}`);
  }
  const basis = cargoCostBasis(state, good.id);
  const deliveredCost = basis.known ? basis.total * quantity / held : 0;
  const remaining = held - quantity;
  if (remaining > 0) {
    state.cargo[good.id] = remaining;
    if (basis.known) {
      state.accounts.cargoCostBasis[good.id] = roundLedgerMoney(basis.total - deliveredCost);
    }
  } else {
    delete state.cargo[good.id];
    delete state.accounts.cargoCostBasis[good.id];
  }
  recordDecision(state, `quest.deliver.${questId}.${good.id}`, quantity);
  recordLedgerEntry(state, city, context, {
    kind: "quest",
    description: `Deliver ${good.label} x${quantity}`,
    goodId: good.id,
    quantity,
    amount: 0,
    costBasis: deliveredCost,
    pnl: null
  });
  return { good, quantity, costBasis: deliveredCost };
}

export function shipItemRows(state) {
  assertGameState(state);
  return SHIP_ITEM_CATALOG
    .map((item) => {
      if (item.id === SHIP_ITEM_FISHING_NET) return fishingNetItemRow(state);
      if (item.id === SHIP_ITEM_CANNON_EQUIPMENT) return cannonEquipmentItemRow(state);
      return { ...item, quantity: state.inventory.items[item.id] || 0 };
    })
    .filter((item) => item.quantity > 0);
}

export function hasShipItem(state, itemId) {
  assertGameState(state);
  if (typeof itemId !== "string" || itemId.trim() === "") throw new Error(`Invalid ship item id: ${itemId}`);
  if (itemId === SHIP_ITEM_FISHING_NET) return Boolean(state.inventory.fishingNetId);
  if (itemId === SHIP_ITEM_CANNON_EQUIPMENT) return Boolean(state.inventory.cannonEquipmentId);
  return (state.inventory.items[itemId] || 0) > 0;
}

export function playerFishingNet(state) {
  assertGameState(state);
  return fishingNetById(state.inventory.fishingNetId);
}

export function purchaseFishingNet(state, economy, city, netId, context = {}) {
  assertGameState(state);
  const current = playerFishingNet(state);
  const next = fishingNetById(netId);
  if (next.tier <= current.tier) {
    throw new Error(`${next.label} is not an upgrade over ${current.label}`);
  }
  if (state.doubloons < next.price) {
    throw new Error(`Not enough doubloons to buy ${next.label}`);
  }
  if (!equipmentAvailableAtPort(economy, city, EQUIPMENT_STOCK_FISHING_NET, next)) {
    throw new Error(`${next.label} is not stocked at ${cityLabel(city)}`);
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

export function playerCannonEquipment(state) {
  assertGameState(state);
  return cannonEquipmentById(state.inventory.cannonEquipmentId);
}

export function purchaseCannonEquipment(state, economy, city, equipmentId, context = {}) {
  assertGameState(state);
  if (!state.ship || state.ship.cannonCapacity <= 0) {
    throw new Error("Cannon equipment requires a cannon-armed ship");
  }
  const current = playerCannonEquipment(state);
  const next = cannonEquipmentById(equipmentId);
  if (next.tier <= current.tier) {
    throw new Error(`${next.label} is not an upgrade over ${current.label}`);
  }
  if (state.doubloons < next.price) {
    throw new Error(`Not enough doubloons to buy ${next.label}`);
  }
  if (!equipmentAvailableAtPort(economy, city, EQUIPMENT_STOCK_CANNON, next)) {
    throw new Error(`${next.label} is not stocked at ${cityLabel(city)}`);
  }
  state.doubloons -= next.price;
  state.inventory.cannonEquipmentId = next.id;
  recordLedgerEntry(state, city, context, {
    kind: "equipment",
    description: `Buy ${next.label}`,
    goodId: null,
    quantity: 1,
    amount: -next.price,
    costBasis: next.price,
    pnl: null
  });
  return { previous: current, equipment: next, price: next.price };
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

export function mingTradeOpenToFaction(state, factionId) {
  if (!state || typeof state !== "object") throw new Error("Missing game state");
  assertMingOpenTradeFactionIds(state.relations?.mingOpenTradeFactionIds);
  const id = assertFactionId(factionId);
  if (id === MING_FACTION_ID) return true;
  return state.relations.mingOpenTradeFactionIds.includes(id);
}

export function openMingTradeToFaction(state, factionId) {
  assertGameState(state);
  const id = assertFactionId(factionId);
  if (id === MING_FACTION_ID || id === NEUTRAL_FACTION_ID || id === PIRATE_FACTION_ID) {
    throw new Error(`Ming foreign trade cannot be opened to faction: ${id}`);
  }
  if (state.relations.mingOpenTradeFactionIds.includes(id)) return false;
  state.relations.mingOpenTradeFactionIds.push(id);
  state.relations.mingOpenTradeFactionIds.sort();
  recordDecision(state, `diplomacy.ming-open-trade.${id}`, 1);
  return true;
}

export function isEnvoyQuest(quest) {
  return Boolean(quest && ENVOY_QUEST_KINDS.has(quest.kind));
}

export function negotiateEnvoyQuest(state, city, context = {}) {
  assertGameState(state);
  const quests = questMemory(state);
  const active = quests.active;
  if (!isEnvoyQuest(active)) throw new Error("No active envoy mission to negotiate");
  if (active.stage !== "outbound") throw new Error(`Envoy mission is not outbound: ${active.stage}`);
  if (active.targetTileId !== city?.tileId || active.destinationTileId !== city?.tileId) {
    throw new Error(`Envoy negotiations belong in ${active.targetName}, not ${cityLabel(city)}`);
  }
  assertSimulationMinute(context.simMinute);
  const direction = active.kind === "friendly-envoy" ? "improve" : "worsen";
  const events = adjustDiplomaticStance(
    state.relations.diplomacy,
    active.originFactionId,
    active.targetFactionId,
    direction,
    context.simMinute,
    { homeFactionId: state.playerCharacter?.nationalityId || null }
  );
  const targetReputationDelta = active.kind === "friendly-envoy"
    ? ENVOY_TARGET_FRIENDLY_REPUTATION
    : ENVOY_TARGET_HOSTILE_REPUTATION;
  adjustFactionReputation(state, active.targetFactionId, targetReputationDelta);
  const mingTradeOpenedFactionId = active.kind === "friendly-envoy"
    ? mingTradeOpeningFactionId(state, active)
    : null;
  const mingTradeOpened = mingTradeOpenedFactionId
    ? openMingTradeToFaction(state, mingTradeOpenedFactionId)
    : false;
  recordDecision(state, `quest.envoy.negotiate.${active.id}`, 1);
  active.stage = "return";
  active.negotiatedAtMinute = context.simMinute;
  active.destinationKey = active.originKey;
  active.destinationTileId = active.originTileId;
  active.destinationName = active.originName;
  active.destinationCountry = active.originCountry;
  return { quest: active, events, targetReputationDelta, mingTradeOpened, mingTradeOpenedFactionId };
}

function mingTradeOpeningFactionId(state, quest) {
  const playerFactionId = state.playerCharacter?.nationalityId || null;
  if (!playerFactionId || mingTradeOpenToFaction(state, playerFactionId)) return null;
  const pair = new Set([quest.originFactionId, quest.targetFactionId]);
  return pair.has(MING_FACTION_ID) && pair.has(playerFactionId) ? playerFactionId : null;
}

export function grantEnvoySafePassage(state, factionId, simMinute) {
  assertGameState(state);
  assertSimulationMinute(simMinute);
  const id = assertFactionId(factionId);
  const active = questMemory(state).active;
  if (!isEnvoyQuest(active)) return null;
  if (id !== active.originFactionId && id !== active.targetFactionId) return null;
  if (!active.envoySafePassageUntilMinute || typeof active.envoySafePassageUntilMinute !== "object") {
    active.envoySafePassageUntilMinute = {};
  }
  const previousUntilMinute = active.envoySafePassageUntilMinute[id] || 0;
  const untilMinute = Math.max(previousUntilMinute, simMinute + ENVOY_SAFE_PASSAGE_MINUTES);
  active.envoySafePassageUntilMinute[id] = untilMinute;
  recordDecision(state, `quest.envoy.safe-passage.${active.id}.${id}`, 1);
  return {
    quest: active,
    factionId: id,
    untilMinute,
    days: ENVOY_SAFE_PASSAGE_DAYS,
    message: active.dialogue?.intercession ||
      "Hold your fire! This vessel carries an accredited envoy on a diplomatic mission."
  };
}

export function activeEnvoySafePassageIds(state, simMinute) {
  assertGameState(state);
  assertSimulationMinute(simMinute);
  const active = questMemory(state).active;
  if (!isEnvoyQuest(active)) return [];
  const passage = active.envoySafePassageUntilMinute;
  if (!passage || typeof passage !== "object") return [];
  return Object.entries(passage)
    .filter(([, untilMinute]) => Number.isFinite(untilMinute) && untilMinute > simMinute)
    .map(([factionId]) => assertFactionId(factionId));
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

export function portEntryStatus(state, city, simMinute = 0) {
  assertGameState(state);
  assertSimulationMinute(simMinute);
  const factionId = city?.factionId || null;
  if (!factionId || factionId === NEUTRAL_FACTION_ID) {
    return {
      allowed: true,
      hostile: false,
      factionId,
      hostileByWar: false,
      hostileByStance: false,
      hostileByStanding: false,
      safePassage: false,
      locked: false,
      lockUntilMinute: null,
      lockDaysRemaining: 0,
      canAttemptDisguise: false
    };
  }
  assertFactionId(factionId);
  const playerFactionId = state.playerCharacter?.nationalityId || null;
  const relation = playerFactionId && playerFactionId !== factionId
    ? worldDiplomacyBetween(state.relations.diplomacy, playerFactionId, factionId)
    : null;
  const hostileByWar = Boolean(
    factionId !== PIRATE_FACTION_ID &&
    relation === DIPLOMACY_WAR
  );
  const hostileByStance = factionId !== PIRATE_FACTION_ID && relation === DIPLOMACY_HOSTILE;
  const diplomaticPassage = activeEnvoySafePassageIds(state, simMinute).includes(factionId);
  const safePassage = diplomaticPassage ||
    (!playerShipIsWarship(state) && factionSafePassageStatus(state, factionId, simMinute).active);
  const hostileByStanding = factionReputation(state, factionId) <= HOSTILE_PORT_REPUTATION_THRESHOLD;
  const hostile = ((hostileByWar || hostileByStance) && !safePassage) || hostileByStanding;
  const memory = portMemory(state, city);
  const storedLock = Number.isFinite(memory.disguiseLockUntilMinute)
    ? memory.disguiseLockUntilMinute
    : null;
  const locked = hostile && storedLock !== null && storedLock > simMinute;
  return {
    allowed: !hostile,
    hostile,
    factionId,
    hostileByWar,
    hostileByStance,
    hostileByStanding,
    safePassage,
    locked,
    lockUntilMinute: locked ? storedLock : null,
    lockDaysRemaining: locked ? Math.ceil((storedLock - simMinute) / MINUTES_PER_DAY) : 0,
    canAttemptDisguise: hostile && !locked
  };
}

export function playerShipIsWarship(state) {
  if (!state?.ship) return false;
  const ship = state.ship;
  assertPlayerShipState(ship);
  return ship.cannons >= 8 ||
    (ship.cannonCapacity >= 16 && ship.cannons >= 4) ||
    (ship.navalWeaponKind === NAVAL_WEAPON_ARROW && ship.mass >= 100);
}

export function factionSafePassageToll(state) {
  assertGameState(state);
  if (playerShipIsWarship(state)) throw new Error("Warships cannot purchase civilian safe passage");
  return Math.ceil((20 + state.cargoCapacity / 4 + state.ship.cannons * 2) / 5) * 5;
}

export function factionSafePassageStatus(state, factionId, simMinute) {
  assertGameState(state);
  assertSimulationMinute(simMinute);
  const id = assertFactionId(factionId);
  const untilMinute = state.relations.safePassageUntilMinute[id] || 0;
  if (!Number.isFinite(untilMinute) || untilMinute < 0) {
    throw new Error(`Invalid safe passage expiry for ${id}: ${untilMinute}`);
  }
  const active = untilMinute > simMinute;
  return {
    factionId: id,
    active,
    untilMinute: active ? untilMinute : null,
    daysRemaining: active ? Math.ceil((untilMinute - simMinute) / MINUTES_PER_DAY) : 0
  };
}

export function factionSafePassageRefusalStatus(state, factionId, simMinute) {
  assertGameState(state);
  assertSimulationMinute(simMinute);
  const id = assertFactionId(factionId);
  const untilMinute = state.relations.safePassageRefusalUntilMinute[id] || 0;
  if (!Number.isFinite(untilMinute) || untilMinute < 0) {
    throw new Error(`Invalid safe passage refusal expiry for ${id}: ${untilMinute}`);
  }
  const active = untilMinute > simMinute;
  return {
    factionId: id,
    active,
    untilMinute: active ? untilMinute : null,
    daysRemaining: active ? Math.ceil((untilMinute - simMinute) / MINUTES_PER_DAY) : 0
  };
}

export function refuseFactionSafePassage(state, factionId, simMinute) {
  assertGameState(state);
  assertSimulationMinute(simMinute);
  const id = assertFactionId(factionId);
  if (id === NEUTRAL_FACTION_ID || id === PIRATE_FACTION_ID) {
    throw new Error(`Faction cannot demand safe passage: ${id}`);
  }
  const playerFactionId = state.playerCharacter?.nationalityId || null;
  const relation = playerFactionId ? diplomacyBetweenForState(state, playerFactionId, id) : null;
  if (relation !== DIPLOMACY_HOSTILE && relation !== DIPLOMACY_WAR) {
    throw new Error(`${id} has no reason to demand a passage toll`);
  }
  const untilMinute = simMinute + FACTION_SAFE_PASSAGE_REFUSAL_MINUTES;
  state.relations.safePassageRefusalUntilMinute[id] = untilMinute;
  return { factionId: id, untilMinute, days: FACTION_SAFE_PASSAGE_REFUSAL_DAYS };
}

export function activeFactionSafePassageIds(state, simMinute) {
  assertGameState(state);
  assertSimulationMinute(simMinute);
  const ids = new Set(activeEnvoySafePassageIds(state, simMinute));
  if (!playerShipIsWarship(state)) {
    for (const [factionId, untilMinute] of Object.entries(state.relations.safePassageUntilMinute)) {
      if (untilMinute > simMinute) ids.add(assertFactionId(factionId));
    }
  }
  return [...ids];
}

export function purchaseFactionSafePassage(state, city, simMinute) {
  assertGameState(state);
  assertSimulationMinute(simMinute);
  const factionId = assertFactionId(city?.factionId);
  if (factionId === NEUTRAL_FACTION_ID || factionId === PIRATE_FACTION_ID) {
    throw new Error(`Faction does not issue safe passage: ${factionId}`);
  }
  if (playerShipIsWarship(state)) throw new Error("Warships cannot purchase civilian safe passage");
  const playerFactionId = state.playerCharacter?.nationalityId || null;
  const relation = playerFactionId ? diplomacyBetweenForState(state, playerFactionId, factionId) : null;
  if (relation !== DIPLOMACY_HOSTILE && relation !== DIPLOMACY_WAR) {
    throw new Error(`${cityLabel(city)} has no reason to demand a passage toll`);
  }
  const toll = factionSafePassageToll(state);
  if (state.doubloons < toll) throw new Error(`Not enough doubloons for ${factionId} safe passage`);
  state.doubloons -= toll;
  const untilMinute = simMinute + FACTION_SAFE_PASSAGE_MINUTES;
  state.relations.safePassageUntilMinute[factionId] = untilMinute;
  delete state.relations.safePassageRefusalUntilMinute[factionId];
  recordLedgerEntry(state, city, { simMinute }, {
    kind: "expense",
    description: `${cityLabel(city)} passage toll`,
    goodId: null,
    quantity: 1,
    amount: -toll,
    costBasis: null,
    pnl: null
  });
  return { factionId, toll, untilMinute, days: FACTION_SAFE_PASSAGE_DAYS };
}

export function attemptPortDisguise(state, city, simMinute, roll) {
  assertGameState(state);
  assertSimulationMinute(simMinute);
  if (!Number.isFinite(roll) || roll < 0 || roll >= 1) {
    throw new Error(`Invalid port disguise roll: ${roll}`);
  }
  const status = portEntryStatus(state, city, simMinute);
  if (!status.hostile) throw new Error(`${cityLabel(city)} is not barring the player`);
  if (status.locked) {
    return { attempted: false, success: false, ...status };
  }

  const memory = portMemory(state, city);
  memory.disguiseAttempts = (memory.disguiseAttempts || 0) + 1;
  memory.lastDisguiseAttemptMinute = simMinute;
  if (roll < PORT_DISGUISE_SUCCESS_CHANCE) {
    return {
      attempted: true,
      success: true,
      locked: false,
      lockUntilMinute: null,
      lockDaysRemaining: 0
    };
  }

  const lockUntilMinute = simMinute + PORT_DISGUISE_LOCK_MINUTES;
  memory.disguiseLockUntilMinute = lockUntilMinute;
  return {
    attempted: true,
    success: false,
    locked: true,
    lockUntilMinute,
    lockDaysRemaining: PORT_DISGUISE_LOCK_DAYS
  };
}

export function recordTradeWithFaction(state, factionId) {
  assertGameState(state);
  const id = assertFactionId(factionId);
  if (id === NEUTRAL_FACTION_ID) return factionReputation(state, id);
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
  const pirateBefore = factionReputation(state, PIRATE_FACTION_ID);
  const pirateAfter = adjustFactionReputation(state, PIRATE_FACTION_ID, PIRATE_REPUTATION_GAIN_PER_PIRACY);
  if (pirateAfter !== pirateBefore) {
    changes[PIRATE_FACTION_ID] = { before: pirateBefore, after: pirateAfter };
  }
  if (Object.keys(changes).length > 0) recordDecision(state, `reputation.piracy.${victimId}`, 1);
  return changes;
}

export function pirateHideoutsVisibleToPlayer(state) {
  return factionReputation(state, PIRATE_FACTION_ID) >= PIRATE_HIDEOUT_REPUTATION_REQUIRED;
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
    if (worldDiplomacyBetween(state.relations.diplomacy, issuerId, targetId) === DIPLOMACY_WAR) return true;
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
  assertPlayerTradeAccess(state, city, context);
  const row = marketRow(economy, city, goodId);
  const tradeFactionId = tradeReputationFactionId(city);
  if (row.stock < quantity) throw new Error(`${cityLabel(city)} has only ${row.stock} ${row.good.label}`);
  const purchaseMultiplier = portPurchasePriceMultiplier(city);
  const total = quotePortSale(economy, city, goodId, quantity, purchaseMultiplier);
  if (state.doubloons < total) {
    throw new Error(`Not enough doubloons to buy ${quantity} ${row.good.label}`);
  }
  const availableCargo = cargoFreeForGood(state, row.good.id);
  if (availableCargo < row.good.unitSize * quantity) {
    throw new Error(`Not enough cargo space to buy ${quantity} ${row.good.label}`);
  }
  executePortSale(economy, city, goodId, quantity, purchaseMultiplier);
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

function portPurchasePriceMultiplier(city) {
  const multiplier = city?.purchaseDiscountMultiplier ?? 1;
  if (!Number.isFinite(multiplier) || multiplier <= 0 || multiplier > 1) {
    throw new Error(`Invalid purchase discount at ${cityLabel(city)}: ${multiplier}`);
  }
  return multiplier;
}

export function sellGood(state, economy, city, goodId, quantity = 1, context = {}) {
  assertGameState(state);
  assertQuantity(quantity, "sell quantity");
  assertPlayerTradeAccess(state, city, context);
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

function assertPlayerTradeAccess(state, city, context) {
  const access = mingTradeAccess({
    portFactionId: city?.factionId || NEUTRAL_FACTION_ID,
    traderFactionId: state.playerCharacter?.nationalityId || NEUTRAL_FACTION_ID,
    simMinute: context.simMinute ?? 0,
    openTrade: mingTradeOpenToFaction(
      state,
      state.playerCharacter?.nationalityId || NEUTRAL_FACTION_ID
    ),
    illicitAccess: context.mingIllicitTradeAccess === true,
    disguisedEntry: context.disguisedEntry === true
  });
  if (!access.allowed) {
    throw new Error(`${cityLabel(city)} market is closed to foreign trade under the Ming maritime prohibition`);
  }
  return access;
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

export function visitPort(state, city, simMinute) {
  assertGameState(state);
  assertSimulationMinute(simMinute);
  const memory = portMemory(state, city);
  memory.visits += 1;
  const playerFactionId = state.playerCharacter?.nationalityId || NEUTRAL_FACTION_ID;
  return recordDiplomaticPortCall(
    state.relations.diplomacy,
    playerFactionId,
    city.factionId || NEUTRAL_FACTION_ID,
    simMinute
  );
}

export function portMemory(state, city) {
  assertGameState(state);
  const key = city.portId || cityKey(city);
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
    originKey: cityKey(city),
    originTileId: city.tileId,
    originName: cityLabel(city),
    originCountry: city.country || "",
    factionId,
    regionKey,
    destinationKey: cityKey(destination),
    destinationTileId: destination.tileId,
    destinationName: cityLabel(destination),
    destinationCountry: destination.country || "",
    distanceKm: Math.round(greatCircleDistanceKm(city, destination)),
    reward
  };
}

export function reconcileQuestPortTiles(state, portCities) {
  assertGameState(state);
  if (!Array.isArray(portCities)) throw new Error("Quest port reconciliation requires a port list");
  const quests = questMemory(state);
  let updates = 0;

  const reconcile = (quest) => {
    if (!quest || typeof quest !== "object") return;
    updates += reconcileQuestEndpoint(quest, "origin", portCities);
    updates += reconcileQuestEndpoint(quest, "destination", portCities);
    if (isEnvoyQuest(quest)) updates += reconcileQuestEndpoint(quest, "target", portCities);
  };

  reconcile(quests.active);
  const offers = {};
  for (const [storedKey, offer] of Object.entries(quests.passengerOffers)) {
    reconcile(offer);
    offers[offer?.originKey || storedKey] = offer;
  }
  quests.passengerOffers = offers;
  return updates;
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
  if ((quest.kind === "passenger" || isEnvoyQuest(quest)) && quest.originKey) {
    delete quests.passengerOffers[quest.originKey];
  }
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
  if (isEnvoyQuest(active) && active.stage !== "return") {
    throw new Error(`Envoy must complete negotiations before returning home: ${active.id}`);
  }
  state.doubloons += active.reward;
  quests.completed[active.id] = true;
  quests.active = null;
  recordDecision(state, `quest.complete.${active.id}`, 1);
  if (active.kind === "delivery" && active.factionId) recordDeliveryForFaction(state, active.factionId);
  if (isEnvoyQuest(active)) {
    adjustFactionReputation(state, active.originFactionId, ENVOY_HOME_REPUTATION);
    recordDecision(state, `reputation.envoy.${active.originFactionId}`, 1);
  }
  recordLedgerEntry(state, city, context, {
    kind: "income",
    description: active.kind === "passenger"
      ? "Passenger fare"
      : isEnvoyQuest(active)
        ? "Diplomatic mission"
        : "Delivery reward",
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
  return city.portAlias || city.displayCity || city.city;
}

function createPlayerShipState(stats) {
  return {
    loadoutId: null,
    loadoutTargets: null,
    crew: 0,
    crewCapacity: stats.crewCapacity,
    cannons: 0,
    cannonCapacity: stats.cannons,
    mass: stats.mass,
    navalWeaponKind: stats.navalWeaponKind
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

function restockLoadoutKind(state, plan, kind) {
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
  } else {
    throw new Error(`Unknown loadout restock kind: ${kind}`);
  }
  return { spent, quantity };
}

function restockBalancedProvisions(state, plan, hardtack) {
  if (hardtack.unitSize !== 1) {
    throw new Error(`Ship loadouts require one-slot hardtack units, received ${hardtack.unitSize}`);
  }
  const targets = loadoutRestockProvisionTargets(state, plan);
  let spent = 0;
  const additions = { food: 0, water: 0 };
  while (
    provisionFoodUnits(state) < targets.food &&
    Math.ceil(state.survival.freshWater) > targets.water &&
    provisionCargoFree(state, "food") < hardtack.unitSize &&
    state.doubloons >= hardtack.basePrice
  ) {
    state.survival.freshWater = Math.min(
      state.survival.freshWater,
      Math.ceil(state.survival.freshWater) - 1
    );
    spent += restockHardtackUnit(state, hardtack);
    additions.food += 1;
  }

  while (true) {
    const currentFood = provisionFoodUnits(state);
    const currentWater = Math.ceil(state.survival.freshWater);
    const needsFood = currentFood < targets.food;
    const needsWater = state.survival.freshWater < targets.water;
    if (!needsFood && !needsWater) break;

    const preferred = needsWater && (!needsFood || currentWater <= currentFood) ? "water" : "food";
    const order = preferred === "water" ? ["water", "food"] : ["food", "water"];
    let changed = false;
    for (const kind of order) {
      if (kind === "food" && needsFood && state.doubloons >= hardtack.basePrice &&
          provisionCargoFree(state, "food") >= hardtack.unitSize) {
        spent += restockHardtackUnit(state, hardtack);
        additions.food += 1;
        changed = true;
        break;
      }
      if (kind === "water" && needsWater && state.doubloons >= WATER_RESTOCK_COST) {
        const added = Math.min(1, targets.water - state.survival.freshWater);
        const space = Math.ceil(state.survival.freshWater + added) - Math.ceil(state.survival.freshWater);
        if (provisionCargoFree(state, "water") < space) continue;
        state.survival.freshWater += added;
        state.doubloons -= WATER_RESTOCK_COST;
        spent += WATER_RESTOCK_COST;
        additions.water += added;
        changed = true;
        break;
      }
    }
    if (!changed) break;
  }
  return { spent, ...additions };
}

function restockHardtackUnit(state, hardtack) {
  state.cargo[HARDTACK_GOOD_ID] = (state.cargo[HARDTACK_GOOD_ID] || 0) + 1;
  state.accounts.cargoCostBasis[HARDTACK_GOOD_ID] = roundLedgerMoney(
    (state.accounts.cargoCostBasis[HARDTACK_GOOD_ID] || 0) + hardtack.basePrice
  );
  state.doubloons -= hardtack.basePrice;
  return hardtack.basePrice;
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
    food: provisionFoodUnits(state),
    water: state.survival.freshWater
  };
}

function loadoutShortfalls(state, plan) {
  const targets = loadoutRestockProvisionTargets(state, plan);
  return {
    crew: Math.max(0, plan.crew - state.ship.crew),
    cannons: Math.max(0, plan.cannons - state.ship.cannons),
    food: Math.max(0, targets.food - provisionFoodUnits(state)),
    water: Math.max(0, targets.water - state.survival.freshWater)
  };
}

function loadoutRestockProvisionTargets(state, plan) {
  const allocation = loadoutProvisionAllocation(state, plan);
  const protectedFood = Math.max(
    allocation.foodUnits,
    Math.min(provisionFoodUnits(state), allocation.availableSpace)
  );
  return {
    food: protectedFood,
    water: Math.min(allocation.waterUnits, Math.max(0, allocation.availableSpace - protectedFood))
  };
}

function provisionCargoFree(state, kind) {
  if (kind !== "food" && kind !== "water") {
    throw new Error(`Unknown provision cargo kind: ${kind}`);
  }
  const reservation = loadoutProvisionReservation(state);
  const reserved = kind === "food" ? reservation.missingFood : reservation.missingWater;
  return Math.max(0, cargoFree(state) + reserved);
}

function loadoutProvisionReservation(state) {
  const plan = state.ship?.loadoutTargets;
  if (!plan) return { missingFood: 0, missingWater: 0 };
  const allocation = loadoutProvisionAllocation(state, plan);
  return {
    missingFood: Math.max(0, allocation.foodUnits - provisionFoodUnits(state)),
    missingWater: Math.max(0, allocation.waterUnits - Math.ceil(state.survival.freshWater))
  };
}

function loadoutProvisionAllocation(state, plan) {
  for (const key of ["foodUnits", "waterUnits", "storesSpace"]) {
    if (!Number.isInteger(plan?.[key]) || plan[key] < 0) {
      throw new Error(`Invalid ship loadout provision target ${key}: ${plan?.[key]}`);
    }
  }
  if (plan.storesSpace !== plan.foodUnits + plan.waterUnits) {
    throw new Error("Ship loadout provision targets do not match their reserved store space");
  }
  const actualProvisionSpace = provisionFoodUnits(state) + Math.ceil(state.survival.freshWater);
  const provisionSpaceAlreadyAboard = Math.min(actualProvisionSpace, plan.storesSpace);
  const nonProvisionSpace = cargoUsed(state) - provisionSpaceAlreadyAboard;
  const availableSpace = Math.max(
    0,
    Math.min(plan.storesSpace, state.cargoCapacity - nonProvisionSpace)
  );
  return {
    ...balancedProvisionTargets(plan.foodUnits, plan.waterUnits, availableSpace),
    availableSpace
  };
}

function provisionFoodUnits(state) {
  return edibleCargoRows(state).reduce((total, row) => total + row.good.unitSize * row.quantity, 0);
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
    if (diplomacyBetween(homeFactionId, faction.id) === DIPLOMACY_HOSTILE) {
      return [faction.id, ENEMY_FACTION_START_REPUTATION / 2];
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

function reconcileQuestEndpoint(quest, endpoint, portCities) {
  const tileField = `${endpoint}TileId`;
  const nameField = `${endpoint}Name`;
  const countryField = `${endpoint}Country`;
  const keyField = `${endpoint}Key`;
  const name = quest[nameField];
  if (typeof name !== "string" || name === "") return 0;

  const current = portCities.find((port) => (
    port.tileId === quest[tileField] && cityLabel(port) === name
  ));
  if (current) {
    updateQuestEndpointIdentity(quest, endpoint, current);
    return 0;
  }

  const keyCountry = quest[keyField]?.split("|")[1] || "";
  const country = quest[countryField] || keyCountry;
  let candidates = portCities.filter((port) => cityLabel(port) === name);
  if (country) candidates = candidates.filter((port) => port.country === country);
  if (quest.kind === "delivery" && quest.factionId) {
    candidates = candidates.filter((port) => port.factionId === quest.factionId);
  }
  if (quest.kind === "delivery" && quest.regionKey) {
    candidates = candidates.filter((port) => deliveryRegionKey(port) === quest.regionKey);
  }
  if (candidates.length !== 1) return 0;
  updateQuestEndpointIdentity(quest, endpoint, candidates[0]);
  return 1;
}

function updateQuestEndpointIdentity(quest, endpoint, port) {
  quest[`${endpoint}TileId`] = port.tileId;
  quest[`${endpoint}Name`] = cityLabel(port);
  quest[`${endpoint}Country`] = port.country || "";
  quest[`${endpoint}Key`] = cityKey(port);
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

function emergencyShipAidKey(npcShipId) {
  return `ship.aid.${npcShipId}`;
}

function assertNpcShipId(npcShipId) {
  if (typeof npcShipId !== "string" || npcShipId.trim() === "") {
    throw new Error(`Invalid emergency-aid ship id: ${npcShipId}`);
  }
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

function cannonEquipmentItemRow(state) {
  const equipment = cannonEquipmentById(state.inventory.cannonEquipmentId);
  return {
    id: SHIP_ITEM_CANNON_EQUIPMENT,
    label: equipment.label,
    detail: `Reload ${equipment.reloadSeconds.toFixed(2)}s, damage x${equipment.damageMultiplier.toFixed(2)}, range x${equipment.rangeMultiplier.toFixed(2)}`,
    quantity: 1,
    equipmentId: equipment.id
  };
}

function assertGameState(state) {
  if (!state || typeof state !== "object") throw new Error("Missing game state");
  if (!Number.isFinite(state.activePlaySeconds) || state.activePlaySeconds < 0) {
    throw new Error(`Invalid active play time: ${state.activePlaySeconds}`);
  }
  if (state.playerCharacter !== null) assertPlayerCharacter(state.playerCharacter);
  assertCargoCapacity(state.cargoCapacity);
  if (!Number.isInteger(state.doubloons) || state.doubloons < 0) {
    throw new Error(`Invalid doubloon balance: ${state.doubloons}`);
  }
  if (!state.cargo || typeof state.cargo !== "object") throw new Error("Game state cargo must be an object");
  ensureSurvivalState(state);
  if (state.ship !== null && state.ship !== undefined) assertPlayerShipState(state.ship);
  if (!state.inventory || typeof state.inventory !== "object") throw new Error("Game state inventory must be an object");
  if (!state.inventory.items || typeof state.inventory.items !== "object") {
    throw new Error("Game state inventory items must be an object");
  }
  if (typeof state.inventory.fishingNetId !== "string") throw new Error("Game state requires fishing net equipment");
  fishingNetById(state.inventory.fishingNetId);
  if (typeof state.inventory.cannonEquipmentId !== "string") {
    throw new Error("Game state requires cannon equipment");
  }
  cannonEquipmentById(state.inventory.cannonEquipmentId);
  if (!state.accounts || typeof state.accounts !== "object") throw new Error("Game state accounts must be an object");
  if (!state.accounts.cargoCostBasis || typeof state.accounts.cargoCostBasis !== "object") {
    throw new Error("Game state cargo cost basis must be an object");
  }
  assertFactionReputationTable(state.relations?.factionReputation);
  assertMingOpenTradeFactionIds(state.relations?.mingOpenTradeFactionIds);
  assertLettersOfMarqueTable(state.relations?.lettersOfMarque);
  assertSafePassageTable(state.relations?.safePassageUntilMinute);
  assertSafePassageRefusalTable(state.relations?.safePassageRefusalUntilMinute);
  assertWorldDiplomacyState(state);
  if (!Number.isFinite(state.accounts.realizedPnl)) throw new Error("Invalid realized trade P/L");
  if (!Array.isArray(state.accounts.ledger)) throw new Error("Game state ledger must be an array");
  if (!Number.isInteger(state.accounts.nextEntryId) || state.accounts.nextEntryId <= 0) {
    throw new Error(`Invalid next ledger entry id: ${state.accounts.nextEntryId}`);
  }
  if (!state.memory || typeof state.memory !== "object") throw new Error("Game state memory must be an object");
  assertCargoReservations(state.memory.cargoReservations);
  validateColonizationQuestMemory(state.memory.colonization);
  validatePortConquestMemory(state.memory.conquest);
  if (state.memory.campaignGoal === null) {
    if (playerCharacterSupportsCampaignGoal(state.playerCharacter)) {
      throw new Error("Persistent player character requires a campaign goal");
    }
  } else {
    validateCampaignGoal(state.memory.campaignGoal);
    if (state.memory.campaignGoal.homePortTileId !== state.playerCharacter?.homePortTileId) {
      throw new Error("Campaign goal home port does not match the player character");
    }
  }
  validateCartographyMemory(state.memory.cartography);
  if (!state.memory.discoveries || typeof state.memory.discoveries !== "object") {
    throw new Error("Game state discoveries must be an object");
  }
  if (!Array.isArray(state.memory.discoveryOrder)) {
    throw new Error("Game state discovery order must be an array");
  }
  if (!Array.isArray(state.memory.pendingDiscoveryPortDialogueIds)) {
    state.memory.pendingDiscoveryPortDialogueIds = [];
  }
  if (state.memory.pendingDiscoveryPortDialogueIds.some((id) => typeof id !== "string" || id === "")) {
    throw new Error("Pending discovery port dialogue ids must be non-empty strings");
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

function assertCargoReservations(reservations) {
  if (!reservations || typeof reservations !== "object" || Array.isArray(reservations)) {
    throw new Error("Game state cargo reservations must be an object");
  }
  for (const [reservationId, units] of Object.entries(reservations)) {
    assertCargoReservationId(reservationId);
    if (!Number.isInteger(units) || units <= 0) {
      throw new Error(`Invalid cargo reservation ${reservationId}: ${units}`);
    }
  }
}

function assertCargoReservationId(reservationId) {
  if (typeof reservationId !== "string" || reservationId.trim() === "") {
    throw new Error(`Invalid cargo reservation id: ${reservationId}`);
  }
}

function assertPlayerShipState(ship) {
  if (!ship || typeof ship !== "object") throw new Error("Invalid player ship state");
  for (const key of ["crew", "crewCapacity", "cannons", "cannonCapacity"]) {
    if (!Number.isInteger(ship[key]) || ship[key] < 0) throw new Error(`Invalid ship ${key}: ${ship[key]}`);
  }
  if (ship.crew > ship.crewCapacity) throw new Error("Player crew exceeds ship capacity");
  if (ship.cannons > ship.cannonCapacity) throw new Error("Player cannons exceed ship capacity");
  if (!Number.isInteger(ship.mass) || ship.mass <= 0) throw new Error(`Invalid ship mass: ${ship.mass}`);
  if (ship.navalWeaponKind !== null && typeof ship.navalWeaponKind !== "string") {
    throw new Error(`Invalid ship naval weapon kind: ${ship.navalWeaponKind}`);
  }
  if (ship.loadoutId !== null && typeof ship.loadoutId !== "string") {
    throw new Error(`Invalid ship loadout id: ${ship.loadoutId}`);
  }
}

function assertSafePassageTable(table) {
  if (!table || typeof table !== "object" || Array.isArray(table)) {
    throw new Error("Game state safe passage must be an object");
  }
  for (const [factionId, untilMinute] of Object.entries(table)) {
    assertFactionId(factionId);
    assertSimulationMinute(untilMinute);
  }
}

function assertSafePassageRefusalTable(table) {
  if (!table || typeof table !== "object" || Array.isArray(table)) {
    throw new Error("Game state safe passage refusals must be an object");
  }
  for (const [factionId, untilMinute] of Object.entries(table)) {
    assertFactionId(factionId);
    assertSimulationMinute(untilMinute);
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
  if (!Array.isArray(character.expressions) || character.expressions.length === 0) {
    throw new Error("Player character requires an authored portrait expression");
  }
  if (character.nationalityId !== undefined) assertFactionId(character.nationalityId);
}

function assertWorldDiplomacyState(state) {
  if (!state.relations || typeof state.relations !== "object") {
    throw new Error("Game state relations must be an object");
  }
  if (!state.relations.diplomacy) throw new Error("Game state requires world diplomacy");
  validateWorldDiplomacy(state.relations.diplomacy);
}

function savedGameStartMinute(state) {
  return Number.isFinite(state.accounts?.ledger?.[0]?.simMinute)
    ? state.accounts.ledger[0].simMinute
    : 0;
}

function createCartographyMemory() {
  return { seenTilesBase64: "", seenTileCount: 0 };
}

function validateCartographyMemory(cartography) {
  if (!cartography || typeof cartography !== "object") throw new Error("Game state requires cartography memory");
  if (typeof cartography.seenTilesBase64 !== "string") throw new Error("Invalid cartography tile mask");
  if (!Number.isInteger(cartography.seenTileCount) || cartography.seenTileCount < 0) {
    throw new Error(`Invalid mapped tile count: ${cartography.seenTileCount}`);
  }
}

function playerCharacterSupportsCampaignGoal(character) {
  if (!character) return false;
  return typeof character.id === "string" && character.id !== "" &&
    Number.isInteger(character.homePortTileId) && character.homePortTileId >= 0;
}

function worldDiplomacySeedKey(character, startMinute) {
  if (!character) return `anonymous|${startMinute}`;
  return [
    character.id || character.sourceId || "captain",
    character.name || "unknown",
    character.birthDateLabel || character.birthDate?.label || "unknown-birth",
    character.homePortName || "unknown-home",
    startMinute
  ].join("|");
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

function assertMingOpenTradeFactionIds(factionIds) {
  if (!Array.isArray(factionIds)) {
    throw new Error("Game state Ming open-trade factions must be an array");
  }
  const unique = new Set();
  for (const factionId of factionIds) {
    const id = assertFactionId(factionId);
    if (id === MING_FACTION_ID || id === NEUTRAL_FACTION_ID || id === PIRATE_FACTION_ID) {
      throw new Error(`Invalid Ming open-trade faction: ${id}`);
    }
    if (unique.has(id)) throw new Error(`Duplicate Ming open-trade faction: ${id}`);
    unique.add(id);
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
  if (discovery.portArrivalDialogue !== undefined &&
      (typeof discovery.portArrivalDialogue !== "string" || discovery.portArrivalDialogue.trim() === "")) {
    throw new Error(`Discovery ${discovery.id} has invalid port-arrival dialogue`);
  }
  if (discovery.portArrivalExpressionId !== undefined &&
      (typeof discovery.portArrivalExpressionId !== "string" || discovery.portArrivalExpressionId === "")) {
    throw new Error(`Discovery ${discovery.id} has invalid port-arrival expression`);
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
