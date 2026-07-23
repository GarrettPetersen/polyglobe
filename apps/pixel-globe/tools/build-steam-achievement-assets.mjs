import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createCanvas, loadImage } from "../../../examples/globe-demo/node_modules/canvas/index.js";
import { ACHIEVEMENT_CATALOG } from "../src/achievements.js";
import { steamAchievementProgressBinding } from "../src/steamStats.js";

const appRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const outputRoot = join(appRoot, "steam/achievements");
const achievedRoot = join(outputRoot, "achieved");
const lockedRoot = join(outputRoot, "locked");
const atlasPath = join(appRoot, "public/assets/ui/game-icons.png");
const atlasManifestPath = join(appRoot, "public/assets/ui/game-icons.json");
const catalogPath = join(outputRoot, "catalog.json");

const OUTPUT_SIZE = 256;
const ICON_SCALE = 12;
const ICON_SIZE = 16 * ICON_SCALE;
const ICON_OFFSET = (OUTPUT_SIZE - ICON_SIZE) / 2;

async function main() {
  const atlas = await loadImage(atlasPath);
  const atlasManifest = JSON.parse(readFileSync(atlasManifestPath, "utf8"));
  const iconsById = new Map(atlasManifest.icons.map((entry) => [entry.id, entry]));

  rmSync(outputRoot, { recursive: true, force: true });
  mkdirSync(achievedRoot, { recursive: true });
  mkdirSync(lockedRoot, { recursive: true });

  const catalog = [];
  for (const achievement of ACHIEVEMENT_CATALOG) {
    const source = iconsById.get(achievement.iconId);
    if (!source) throw new Error(`Steam achievement icon is missing from the game atlas: ${achievement.iconId}`);
    const steamId = achievement.platformIds.steam;
    if (!steamId) throw new Error(`Achievement has no Steam API name: ${achievement.id}`);
    const progressBinding = steamAchievementProgressBinding(achievement.id);

    const achievedPath = join(achievedRoot, `${steamId}.jpg`);
    const lockedPath = join(lockedRoot, `${steamId}.jpg`);
    const achievedCanvas = renderAchievementIcon(atlas, source.rect);
    const lockedCanvas = grayscaleLockedIcon(achievedCanvas);
    writeFileSync(achievedPath, achievedCanvas.toBuffer("image/jpeg", { quality: 0.96 }));
    writeFileSync(lockedPath, lockedCanvas.toBuffer("image/jpeg", { quality: 0.96 }));
    catalog.push({
      gameId: achievement.id,
      apiName: steamId,
      displayName: achievement.title,
      description: achievement.description,
      hidden: achievement.hidden,
      setBy: "Client",
      achievedIcon: `achieved/${steamId}.jpg`,
      unachievedIcon: `locked/${steamId}.jpg`,
      ...(progressBinding ? {
        progressStat: progressBinding.statApiName,
        progressUnlockValue: progressBinding.unlockValue
      } : {})
    });
  }

  writeFileSync(catalogPath, `${JSON.stringify({
    appId: 4516500,
    generatedFrom: "src/achievements.js",
    count: catalog.length,
    achievements: catalog
  }, null, 2)}\n`);
  console.log(`Built ${catalog.length} Steam achievement icon pairs at ${outputRoot}`);
}

function renderAchievementIcon(atlas, rect) {
  const canvas = createCanvas(OUTPUT_SIZE, OUTPUT_SIZE);
  const ctx = canvas.getContext("2d", { alpha: false });
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#3b2027";
  ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  ctx.fillStyle = "#4f7d6b";
  ctx.fillRect(8, 8, OUTPUT_SIZE - 16, OUTPUT_SIZE - 16);
  ctx.fillStyle = "#ead6a6";
  ctx.fillRect(14, 14, OUTPUT_SIZE - 28, OUTPUT_SIZE - 28);
  ctx.drawImage(
    atlas,
    rect.x,
    rect.y,
    rect.w,
    rect.h,
    ICON_OFFSET,
    ICON_OFFSET,
    ICON_SIZE,
    ICON_SIZE
  );
  return canvas;
}

function grayscaleLockedIcon(source) {
  const canvas = createCanvas(OUTPUT_SIZE, OUTPUT_SIZE);
  const ctx = canvas.getContext("2d", { alpha: false, willReadFrequently: true });
  ctx.drawImage(source, 0, 0);
  const image = ctx.getImageData(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  for (let index = 0; index < image.data.length; index += 4) {
    const luminance = Math.round(
      image.data[index] * 0.2126 +
      image.data[index + 1] * 0.7152 +
      image.data[index + 2] * 0.0722
    );
    const value = Math.round(luminance * 0.68 + 24);
    image.data[index] = value;
    image.data[index + 1] = value;
    image.data[index + 2] = value;
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

await main();
