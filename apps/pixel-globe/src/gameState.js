export const STARTING_DOUBLOONS = 360;

export const TRADE_GOODS = Object.freeze([
  good("grain", "Grain", 8),
  good("timber", "Timber", 12),
  good("salt", "Salt", 14),
  good("copper", "Copper", 28),
  good("tea", "Tea", 34),
  good("porcelain", "Porcelain", 42),
  good("silk", "Silk", 55),
  good("spices", "Spices", 64)
]);

const TRADE_GOOD_BY_ID = new Map(TRADE_GOODS.map((item) => [item.id, item]));

function good(id, label, basePrice) {
  return Object.freeze({ id, label, basePrice, unitSize: 1 });
}

export function createGameState({ cargoCapacity }) {
  assertCargoCapacity(cargoCapacity);
  return {
    version: 1,
    doubloons: STARTING_DOUBLOONS,
    cargoCapacity,
    cargo: {},
    memory: {
      visitedPorts: {},
      decisions: {},
      flags: {},
      quests: {
        active: null,
        completed: {}
      }
    }
  };
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

export function portMarket(city) {
  const seed = hashString32(cityKey(city));
  const market = TRADE_GOODS.map((good, index) => {
    const priceRoll = hashString32(`${cityKey(city)}|${good.id}|price`);
    const supplyRoll = hashString32(`${cityKey(city)}|${good.id}|supply`);
    const multiplier = 0.72 + ((priceRoll & 0xffff) / 0xffff) * 0.74;
    const buyPrice = Math.max(1, Math.round(good.basePrice * multiplier));
    const sellPrice = Math.max(1, Math.floor(buyPrice * (0.58 + ((supplyRoll & 0xff) / 255) * 0.2)));
    return {
      good,
      buyPrice,
      sellPrice,
      rank: hashString32(`${seed}|${index}|${good.id}`)
    };
  }).sort((a, b) => a.rank - b.rank);
  return market.slice(0, 5).sort((a, b) => a.good.label.localeCompare(b.good.label));
}

export function buyGood(state, city, goodId, quantity = 1) {
  assertGameState(state);
  assertQuantity(quantity, "buy quantity");
  const row = marketRow(city, goodId);
  const total = row.buyPrice * quantity;
  if (state.doubloons < total) {
    throw new Error(`Not enough doubloons to buy ${quantity} ${row.good.label}`);
  }
  if (cargoFree(state) < row.good.unitSize * quantity) {
    throw new Error(`Not enough cargo space to buy ${quantity} ${row.good.label}`);
  }
  state.doubloons -= total;
  state.cargo[row.good.id] = (state.cargo[row.good.id] || 0) + quantity;
  recordDecision(state, `trade.buy.${cityKey(city)}.${row.good.id}`, quantity);
  return { good: row.good, quantity, price: total };
}

export function sellGood(state, city, goodId, quantity = 1) {
  assertGameState(state);
  assertQuantity(quantity, "sell quantity");
  const row = marketRow(city, goodId);
  const held = state.cargo[row.good.id] || 0;
  if (held < quantity) throw new Error(`Cannot sell ${quantity} ${row.good.label}; hold has ${held}`);
  const total = row.sellPrice * quantity;
  state.doubloons += total;
  const remaining = held - quantity;
  if (remaining > 0) state.cargo[row.good.id] = remaining;
  else delete state.cargo[row.good.id];
  recordDecision(state, `trade.sell.${cityKey(city)}.${row.good.id}`, quantity);
  return { good: row.good, quantity, price: total };
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

export function completeQuest(state, city) {
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
  return active;
}

export function cityKey(city) {
  return `${city.displayCity || city.city}|${city.country}|${city.tileId}`;
}

export function cityLabel(city) {
  return city.displayCity || city.city;
}

function marketRow(city, goodId) {
  goodById(goodId);
  const row = portMarket(city).find((item) => item.good.id === goodId);
  if (!row) throw new Error(`${cityLabel(city)} does not trade ${goodId}`);
  return row;
}

function goodById(goodId) {
  const good = TRADE_GOOD_BY_ID.get(goodId);
  if (!good) throw new Error(`Unknown trade good: ${goodId}`);
  return good;
}

function recordDecision(state, key, amount) {
  state.memory.decisions[key] = (state.memory.decisions[key] || 0) + amount;
}

function assertGameState(state) {
  if (!state || typeof state !== "object") throw new Error("Missing game state");
  assertCargoCapacity(state.cargoCapacity);
  if (!Number.isInteger(state.doubloons) || state.doubloons < 0) {
    throw new Error(`Invalid doubloon balance: ${state.doubloons}`);
  }
  if (!state.cargo || typeof state.cargo !== "object") throw new Error("Game state cargo must be an object");
  if (!state.memory || typeof state.memory !== "object") throw new Error("Game state memory must be an object");
}

function assertCargoCapacity(cargoCapacity) {
  if (!Number.isInteger(cargoCapacity) || cargoCapacity < 0) {
    throw new Error(`Invalid cargo capacity: ${cargoCapacity}`);
  }
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
