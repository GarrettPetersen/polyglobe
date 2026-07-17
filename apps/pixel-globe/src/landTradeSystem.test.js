import assert from "node:assert/strict";
import test from "node:test";

import { createWorldEconomy, portMarket, tradeGoodById } from "./economy.js";
import { realSecondsPerGameDay } from "./gamePacing.js";
import { parseLandRoadNetwork } from "./landRoadNetwork.js";
import {
  LAND_CART_CARGO_CAPACITY,
  LAND_CART_SPEED_KM_PER_DAY,
  createLandTradeSystem,
  restoreLandTradeSystem,
  snapshotLandTradeSystem,
  updateLandTradeSystem
} from "./landTradeSystem.js";
import { SHIP_STATS } from "./shipStats.js";
import { EARTH_RADIUS_KM } from "./worldDistance.js";

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
  const slowestShipKmPerSecond = Math.min(...SHIP_STATS.map((ship) => ship.topSpeedRad)) * EARTH_RADIUS_KM;
  assert.ok(cartKmPerSecond >= 10);
  assert.ok(cartKmPerSecond < slowestShipKmPerSecond);
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
  assert.equal(system.carts.length, 1);
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
});

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
