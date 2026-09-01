import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { createCanvas, loadImage } from "../../../examples/globe-demo/node_modules/canvas/index.js";
import {
  floatingShipSubmergedPixelKeysForDimensions,
  shipMaxRasterWaterlineDepth
} from "../src/shipWaterline.js";
import {
  PORT_SCENE_DOCK,
  PORT_SCENE_ENTITY_META,
  PORT_SCENE_MASTER,
  docksideShipPostClearanceShift,
  docksideShipSideAnchor,
  docksideShipVerticalPlacement
} from "./citySceneRules.js";

const repositoryRoot = fileURLToPath(new URL("../../../", import.meta.url));
const manifest = JSON.parse(await readFile(new URL(
  "../public/assets/vehicles/unity-ships/port-assault/manifest.json",
  import.meta.url
), "utf8"));
const sceneManifest = JSON.parse(await readFile(new URL(
  "./assets/port-parallax/manifest.json",
  import.meta.url
), "utf8"));
const rasterMetricsBySlug = new Map();

test("every dockside ship clears the foreground dock post through its full bob", async () => {
  const shiftedShips = [];
  const postBottomY = PORT_SCENE_DOCK.foregroundPostTopY +
    PORT_SCENE_DOCK.foregroundPostHeight - 1;
  const safeRightX = PORT_SCENE_DOCK.foregroundPostX -
    PORT_SCENE_DOCK.shipPostClearanceX;
  const safeBottomY = postBottomY - PORT_SCENE_DOCK.shipPostClearanceY;

  for (const ship of manifest.ships) {
    const metrics = await docksideRasterMetrics(ship);
    const sideAnchor = docksideShipSideAnchor(ship);
    const vertical = docksideShipVerticalPlacement({
      dock: "wood",
      sideAnchorY: sideAnchor.y,
      submergedMinY: metrics.submergedMinY
    });
    const shift = docksideShipPostClearanceShift({
      rightmostOpaqueXByRow: metrics.rightmostOpaqueXByRow,
      topY: vertical.topY + PORT_SCENE_DOCK.maximumShipBobY,
      sideAnchorX: sideAnchor.x
    });
    if (shift > 0) shiftedShips.push(ship.slug);
    const shipLeftX = PORT_SCENE_DOCK.shipAccessX - sideAnchor.x - shift;
    for (let y = 0; y < metrics.rightmostOpaqueXByRow.length; y++) {
      const rightmostSourceX = metrics.rightmostOpaqueXByRow[y];
      if (
        rightmostSourceX < 0 ||
        vertical.topY + PORT_SCENE_DOCK.maximumShipBobY + y <= safeBottomY
      ) continue;
      assert.ok(
        shipLeftX + rightmostSourceX <= safeRightX,
        `${ship.slug} crowds the foreground dock post at raster row ${y}`
      );
    }
  }

  assert.ok(shiftedShips.includes("ocean-dhow"));
  assert.ok(shiftedShips.includes("medium-junk"));
});

test("every no-dock ship keeps its dock berth without touching the beach", async () => {
  const beach = await sandBeachMask();
  for (const ship of manifest.ships) {
    const metrics = await docksideRasterMetrics(ship);
    const sideAnchor = docksideShipSideAnchor(ship);
    const scale = PORT_SCENE_ENTITY_META.ship.scale;
    const vertical = docksideShipVerticalPlacement({
      dock: "none",
      sideAnchorY: sideAnchor.y * scale,
      submergedMinY: metrics.submergedMinY * scale
    });
    const postClearanceShift = docksideShipPostClearanceShift({
      rightmostOpaqueXByRow: metrics.rightmostOpaqueXByRow,
      topY: vertical.topY + PORT_SCENE_DOCK.maximumShipBobY,
      sideAnchorX: sideAnchor.x * scale
    });
    const leftX = PORT_SCENE_DOCK.shipAccessX -
      sideAnchor.x * scale - postClearanceShift;
    const dockedVertical = docksideShipVerticalPlacement({
      dock: "wood",
      sideAnchorY: sideAnchor.y * scale,
      submergedMinY: metrics.submergedMinY * scale
    });

    assert.deepEqual(vertical, dockedVertical, `${ship.slug} moved when its dock disappeared`);

    for (let bobY = -PORT_SCENE_DOCK.maximumShipBobY;
      bobY <= PORT_SCENE_DOCK.maximumShipBobY;
      bobY++) {
      assert.equal(
        shipOverlapsBeach({
          image: metrics.image,
          beachAlpha: beach.alpha,
          leftX,
          topY: vertical.topY + bobY,
          scale
        }),
        false,
        `${ship.slug} overlaps the beach while anchored at bob ${bobY}`
      );
    }
  }
});

