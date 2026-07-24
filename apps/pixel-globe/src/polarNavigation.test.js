import assert from "node:assert/strict";
import test from "node:test";

import {
  SHIP_POLAR_NAVIGATION_LIMIT_DEG,
  polarNavigationCollision,
  shipPositionWithinPolarNavigationLimit
} from "./polarNavigation.js";

test("ordinary sailing latitudes remain inside the pole-safe camera region", () => {
  assert.equal(shipPositionWithinPolarNavigationLimit(directionAt(70, 30)), true);
  assert.equal(shipPositionWithinPolarNavigationLimit(directionAt(-70, 30)), true);
  assert.equal(shipPositionWithinPolarNavigationLimit(
    directionAt(SHIP_POLAR_NAVIGATION_LIMIT_DEG + 0.01, 30)
  ), false);
});

test("poleward travel collides with matching north and south polar caps", () => {
  const north = polarNavigationCollision(directionAt(83.9, 20), directionAt(84.1, 20));
  const south = polarNavigationCollision(directionAt(-83.9, 20), directionAt(-84.1, 20));

  assert.ok(north);
  assert.ok(south);
  assert.ok(dot3(north.normal, northwardTangent(directionAt(83.9, 20))) > 0.999);
  assert.ok(dot3(south.normal, northwardTangent(directionAt(-83.9, 20))) < -0.999);
});

test("a ship restored inside a polar cap may always sail back toward the equator", () => {
  assert.equal(
    polarNavigationCollision(directionAt(86, 40), directionAt(85.8, 40)),
    null
  );
  assert.equal(
    polarNavigationCollision(directionAt(-86, 40), directionAt(-85.8, 40)),
    null
  );
  assert.ok(polarNavigationCollision(directionAt(86, 40), directionAt(86.1, 40)));
});

test("polar navigation rejects malformed vectors and limits", () => {
  assert.throws(
    () => shipPositionWithinPolarNavigationLimit([0, 0, 0]),
    /cannot be zero/
  );
  assert.throws(
    () => polarNavigationCollision(directionAt(80, 0), directionAt(81, 0), 90),
    /Invalid ship polar navigation limit/
  );
});

function directionAt(latitudeDeg, longitudeDeg) {
  const latitude = latitudeDeg * Math.PI / 180;
  const longitude = longitudeDeg * Math.PI / 180;
  return [
    Math.cos(latitude) * Math.cos(longitude),
    Math.sin(latitude),
    -Math.cos(latitude) * Math.sin(longitude)
  ];
}

function northwardTangent(position) {
  const dot = position[1];
  const tangent = [
    -position[0] * dot,
    1 - position[1] * dot,
    -position[2] * dot
  ];
  const length = Math.hypot(...tangent);
  return tangent.map((value) => value / length);
}

function dot3(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
