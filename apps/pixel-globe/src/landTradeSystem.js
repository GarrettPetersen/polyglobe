import {
  cargoSaleValue,
  executePortPurchase,
  executePortSale,
  maximumPortPurchaseQuantity,
  planNpcTrade,
  tradeGoodById
} from "./economy.js";

export const LAND_CART_CARGO_CAPACITY = 4;
export const LAND_CART_SPEED_KM_PER_DAY = 120;
export const LAND_CART_WALK_FRAME_COUNT = 6;
export const MAX_VISIBLE_LAND_CARTS = 14;
export const MAX_VISIBLE_LAND_CARTS_PER_SEGMENT = 2;
const MAX_CARTS = 192;
const CITY_GROUP_SIZE = 5;
const CARTS_PER_CITY_GROUP = 3;
const CART_SPECIE = 600;

export function landCartCountForCityCount(cityCount) {
  if (!Number.isInteger(cityCount) || cityCount < 1) {
    throw new Error(`Invalid land-trade city count: ${cityCount}`);
  }
  return Math.min(MAX_CARTS, Math.ceil(cityCount / CITY_GROUP_SIZE) * CARTS_PER_CITY_GROUP);
}

export function createLandTradeSystem({ roads, economy, cities, startMinute }) {
  assertSystemInputs({ roads, economy, cities, startMinute });
  const cityByTileId = new Map(cities.map((city) => [city.tileId, city]));
  const activeRoutes = roads.routes.filter((route) => (
    cityByTileId.has(route.fromTileId) && cityByTileId.has(route.toTileId)
  ));
  if (activeRoutes.length === 0) throw new Error("Land trade has no active road routes");
  const cartCount = landCartCountForCityCount(cityByTileId.size);
  const seededRoutes = [...activeRoutes]
    .sort((a, b) => hashString32(a.id) - hashString32(b.id) || a.id.localeCompare(b.id));
  const system = {
    version: 1,
    roads,
    economy,
    cityByTileId,
    activeRoutes,
    carts: []
  };
  for (let index = 0; index < cartCount; index++) {
    const route = seededRoutes[index % seededRoutes.length];
    const reverse = (hashString32(`cart-${index}`) & 1) === 1;
    const originTileId = reverse ? route.toTileId : route.fromTileId;
    const cart = createCart(system, index, originTileId, route, startMinute);
    const duration = cart.arrivalMinute - cart.departureMinute;
    const phase = hashUnit(`${cart.id}|phase`);
    cart.departureMinute -= duration * phase;
    cart.arrivalMinute -= duration * phase;
    system.carts.push(cart);
  }
  return system;
}

export function updateLandTradeSystem(system, simMinute) {
  assertLandTradeSystem(system);
  if (!Number.isFinite(simMinute)) throw new Error(`Invalid land trade minute: ${simMinute}`);
  let changed = false;
  for (const cart of system.carts) {
    let arrivals = 0;
    while (simMinute >= cart.arrivalMinute) {
      arriveAndDepartCart(system, cart, cart.arrivalMinute);
      changed = true;
      arrivals++;
      if (arrivals > 32) throw new Error(`Land cart ${cart.id} exceeded its catch-up arrival limit`);
    }
  }
  return changed;
}

export function landCartSnapshots(system, simMinute) {
  assertLandTradeSystem(system);
  if (!Number.isFinite(simMinute)) throw new Error(`Invalid land cart snapshot minute: ${simMinute}`);
  return system.carts.map((cart) => {
    const route = requiredCartRoute(system, cart.routeId);
    const forward = cart.originTileId === route.fromTileId;
    const tileIds = forward ? route.tileIds : [...route.tileIds].reverse();
    const duration = cart.arrivalMinute - cart.departureMinute;
    const progress = clamp((simMinute - cart.departureMinute) / duration, 0, 1);
    const pathPosition = progress * (tileIds.length - 1);
    const segmentIndex = Math.min(tileIds.length - 2, Math.floor(pathPosition));
    return Object.freeze({
      id: cart.id,
      routeId: cart.routeId,
      tileA: tileIds[segmentIndex],
      tileB: tileIds[segmentIndex + 1],
      segmentT: pathPosition - segmentIndex,
      progress
    });
  });
}

