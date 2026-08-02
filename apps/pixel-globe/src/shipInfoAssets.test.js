import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createCanvas, loadImage } from "../../../examples/globe-demo/node_modules/canvas/index.js";
import { MODEL_CREDITS } from "./modelCredits.js";
import {
  SHIP_PROPULSION_OAR,
  SHIP_PROPULSION_OAR_SAIL,
  SHIP_STATS
} from "./shipStats.js";
import { RESURRECT_64_HEX } from "./waterLatitudePalette.js";
import {
  SHIP_SHADOW_FRAME_SIZE,
  SHIP_SPRITE_FRAME_SIZE,
  SHIP_SPRITE_HEADING_SUFFIX,
  SHIP_SPRITE_HEADINGS,
  SHIP_SPRITE_SHEET_COLS,
  SHIP_SPRITE_SHEET_HEIGHT,
  SHIP_SPRITE_SHEET_WIDTH
} from "./shipSpriteLayout.js";
import { validateShipFootprintBake } from "./shipFootprint.js";
import { validateShipFlagAnchorBake } from "./shipFlagAnchors.js";
import { SHIP_ROWING_FRAME_COUNT } from "./shipRowingAnimation.js";
import {
  SHIP_WATERLINE_DEPTH_BYTE,
  SHIP_WATERLINE_LEVEL,
  floatingShipSubmergedPixelKeys
} from "./shipWaterline.js";

const SIDE_VIEW_WIDTH = 192;
const SIDE_VIEW_HEIGHT = 104;
const SHIP_SHEET_WIDTH = SHIP_SPRITE_SHEET_WIDTH;
const SHIP_SHEET_HEIGHT = SHIP_SPRITE_SHEET_HEIGHT;
const SHIP_SHADOW_SHEET_WIDTH = SHIP_SHADOW_FRAME_SIZE * SHIP_SPRITE_SHEET_COLS;
const SHIP_SHADOW_SHEET_HEIGHT = SHIP_SHADOW_FRAME_SIZE * Math.ceil(
  SHIP_SPRITE_HEADINGS / SHIP_SPRITE_SHEET_COLS
) * 2;
const SHIP_LIGHTING_SHEET_HEIGHT = SHIP_SHEET_HEIGHT * 2;
const sideViewRoot = join(dirname(fileURLToPath(import.meta.url)), "../public/assets/vehicles/unity-ships/side-views");
const shipAssetRoot = dirname(sideViewRoot);
const NATIVE_BOAT_SLUGS = Object.freeze([
  "polynesian-voyaging-canoe",
  "mesoamerican-dugout-canoe"
]);
const MEDITERRANEAN_GALLEY_SLUG = "mediterranean-galley";
const MESOAMERICAN_CANOE_SLUG = "mesoamerican-dugout-canoe";
const VIKING_LONGSHIP_SLUG = "viking-longship";
const JOSEON_TURTLE_SHIP_SLUG = "joseon-turtle-ship";
const JOSEON_PANOKSEON_SLUG = "joseon-panokseon";
const JAPANESE_ATAKEBUNE_SLUG = "japanese-atakebune";
const JAPANESE_KURIBUNE_SLUG = "japanese-kuribune";
const JAPANESE_KOBAYA_SLUG = "japanese-kobaya";
const JAPANESE_SEKIBUNE_SLUG = "japanese-sekibune";
const SPANISH_NAO_SLUG = "spanish-nao";
const PORTUGUESE_CARRACK_SLUG = "portuguese-carrack";
const DHOW_SLUG = "dhow";
const OCEAN_DHOW_SLUG = "ocean-dhow";
const GALLEON_SLUG = "galleon";
const NUSANTARAN_OUTRIGGER_SLUG = "nusantaran-outrigger";
const KELULUS_SLUG = "kelulus";
const PROCEDURAL_MALAY_WARSHIP_SLUGS = Object.freeze([
  "penjajap",
  "lancaran",
  "royal-lancaran"
]);
const OTTOMAN_COASTAL_TRADER_SLUG = "ottoman-coastal-trader";

function headingAssetFile(slug, suffix = "") {
  return `${slug}-${SHIP_SPRITE_HEADING_SUFFIX}${suffix}.png`;
}

function rowingHeadingAssetFile(slug, frameIndex, suffix = "") {
  return `${slug}-rowing-${frameIndex}-${SHIP_SPRITE_HEADING_SUFFIX}${suffix}.png`;
}

test("ship sprites provide 32 discrete headings at 11.25 degree intervals", () => {
  assert.equal(SHIP_SPRITE_HEADINGS, 32);
  assert.equal(SHIP_SPRITE_HEADING_SUFFIX, "32-headings");
  assert.equal(360 / SHIP_SPRITE_HEADINGS, 11.25);
});

test("the runtime fleet contains no legacy heading sheets", async () => {
  const files = await readdir(shipAssetRoot);
  assert.ok(files.some((file) => file.includes(`-${SHIP_SPRITE_HEADING_SUFFIX}`)));
  assert.deepEqual(files.filter((file) => file.includes("-16-headings")), []);
});

