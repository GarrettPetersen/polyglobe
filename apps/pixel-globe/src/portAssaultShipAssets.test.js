import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createCanvas, loadImage } from "../../../examples/globe-demo/node_modules/canvas/index.js";
import { PORT_ASSAULT_SHIP_ASSETS, portAssaultShipAsset } from "./portAssaultShipAssets.js";
import { RESURRECT_64_HEX } from "./waterLatitudePalette.js";

const appRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const assetRoot = join(appRoot, "public/assets/vehicles/unity-ships/port-assault");

test("the galleon port-assault bake is a production-ready pixel sprite", async () => {
  const manifest = JSON.parse(await readFile(join(assetRoot, "manifest.json"), "utf8"));
  const asset = portAssaultShipAsset("galleon");
  assert.equal(manifest.generatedBy, "tools/render-sail-ship-sprites.mjs --galleon-port-assault");
  assert.equal(manifest.palette, "Resurrect 64");
  assert.equal(manifest.width, asset.width);
  assert.equal(manifest.height, asset.height);
  assert.deepEqual(manifest.ship.deckPolygon, asset.deckPolygon);
  assert.deepEqual(manifest.ship.deckEntryAnchor, asset.deckEntryAnchor);
  assert.deepEqual(manifest.ship.sailorSpawnAnchor, asset.sailorSpawnAnchor);
  assert.equal(manifest.ship.view.bowScreenDirection, asset.bowScreenDirection);
  assert.equal(manifest.ship.view.dockFacingSide, asset.dockFacingSide);
  assert.equal(manifest.ship.view.projection, "orthographic");
  assert.equal(manifest.ship.view.broadsideOffsetDegrees, asset.broadsideOffsetDegrees);
  assert.equal(manifest.ship.view.cameraElevationDegrees, asset.cameraElevationDegrees);

  assert.equal(manifest.ship.foregroundFile.endsWith(asset.foregroundSrc), true);
  assert.equal(manifest.ship.depthFile.endsWith(asset.depthSrc), true);
  assert.deepEqual(manifest.ship.depthEncoding, {
    transparentAlpha: 0,
    farValue: 1,
    nearValue: 255,
    comparison: "asset-local orthographic view depth"
  });

  const image = await loadImage(join(appRoot, `public${asset.src}`));
  assert.equal(image.width, asset.width);
  assert.equal(image.height, asset.height);
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0);
  const pixels = ctx.getImageData(0, 0, image.width, image.height).data;
  const palette = new Set(RESURRECT_64_HEX);
  let opaquePixels = 0;
  for (let offset = 0; offset < pixels.length; offset += 4) {
    const alpha = pixels[offset + 3];
    assert.ok(alpha === 0 || alpha === 255, `partial alpha at pixel ${offset / 4}`);
    if (alpha === 0) continue;
    const hex = [pixels[offset], pixels[offset + 1], pixels[offset + 2]]
      .map((value) => value.toString(16).padStart(2, "0"))
      .join("");
    assert.ok(palette.has(hex), `non-Resurrect color #${hex}`);
    opaquePixels++;
  }
  assert.ok(opaquePixels > 3000, "the assault ship retains a readable large silhouette");
});

test("the galleon compositing layers match the base sprite", async () => {
  const asset = portAssaultShipAsset("galleon");
  const [foreground, depth] = await Promise.all([
    loadImage(join(appRoot, `public${asset.foregroundSrc}`)),
    loadImage(join(appRoot, `public${asset.depthSrc}`))
  ]);
  for (const image of [foreground, depth]) {
    assert.equal(image.width, asset.width);
    assert.equal(image.height, asset.height);
  }
  const foregroundPixels = imagePixels(foreground);
  const depthPixels = imagePixels(depth);
  let foregroundOpaque = 0;
  let depthOpaque = 0;
  let minDepth = 255;
  let maxDepth = 0;
  for (let offset = 0; offset < foregroundPixels.length; offset += 4) {
    if (foregroundPixels[offset + 3] > 0) foregroundOpaque++;
    if (depthPixels[offset + 3] === 0) continue;
    assert.equal(depthPixels[offset + 3], 255);
    assert.equal(depthPixels[offset], depthPixels[offset + 1]);
    assert.equal(depthPixels[offset], depthPixels[offset + 2]);
    minDepth = Math.min(minDepth, depthPixels[offset]);
    maxDepth = Math.max(maxDepth, depthPixels[offset]);
    depthOpaque++;
  }
  assert.ok(foregroundOpaque > 1000, "foreground layer has useful occluders");
  assert.ok(depthOpaque > foregroundOpaque, "depth map covers the whole ship");
  assert.equal(minDepth, 1);
  assert.equal(maxDepth, 255);
});

test("port-assault ship lookup fails loudly for an unbaked hull", () => {
  assert.deepEqual(Object.keys(PORT_ASSAULT_SHIP_ASSETS), ["galleon"]);
  assert.throws(() => portAssaultShipAsset("pinnace"), /No port-assault ship asset/);
});

function imagePixels(image) {
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0);
  return ctx.getImageData(0, 0, image.width, image.height).data;
}
