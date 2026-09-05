import test from "node:test";
import assert from "node:assert/strict";
import {
  PORT_ASSAULT_LANE_COUNT,
  PORT_ASSAULT_LANE_SPACING,
  PortAssaultOccupancy,
  portAssaultBodyRadius,
  portAssaultFormationStep,
  portAssaultGroundDistance,
  portAssaultPositionIsFree
} from "./portAssaultFormation.js";

const soldier = (id, position, lane = 0, mounted = false) => ({ id, position, lane, stats: { mounted } });
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);

test("ground distance includes lane separation and diagonals in the same units", () => {
  const unit = soldier("a", 0.5);
  close(portAssaultGroundDistance(unit, soldier("b", 0.5, 1)), PORT_ASSAULT_LANE_SPACING);
  close(portAssaultGroundDistance(unit, soldier("b", 0.53, 1)), Math.hypot(0.03, PORT_ASSAULT_LANE_SPACING));
});

test("a rear rank waits at body spacing and advances into a moving or fallen comrade's gap", () => {
  const rear = soldier("rear", 0.3);
  const front = soldier("front", 0.34);
  const goal = { position: 0.7, lane: 0 };
  const contact = portAssaultFormationStep(rear, goal, 0.1, [rear, front]);
  const spacing = portAssaultBodyRadius(rear) + portAssaultBodyRadius(front);
  close(contact.position, front.position - spacing);
  const waiting = { ...rear, ...contact };
  close(portAssaultFormationStep(waiting, goal, 0.01, [waiting, front]).position, contact.position);
  const steppedForward = { ...front, position: front.position + 0.01 };
  close(portAssaultFormationStep(waiting, goal, 0.01, [waiting, steppedForward]).position, contact.position + 0.01);
  close(portAssaultFormationStep(waiting, goal, 0.01, [waiting]).position, contact.position + 0.01);
  assert.equal(rear.position, 0.3, "the query must not mutate the caller's unit");
});

test("charges and knockback cannot tunnel through a friendly rank in either direction", () => {
  for (const direction of [-1, 1]) {
    const horse = soldier("horse", 0.5, 2, true);
    const ally = soldier("ally", 0.5 + direction * 0.06, 2);
    const step = portAssaultFormationStep(horse, { position: 0.5 + direction * 0.4, lane: 2 }, 0.4, [horse, ally]);
    close(portAssaultGroundDistance(step, ally), portAssaultBodyRadius(horse) + portAssaultBodyRadius(ally));
    assert.equal(Math.sign(step.position - horse.position), direction);
  }
});

test("neighboring lanes pass clear bodies, but diagonal lane changes cannot clip a soldier", () => {
  const rear = soldier("rear", 0.3);
  const neighbor = soldier("neighbor", 0.34, 1);
  close(portAssaultFormationStep(rear, { position: 0.4, lane: 0 }, 0.1, [rear, neighbor]).position, 0.4);
  const diagonal = portAssaultFormationStep(rear, { position: 0.38, lane: 2 }, 0.2, [rear, neighbor]);
  close(portAssaultGroundDistance(diagonal, neighbor), portAssaultBodyRadius(rear) + portAssaultBodyRadius(neighbor));
});

test("contact permits moving away and total speed bounds lateral movement", () => {
  const unit = soldier("a", 0.4, 1);
  const touching = soldier("b", 0.418, 1);
  const step = portAssaultFormationStep(unit, { position: 0.3, lane: 0 }, 0.008, [unit, touching]);
  close(portAssaultGroundDistance(unit, step), 0.008);
  assert.ok(step.position < unit.position);
  assert.ok(step.lane < unit.lane);
});

test("deployment rejects occupied space and malformed movement fails loudly", () => {
  const unit = soldier("a", 0.5);
  assert.equal(portAssaultPositionIsFree(unit, [unit]), true);
  assert.equal(portAssaultPositionIsFree(unit, [soldier("b", 0.5)]), false);
  assert.throws(() => portAssaultFormationStep(unit, { position: 1, lane: 0 }, 0.1, [soldier("b", 0.5)]), /Overlapping.*a\/b/);
  for (const lane of [-1, PORT_ASSAULT_LANE_COUNT, NaN]) {
    assert.throws(() => portAssaultFormationStep(unit, { position: 1, lane }, 0.1, []), /Invalid.*a/);
  }
  assert.throws(() => portAssaultFormationStep(unit, { position: 1, lane: 0 }, -1, []), /Invalid/);
});

test("the nearby-unit index preserves full-roster collisions through movement, knockback and removal", () => {
  const units = Array.from({ length: 36 }, (_, i) => soldier(`unit-${i}`, 0.1 + Math.floor(i / 4) * 0.09, i % 4));
  const occupancy = new PortAssaultOccupancy();
  for (const unit of units) occupancy.add(unit);
  assert.throws(() => occupancy.add(units[0]), /Duplicate/);
  for (let step = 0; step < 400; step += 1) {
    const unit = units[step % units.length];
    const destination = { position: ((step * 37) % 101) / 100, lane: (step * 7) % 4 };
    const distance = step % 5 === 0 ? 0.12 : 0.014;
    const indexed = portAssaultFormationStep(unit, destination, distance, occupancy.nearby(unit, destination, distance));
    assert.deepEqual(indexed, portAssaultFormationStep(unit, destination, distance, units));
    Object.assign(unit, indexed);
    occupancy.update(unit);
  }
  const removed = units.pop();
  occupancy.remove(removed);
  assert.ok(!occupancy.nearby(removed).some(({ id }) => id === removed.id));
  assert.throws(() => occupancy.remove(removed), /Missing/);
  assert.throws(() => occupancy.add(soldier("bad", NaN)), /Invalid/);
});
