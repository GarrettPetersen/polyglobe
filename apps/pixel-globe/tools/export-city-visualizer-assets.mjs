import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { createCanvas, loadImage } from "../../../examples/globe-demo/node_modules/canvas/index.js";

const toolRoot = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(toolRoot, "..");
const cityViewSource = resolve(appRoot, "public/assets/city-view/port-parallax.aseprite");
const buildingSource = resolve(appRoot, "public/assets/city-view/buildings.aseprite");
const outputRoot = resolve(appRoot, "city-visualizer/assets");
const portOutputRoot = resolve(outputRoot, "port-parallax");
const minifolkOutputRoot = resolve(outputRoot, "minifolks");
const aseprite = resolveAsepriteBinary();

const BUILDING_LAYER_OVERRIDES = Object.freeze({
  "Northern European Inn": "Inn",
  "Norther Europe Home": "Home",
  "Norther Europe Home 2": "Home 2",
  Smith: "Smith"
});

const STANDALONE_BUILDING_LAYERS = Object.freeze(["Church"]);

const AUTHORED_LAYER_ORDER = Object.freeze([
  "Sky",
  "Ocean",
  "Horizon Mountains",
  "Horizon Mountains Left Bank",
  "Distant Land",
  "Distant Land Left Bank",
  "Distant Hills",
  "Distant Hills Left Bank",
  "Rocky Hills",
  "Rocky Hills Left Bank",
  "Distant Forest",
  "Distant Forest Left Bank",
  "Distant Desert",
  "Distant Desert Left Bank",
  "Distant Plains",
  "Distant Plains Left Bank",
  "Background City Base",
  "Shipyard",
  "Sand Beach",
  "Sand Beach Dock Shadow",
  "Left Bank Sand Beach",
  "Home 2",
  "Home",
  "Desert Behind Buildings",
  "Rocks Behind Buildings",
  "Grass Behind Buildings",
  "Smith",
  "Market Stall Copy",
  "Market Stall Copy Copy",
  "Market Stall Copy Copy",
  "Market Stall",
  "Midground Grass",
  "Midground Desert",
  "Midground Rocky",
  "Road",
  "Castle Shadow",
  "Waves",
  "Surf",
  "Dock Background",
  "Dock",
  "Stone Dock",
  "Dock Foreground",
  "Inn",
  "Market Stall Copy Copy",
  "Market Stall Copy",
  "Market Stall",
  "Foreground Grass",
  "Foreground Grass Castle Shadow",
  "Foreground Grass Left Bank",
  "Foreground Desert Left Bank",
  "Foreground Rocky Left Bank",
  "Foreground Desert",
  "Foreground Desert Castle Shadow",
  "Foreground Rocky",
  "Foreground Rocky Castle Shadow",
  "Far Castle",
  "Gate",
  "Near Castle",
  "Barrel",
  "Crate"
]);

const MINIFOLKS = Object.freeze([
  Object.freeze({ id: "villager-man", source: "villagers/aseprite/ase/MiniVillagerMan.aseprite" }),
  Object.freeze({ id: "villager-woman", source: "villagers/aseprite/ase/MiniVillagerWoman.aseprite" }),
  Object.freeze({ id: "merchant", source: "villagers-2/aseprite/MiniMerchant.aseprite" }),
  Object.freeze({ id: "worker", source: "villagers/aseprite/ase/MiniWorker.aseprite" })
]);

await mkdir(portOutputRoot, { recursive: true });
await mkdir(minifolkOutputRoot, { recursive: true });
const staticJsonPath = resolve(portOutputRoot, "static.json");
const staticPngPath = resolve(portOutputRoot, "static.png");
runAseprite([
  "--batch",
  "--all-layers",
  "--ignore-layer", "Safe Area",
  "--ignore-layer", "Waves",
  "--ignore-layer", "Surf",
  "--frame-range", "0,0",
  "--split-layers",
  cityViewSource,
  "--trim",
  "--sheet-pack",
  "--merge-duplicates",
  "--list-layers",
  "--format", "json-array",
  "--data", staticJsonPath,
  "--sheet", staticPngPath
]);

const staticSheet = JSON.parse(await readFile(staticJsonPath, "utf8"));
const staticFrames = staticSheet.frames.map((frame, index) => ({
  id: `static-${index}`,
  layer: layerNameFromFilename(frame.filename),
  sheet: "static.png",
  ...portableFrame(frame)
}));
const staticLayerNames = staticFrames.map((frame) => frame.layer);
const expectedStaticNames = AUTHORED_LAYER_ORDER.filter((name) => name !== "Waves" && name !== "Surf");
if (JSON.stringify(staticLayerNames) !== JSON.stringify(expectedStaticNames)) {
  throw new Error(
    "Aseprite layer order changed; update the city visualizer authored layer contract before exporting"
  );
}
await applyBuildingAssets(staticFrames, staticPngPath);

