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
  docksideShipPostClearanceShift,
  docksideShipSideAnchor,
  docksideShipVerticalPlacement
} from "./citySceneRules.js";

const repositoryRoot = fileURLToPath(new URL("../../../", import.meta.url));
const manifest = JSON.parse(await readFile(new URL(
  "../public/assets/vehicles/unity-ships/port-assault/manifest.json",
  import.meta.url
), "utf8"));

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

async function docksideRasterMetrics(ship) {
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
  return { rightmostOpaqueXByRow, submergedMinY };
}
