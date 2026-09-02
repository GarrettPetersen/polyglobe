import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

import { createCanvas, loadImage } from "../../../examples/globe-demo/node_modules/canvas/index.js";
import {
  CITY_PERSON_APPEARANCES,
  CITY_PERSON_ARCHETYPES,
  CITY_PERSON_SKIN_RAMP
} from "../city-visualizer/cityPeopleCatalog.js";
import { RESURRECT_64_HEX } from "../src/waterLatitudePalette.js";

const toolRoot = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(toolRoot, "..");
const cityViewSource = resolve(appRoot, "public/assets/city-view/port-parallax.aseprite");
const buildingSource = resolve(appRoot, "public/assets/city-view/buildings.aseprite");
const treeSource = resolve(appRoot, "public/assets/city-view/trees.aseprite");
const outputRoot = resolve(appRoot, "city-visualizer/assets");
const portOutputRoot = resolve(outputRoot, "port-parallax");
const minifolkOutputRoot = resolve(outputRoot, "minifolks");
const treeOutputRoot = resolve(outputRoot, "trees");
const aseprite = resolveAsepriteBinary();
const ASEPRITE_EXPORT_TIMEOUT_MS = 30_000;
const ASEPRITE_EXPORT_MAX_ATTEMPTS = 3;

const BUILDING_LAYER_OVERRIDES = Object.freeze({
  "Northern European Inn": "Inn",
  "Northern Europe Home": "Home",
  "Northern Europe Home 2": "Home 2",
  "Northern European Smith": "Smith"
});

