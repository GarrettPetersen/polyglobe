import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createCanvas, loadImage } from "../../../examples/globe-demo/node_modules/canvas/index.js";
import {
  CITY_SHIPYARD_SALE_SHIP_MAX_COUNT,
  CITY_SHIPYARD_SALE_SHIP_SCALE,
  CITY_SHIPYARD_SALE_SHIP_Z,
  cityShipyardSaleShipContainsPoint,
  cityShipyardSaleShipPlacements,
  cityShipyardSaleShipSlugs,
  validateCityShipSideViewManifest
} from "./cityShipyardSaleShips.js";
import { PORT_SCENE_ENTITY_META } from "./citySceneRules.js";

const sideViewManifest = validateCityShipSideViewManifest(JSON.parse(await readFile(new URL(
  "../public/assets/vehicles/unity-ships/side-views/manifest.json",
  import.meta.url
), "utf8")));
const portManifest = JSON.parse(await readFile(new URL(
  "./assets/port-parallax/manifest.json",
  import.meta.url
), "utf8"));

const portAtlas = await loadImage(new URL(
  `./assets/port-parallax/${portManifest.staticSheet}`,
  import.meta.url
).pathname);

test("shipyard sale listings default to one hull and support an explicit zero-to-three ship list", () => {
  const city = { id: "test", defaultShip: "small-cog" };
  assert.deepEqual(cityShipyardSaleShipSlugs(city, { shipyard: false }), []);
  assert.deepEqual(cityShipyardSaleShipSlugs(city, { shipyard: true }), ["small-cog"]);
  assert.deepEqual(
    cityShipyardSaleShipSlugs({ ...city, shipyardSaleShips: [] }, { shipyard: true }),
    []
  );
  assert.deepEqual(
    cityShipyardSaleShipSlugs({
      ...city,
      shipyardSaleShips: ["small-cog", "caravel", "carrack"]
    }, { shipyard: true }),
    ["small-cog", "caravel", "carrack"]
  );
  assert.throws(() => cityShipyardSaleShipSlugs({
    ...city,
    shipyardSaleShips: Array(CITY_SHIPYARD_SALE_SHIP_MAX_COUNT + 1).fill("small-cog")
  }, { shipyard: true }), /exceeds/);
});

test("every sale-modal side view has a reviewed waterline with opaque hull below it", async () => {
  assert.equal(sideViewManifest.ships.length, 43);
  for (const ship of sideViewManifest.ships) {
    const raster = await loadSideViewRaster(ship);
    assert.equal(raster.opaqueBounds.maxY, ship.lowestOpaquePixelY, `${ship.slug} lowest pixel metadata`);
    assert.ok(raster.opaqueBounds.maxY > ship.sideViewWaterlineY, `${ship.slug} must enter the water`);
  }
});

test("sale ships are smaller than the foreground ship, behind and left of the shipyard", async () => {
  const ships = await Promise.all(sideViewManifest.ships.slice(0, 3).map(loadSideViewRaster));
  const placements = cityShipyardSaleShipPlacements(ships);
  assert.equal(CITY_SHIPYARD_SALE_SHIP_SCALE, 1);
  assert.ok(CITY_SHIPYARD_SALE_SHIP_SCALE < PORT_SCENE_ENTITY_META.ship.nativeRasterScale);
  for (const placement of placements) {
    assert.ok(placement.visibleRightX < 841, `${placement.ship.slug} must be left of shipyard`);
    assert.ok(placement.z > 20 && placement.z < 25, `${placement.ship.slug} painter order`);
    assert.ok(placement.depth < 0.98, `${placement.ship.slug} parallax depth`);
    assert.ok(placement.visibleBottomY > placement.waterlineY, `${placement.ship.slug} submerged pixels`);
  }
});

test("every hull fits each configured berth without touching either possible shore", async () => {
  const shoreAlpha = authoredShoreAlpha();
  for (const shipEntry of sideViewManifest.ships) {
    const ship = await loadSideViewRaster(shipEntry);
    const placements = cityShipyardSaleShipPlacements(Array.from(
      { length: CITY_SHIPYARD_SALE_SHIP_MAX_COUNT },
      () => ship
    ));
    for (const placement of placements) {
      for (let y = ship.opaqueBounds.minY; y <= ship.opaqueBounds.maxY; y++) {
        for (let x = ship.opaqueBounds.minX; x <= ship.opaqueBounds.maxX; x++) {
          if (ship.alpha[x + y * ship.width] <= 16) continue;
          const masterX = Math.round(placement.x + x * placement.scale);
          const masterY = Math.round(placement.y + y * placement.scale);
          assert.equal(
            shoreAlpha[masterX + masterY * 1365],
            0,
            `${ship.slug} berth ${placement.index} overlaps shore at ${masterX},${masterY}`
          );
        }
      }
    }
  }
});

test("sale ship interaction follows opaque pixels, not its transparent frame", async () => {
  const ship = await loadSideViewRaster(sideViewManifest.ships.find(({ slug }) => slug === "small-cog"));
  const [placement] = cityShipyardSaleShipPlacements([ship]);
  assert.equal(cityShipyardSaleShipContainsPoint({
    placement,
    screenX: placement.x,
    screenY: placement.y,
    alpha: ship.alpha
  }), false);
  const opaqueKey = ship.alpha.findIndex((alpha) => alpha > 16);
  assert.ok(opaqueKey >= 0);
  assert.equal(cityShipyardSaleShipContainsPoint({
    placement,
    screenX: placement.x + opaqueKey % ship.width,
    screenY: placement.y + Math.floor(opaqueKey / ship.width),
    alpha: ship.alpha
  }), true);
});

async function loadSideViewRaster(ship) {
  const image = await loadImage(new URL(`../public/assets/vehicles/unity-ships/side-views/${ship.slug}.png`, import.meta.url).pathname);
  const canvas = createCanvas(image.width, image.height);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, image.width, image.height).data;
  const alpha = new Uint8Array(image.width * image.height);
  let minX = image.width;
  let minY = image.height;
  let maxX = -1;
  let maxY = -1;
  for (let key = 0; key < alpha.length; key++) {
    alpha[key] = pixels[key * 4 + 3];
    if (alpha[key] <= 16) continue;
    const x = key % image.width;
    const y = Math.floor(key / image.width);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return Object.freeze({
    ...ship,
    alpha,
    opaqueBounds: Object.freeze({ minX, minY, maxX, maxY })
  });
}

function authoredShoreAlpha() {
  const canvas = createCanvas(1365, 910);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  const shoreLayers = new Map([
    ["Sand Beach", 0],
    ["Left Bank Sand Beach", 300],
    ["Foreground Grass Left Bank", 300],
    ["Foreground Desert Left Bank", 300],
    ["Foreground Rocky Left Bank", 300]
  ]);
  for (const frame of portManifest.staticFrames.filter(({ layer }) => shoreLayers.has(layer))) {
    context.drawImage(
      portAtlas,
      frame.frame.x,
      frame.frame.y,
      frame.frame.w,
      frame.frame.h,
      frame.spriteSourceSize.x + shoreLayers.get(frame.layer),
      frame.spriteSourceSize.y,
      frame.frame.w,
      frame.frame.h
    );
  }
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const alpha = new Uint8Array(canvas.width * canvas.height);
  for (let key = 0; key < alpha.length; key++) alpha[key] = pixels[key * 4 + 3];
  return alpha;
}
