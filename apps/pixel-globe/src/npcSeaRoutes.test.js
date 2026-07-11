import assert from "node:assert/strict";
import test from "node:test";

import { advanceWorldEconomy, createWorldEconomy, tradeGoodById } from "./economy.js";
import { createNpcSeaRouteSystem, updateNpcSeaRouteSystem } from "./npcSeaRoutes.js";

const PORTS = Object.freeze([
  port(1, "Lisbon", "Portugal", "mediterranean", 38.72, -9.14, 70000, "portugal"),
  port(2, "Seville", "Spain", "mediterranean", 37.39, -5.99, 90000, "spain"),
  port(3, "Genova", "Italy", "mediterranean", 44.41, 8.93, 70000, "genoa"),
  port(4, "Istanbul", "Turkey", "islamic-desert", 41.01, 28.98, 180000, "ottoman"),
  port(5, "Goa", "India", "south-asian", 15.3, 73.82, 60000, "portugal"),
  port(6, "Calicut", "India", "south-asian", 11.26, 75.78, 50000, "vijayanagara"),
  port(7, "Malacca", "Malaysia", "southeast-asian", 2.19, 102.25, 45000, "portugal"),
  port(8, "Guangzhou", "China", "east-asian", 23.13, 113.26, 120000, "ming"),
  port(9, "Nanjing", "China", "east-asian", 32.06, 118.79, 160000, "ming")
]);

test("NPC merchants carry finite cargo and realize profits over repeated port calls", () => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const routes = createNpcSeaRouteSystem({ ports: PORTS, startMinute: 0, economy });

  assert.ok(routes.ships.length > 0);
  assert.ok(routes.ships.some((ship) => cargoUnits(ship) > 0));
  for (const ship of routes.ships) {
    assert.ok(ship.specie >= 0);
    assert.ok(cargoUnits(ship) <= ship.cargoCapacity);
  }

  for (let day = 1; day <= 180; day++) {
    const minute = day * 24 * 60;
    advanceWorldEconomy(economy, minute);
    updateNpcSeaRouteSystem(routes, minute);
  }

  assert.ok(routes.ships.some((ship) => ship.lifetimeProfit > 0));
  for (const ship of routes.ships) {
    assert.ok(Number.isFinite(ship.lifetimeProfit));
    assert.ok(ship.specie >= 0);
    assert.ok(cargoUnits(ship) <= ship.cargoCapacity);
  }
});

function cargoUnits(ship) {
  return Object.entries(ship.cargo).reduce((total, [goodId, quantity]) => (
    total + tradeGoodById(goodId).unitSize * quantity
  ), 0);
}

function port(tileId, city, country, cityType, lat, lon, population, factionId) {
  return {
    tileId,
    city,
    displayCity: city,
    country,
    cityType,
    lat,
    lon,
    population,
    factionId
  };
}
