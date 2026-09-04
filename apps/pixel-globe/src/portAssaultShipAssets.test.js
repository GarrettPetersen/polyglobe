import assert from "node:assert/strict";
import test from "node:test";
import { access, readFile, readdir } from "node:fs/promises";
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
  assert.equal(manifest.nativeScale, 3);
  assert.match(manifest.rigReviewFile, /fleet-dock-rig-review\.png$/);
  await access(join(appRoot, "..", "..", manifest.rigReviewFile));
  assert.deepEqual(manifest.depthEncoding, {
    transparentAlpha: 0,
    farValue: 1,
    nearValue: 255,
    comparison: "asset-local orthographic view depth"
  });
  assert.equal(manifest.view.projection, "orthographic");
  assert.equal(manifest.view.broadsideOffsetDegrees, 72.5);
  assert.equal(manifest.view.cameraElevationDegrees, 20);
  assert.deepEqual(manifest.ships.map((entry) => entry.slug), rosterSlugs);
  assert.deepEqual(Object.keys(PORT_ASSAULT_SHIP_ASSETS), rosterSlugs);
  const manifestBySlug = new Map(manifest.ships.map((entry) => [entry.slug, entry]));
  const noSailSlugs = new Set([
    "japanese-kobaya",
    "mesoamerican-dugout-canoe"
  ]);
  const stowedSailSlugs = new Set([
    "caravel",
    "cutter",
    "felucca",
    "fishing-lugger",
    "japanese-sekibune",
    "joseon-turtle-ship",
    "joseon-hyeopseon",
    "joseon-panokseon",
    "portuguese-carrack",
    "nusantaran-outrigger"
  ]);
  const stowedSailExpectations = new Map([
    ["caravel", {
      sourceSailComponents: 5,
      removedOpenSailTriangles: 328,
      removedDeployedRigTriangles: 0
    }],
    ["fishing-lugger", {
      sourceSailComponents: 1,
      removedOpenSailTriangles: 44,
      removedDeployedRigTriangles: 0
    }],
    ["japanese-sekibune", {
      sourceSailComponents: 1,
      removedOpenSailTriangles: 128,
      removedDeployedRigTriangles: 124
    }]
  ]);
  const loweredJunkSailSlugs = new Set([
    "sampan",
    "small-junk",
    "medium-junk",
    "large-junk"
  ]);
  assert.ok(
    manifestBySlug.get("galleon").cityDockside.opaquePixels >
      manifestBySlug.get("fishing-lugger").cityDockside.opaquePixels * 4,
    "the shared bake keeps a fishing lugger materially smaller than a Galleon"
  );
  for (const entry of manifest.ships) {
    const asset = portAssaultShipAsset(entry.slug);
    assert.equal(manifest.width, asset.logicalWidth);
    assert.equal(manifest.height, asset.logicalHeight);
    assert.equal(manifest.nativeScale, asset.nativeScale);
    assert.equal(entry.cityDockside.width, asset.width);
    assert.equal(entry.cityDockside.height, asset.height);
    assert.deepEqual(entry.cityDockside.deckPolygon, asset.deckPolygon);
    assert.deepEqual(entry.cityDockside.deckEntryAnchor, asset.deckEntryAnchor);
    assert.deepEqual(entry.cityDockside.sailorSpawnAnchor, asset.sailorSpawnAnchor);
    assert.deepEqual(
      entry.deckPolygon,
      asset.deckPolygon.map((point) => logicalPoint(point, asset.nativeScale))
    );
    assert.deepEqual(entry.deckEntryAnchor, logicalPoint(asset.deckEntryAnchor, asset.nativeScale));
    assert.deepEqual(
      entry.sailorSpawnAnchor,
      logicalPoint(asset.sailorSpawnAnchor, asset.nativeScale)
    );
    assert.equal(manifest.view.bowScreenDirection, asset.bowScreenDirection);
    assert.equal(manifest.view.dockFacingSide, asset.dockFacingSide);
    assert.equal(manifest.view.broadsideOffsetDegrees, asset.broadsideOffsetDegrees);
    assert.equal(manifest.view.cameraElevationDegrees, asset.cameraElevationDegrees);
    for (const obsoleteField of ["file", "foregroundFile", "depthFile", "sinkDepthFile"]) {
      assert.equal(Object.hasOwn(entry, obsoleteField), false, `${entry.slug} ${obsoleteField}`);
    }
    assert.equal(entry.label, shipLabelForSlug(entry.slug));
    assert.equal(asset.label, shipLabelForSlug(entry.slug));
    assert.equal(entry.cityDockside.nativeScale, 3);
    assert.equal(entry.cityDockside.width, manifest.width * entry.cityDockside.nativeScale);
    assert.equal(entry.cityDockside.height, manifest.height * entry.cityDockside.nativeScale);
    assert.equal(entry.cityDockside.file.endsWith(asset.src), true);
    assert.equal(entry.cityDockside.foregroundFile.endsWith(asset.foregroundSrc), true);
    assert.equal(entry.cityDockside.depthFile.endsWith(asset.depthSrc), true);
    assert.equal(entry.cityDockside.sinkDepthFile.endsWith(asset.sinkDepthSrc), true);
    assert.match(entry.cityDockside.file, new RegExp(`${entry.slug}-city-dockside\\.png$`));
    assert.match(
      entry.cityDockside.sinkDepthFile,
      new RegExp(`${entry.slug}-city-dockside-sink-depth\\.png$`)
    );
    assert.deepEqual(Object.keys(entry.cityDockside.waterShadows).sort(), ["down", "level", "up"]);
    assert.ok(entry.cityDockside.waterShadowModelHeightPerPixel > 0);
    for (const [bobState, waterShadow] of Object.entries(entry.cityDockside.waterShadows)) {
      assert.match(
        waterShadow.file,
        new RegExp(`${entry.slug}-city-dockside-water-shadow-${bobState}\\.png$`)
      );
      assert.ok(waterShadow.opaquePixels > 0, `${entry.slug} ${bobState} water shadow`);
      assert.ok(Number.isInteger(waterShadow.clippedProjectedPixels));
      assert.ok(Number.isFinite(waterShadow.shadowWaterlineY));
      await access(join(appRoot, "..", "..", waterShadow.file));
    }
    const cleanup = entry.cityDockside.rasterCleanup;
    assert.ok(Number.isInteger(cleanup.minimumComponentPixels));
    assert.ok(Number.isInteger(cleanup.removedComponents));
    assert.ok(Number.isInteger(cleanup.removedPixels));
    if (entry.slug === "galleass" || entry.slug === "fusta") {
      const reviewedCleanup = {
        galleass: { minimumComponentPixels: 12, removedComponents: 8, removedPixels: 49 },
        fusta: { minimumComponentPixels: 12, removedComponents: 15, removedPixels: 54 }
      }[entry.slug];
      assert.deepEqual(entry.cityDockside.rasterCleanup, reviewedCleanup);
    } else {
      assert.equal(entry.cityDockside.rasterCleanup.removedPixels, 0);
    }
    const colorCleanup = entry.cityDockside.colorCleanup;
    assert.ok(colorCleanup);
    assert.equal(colorCleanup.minimumRegionPixelsAtCityScale, 12);
    assert.ok(colorCleanup.minimumRegionPixels >= 2);
    assert.ok(colorCleanup.completedPasses >= 1);
    assert.ok(colorCleanup.completedPasses <= colorCleanup.requestedPasses);
    assert.ok(colorCleanup.recoloredRegions >= 0);
    assert.ok(colorCleanup.recoloredPixels >= 0);
    for (const file of [
      entry.cityDockside.file,
      entry.cityDockside.foregroundFile,
      entry.cityDockside.depthFile,
      entry.cityDockside.sinkDepthFile
    ]) {
      await access(join(appRoot, "..", "..", file));
    }
    assert.ok(
      entry.cityDockside.opaquePixels > 900,
      `${entry.slug} retains a readable native-scale silhouette`
    );
    assert.ok(Number.isInteger(entry.dockRig.removedOpenSailTriangles));
    assert.ok(Number.isInteger(entry.dockRig.removedDeployedRigTriangles));
    assert.ok(Number.isInteger(entry.dockRig.generatedStackedBattenTriangles));
    if (noSailSlugs.has(entry.slug)) {
      assert.equal(entry.dockRig.state, "no-sail");
      assert.equal(entry.dockRig.removedOpenSailTriangles, 0);
      assert.equal(entry.dockRig.furledBundles, 0);
      assert.equal(entry.dockRig.generatedStackedBattenTriangles, 0);
    } else if (stowedSailSlugs.has(entry.slug)) {
      assert.equal(entry.dockRig.state, "stowed");
      assert.equal(entry.dockRig.bundleMode, "remove");
      assert.ok(entry.dockRig.removedOpenSailTriangles > 0);
      assert.equal(entry.dockRig.furledBundles, 0);
      assert.equal(entry.dockRig.generatedFurledTriangles, 0);
      assert.equal(entry.dockRig.generatedStackedBattenTriangles, 0);
      const expectedStowage = stowedSailExpectations.get(entry.slug);
      if (expectedStowage) {
        for (const [field, expectedValue] of Object.entries(expectedStowage)) {
          assert.equal(entry.dockRig[field], expectedValue, `${entry.slug} ${field}`);
        }
      }
    } else if (loweredJunkSailSlugs.has(entry.slug)) {
      assert.equal(entry.dockRig.state, "lowered");
      assert.equal(entry.dockRig.bundleMode, "junk-lowered");
      assert.ok(entry.dockRig.removedOpenSailTriangles > 0);
      assert.ok(entry.dockRig.furledBundles > 0);
      assert.ok(entry.dockRig.generatedFurledTriangles > 0);
      assert.ok(entry.dockRig.removedDeployedRigTriangles > 0);
      assert.ok(entry.dockRig.generatedStackedBattenTriangles > 0);
    } else {
      assert.equal(entry.dockRig.state, "furled");
      assert.equal(entry.dockRig.bundleMode, "furled");
      assert.ok(entry.dockRig.removedOpenSailTriangles > 0);
      assert.ok(entry.dockRig.furledBundles > 0);
      assert.ok(entry.dockRig.generatedFurledTriangles > 0);
      assert.equal(entry.dockRig.generatedStackedBattenTriangles, 0);
    }
    const geometryPoints = [
      ...entry.deckPolygon,
      entry.deckEntryAnchor,
      entry.sailorSpawnAnchor
    ];
    assert.ok(geometryPoints.every(({ x, y }) => (
      x >= 0 && x < asset.logicalWidth && y >= 0 && y < asset.logicalHeight
    )), `${entry.slug} deck geometry stays inside its logical frame`);
    const nativeGeometryPoints = [
      ...entry.cityDockside.deckPolygon,
      entry.cityDockside.deckEntryAnchor,
      entry.cityDockside.sailorSpawnAnchor
    ];
    assert.ok(nativeGeometryPoints.every(({ x, y }) => (
      x >= 0 && x < asset.width && y >= 0 && y < asset.height
    )), `${entry.slug} deck geometry stays inside its native 3x frame`);
  }
});

