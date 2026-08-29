import assert from "node:assert/strict";
import test from "node:test";
import { access, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createCanvas, loadImage } from "../../../examples/globe-demo/node_modules/canvas/index.js";
import { PORT_ASSAULT_SHIP_ASSETS, portAssaultShipAsset } from "./portAssaultShipAssets.js";
import { SHIP_STATS, shipLabelForSlug } from "./shipStats.js";
import { SHIP_WATERLINE_DEPTH_BYTE } from "./shipWaterline.js";
import { RESURRECT_64_HEX } from "./waterLatitudePalette.js";

const appRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const assetRoot = join(appRoot, "public/assets/vehicles/unity-ships/port-assault");

test("every production hull has matching port-assault geometry and manifest metadata", async () => {
  const manifest = JSON.parse(await readFile(join(assetRoot, "manifest.json"), "utf8"));
  const rosterSlugs = SHIP_STATS.map((entry) => entry.slug);
  assert.equal(manifest.generatedBy, "tools/render-sail-ship-sprites.mjs --port-assault-ships");
  assert.equal(manifest.palette, "Resurrect 64");
  assert.equal(manifest.rigState, "furled-at-dock");
  assert.equal(manifest.scaleMode, "production-roster-relative");
  assert.match(manifest.rigReviewFile, /fleet-dock-rig-review\.png$/);
  await access(join(appRoot, "..", "..", manifest.rigReviewFile));
  assert.deepEqual(manifest.depthEncoding, {
    transparentAlpha: 0,
    farValue: 1,
    nearValue: 255,
    comparison: "asset-local orthographic view depth"
  });
  assert.equal(manifest.view.projection, "orthographic");
  assert.deepEqual(manifest.ships.map((entry) => entry.slug), rosterSlugs);
  assert.deepEqual(Object.keys(PORT_ASSAULT_SHIP_ASSETS), rosterSlugs);
  const manifestBySlug = new Map(manifest.ships.map((entry) => [entry.slug, entry]));
  const noSailSlugs = new Set([
    "japanese-kobaya",
    "mesoamerican-dugout-canoe"
  ]);
  const stowedSailSlugs = new Set([
    "joseon-turtle-ship",
    "joseon-hyeopseon",
    "joseon-panokseon",
    "portuguese-carrack",
    "nusantaran-outrigger"
  ]);
  assert.ok(
    manifestBySlug.get("galleon").opaquePixels >
      manifestBySlug.get("fishing-lugger").opaquePixels * 4,
    "the shared bake keeps a fishing lugger materially smaller than a Galleon"
  );
  for (const entry of manifest.ships) {
    const asset = portAssaultShipAsset(entry.slug);
    assert.equal(manifest.width, asset.width);
    assert.equal(manifest.height, asset.height);
    assert.deepEqual(entry.deckPolygon, asset.deckPolygon);
    assert.deepEqual(entry.deckEntryAnchor, asset.deckEntryAnchor);
    assert.deepEqual(entry.sailorSpawnAnchor, asset.sailorSpawnAnchor);
    assert.equal(manifest.view.bowScreenDirection, asset.bowScreenDirection);
    assert.equal(manifest.view.dockFacingSide, asset.dockFacingSide);
    assert.equal(manifest.view.broadsideOffsetDegrees, asset.broadsideOffsetDegrees);
    assert.equal(manifest.view.cameraElevationDegrees, asset.cameraElevationDegrees);
    assert.equal(entry.file.endsWith(asset.src), true);
    assert.equal(entry.foregroundFile.endsWith(asset.foregroundSrc), true);
    assert.equal(entry.depthFile.endsWith(asset.depthSrc), true);
    assert.equal(entry.sinkDepthFile.endsWith(asset.sinkDepthSrc), true);
    assert.equal(entry.label, shipLabelForSlug(entry.slug));
    assert.equal(asset.label, shipLabelForSlug(entry.slug));
    assert.equal(entry.cityDockside.nativeScale, 3);
    assert.equal(entry.cityDockside.width, manifest.width * entry.cityDockside.nativeScale);
    assert.equal(entry.cityDockside.height, manifest.height * entry.cityDockside.nativeScale);
    assert.match(entry.cityDockside.file, new RegExp(`${entry.slug}-city-dockside\\.png$`));
    assert.match(
      entry.cityDockside.sinkDepthFile,
      new RegExp(`${entry.slug}-city-dockside-sink-depth\\.png$`)
    );
    await access(join(appRoot, "..", "..", entry.cityDockside.file));
    await access(join(appRoot, "..", "..", entry.cityDockside.sinkDepthFile));
    assert.ok(entry.opaquePixels > 100, `${entry.slug} retains a readable silhouette`);
    assert.ok(Number.isInteger(entry.dockRig.removedOpenSailTriangles));
    assert.ok(Number.isInteger(entry.dockRig.removedDeployedRigTriangles));
    if (noSailSlugs.has(entry.slug)) {
      assert.equal(entry.dockRig.state, "no-sail");
      assert.equal(entry.dockRig.removedOpenSailTriangles, 0);
      assert.equal(entry.dockRig.furledBundles, 0);
    } else if (stowedSailSlugs.has(entry.slug)) {
      assert.equal(entry.dockRig.state, "stowed");
      assert.equal(entry.dockRig.bundleMode, "remove");
      assert.ok(entry.dockRig.removedOpenSailTriangles > 0);
      assert.equal(entry.dockRig.furledBundles, 0);
      assert.equal(entry.dockRig.generatedFurledTriangles, 0);
    } else {
      assert.equal(entry.dockRig.state, "furled");
      assert.equal(entry.dockRig.bundleMode, "furled");
      assert.ok(entry.dockRig.removedOpenSailTriangles > 0);
      assert.ok(entry.dockRig.furledBundles > 0);
      assert.ok(entry.dockRig.generatedFurledTriangles > 0);
    }
    const geometryPoints = [
      ...entry.deckPolygon,
      entry.deckEntryAnchor,
      entry.sailorSpawnAnchor
    ];
    assert.ok(geometryPoints.every(({ x, y }) => (
      x >= 0 && x < asset.width && y >= 0 && y < asset.height
    )), `${entry.slug} deck geometry stays inside its native frame`);
  }
});

