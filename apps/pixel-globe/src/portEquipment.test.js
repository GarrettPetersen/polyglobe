import assert from "node:assert/strict";
import test from "node:test";

import { CANNON_EQUIPMENT } from "./cannonEquipment.js";
import { createWorldEconomy, executePortSale } from "./economy.js";
import {
  EQUIPMENT_STOCK_CANNON,
  equipmentAvailableAtPort,
  equipmentStockAtPort,
  portEquipmentProsperity
} from "./portEquipment.js";

const PORTS = Object.freeze(Array.from({ length: 12 }, (_, index) => ({
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
  assert.ok(stocks.every((stock) => stock.includes("standard-ordnance")));
  assert.ok(new Set(stocks.map((stock) => stock.join("|"))).size > 1);
  assert.ok(stocks.some((stock) => stock.length < CANNON_EQUIPMENT.length));
});

test("trade wealth can unlock top-tier equipment at a specialist port", () => {
  const city = PORTS.find((candidate) => {
    const economy = createWorldEconomy({ ports: [candidate], startMinute: 0 });
    return !equipmentAvailableAtPort(
      economy,
      candidate,
      EQUIPMENT_STOCK_CANNON,
      CANNON_EQUIPMENT.at(-1)
    );
  });
  assert.ok(city);
  const economy = createWorldEconomy({ ports: [city], startMinute: 0 });
  const before = portEquipmentProsperity(economy, city);

  for (let index = 0; index < 1000; index++) executePortSale(economy, city, "hardtack", 1);

  assert.ok(portEquipmentProsperity(economy, city) > before);
  assert.equal(equipmentAvailableAtPort(
    economy,
    city,
    EQUIPMENT_STOCK_CANNON,
    CANNON_EQUIPMENT.at(-1)
  ), true);
});
