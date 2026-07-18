import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createCanvas, loadImage } from "../../../examples/globe-demo/node_modules/canvas/index.js";
import { TRADE_GOODS } from "./economy.js";
import {
  GAME_ICON_ASSET_VERSION,
  GAME_ICON_PACKS,
  GAME_ICON_SIZE,
  GAME_ICON_SOURCES,
  dialogueOptionIconId,
  gameIconAtlasDimensions,
  gameIconAtlasRect,
  gameIconDrawRect,
  gameIconIds,
  startMenuIconId,
  tradeGoodIconId
} from "./gameIcons.js";
import { RESURRECT_64_HEX } from "./waterLatitudePalette.js";

const appRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const atlasPath = join(appRoot, "public/assets/ui/game-icons.png");
const manifestPath = join(appRoot, "public/assets/ui/game-icons.json");

test("every trade good has a unique semantic icon mapping", () => {
  const iconIds = TRADE_GOODS.map((good) => tradeGoodIconId(good.id));
  assert.equal(iconIds.length, TRADE_GOODS.length);
  assert.equal(new Set(iconIds).size, TRADE_GOODS.length);
  for (const iconId of iconIds) assert.ok(GAME_ICON_SOURCES[iconId], iconId);

  const sourceKeys = iconIds.map((iconId) => {
    const { paperOutline: _paperOutline, ...artSource } = GAME_ICON_SOURCES[iconId];
    return JSON.stringify(artSource);
  });
  assert.equal(
    new Set(sourceKeys).size,
    sourceKeys.length,
    "trade goods must not reuse source artwork"
  );
});

test("every current dialogue and start-menu action resolves to an icon", async () => {
  for (const actionId of ["continue", "new-game", "lake-battle", "past-voyages", "options", "credits"]) {
    assert.ok(GAME_ICON_SOURCES[startMenuIconId(actionId)], actionId);
  }

  const dialogueSource = await readFile(join(appRoot, "src/dialogueSystem.js"), "utf8");
  const actionTypes = new Set([...dialogueSource.matchAll(/type: "([^"]+)"/g)].map((match) => match[1]));
  const nodeIds = new Set([...dialogueSource.matchAll(/nodeId: "([^"]+)"/g)].map((match) => match[1]));
  for (const actionType of actionTypes) {
    if (actionType === "node") continue;
    assert.ok(GAME_ICON_SOURCES[dialogueOptionIconId({ action: { type: actionType } })], actionType);
  }
  for (const nodeId of nodeIds) {
    assert.ok(GAME_ICON_SOURCES[dialogueOptionIconId({ action: { type: "node", nodeId } })], nodeId);
  }
  assert.ok(GAME_ICON_SOURCES[dialogueOptionIconId({ action: { type: "continue-campaign" } })]);
});

test("all downloaded icon packs are used and fully attributed", async () => {
  const usedPackIds = new Set(Object.values(GAME_ICON_SOURCES)
    .map((source) => source.packId)
    .filter(Boolean));
  assert.deepEqual([...usedPackIds].sort(), Object.keys(GAME_ICON_PACKS).sort());
  const credits = await readFile(join(appRoot, "public/assets/CREDITS.md"), "utf8");
  for (const [packId, pack] of Object.entries(GAME_ICON_PACKS)) {
    assert.ok(pack.creator, `${packId} creator`);
    assert.ok(pack.title, `${packId} title`);
    assert.match(pack.sourceUrl, /^https:\/\//, `${packId} source URL`);
    assert.ok(pack.license, `${packId} license`);
    assert.match(credits, new RegExp(escapeRegExp(pack.creator)), `${packId} credit`);
  }
});

test("fishing actions use the widest repo-local casting-net frame", () => {
  const source = GAME_ICON_SOURCES["action:fish"];
  assert.equal(source.packId, null);
  assert.equal(source.assetPath, "public/assets/misc/fishing-net-Sheet.png");
  assert.deepEqual(source.crop, { x: 150, y: 4, w: 26, h: 26 });
  assert.equal(source.paperOutline, true);
});

test("frequently confused controls use distinct readable source art", () => {
  for (const [left, right] of [
    ["menu:captain", "menu:ship"],
    ["action:dock", "action:leave"],
    ["action:harpoon", "action:attack"],
    ["action:disguise", "action:passenger"],
    ["action:inventory", "action:viking"]
  ]) {
    assert.notDeepEqual(GAME_ICON_SOURCES[left], GAME_ICON_SOURCES[right], `${left} / ${right}`);
  }
});

test("runtime icons always draw at the native atlas size", () => {
  assert.deepEqual(gameIconDrawRect(10.4, 20.6), {
    x: 10,
    y: 21,
    w: GAME_ICON_SIZE,
    h: GAME_ICON_SIZE
  });
  assert.throws(() => gameIconDrawRect(Number.NaN, 0), /Invalid game icon position/);
});

test("the game icon atlas exactly matches the registry and Resurrect 64", async () => {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const dimensions = gameIconAtlasDimensions();
  assert.equal(manifest.version, GAME_ICON_ASSET_VERSION);
  assert.equal(manifest.palette, "Resurrect 64");
  assert.equal(manifest.width, dimensions.width);
  assert.equal(manifest.height, dimensions.height);
  assert.equal(manifest.iconSize, GAME_ICON_SIZE);
  assert.deepEqual(manifest.icons.map((icon) => icon.id), gameIconIds());

  const image = await loadImage(atlasPath);
  assert.equal(image.width, dimensions.width);
  assert.equal(image.height, dimensions.height);
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0);
  const palette = new Set(RESURRECT_64_HEX);
  for (const iconId of gameIconIds()) {
    const rect = gameIconAtlasRect(iconId);
    const pixels = ctx.getImageData(rect.x, rect.y, rect.w, rect.h).data;
    let opaquePixels = 0;
    for (let offset = 0; offset < pixels.length; offset += 4) {
      if (pixels[offset + 3] === 0) continue;
      assert.equal(pixels[offset + 3], 255, `${iconId} has partial alpha`);
      const hex = [pixels[offset], pixels[offset + 1], pixels[offset + 2]]
        .map((value) => value.toString(16).padStart(2, "0"))
        .join("");
      assert.ok(palette.has(hex), `${iconId} contains non-Resurrect color #${hex}`);
      opaquePixels += 1;
    }
    assert.ok(opaquePixels >= 3, `${iconId} is blank`);
  }
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
