import assert from "node:assert/strict";
import test from "node:test";

import {
  pointHitsOpaqueSpritePixel,
  selectPixelInteractionCandidate
} from "./pixelInteraction.js";

test("sprite hit testing follows opaque pixels rather than the frame rectangle", () => {
  const mask = {
    width: 3,
    height: 2,
    alpha: Uint8Array.from([
      0, 255, 0,
      255, 0, 0
    ])
  };
  const hit = (point) => pointHitsOpaqueSpritePixel({
    point,
    mask,
    sourceRect: { x: 0, y: 0, w: 3, h: 2 },
    destinationRect: { x: 10, y: 20, w: 3, h: 2 }
  });

  assert.equal(hit({ x: 11.4, y: 20.2 }), true);
  assert.equal(hit({ x: 10.4, y: 20.2 }), false);
  assert.equal(hit({ x: 10.4, y: 21.2 }), true);
});

test("sprite hit testing maps scaled and flipped nearest-neighbor pixels", () => {
  const mask = { width: 2, height: 1, alpha: Uint8Array.from([255, 0]) };
  const options = {
    mask,
    sourceRect: { x: 0, y: 0, w: 2, h: 1 },
    destinationRect: { x: 4, y: 6, w: 8, h: 4 },
    flipX: true
  };

  assert.equal(pointHitsOpaqueSpritePixel({ ...options, point: { x: 5, y: 7 } }), false);
  assert.equal(pointHitsOpaqueSpritePixel({ ...options, point: { x: 10, y: 7 } }), true);
});

test("an exact port pixel overrides a closer padded ship hit", () => {
  const port = { target: { kind: "port" }, exact: true, visualPriority: 20, distanceSquared: 50, order: 1 };
  const ship = { target: { kind: "ship" }, exact: false, visualPriority: 40, distanceSquared: 1, order: 0 };
  assert.equal(selectPixelInteractionCandidate([ship, port]), port);
});

test("visual draw priority resolves genuinely overlapping opaque pixels", () => {
  const port = { target: { kind: "port" }, exact: true, visualPriority: 20, distanceSquared: 1, order: 0 };
  const ship = { target: { kind: "ship" }, exact: true, visualPriority: 40, distanceSquared: 20, order: 1 };
  assert.equal(selectPixelInteractionCandidate([port, ship]), ship);
});

test("generous fallback hits choose the nearest target", () => {
  const port = { target: { kind: "port" }, exact: false, visualPriority: 20, distanceSquared: 4, order: 0 };
  const ship = { target: { kind: "ship" }, exact: false, visualPriority: 40, distanceSquared: 16, order: 1 };
  assert.equal(selectPixelInteractionCandidate([ship, port]), port);
});
