import assert from "node:assert/strict";
import test from "node:test";

import { flatBattleWakeDrawCalls, updateFlatBattleShipWake } from "./flatBattleWake.js";

test("flat battles emit and age the same persistent Kelvin-style foam wake", () => {
  const ship = {
    x: 50,
    y: 50,
    headingRad: 0,
    speedPx: 12,
    wake: [],
    lastWakePoint: null,
    wakeSeedCounter: 0
  };

  for (let step = 0; step < 12; step++) {
    ship.x += 1.2;
    updateFlatBattleShipWake(ship, 0.1);
  }
  const calls = flatBattleWakeDrawCalls([ship], () => true);

  assert.ok(ship.wake.some((particle) => particle.kind === "bow"));
  assert.ok(ship.wake.some((particle) => particle.kind === "stern"));
  assert.ok(calls.length > ship.wake.length);
  assert.ok(calls.every((call) => call.alpha > 0 && call.alpha <= 0.5));
});

test("flat battle wake foam respects the rendered water mask", () => {
  const ship = {
    x: 50,
    y: 50,
    headingRad: 0,
    speedPx: 10,
    wake: [],
    lastWakePoint: null,
    wakeSeedCounter: 0
  };
  updateFlatBattleShipWake(ship, 0.1);

  assert.deepEqual(flatBattleWakeDrawCalls([ship], () => false), []);
});

test("flat battles can emit from the production hull anchor geometry", () => {
  const ship = {
    id: "anchored-test-ship",
    x: 50,
    y: 50,
    headingRad: 0,
    speedPx: 10,
    wake: [],
    lastWakePoint: null,
    wakeSeedCounter: 0
  };
  const anchors = Array.from({ length: 4 }, () => ({
    stern: { x: -8, y: 0 },
    positiveShoulder: { x: -4, y: 5 },
    negativeShoulder: { x: -4, y: -5 }
  }));

  updateFlatBattleShipWake(ship, 0.1, anchors);

  const bowPoints = ship.wake.filter((particle) => particle.kind === "bow");
  const stern = ship.wake.find((particle) => particle.kind === "stern");
  assert.deepEqual(bowPoints.map(({ x, y }) => ({ x, y })), [
    { x: 46, y: 55 },
    { x: 46, y: 45 }
  ]);
  assert.deepEqual({ x: stern.x, y: stern.y }, { x: 42, y: 50 });
});