const REGIONAL_BUILDING_LAYERS = Object.freeze({
  "Earthen Hut": Object.freeze({
    cityType: "earthen-village",
    regionalOf: "Home",
    sourceBase: "Northern Europe Home",
    hasChimney: false
  }),
  "Earthen Hut Large": Object.freeze({
    cityType: "earthen-village",
    regionalOf: "Home 2",
    sourceBase: "Northern Europe Home 2",
    hasChimney: false
  }),
  "Med Inn": Object.freeze({ cityType: "mediterranean", regionalOf: "Inn", sourceBase: "Northern European Inn" }),
  "Med Home": Object.freeze({ cityType: "mediterranean", regionalOf: "Home", sourceBase: "Northern Europe Home" }),
  "Med Home 2": Object.freeze({ cityType: "mediterranean", regionalOf: "Home 2", sourceBase: "Northern Europe Home 2" }),
  "Med Smith": Object.freeze({ cityType: "mediterranean", regionalOf: "Smith", sourceBase: "Northern European Smith" }),
  "Middle East Inn": Object.freeze({
    cityType: "islamic-desert",
    regionalOf: "Inn",
    sourceBase: "Northern European Inn"
  }),
  "Middle East Home": Object.freeze({
    cityType: "islamic-desert",
    regionalOf: "Home",
    sourceBase: "Northern Europe Home",
    hasChimney: false
  }),
  "Middle East Smith": Object.freeze({
    cityType: "islamic-desert",
    regionalOf: "Smith",
    sourceBase: "Northern European Smith",
    hasChimney: false
  }),
  "Middle East Far Wall": Object.freeze({
    cityType: "islamic-desert",
    regionalOf: "Far Castle",
    sourceBase: "Castle Wall Far",
    hasChimney: false
  }),
  "Middle East Gate": Object.freeze({
    cityType: "islamic-desert",
    regionalOf: "Gate",
    sourceBase: "Far Gate Side",
    hasChimney: false
  }),
  "Middle East Near Wall": Object.freeze({
    cityType: "islamic-desert",
    regionalOf: "Near Castle",
    sourceBase: "Castle Wall Near",
    hasChimney: false
  }),
  "China Home": Object.freeze({
    cityType: "east-asian",
    regionalOf: "Home",
    sourceBase: "Northern Europe Home",
    hasChimney: false
  }),
  "China Inn": Object.freeze({
    cityType: "east-asian",
    regionalOf: "Inn",
    sourceBase: "Northern European Inn",
    sceneOffsetX: 50,
    hasChimney: false
  }),
  "China Smith": Object.freeze({
    cityType: "east-asian",
    regionalOf: "Smith",
    sourceBase: "Northern European Smith",
    hasChimney: false
  }),
  "China Gate Far": Object.freeze({
    cityType: "east-asian",
    regionalOf: "Far Castle",
    sourceBase: "Castle Wall Far",
    sceneOffsetX: -3,
    hasChimney: false
  }),
  "China Gateway": Object.freeze({
    cityType: "east-asian",
    regionalOf: "Gate",
    sourceBase: "Far Gate Side",
    hasChimney: false
  }),
  "China Gate Near": Object.freeze({
    cityType: "east-asian",
    regionalOf: "Near Castle",
    sourceBase: "Castle Wall Near",
    sceneOffsetX: -3,
    hasChimney: false
  }),
  "Japan Home": Object.freeze({
    cityType: "japanese",
    regionalOf: "Home",
    sourceBase: "Northern Europe Home",
    hasChimney: false
  }),
  "Japan Inn": Object.freeze({
    cityType: "japanese",
    regionalOf: "Inn",
    sourceBase: "Northern European Inn",
    // The Japanese inn is wider than the canonical inn. Keep its façade clear
    // of the foreground market row while allowing its right eave to meet the
    // gatehouse side naturally.
    sceneOffsetX: 50,
    hasChimney: false
  }),
  "Japan Smith": Object.freeze({
    cityType: "japanese",
    regionalOf: "Smith",
    sourceBase: "Northern European Smith",
    hasChimney: false
  }),
  "Japan Gate Far": Object.freeze({
    cityType: "japanese",
    regionalOf: "Far Castle",
    sourceBase: "Castle Wall Far",
    sceneOffsetX: -3,
    hasChimney: false
  }),
  "Japan Gateway": Object.freeze({
    cityType: "japanese",
    regionalOf: "Gate",
    sourceBase: "Far Gate Side",
    hasChimney: false
  }),
  "Japan Gate Near": Object.freeze({
    cityType: "japanese",
    regionalOf: "Near Castle",
    sourceBase: "Castle Wall Near",
    sceneOffsetX: -3,
    hasChimney: false
  })
});

const BUILDING_FOREGROUND_LAYERS = Object.freeze({
  "European Gate Front Edge": Object.freeze({
    layer: "Gate Front Edge",
    sourceBase: "Far Gate Side",
    targetLayer: "Gate"
  }),
  "China Gateway Front Edge": Object.freeze({
    layer: "China Gateway Front Edge",
    cityType: "east-asian",
    regionalOf: "Gate Front Edge",
    sourceBase: "China Gateway",
    targetLayer: "China Gateway"
  }),
  "Japan Gateway Front Edge": Object.freeze({
    layer: "Japan Gateway Front Edge",
    cityType: "japanese",
    regionalOf: "Gate Front Edge",
    sourceBase: "Japan Gateway",
    targetLayer: "Japan Gateway"
  }),
  "Middle East Gate Front Edge": Object.freeze({
    layer: "Middle East Gate Front Edge",
    cityType: "islamic-desert",
    regionalOf: "Gate Front Edge",
    sourceBase: "Middle East Gate",
    targetLayer: "Middle East Gate"
  }),
  "Shipyard Front": Object.freeze({
    layer: "Shipyard Front",
    sourceBase: "Shipyard",
    targetLayer: "Shipyard"
  })
});

const STANDALONE_BUILDING_LAYERS = Object.freeze([
  "Church",
  "Mosque",
  "Japan Pagoda",
  "China Pagoda",
  ...Object.keys(REGIONAL_BUILDING_LAYERS)
]);

