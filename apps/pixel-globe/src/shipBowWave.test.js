import assert from "node:assert/strict";
import test from "node:test";

import { shipBowWavePixels, shipBowWaveStyle } from "./shipBowWave.js";

test("slow bow waves pulse while fast bow waves become steady", () => {
  assert.equal(shipBowWaveStyle({ speedPx: 2, minimumWakeSpeedPx: 2.5, elapsedSeconds: 0 }), null);
  const slowA = shipBowWaveStyle({ speedPx: 2.6, minimumWakeSpeedPx: 2.5, elapsedSeconds: 0 });
  const slowB = shipBowWaveStyle({ speedPx: 2.6, minimumWakeSpeedPx: 2.5, elapsedSeconds: 0.7 });
  assert.notEqual(slowA.alpha, slowB.alpha);
  const fastA = shipBowWaveStyle({ speedPx: 9, minimumWakeSpeedPx: 2.5, elapsedSeconds: 0 });
  const fastB = shipBowWaveStyle({ speedPx: 9, minimumWakeSpeedPx: 2.5, elapsedSeconds: 0.7 });
  assert.equal(fastA.alpha, fastB.alpha);
  assert.equal(fastA.outwardPixels, 1);
});

test("bow wave pixels hug baked bow shoulders and spread outward at speed", () => {
  assert.deepEqual(shipBowWavePixels({
    port: { x: 10.2, y: 12.8 },
    starboard: { x: 10.1, y: 4.2 },
    side: { x: 0, y: 1 },
    style: { alpha: 0.6, outwardPixels: 1 }
  }), [
    { x: 10, y: 13, alpha: 0.6 },
    { x: 10, y: 4, alpha: 0.6 },
    { x: 10, y: 14, alpha: 0.6 },
    { x: 10, y: 3, alpha: 0.6 }
  ]);
});
