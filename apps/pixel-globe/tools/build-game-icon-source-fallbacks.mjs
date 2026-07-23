import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createCanvas, loadImage } from "../../../examples/globe-demo/node_modules/canvas/index.js";
import {
  GAME_ICON_ASSET_VERSION,
  GAME_ICON_PACKS,
  GAME_ICON_SIZE,
  GAME_ICON_SOURCES,
  gameIconAtlasRect
} from "../src/gameIcons.js";

const appRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const sourceRoot = process.env.PIXEL_GLOBE_ICON_PACK_DIR
  ? resolve(process.env.PIXEL_GLOBE_ICON_PACK_DIR)
  : null;
if (!sourceRoot) {
  throw new Error("Building icon fallbacks requires PIXEL_GLOBE_ICON_PACK_DIR");
}

for (const pack of Object.values(GAME_ICON_PACKS)) {
  if (pack.repoArchive) continue;
  const archivePath = join(sourceRoot, pack.archive);
  if (!existsSync(archivePath)) throw new Error(`Missing icon pack archive: ${archivePath}`);
}

execFileSync(process.execPath, [join(appRoot, "tools/build-game-icon-atlas.mjs")], {
  env: { ...process.env, PIXEL_GLOBE_ICON_PACK_DIR: sourceRoot },
  stdio: "inherit"
});

const atlasPath = join(appRoot, "public/assets/ui/game-icons.png");
const fallbackAtlasPath = join(appRoot, "vendor/icon-packs/game-icon-source-fallbacks-v14.png");
const fallbackManifestPath = join(appRoot, "vendor/icon-packs/game-icon-source-fallbacks-v14.json");
const entries = Object.entries(GAME_ICON_SOURCES).filter(([, source]) => {
  if (!source.packId) return false;
  const pack = GAME_ICON_PACKS[source.packId];
  if (!pack) throw new Error(`Unknown icon pack: ${source.packId}`);
  return !pack.repoArchive;
});
const columns = 16;
const rows = Math.ceil(entries.length / columns);
const canvas = createCanvas(columns * GAME_ICON_SIZE, rows * GAME_ICON_SIZE);
const context = canvas.getContext("2d", { alpha: true });
context.imageSmoothingEnabled = false;
const atlas = await loadImage(atlasPath);
const icons = [];

for (let index = 0; index < entries.length; index += 1) {
  const [id, source] = entries[index];
  const sourceRect = gameIconAtlasRect(id);
  const rect = {
    x: index % columns * GAME_ICON_SIZE,
    y: Math.floor(index / columns) * GAME_ICON_SIZE,
    w: GAME_ICON_SIZE,
    h: GAME_ICON_SIZE
  };
  context.drawImage(
    atlas,
    sourceRect.x,
    sourceRect.y,
    sourceRect.w,
    sourceRect.h,
    rect.x,
    rect.y,
    rect.w,
    rect.h
  );
  icons.push({
    id,
    rect,
    packId: source.packId,
    assetPath: source.assetPath || null,
    paperOutline: source.paperOutline === true || undefined
  });
}

mkdirSync(dirname(fallbackAtlasPath), { recursive: true });
writeFileSync(fallbackAtlasPath, canvas.toBuffer("image/png"));
writeFileSync(fallbackManifestPath, `${JSON.stringify({
  version: GAME_ICON_ASSET_VERSION,
  palette: "Resurrect 64",
  width: canvas.width,
  height: canvas.height,
  iconSize: GAME_ICON_SIZE,
  icons,
  packs: GAME_ICON_PACKS
}, null, 2)}\n`);

const manifest = JSON.parse(readFileSync(fallbackManifestPath, "utf8"));
if (manifest.icons.length !== entries.length) {
  throw new Error(`Fallback manifest lost icons: ${manifest.icons.length}/${entries.length}`);
}
console.log(`Built ${entries.length} licensed icon fallbacks at ${fallbackAtlasPath}`);