async function docksideRasterMetrics(ship) {
  if (rasterMetricsBySlug.has(ship.slug)) return rasterMetricsBySlug.get(ship.slug);
  const pending = loadDocksideRasterMetrics(ship);
  rasterMetricsBySlug.set(ship.slug, pending);
  return pending;
}

async function loadDocksideRasterMetrics(ship) {
  const dockside = ship.cityDockside;
  const [colorImage, sinkDepthImage] = await Promise.all([
    loadImage(resolve(repositoryRoot, dockside.file)),
    loadImage(resolve(repositoryRoot, dockside.sinkDepthFile))
  ]);
  assert.equal(colorImage.width, sinkDepthImage.width, ship.slug);
  assert.equal(colorImage.height, sinkDepthImage.height, ship.slug);
  const canvas = createCanvas(colorImage.width, colorImage.height);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(colorImage, 0, 0);
  const color = context.getImageData(0, 0, canvas.width, canvas.height).data;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(sinkDepthImage, 0, 0);
  const depth = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const pixels = [];
  const rightmostOpaqueXByRow = new Int32Array(canvas.height);
  rightmostOpaqueXByRow.fill(-1);
  for (let key = 0; key < canvas.width * canvas.height; key++) {
    const offset = key * 4;
    if (color[offset + 3] <= 16) continue;
    assert.ok(depth[offset + 3] > 16, `${ship.slug} has an unbaked opaque pixel`);
    const x = key % canvas.width;
    const y = Math.floor(key / canvas.width);
    rightmostOpaqueXByRow[y] = Math.max(rightmostOpaqueXByRow[y], x);
    pixels.push({ x, y, sinkHeight: depth[offset] / 255 });
  }
  const submerged = floatingShipSubmergedPixelKeysForDimensions(
    pixels,
    canvas.width,
    canvas.height,
    shipMaxRasterWaterlineDepth(ship.slug)
  );
  let submergedMinY = canvas.height;
  for (const key of submerged) {
    submergedMinY = Math.min(submergedMinY, Math.floor(key / canvas.width));
  }
  if (submergedMinY === canvas.height) {
    submergedMinY = pixels.reduce((maximum, pixel) => Math.max(maximum, pixel.y), -1);
  }
  return { image: colorImage, rightmostOpaqueXByRow, submergedMinY };
}

async function sandBeachMask() {
  const frame = sceneManifest.staticFrames.find(({ layer }) => layer === "Sand Beach");
  assert.ok(frame, "city scene must export the beach mask");
  const atlas = await loadImage(resolve(
    repositoryRoot,
    "apps/pixel-globe/city-visualizer/assets/port-parallax/static.png"
  ));
  const canvas = createCanvas(PORT_SCENE_MASTER.width, PORT_SCENE_MASTER.height);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.drawImage(
    atlas,
    frame.frame.x,
    frame.frame.y,
    frame.frame.w,
    frame.frame.h,
    frame.spriteSourceSize.x,
    frame.spriteSourceSize.y,
    frame.frame.w,
    frame.frame.h
  );
  const alpha = context.getImageData(0, 0, canvas.width, canvas.height).data;
  return { alpha };
}

function shipOverlapsBeach({ image, beachAlpha, leftX, topY, scale }) {
  const canvas = createCanvas(PORT_SCENE_MASTER.width, PORT_SCENE_MASTER.height);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  context.imageSmoothingEnabled = false;
  context.drawImage(
    image,
    Math.round(leftX),
    Math.round(topY),
    image.width * scale,
    image.height * scale
  );
  const shipAlpha = context.getImageData(0, 0, canvas.width, canvas.height).data;
  for (let offset = 3; offset < shipAlpha.length; offset += 4) {
    if (shipAlpha[offset] > 16 && beachAlpha[offset] > 16) return true;
  }
  return false;
}
