import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createCanvas, loadImage } from "../../../examples/globe-demo/node_modules/canvas/index.js";
import { TRADE_GOODS } from "./economy.js";
import {
  GAME_ICON_ASSET_VERSION,
  GAME_ICON_PACKS,
  GAME_ICON_SIZE,
  GAME_ICON_SOURCES,
  SHIP_MENU_ICON_IDS,
  achievementStatusIconId,
  dialogueOptionIconId,
  gameIconAtlasDimensions,
  gameIconAtlasRect,
  gameIconDrawRect,
  gameIconIds,
  shipMenuIconId,
  startMenuIconId,
  tradeGoodIconId
} from "./gameIcons.js";
import { SHIP_STATS } from "./shipStats.js";
import { RESURRECT_64_HEX } from "./waterLatitudePalette.js";
import { CONTROLLER_FAMILY, controllerGlyphIconId } from "./controllerPrompts.js";

const appRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const atlasPath = join(appRoot, "public/assets/ui/game-icons.png");
const manifestPath = join(appRoot, "public/assets/ui/game-icons.json");
const fallbackManifestPath = join(appRoot, "vendor/icon-packs/game-icon-source-fallbacks-v14.json");

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
  for (const actionId of [
    "continue",
    "new-game",
    "lake-battle",
    "past-voyages",
    "achievements",
    "options",
    "credits"
  ]) {
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

test("every controller family has native-size semantic action glyphs", () => {
  for (const family of Object.values(CONTROLLER_FAMILY)) {
    for (const action of [
      "confirm", "back", "anchor", "secondary", "firePort", "fireStarboard",
      "cycleTarget", "menu", "navigate", "scroll"
    ]) {
      const iconId = controllerGlyphIconId(action, family);
      assert.ok(GAME_ICON_SOURCES[iconId], `${family}:${action}`);
    }
  }
  for (const [iconId, source] of Object.entries(GAME_ICON_SOURCES)) {
    if (!iconId.startsWith("input:") || source.generatedId) continue;
    assert.equal(source.packId, "nikoichu", iconId);
    assert.match(source.entry, /^Sprites\/Controller_/, iconId);
  }
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
    if (pack.repoArchive) {
      const archive = await stat(join(appRoot, pack.repoArchive));
      assert.ok(archive.size > 0, `${packId} repo archive`);
    }
  }
});

test("fishing actions use a legible native-size fishing rod", () => {
  const source = GAME_ICON_SOURCES["action:fish"];
  assert.equal(source.packId, "nikoichu");
  assert.equal(source.entry, "Sprites/Tools_Crafting_Fishing_Rod.png");
  assert.equal(source.crop, null);
  assert.equal(source.paperOutline, undefined);
  assert.equal(source.duotone, undefined);
  assert.equal(source.lightMonotone, "#484a77");
});

test("generic fish cargo uses the native-size herring art", () => {
  assert.deepEqual(GAME_ICON_SOURCES["good:fish"], {
    packId: null,
    generatedId: "herring"
  });
});

test("interface controls use varied dark Resurrect colors without outlines", () => {
  const palette = new Set(RESURRECT_64_HEX.map((hex) => `#${hex}`));
  const iconColors = new Set();
  for (const [iconId, source] of Object.entries(GAME_ICON_SOURCES)) {
    if (iconId.startsWith("menu:")) {
      assert.equal(source.packId, "nikoichu", iconId);
    }
    if (iconId.startsWith("action:") || (iconId.startsWith("menu:") && source.packId === "nikoichu")) {
      assert.equal(source.duotone, undefined, `${iconId} still has an outline treatment`);
      if (iconId !== "action:anchor") assert.equal(source.packId, "nikoichu", iconId);
      assert.ok(palette.has(source.lightMonotone), `${iconId} icon color`);
      iconColors.add(source.lightMonotone);
    }
    if (iconId.startsWith("good:") && iconId !== "good:fresh-water") {
      assert.notEqual(source.packId, "nikoichu", iconId);
    }
  }
  assert.ok(iconColors.size >= 8, `only ${iconColors.size} interface colors`);
});

test("literal anchor controls use the dedicated period anchor art", () => {
  const source = GAME_ICON_SOURCES["action:anchor"];
  assert.equal(source.packId, null);
  assert.equal(source.assetPath, "public/assets/ui/anchor.png");
  assert.equal(source.duotone, undefined);
  assert.equal(source.lightMonotone, "#0b5e65");
  assert.notDeepEqual(source, GAME_ICON_SOURCES["action:dock"]);
});

test("selling cargo uses the flowing two-arrow icon from row 5, column 5", () => {
  const source = GAME_ICON_SOURCES["action:sell"];
  assert.equal(source.packId, "nikoichu");
  assert.equal(source.entry, "Sprites/Arrows_Media_Controls_Loop_Reload_Refresh.png");
  assert.equal(source.lightMonotone, "#9e4539");
});