test("the generator emits no abandoned 1x dockside raster family", async () => {
  const files = new Set(await readdir(assetRoot));
  for (const { slug } of SHIP_STATS) {
    for (const suffix of [
      "-dockside.png",
      "-dockside-foreground.png",
      "-dockside-depth.png",
      "-dockside-sink-depth.png"
    ]) {
      assert.equal(files.has(`${slug}${suffix}`), false, `${slug}${suffix}`);
    }
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
    assert.equal(baseOpaque, entry.cityDockside.opaquePixels, `${slug} opaque pixel metadata`);
    assert.equal(
      foregroundOpaque,
      entry.cityDockside.foregroundOpaquePixels,
      `${slug} foreground pixel metadata`
    );
    assert.equal(
      submergedPixels,
      entry.cityDockside.submergedPixels,
      `${slug} submerged pixel metadata`
    );
    assert.ok(abovePixels > 0, `${slug} sink-depth map crosses above its waterline`);

    const cityWaterShadows = Object.fromEntries(await Promise.all(
      Object.entries(entry.cityDockside.waterShadows).map(async ([bobState, waterShadow]) => [
        bobState,
        await loadImage(join(appRoot, "..", "..", waterShadow.file))
      ])
    ));
    for (const shadow of Object.values(cityWaterShadows)) {
      assert.equal(shadow.width, entry.cityDockside.width);
      assert.equal(shadow.height, entry.cityDockside.height);
    }
    const shadowPixelsByBob = Object.fromEntries(Object.entries(cityWaterShadows).map(
      ([bobState, shadow]) => [bobState, imagePixels(shadow)]
    ));
    for (const [bobState, shadowPixels] of Object.entries(shadowPixelsByBob)) {
      let shadowOpaque = 0;
      for (let offset = 0; offset < shadowPixels.length; offset += 4) {
        const alpha = shadowPixels[offset + 3];
        assert.ok(alpha === 0 || alpha === 255, `${slug} ${bobState} shadow partial alpha`);
        if (alpha === 0) continue;
        assert.equal(shadowPixels[offset], 255, `${slug} ${bobState} shadow red`);
        assert.equal(shadowPixels[offset + 1], 255, `${slug} ${bobState} shadow green`);
        assert.equal(shadowPixels[offset + 2], 255, `${slug} ${bobState} shadow blue`);
        shadowOpaque++;
      }
      assert.equal(
        enclosedTransparentPixelCount(shadowPixels, base.width, base.height),
        0,
        `${slug} ${bobState} shadow has no one-pixel pinholes`
      );
      assert.equal(shadowOpaque, entry.cityDockside.waterShadows[bobState].opaquePixels);
    }
    assert.equal(
      Buffer.from(shadowPixelsByBob.up).equals(Buffer.from(shadowPixelsByBob.down)),
      false,
      `${slug} water shadow responds to its one-pixel bob`
    );
    if (slug === "galleass") {
      assert.deepEqual(opaqueComponentSizes(basePixels, base.width, base.height), [baseOpaque]);
    }
  }
});