const animated = {};
for (const layer of ["Waves", "Surf"]) {
  const slug = layer.toLowerCase();
  const jsonPath = resolve(portOutputRoot, `${slug}.json`);
  const pngPath = resolve(portOutputRoot, `${slug}.png`);
  runAseprite([
    "--batch",
    "--layer", layer,
    cityViewSource,
    "--trim",
    "--sheet-pack",
    "--merge-duplicates",
    "--format", "json-array",
    "--data", jsonPath,
    "--sheet", pngPath
  ]);
  const sheet = JSON.parse(await readFile(jsonPath, "utf8"));
  animated[layer] = {
    sheet: `${slug}.png`,
    frames: sheet.frames.map(portableFrame)
  };
}

const portManifest = {
  format: "marque-city-view-layer-atlas",
  version: 1,
  source: "apps/pixel-globe/public/assets/city-view/port-parallax.aseprite",
  sourceSize: staticFrames[0].sourceSize,
  safeArea: { x: 455, width: 910, bottom: 583 },
  staticSheet: "static.png",
  layerOrder: AUTHORED_LAYER_ORDER,
  staticFrames,
  animated
};
await writeFile(resolve(portOutputRoot, "manifest.json"), `${JSON.stringify(portManifest)}\n`);

const minifolksSourceRoot = process.env.MINIFOLKS_SOURCE_ROOT;
if (!minifolksSourceRoot) {
  if (!existsSync(resolve(minifolkOutputRoot, "manifest.json"))) {
    throw new Error(
      "MINIFOLKS_SOURCE_ROOT must point to the private repo's itch/minifolks directory for the first export"
    );
  }
  console.warn("[pixel-globe] MINIFOLKS_SOURCE_ROOT is unset; keeping existing production MiniFolks exports");
} else {
  const characters = [];
  for (const character of MINIFOLKS) {
    const source = resolve(minifolksSourceRoot, character.source);
    if (!existsSync(source)) throw new Error(`Missing MiniFolks source: ${source}`);
    const jsonPath = resolve(minifolkOutputRoot, `${character.id}.json`);
    const pngPath = resolve(minifolkOutputRoot, `${character.id}.png`);
    runAseprite([
      "--batch",
      "--all-layers",
      "--tag", "walk",
      source,
      "--trim",
      "--sheet-pack",
      "--merge-duplicates",
      "--format", "json-array",
      "--data", jsonPath,
      "--sheet", pngPath
    ]);
    const sheet = JSON.parse(await readFile(jsonPath, "utf8"));
    characters.push({
      id: character.id,
      sheet: `${character.id}.png`,
      frames: sheet.frames.map(portableFrame)
    });
  }
  await writeFile(resolve(minifolkOutputRoot, "manifest.json"), `${JSON.stringify({
    format: "marque-city-view-minifolks",
    version: 1,
    source: "private polyglobe-ship-source-assets MiniFolks production exports",
    license: "itch.io asset licenses retained with the private source archives",
    characters
  })}\n`);
}

console.log(
  `[pixel-globe] exported ${AUTHORED_LAYER_ORDER.length} city-view layers ` +
  `and ${MINIFOLKS.length} MiniFolks production characters to ${outputRoot}`
);

function portableFrame(frame) {
  return {
    frame: frame.frame,
    spriteSourceSize: frame.spriteSourceSize,
    sourceSize: frame.sourceSize,
    duration: frame.duration
  };
}

function layerNameFromFilename(filename) {
  const match = String(filename).match(/\((.*)\)(?: \d+)?\.aseprite$/);
  if (!match) throw new Error(`Could not read Aseprite layer name: ${filename}`);
  return match[1];
}