export function visibleLandCartSnapshots(system, simMinute, visibleTileIds) {
  if (!(visibleTileIds instanceof Set)) throw new Error("Visible land carts require a tile-id set");
  const candidates = landCartSnapshots(system, simMinute)
    .filter((cart) => visibleTileIds.has(cart.tileA) && visibleTileIds.has(cart.tileB))
    .sort((a, b) => hashString32(a.id) - hashString32(b.id) || a.id.localeCompare(b.id));
  const segmentCounts = new Map();
  const visible = [];
  for (const cart of candidates) {
    const segmentId = cart.tileA < cart.tileB
      ? `${cart.tileA}:${cart.tileB}`
      : `${cart.tileB}:${cart.tileA}`;
    const count = segmentCounts.get(segmentId) || 0;
    if (count >= MAX_VISIBLE_LAND_CARTS_PER_SEGMENT) continue;
    visible.push(cart);
    segmentCounts.set(segmentId, count + 1);
    if (visible.length >= MAX_VISIBLE_LAND_CARTS) break;
  }
  return visible;
}

export function snapshotLandTradeSystem(system) {
  assertLandTradeSystem(system);
  return {
    version: 1,
    carts: system.carts.map((cart) => ({
      ...cart,
      cargo: { ...cart.cargo },
      cargoCost: { ...cart.cargoCost }
    }))
  };
}

export function restoreLandTradeSystem(system, snapshot) {
  assertLandTradeSystem(system);
  if (!snapshot || snapshot.version !== 1 || !Array.isArray(snapshot.carts)) {
    throw new Error("Unsupported land trade save data");
  }
  const seededCarts = system.carts;
  const seededById = new Map(seededCarts.map((cart) => [cart.id, cart]));
  const ids = new Set();
  const restoredById = new Map(snapshot.carts.map((raw) => {
    validateSavedCart(system, raw);
    if (ids.has(raw.id)) throw new Error(`Duplicate saved land cart: ${raw.id}`);
    if (!seededById.has(raw.id)) throw new Error(`Saved land cart is outside the current population: ${raw.id}`);
    ids.add(raw.id);
    return [raw.id, {
      ...raw,
      cargo: { ...raw.cargo },
      cargoCost: { ...raw.cargoCost }
    }];
  }));
  if (restoredById.size === 0) throw new Error("Land trade save contains no carts");
  system.carts = seededCarts.map((seeded) => restoredById.get(seeded.id) || seeded);
  return system;
}

function createCart(system, index, originTileId, route, departureMinute) {
  const destinationTileId = otherRouteEndpoint(route, originTileId);
  const cart = {
    id: `land-cart-${index}`,
    originTileId,
    destinationTileId,
    routeId: route.id,
    departureMinute,
    arrivalMinute: departureMinute + routeDurationMinutes(route),
    cargoCapacity: LAND_CART_CARGO_CAPACITY,
    cargo: {},
    cargoCost: {},
    specie: CART_SPECIE,
    journeySerial: 0
  };
  buyCartCargo(system, cart);
  return cart;
}

function arriveAndDepartCart(system, cart, departureMinute) {
  sellCartCargo(system, cart, system.cityByTileId.get(cart.destinationTileId));
  const originTileId = cart.destinationTileId;
  const route = chooseNextRoute(system, cart, originTileId);
  cart.originTileId = originTileId;
  cart.destinationTileId = otherRouteEndpoint(route, originTileId);
  cart.routeId = route.id;
  cart.departureMinute = departureMinute;
  cart.arrivalMinute = departureMinute + routeDurationMinutes(route);
  cart.journeySerial++;
  buyCartCargo(system, cart);
}