test("port-assault ship lookup fails loudly for an unbaked hull", () => {
  assert.throws(() => portAssaultShipAsset("unregistered-hull"), /No port-assault ship asset/);
});

function logicalPoint(point, nativeScale) {
  return {
    x: Math.round(point.x / nativeScale),
    y: Math.round(point.y / nativeScale)
  };
}

function imagePixels(image) {
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0);
  return ctx.getImageData(0, 0, image.width, image.height).data;
}

function opaqueComponentSizes(pixels, width, height) {
  const visited = new Uint8Array(width * height);
  const sizes = [];
  for (let start = 0; start < visited.length; start++) {
    if (visited[start] || pixels[start * 4 + 3] === 0) continue;
    const component = [start];
    visited[start] = 1;
    for (let cursor = 0; cursor < component.length; cursor++) {
      const pixel = component[cursor];
      const x = pixel % width;
      const y = Math.floor(pixel / width);
      for (let offsetY = -1; offsetY <= 1; offsetY++) {
        for (let offsetX = -1; offsetX <= 1; offsetX++) {
          if (offsetX === 0 && offsetY === 0) continue;
          const neighborX = x + offsetX;
          const neighborY = y + offsetY;
          if (
            neighborX < 0 || neighborX >= width ||
            neighborY < 0 || neighborY >= height
          ) continue;
          const neighbor = neighborY * width + neighborX;
          if (visited[neighbor] || pixels[neighbor * 4 + 3] === 0) continue;
          visited[neighbor] = 1;
          component.push(neighbor);
        }
      }
    }
    sizes.push(component.length);
  }
  return sizes.sort((a, b) => b - a);
}

function enclosedTransparentPixelCount(pixels, width, height) {
  let count = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const pixel = x + y * width;
      if (pixels[pixel * 4 + 3] > 0) continue;
      let enclosed = true;
      for (let offsetY = -1; offsetY <= 1 && enclosed; offsetY++) {
        for (let offsetX = -1; offsetX <= 1; offsetX++) {
          if (offsetX === 0 && offsetY === 0) continue;
          if (pixels[(pixel + offsetX + offsetY * width) * 4 + 3] === 0) {
            enclosed = false;
            break;
          }
        }
      }
      if (enclosed) count++;
    }
  }
  return count;
}
