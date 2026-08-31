import assert from "node:assert/strict";
import test from "node:test";

import { createWorldEconomy, portMarket, tradeGoodById } from "./economy.js";
import { realSecondsPerGameDay } from "./gamePacing.js";
import { parseLandRoadNetwork } from "./landRoadNetwork.js";
import {
  LAND_CART_CARGO_CAPACITY,
  LAND_CART_SPEED_KM_PER_DAY,
  LAND_ANIMAL_CARAVAN_SIZE,
  LAND_VEHICLE_BACTRIAN_CARAVAN,
  LAND_VEHICLE_DROMEDARY_CARAVAN,
  LAND_VEHICLE_HORSE_CART,
  LAND_VEHICLE_LLAMA_CARAVAN,
  MAX_VISIBLE_LAND_CARTS_PER_SEGMENT,
  createLandTradeSystem,
  landRouteVehicleType,
  landVehicleMemberSnapshots,
  landCartCountForCityCount,
  restoreLandTradeSystem,
  snapshotLandTradeSystem,
  stageVisibleLandCartTraffic,
  updateLandTradeSystem,
  visibleLandCartSnapshots
} from "./landTradeSystem.js";
import { SHIP_STATS } from "./shipStats.js";
import { EARTH_RADIUS_KM } from "./worldDistance.js";
import {
  WORLD_BASE_PIXELS_PER_RADIAN,
  WORLD_PIXELS_PER_RADIAN
} from "./worldScale.js";

const LONDON = city(1, "London", "northern-european", 80000);
const ANTIOCH = city(2, "Antioch", "mediterranean", 45000);
const ALEPPO = city(3, "Aleppo", "islamic-desert", 50000);

test("inland city markets participate in trade without receiving shipyards", () => {
  const economy = createWorldEconomy({
    ports: [LONDON, ANTIOCH, ALEPPO],
    shipyardPorts: [LONDON],
    startMinute: 0
  });
  assert.equal(economy.portStates.size, 3);
  assert.equal(economy.shipyards.yards.size, 1);
  assert.ok(portMarket(economy, ALEPPO).length > 0);
});

test("carts move visibly while remaining slower than every player ship", () => {
  assert.equal(LAND_CART_SPEED_KM_PER_DAY, 120);
  const cartKmPerSecond = LAND_CART_SPEED_KM_PER_DAY / realSecondsPerGameDay();
  const cartScreenPixelsPerSecond = cartKmPerSecond / EARTH_RADIUS_KM * WORLD_PIXELS_PER_RADIAN;
  const oldMinimumScreenPixelsPerSecond = 5 / EARTH_RADIUS_KM * WORLD_BASE_PIXELS_PER_RADIAN;
  const slowestShipKmPerSecond = Math.min(...SHIP_STATS.map((ship) => ship.topSpeedRad)) * EARTH_RADIUS_KM;
  assert.ok(cartScreenPixelsPerSecond >= oldMinimumScreenPixelsPerSecond);
  assert.ok(cartKmPerSecond < slowestShipKmPerSecond);
});

test("land trade seeds three carts for every five-city group", () => {
  assert.equal(landCartCountForCityCount(1), 3);
  assert.equal(landCartCountForCityCount(5), 3);
  assert.equal(landCartCountForCityCount(6), 6);
  assert.equal(landCartCountForCityCount(500), 192);
  assert.throws(() => landCartCountForCityCount(0), /Invalid land-trade city count/);
});

test("voyage seeds vary cart phasing while remaining deterministic", () => {
  const roads = syntheticRoads();
  const createSeededSystem = (seedKey) => createLandTradeSystem({
    roads,
    economy: createWorldEconomy({
      ports: [LONDON, ANTIOCH, ALEPPO],
      shipyardPorts: [LONDON],
      startMinute: 0,
      seedKey
    }),
    cities: [LONDON, ANTIOCH, ALEPPO],
    startMinute: 0,
    seedKey
  });
  const first = createSeededSystem("voyage-one");
  const repeated = createSeededSystem("voyage-one");
  const second = createSeededSystem("voyage-two");

  assert.deepEqual(snapshotLandTradeSystem(first), snapshotLandTradeSystem(repeated));
  assert.notDeepEqual(snapshotLandTradeSystem(first), snapshotLandTradeSystem(second));
});

