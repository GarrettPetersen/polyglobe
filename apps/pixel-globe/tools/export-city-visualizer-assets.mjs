import { existsSync, readFileSync, statSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

import { createCanvas, loadImage } from "../../../examples/globe-demo/node_modules/canvas/index.js";
import {
  CITY_PERSON_APPEARANCES,
  CITY_PERSON_ARCHETYPES,
  CITY_PERSON_SKIN_RAMP
} from "../city-visualizer/cityPeopleCatalog.js";
import {
  CITY_PEOPLE_MANIFEST_FORMAT,
  CITY_PEOPLE_MANIFEST_VERSION
} from "../city-visualizer/cityPeople.js";
import { RESURRECT_64_HEX } from "../src/waterLatitudePalette.js";
import { validateCityBuildingLayers } from "./cityBuildingExportContract.mjs";

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
const TREE_SOURCE_WIDTH = 100;
const TREE_SOURCE_HEIGHT = 150;
const TREE_ATLAS_COLUMNS = 6;
const TREE_PARTICLE_EMITTER_COUNT = 64;
const LARCH_AUTUMN_PALETTE = Object.freeze({
  "165a4c": "676633",
  "239063": "a2a947",
  "91db69": "d5e04b"
});
const DECIDUOUS_AUTUMN_PALETTE = Object.freeze({
  "165a4c": "9e4539",
  "239063": "cd683d",
  "91db69": "fbb954"
});
// A few gunner combat cels retain near-identical pre-conversion colors, plus
// one half-opacity layer composite. Keep the repairs explicit so any other
// out-of-palette source color still fails.
const CITY_PERSON_SOURCE_COLOR_CORRECTIONS = Object.freeze({
  gunner: Object.freeze({
    bf9b58: "a2a947",
    b77929: "cd683d",
    ce8732: "cd683d",
    fbb55b: "fbb954",
    "9d8b3a": "a2a947"
  })
});

const BUILDING_LAYER_OVERRIDES = Object.freeze({
  "Northern European Inn": "Inn",
  "Northern Europe Home": "Home",
  "Northern Europe Home 2": "Home 2",
  "Northern European Smith": "Smith"
});

const REGIONAL_BUILDING_LAYERS = Object.freeze({
  // The far wall includes a ground shadow: anchor to the gateway rather than
  // its trimmed bottom so extending the shadow cannot lift the wall.
  // Keep the established three-pixel scene correction relative to the source gateway.
  "Palisade Far": Object.freeze({ cityType: "wooden-palisade", regionalOf: "Far Castle", sourceBase: "Palisade Gateway", anchorLayer: "Gate", sceneOffsetY: 3, hasChimney: false }),
  "Palisade Gateway": Object.freeze({ cityType: "wooden-palisade", regionalOf: "Gate", sourceBase: "Far Gate Side", hasChimney: false }),
  "Palisade Near": Object.freeze({ cityType: "wooden-palisade", regionalOf: "Near Castle", sourceBase: "Castle Wall Near", hasChimney: false }),
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
  "Palisade Gateway Front Edge": Object.freeze({
    layer: "Palisade Gateway Front Edge",
    cityType: "wooden-palisade",
    regionalOf: "Gate Front Edge",
    sourceBase: "Palisade Gateway",
    targetLayer: "Palisade Gateway"
  }),
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
  "Pyramid",
  ...Object.keys(REGIONAL_BUILDING_LAYERS)
]);

const HORIZON_LANDMARK_BUILDING_LAYERS = Object.freeze({
  Pyramid: Object.freeze({
    sceneX: 775,
    sceneY: 399,
    sourceWidth: 200,
    sourceHeight: 102,
    renderScale: 0.5
  })
});

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
  "Pyramid",
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
  "Table shadow",
  "Table",
  "Plate",
  "Serving Platter",
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
await runAseprite([
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
const expectedStaticNames = AUTHORED_LAYER_ORDER.filter((name) => (
  name !== "Waves" &&
  name !== "Surf" &&
  !Object.hasOwn(HORIZON_LANDMARK_BUILDING_LAYERS, name)
));
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
  await runAseprite([
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
      for (const { animationId, sourceTag } of cityPersonAnimationTags(archetype)) {
        const jsonPath = resolve(temporaryRoot, `${archetype.id}-${animationId}.json`);
        const pngPath = resolve(temporaryRoot, `${archetype.id}-${animationId}.png`);
        await runAseprite([
          "--batch",
          "--all-layers",
          "--tag", sourceTag,
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
          throw new Error(`City person source has no ${sourceTag} frames: ${archetype.id}`);
        }
        animations[animationId] = Object.freeze({
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
    const placements = packCityPersonVariants(variants, 1024);
    const atlasWidth = Math.max(...placements.map(({ x, variant }) => x + variant.canvas.width));
    const atlasHeight = Math.max(...placements.map(({ y, variant }) => y + variant.canvas.height));
    if (atlasWidth <= 0 || atlasHeight <= 0 || atlasWidth > 1024 || atlasHeight > 4096) {
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
    const peopleSheetPath = resolve(minifolkOutputRoot, "people.png");
    await writeFile(peopleSheetPath, atlas.toBuffer("image/png"));
    await writeFile(resolve(minifolkOutputRoot, "manifest.json"), `${JSON.stringify({
      format: CITY_PEOPLE_MANIFEST_FORMAT,
      version: CITY_PEOPLE_MANIFEST_VERSION,
      assetRevision: await cityViewAssetRevision([peopleSheetPath]),
      palette: "Resurrect 64",
      sheet: "people.png",
      sheetSize: Object.freeze({ w: atlasWidth, h: atlasHeight }),
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
  const tags = ["idle", "walk", "jump", "death"]
    .map((sourceTag) => ({ animationId: sourceTag, sourceTag }));
  if (archetype.id === "suspicious-merchant") tags.push({ animationId: "idle2", sourceTag: "idle2" });
  if (archetype.supplementalAnimations) {
    for (const [animationId, sourceTag] of Object.entries(archetype.supplementalAnimations)) {
      tags.push({ animationId, sourceTag });
    }
  }
  if (archetype.combatAnimations) {
    for (const [animationId, sourceTag] of Object.entries(archetype.combatAnimations)) {
      if (!tags.some((tag) => tag.animationId === animationId)) {
        tags.push({ animationId, sourceTag });
      }
    }
  }
  return Object.freeze(tags.map(Object.freeze));
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
  const sourceCorrections = new Map(Object.entries(
    CITY_PERSON_SOURCE_COLOR_CORRECTIONS[archetype.id] || {}
  ));
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
    const correctedSource = sourceCorrections.get(source);
    if (!paletteColors.has(source) && !correctedSource) {
      throw new Error(`City person source ${archetype.id} contains non-Resurrect color #${source}`);
    }
    if (correctedSource && !paletteColors.has(correctedSource)) {
      throw new Error(`City person source correction targets non-Resurrect color #${correctedSource}`);
    }
    const paletteSource = correctedSource || source;
    sourceColors.add(paletteSource);
    const target = replacements.get(paletteSource) || correctedSource;
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
  await runAseprite([
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
  const frameByLayer = new Map(frames.map((frame) => [frame.layer, frame]));
  if (frameByLayer.size !== frames.length) throw new Error("City tree source has duplicate layer names");
  const sourceAtlas = await loadImage(sheetPath);
  const ordinaryTreeLayers = frames.filter(({ layer }) => (
    !layer.endsWith(" Shadow") && frameByLayer.has(`${layer} Shadow`)
  ));
  const rasterEntries = [];
  const treeSpecs = ordinaryTreeLayers.map((tree) => {
    const id = treeLayerId(tree.layer);
    const variants = { foliage: addTreeRaster(rasterEntries, `${id}:foliage`,
      composeTreeLayers(sourceAtlas, frameByLayer, [tree.layer])) };
    if (tree.layer === "Larch") {
      variants.autumn = addTreeRaster(rasterEntries, `${id}:autumn`,
        composeTreeLayers(sourceAtlas, frameByLayer, [tree.layer], LARCH_AUTUMN_PALETTE));
      variants.bare = addTreeRaster(rasterEntries, `${id}:bare`,
        composeTreeLayers(sourceAtlas, frameByLayer, ["Larch Bare"]));
    }
    return Object.freeze({
      id,
      name: tree.layer,
      variants,
      shadow: addTreeRaster(rasterEntries, `${id}:shadow`,
        composeTreeLayers(sourceAtlas, frameByLayer, [`${tree.layer} Shadow`]))
    });
  });
  const cherryVariants = {
    foliage: addTreeRaster(rasterEntries, "cherry:foliage",
      composeTreeLayers(sourceAtlas, frameByLayer, ["Cherry Trunk", "Cherry Leaves"])),
    blossom: addTreeRaster(rasterEntries, "cherry:blossom",
      composeTreeLayers(sourceAtlas, frameByLayer, ["Cherry Trunk", "Cherry Blossoms"])),
    autumn: addTreeRaster(rasterEntries, "cherry:autumn",
      composeTreeLayers(
        sourceAtlas,
        frameByLayer,
        ["Cherry Trunk", "Cherry Leaves"],
        DECIDUOUS_AUTUMN_PALETTE
      )),
    bare: addTreeRaster(rasterEntries, "cherry:bare",
      composeTreeLayers(sourceAtlas, frameByLayer, ["Cherry Trunk"]))
  };
  treeSpecs.push(Object.freeze({
    id: "cherry",
    name: "Cherry",
    variants: cherryVariants,
    shadow: addTreeRaster(rasterEntries, "cherry:shadow",
      composeTreeLayers(sourceAtlas, frameByLayer, ["Cherry Shadow"])),
    particleColors: Object.freeze({
      blossom: Object.freeze(["eaaded", "f04f78"]),
      leaf: Object.freeze(["cd683d", "fbb954"])
    }),
    particleEmitters: Object.freeze({
      blossom: treeParticleEmitterPoints(
        sourceAtlas,
        frameByLayer,
        "Cherry Blossoms",
        ["eaaded", "f04f78"]
      ),
      leaf: treeParticleEmitterPoints(
        sourceAtlas,
        frameByLayer,
        "Cherry Leaves",
        ["165a4c", "239063", "91db69"]
      )
    })
  }));
  const packedAtlas = packTreeRasters(rasterEntries);
  await writeFile(sheetPath, packedAtlas.canvas.toBuffer("image/png"));
  const trees = treeSpecs.map((tree) => {
    const variants = Object.freeze(Object.fromEntries(
      Object.entries(tree.variants).map(([season, entry]) => [season, packedAtlas.frameByKey.get(entry.key)])
    ));
    const foliage = variants.foliage;
    if (!foliage) throw new Error(`City tree has no foliage frame: ${tree.id}`);
    return Object.freeze({
      id: tree.id,
      name: tree.name,
      // Retain frame as the canonical placement dimensions while variants
      // express the actual seasonal presentation.
      frame: foliage,
      variants,
      shadow: packedAtlas.frameByKey.get(tree.shadow.key),
      ...(tree.particleColors ? { particleColors: tree.particleColors } : {}),
      ...(tree.particleEmitters ? { particleEmitters: tree.particleEmitters } : {})
    });
  });
  if (trees.length === 0) throw new Error("City tree source exports no tree layers");
  const manifest = Object.freeze({
    format: "marque-city-tree-atlas",
    version: 2,
    source: "apps/pixel-globe/public/assets/city-view/trees.aseprite",
    sheet: "trees.png",
    palette: "Resurrect 64",
    trees
  });
  await writeFile(resolve(treeOutputRoot, "manifest.json"), `${JSON.stringify(manifest)}\n`);
  await rm(dataPath);
}

function treeLayerId(layer) {
  return layer.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replaceAll(/^-|-$/g, "");
}

function addTreeRaster(entries, key, canvas) {
  if (entries.some((entry) => entry.key === key)) throw new Error(`Duplicate tree raster: ${key}`);
  const entry = Object.freeze({ key, canvas });
  entries.push(entry);
  return entry;
}

function composeTreeLayers(sourceAtlas, frameByLayer, layerNames, palette = null) {
  const canvas = createCanvas(TREE_SOURCE_WIDTH, TREE_SOURCE_HEIGHT);
  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = false;
  for (const layerName of layerNames) {
    const layer = frameByLayer.get(layerName);
    if (!layer) throw new Error(`Missing authored city tree layer: ${layerName}`);
    if (layer.sourceSize.w !== TREE_SOURCE_WIDTH || layer.sourceSize.h !== TREE_SOURCE_HEIGHT) {
      throw new Error(
        `City tree layer ${layerName} is ${layer.sourceSize.w}x${layer.sourceSize.h}; ` +
        `expected ${TREE_SOURCE_WIDTH}x${TREE_SOURCE_HEIGHT}`
      );
    }
    context.drawImage(
      sourceAtlas,
      layer.frame.x,
      layer.frame.y,
      layer.frame.w,
      layer.frame.h,
      layer.spriteSourceSize.x,
      layer.spriteSourceSize.y,
      layer.frame.w,
      layer.frame.h
    );
  }
  if (palette) applyExactPaletteSwap(context, palette, layerNames.join(" + "));
  return canvas;
}

function applyExactPaletteSwap(context, palette, label) {
  const imageData = context.getImageData(0, 0, TREE_SOURCE_WIDTH, TREE_SOURCE_HEIGHT);
  const replacements = new Map(Object.entries(palette));
  const replaced = new Set();
  for (let offset = 0; offset < imageData.data.length; offset += 4) {
    if (imageData.data[offset + 3] === 0) continue;
    const source = rgbKey(imageData.data, offset);
    const target = replacements.get(source);
    if (!target) continue;
    replaced.add(source);
    imageData.data[offset] = Number.parseInt(target.slice(0, 2), 16);
    imageData.data[offset + 1] = Number.parseInt(target.slice(2, 4), 16);
    imageData.data[offset + 2] = Number.parseInt(target.slice(4, 6), 16);
  }
  const missing = [...replacements.keys()].filter((source) => !replaced.has(source));
  if (missing.length > 0) {
    throw new Error(`City tree palette sources absent from ${label}: ${missing.join(", ")}`);
  }
  context.putImageData(imageData, 0, 0);
}

function treeParticleEmitterPoints(sourceAtlas, frameByLayer, layerName, expectedColors) {
  const layer = frameByLayer.get(layerName);
  if (!layer) throw new Error(`Missing authored city tree particle layer: ${layerName}`);
  const canvas = createCanvas(layer.frame.w, layer.frame.h);
  const context = canvas.getContext("2d");
  context.drawImage(
    sourceAtlas,
    layer.frame.x,
    layer.frame.y,
    layer.frame.w,
    layer.frame.h,
    0,
    0,
    layer.frame.w,
    layer.frame.h
  );
  const pixels = context.getImageData(0, 0, layer.frame.w, layer.frame.h).data;
  const expected = new Set(expectedColors);
  const observed = new Set();
  const candidates = [];
  for (let y = 0; y < layer.frame.h; y++) {
    for (let x = 0; x < layer.frame.w; x++) {
      const offset = (y * layer.frame.w + x) * 4;
      if (pixels[offset + 3] === 0) continue;
      const color = rgbKey(pixels, offset);
      if (!expected.has(color)) {
        throw new Error(`Unexpected city tree particle color #${color} in ${layerName}`);
      }
      observed.add(color);
      candidates.push(Object.freeze({
        x: layer.spriteSourceSize.x + x,
        y: layer.spriteSourceSize.y + y
      }));
    }
  }
  const missingColors = [...expected].filter((color) => !observed.has(color));
  if (missingColors.length > 0 || candidates.length < TREE_PARTICLE_EMITTER_COUNT) {
    throw new Error(
      `City tree particle layer ${layerName} lacks required authored pixels: ` +
      `${missingColors.join(", ") || `${candidates.length} candidates`}`
    );
  }
  return Object.freeze(Array.from({ length: TREE_PARTICLE_EMITTER_COUNT }, (_, index) => (
    candidates[Math.floor(index * candidates.length / TREE_PARTICLE_EMITTER_COUNT)]
  )));
}

function packTreeRasters(entries) {
  if (entries.length === 0) throw new Error("City tree atlas has no rasters to pack");
  const columns = Math.min(TREE_ATLAS_COLUMNS, entries.length);
  const rows = Math.ceil(entries.length / columns);
  const canvas = createCanvas(columns * TREE_SOURCE_WIDTH, rows * TREE_SOURCE_HEIGHT);
  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = false;
  const frameByKey = new Map();
  entries.forEach((entry, index) => {
    const x = index % columns * TREE_SOURCE_WIDTH;
    const y = Math.floor(index / columns) * TREE_SOURCE_HEIGHT;
    context.drawImage(entry.canvas, x, y);
    frameByKey.set(entry.key, Object.freeze({
      frame: Object.freeze({ x, y, w: TREE_SOURCE_WIDTH, h: TREE_SOURCE_HEIGHT }),
      spriteSourceSize: Object.freeze({ x: 0, y: 0, w: TREE_SOURCE_WIDTH, h: TREE_SOURCE_HEIGHT }),
      sourceSize: Object.freeze({ w: TREE_SOURCE_WIDTH, h: TREE_SOURCE_HEIGHT })
    }));
  });
  return Object.freeze({ canvas, frameByKey });
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
    await runAseprite([
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
    validateCityBuildingLayers(visibleFrames, expectedLayerNames);

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
      const horizonLandmark = HORIZON_LANDMARK_BUILDING_LAYERS[standaloneFrame.layer];
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
        : horizonLandmark
        ? horizonLandmarkSpriteSourceSize(standaloneFrame, horizonLandmark)
        : regional
        ? regionalBuildingSpriteSourceSize({
            regionalFrame: standaloneFrame,
            sourceBaseFrame: visibleFrames.find((frame) => frame.layer === regional.sourceBase),
            targetFrame: staticFrames.find((frame) => frame.layer === (regional.anchorLayer || regional.regionalOf)),
            anchorToSourceBase: Boolean(regional.anchorLayer),
            sceneOffsetY: regional.sceneOffsetY ?? 0,
            sceneOffsetX: regional.sceneOffsetX ?? 0
          })
        : standaloneFrame.spriteSourceSize;
      const renderedWidth = horizonLandmark
        ? canonicalSpriteSourceSize.w
        : standaloneFrame.frame.w;
      const renderedHeight = horizonLandmark
        ? canonicalSpriteSourceSize.h
        : standaloneFrame.frame.h;
      context.drawImage(
        overrideAtlas,
        standaloneFrame.frame.x,
        standaloneFrame.frame.y,
        standaloneFrame.frame.w,
        standaloneFrame.frame.h,
        0,
        appendedY,
        renderedWidth,
        renderedHeight
      );
      staticFrames.push({
        id: `building-${standaloneFrame.layer.toLowerCase().replaceAll(" ", "-")}`,
        layer: foreground?.layer || standaloneFrame.layer,
        sheet: "static.png",
        frame: {
          x: 0,
          y: appendedY,
          w: renderedWidth,
          h: renderedHeight
        },
        spriteSourceSize: canonicalSpriteSourceSize,
        sourceSize: foreground
          ? targetFrame.sourceSize
          : horizonLandmark
          ? staticFrames[0].sourceSize
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

function horizonLandmarkSpriteSourceSize(frame, placement) {
  if (frame.frame.w !== placement.sourceWidth || frame.frame.h !== placement.sourceHeight) {
    throw new Error(
      `${frame.layer} must remain ${placement.sourceWidth}x${placement.sourceHeight} ` +
      "to preserve its horizon placement"
    );
  }
  if (!Number.isFinite(placement.renderScale) || placement.renderScale <= 0 || placement.renderScale > 1) {
    throw new Error(`${frame.layer} horizon scale must be within (0, 1]`);
  }
  const renderedWidth = frame.frame.w * placement.renderScale;
  const renderedHeight = frame.frame.h * placement.renderScale;
  if (!Number.isInteger(renderedWidth) || !Number.isInteger(renderedHeight)) {
    throw new Error(`${frame.layer} horizon scale must produce integer pixel dimensions`);
  }
  return {
    x: placement.sceneX,
    y: placement.sceneY,
    w: renderedWidth,
    h: renderedHeight
  };
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
  anchorToSourceBase = false,
  sceneOffsetY = 0,
  sceneOffsetX = 0
}) {
  if (!sourceBaseFrame || !targetFrame) {
    throw new Error(`Missing canonical source for regional building: ${regionalFrame.layer}`);
  }
  if (!Number.isInteger(sceneOffsetX) || !Number.isInteger(sceneOffsetY)) {
    throw new Error(`Invalid regional building scene offset: ${regionalFrame.layer}/${sceneOffsetX},${sceneOffsetY}`);
  }
  return {
    x: targetFrame.spriteSourceSize.x + (
      regionalFrame.spriteSourceSize.x - sourceBaseFrame.spriteSourceSize.x
    ) + sceneOffsetX,
    // Normally variants share the canonical ground line despite trim differences.
    // Shadow-bearing pieces instead retain their authored offset from a grounded
    // source anchor; the shadow's bottom is not the wall's ground line.
    y: sceneOffsetY + targetFrame.spriteSourceSize.y + targetFrame.spriteSourceSize.h - (
      anchorToSourceBase
        ? sourceBaseFrame.frame.h - regionalFrame.spriteSourceSize.y + sourceBaseFrame.spriteSourceSize.y
        : regionalFrame.frame.h
    ),
    w: regionalFrame.frame.w,
    h: regionalFrame.frame.h
  };
}

async function runAseprite(args) {
  const sourcePath = args.find((argument) => argument.endsWith(".aseprite")) || args.join(" ");
  for (let attempt = 1; attempt <= ASEPRITE_EXPORT_MAX_ATTEMPTS; attempt++) {
    const result = await runAsepriteAttempt(args);
    if (!result.error && result.status === 0) return;
    if (result.artifactsComplete) {
      console.warn(
        `[pixel-globe] Aseprite produced complete export artifacts before its process exited: ${sourcePath}`
      );
      return;
    }
    if (!result.timedOut) {
      throw new Error(
        `Aseprite export failed (${result.status}): ` +
        `${result.error?.message || result.stderr || result.stdout || result.signal || args.join(" ")}`
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

function runAsepriteAttempt(args) {
  return new Promise((resolveAttempt) => {
    const startedAtMs = Date.now();
    let stdout = "";
    let stderr = "";
    let settled = false;
    let artifactsComplete = false;
    let timedOut = false;
    let lastArtifactSignature = null;
    let stableArtifactObservations = 0;
    let forceKillTimer = null;
    const child = spawn(aseprite, args, { stdio: ["ignore", "pipe", "pipe"] });
    const appendOutput = (current, chunk) => `${current}${chunk}`.slice(-100_000);
    child.stdout.on("data", (chunk) => { stdout = appendOutput(stdout, chunk); });
    child.stderr.on("data", (chunk) => { stderr = appendOutput(stderr, chunk); });

    const pollingTimer = setInterval(() => {
      const signature = asepriteExportArtifactSignature(args, startedAtMs);
      if (!signature) {
        lastArtifactSignature = null;
        stableArtifactObservations = 0;
        return;
      }
      stableArtifactObservations = signature === lastArtifactSignature
        ? stableArtifactObservations + 1
        : 1;
      lastArtifactSignature = signature;
      if (stableArtifactObservations < 2 || artifactsComplete) return;
      artifactsComplete = true;
      child.kill("SIGTERM");
      forceKillTimer = setTimeout(() => child.kill("SIGKILL"), 1_000);
    }, 100);
    const timeoutTimer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      forceKillTimer = setTimeout(() => child.kill("SIGKILL"), 1_000);
    }, ASEPRITE_EXPORT_TIMEOUT_MS);

    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearInterval(pollingTimer);
      clearTimeout(timeoutTimer);
      if (forceKillTimer) clearTimeout(forceKillTimer);
      resolveAttempt({ stdout, stderr, artifactsComplete, timedOut, ...result });
    };
    child.on("error", (error) => finish({ status: null, signal: null, error }));
    child.on("exit", (status, signal) => finish({ status, signal, error: null }));
  });
}

function asepriteExportArtifactSignature(args, startedAtMs) {
  const dataIndex = args.indexOf("--data");
  const sheetIndex = args.indexOf("--sheet");
  if (dataIndex < 0 || sheetIndex < 0) return null;
  const dataPath = args[dataIndex + 1];
  const sheetPath = args[sheetIndex + 1];
  if (!dataPath || !sheetPath || !existsSync(dataPath) || !existsSync(sheetPath)) return null;
  const dataStat = statSync(dataPath);
  const sheetStat = statSync(sheetPath);
  const oldestAcceptedMtimeMs = startedAtMs - 1000;
  if (dataStat.mtimeMs < oldestAcceptedMtimeMs || sheetStat.mtimeMs < oldestAcceptedMtimeMs) return null;
  try {
    const metadata = JSON.parse(readFileSync(dataPath, "utf8"));
    const png = readFileSync(sheetPath);
    const complete = Array.isArray(metadata.frames) && metadata.frames.length > 0 &&
      png.length >= 20 &&
      png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
      png.subarray(-8, -4).equals(Buffer.from("IEND"));
    return complete
      ? `${dataStat.size}:${dataStat.mtimeMs}:${sheetStat.size}:${sheetStat.mtimeMs}`
      : null;
  } catch {
    return null;
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
