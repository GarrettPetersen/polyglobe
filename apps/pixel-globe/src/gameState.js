import {
  TRADE_GOODS,
  executePortPurchase,
  executePortSale,
  portMarket,
  quotePortPurchase,
  quotePortSale,
  tradeGoodById
} from "./economy.js";

export const STARTING_DOUBLOONS = 360;

export function createGameState({ cargoCapacity, startMinute = 0, playerCharacter = null }) {
  assertCargoCapacity(cargoCapacity);
  assertSimulationMinute(startMinute);
  if (playerCharacter !== null) assertPlayerCharacter(playerCharacter);
  return {
    version: 3,
    playerCharacter,
    doubloons: STARTING_DOUBLOONS,
    cargoCapacity,
    cargo: {},
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
        completed: {}
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

export function cargoUsed(state) {
  assertGameState(state);
  let used = 0;
  for (const [goodId, quantity] of Object.entries(state.cargo)) {
    const good = goodById(goodId);
    assertQuantity(quantity, `cargo.${goodId}`);
    used += good.unitSize * quantity;
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

export function ledgerEntries(state) {
  assertGameState(state);
  return state.accounts.ledger.slice();
}

export function realizedTradePnl(state) {
  assertGameState(state);
  return state.accounts.realizedPnl;
}

export function buyGood(state, economy, city, goodId, quantity = 1, context = {}) {
  assertGameState(state);
  assertQuantity(quantity, "buy quantity");
  const row = marketRow(economy, city, goodId);
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
  return { good: row.good, quantity, price: total, costBasis: total };
}

export function sellGood(state, economy, city, goodId, quantity = 1, context = {}) {
  assertGameState(state);
  assertQuantity(quantity, "sell quantity");
  const row = marketRow(economy, city, goodId);
  const held = state.cargo[row.good.id] || 0;
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
  return { good: row.good, quantity, price: total, costBasis: soldCost, pnl };
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
  const candidates = portCities
    .filter((port) => port.tileId !== city.tileId)
    .sort((a, b) => cityKey(a).localeCompare(cityKey(b)));
  if (candidates.length === 0) throw new Error("Cannot create delivery quest without another port city");
  const index = hashString32(`delivery|${cityKey(city)}`) % candidates.length;
  const destination = candidates[index];
  const reward = 65 + (hashString32(`reward|${cityKey(city)}|${cityKey(destination)}`) % 96);
  return {
    id: `delivery-${city.tileId}-${destination.tileId}`,
    kind: "delivery",
    originTileId: city.tileId,
    originName: cityLabel(city),
    destinationTileId: destination.tileId,
    destinationName: cityLabel(destination),
    reward
  };
}

export function questStateForCity(state, city, portCities) {
  assertGameState(state);
  const active = state.memory.quests.active;
  if (active) {
    if (active.destinationTileId === city.tileId) return { kind: "ready-to-complete", quest: active };
    if (active.originTileId === city.tileId) return { kind: "in-progress-here", quest: active };
    return { kind: "busy", quest: active };
  }
  const quest = deliveryQuestForCity(city, portCities);
  if (state.memory.quests.completed[quest.id]) return { kind: "completed", quest };
  return { kind: "available", quest };
}

export function acceptQuest(state, quest) {
  assertGameState(state);
  if (state.memory.quests.active) throw new Error("Cannot accept a quest while another quest is active");
  if (state.memory.quests.completed[quest.id]) throw new Error(`Quest already completed: ${quest.id}`);
  state.memory.quests.active = { ...quest };
  recordDecision(state, `quest.accept.${quest.id}`, 1);
}

export function completeQuest(state, city, context = {}) {
  assertGameState(state);
  const active = state.memory.quests.active;
  if (!active) throw new Error("No active quest to complete");
  if (active.destinationTileId !== city.tileId) {
    throw new Error(`Quest destination is ${active.destinationName}, not ${cityLabel(city)}`);
  }
  state.doubloons += active.reward;
  state.memory.quests.completed[active.id] = true;
  state.memory.quests.active = null;
  recordDecision(state, `quest.complete.${active.id}`, 1);
  recordLedgerEntry(state, city, context, {
    kind: "income",
    description: "Delivery reward",
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

function marketRow(economy, city, goodId) {
  tradeGoodById(goodId);
  const row = portMarket(economy, city).find((item) => item.good.id === goodId);
  if (!row) throw new Error(`${cityLabel(city)} does not trade ${goodId}`);
  return row;
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

function assertGameState(state) {
  if (!state || typeof state !== "object") throw new Error("Missing game state");
  if (state.playerCharacter !== null) assertPlayerCharacter(state.playerCharacter);
  assertCargoCapacity(state.cargoCapacity);
  if (!Number.isInteger(state.doubloons) || state.doubloons < 0) {
    throw new Error(`Invalid doubloon balance: ${state.doubloons}`);
  }
  if (!state.cargo || typeof state.cargo !== "object") throw new Error("Game state cargo must be an object");
  if (!state.accounts || typeof state.accounts !== "object") throw new Error("Game state accounts must be an object");
  if (!state.accounts.cargoCostBasis || typeof state.accounts.cargoCostBasis !== "object") {
    throw new Error("Game state cargo cost basis must be an object");
  }
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

function assertPlayerCharacter(character) {
  if (!character || typeof character !== "object") throw new Error("Invalid player character");
  if (typeof character.name !== "string" || character.name.trim() === "") {
    throw new Error("Player character requires a name");
  }
  if (!Array.isArray(character.expressions) || character.expressions.length < 2) {
    throw new Error("Player character requires multiple expressions");
  }
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

function hashString32(value) {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