test("low-capacity carts trade, advance, and restore exactly", () => {
  const roads = syntheticRoads();
  const economy = createWorldEconomy({
    ports: [LONDON, ANTIOCH, ALEPPO],
    shipyardPorts: [LONDON],
    startMinute: 0
  });
  const system = createLandTradeSystem({
    roads,
    economy,
    cities: [LONDON, ANTIOCH, ALEPPO],
    startMinute: 0
  });
  assert.equal(system.carts.length, 3);
  assert.equal(system.carts[0].cargoCapacity, LAND_CART_CARGO_CAPACITY);
  assert.ok(cargoUse(system.carts[0]) <= LAND_CART_CARGO_CAPACITY);

  const firstArrival = system.carts[0].arrivalMinute;
  assert.equal(updateLandTradeSystem(system, firstArrival + 1), true);
  assert.equal(system.carts[0].journeySerial, 1);
  assert.ok(cargoUse(system.carts[0]) <= LAND_CART_CARGO_CAPACITY);

  const snapshot = snapshotLandTradeSystem(system);
  const restoredEconomy = createWorldEconomy({
    ports: [LONDON, ANTIOCH, ALEPPO],
    shipyardPorts: [LONDON],
    startMinute: 0
  });
  const restored = createLandTradeSystem({
    roads,
    economy: restoredEconomy,
    cities: [LONDON, ANTIOCH, ALEPPO],
    startMinute: 0
  });
  restoreLandTradeSystem(restored, snapshot);
  assert.deepEqual(snapshotLandTradeSystem(restored), snapshot);

  const expanded = createLandTradeSystem({
    roads,
    economy: createWorldEconomy({
      ports: [LONDON, ANTIOCH, ALEPPO],
      shipyardPorts: [LONDON],
      startMinute: 0
    }),
    cities: [LONDON, ANTIOCH, ALEPPO],
    startMinute: 0
  });
  restoreLandTradeSystem(expanded, { version: 1, carts: snapshot.carts.slice(0, 1) });
  assert.equal(expanded.carts.length, 3);
  assert.deepEqual(expanded.carts[0], snapshot.carts[0]);
});

test("carts continue through connected cities instead of shuttling across one short road", () => {
  const roads = syntheticRoads();
  const economy = createWorldEconomy({
    ports: [LONDON, ANTIOCH, ALEPPO],
    shipyardPorts: [LONDON],
    startMinute: 0
  });
  const system = createLandTradeSystem({
    roads,
    economy,
    cities: [LONDON, ANTIOCH, ALEPPO],
    startMinute: 0
  });
  const cart = system.carts[0];
  Object.assign(cart, {
    originTileId: LONDON.tileId,
    destinationTileId: ANTIOCH.tileId,
    routeId: "road-1-2",
    departureMinute: 0,
    arrivalMinute: 1,
    cargo: {},
    cargoCost: {},
    specie: 600,
    journeySerial: 0
  });

  updateLandTradeSystem(system, 1);

  assert.equal(cart.originTileId, ANTIOCH.tileId);
  assert.equal(cart.destinationTileId, ALEPPO.tileId);
  assert.equal(cart.routeId, "road-2-3");
});

test("cart route choice favors an open onward road over a crowded one", () => {
  const cities = [
    city(1, "Westhaven", "northern-european", 50000),
    city(2, "Crossroads", "northern-european", 50000),
    city(3, "Eastmarket", "northern-european", 50000),
    city(4, "Southmarket", "northern-european", 50000)
  ];
  const roads = parseLandRoadNetwork({
    format: "pixel-globe-land-roads",
    version: 1,
    subdivisions: 7,
    earthCacheVersion: "test",
    cities: cities.map((entry) => ({ tileId: entry.tileId, name: entry.city })),
    routes: [
      { id: "road-1-2", fromTileId: 1, toTileId: 2, distanceKm: 100, weightedCost: 100, tileIds: [1, 2] },
      { id: "road-2-3", fromTileId: 2, toTileId: 3, distanceKm: 100, weightedCost: 100, tileIds: [2, 3] },
      { id: "road-2-4", fromTileId: 2, toTileId: 4, distanceKm: 100, weightedCost: 100, tileIds: [2, 4] }
    ]
  }, { subdivisions: 7, earthCacheVersion: "test" });
  const economy = createWorldEconomy({ ports: cities, shipyardPorts: [cities[0]], startMinute: 0 });
  const system = createLandTradeSystem({ roads, economy, cities, startMinute: 0 });
  Object.assign(system.carts[0], {
    originTileId: 1,
    destinationTileId: 2,
    routeId: "road-1-2",
    departureMinute: 0,
    arrivalMinute: 1,
    cargo: {},
    cargoCost: {},
    specie: 600,
    journeySerial: 0
  });
  for (const [index, cart] of system.carts.slice(1).entries()) {
    Object.assign(cart, {
      originTileId: index % 2 === 0 ? 2 : 3,
      destinationTileId: index % 2 === 0 ? 3 : 2,
      routeId: "road-2-3",
      departureMinute: 0,
      arrivalMinute: 100,
      cargo: {},
      cargoCost: {},
      specie: 600,
      journeySerial: 0
    });
  }

  updateLandTradeSystem(system, 1);

  assert.equal(system.carts[0].routeId, "road-2-4");
  assert.equal(system.carts[0].destinationTileId, 4);
});

