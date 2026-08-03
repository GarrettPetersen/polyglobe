import assert from "node:assert/strict";
import test from "node:test";
import {
  anchorRelativeEnvelope,
  anchoredShipFrameRegistration,
  registeredSourcePoint
} from "./shipSpriteRegistration.js";

test("heading silhouettes share one model-space waterline anchor", () => {
  const sourceAnchor = { x: 50, y: 58 };
  const registration = anchoredShipFrameRegistration({
    boundsByHeading: [
      { minX: 17, minY: 11, width: 68, height: 71 },
      { minX: 33, minY: 7, width: 35, height: 76 },
      { minX: 20, minY: 18, width: 62, height: 55 }
    ],
    sourceAnchor,
    frameSize: 47
  });

  assert.deepEqual(
    registeredSourcePoint(registration, sourceAnchor),
    registration.targetAnchor
  );
  assert.ok(registration.targetAnchor.x > 2 && registration.targetAnchor.x < 45);
  assert.ok(registration.targetAnchor.y > 2 && registration.targetAnchor.y < 45);
  assert.ok(registration.draw.x >= 2 && registration.draw.y >= 2);
  assert.ok(registration.draw.x + registration.draw.width <= 45);
  assert.ok(registration.draw.y + registration.draw.height <= 45);
});

test("registration keeps its exact raster safety margin at the fit limit", () => {
  const registration = anchoredShipFrameRegistration({
    boundsByHeading: [{ minX: 15, minY: 10, width: 67.5, height: 58 }],
    sourceAnchor: { x: 50, y: 50 },
    frameSize: 47,
    requestedScale: 2 / 3,
    margin: 1
  });

  assert.equal(registration.scale, 2 / 3);
  assert.ok(registration.draw.x >= 1 && registration.draw.y >= 1);
  assert.ok(registration.draw.x + registration.draw.width <= 46);
  assert.ok(registration.draw.y + registration.draw.height <= 46);
});

test("registration envelope preserves asymmetric bow and stern extents", () => {
  const envelope = anchorRelativeEnvelope([
    { minX: 22, minY: 12, width: 70, height: 60 },
    { minX: 35, minY: 5, width: 28, height: 80 }
  ], { x: 50, y: 55 });

  assert.deepEqual(envelope, {
    minX: -28,
    minY: -50,
    maxX: 42,
    maxY: 30,
    width: 70,
    height: 80
  });
});

test("requested fleet scale is retained unless the anchored envelope would clip", () => {
  const common = {
    boundsByHeading: [{ minX: 10, minY: 10, width: 80, height: 60 }],
    sourceAnchor: { x: 50, y: 50 },
    frameSize: 47
  };
  assert.equal(anchoredShipFrameRegistration({ ...common, requestedScale: 0.4 }).scale, 0.4);
  assert.equal(
    anchoredShipFrameRegistration({ ...common, requestedScale: 0.8 }).scale,
    43 / 80
  );
});
