import assert from "node:assert/strict";
import test from "node:test";

import { CANNON_EQUIPMENT } from "./cannonEquipment.js";
import { createWorldEconomy, executePortSale, portEconomySummary } from "./economy.js";
import { FISHING_NETS } from "./fishingNets.js";
import {
  EQUIPMENT_STOCK_CANNON,
  EQUIPMENT_STOCK_FISHING_NET,
  EQUIPMENT_STOCK_WHALE_HARPOON,
  equipmentAvailableAtPort,
  equipmentSpecialistAtPort,
  equipmentStockAtPort,
  nativePreContactPortCannotBuildCannons,
  portEquipmentProsperity
} from "./portEquipment.js";
import { WHALE_HARPOONS } from "./whaleHarpoons.js";

const PORTS = Object.freeze(Array.from({ length: 12 }, (_, index) => ({
  cityId: `test-port-${index}|test`,
  tileId: 300 + index,
  city: `Test Port ${index}`,
  displayCity: `Test Port ${index}`,
  country: "Test",
  cityType: "northern-european",
  population: 18000 + index * 17000
})));

test("equipment stock is deterministic and varies between ports", () => {
  const economy = createWorldEconomy({ ports: PORTS, startMinute: 0 });
  const stocks = PORTS.map((city) => equipmentStockAtPort(
    economy,
    city,
    EQUIPMENT_STOCK_CANNON,
    CANNON_EQUIPMENT
  ).map((item) => item.id));

  assert.deepEqual(stocks, PORTS.map((city) => equipmentStockAtPort(
    economy,
    city,
    EQUIPMENT_STOCK_CANNON,
    CANNON_EQUIPMENT
  ).map((item) => item.id)));
  assert.ok(stocks.every((stock) => !stock.includes("standard-ordnance")));
  assert.ok(new Set(stocks.map((stock) => stock.join("|"))).size > 1);
  assert.ok(stocks.some((stock) => stock.length < CANNON_EQUIPMENT.length - 1));
});

test("historical specialist ports permanently stock every grade of their craft", () => {
  const specialists = [
    ["lisbon|portugal", "Lisbon", EQUIPMENT_STOCK_CANNON, CANNON_EQUIPMENT],
    ["istanbul|turkey", "Istanbul", EQUIPMENT_STOCK_CANNON, CANNON_EQUIPMENT],
    ["goa|india", "Goa", EQUIPMENT_STOCK_CANNON, CANNON_EQUIPMENT],
    ["brugge|belgium", "Brugge", EQUIPMENT_STOCK_FISHING_NET, FISHING_NETS],
    ["lubeck|germany", "Lubeck", EQUIPMENT_STOCK_FISHING_NET, FISHING_NETS],
    ["guangzhou|china", "Guangzhou", EQUIPMENT_STOCK_FISHING_NET, FISHING_NETS],
    ["bordeaux|france", "Bordeaux", EQUIPMENT_STOCK_WHALE_HARPOON, WHALE_HARPOONS]
  ];

  for (const [cityId, cityName, kind, catalog] of specialists) {
    const city = {
      cityId,
      tileId: 900 + specialists.findIndex((entry) => entry[0] === cityId),
      city: cityName,
      country: "Test",
      cityType: "northern-european",
      population: 1000
    };
    const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
    assert.equal(equipmentSpecialistAtPort(city, kind), true);
    assert.deepEqual(
      equipmentStockAtPort(economy, city, kind, catalog),
      catalog.filter((item) => item.tier > 0)
    );
  }
});

test("trade wealth can unlock top-tier equipment at an ordinary port", () => {
  const city = PORTS.find((candidate) => {
    const economy = createWorldEconomy({ ports: [candidate], startMinute: 0 });
    const initiallyAvailable = equipmentAvailableAtPort(
      economy,
      candidate,
      EQUIPMENT_STOCK_CANNON,
      CANNON_EQUIPMENT.at(-1)
    );
    const targetSpecie = portEconomySummary(economy, candidate).targetSpecie;
    executePortSale(economy, candidate, "hardtack", Math.ceil(targetSpecie * 0.45 / 2));
    return !initiallyAvailable && equipmentAvailableAtPort(
      economy,
      candidate,
      EQUIPMENT_STOCK_CANNON,
      CANNON_EQUIPMENT.at(-1)
    );
  });
  assert.ok(city);
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const before = portEquipmentProsperity(economy, city);
  const targetSpecie = portEconomySummary(economy, city).targetSpecie;

  executePortSale(economy, city, "hardtack", Math.ceil(targetSpecie * 0.45 / 2));

  assert.ok(portEquipmentProsperity(economy, city) > before);
  assert.equal(equipmentAvailableAtPort(
    economy,
    city,
    EQUIPMENT_STOCK_CANNON,
    CANNON_EQUIPMENT.at(-1)
  ), true);
});

test("native pre-contact ports do not invent cannon merchandise", () => {
  const chanchan = {
    tileId: 950,
    cityId: "chanchan|peru",
    city: "Chanchan",
    country: "Peru",
    cityType: "andean",
    factionId: "inca",
    population: 100000
  };
  const economy = createWorldEconomy({ ports: [chanchan], startMinute: 0 });

  assert.equal(nativePreContactPortCannotBuildCannons(chanchan, EQUIPMENT_STOCK_CANNON), true);
  assert.deepEqual(
    equipmentStockAtPort(economy, chanchan, EQUIPMENT_STOCK_CANNON, CANNON_EQUIPMENT)
      .map((item) => item.id),
    []
  );

  const colonized = { ...chanchan, factionId: "spain" };
  assert.equal(nativePreContactPortCannotBuildCannons(colonized, EQUIPMENT_STOCK_CANNON), false);
});