test("cart rendering caps a road pileup without removing strategic traders", () => {
  const roads = syntheticRoads();
  const economy = createWorldEconomy({
    ports: [LONDON, ANTIOCH, ALEPPO],
    shipyardPorts: [LONDON],
    startMinute: 0
  });
  const system = createLandTradeSystem({
    roads,
    economy,
    cities: [LONDON, ANTIOCH, ALEPPO],
    startMinute: 0
  });
  for (const cart of system.carts) {
    Object.assign(cart, {
      originTileId: LONDON.tileId,
      destinationTileId: ANTIOCH.tileId,
      routeId: "road-1-2",
      departureMinute: 0,
      arrivalMinute: 100
    });
  }

  const snapshots = visibleLandCartSnapshots(system, 10, new Set([1, 10, 2]));

  assert.equal(system.carts.length, 3);
  assert.equal(snapshots.length, MAX_VISIBLE_LAND_CARTS_PER_SEGMENT);
  assert.deepEqual(visibleLandCartSnapshots(system, 10, new Set([3])), []);
});

test("benchmark traffic staging places the requested carts on visible road segments", () => {
  const roads = syntheticRoads();
  const economy = createWorldEconomy({
    ports: [LONDON, ANTIOCH, ALEPPO],
    shipyardPorts: [LONDON],
    startMinute: 0
  });
  const system = createLandTradeSystem({
    roads,
    economy,
    cities: [LONDON, ANTIOCH, ALEPPO],
    startMinute: 0
  });

  assert.equal(stageVisibleLandCartTraffic(system, new Set([1, 10, 2, 11, 3]), 50, 3), 3);
  const visible = visibleLandCartSnapshots(system, 50, new Set([1, 10, 2, 11, 3]));
  assert.equal(visible.length, 3);
  assert.ok(visible.every((cart) => cart.segmentT >= 0 && cart.segmentT <= 1));
});

test("benchmark traffic staging accepts a water-only scene with no carts", () => {
  const roads = syntheticRoads();
  const economy = createWorldEconomy({
    ports: [LONDON, ANTIOCH, ALEPPO],
    shipyardPorts: [LONDON],
    startMinute: 0
  });
  const system = createLandTradeSystem({
    roads,
    economy,
    cities: [LONDON, ANTIOCH, ALEPPO],
    startMinute: 0
  });

  assert.equal(stageVisibleLandCartTraffic(system, new Set(), 50, 0), 0);
});

test("Inca roads use llama caravans until colonial horses arrive", () => {
  const nativeA = { ...city(21, "Native A", "andean", 10000), factionId: "inca" };
  const nativeB = { ...city(22, "Native B", "andean", 12000), factionId: "inca" };
  const roads = parseLandRoadNetwork({
    format: "pixel-globe-land-roads",
    version: 1,
    subdivisions: 7,
    earthCacheVersion: "test",
    cities: [nativeA, nativeB].map((entry) => ({ tileId: entry.tileId, name: entry.city })),
    routes: [{
      id: "road-21-22",
      fromTileId: 21,
      toTileId: 22,
      distanceKm: 80,
      weightedCost: 90,
      tileIds: [21, 23, 22]
    }]
  }, { subdivisions: 7, earthCacheVersion: "test" });
  const system = createLandTradeSystem({
    roads,
    economy: createWorldEconomy({ ports: [nativeA, nativeB], startMinute: 0 }),
    cities: [nativeA, nativeB],
    startMinute: 0
  });

  assert.equal(landRouteVehicleType(system, roads.routes[0]), LAND_VEHICLE_LLAMA_CARAVAN);
  const llamaSnapshots = visibleLandCartSnapshots(system, 10, new Set([21, 23, 22]));
  assert.ok(llamaSnapshots.length > 0);
  assert.ok(llamaSnapshots.every((snapshot) => (
    snapshot.vehicleType === LAND_VEHICLE_LLAMA_CARAVAN
  )));
  const spacedSnapshot = { ...llamaSnapshots[0], pathPosition: 1.2, forward: true };
  const members = landVehicleMemberSnapshots(system, spacedSnapshot);
  assert.equal(members.length, LAND_ANIMAL_CARAVAN_SIZE);
  assert.deepEqual(
    members.map((member) => Number(member.pathPosition.toFixed(2))),
    [1.2, 0.78, 0.36]
  );
  assert.equal(new Set(members.map((member) => member.id)).size, LAND_ANIMAL_CARAVAN_SIZE);

  nativeB.factionId = "spain";
  assert.equal(landRouteVehicleType(system, roads.routes[0]), LAND_VEHICLE_HORSE_CART);

  nativeA.cityType = "mesoamerican";
  nativeB.cityType = "mesoamerican";
  nativeB.factionId = "neutral";
  assert.equal(landRouteVehicleType(system, roads.routes[0]), null);
  assert.deepEqual(visibleLandCartSnapshots(system, 10, new Set([21, 23, 22])), []);
});

