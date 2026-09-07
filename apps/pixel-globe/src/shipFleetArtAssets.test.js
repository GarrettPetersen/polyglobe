import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas, loadImage } from "../../../examples/globe-demo/node_modules/canvas/index.js";
import { SHIP_STATS } from "./shipStats.js";
import { shipPaintoverQuantizer } from "./shipPaintoverFinishing.js";
import { SHIP_WATERLINE_DEPTH_BYTE } from "./shipWaterline.js";

const appRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const artRoot = join(appRoot, "art/ships/dockside");
const palettes = JSON.parse(readFileSync(join(artRoot, "palettes.json")));

async function imagePixels(path) {
  const image = await loadImage(path);
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0);
  return { width: image.width, rgba: ctx.getImageData(0, 0, image.width, image.height).data };
}

test("fusta's dockside main deck stays above its geometric waterline", async () => {
  const image = await imagePixels(join(appRoot,
    "public/assets/vehicles/unity-ships/port-assault/fusta-city-dockside-sink-depth.png"));
  for (const [x, y] of [[475, 390], [475, 400], [475, 410]]) {
    const offset = (y * image.width + x) * 4;
    assert.equal(image.rgba[offset + 3], 255, `fusta deck sample ${x},${y} disappeared`);
    assert.ok(image.rgba[offset] > SHIP_WATERLINE_DEPTH_BYTE, `fusta deck is submerged at ${x},${y}`);
  }
});

test("ocean dhow retains pale furled cloth on both docked lateen yards", async () => {
  const { sourceFrame } = JSON.parse(readFileSync(join(artRoot, "ocean-dhow-registration.json")));
  const { minX, minY, width, height } = sourceFrame.opaqueBounds;
  const image = await imagePixels(join(artRoot, "ocean-dhow.png"));
  // These separate rig regions exclude the tan deck and each other's cloth.
  // Palette compliance alone allowed an earlier painting to erase both bundles.
  for (const [label, left, top, right, bottom] of [
    ["tall yard", 0, 0, 1, 0.38],
    ["short yard", 0, 0.38, 0.55, 0.77]
  ]) {
    let clothPixels = 0;
    for (let y = minY + Math.floor(top * height); y < minY + Math.floor(bottom * height); y++) {
      for (let x = minX + Math.floor(left * width); x < minX + Math.floor(right * width); x++) {
        const offset = (y * image.width + x) * 4;
        if (image.rgba[offset] === 199 && image.rgba[offset + 1] === 220 &&
            image.rgba[offset + 2] === 208 && image.rgba[offset + 3] === 255) clothPixels++;
      }
    }
    assert.ok(clothPixels >= 20, `ocean dhow ${label}: furled cloth disappeared (${clothPixels} pale pixels)`);
  }
});

test("every hull has a reproducible art source and an explicit cross-size palette", () => {
  assert.equal(palettes.version, 1);
  assert.deepEqual(Object.keys(palettes.ships).sort(), SHIP_STATS.map(ship => ship.slug).sort());
  for (const { slug } of SHIP_STATS) {
    const palette = palettes.ships[slug];
    shipPaintoverQuantizer(palette.dockside);
    shipPaintoverQuantizer(palette.sailing);
    for (const pigment of palette.dockside) assert.ok(palette.sailing.includes(pigment), `${slug} pigment ${pigment}`);
    if (slug === "galleon") continue; // Its approved browser conversion is documented separately.
    const receipt = JSON.parse(readFileSync(join(artRoot, `${slug}-conversion.json`)));
    assert.deepEqual(receipt.palette, palette.dockside);
    for (const [suffix, key] of [[".png", "imageSha256"], ["-paintover-reference.png", "referenceSha256"]]) {
      assert.equal(createHash("sha256").update(readFileSync(join(artRoot, `${slug}${suffix}`))).digest("hex"), receipt[key], `${slug} ${key}`);
    }
  }
});

test("all sailing headings, rowing poses and profiles obey their ship's Resurrect64 palette", async () => {
  const manifest = JSON.parse(readFileSync(join(appRoot, "public/assets/vehicles/unity-ships/manifest.json")));
  for (const ship of manifest.ships) {
    const allowed = new Set(palettes.ships[ship.slug].sailing.map(hex => parseInt(hex, 16)));
    const paths = [ship.files.sheet, ...Object.entries(ship.files)
      .filter(([key]) => key.endsWith("Animation")).flatMap(([, value]) => value)];
    paths.push(`apps/pixel-globe/public/assets/vehicles/unity-ships/side-views/${ship.slug}.png`);
    for (const path of paths) {
      const { rgba } = await imagePixels(join(appRoot, "../..", path));
      for (let offset = 0; offset < rgba.length; offset += 4) {
        const alpha = rgba[offset + 3];
        if (alpha === 0) continue;
        if (alpha !== 255 || !allowed.has(rgba[offset] * 65536 + rgba[offset + 1] * 256 + rgba[offset + 2])) {
          assert.fail(`${path}: non-binary alpha or unregistered pigment at pixel ${offset / 4}`);
        }
      }
    }
  }
});