const AUTHORED_LAYER_ORDER = Object.freeze([
  "Sky",
  "Ocean",
  "Horizon Mountains",
  "Horizon Mountains Left Bank",
  "Cloud 1",
  "Cloud 2",
  "Cloud 3",
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
  "Rocky Under City",
  "Desert Under City",
  "Grass Under City",
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

await mkdir(portOutputRoot, { recursive: true });
await mkdir(minifolkOutputRoot, { recursive: true });
await mkdir(treeOutputRoot, { recursive: true });
await exportTreeAssets();
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
  assetRevision: await cityViewAssetRevision([
    staticPngPath,
    resolve(portOutputRoot, animated.Waves.sheet),
    resolve(portOutputRoot, animated.Surf.sheet)
  ]),
  source: "apps/pixel-globe/public/assets/city-view/port-parallax.aseprite",
  sourceSize: staticFrames[0].sourceSize,
  safeArea: { x: 455, width: 910, bottom: 583 },
  staticSheet: "static.png",
  layerOrder: AUTHORED_LAYER_ORDER,
  staticFrames,
  animated
};
await writeFile(resolve(portOutputRoot, "manifest.json"), `${JSON.stringify(portManifest)}\n`);

async function cityViewAssetRevision(paths) {
  const digest = createHash("sha256");
  for (const path of paths) digest.update(await readFile(path));
  return digest.digest("hex").slice(0, 16);
}

const minifolksSourceRoot = process.env.MINIFOLKS_SOURCE_ROOT;
if (!minifolksSourceRoot) {
  if (!existsSync(resolve(minifolkOutputRoot, "manifest.json"))) {
    throw new Error(
      "MINIFOLKS_SOURCE_ROOT must point to the private repo's itch/minifolks directory for the first export"
    );
  }
  console.warn("[pixel-globe] MINIFOLKS_SOURCE_ROOT is unset; keeping existing production MiniFolks exports");
} else {
  await exportCityPeopleAssets(minifolksSourceRoot);
}

console.log(
  `[pixel-globe] exported ${AUTHORED_LAYER_ORDER.length} city-view layers ` +
  `and ${CITY_PERSON_APPEARANCES.length} city person appearances to ${outputRoot}`
);

function portableFrame(frame) {
  return {
    frame: frame.frame,
    spriteSourceSize: frame.spriteSourceSize,
    sourceSize: frame.sourceSize,
    duration: frame.duration
  };
}

async function exportCityPeopleAssets(privateSourceRoot) {
  const temporaryRoot = await mkdtemp(resolve(tmpdir(), "polyglobe-city-people-"));
  try {
    const archetypeRasters = new Map();
    for (const archetype of CITY_PERSON_ARCHETYPES) {
      const source = cityPersonSourcePath(archetype, privateSourceRoot);
      if (!existsSync(source)) throw new Error(`Missing city person source: ${source}`);
      const animations = {};
      for (const tag of cityPersonAnimationTags(archetype)) {
        const jsonPath = resolve(temporaryRoot, `${archetype.id}-${tag}.json`);
        const pngPath = resolve(temporaryRoot, `${archetype.id}-${tag}.png`);
        runAseprite([
          "--batch",
          "--all-layers",
          "--tag", tag,
          source,
          "--trim",
          "--sheet-pack",
          "--merge-duplicates",
          "--format", "json-array",
          "--data", jsonPath,
          "--sheet", pngPath
        ]);
        const sheet = JSON.parse(await readFile(jsonPath, "utf8"));
        if (!Array.isArray(sheet.frames) || sheet.frames.length === 0) {
          throw new Error(`City person source has no ${tag} frames: ${archetype.id}`);
        }
        animations[tag] = Object.freeze({
          image: await loadImage(pngPath),
          frames: Object.freeze(sheet.frames.map(portableFrame))
        });
      }
      archetypeRasters.set(archetype.id, combineCityPersonAnimations(animations));
    }

    const archetypeById = new Map(CITY_PERSON_ARCHETYPES.map((entry) => [entry.id, entry]));
    const variants = CITY_PERSON_APPEARANCES.map((appearance) => {
      const archetype = archetypeById.get(appearance.archetypeId);
      if (!archetype) throw new Error(`Unknown city person archetype: ${appearance.archetypeId}`);
      const raster = archetypeRasters.get(archetype.id);
      return Object.freeze({
        appearance,
        archetype,
        animations: raster.animations,
        canvas: paletteSwapCityPerson(raster.image, archetype, appearance)
      });
    });
    const placements = packCityPersonVariants(variants, 256);
    const atlasWidth = Math.max(...placements.map(({ x, variant }) => x + variant.canvas.width));
    const atlasHeight = Math.max(...placements.map(({ y, variant }) => y + variant.canvas.height));
    if (atlasWidth <= 0 || atlasHeight <= 0 || atlasWidth > 256 || atlasHeight > 4096) {
      throw new Error(`Invalid city people atlas dimensions: ${atlasWidth}x${atlasHeight}`);
    }
    const atlas = createCanvas(atlasWidth, atlasHeight);
    const atlasContext = atlas.getContext("2d");
    atlasContext.imageSmoothingEnabled = false;
    const appearances = [];
    for (const { variant, x, y } of placements) {
      atlasContext.drawImage(variant.canvas, x, y);
      appearances.push(Object.freeze({
        id: variant.appearance.id,
        archetypeId: variant.archetype.id,
        roles: variant.archetype.roles,
        skinTone: variant.appearance.skinTone,
        animations: Object.freeze(Object.fromEntries(
          Object.entries(variant.animations).map(([animationId, frames]) => [
            animationId,
            Object.freeze(frames.map((frame) => Object.freeze({
              ...frame,
              frame: Object.freeze({
                ...frame.frame,
                x: frame.frame.x + x,
                y: frame.frame.y + y
              })
            })))
          ])
        ))
      }));
    }

    await rm(minifolkOutputRoot, { recursive: true, force: true });
    await mkdir(minifolkOutputRoot, { recursive: true });
    await writeFile(resolve(minifolkOutputRoot, "people.png"), atlas.toBuffer("image/png"));
    await writeFile(resolve(minifolkOutputRoot, "manifest.json"), `${JSON.stringify({
      format: "marque-city-people-atlas",
      version: 2,
      palette: "Resurrect 64",
      sheet: "people.png",
      credits: [
        { name: "LYASeeK", url: "https://lyaseek.itch.io/" },
        { name: "Garrett Petersen" }
      ],
      appearances
    })}\n`);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

function cityPersonAnimationTags(archetype) {
  return archetype.id === "suspicious-merchant"
    ? Object.freeze(["idle", "walk", "jump", "idle2"])
    : Object.freeze(["idle", "walk", "jump"]);
}

function combineCityPersonAnimations(animations) {
  const entries = Object.entries(animations);
  if (entries.length === 0) throw new Error("City person has no exported animations");
  const width = Math.max(...entries.map(([, animation]) => animation.image.width));
  const height = entries.reduce((sum, [, animation]) => sum + animation.image.height, 0);
  const image = createCanvas(width, height);
  const context = image.getContext("2d");
  context.imageSmoothingEnabled = false;
  const combined = {};
  let y = 0;
  for (const [animationId, animation] of entries) {
    context.drawImage(animation.image, 0, y);
    combined[animationId] = Object.freeze(animation.frames.map((frame) => Object.freeze({
      ...frame,
      frame: Object.freeze({ ...frame.frame, y: frame.frame.y + y })
    })));
    y += animation.image.height;
  }
  return Object.freeze({ image, animations: Object.freeze(combined) });
}

function cityPersonSourcePath(archetype, privateSourceRoot) {
  if (archetype.sourceRepository === "polyglobe-ship-source-assets") {
    return resolve(privateSourceRoot, archetype.sourcePath);
  }
  if (archetype.sourceRepository === "polyglobe") {
    return resolve(appRoot, archetype.sourcePath);
  }
  throw new Error(`Unknown city person source repository: ${archetype.sourceRepository}`);
}

function paletteSwapCityPerson(image, archetype, appearance) {
  const canvas = createCanvas(image.width, image.height);
  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = false;
  context.drawImage(image, 0, 0);
  const imageData = context.getImageData(0, 0, image.width, image.height);
  const sourceColors = new Set();
  const paletteColors = new Set(RESURRECT_64_HEX);
  const replacements = new Map(Object.entries(appearance.palette));
  const targetSkin = CITY_PERSON_SKIN_RAMP[appearance.skinTone];
  if (!targetSkin) throw new Error(`Unknown city person skin tone: ${appearance.skinTone}`);
  if (targetSkin.length < archetype.skinRamp.length) {
    throw new Error(
      `Appearance ${appearance.id} skin ramp has ${targetSkin.length} colors; ` +
      `${archetype.id} requires ${archetype.skinRamp.length}`
    );
  }
  const targetSkinOffset = targetSkin.length - archetype.skinRamp.length;
  for (let index = 0; index < archetype.skinRamp.length; index++) {
    const source = archetype.skinRamp[index];
    const target = targetSkin[targetSkinOffset + index];
    if (replacements.has(source) && replacements.get(source) !== target) {
      throw new Error(`Appearance ${appearance.id} replaces skin color #${source} twice`);
    }
    replacements.set(source, target);
  }
  for (let offset = 0; offset < imageData.data.length; offset += 4) {
    const alpha = imageData.data[offset + 3];
    if (alpha !== 0 && alpha !== 255) {
      throw new Error(`City person source has partial alpha: ${archetype.id}`);
    }
    if (alpha === 0) continue;
    const source = rgbKey(imageData.data, offset);
    if (!paletteColors.has(source)) {
      throw new Error(`City person source ${archetype.id} contains non-Resurrect color #${source}`);
    }
    sourceColors.add(source);
    const target = replacements.get(source);
    if (!target) continue;
    if (!paletteColors.has(target)) {
      throw new Error(`Appearance ${appearance.id} targets non-Resurrect color #${target}`);
    }
    imageData.data[offset] = Number.parseInt(target.slice(0, 2), 16);
    imageData.data[offset + 1] = Number.parseInt(target.slice(2, 4), 16);
    imageData.data[offset + 2] = Number.parseInt(target.slice(4, 6), 16);
  }
  const missingSources = [...replacements.keys()].filter((source) => !sourceColors.has(source));
  if (missingSources.length > 0) {
    throw new Error(
      `Appearance ${appearance.id} palette colors are absent from its exported animations: ` +
      missingSources.map((source) => `#${source}`).join(", ")
    );
  }
  context.putImageData(imageData, 0, 0);
  return canvas;
}

function packCityPersonVariants(variants, maximumWidth) {
  const placements = [];
  let x = 0;
  let y = 0;
  let rowHeight = 0;
  for (const variant of variants) {
    if (variant.canvas.width > maximumWidth) {
      throw new Error(`City person sheet exceeds atlas width: ${variant.appearance.id}`);
    }
    if (x > 0 && x + variant.canvas.width > maximumWidth) {
      x = 0;
      y += rowHeight;
      rowHeight = 0;
    }
    placements.push(Object.freeze({ variant, x, y }));
    x += variant.canvas.width;
    rowHeight = Math.max(rowHeight, variant.canvas.height);
  }
  return placements;
}

function rgbKey(rgba, offset) {
  return [rgba[offset], rgba[offset + 1], rgba[offset + 2]]
    .map((component) => component.toString(16).padStart(2, "0"))
    .join("");
}

async function exportTreeAssets() {
  if (!existsSync(treeSource)) throw new Error(`Missing city tree source: ${treeSource}`);
  const dataPath = resolve(treeOutputRoot, "source.json");
  const sheetPath = resolve(treeOutputRoot, "trees.png");
  runAseprite([
    "--batch",
    "--all-layers",
    "--frame-range", "0,0",
    "--split-layers",
    treeSource,
    "--trim",
    "--sheet-pack",
    "--merge-duplicates",
    "--list-layers",
    "--format", "json-array",
    "--data", dataPath,
    "--sheet", sheetPath
  ]);
  const sheet = JSON.parse(await readFile(dataPath, "utf8"));
  const frames = sheet.frames.map((frame) => ({
    layer: layerNameFromFilename(frame.filename),
    ...portableFrame(frame)
  }));
  const treeLayers = frames.filter(({ layer }) => !layer.endsWith(" Shadow"));
  const trees = treeLayers.map((tree) => {
    const shadow = frames.find(({ layer }) => layer === `${tree.layer} Shadow`);
    if (!shadow) throw new Error(`Missing tree shadow layer: ${tree.layer}`);
    return Object.freeze({
      id: tree.layer.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replaceAll(/^-|-$/g, ""),
      name: tree.layer,
      frame: portableTreeFrame(tree),
      shadow: portableTreeFrame(shadow)
    });
  });
  if (trees.length === 0) throw new Error("City tree source exports no tree layers");
  const manifest = Object.freeze({
    format: "marque-city-tree-atlas",
    version: 1,
    source: "apps/pixel-globe/public/assets/city-view/trees.aseprite",
    sheet: "trees.png",
    palette: "Resurrect 64",
    trees
  });
  await writeFile(resolve(treeOutputRoot, "manifest.json"), `${JSON.stringify(manifest)}\n`);
  await rm(dataPath);
}

function portableTreeFrame(frame) {
  return Object.freeze({
    frame: frame.frame,
    spriteSourceSize: frame.spriteSourceSize,
    sourceSize: frame.sourceSize
  });
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
      ...STANDALONE_BUILDING_LAYERS,
      ...Object.keys(BUILDING_FOREGROUND_LAYERS)
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
    const appendedFrames = overrideFrames.filter((frame) => (
      STANDALONE_BUILDING_LAYERS.includes(frame.layer) ||
      Object.hasOwn(BUILDING_FOREGROUND_LAYERS, frame.layer)
    ));
    const appendedHeight = appendedFrames.reduce((height, frame) => height + frame.frame.h, 0);
    const appendedWidth = appendedFrames.reduce(
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
    for (const standaloneFrame of appendedFrames) {
      const regional = REGIONAL_BUILDING_LAYERS[standaloneFrame.layer];
      const foreground = BUILDING_FOREGROUND_LAYERS[standaloneFrame.layer];
      const targetFrame = foreground
        ? staticFrames.find((frame) => frame.layer === foreground.targetLayer)
        : null;
      const sourceBaseFrame = foreground
        ? visibleFrames.find((frame) => frame.layer === foreground.sourceBase)
        : null;
      const canonicalSpriteSourceSize = foreground
        ? foregroundBuildingSpriteSourceSize({
            foregroundFrame: standaloneFrame,
            sourceBaseFrame,
            targetFrame
          })
        : regional
        ? regionalBuildingSpriteSourceSize({
            regionalFrame: standaloneFrame,
            sourceBaseFrame: visibleFrames.find((frame) => frame.layer === regional.sourceBase),
            targetFrame: staticFrames.find((frame) => frame.layer === regional.regionalOf),
            sceneOffsetX: regional.sceneOffsetX ?? 0
          })
        : standaloneFrame.spriteSourceSize;
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
        layer: foreground?.layer || standaloneFrame.layer,
        sheet: "static.png",
        frame: {
          x: 0,
          y: appendedY,
          w: standaloneFrame.frame.w,
          h: standaloneFrame.frame.h
        },
        spriteSourceSize: canonicalSpriteSourceSize,
        sourceSize: foreground
          ? targetFrame.sourceSize
          : regional
          ? staticFrames.find((frame) => frame.layer === regional.regionalOf).sourceSize
          : standaloneFrame.sourceSize,
        duration: standaloneFrame.duration,
        ...(foreground?.cityType ? {
          cityType: foreground.cityType,
          regionalOf: foreground.regionalOf,
          hasChimney: false
        } : regional ? {
          cityType: regional.cityType,
          regionalOf: regional.regionalOf,
          ...(regional.hasChimney === false ? { hasChimney: false } : {})
        } : {})
      });
      appendedY += standaloneFrame.frame.h;
    }
    await writeFile(staticPngPath, canvas.toBuffer("image/png"));
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

function foregroundBuildingSpriteSourceSize({ foregroundFrame, sourceBaseFrame, targetFrame }) {
  if (!sourceBaseFrame || !targetFrame) {
    throw new Error(`Missing scene anchor for building foreground: ${foregroundFrame.layer}`);
  }
  return {
    x: targetFrame.spriteSourceSize.x +
      foregroundFrame.spriteSourceSize.x - sourceBaseFrame.spriteSourceSize.x,
    y: targetFrame.spriteSourceSize.y +
      foregroundFrame.spriteSourceSize.y - sourceBaseFrame.spriteSourceSize.y,
    w: foregroundFrame.frame.w,
    h: foregroundFrame.frame.h
  };
}

function regionalBuildingSpriteSourceSize({
  regionalFrame,
  sourceBaseFrame,
  targetFrame,
  sceneOffsetX = 0
}) {
  if (!sourceBaseFrame || !targetFrame) {
    throw new Error(`Missing canonical source for regional building: ${regionalFrame.layer}`);
  }
  if (!Number.isInteger(sceneOffsetX)) {
    throw new Error(`Invalid regional building scene offset: ${regionalFrame.layer}/${sceneOffsetX}`);
  }
  return {
    x: targetFrame.spriteSourceSize.x + (
      regionalFrame.spriteSourceSize.x - sourceBaseFrame.spriteSourceSize.x
    ) + sceneOffsetX,
    // Every regional variant shares the canonical scene ground line. Authored
    // source layers can trim one transparent row differently, which must not
    // make a replacement building hover or sink by a pixel in the quay scene.
    y: targetFrame.spriteSourceSize.y + targetFrame.spriteSourceSize.h - regionalFrame.frame.h,
    w: regionalFrame.frame.w,
    h: regionalFrame.frame.h
  };
}

function runAseprite(args) {
  const sourcePath = args.find((argument) => argument.endsWith(".aseprite")) || args.join(" ");
  for (let attempt = 1; attempt <= ASEPRITE_EXPORT_MAX_ATTEMPTS; attempt++) {
    const result = spawnSync(aseprite, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: ASEPRITE_EXPORT_TIMEOUT_MS
    });
    if (!result.error && result.status === 0) return;
    if (result.error?.code !== "ETIMEDOUT") {
      throw new Error(
        `Aseprite export failed (${result.status}): ` +
        `${result.error?.message || result.stderr || result.stdout || args.join(" ")}`
      );
    }
    if (attempt < ASEPRITE_EXPORT_MAX_ATTEMPTS) {
      console.warn(
        `[pixel-globe] Aseprite timed out after ${ASEPRITE_EXPORT_TIMEOUT_MS}ms; ` +
        `retrying export (${attempt + 1}/${ASEPRITE_EXPORT_MAX_ATTEMPTS}): ${sourcePath}`
      );
      continue;
    }
    throw new Error(
      `Aseprite export timed out ${ASEPRITE_EXPORT_MAX_ATTEMPTS} times: ${args.join(" ")}`
    );
  }
  throw new Error("Aseprite export exhausted attempts without a result");
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