function chooseNextRoute(system, cart, originTileId) {
  const connectedRoutes = system.roads.neighborRoutesByCityTileId.get(originTileId)
    ?.filter((route) => (
      system.cityByTileId.has(route.fromTileId) && system.cityByTileId.has(route.toTileId)
    )) || [];
  if (connectedRoutes.length === 0) throw new Error(`Land cart reached disconnected city tile ${originTileId}`);
  const onwardRoutes = connectedRoutes.filter((route) => otherRouteEndpoint(route, originTileId) !== cart.originTileId);
  const routes = onwardRoutes.length > 0 ? onwardRoutes : connectedRoutes;
  const routeTraffic = countRouteTraffic(system.carts, cart.id);
  const origin = system.cityByTileId.get(originTileId);
  const ranked = routes.map((route) => {
    const destinationTileId = otherRouteEndpoint(route, originTileId);
    const destination = system.cityByTileId.get(destinationTileId);
    const plan = planNpcTrade(system.economy, origin, destination, {
      cargoCapacity: Math.max(0, cart.cargoCapacity - cartCargoUse(cart)),
      specie: cart.specie
    });
    const retainedCargoValue = cargoSaleValue(system.economy, destination, cart.cargo);
    const traffic = routeTraffic.get(route.id) || 0;
    const congestionMultiplier = 1 / (traffic + 1);
    const jitter = 0.96 + hashUnit(`${cart.id}|${cart.journeySerial}|${route.id}`) * 0.08;
    return {
      route,
      traffic,
      score: (plan.expectedProfit + retainedCargoValue) * congestionMultiplier * jitter /
        Math.max(80, route.distanceKm)
    };
  });
  const minimumTraffic = Math.min(...ranked.map((entry) => entry.traffic));
  const routesWithCapacity = ranked.filter((entry) => entry.traffic <= minimumTraffic + 1);
  routesWithCapacity.sort((a, b) => b.score - a.score || a.traffic - b.traffic ||
    a.route.distanceKm - b.route.distanceKm || a.route.id.localeCompare(b.route.id));
  return routesWithCapacity[0].route;
}

function countRouteTraffic(carts, ignoredCartId) {
  const counts = new Map();
  for (const cart of carts) {
    if (cart.id === ignoredCartId) continue;
    counts.set(cart.routeId, (counts.get(cart.routeId) || 0) + 1);
  }
  return counts;
}

function buyCartCargo(system, cart) {
  const origin = system.cityByTileId.get(cart.originTileId);
  const destination = system.cityByTileId.get(cart.destinationTileId);
  if (!origin || !destination) throw new Error(`Land cart ${cart.id} has an unknown trade endpoint`);
  const availableCapacity = cart.cargoCapacity - cartCargoUse(cart);
  if (availableCapacity <= 0) return;
  const plan = planNpcTrade(system.economy, origin, destination, {
    cargoCapacity: availableCapacity,
    specie: cart.specie
  });
  for (const line of plan.lines) {
    const transaction = executePortSale(
      system.economy,
      origin,
      line.goodId,
      line.quantity
    );
    cart.specie -= transaction.total;
    cart.cargo[line.goodId] = (cart.cargo[line.goodId] || 0) + line.quantity;
    cart.cargoCost[line.goodId] = (cart.cargoCost[line.goodId] || 0) + transaction.total;
  }
  assertCartCargo(cart);
}

function sellCartCargo(system, cart, destination) {
  if (!destination) throw new Error(`Land cart ${cart.id} reached an unknown city`);
  for (const [goodId, held] of Object.entries(cart.cargo)) {
    const quantity = maximumPortPurchaseQuantity(system.economy, destination, goodId, held);
    if (quantity <= 0) continue;
    const transaction = executePortPurchase(system.economy, destination, goodId, quantity);
    cart.specie += transaction.total;
    const remaining = held - quantity;
    const remainingCost = (cart.cargoCost[goodId] || 0) * (remaining / held);
    if (remaining > 0) {
      cart.cargo[goodId] = remaining;
      cart.cargoCost[goodId] = remainingCost;
    } else {
      delete cart.cargo[goodId];
      delete cart.cargoCost[goodId];
    }
  }
  assertCartCargo(cart);
}