test("every port-assault hull is hard-edged Resurrect pixel art with complete compositing layers", async () => {
  const manifest = JSON.parse(await readFile(join(assetRoot, "manifest.json"), "utf8"));
  const palette = new Set(RESURRECT_64_HEX);
  for (const slug of Object.keys(PORT_ASSAULT_SHIP_ASSETS)) {
    const asset = portAssaultShipAsset(slug);
    const entry = manifest.ships.find((candidate) => candidate.slug === slug);
    assert.ok(entry, `${slug} has manifest metadata`);
    // node-canvas can leave its native image worker alive when this entire fleet is
    // decoded in overlapping triples. Serial decoding is just as useful for this
    // asset audit and lets the supervised test process terminate cleanly.
    const base = await loadImage(join(appRoot, `public${asset.src}`));
    const foreground = await loadImage(join(appRoot, `public${asset.foregroundSrc}`));
    const depth = await loadImage(join(appRoot, `public${asset.depthSrc}`));
    const sinkDepth = await loadImage(join(appRoot, `public${asset.sinkDepthSrc}`));
    for (const image of [base, foreground, depth, sinkDepth]) {
      assert.equal(image.width, asset.width);
      assert.equal(image.height, asset.height);
    }
    const basePixels = imagePixels(base);
    const foregroundPixels = imagePixels(foreground);
    const depthPixels = imagePixels(depth);
    const sinkDepthPixels = imagePixels(sinkDepth);
    let baseOpaque = 0;
    let foregroundOpaque = 0;
    let depthOpaque = 0;
    let minDepth = 255;
    let maxDepth = 0;
    let submergedPixels = 0;
    let abovePixels = 0;
    for (let offset = 0; offset < basePixels.length; offset += 4) {
      const alpha = basePixels[offset + 3];
      assert.ok(alpha === 0 || alpha === 255, `${slug} partial alpha at ${offset / 4}`);
      if (alpha > 0) {
        const hex = [basePixels[offset], basePixels[offset + 1], basePixels[offset + 2]]
          .map((value) => value.toString(16).padStart(2, "0"))
          .join("");
        assert.ok(palette.has(hex), `${slug} has non-Resurrect color #${hex}`);
        baseOpaque++;
      }
      if (foregroundPixels[offset + 3] > 0) foregroundOpaque++;
      if (depthPixels[offset + 3] === 0) continue;
      assert.equal(depthPixels[offset + 3], 255);
      assert.equal(depthPixels[offset], depthPixels[offset + 1]);
      assert.equal(depthPixels[offset], depthPixels[offset + 2]);
      minDepth = Math.min(minDepth, depthPixels[offset]);
      maxDepth = Math.max(maxDepth, depthPixels[offset]);
      depthOpaque++;
      assert.equal(sinkDepthPixels[offset + 3], 255);
      assert.equal(sinkDepthPixels[offset], sinkDepthPixels[offset + 1]);
      assert.equal(sinkDepthPixels[offset], sinkDepthPixels[offset + 2]);
      if (sinkDepthPixels[offset] <= SHIP_WATERLINE_DEPTH_BYTE) submergedPixels++;
      else abovePixels++;
    }
    assert.ok(foregroundOpaque > 0, `${slug} has useful foreground occluders`);
    assert.ok(foregroundOpaque < baseOpaque, `${slug} foreground remains a partial layer`);
    assert.equal(depthOpaque, baseOpaque, `${slug} depth map covers the complete ship`);
    assert.equal(minDepth, 1, `${slug} depth map reaches its far value`);
    assert.equal(maxDepth, 255, `${slug} depth map reaches its near value`);
    assert.equal(submergedPixels, entry.submergedPixels, `${slug} submerged pixel metadata`);
    assert.ok(abovePixels > 0, `${slug} sink-depth map crosses above its waterline`);

    const cityBase = await loadImage(join(appRoot, "..", "..", entry.cityDockside.file));
    const citySinkDepth = await loadImage(
      join(appRoot, "..", "..", entry.cityDockside.sinkDepthFile)
    );
    assert.equal(cityBase.width, entry.cityDockside.width);
    assert.equal(cityBase.height, entry.cityDockside.height);
    assert.equal(citySinkDepth.width, entry.cityDockside.width);
    assert.equal(citySinkDepth.height, entry.cityDockside.height);
    const cityPixels = imagePixels(cityBase);
    const citySinkPixels = imagePixels(citySinkDepth);
    let cityOpaque = 0;
    for (let offset = 0; offset < cityPixels.length; offset += 4) {
      const alpha = cityPixels[offset + 3];
      assert.ok(alpha === 0 || alpha === 255, `${slug} city raster partial alpha at ${offset / 4}`);
      if (alpha === 0) continue;
      const hex = [cityPixels[offset], cityPixels[offset + 1], cityPixels[offset + 2]]
        .map((value) => value.toString(16).padStart(2, "0"))
        .join("");
      assert.ok(palette.has(hex), `${slug} city raster has non-Resurrect color #${hex}`);
      assert.equal(citySinkPixels[offset + 3], 255);
      assert.equal(citySinkPixels[offset], citySinkPixels[offset + 1]);
      assert.equal(citySinkPixels[offset], citySinkPixels[offset + 2]);
      cityOpaque++;
    }
    assert.equal(cityOpaque, entry.cityDockside.opaquePixels);
    assert.ok(cityOpaque > baseOpaque * 5, `${slug} city raster preserves native 3x detail`);
  }
});

test("port-assault ship lookup fails loudly for an unbaked hull", () => {
  assert.throws(() => portAssaultShipAsset("unregistered-hull"), /No port-assault ship asset/);
});

function imagePixels(image) {
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0);
  return ctx.getImageData(0, 0, image.width, image.height).data;
}