test("every runtime ship model has a registered attribution", async () => {
  const manifest = JSON.parse(await readFile(join(shipAssetRoot, "manifest.json"), "utf8"));
  const registeredCredits = new Set(MODEL_CREDITS.map(modelCreditKey));

  for (const entry of manifest.ships) {
    assert.equal("sailRecolor" in entry, false, `${entry.slug} preserves authored model colors`);
    assert.ok(entry.creator, `${entry.slug} creator`);
    assert.ok(entry.license, `${entry.slug} license`);
    assert.ok(entry.sourceTitle, `${entry.slug} source title`);
    assert.ok(
      registeredCredits.has(modelCreditKey(entry)),
      `${entry.slug} model attribution is registered in the credits`
    );
    assert.doesNotMatch(JSON.stringify(entry), /https?:\/\//);
  }
});

test("every oar-capable hull and only those hulls have rowing animation", async () => {
  const manifest = JSON.parse(await readFile(join(shipAssetRoot, "manifest.json"), "utf8"));
  const expected = SHIP_STATS
    .filter((stats) => (
      stats.propulsion === SHIP_PROPULSION_OAR || stats.propulsion === SHIP_PROPULSION_OAR_SAIL
    ))
    .map((stats) => stats.slug)
    .sort();
  const animated = manifest.ships
    .filter((entry) => Array.isArray(entry.files?.rowingAnimation))
    .map((entry) => entry.slug)
    .sort();

  assert.deepEqual(animated, expected);
});

test("rowing power strokes put oar blades into the refracted water layer", async () => {
  const manifest = JSON.parse(await readFile(join(shipAssetRoot, "manifest.json"), "utf8"));
  const animated = manifest.ships.filter((entry) => Array.isArray(entry.files?.rowingAnimation));

  for (const entry of animated) {
    const submergedByAnimationFrame = [];
    for (let animationFrame = 0; animationFrame < SHIP_ROWING_FRAME_COUNT; animationFrame++) {
      const [sprite, sinkDepth] = await Promise.all([
        loadImage(join(shipAssetRoot, basename(entry.files.rowingAnimation[animationFrame]))),
        loadImage(join(shipAssetRoot, basename(entry.files.rowingSinkDepth[animationFrame])))
      ]);
      const spritePixels = imagePixels(sprite);
      const sinkPixels = imagePixels(sinkDepth);
      let submergedPixels = 0;
      for (let heading = 0; heading < SHIP_SPRITE_HEADINGS; heading++) {
        const originX = heading % SHIP_SPRITE_SHEET_COLS * SHIP_SPRITE_FRAME_SIZE;
        const originY = Math.floor(heading / SHIP_SPRITE_SHEET_COLS) * SHIP_SPRITE_FRAME_SIZE;
        const pixels = [];
        for (let y = 0; y < SHIP_SPRITE_FRAME_SIZE; y++) {
          for (let x = 0; x < SHIP_SPRITE_FRAME_SIZE; x++) {
            const offset = ((originX + x) + (originY + y) * sprite.width) * 4;
            if (spritePixels[offset + 3] === 0) continue;
            pixels.push({ x, y, sinkHeight: sinkPixels[offset] / 255 });
          }
        }
        submergedPixels += floatingShipSubmergedPixelKeys(
          pixels,
          SHIP_SPRITE_FRAME_SIZE
        ).size;
      }
      submergedByAnimationFrame.push(submergedPixels);
    }

    const raisedRecovery = submergedByAnimationFrame[0] + submergedByAnimationFrame[5];
    const submergedPower = submergedByAnimationFrame[2] + submergedByAnimationFrame[3];
    assert.ok(
      submergedPower > raisedRecovery,
      `${entry.slug} power stroke must refract more oar pixels than its raised recovery: ` +
      `${submergedByAnimationFrame.join(",")}`
    );
  }
});

test("every roster ship has a hull footprint for every sprite heading", async () => {
  const bake = JSON.parse(await readFile(join(shipAssetRoot, "hull-footprints.json"), "utf8"));
  const footprints = validateShipFootprintBake(
    bake,
    SHIP_SPRITE_FRAME_SIZE,
    SHIP_SPRITE_HEADINGS,
    SHIP_STATS.map((entry) => entry.slug)
  );
  assert.equal(footprints.size, SHIP_STATS.length);
  for (const [slug, frames] of footprints) {
    assert.equal(frames.length, SHIP_SPRITE_HEADINGS, `${slug} heading footprint count`);
    assert.ok(frames.every((frame) => frame.polygon.length >= 3), `${slug} polygon geometry`);
    assert.ok(frames.every((frame) => frame.samples.length >= 3), `${slug} terrain samples`);
  }
});

test("every roster ship flag is anchored to one model point across all headings", async () => {
  const manifest = JSON.parse(await readFile(join(shipAssetRoot, "manifest.json"), "utf8"));
  const bake = JSON.parse(await readFile(join(shipAssetRoot, "flag-anchors.json"), "utf8"));
  const rowingFramesBySlug = new Map(manifest.ships.map((entry) => [
    entry.slug,
    entry.files.rowingAnimation?.length || 0
  ]));
  const anchorsBySlug = validateShipFlagAnchorBake(
    bake,
    SHIP_SPRITE_FRAME_SIZE,
    SHIP_SPRITE_HEADINGS,
    rowingFramesBySlug
  );

  for (const entry of manifest.ships) {
    assert.equal(
      entry.flagAnchorSelection,
      "highest-model-point-aftmost-tiebreak",
      `${entry.slug} flag anchor selection`
    );
    assert.ok(
      [entry.flagAnchorModelPoint?.x, entry.flagAnchorModelPoint?.y, entry.flagAnchorModelPoint?.z]
        .every(Number.isFinite),
      `${entry.slug} canonical flag model point`
    );
    const image = await loadImage(join(shipAssetRoot, basename(entry.files.sheet)));
    const pixels = imagePixels(image);
    for (let frame = 0; frame < SHIP_SPRITE_HEADINGS; frame++) {
      const anchor = anchorsBySlug.get(entry.slug).base[frame];
      const originX = frame % SHIP_SPRITE_SHEET_COLS * SHIP_SPRITE_FRAME_SIZE;
      const originY = Math.floor(frame / SHIP_SPRITE_SHEET_COLS) * SHIP_SPRITE_FRAME_SIZE;
      const alpha = pixels[
        ((originX + anchor.x) + (originY + anchor.y) * image.width) * 4 + 3
      ];
      assert.ok(alpha > 0, `${entry.slug} frame ${frame} flag anchor touches the ship`);
    }

    for (let rowingFrameIndex = 0; rowingFrameIndex < (entry.files.rowingAnimation?.length || 0); rowingFrameIndex++) {
      const rowingPath = entry.files.rowingAnimation[rowingFrameIndex];
      const rowingImage = await loadImage(join(shipAssetRoot, basename(rowingPath)));
      const rowingPixels = imagePixels(rowingImage);
      for (let frame = 0; frame < SHIP_SPRITE_HEADINGS; frame++) {
        const anchor = anchorsBySlug.get(entry.slug).rowing[rowingFrameIndex][frame];
        const originX = frame % SHIP_SPRITE_SHEET_COLS * SHIP_SPRITE_FRAME_SIZE;
        const originY = Math.floor(frame / SHIP_SPRITE_SHEET_COLS) * SHIP_SPRITE_FRAME_SIZE;
        const anchorAlpha = rowingPixels[
          ((originX + anchor.x) + (originY + anchor.y) * rowingImage.width) * 4 + 3
        ];
        assert.ok(
          anchorAlpha > 0,
          `${entry.slug} rowing frame ${rowingFrameIndex} heading ${frame} flag anchor touches the ship`
        );
      }
    }
  }
});

test("every ship sprite and rowing frame has an exact per-pixel model-height bake", async () => {
  const manifest = JSON.parse(await readFile(join(shipAssetRoot, "manifest.json"), "utf8"));

  for (const entry of manifest.ships) {
    const expectedHullCount = entry.slug === "polynesian-voyaging-canoe"
      ? 2
      : 1;
    assert.equal(
      entry.waterlineSlice?.expectedHullCount,
      expectedHullCount,
      `${entry.slug} declared waterline hull count`
    );
    assert.ok(
      entry.waterlineSlice.componentCount >= expectedHullCount,
      `${entry.slug} waterline component count`
    );
    assert.ok(
      entry.waterlineSlice.dominantLengthRatio >= 0.68,
      `${entry.slug} dominant connected waterline shape`
    );
    assert.equal(entry.sinkHeightBins, 256, `${entry.slug} sink height bins`);
    assert.ok(entry.sinkHeightMin < entry.sinkHeightMax, `${entry.slug} sink height range`);
    assert.ok(
      entry.sinkWaterlineLevel >= 0 && entry.sinkWaterlineLevel <= 1,
      `${entry.slug} sink waterline level`
    );
    assert.ok(entry.files?.sinkDepth, `${entry.slug} sink-depth asset`);
    assert.ok(
      Math.abs(entry.sinkWaterlineLevel - SHIP_WATERLINE_LEVEL) < 1e-6,
      `${entry.slug} waterline level`
    );
    await assertSinkDepthPair(entry.files.sheet, entry.files.sinkDepth, entry.slug);

    const rowingAnimation = entry.files.rowingAnimation;
    const rowingSinkDepth = entry.files.rowingSinkDepth;
    if (!rowingAnimation) {
      assert.equal(rowingSinkDepth, undefined, `${entry.slug} has no orphan rowing sink-depth assets`);
      continue;
    }
    assert.ok(Array.isArray(rowingSinkDepth), `${entry.slug} rowing sink-depth list`);
    assert.equal(rowingSinkDepth.length, rowingAnimation.length, `${entry.slug} rowing sink-depth count`);
    for (let frameIndex = 0; frameIndex < rowingAnimation.length; frameIndex++) {
      await assertSinkDepthPair(
        rowingAnimation[frameIndex],
        rowingSinkDepth[frameIndex],
        `${entry.slug} rowing frame ${frameIndex}`
      );
    }
  }
});

test("every roster ship has a clipped-safe Resurrect side-view sprite", async () => {
  const manifest = JSON.parse(await readFile(join(sideViewRoot, "manifest.json"), "utf8"));
  assert.equal(manifest.palette, "Resurrect 64");
  assert.equal(manifest.width, SIDE_VIEW_WIDTH);
  assert.equal(manifest.height, SIDE_VIEW_HEIGHT);
  assert.deepEqual(
    manifest.ships.map((entry) => entry.slug).sort(),
    SHIP_STATS.map((entry) => entry.slug).sort()
  );

  const palette = new Set(RESURRECT_64_HEX);
  for (const entry of manifest.ships) {
    const image = await loadImage(join(sideViewRoot, `${entry.slug}.png`));
    assert.equal(image.width, SIDE_VIEW_WIDTH, `${entry.slug} width`);
    assert.equal(image.height, SIDE_VIEW_HEIGHT, `${entry.slug} height`);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0);
    const pixels = ctx.getImageData(0, 0, image.width, image.height).data;
    let opaquePixels = 0;
    for (let offset = 0; offset < pixels.length; offset += 4) {
      if (pixels[offset + 3] === 0) continue;
      assert.equal(pixels[offset + 3], 255, `${entry.slug} has partial alpha`);
      const hex = [pixels[offset], pixels[offset + 1], pixels[offset + 2]]
        .map((value) => value.toString(16).padStart(2, "0"))
        .join("");
      assert.ok(palette.has(hex), `${entry.slug} contains non-Resurrect color #${hex}`);
      opaquePixels += 1;
    }
    assert.ok(opaquePixels > 0, `${entry.slug} side view is blank`);
  }
});