test("camel caravans replace carts only within their historical road regions", () => {
  const cairo = { ...city(31, "Cairo", "islamic-desert", 180000), lat: 30.04, lon: 31.24 };
  const damascus = { ...city(32, "Damascus", "islamic-desert", 90000), lat: 33.51, lon: 36.29 };
  const samarkand = { ...city(33, "Samarkand", "islamic-desert", 70000), lat: 39.65, lon: 66.96 };
  const kashgar = { ...city(34, "Kashgar", "east-asian", 50000), lat: 39.47, lon: 75.99 };
  const vienna = { ...city(35, "Vienna", "northern-european", 50000), lat: 48.21, lon: 16.37 };
  const roads = parseLandRoadNetwork({
    format: "pixel-globe-land-roads",
    version: 1,
    subdivisions: 7,
    earthCacheVersion: "test",
    cities: [cairo, damascus, samarkand, kashgar, vienna].map((entry) => ({
      tileId: entry.tileId,
      name: entry.city
    })),
    routes: [
      route(31, 32),
      route(33, 34),
      route(32, 33),
      route(35, 31)
    ]
  }, { subdivisions: 7, earthCacheVersion: "test" });
  const system = createLandTradeSystem({
    roads,
    economy: createWorldEconomy({ ports: [cairo, damascus, samarkand, kashgar, vienna], startMinute: 0 }),
    cities: [cairo, damascus, samarkand, kashgar, vienna],
    startMinute: 0
  });

  assert.equal(landRouteVehicleType(system, roads.routes[0]), LAND_VEHICLE_DROMEDARY_CARAVAN);
  assert.equal(landRouteVehicleType(system, roads.routes[1]), LAND_VEHICLE_BACTRIAN_CARAVAN);
  assert.equal(landRouteVehicleType(system, roads.routes[2]), LAND_VEHICLE_HORSE_CART);
  assert.equal(landRouteVehicleType(system, roads.routes[3]), LAND_VEHICLE_HORSE_CART);
  const camelSnapshot = {
    id: "test-dromedary-caravan",
    routeId: roads.routes[0].id,
    vehicleType: LAND_VEHICLE_DROMEDARY_CARAVAN,
    pathPosition: 1.2,
    forward: true
  };
  const members = landVehicleMemberSnapshots(system, camelSnapshot);
  assert.equal(members.length, LAND_ANIMAL_CARAVAN_SIZE);
  assert.ok(members.every((member) => member.id.includes("dromedary")));
});

function route(fromTileId, toTileId) {
  return {
    id: `road-${fromTileId}-${toTileId}`,
    fromTileId,
    toTileId,
    distanceKm: 100,
    weightedCost: 100,
    tileIds: [fromTileId, toTileId]
  };
}

function syntheticRoads() {
  return parseLandRoadNetwork({
    format: "pixel-globe-land-roads",
    version: 1,
    subdivisions: 7,
    earthCacheVersion: "test",
    cities: [LONDON, ANTIOCH, ALEPPO].map((entry) => ({ tileId: entry.tileId, name: entry.city })),
    routes: [
      { id: "road-1-2", fromTileId: 1, toTileId: 2, distanceKm: 120, weightedCost: 140, tileIds: [1, 10, 2] },
      { id: "road-2-3", fromTileId: 2, toTileId: 3, distanceKm: 150, weightedCost: 180, tileIds: [2, 11, 3] }
    ]
  }, { subdivisions: 7, earthCacheVersion: "test" });
}

function city(tileId, name, cityType, population) {
  return {
    cityId: `${name.toLocaleLowerCase("en-US")}|test`,
    tileId,
    city: name,
    displayCity: name,
    country: "Test",
    cityType,
    population,
    settlementType: "city"
  };
}

function cargoUse(cart) {
  return Object.entries(cart.cargo).reduce(
    (sum, [goodId, quantity]) => sum + quantity * tradeGoodById(goodId).unitSize,
    0
  );
}
