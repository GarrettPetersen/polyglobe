import assert from "node:assert/strict";
import test from "node:test";
import { createDistantWorldEventQueue } from "./distantWorldEvents.js";

test("distant world reports only timestamped work that is due", () => {
  const queue = createDistantWorldEventQueue();
  assert.equal(queue.reset({
    economyMinute: 360,
    maintenanceMinute: 30,
    ships: [{ id: "ship-b", minute: 50 }, { id: "ship-a", minute: 40 }],
    carts: [{ id: "cart-a", minute: 25 }]
  }), 25);
  assert.deepEqual(queue.advance(24), {
    due: false,
    economy: false,
    maintenance: false,
    shipIds: [],
    cartIds: [],
    nextMinute: 25
  });
  assert.deepEqual(queue.advance(30), {
    due: true,
    economy: false,
    maintenance: true,
    shipIds: [],
    cartIds: ["cart-a"],
    nextMinute: null
  });
});

test("distant world requires an authoritative reschedule after events mutate routes", () => {
  const queue = createDistantWorldEventQueue();
  queue.reset({
    economyMinute: 10,
    maintenanceMinute: 20,
    ships: [],
    carts: []
  });
  assert.equal(queue.advance(10).economy, true);
  assert.throws(() => queue.advance(11), /must be rescheduled/);
  assert.equal(queue.reset({
    economyMinute: 370,
    maintenanceMinute: 30,
    ships: [{ id: "ship-a", minute: 15 }],
    carts: []
  }), 15);
});

test("distant world rejects duplicate and malformed schedule entries", () => {
  const queue = createDistantWorldEventQueue();
  assert.throws(() => queue.advance(0), /not initialized/);
  assert.throws(() => queue.reset({
    economyMinute: 10,
    maintenanceMinute: 20,
    ships: [{ id: "same", minute: 5 }, { id: "same", minute: 6 }],
    carts: []
  }), /event id/);
  assert.throws(() => queue.reset({
    economyMinute: -1,
    maintenanceMinute: 20,
    ships: [],
    carts: []
  }), /economy minute/);
});
