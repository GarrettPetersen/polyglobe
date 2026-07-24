import assert from "node:assert/strict";
import test from "node:test";

import { repairShipHullOverTime } from "./shipRepair.js";

test("passive repairs use elapsed game time and maximum hull", () => {
  const ship = { hitPoints: 40, maxHitPoints: 100 };

  const repaired = repairShipHullOverTime(ship, 10 * 24 * 60, 0.005);

  assert.equal(repaired, 5);
  assert.equal(ship.hitPoints, 45);
});

test("passive repairs stop at maximum hull", () => {
  const ship = { hitPoints: 99.5, maxHitPoints: 100 };

  const repaired = repairShipHullOverTime(ship, 10 * 24 * 60, 0.005);

  assert.equal(repaired, 0.5);
  assert.equal(ship.hitPoints, 100);
});

test("passive repairs never revive a sunk ship", () => {
  const ship = { hitPoints: 0, maxHitPoints: 100 };

  assert.equal(repairShipHullOverTime(ship, 30 * 24 * 60, 0.015), 0);
  assert.equal(ship.hitPoints, 0);
});

test("passive repairs reject malformed hull and time data", () => {
  assert.throws(
    () => repairShipHullOverTime({ hitPoints: 11, maxHitPoints: 10 }, 60, 0.005),
    /Invalid current hull/
  );
  assert.throws(
    () => repairShipHullOverTime({ hitPoints: 5, maxHitPoints: 10 }, -1, 0.005),
    /Invalid passive hull repair time/
  );
});
