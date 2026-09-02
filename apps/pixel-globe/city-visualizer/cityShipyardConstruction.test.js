import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createCanvas, loadImage } from "../../../examples/globe-demo/node_modules/canvas/index.js";
import {
  CITY_SHIPYARD_CONSTRUCTION_CENTER_X,
  CITY_SHIPYARD_CONSTRUCTION_KEEL_Y,
  CITY_SHIPYARD_CONSTRUCTION_Z,
  CITY_SHIPYARD_FRONT_Z,
  cityShipyardConstructionPlacement,
  validateCityShipyardConstruction
} from "./cityShipyardConstruction.js";
import { layerSceneZ } from "./citySceneRules.js";

const manifest = JSON.parse(await readFile(new URL(
  "../public/assets/vehicles/unity-ships/side-views/manifest.json",
  import.meta.url
), "utf8"));

test("shipyard construction state requires a real hull and bounded progress", () => {
  assert.deepEqual(validateCityShipyardConstruction({ shipSlug: "carrack", progress: 0.5 }), {
    shipSlug: "carrack",
    progress: 0.5
  });
  assert.equal(validateCityShipyardConstruction(null), null);
  assert.throws(() => validateCityShipyardConstruction({ shipSlug: "", progress: 0.5 }), /Invalid/);
  assert.throws(() => validateCityShipyardConstruction({ shipSlug: "carrack", progress: 2 }), /Invalid/);
});

test("every in-progress hull is centered on the yard and rests on its authored cradle", async () => {
  for (const entry of manifest.ships) {
    const ship = await loadRaster(entry);
    const placement = cityShipyardConstructionPlacement(ship, 0.5);
    assert.equal((placement.visibleLeftX + placement.visibleRightX) / 2, CITY_SHIPYARD_CONSTRUCTION_CENTER_X);
    assert.equal(placement.visibleBottomY, CITY_SHIPYARD_CONSTRUCTION_KEEL_Y);
    assert.ok(placement.visibleLeftX >= 830, `${entry.slug} overhangs the yard to port`);
    assert.ok(placement.visibleRightX <= 944, `${entry.slug} overhangs the yard to starboard`);
    assert.ok(placement.visibleTopY >= 400, `${entry.slug} sits above the yard scene`);
  }
});

test("construction painter order is base, hull, then foreground cradle", () => {
  assert.ok(layerSceneZ("Shipyard") < CITY_SHIPYARD_CONSTRUCTION_Z);
  assert.ok(CITY_SHIPYARD_CONSTRUCTION_Z < CITY_SHIPYARD_FRONT_Z);
});

async function loadRaster(entry) {
  const image = await loadImage(new URL(
    `../public/assets/vehicles/unity-ships/side-views/${entry.slug}.png`,
    import.meta.url
  ).pathname);
  const canvas = createCanvas(image.width, image.height);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, image.width, image.height).data;
  let minX = image.width;
  let minY = image.height;
  let maxX = -1;
  let maxY = -1;
  for (let key = 0; key < pixels.length / 4; key++) {
    if (pixels[key * 4 + 3] <= 16) continue;
    const x = key % image.width;
    const y = Math.floor(key / image.width);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return Object.freeze({
    ...entry,
    opaqueBounds: Object.freeze({ minX, minY, maxX, maxY })
  });
}
