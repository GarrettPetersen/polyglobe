import assert from "node:assert/strict";
import test from "node:test";

import { repairShipHullOverTime } from "./shipRepair.js";

test("passive repairs use fixed hull points and elapsed game time", () => {
  const dhow = { hitPoints: 1, maxHitPoints: 10 };
  const galleon = { hitPoints: 100, maxHitPoints: 360 };

  const dhowRepair = repairShipHullOverTime(dhow, 12 * 60, 4);
  const galleonRepair = repairShipHullOverTime(galleon, 12 * 60, 4);

  assert.equal(dhowRepair, 2);
  assert.equal(galleonRepair, 2);
  assert.equal(dhow.hitPoints, 3);
  assert.equal(galleon.hitPoints, 102);
});

test("passive repairs stop at maximum hull", () => {
  const ship = { hitPoints: 99.5, maxHitPoints: 100 };

  const repaired = repairShipHullOverTime(ship, 24 * 60, 4);

  assert.equal(repaired, 0.5);
  assert.equal(ship.hitPoints, 100);
});

test("passive repairs never revive a sunk ship", () => {
  const ship = { hitPoints: 0, maxHitPoints: 100 };

  assert.equal(repairShipHullOverTime(ship, 30 * 24 * 60, 22), 0);
  assert.equal(ship.hitPoints, 0);
});

test("combat and dangerous weather can pause passive repairs entirely", () => {
  const ship = { hitPoints: 40, maxHitPoints: 100 };

  assert.equal(
    repairShipHullOverTime(ship, 30 * 24 * 60, 22, { paused: true }),
    0
  );
  assert.equal(ship.hitPoints, 40);
});

test("passive repairs reject malformed hull and time data", () => {
  assert.throws(
    () => repairShipHullOverTime({ hitPoints: 11, maxHitPoints: 10 }, 60, 4),
    /Invalid current hull/
  );
  assert.throws(
    () => repairShipHullOverTime({ hitPoints: 5, maxHitPoints: 10 }, -1, 4),
    /Invalid passive hull repair time/
  );
});