test("native boat models provide complete sprite and wake bakes for every heading", async () => {
  const manifest = JSON.parse(await readFile(join(shipAssetRoot, "manifest.json"), "utf8"));
  const wakeAnchors = JSON.parse(await readFile(join(shipAssetRoot, "wake-anchors.json"), "utf8"));
  const expectedAssets = [
    ["", SHIP_SHEET_WIDTH, SHIP_SHEET_HEIGHT],
    ["-sink-depth", SHIP_SHEET_WIDTH, SHIP_SHEET_HEIGHT],
    ["-light", SHIP_SHEET_WIDTH, SHIP_LIGHTING_SHEET_HEIGHT],
    ["-shade", SHIP_SHEET_WIDTH, SHIP_LIGHTING_SHEET_HEIGHT],
    ["-shadow", SHIP_SHADOW_SHEET_WIDTH, SHIP_SHADOW_SHEET_HEIGHT]
  ];

  for (const slug of NATIVE_BOAT_SLUGS) {
    const entry = manifest.ships.find((ship) => ship.slug === slug);
    assert.ok(entry, `${slug} manifest entry`);
    assert.ok(entry.creator, `${slug} creator`);
    assert.ok(entry.license, `${slug} license`);
    assert.ok(entry.sourceTitle, `${slug} source title`);
    assert.doesNotMatch(JSON.stringify(entry), /https?:\/\//);
    assert.equal(wakeAnchors.ships[slug].length, SHIP_SPRITE_HEADINGS, `${slug} wake headings`);

    for (const [suffix, width, height] of expectedAssets) {
      const image = await loadImage(join(shipAssetRoot, headingAssetFile(slug, suffix)));
      assert.equal(image.width, width, `${slug}${suffix} width`);
      assert.equal(image.height, height, `${slug}${suffix} height`);
      assert.ok(opaquePixelCount(image) > 0, `${slug}${suffix} is blank`);
    }
  }
});

test("the floating Lateen Barque keeps enclosed low hull pixels waterproof", async () => {
  const [sprite, sinkDepth] = await Promise.all([
    loadImage(join(shipAssetRoot, headingAssetFile("ketch"))),
    loadImage(join(shipAssetRoot, headingAssetFile("ketch", "-sink-depth")))
  ]);
  const spritePixels = imagePixels(sprite);
  const sinkPixels = imagePixels(sinkDepth);
  let enclosedLowPixels = 0;
  let exteriorSubmergedPixels = 0;

  for (let frame = 0; frame < SHIP_SPRITE_HEADINGS; frame++) {
    const originX = frame % SHIP_SPRITE_SHEET_COLS * SHIP_SPRITE_FRAME_SIZE;
    const originY = Math.floor(frame / SHIP_SPRITE_SHEET_COLS) * SHIP_SPRITE_FRAME_SIZE;
    const pixels = [];
    let rawLowPixels = 0;
    for (let y = 0; y < SHIP_SPRITE_FRAME_SIZE; y++) {
      for (let x = 0; x < SHIP_SPRITE_FRAME_SIZE; x++) {
        const offset = ((originX + x) + (originY + y) * sprite.width) * 4;
        if (spritePixels[offset + 3] === 0) continue;
        const sinkHeight = sinkPixels[offset] / 255;
        if (sinkHeight <= SHIP_WATERLINE_LEVEL) rawLowPixels++;
        pixels.push({ x, y, sinkHeight });
      }
    }
    const exterior = floatingShipSubmergedPixelKeys(pixels, SHIP_SPRITE_FRAME_SIZE);
    exteriorSubmergedPixels += exterior.size;
    enclosedLowPixels += rawLowPixels - exterior.size;
  }

  assert.ok(exteriorSubmergedPixels > 0, "Lateen Barque has no exterior submerged hull");
  assert.ok(enclosedLowPixels > 0, "Lateen Barque has no enclosed low pixels to keep dry");
});

test("the Mediterranean galley provides licensed rowing animation frames", async () => {
  const manifest = JSON.parse(await readFile(join(shipAssetRoot, "manifest.json"), "utf8"));
  const wakeAnchors = JSON.parse(await readFile(join(shipAssetRoot, "wake-anchors.json"), "utf8"));
  const entry = manifest.ships.find((ship) => ship.slug === MEDITERRANEAN_GALLEY_SLUG);

  assert.ok(entry, "Mediterranean galley manifest entry");
  assert.equal(entry.creator, "Museovirasto Museiverket Finnish Heritage Agency");
  assert.equal(entry.license, "CC BY 4.0");
  assert.equal(entry.sourceTitle, "Russian 22-bank Baltic galley");
  assert.doesNotMatch(JSON.stringify(entry), /https?:\/\//);
  assert.equal(wakeAnchors.ships[MEDITERRANEAN_GALLEY_SLUG].length, SHIP_SPRITE_HEADINGS);
  assert.equal(entry.files.rowingAnimation.length, SHIP_ROWING_FRAME_COUNT);

  for (let frameIndex = 0; frameIndex < SHIP_ROWING_FRAME_COUNT; frameIndex++) {
    const image = await loadImage(join(
      shipAssetRoot,
      rowingHeadingAssetFile(MEDITERRANEAN_GALLEY_SLUG, frameIndex)
    ));
    assert.equal(image.width, SHIP_SHEET_WIDTH, `rowing frame ${frameIndex} width`);
    assert.equal(image.height, SHIP_SHEET_HEIGHT, `rowing frame ${frameIndex} height`);
    assert.ok(opaquePixelCount(image) > 0, `rowing frame ${frameIndex} is blank`);
  }
});

test("the Viking longship keeps its authored colored sail and provides six working oar phases", async () => {
  const manifest = JSON.parse(await readFile(join(shipAssetRoot, "manifest.json"), "utf8"));
  const entry = manifest.ships.find((ship) => ship.slug === VIKING_LONGSHIP_SLUG);

  assert.ok(entry, "Viking longship manifest entry");
  assert.match(entry.sourceModel, /viking ship 1\.fbx$/);
  assert.equal(entry.files.rowingAnimation.length, SHIP_ROWING_FRAME_COUNT);
  const frames = [];
  for (let frameIndex = 0; frameIndex < SHIP_ROWING_FRAME_COUNT; frameIndex++) {
    const path = join(
      shipAssetRoot,
      rowingHeadingAssetFile(VIKING_LONGSHIP_SLUG, frameIndex)
    );
    const image = await loadImage(path);
    assert.equal(image.width, SHIP_SHEET_WIDTH, `longship rowing frame ${frameIndex} width`);
    assert.equal(image.height, SHIP_SHEET_HEIGHT, `longship rowing frame ${frameIndex} height`);
    assert.ok(opaquePixelCount(image) > 0, `longship rowing frame ${frameIndex} is blank`);
    frames.push(await readFile(path));
  }
  assert.equal(new Set(frames.map((buffer) => buffer.toString("base64"))).size, SHIP_ROWING_FRAME_COUNT);
});

test("the Joseon turtle ship has credited art and six working oar phases", async () => {
  const manifest = JSON.parse(await readFile(join(shipAssetRoot, "manifest.json"), "utf8"));
  const entry = manifest.ships.find((ship) => ship.slug === JOSEON_TURTLE_SHIP_SLUG);

  assert.ok(entry, "Joseon turtle ship manifest entry");
  assert.equal(entry.creator, "KargaEntiti");
  assert.equal(entry.license, "CC BY 4.0");
  assert.equal(entry.sourceTitle, "Geobukseon (Turtle Ship)");
  assert.match(entry.sourceModel, /joseon-turtle-ship\/scene\.gltf$/);
  assert.equal(entry.files.rowingAnimation.length, SHIP_ROWING_FRAME_COUNT);
  const frames = [];
  for (let frameIndex = 0; frameIndex < SHIP_ROWING_FRAME_COUNT; frameIndex++) {
    const path = join(
      shipAssetRoot,
      rowingHeadingAssetFile(JOSEON_TURTLE_SHIP_SLUG, frameIndex)
    );
    const image = await loadImage(path);
    assert.equal(image.width, SHIP_SHEET_WIDTH, `turtle ship rowing frame ${frameIndex} width`);
    assert.equal(image.height, SHIP_SHEET_HEIGHT, `turtle ship rowing frame ${frameIndex} height`);
    assert.ok(opaquePixelCount(image) > 0, `turtle ship rowing frame ${frameIndex} is blank`);
    frames.push(await readFile(path));
  }
  assert.equal(new Set(frames.map((buffer) => buffer.toString("base64"))).size, SHIP_ROWING_FRAME_COUNT);
});

test("the Joseon Panokseon replaces its static paddles with six working phases", async () => {
  const manifest = JSON.parse(await readFile(join(shipAssetRoot, "manifest.json"), "utf8"));
  const entry = manifest.ships.find((ship) => ship.slug === JOSEON_PANOKSEON_SLUG);

  assert.ok(entry, "Joseon Panokseon manifest entry");
  assert.equal(entry.creator, "Heat Of Fusion, with JJakgwi");
  assert.equal(entry.license, "CC BY 4.0");
  assert.equal(entry.sourceTitle, "Panok ship (Panokseon) | 판옥선 | 板屋船");
  assert.match(entry.sourceModel, /joseon-panokseon\/scene\.gltf$/);
  assert.deepEqual(entry.removedSourceMeshes, [{
    nodeName: "Object_9",
    parentName: "Object_4",
    positionCount: 2544
  }]);
  const sideView = await loadImage(join(sideViewRoot, `${JOSEON_PANOKSEON_SLUG}.png`));
  const sideViewBounds = opaqueImageBounds(sideView);
  assert.ok(
    sideViewBounds.width > sideViewBounds.height,
    "Panokseon hull must remain horizontal rather than standing on its stern"
  );
  assert.equal(entry.files.rowingAnimation.length, SHIP_ROWING_FRAME_COUNT);
  const frames = [];
  for (let frameIndex = 0; frameIndex < SHIP_ROWING_FRAME_COUNT; frameIndex++) {
    const path = join(
      shipAssetRoot,
      rowingHeadingAssetFile(JOSEON_PANOKSEON_SLUG, frameIndex)
    );
    const image = await loadImage(path);
    assert.equal(image.width, SHIP_SHEET_WIDTH, `Panokseon rowing frame ${frameIndex} width`);
    assert.equal(image.height, SHIP_SHEET_HEIGHT, `Panokseon rowing frame ${frameIndex} height`);
    assert.ok(opaquePixelCount(image) > 0, `Panokseon rowing frame ${frameIndex} is blank`);
    frames.push(await readFile(path));
  }
  assert.equal(new Set(frames.map((buffer) => buffer.toString("base64"))).size, SHIP_ROWING_FRAME_COUNT);
});

test("the Japanese Atakebune replaces its static oars with six working phases", async () => {
  const manifest = JSON.parse(await readFile(join(shipAssetRoot, "manifest.json"), "utf8"));
  const entry = manifest.ships.find((ship) => ship.slug === JAPANESE_ATAKEBUNE_SLUG);

  assert.ok(entry, "Japanese Atakebune manifest entry");
  assert.equal(entry.creator, "LukasSI");
  assert.equal(entry.license, "CC BY 4.0");
  assert.equal(entry.sourceTitle, "Atakebune Japanese Medieval Warship");
  assert.match(entry.sourceModel, /atakebune-japanese-warship\/scene\.gltf$/);
  assert.deepEqual(entry.removedSourceMeshes, [{
    nodeName: "Object_13",
    parentName: "Cube071_3",
    positionCount: 480
  }]);
  assert.equal(entry.files.rowingAnimation.length, SHIP_ROWING_FRAME_COUNT);
  const frames = [];
  for (let frameIndex = 0; frameIndex < SHIP_ROWING_FRAME_COUNT; frameIndex++) {
    const path = join(
      shipAssetRoot,
      rowingHeadingAssetFile(JAPANESE_ATAKEBUNE_SLUG, frameIndex)
    );
    const image = await loadImage(path);
    assert.equal(image.width, SHIP_SHEET_WIDTH, `Atakebune rowing frame ${frameIndex} width`);
    assert.equal(image.height, SHIP_SHEET_HEIGHT, `Atakebune rowing frame ${frameIndex} height`);
    assert.ok(opaquePixelCount(image) > 0, `Atakebune rowing frame ${frameIndex} is blank`);
    frames.push(await readFile(path));
  }
  assert.equal(new Set(frames.map((buffer) => buffer.toString("base64"))).size, SHIP_ROWING_FRAME_COUNT);
});

test("the Umi-bune halves its source oars into four animated oars", async () => {
  const manifest = JSON.parse(await readFile(join(shipAssetRoot, "manifest.json"), "utf8"));
  const entry = manifest.ships.find((ship) => ship.slug === JAPANESE_KURIBUNE_SLUG);

  assert.ok(entry, "Umi-bune manifest entry");
  assert.equal(entry.creator, "urszulaczyz");
  assert.equal(entry.license, "CC BY 4.0");
  assert.equal(entry.sourceTitle, "Kamakura Period Umi-Bune Japanese Boat");
  assert.match(entry.sourceModel, /kamakura-umi-bune\/scene\.gltf$/);
  assert.deepEqual(
    entry.removedSourceMeshes.map(({ nodeName }) => nodeName),
    Array.from({ length: 8 }, (_, index) => (
      `Box${String(index + 6).padStart(3, "0")}_DarkWood_0`
    ))
  );
  assert.equal(entry.animatedOarCount, 4);
  assert.equal(entry.files.rowingAnimation.length, SHIP_ROWING_FRAME_COUNT);
  assert.equal(entry.sourceOrientation.rawUpAxis, "+Y");
  assert.equal(entry.sourceOrientation.rawForwardAxis, "local -X");
});

test("the Kobaya replaces its source bank with eight attached animated oars", async () => {
  const manifest = JSON.parse(await readFile(join(shipAssetRoot, "manifest.json"), "utf8"));
  const entry = manifest.ships.find((ship) => ship.slug === JAPANESE_KOBAYA_SLUG);

  assert.ok(entry, "Kobaya manifest entry");
  assert.equal(entry.creator, "HIROKAZU KOBAYASHI");
  assert.equal(entry.license, "BOOTH commercial-use license");
  assert.equal(entry.sourceTitle, "Japanese Boat: Kobaya 3D Model");
  assert.match(entry.sourceModel, /hirokazu-kobayashi-kobaya\/kobaya-v1\.2\.fbx$/);
  assert.equal(entry.removedSourceMeshes.length, 20);
  assert.equal(new Set(entry.removedSourceMeshes.map(({ nodeName }) => nodeName)).size, 20);
  assert.equal(entry.animatedOarCount, 8);
  assert.equal(entry.files.rowingAnimation.length, SHIP_ROWING_FRAME_COUNT);
  assert.equal(entry.sourceOrientation.rawUpAxis, "+Y");
  assert.equal(entry.sourceOrientation.rawForwardAxis, "-X");

  const sideView = await loadImage(join(sideViewRoot, `${JAPANESE_KOBAYA_SLUG}.png`));
  const sideViewBounds = opaqueImageBounds(sideView);
  assert.ok(sideViewBounds.width > sideViewBounds.height, "Kobaya keel must remain below its deck");
});

test("the Sekibune replaces its dense source bank with 10 attached animated oars", async () => {
  const manifest = JSON.parse(await readFile(join(shipAssetRoot, "manifest.json"), "utf8"));
  const entry = manifest.ships.find((ship) => ship.slug === JAPANESE_SEKIBUNE_SLUG);

  assert.ok(entry, "Sekibune manifest entry");
  assert.equal(entry.creator, "HIROKAZU KOBAYASHI");
  assert.equal(entry.license, "BOOTH commercial-use license");
  assert.equal(entry.sourceTitle, "Japanese Boat: Sekibune 3D Model");
  assert.match(entry.sourceModel, /hirokazu-kobayashi-sekibune\/sekibune-v1\.2\.fbx$/);
  assert.equal(entry.removedSourceMeshes.length, 64);
  assert.equal(new Set(entry.removedSourceMeshes.map(({ nodeName }) => nodeName)).size, 64);
  assert.equal(entry.animatedOarCount, 10);
  assert.equal(entry.files.rowingAnimation.length, SHIP_ROWING_FRAME_COUNT);
  assert.equal(entry.sourceOrientation.rawUpAxis, "+Y");
  assert.equal(entry.sourceOrientation.rawForwardAxis, "-X");

  const sideView = await loadImage(join(sideViewRoot, `${JAPANESE_SEKIBUNE_SLUG}.png`));
  const sideViewBounds = opaqueImageBounds(sideView);
  assert.ok(sideViewBounds.width > sideViewBounds.height, "Sekibune keel must remain below its deck");
});

test("the Spanish Nao uses the credited Nao Victoria source at an intermediate carrack scale", async () => {
  const manifest = JSON.parse(await readFile(join(shipAssetRoot, "manifest.json"), "utf8"));
  const entry = manifest.ships.find((ship) => ship.slug === SPANISH_NAO_SLUG);

  assert.ok(entry, "Spanish Nao manifest entry");
  assert.equal(entry.creator, "Javier López Cuadrado");
  assert.equal(entry.license, "CC BY 4.0");
  assert.equal(entry.sourceTitle, "Nao Victoria Galleon Ship");
  assert.match(entry.sourceModel, /nao-victoria\/scene\.gltf$/);
  assert.equal(entry.files.rowingAnimation, undefined);

  const dimensions = {};
  for (const slug of ["square-rigged-caravel", SPANISH_NAO_SLUG, "carrack"]) {
    dimensions[slug] = maxOpaqueFrameDimension(await loadImage(join(shipAssetRoot, headingAssetFile(slug))));
  }
  assert.ok(dimensions[SPANISH_NAO_SLUG] > dimensions["square-rigged-caravel"]);
  assert.ok(dimensions[SPANISH_NAO_SLUG] < dimensions.carrack);
});

test("the Portuguese Carrack uses its credited model and large period rig", async () => {
  const manifest = JSON.parse(await readFile(join(shipAssetRoot, "manifest.json"), "utf8"));
  const entry = manifest.ships.find((ship) => ship.slug === PORTUGUESE_CARRACK_SLUG);

  assert.ok(entry, "Portuguese Carrack manifest entry");
  assert.equal(entry.creator, "gogiart");
  assert.equal(entry.license, "CC BY 4.0");
  assert.equal(entry.sourceTitle, "Portuguese Carrack");
  assert.match(entry.sourceModel, /portuguese-carrack\/scene\.gltf$/);
  assert.equal(entry.files.rowingAnimation, undefined);

  const dimensions = {};
  for (const slug of [SPANISH_NAO_SLUG, PORTUGUESE_CARRACK_SLUG]) {
    dimensions[slug] = maxOpaqueFrameDimension(await loadImage(join(shipAssetRoot, headingAssetFile(slug))));
  }
  assert.ok(dimensions[PORTUGUESE_CARRACK_SLUG] > dimensions[SPANISH_NAO_SLUG]);
});

test("the Dhow uses the credited purpose-built source model", async () => {
  const manifest = JSON.parse(await readFile(join(shipAssetRoot, "manifest.json"), "utf8"));
  const entry = manifest.ships.find((ship) => ship.slug === DHOW_SLUG);

  assert.ok(entry, "Dhow manifest entry");
  assert.equal(entry.creator, "gogiart");
  assert.equal(entry.license, "CC BY 4.0");
  assert.equal(entry.sourceTitle, "Dhow");
  assert.match(entry.sourceModel, /dhow-gogiart\/scene\.gltf$/);
  assert.equal(entry.files.rowingAnimation, undefined);

  const dimensions = {};
  for (const slug of ["fishing-lugger", DHOW_SLUG, "xebec"]) {
    dimensions[slug] = maxOpaqueFrameDimension(await loadImage(join(shipAssetRoot, headingAssetFile(slug))));
  }
  assert.ok(dimensions[DHOW_SLUG] <= dimensions["fishing-lugger"]);
  assert.ok(dimensions[DHOW_SLUG] < dimensions.xebec);
});

test("the Ocean Dhow bake records and follows its reviewed cardinal orientation", async () => {
  const [manifest, wakeBake, orientationReview] = await Promise.all([
    readFile(join(shipAssetRoot, "manifest.json"), "utf8").then(JSON.parse),
    readFile(join(shipAssetRoot, "wake-anchors.json"), "utf8").then(JSON.parse),
    loadImage(join(
      dirname(fileURLToPath(import.meta.url)),
      "../docs/ship-reference/ocean-dhow-orientation-review.png"
    ))
  ]);
  const entry = manifest.ships.find((ship) => ship.slug === OCEAN_DHOW_SLUG);
  const wakes = wakeBake.ships[OCEAN_DHOW_SLUG];

  assert.ok(entry, "Ocean Dhow manifest entry");
  assert.equal(entry.sourceOrientation.rawUpAxis, "+Z");
  assert.equal(entry.sourceOrientation.rawForwardAxis, "+X");
  assert.equal(entry.sourceOrientation.importedSceneForward.length, 3);
  assert.equal(orientationReview.width, SHIP_SPRITE_FRAME_SIZE * 6 * 2);
  assert.equal(orientationReview.height, (SHIP_SPRITE_FRAME_SIZE * 6 + 34) * 2);
  assert.equal(wakes.length, SHIP_SPRITE_HEADINGS);
  assert.ok(wakes[0].stern.x < 0, "right-facing ship keeps its stern on the left");
  assert.ok(wakes[8].stern.y > wakes[8].positiveShoulder.y, "away-facing ship trails downward");
  assert.ok(wakes[16].stern.x > 0, "left-facing ship keeps its stern on the right");
  assert.ok(wakes[24].stern.y < wakes[24].positiveShoulder.y, "toward-facing ship trails upward");
});

test("the Small Cog reads as a roundship rather than a rowboat", async () => {
  const [smallCog, dugoutCanoe, smallJunk, xebec] = await Promise.all([
    loadImage(join(shipAssetRoot, headingAssetFile("small-cog"))),
    loadImage(join(shipAssetRoot, headingAssetFile(MESOAMERICAN_CANOE_SLUG))),
    loadImage(join(shipAssetRoot, headingAssetFile("small-junk"))),
    loadImage(join(shipAssetRoot, headingAssetFile("xebec")))
  ]);

  assert.ok(opaquePixelCount(smallCog) > opaquePixelCount(dugoutCanoe));
  assert.ok(maxOpaqueFrameDimension(smallCog) < maxOpaqueFrameDimension(smallJunk));
  assert.ok(maxOpaqueFrameDimension(smallCog) < maxOpaqueFrameDimension(xebec));
});

test("low-capacity Unity coastal craft remain in the small visual tier", async () => {
  const manifest = JSON.parse(await readFile(join(shipAssetRoot, "manifest.json"), "utf8"));
  const targetMaxDim = Object.fromEntries(manifest.ships.map((entry) => [entry.slug, entry.targetModelMaxDim]));
  assert.equal(targetMaxDim.felucca, 0.98);
  assert.equal(targetMaxDim.cutter, 1.2);
  assert.equal(targetMaxDim["small-cog"], 1.3);

  const [felucca, cutter, smallCog, ketch] = await Promise.all([
    loadImage(join(shipAssetRoot, headingAssetFile("felucca"))),
    loadImage(join(shipAssetRoot, headingAssetFile("cutter"))),
    loadImage(join(shipAssetRoot, headingAssetFile("small-cog"))),
    loadImage(join(shipAssetRoot, headingAssetFile("ketch")))
  ]);
  assert.ok(opaquePixelCount(felucca) < opaquePixelCount(cutter));
  assert.ok(opaquePixelCount(cutter) < opaquePixelCount(ketch));
  assert.ok(maxOpaqueFrameDimension(smallCog) < maxOpaqueFrameDimension(ketch));
});

test("the Galleon uses the credited detailed sailing ship model", async () => {
  const manifest = JSON.parse(await readFile(join(shipAssetRoot, "manifest.json"), "utf8"));
  const entry = manifest.ships.find((ship) => ship.slug === GALLEON_SLUG);

  assert.ok(entry, "Galleon manifest entry");
  assert.equal(entry.creator, "cyc3w");
  assert.equal(entry.license, "CC BY 4.0");
  assert.equal(entry.sourceTitle, "Sailing ship");
  assert.match(entry.sourceModel, /cyc3w-sailing-ship\/scene\.gltf$/);
  assert.equal(entry.files.rowingAnimation, undefined);
});

test("the new regional traders use their credited source models and complete bakes", async () => {
  const manifest = JSON.parse(await readFile(join(shipAssetRoot, "manifest.json"), "utf8"));
  const expected = [
    {
      slug: NUSANTARAN_OUTRIGGER_SLUG,
      creator: "Nisa Nurul Azizah",
      sourceTitle: "Low Poly Borobudur Ship of Sriwijaya",
      sourcePattern: /borobudur-sriwijaya\/scene\.gltf$/
    },
    {
      slug: KELULUS_SLUG,
      creator: "Marque & Reprisal project",
      sourceTitle: "Procedural Kelulus",
      license: "Original project asset",
      sourcePattern: /procedural\/kelulus\/scene\.gltf$/
    },
    ...PROCEDURAL_MALAY_WARSHIP_SLUGS.map((slug) => ({
      slug,
      creator: "Marque & Reprisal project",
      sourceTitle: `Procedural ${slug.split("-").map(titlePart).join(" ")}`,
      license: "Original project asset",
      sourcePattern: new RegExp(`procedural/${slug}/scene\\.gltf$`)
    })),
    {
      slug: OTTOMAN_COASTAL_TRADER_SLUG,
      creator: "Polygora",
      sourceTitle: "Ottoman Coastal Trade Tall Ship 3D Model",
      sourcePattern: /ottoman-coastal-trader\/scene\.gltf$/
    }
  ];

  for (const source of expected) {
    const entry = manifest.ships.find((ship) => ship.slug === source.slug);
    assert.ok(entry, `${source.slug} manifest entry`);
    assert.equal(entry.creator, source.creator);
    assert.equal(entry.sourceTitle, source.sourceTitle);
    assert.equal(entry.license, source.license ?? "CC BY 4.0");
    assert.match(entry.sourceModel, source.sourcePattern);
    if (source.slug === KELULUS_SLUG || PROCEDURAL_MALAY_WARSHIP_SLUGS.includes(source.slug)) {
      assert.equal(entry.files.rowingAnimation.length, SHIP_ROWING_FRAME_COUNT);
    } else {
      assert.equal(entry.files.rowingAnimation, undefined);
    }
    if (source.slug === NUSANTARAN_OUTRIGGER_SLUG) {
      assert.equal(entry.waterlineSlice.expectedHullCount, 1);
      assert.ok(entry.waterlineY < -0.25, "outrigger waterline must stay below its deck and rig");
    }
  }
});

function titlePart(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

test("the Nusantaran outrigger refracts only its lowest exterior hull pixels", async () => {
  const [sprite, sinkDepth] = await Promise.all([
    loadImage(join(shipAssetRoot, headingAssetFile(NUSANTARAN_OUTRIGGER_SLUG))),
    loadImage(join(shipAssetRoot, headingAssetFile(NUSANTARAN_OUTRIGGER_SLUG, "-sink-depth")))
  ]);
  const spritePixels = imagePixels(sprite);
  const sinkPixels = imagePixels(sinkDepth);
  const minimumSubmergedY = Math.floor(SHIP_SPRITE_FRAME_SIZE * 0.45);

  for (let frame = 0; frame < SHIP_SPRITE_HEADINGS; frame++) {
    const originX = frame % SHIP_SPRITE_SHEET_COLS * SHIP_SPRITE_FRAME_SIZE;
    const originY = Math.floor(frame / SHIP_SPRITE_SHEET_COLS) * SHIP_SPRITE_FRAME_SIZE;
    const pixels = [];
    for (let y = 0; y < SHIP_SPRITE_FRAME_SIZE; y++) {
      for (let x = 0; x < SHIP_SPRITE_FRAME_SIZE; x++) {
        const offset = ((originX + x) + (originY + y) * sprite.width) * 4;
        if (spritePixels[offset + 3] === 0) continue;
        pixels.push({ x, y, sinkHeight: sinkPixels[offset] / 255 });
      }
    }
    const submerged = floatingShipSubmergedPixelKeys(pixels, SHIP_SPRITE_FRAME_SIZE);
    assert.ok(submerged.size > 0, `outrigger frame ${frame} has no submerged hull pixels`);
    assert.ok(
      [...submerged].every((key) => Math.floor(key / SHIP_SPRITE_FRAME_SIZE) >= minimumSubmergedY),
      `outrigger frame ${frame} refracts pixels above its lower hull`
    );
  }
});

test("the northwest Dhow frame has no vertical submerged streak through its hull", async () => {
  const [sprite, sinkDepth] = await Promise.all([
    loadImage(join(shipAssetRoot, headingAssetFile("dhow"))),
    loadImage(join(shipAssetRoot, headingAssetFile("dhow", "-sink-depth")))
  ]);
  const spritePixels = imagePixels(sprite);
  const sinkPixels = imagePixels(sinkDepth);
  const frame = 6;
  const originX = frame % SHIP_SPRITE_SHEET_COLS * SHIP_SPRITE_FRAME_SIZE;
  const originY = Math.floor(frame / SHIP_SPRITE_SHEET_COLS) * SHIP_SPRITE_FRAME_SIZE;
  const pixels = [];
  for (let y = 0; y < SHIP_SPRITE_FRAME_SIZE; y++) {
    for (let x = 0; x < SHIP_SPRITE_FRAME_SIZE; x++) {
      const offset = ((originX + x) + (originY + y) * sprite.width) * 4;
      if (spritePixels[offset + 3] === 0) continue;
      pixels.push({ x, y, sinkHeight: sinkPixels[offset] / 255 });
    }
  }

  const submerged = floatingShipSubmergedPixelKeys(pixels, SHIP_SPRITE_FRAME_SIZE);
  const rowsByColumn = new Map();
  for (const key of submerged) {
    const x = key % SHIP_SPRITE_FRAME_SIZE;
    const y = Math.floor(key / SHIP_SPRITE_FRAME_SIZE);
    if (!rowsByColumn.has(x)) rowsByColumn.set(x, []);
    rowsByColumn.get(x).push(y);
  }
  for (const [x, rows] of rowsByColumn) {
    rows.sort((a, b) => a - b);
    let run = 1;
    let longestRun = rows.length > 0 ? 1 : 0;
    for (let index = 1; index < rows.length; index++) {
      run = rows[index] === rows[index - 1] + 1 ? run + 1 : 1;
      longestRun = Math.max(longestRun, run);
    }
    assert.ok(longestRun <= 2, `dhow frame ${frame} has a ${longestRun}px submerged streak at x=${x}`);
  }
});

test("the Mesoamerican canoe has a readable six-frame paddle cycle", async () => {
  const manifest = JSON.parse(await readFile(join(shipAssetRoot, "manifest.json"), "utf8"));
  const entry = manifest.ships.find((ship) => ship.slug === MESOAMERICAN_CANOE_SLUG);

  assert.ok(entry, "Mesoamerican canoe manifest entry");
  assert.equal(entry.files.rowingAnimation.length, SHIP_ROWING_FRAME_COUNT);
  const frameBuffers = [];
  for (let frameIndex = 0; frameIndex < SHIP_ROWING_FRAME_COUNT; frameIndex++) {
    const path = join(
      shipAssetRoot,
      rowingHeadingAssetFile(MESOAMERICAN_CANOE_SLUG, frameIndex)
    );
    const image = await loadImage(path);
    assert.equal(image.width, SHIP_SHEET_WIDTH, `paddling frame ${frameIndex} width`);
    assert.equal(image.height, SHIP_SHEET_HEIGHT, `paddling frame ${frameIndex} height`);
    assert.ok(opaquePixelCount(image) > 0, `paddling frame ${frameIndex} is blank`);
    frameBuffers.push(await readFile(path));
  }
  assert.equal(
    new Set(frameBuffers.map((buffer) => buffer.toString("base64"))).size,
    SHIP_ROWING_FRAME_COUNT
  );
});

test("standalone Asian warships preserve their scale below the longer Mediterranean galley", async () => {
  const dimensions = {};
  for (const slug of [
    MEDITERRANEAN_GALLEY_SLUG,
    JAPANESE_ATAKEBUNE_SLUG,
    JOSEON_PANOKSEON_SLUG,
    JOSEON_TURTLE_SHIP_SLUG
  ]) {
    const image = await loadImage(join(shipAssetRoot, headingAssetFile(slug)));
    dimensions[slug] = maxOpaqueFrameDimension(image);
  }

  assert.ok(dimensions[MEDITERRANEAN_GALLEY_SLUG] > dimensions[JAPANESE_ATAKEBUNE_SLUG]);
  assert.ok(dimensions[MEDITERRANEAN_GALLEY_SLUG] > dimensions[JOSEON_PANOKSEON_SLUG]);
  assert.ok(dimensions[JAPANESE_ATAKEBUNE_SLUG] > dimensions[JOSEON_TURTLE_SHIP_SLUG]);
});

function opaquePixelCount(image) {
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0);
  const pixels = ctx.getImageData(0, 0, image.width, image.height).data;
  let count = 0;
  for (let offset = 3; offset < pixels.length; offset += 4) {
    if (pixels[offset] > 0) count += 1;
  }
  return count;
}

function opaqueImageBounds(image) {
  const pixels = imagePixels(image);
  let minX = image.width;
  let minY = image.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      if (pixels[(x + y * image.width) * 4 + 3] === 0) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  assert.ok(maxX >= minX && maxY >= minY, "opaque image bounds require a nonblank image");
  return {
    width: maxX - minX + 1,
    height: maxY - minY + 1
  };
}

function maxOpaqueFrameDimension(image) {
  assert.equal(image.width, SHIP_SHEET_WIDTH);
  assert.equal(image.height, SHIP_SHEET_HEIGHT);
  const pixels = imagePixels(image);
  let maximum = 0;
  for (let frame = 0; frame < SHIP_SPRITE_HEADINGS; frame++) {
    const originX = frame % SHIP_SPRITE_SHEET_COLS * SHIP_SPRITE_FRAME_SIZE;
    const originY = Math.floor(frame / SHIP_SPRITE_SHEET_COLS) * SHIP_SPRITE_FRAME_SIZE;
    let minX = SHIP_SPRITE_FRAME_SIZE;
    let minY = SHIP_SPRITE_FRAME_SIZE;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < SHIP_SPRITE_FRAME_SIZE; y++) {
      for (let x = 0; x < SHIP_SPRITE_FRAME_SIZE; x++) {
        const alpha = pixels[((originX + x) + (originY + y) * image.width) * 4 + 3];
        if (alpha === 0) continue;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
    assert.ok(maxX >= minX && maxY >= minY, `blank ship frame ${frame}`);
    maximum = Math.max(maximum, maxX - minX + 1, maxY - minY + 1);
  }
  return maximum;
}

async function assertSinkDepthPair(spritePath, sinkDepthPath, label) {
  const [sprite, sinkDepth] = await Promise.all([
    loadImage(join(shipAssetRoot, basename(spritePath))),
    loadImage(join(shipAssetRoot, basename(sinkDepthPath)))
  ]);
  assert.equal(sinkDepth.width, sprite.width, `${label} sink-depth width`);
  assert.equal(sinkDepth.height, sprite.height, `${label} sink-depth height`);
  const spritePixels = imagePixels(sprite);
  const sinkDepthPixels = imagePixels(sinkDepth);
  const levels = new Set();
  for (let offset = 0; offset < spritePixels.length; offset += 4) {
    assert.equal(
      sinkDepthPixels[offset + 3],
      spritePixels[offset + 3],
      `${label} sink-depth alpha at pixel ${offset / 4}`
    );
    if (spritePixels[offset + 3] === 0) continue;
    assert.equal(sinkDepthPixels[offset], sinkDepthPixels[offset + 1], `${label} sink-depth red/green`);
    assert.equal(sinkDepthPixels[offset], sinkDepthPixels[offset + 2], `${label} sink-depth red/blue`);
    levels.add(sinkDepthPixels[offset]);
  }
  assert.ok(levels.size >= 4, `${label} sink-depth bake has only ${levels.size} distinct levels`);
  for (let frame = 0; frame < SHIP_SPRITE_HEADINGS; frame++) {
    const originX = (frame % SHIP_SPRITE_SHEET_COLS) * SHIP_SPRITE_FRAME_SIZE;
    const originY = Math.floor(frame / SHIP_SPRITE_SHEET_COLS) * SHIP_SPRITE_FRAME_SIZE;
    let submerged = 0;
    let aboveWater = 0;
    for (let y = 0; y < SHIP_SPRITE_FRAME_SIZE; y++) {
      for (let x = 0; x < SHIP_SPRITE_FRAME_SIZE; x++) {
        const offset = ((originX + x) + (originY + y) * sinkDepth.width) * 4;
        if (sinkDepthPixels[offset + 3] === 0) continue;
        if (sinkDepthPixels[offset] <= SHIP_WATERLINE_DEPTH_BYTE) submerged++;
        else aboveWater++;
      }
    }
    assert.ok(submerged > 0, `${label} frame ${frame} has no submerged hull pixels`);
    assert.ok(aboveWater > 0, `${label} frame ${frame} has no above-water hull pixels`);
  }
}

function imagePixels(image) {
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0);
  return ctx.getImageData(0, 0, image.width, image.height).data;
}

function modelCreditKey({ creator, sourceTitle, license }) {
  return `${creator}\n${sourceTitle}\n${license}`;
}