function assertCartCargo(cart) {
  for (const [goodId, quantity] of Object.entries(cart.cargo)) {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error(`Land cart ${cart.id} has invalid ${goodId} cargo: ${quantity}`);
    }
  }
  const used = cartCargoUse(cart);
  if (used > cart.cargoCapacity + 1e-6) {
    throw new Error(`Land cart ${cart.id} exceeds cargo capacity: ${used}/${cart.cargoCapacity}`);
  }
}

function cartCargoUse(cart) {
  return Object.entries(cart.cargo).reduce(
    (sum, [goodId, quantity]) => sum + quantity * tradeGoodById(goodId).unitSize,
    0
  );
}

function routeDurationMinutes(route) {
  return route.distanceKm / LAND_CART_SPEED_KM_PER_DAY * 1440;
}

function otherRouteEndpoint(route, tileId) {
  if (route.fromTileId === tileId) return route.toTileId;
  if (route.toTileId === tileId) return route.fromTileId;
  throw new Error(`City tile ${tileId} is not an endpoint of ${route.id}`);
}

function requiredCartRoute(system, routeId) {
  const route = system.roads.routeById.get(routeId);
  if (!route) throw new Error(`Land cart references unknown route: ${routeId}`);
  return route;
}

function validateSavedCart(system, cart) {
  const route = requiredCartRoute(system, cart?.routeId);
  if (typeof cart.id !== "string" || cart.id === "" ||
      !Number.isInteger(cart.originTileId) || !Number.isInteger(cart.destinationTileId) ||
      otherRouteEndpoint(route, cart.originTileId) !== cart.destinationTileId ||
      !Number.isFinite(cart.departureMinute) || !Number.isFinite(cart.arrivalMinute) ||
      cart.arrivalMinute <= cart.departureMinute ||
      cart.cargoCapacity !== LAND_CART_CARGO_CAPACITY ||
      !Number.isFinite(cart.specie) || cart.specie < 0 ||
      !Number.isInteger(cart.journeySerial) || cart.journeySerial < 0 ||
      !cart.cargo || typeof cart.cargo !== "object" || Array.isArray(cart.cargo) ||
      !cart.cargoCost || typeof cart.cargoCost !== "object" || Array.isArray(cart.cargoCost)) {
    throw new Error(`Invalid saved land cart: ${cart?.id}`);
  }
  for (const [goodId, cost] of Object.entries(cart.cargoCost)) {
    tradeGoodById(goodId);
    if (!Number.isFinite(cost) || cost < 0) throw new Error(`Invalid saved land cart cost: ${goodId}=${cost}`);
  }
  assertCartCargo(cart);
}

function assertSystemInputs({ roads, economy, cities, startMinute }) {
  if (!roads?.routeById || !roads.neighborRoutesByCityTileId) throw new Error("Land trade requires parsed roads");
  if (!economy?.portStates) throw new Error("Land trade requires a world economy");
  if (!Array.isArray(cities) || cities.length === 0) throw new Error("Land trade requires cities");
  if (!Number.isFinite(startMinute)) throw new Error(`Invalid land trade start minute: ${startMinute}`);
}

function assertLandTradeSystem(system) {
  if (!system || system.version !== 1 || !system.roads?.routeById || !system.economy?.portStates ||
      !(system.cityByTileId instanceof Map) || !Array.isArray(system.carts)) {
    throw new Error("Invalid land trade system");
  }
}

function hashString32(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function hashUnit(value) {
  return hashString32(value) / 0xffffffff;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
