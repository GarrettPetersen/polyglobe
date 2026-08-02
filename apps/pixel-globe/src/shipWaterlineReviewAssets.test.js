import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createCanvas, loadImage } from "../../../examples/globe-demo/node_modules/canvas/index.js";
import { SHIP_ROWING_ANIMATION_SPECS } from "./shipRowingAnimation.js";
import { SHIP_STATS } from "./shipStats.js";
import {
  SHIP_MIN_RASTER_WATERLINE_DEPTH,
  shipMaxRasterWaterlineDepth
} from "./shipWaterline.js";

const reviewRoot = join(dirname(fileURLToPath(import.meta.url)), "../docs/ship-reference/waterlines");
const PROCEDURAL_OAR_SHIPS = new Set(SHIP_ROWING_ANIMATION_SPECS.keys());
const MAX_OAR_PIVOT_HEIGHT_PX = 5;
const TURTLE_SHIP_MAX_OAR_PIVOT_HEIGHT_PX = 2;
const MALAY_WARSHIP_OAR_PIVOT_COUNTS = Object.freeze({
  penjajap: 8,
  lancaran: 10,
  "royal-lancaran": 12
});
const MEDITERRANEAN_OAR_PIVOT_COUNTS = Object.freeze({
  "mediterranean-galley": 8,
  galleass: 12
});

test("waterline review covers the production roster with an exact blue guide", async () => {
  const manifest = JSON.parse(await readFile(join(reviewRoot, "manifest.json"), "utf8"));
  assert.equal(manifest.lineColor, "#4d9be6");
  assert.equal(manifest.oarPivotColor, "#e83b3b");
  assert.deepEqual(
    manifest.ships.map((entry) => entry.slug).sort(),
    SHIP_STATS.map((entry) => entry.slug).sort()
  );

  for (const entry of manifest.ships) {
    assert.ok(Number.isInteger(entry.sideViewWaterlineY), `${entry.slug} has an integer guide row`);
    assert.ok(entry.sideViewWaterlineY >= 0 && entry.sideViewWaterlineY < manifest.height);
    assert.ok(Number.isInteger(entry.lowestOpaquePixelY), `${entry.slug} has an integer lowest row`);
    assert.equal(
      entry.lowestOpaqueRelativeToWaterlinePx,
      entry.lowestOpaquePixelY - entry.sideViewWaterlineY
    );
    assert.equal(entry.opaqueRowsBelowWaterline, Math.max(0, entry.lowestOpaqueRelativeToWaterlinePx));
    assert.ok(
      entry.lowestOpaqueRelativeToWaterlinePx >= SHIP_MIN_RASTER_WATERLINE_DEPTH &&
        entry.lowestOpaqueRelativeToWaterlinePx <= shipMaxRasterWaterlineDepth(entry.slug),
      `${entry.slug} waterline depth ${entry.lowestOpaqueRelativeToWaterlinePx}px is outside ` +
        `${SHIP_MIN_RASTER_WATERLINE_DEPTH}..${shipMaxRasterWaterlineDepth(entry.slug)}px`
    );
    const image = await loadImage(join(reviewRoot, `${entry.slug}-waterline.png`));
    assert.equal(image.width, manifest.width);
    assert.equal(image.height, manifest.height);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0);
    const pixels = ctx.getImageData(0, 0, image.width, image.height).data;
    const rowStart = entry.sideViewWaterlineY * image.width * 4;
    const row = pixels.subarray(rowStart, rowStart + image.width * 4);
    for (let x = 0; x < image.width; x++) {
      const offset = x * 4;
      const coveredByPivotMarker = entry.oarPivotPixels.some((pivot) => (
        Math.abs(pivot.x - x) <= 1 && Math.abs(pivot.y - entry.sideViewWaterlineY) <= 1
      ));
      assert.deepEqual(
        Array.from(row.subarray(offset, offset + 4)),
        coveredByPivotMarker ? [232, 59, 59, 255] : [77, 155, 230, 255],
        `${entry.slug} guide differs at x=${x}`
      );
    }
    if (PROCEDURAL_OAR_SHIPS.has(entry.slug)) {
      assert.ok(entry.oarPivotCount > 0, `${entry.slug} has no source oar pivots`);
      assert.ok(entry.oarPivotPixels.length > 0, `${entry.slug} has no visible oar pivots`);
      for (const pivot of entry.oarPivotPixels) {
        const pivotHeight = entry.sideViewWaterlineY - pivot.y;
        assert.ok(
          pivotHeight >= 0,
          `${entry.slug} oar pivot ${pivot.x},${pivot.y} is below waterline row ${entry.sideViewWaterlineY}`
        );
        const maxPivotHeight = entry.slug === "joseon-turtle-ship"
          ? TURTLE_SHIP_MAX_OAR_PIVOT_HEIGHT_PX
          : MAX_OAR_PIVOT_HEIGHT_PX;
        assert.ok(
          pivotHeight <= maxPivotHeight,
          `${entry.slug} oar pivot ${pivot.x},${pivot.y} is ${pivotHeight}px above its waterline; ` +
            `maximum is ${maxPivotHeight}px`
        );
        if (entry.slug === "joseon-turtle-ship") {
          assert.ok(pivotHeight >= 1, "Turtle Ship oar pivots must remain visibly above the waterline");
        }
        const offset = (pivot.x + pivot.y * image.width) * 4;
        assert.deepEqual(
          Array.from(pixels.subarray(offset, offset + 4)),
          [232, 59, 59, 255],
          `${entry.slug} pivot marker is missing at ${pivot.x},${pivot.y}`
        );
      }
    } else {
      assert.equal(entry.oarPivotCount, 0, `${entry.slug} unexpectedly has oar pivots`);
      assert.deepEqual(entry.oarPivotPixels, []);
    }
    if (entry.slug === "joseon-panokseon") {
      assert.equal(entry.lowestOpaqueRelativeToWaterlinePx, 3);
    }
    if (MALAY_WARSHIP_OAR_PIVOT_COUNTS[entry.slug]) {
      assert.equal(
        entry.oarPivotCount,
        MALAY_WARSHIP_OAR_PIVOT_COUNTS[entry.slug],
        `${entry.slug} keeps its simplified representative oar bank`
      );
    }
    if (MEDITERRANEAN_OAR_PIVOT_COUNTS[entry.slug]) {
      assert.equal(
        entry.oarPivotCount,
        MEDITERRANEAN_OAR_PIVOT_COUNTS[entry.slug],
        `${entry.slug} keeps its distinct readable oar bank`
      );
    }
  }
});

test("waterline review includes a non-empty contact sheet", async () => {
  const image = await loadImage(join(reviewRoot, "ship-waterlines-contact-sheet.png"));
  assert.ok(image.width > 192);
  assert.ok(image.height > 104);
});

test("waterline review includes a complete signed depth report", async () => {
  const [report, manifestSource] = await Promise.all([
    readFile(join(reviewRoot, "waterline-depths.md"), "utf8"),
    readFile(join(reviewRoot, "manifest.json"), "utf8")
  ]);
  const manifest = JSON.parse(manifestSource);
  for (const ship of manifest.ships) assert.ok(report.includes(`| ${ship.label} |`));
});