async function applyBuildingAssets(staticFrames, staticPngPath) {
  if (!existsSync(buildingSource)) {
    throw new Error(`Missing city building source: ${buildingSource}`);
  }
  const temporaryRoot = await mkdtemp(resolve(tmpdir(), "polyglobe-city-buildings-"));
  const dataPath = resolve(temporaryRoot, "building-overrides.json");
  const sheetPath = resolve(temporaryRoot, "building-overrides.png");
  try {
    runAseprite([
      "--batch",
      "--all-layers",
      "--frame-range", "0,0",
      "--split-layers",
      buildingSource,
      "--trim",
      "--sheet-pack",
      "--list-layers",
      "--format", "json-array",
      "--data", dataPath,
      "--sheet", sheetPath
    ]);
    const overrideSheet = JSON.parse(await readFile(dataPath, "utf8"));
    const visibleFrames = overrideSheet.frames.map((frame) => ({
      layer: layerNameFromFilename(frame.filename),
      ...portableFrame(frame)
    }));
    const expectedLayerNames = [
      ...Object.keys(BUILDING_LAYER_OVERRIDES),
      ...STANDALONE_BUILDING_LAYERS
    ];
    const overrideFrames = visibleFrames.filter((frame) => expectedLayerNames.includes(frame.layer));
    const missingLayerNames = expectedLayerNames.filter((layer) => (
      !overrideFrames.some((frame) => frame.layer === layer)
    ));
    if (missingLayerNames.length > 0) {
      throw new Error(
        `Missing buildings.aseprite overrides: ${missingLayerNames.join(", ")}`
      );
    }

    const [staticAtlas, overrideAtlas] = await Promise.all([
      loadImage(staticPngPath),
      loadImage(sheetPath)
    ]);
    const standaloneFrames = overrideFrames.filter((frame) => (
      STANDALONE_BUILDING_LAYERS.includes(frame.layer)
    ));
    const appendedHeight = standaloneFrames.reduce((height, frame) => height + frame.frame.h, 0);
    const appendedWidth = standaloneFrames.reduce(
      (width, frame) => Math.max(width, frame.frame.w),
      staticAtlas.width
    );
    const canvas = createCanvas(appendedWidth, staticAtlas.height + appendedHeight);
    const context = canvas.getContext("2d");
    context.imageSmoothingEnabled = false;
    context.drawImage(staticAtlas, 0, 0);
    for (const overrideFrame of overrideFrames.filter((frame) => (
      Object.hasOwn(BUILDING_LAYER_OVERRIDES, frame.layer)
    ))) {
      const targetLayer = BUILDING_LAYER_OVERRIDES[overrideFrame.layer];
      const targetFrame = staticFrames.find((frame) => frame.layer === targetLayer);
      if (!targetFrame) throw new Error(`Missing target city layer: ${targetLayer}`);
      if (
        overrideFrame.frame.w !== targetFrame.frame.w ||
        overrideFrame.frame.h !== targetFrame.frame.h
      ) {
        throw new Error(
          `${overrideFrame.layer} must remain ${targetFrame.frame.w}x${targetFrame.frame.h} ` +
          `to preserve ${targetLayer}'s authored scene position`
        );
      }
      context.clearRect(
        targetFrame.frame.x,
        targetFrame.frame.y,
        targetFrame.frame.w,
        targetFrame.frame.h
      );
      context.drawImage(
        overrideAtlas,
        overrideFrame.frame.x,
        overrideFrame.frame.y,
        overrideFrame.frame.w,
        overrideFrame.frame.h,
        targetFrame.frame.x,
        targetFrame.frame.y,
        targetFrame.frame.w,
        targetFrame.frame.h
      );
    }
    let appendedY = staticAtlas.height;
    for (const standaloneFrame of standaloneFrames) {
      context.drawImage(
        overrideAtlas,
        standaloneFrame.frame.x,
        standaloneFrame.frame.y,
        standaloneFrame.frame.w,
        standaloneFrame.frame.h,
        0,
        appendedY,
        standaloneFrame.frame.w,
        standaloneFrame.frame.h
      );
      staticFrames.push({
        id: `building-${standaloneFrame.layer.toLowerCase().replaceAll(" ", "-")}`,
        layer: standaloneFrame.layer,
        sheet: "static.png",
        frame: {
          x: 0,
          y: appendedY,
          w: standaloneFrame.frame.w,
          h: standaloneFrame.frame.h
        },
        spriteSourceSize: standaloneFrame.spriteSourceSize,
        sourceSize: standaloneFrame.sourceSize,
        duration: standaloneFrame.duration
      });
      appendedY += standaloneFrame.frame.h;
    }
    await writeFile(staticPngPath, canvas.toBuffer("image/png"));
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

function runAseprite(args) {
  const result = spawnSync(aseprite, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  if (result.status !== 0) {
    throw new Error(
      `Aseprite export failed (${result.status}): ${result.stderr || result.stdout || args.join(" ")}`
    );
  }
}

function resolveAsepriteBinary() {
  const configured = process.env.ASEPRITE_BIN;
  if (configured) return configured;
  const macSteam = resolve(
    homedir(),
    "Library/Application Support/Steam/steamapps/common/Aseprite/Aseprite.app/Contents/MacOS/aseprite"
  );
  if (existsSync(macSteam)) return macSteam;
  return "aseprite";
}