test("achievement status uses the matched one-bit lock pair", () => {
  const lockedId = achievementStatusIconId(false);
  const unlockedId = achievementStatusIconId(true);
  assert.equal(lockedId, "status:achievement-locked");
  assert.equal(unlockedId, "status:achievement-unlocked");
  assert.deepEqual(GAME_ICON_SOURCES[lockedId], {
    packId: "nikoichu",
    entry: "Sprites/Tools_Crafting_Padlock_Locked.png",
    crop: null,
    lightMonotone: "#966c6c"
  });
  assert.deepEqual(GAME_ICON_SOURCES[unlockedId], {
    packId: "nikoichu",
    entry: "Sprites/Tools_Crafting_Padlock_Unlocked_1.png",
    crop: null,
    lightMonotone: "#966c6c"
  });
  assert.throws(() => achievementStatusIconId("yes"), /requires a boolean/);
});

test("rendered interface icons contain one semantic color and no outline color", async () => {
  const image = await loadImage(atlasPath);
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0);
  for (const [iconId, source] of Object.entries(GAME_ICON_SOURCES)) {
    const expected = source.lightMonotone || null;
    if (!expected) continue;
    const rect = gameIconAtlasRect(iconId);
    const pixels = ctx.getImageData(rect.x, rect.y, rect.w, rect.h).data;
    const colors = new Set();
    for (let offset = 0; offset < pixels.length; offset += 4) {
      if (pixels[offset + 3] === 0) continue;
      colors.add(`#${[pixels[offset], pixels[offset + 1], pixels[offset + 2]]
        .map((value) => value.toString(16).padStart(2, "0"))
        .join("")}`);
    }
    assert.deepEqual([...colors], [expected], iconId);
  }
});

test("fresh water uses the native-size water droplet throughout the interface", () => {
  const source = GAME_ICON_SOURCES["good:fresh-water"];
  assert.equal(source.packId, "nikoichu");
  assert.equal(source.entry, "Sprites/Weather_Water_Droplet_Liquid_Rain_Element_Big.png");
});

test("every non-vendored pack icon has a checked-in source fallback", async () => {
  const manifest = JSON.parse(await readFile(fallbackManifestPath, "utf8"));
  const fallbackIds = new Set(manifest.icons.map((icon) => icon.id));
  for (const [iconId, source] of Object.entries(GAME_ICON_SOURCES)) {
    if (!source.packId || GAME_ICON_PACKS[source.packId].repoArchive) continue;
    assert.ok(fallbackIds.has(iconId), iconId);
  }
});

test("ship and ledger has native 16x16 artwork for every roster vessel", async () => {
  const iconIds = SHIP_STATS.map(({ slug }) => shipMenuIconId(slug));
  assert.equal(iconIds.length, SHIP_STATS.length);
  assert.equal(new Set(iconIds).size, SHIP_STATS.length);
  assert.deepEqual(Object.keys(SHIP_MENU_ICON_IDS), SHIP_STATS.map(({ slug }) => slug));

  for (const { slug } of SHIP_STATS) {
    const iconId = shipMenuIconId(slug);
    const source = GAME_ICON_SOURCES[iconId];
    assert.equal(source.packId, null, slug);
    assert.equal(source.assetPath, `public/assets/ui/ship-icons/${slug}.png`, slug);
    assert.equal(source.crop, null, slug);
    const image = await loadImage(join(appRoot, source.assetPath));
    assert.equal(image.width, GAME_ICON_SIZE, `${slug} width`);
    assert.equal(image.height, GAME_ICON_SIZE, `${slug} height`);
  }
  assert.throws(() => shipMenuIconId("missing-ship"), /Ship has no menu icon/);
});

test("ship, politics, and wonders menus use consistent one-bit icons", () => {
  const ship = GAME_ICON_SOURCES["menu:ship"];
  assert.equal(ship.packId, "nikoichu");
  assert.equal(ship.entry, "Sprites/Travel_Ship_Sailing_Boat.png");
  assert.equal(ship.lightMonotone, "#0b5e65");

  const wonders = GAME_ICON_SOURCES["menu:discoveries"];
  assert.equal(wonders.packId, "nikoichu");
  assert.equal(wonders.entry, "Sprites/Map_Markers_Building_Bank_Greek_Temple.png");
  assert.equal(wonders.lightMonotone, "#676633");

  const politics = GAME_ICON_SOURCES["menu:politics"];
  assert.equal(politics.packId, "nikoichu");
  assert.equal(politics.entry, "Sprites/Map_Markers_Flagpole_Triangle_Minesweeper.png");
  assert.equal(politics.lightMonotone, "#9e4539");

  const shipyard = GAME_ICON_SOURCES["action:shipyard"];
  assert.equal(shipyard.packId, "nikoichu");
  assert.equal(shipyard.entry, "Sprites/Travel_Ship_Medieval_Galleon.png");
  assert.equal(shipyard.lightMonotone, "#0b5e65");
});

test("frequently confused controls use distinct readable source art", () => {
  for (const [left, right] of [
    ["menu:captain", shipMenuIconId("brigantine")],
    ["menu:politics", "action:surrender"],
    ["action:anchor", "action:dock"],
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
