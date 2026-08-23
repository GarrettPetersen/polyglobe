import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createCanvas, loadImage } from "../../../examples/globe-demo/node_modules/canvas/index.js";
import * as THREE from "../../../examples/globe-demo/node_modules/three/build/three.module.js";
import { FBXLoader } from "../../../examples/globe-demo/node_modules/three/examples/jsm/loaders/FBXLoader.js";
import { GLTFLoader } from "../../../examples/globe-demo/node_modules/three/examples/jsm/loaders/GLTFLoader.js";
import {
  BACTRIAN_CAMEL_MODEL_CREDIT,
  BLUE_WHALE_MODEL_CREDIT,
  BOROBUDUR_SHIP_MODEL_CREDIT,
  CARTOON_HORSE_MODEL_CREDIT,
  CYC3W_SAILING_SHIP_MODEL_CREDIT,
  DROMEDARY_CAMEL_MODEL_CREDIT,
  GOGIART_DHOW_MODEL_CREDIT,
  HUMPBACK_WHALE_MODEL_CREDIT,
  ICEBERG_MODEL_CREDIT,
  JAPANESE_ATAKEBUNE_MODEL_CREDIT,
  JAPANESE_KOBAYA_MODEL_CREDIT,
  JAPANESE_KURIBUNE_MODEL_CREDIT,
  JAPANESE_SEKIBUNE_MODEL_CREDIT,
  JOSEON_PANOKSEON_MODEL_CREDIT,
  JOSEON_TURTLE_SHIP_MODEL_CREDIT,
  KELULUS_MODEL_CREDIT,
  LANCARAN_MODEL_CREDIT,
  LOWPOLY_LLAMA_MODEL_CREDIT,
  MEDITERRANEAN_GALLEY_MODEL_CREDIT,
  MESOAMERICAN_CANOE_MODEL_CREDIT,
  OCEAN_DHOW_MODEL_CREDIT,
  PENJAJAP_MODEL_CREDIT,
  POLYNESIAN_CANOE_MODEL_CREDIT,
  NAO_VICTORIA_MODEL_CREDIT,
  NORTH_ATLANTIC_RIGHT_WHALE_MODEL_CREDIT,
  OTTOMAN_COASTAL_TRADER_MODEL_CREDIT,
  PORTUGUESE_CARRACK_MODEL_CREDIT,
  ROYAL_LANCARAN_MODEL_CREDIT,
  SOUTHERN_MINKE_WHALE_MODEL_CREDIT,
  SPERM_WHALE_MODEL_CREDIT,
  UNITY_FLEET_MODEL_CREDIT,
  WOODEN_CART_MODEL_CREDIT
} from "../src/modelCredits.js";
import {
  FUSTA_SLUG,
  JOSEON_HYEOPSEON_SLUG,
  SHIP_STATS,
  shipStatsForSlug,
  validateShipStatsForSlugs
} from "../src/shipStats.js";
import { hardEdgeSampleMap } from "../src/hardEdgeDownsample.js";
import {
  convexPolygonHull,
  shipProjectileSilhouetteFromAlpha
} from "../src/shipFootprint.js";
import { simplifySpanishNaoTextureColor } from "../src/spanishNaoTexture.js";
import {
  fustaHullColor,
  galleassHullColor,
  mediterraneanGalleyHullColor
} from "../src/mediterraneanGalleyColors.js";
import { hyeopseonHullColor } from "../src/joseonShipColors.js";
import {
  SHIP_DECK_NORMAL_Y,
  SHIP_MIN_RASTER_WATERLINE_DEPTH,
  SHIP_WATERLINE_DEPTH_BYTE,
  SHIP_WATERLINE_LEVEL,
  encodedShipWaterlineY,
  shipMaxRasterWaterlineDepth,
  shipPixelBakeHeight
} from "../src/shipWaterline.js";
import { estimateShipWaterlineY } from "../src/shipWaterlineSlice.js";
import {
  createShipModelBasisOrientation,
  orientCyc3wGalleonToCanonical,
  orientNegativeXForwardYUpToZForward,
  orientPositiveXForwardToZForward,
  orientPositiveXForwardZUpToZForward,
  rotateY
} from "../src/shipModelOrientation.js";
import {
  SHIP_SHADOW_FRAME_SIZE,
  SHIP_SPRITE_FRAME_SIZE,
  SHIP_SPRITE_HEADING_SUFFIX,
  SHIP_SPRITE_HEADINGS,
  SHIP_SPRITE_RENDER_SIZE,
  SHIP_SPRITE_SHEET_COLS
} from "../src/shipSpriteLayout.js";
import { anchoredShipFrameRegistration } from "../src/shipSpriteRegistration.js";
import { alignHorizontalShipWakeShoulders } from "../src/shipWakeAnchors.js";
import { bakeAllShipRenderLayers } from "./bake-ship-render-layers.mjs";
import {
  SHIP_ROWING_FRAME_COUNT,
  SHIP_ROWING_MODE_AHEAD,
  SHIP_ROWING_MODE_PIVOT_PORT,
  SHIP_ROWING_MODE_PIVOT_STARBOARD,
  rowingBankStrokeDirection,
  rowingOarPose
} from "../src/shipRowingAnimation.js";

const ROWING_RENDER_MODES = Object.freeze([
  Object.freeze({ id: "rowing", rowingMode: SHIP_ROWING_MODE_AHEAD }),
  Object.freeze({ id: "pivot-port", rowingMode: SHIP_ROWING_MODE_PIVOT_PORT }),
  Object.freeze({ id: "pivot-starboard", rowingMode: SHIP_ROWING_MODE_PIVOT_STARBOARD })
]);
import { selectShipFlagAnchorPoint } from "../src/shipFlagAnchors.js";
import { RESURRECT_64_HEX } from "../src/waterLatitudePalette.js";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(appRoot, "../..");
const defaultModelPath = join(repoRoot, "examples/globe-demo/public/assets/vehicles/Sail Ship.glb");
const shipSourceRoot = process.env.PIXEL_GLOBE_SHIP_SOURCE_ROOT
  ? resolve(process.env.PIXEL_GLOBE_SHIP_SOURCE_ROOT)
  : join(appRoot, "source-models");
const unityShipSourceRoot = join(shipSourceRoot, "unity/low-poly-cartoon-sailing-ships");
const unityShipModelRoot = join(unityShipSourceRoot, "Models");
const unityShipTexturePath = join(unityShipSourceRoot, "Textures/texture main.png");
const nativeBoatSourceRoot = join(shipSourceRoot, "sketchfab");
const mediterraneanGalleySourceRoot = join(shipSourceRoot, "sketchfab/mediterranean-galley");
const joseonTurtleShipSourceRoot = join(shipSourceRoot, "sketchfab/joseon-turtle-ship");
const joseonPanokseonSourceRoot = join(shipSourceRoot, "sketchfab/joseon-panokseon");
const japaneseAtakebuneSourceRoot = join(shipSourceRoot, "sketchfab/atakebune-japanese-warship");
const japaneseKuribuneSourceRoot = join(shipSourceRoot, "sketchfab/kamakura-umi-bune");
const japaneseKobayaSourceRoot = join(shipSourceRoot, "booth/hirokazu-kobayashi-kobaya");
const japaneseSekibuneSourceRoot = join(shipSourceRoot, "booth/hirokazu-kobayashi-sekibune");
const naoVictoriaSourceRoot = join(shipSourceRoot, "sketchfab/nao-victoria");
const portugueseCarrackSourceRoot = join(shipSourceRoot, "sketchfab/portuguese-carrack");
const gogiartDhowSourceRoot = join(shipSourceRoot, "sketchfab/dhow-gogiart");
const ancientDhowSourceRoot = join(shipSourceRoot, "sketchfab/low-poly-ancient-dhow-ship");
const cyc3wSailingShipSourceRoot = join(shipSourceRoot, "sketchfab/cyc3w-sailing-ship");
const borobudurShipSourceRoot = join(shipSourceRoot, "sketchfab/borobudur-sriwijaya");
const ottomanCoastalTraderSourceRoot = join(shipSourceRoot, "sketchfab/ottoman-coastal-trader");
const northAtlanticRightWhaleSourceRoot = join(shipSourceRoot, "sketchfab/north-atlantic-right-whale");
const blueWhaleSourceRoot = join(shipSourceRoot, "sketchfab/blue-whale");
const humpbackWhaleSourceRoot = join(shipSourceRoot, "sketchfab/humpback-whale");
const southernMinkeWhaleSourceRoot = join(shipSourceRoot, "sketchfab/southern-minke-whale");
const spermWhaleSourceRoot = join(shipSourceRoot, "sketchfab/sperm-whale");
const cartoonHorseSourceRoot = join(shipSourceRoot, "sketchfab/cartoon-horse-with-animations");
const woodenCartSourceRoot = join(shipSourceRoot, "sketchfab/wooden-cart");
const lowpolyLlamaSourceRoot = join(shipSourceRoot, "sketchfab/lowpoly-llama-romulogan");
const dromedaryCamelSourceRoot = join(shipSourceRoot, "sketchfab/dromedary-camel-walk");
const bactrianCamelSourceRoot = join(shipSourceRoot, "sketchfab/bactrian-camel-low-poly");
const icebergSourceRoot = join(shipSourceRoot, "poly-pizza/iceberg-1");
const kelulusSourceRoot = join(shipSourceRoot, "procedural/kelulus");
const proceduralShipSourceRoot = join(shipSourceRoot, "procedural");
const outputRoot = join(appRoot, "public/assets/vehicles");
const animalOutputRoot = join(appRoot, "public/assets/animals");
const icebergOutputRoot = join(appRoot, "public/assets/icebergs");
const horseCartOutputRoot = join(outputRoot, "horse-cart");
const llamaCaravanOutputRoot = join(outputRoot, "llama-caravan");
const dromedaryCaravanOutputRoot = join(outputRoot, "dromedary-caravan");
const bactrianCaravanOutputRoot = join(outputRoot, "bactrian-caravan");
const unityFleetOutputRoot = join(outputRoot, "unity-ships");
const unityFleetSideViewOutputRoot = join(unityFleetOutputRoot, "side-views");
const portAssaultShipOutputRoot = join(unityFleetOutputRoot, "port-assault");
const unityFleetReferenceOutputRoot = join(appRoot, "docs/ship-reference/high-res");
const portAssaultShipReferenceOutputRoot = join(appRoot, "docs/ship-reference/port-assault");
const portAssaultShipGeometryOutputPath = join(appRoot, "src/portAssaultShipGeometry.js");
const waterlineReviewOutputRoot = join(appRoot, "docs/ship-reference/waterlines");
const kelulusReferenceOutputRoot = join(appRoot, "docs/ship-reference/kelulus");
const icebergReferenceOutputRoot = join(appRoot, "docs/iceberg-reference");

const frameSize = integerEnv("PIXEL_GLOBE_SHIP_FRAME_SIZE", SHIP_SPRITE_FRAME_SIZE);
const headings = SHIP_SPRITE_HEADINGS;
const sheetCols = SHIP_SPRITE_SHEET_COLS;
const renderSize = integerEnv("PIXEL_GLOBE_SHIP_RENDER_SIZE", SHIP_SPRITE_RENDER_SIZE);
const lightAzimuthBins = 16;
const lightElevationBins = 2;
const lightBinCount = lightAzimuthBins * lightElevationBins;
const shadowFrameSize = integerEnv("PIXEL_GLOBE_SHIP_SHADOW_FRAME_SIZE", SHIP_SHADOW_FRAME_SIZE);
const shadowFrameInset = Math.floor((shadowFrameSize - frameSize) / 2);
const previewScale = integerEnv("PIXEL_GLOBE_SHIP_PREVIEW_SCALE", 4);
const sideViewWidth = integerEnv("PIXEL_GLOBE_SHIP_SIDE_WIDTH", 192);
const sideViewHeight = integerEnv("PIXEL_GLOBE_SHIP_SIDE_HEIGHT", 104);
const sideViewRenderScale = integerEnv("PIXEL_GLOBE_SHIP_SIDE_RENDER_SCALE", 2);
const cameraExtent = 1.62;
const defaultTargetModelMaxDim = 2.3;
const unityFleetScaleExponent = 0.5;
const highlightDotThreshold = 0.52;
const shadeDotThreshold = 0.1;
const selfShadowMapSize = 128;
const selfShadowDepthBias = 0.035;
const selfShadowLookupRadius = 1;
const wakeWaterlineBand = 0.12;
const footprintWaterlineBand = 0.18;
const wakeAftBandRatio = 0.2;
const wakeBowShoulderRatio = 0.68;
const wakeBowShoulderBandRatio = 0.22;
const wakeSternClearancePx = 1.5;
const wakeBowShoulderOutsetPx = 1.25;
const flagAnchorMaxSnapDistancePx = 4;
const shipEdgeShadeScale = 0.76;
const waterlineReviewColor = "#4d9be6";
const oarPivotReviewColor = "#e83b3b";
const groundVehicleWalkFrameCount = 6;
const horseCartMaxDrawPixels = 31;
const horseCartColorExposure = 2.2;
const horseCartColorLift = 6;
const loadedLlamaMaxDrawPixels = 13;
const llamaCaravanColorExposure = 1.9;
const llamaCaravanColorLift = 8;
const loadedCamelMaxDrawPixels = 17;
const camelCaravanColorExposure = 1.8;
const camelCaravanColorLift = 7;
const orientationReviewScale = 6;
const japaneseKuribunePresentationYawRad = Math.atan2(
  0.7818722388292283,
  0.6234373530827396
);
const ancientDhowOrientation = createShipModelBasisOrientation({
  // Measured after the glTF scene transforms are applied. Raw mesh +X is the
  // bow, +Y is starboard, and +Z is deck-up.
  right: { x: 0.643250264, y: 0.000000027, z: 0.765655992 },
  up: { x: 0.045511298, y: 0.998231824, z: -0.038235424 },
  forward: { x: -0.764302178, y: 0.059440944, z: 0.642112883 }
}, "Ocean Dhow");
const lightElevationAngles = [Math.PI / 9, Math.PI / 4.1];
const mediterraneanGalleyMeshNames = new Set([
  "Object_9",  // stern windows
  "Object_10", // small metal fittings
  "Object_12", // major metal fittings
  "Object_13", // mast and spars
  "Object_14", // hull planking
  "Object_17", // prominent rigging
  "Object_20", // sails
  "Object_21", // dark hull timber
  "Object_22", // small dark timber fitting
  "Object_23", // principal hull and mast timber
  "Object_24"  // deck and stern timber
]);
const mediterraneanGalleyRemovedMizzenComponents = Object.freeze([
  Object.freeze({
    nodeName: "Object_13",
    positionCount: 770,
    firstVertex: 34,
    lastVertex: 301,
    description: "mizzen mast and spars"
  }),
  Object.freeze({
    nodeName: "Object_20",
    positionCount: 831,
    firstVertex: 553,
    lastVertex: 830,
    description: "mizzen sail"
  })
]);
const fustaRemovedForeAndMizzenComponents = Object.freeze([
  Object.freeze({
    nodeName: "Object_13",
    positionCount: 770,
    firstVertex: 34,
    lastVertex: 535,
    description: "fore and mizzen masts and spars"
  }),
  Object.freeze({
    nodeName: "Object_20",
    positionCount: 831,
    firstVertex: 271,
    lastVertex: 830,
    description: "fore and mizzen sails"
  })
]);
const japaneseAtakebuneStaticOarMeshes = Object.freeze([
  Object.freeze({
    nodeName: "Object_13",
    parentName: "Cube071_3",
    positionCount: 480
  })
]);
const japaneseKuribuneStaticOarMeshes = Object.freeze(
  Array.from({ length: 8 }, (_, index) => {
    const suffix = String(index + 6).padStart(3, "0");
    return Object.freeze({
      nodeName: `Box${suffix}_DarkWood_0`,
      parentName: `Box${suffix}`,
      positionCount: 48
    });
  })
);
const japaneseKobayaStaticOarMeshes = Object.freeze(
  ["L", "R"].flatMap((side) => Array.from({ length: 10 }, (_, index) => Object.freeze({
    nodeName: `櫂${side}${String(index + 1).padStart(2, "0")}`,
    parentName: "櫂",
    positionCount: 1944
  })))
);
const japaneseSekibuneStaticOarMeshes = Object.freeze([
  "櫂L01",
  ...Array.from({ length: 63 }, (_, index) => `櫂L01${String(index + 1).padStart(3, "0")}`)
].map((nodeName) => Object.freeze({
  nodeName,
  parentName: "櫂",
  positionCount: 1944
})));
const joseonPanokseonStaticOarMeshes = Object.freeze([
  Object.freeze({
    nodeName: "Object_9",
    parentName: "Object_4",
    positionCount: 2544
  })
]);
const joseonHyeopseonRemovedMeshes = Object.freeze([
  ...joseonPanokseonStaticOarMeshes,
  Object.freeze({
    nodeName: "Object_13",
    parentName: "Object_4",
    positionCount: 48
  }),
  Object.freeze({
    nodeName: "Object_84",
    parentName: "Object_4",
    positionCount: 480
  }),
  Object.freeze({
    nodeName: "Object_85",
    parentName: "Object_4",
    positionCount: 340
  })
]);
const unityFleetExcludedModels = new Map([
  ["boats/boat 2.fbx", "superseded by the credited one-person Dhow model"],
  ["boats/boat 4.fbx", "superseded by the credited gogiart Dhow model"],
  ["ships large/ship large 1.fbx", "superseded by the credited cyc3w Sailing ship model"],
  ["ships large/pirate ship large 2.fbx", "redundant with the more detailed credited Galleon model"],
  ["ships large/ship large 2.fbx", "redundant with the more detailed credited Galleon model"],
  ["ships medium/pirate ship medium.fbx", "redundant with the Brigantine and Xebec"],
  ["ships medium/ship medium 6.fbx", "redundant with the more distinctive Heavy Caravel"],
  ["ships small/pirate ship small.fbx", "redundant with the cleaner Coastal Pinnace"],
  ["ships small/ship small 1.fbx", "redundant with the more distinctive Xebec"],
  ["ships small/ship small 4.fbx", "redundant with the credited gogiart Dhow model"],
  ["ships small/ship small 6.fbx", "redundant with the Small Cog and Caravel"],
  ["viking ships/viking ship 1.fbx", "rendered by the dedicated animated-oar Viking Longship bake"],
  ["viking ships/viking ship 2.fbx", "alternate sail color"],
  ["viking ships/viking ship 3.fbx", "alternate sail color"],
  ["viking ships/viking ship 4.fbx", "alternate sail color"],
  ["water.fbx", "environment prop, not a ship"]
]);
const unityFleetSkippedModels = Object.freeze(
  [...unityFleetExcludedModels].map(([path, reason]) => `Models/${path} (${reason})`)
);

function integerEnv(name, fallback) {
  const raw = process.env[name];
  if (raw == null || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer, got: ${raw}`);
  }
  return value;
}

const unityShipRoster = new Map([
  ["boats/boat 1.fbx", {
    label: "Fishing Barque",
    slug: "fishing-lugger",
    identifiedType: "small fishing barque",
    confidence: "medium",
    notes: "Small single-mast coastal working boat."
  }],
  ["boats/boat 3.fbx", {
    label: "Small Cog",
    slug: "small-cog",
    identifiedType: "small cog / roundship",
    confidence: "medium",
    notes: "Broad little hull with a simple square-sail profile.",
    targetModelMaxDim: 1.3
  }],
  ["boats/chinese boat.fbx", {
    label: "Sampan",
    slug: "sampan",
    identifiedType: "small junk / sampan",
    confidence: "high",
    notes: "Small Chinese-rigged vessel; good for river/coastal Asian traffic.",
    waterlineOffsetY: 0.023,
    flagAnchorMaxSnapDistancePx: 8
  }],
  ["ships large/chinese ship large.fbx", {
    label: "Large Junk",
    slug: "large-junk",
    identifiedType: "large junk",
    confidence: "high",
    notes: "Multiple battened sails."
  }],
  ["ships large/pirate ship large 1.fbx", {
    label: "Heavy Caravel",
    slug: "pirate-brig",
    identifiedType: "armed caravel / raider",
    confidence: "medium",
    notes: "Black-sailed multi-mast hull interpreted as a heavily armed caravel; the source model's pirate colors are retained."
  }],
  ["ships large/ship large 3.fbx", {
    label: "Urca",
    slug: "fluyt",
    identifiedType: "urca / merchant roundship",
    confidence: "medium",
    notes: "Bulky merchant hull interpreted as a capacious Iberian urca."
  }],
  ["ships large/ship large 4.fbx", {
    label: "Carrack",
    slug: "carrack",
    identifiedType: "carrack / nao",
    confidence: "medium",
    notes: "Large early ocean-going merchant/explorer profile."
  }],
  ["ships large/ship large 5.fbx", {
    label: "Great Carrack",
    slug: "ship-of-the-line",
    identifiedType: "great carrack / great ship",
    confidence: "medium",
    notes: "Largest heavy square-rigger, interpreted as an exceptional royal great ship."
  }],
  ["ships medium/chinese ship medium.fbx", {
    label: "Medium Junk",
    slug: "medium-junk",
    identifiedType: "junk",
    confidence: "high",
    notes: "Medium battened-sail Chinese vessel."
  }],
  ["ships medium/ship medium 1.fbx", {
    label: "Xebec",
    slug: "xebec",
    identifiedType: "xebec",
    confidence: "high",
    notes: "Long, low Mediterranean lateen-rigged profile."
  }],
  ["ships medium/ship medium 2.fbx", {
    label: "Caravel",
    slug: "caravel",
    identifiedType: "caravel / caravel redonda",
    confidence: "medium",
    notes: "Small explorer/trader silhouette.",
    waterlineOffsetY: -0.046
  }],
  ["ships medium/ship medium 3.fbx", {
    label: "Holk",
    slug: "holk",
    identifiedType: "northern European holk / hulk",
    confidence: "medium",
    notes: "Broad cargo hull and compact square rig interpreted as a late medieval North Sea and Baltic holk.",
    targetModelMaxDim: 1.6
  }],
  ["ships medium/ship medium 4.fbx", {
    label: "Square-Rigged Caravel",
    slug: "square-rigged-caravel",
    identifiedType: "square-rigged caravel / small trader",
    confidence: "medium",
    notes: "Single square sail and compact explorer-trader hull read closer to a small caravel than a ketch."
  }],
  ["ships medium/ship medium 5.fbx", {
    label: "Brigantine",
    slug: "brigantine",
    identifiedType: "Mediterranean brigantine",
    confidence: "medium",
    notes: "Light trader or raider interpreted in the older Mediterranean sense."
  }],
  ["ships small/chinese ship small.fbx", {
    label: "Small Junk",
    slug: "small-junk",
    identifiedType: "junk",
    confidence: "high",
    notes: "Small battened-sail Chinese vessel."
  }],
  ["ships small/ship small 2.fbx", {
    label: "Felucca",
    slug: "felucca",
    identifiedType: "dhow / felucca",
    confidence: "high",
    notes: "Small single-lateen craft.",
    targetModelMaxDim: 0.98,
    waterlineOffsetY: -0.352
  }],
  ["ships small/ship small 3.fbx", {
    label: "Coastal Pinnace",
    slug: "cutter",
    identifiedType: "small pinnace",
    confidence: "medium",
    notes: "Small European fore-and-aft silhouette used as a coastal pinnace.",
    targetModelMaxDim: 1.2
  }],
  ["ships small/ship small 5.fbx", {
    label: "Lateen Barque",
    slug: "ketch",
    identifiedType: "two-masted lateen barque",
    confidence: "medium",
    notes: "Two triangular sails interpreted as a small Mediterranean lateen trader."
  }],
  ["ships small/ship small 7.fbx", {
    label: "Javanese Jong",
    slug: "javanese-jong",
    identifiedType: "large Javanese jong",
    confidence: "medium",
    notes: "Deep island Southeast Asian merchant hull with wind-filled canted sails and added twin quarter rudders.",
    targetModelMaxDim: 2.15,
    sideViewTargetModelMaxDim: 2.15,
    frameScale: 0.63,
    collectOptions: {
      // The source is sold as a small fantasy ship. A longer, broader hull makes
      // its silhouette read as the exceptionally capacious jong represented by
      // the gameplay stats while preserving the authored rig and materials.
      transformPoint: (point) => point.set(point.x * 1.12, point.y, point.z * 1.42)
    },
    staticTrianglesForHull: javaneseJongTriangles
  }],
]);

async function loadGltf(path) {
  installNodeDomShim();
  const ext = extname(path).toLowerCase();
  const bytes = ext === ".gltf" ? preparedGltfJson(path) : readFileSync(path);
  const payload = typeof bytes === "string"
    ? bytes
    : bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return new Promise((resolveLoad, rejectLoad) => {
    new GLTFLoader().parse(payload, "", resolveLoad, rejectLoad);
  });
}

function preparedGltfJson(path) {
  const document = JSON.parse(readFileSync(path, "utf8"));
  for (const buffer of document.buffers || []) {
    if (!buffer.uri || buffer.uri.startsWith("data:")) continue;
    const bytes = readFileSync(join(dirname(path), decodeURIComponent(buffer.uri)));
    buffer.uri = `data:application/octet-stream;base64,${bytes.toString("base64")}`;
  }
  for (let index = 0; index < (document.materials || []).length; index++) {
    const material = document.materials[index];
    material.name = gltfMaterialKey(index);
    if (material.pbrMetallicRoughness) {
      delete material.pbrMetallicRoughness.baseColorTexture;
      delete material.pbrMetallicRoughness.metallicRoughnessTexture;
    }
    delete material.normalTexture;
    delete material.occlusionTexture;
    delete material.emissiveTexture;
    delete material.extensions;
  }
  delete document.images;
  delete document.textures;
  delete document.samplers;
  document.extensionsUsed = (document.extensionsUsed || []).filter((name) => (
    name !== "KHR_materials_pbrSpecularGlossiness"
  ));
  document.extensionsRequired = (document.extensionsRequired || []).filter((name) => (
    name !== "KHR_materials_pbrSpecularGlossiness"
  ));
  return JSON.stringify(document);
}

async function loadGltfMaterialTextureSamplers(path, {
  maxDimension = 512,
  smoothing = false
} = {}) {
  if (extname(path).toLowerCase() !== ".gltf") return null;
  const document = JSON.parse(readFileSync(path, "utf8"));
  const samplers = new Map();
  for (let index = 0; index < (document.materials || []).length; index++) {
    const material = document.materials[index];
    const textureIndex = material.pbrMetallicRoughness?.baseColorTexture?.index ??
      material.extensions?.KHR_materials_pbrSpecularGlossiness?.diffuseTexture?.index;
    const imageIndex = document.textures?.[textureIndex]?.source;
    const uri = document.images?.[imageIndex]?.uri;
    if (!uri || uri.startsWith("data:")) continue;
    samplers.set(gltfMaterialKey(index), await loadTextureSampler(
      join(dirname(path), decodeURIComponent(uri)),
      maxDimension,
      { smoothing }
    ));
  }
  return samplers;
}

function gltfMaterialKey(index) {
  return `pixel-globe-gltf-material-${index}`;
}

function installNodeDomShim() {
  if (!globalThis.ProgressEvent) {
    globalThis.ProgressEvent = class ProgressEvent {
      constructor(type, init = {}) {
        this.type = type;
        Object.assign(this, init);
      }
    };
  }
  if (!globalThis.document) {
    globalThis.document = {
      createElementNS(_namespace, name) {
        if (name !== "img") throw new Error(`Unsupported DOM shim element: ${name}`);
        return {
          addEventListener() {},
          removeEventListener() {},
          set src(value) {
            this._src = value;
          },
          get src() {
            return this._src;
          }
        };
      }
    };
  }
}

function loadFbx(path) {
  installNodeDomShim();
  const bytes = readFileSync(path);
  const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return new FBXLoader().parse(arrayBuffer, "");
}

async function loadScene(path) {
  const ext = extname(path).toLowerCase();
  if (ext === ".glb" || ext === ".gltf") {
    const gltf = await loadGltf(path);
    return gltf.scene;
  }
  if (ext === ".fbx") return loadFbx(path);
  throw new Error(`Unsupported ship model extension: ${path}`);
}

async function loadTextureSampler(path, maxDimension = Infinity, { smoothing = false } = {}) {
  const image = await loadImage(path);
  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = smoothing;
  if (smoothing) ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, 0, 0, width, height);
  const data = ctx.getImageData(0, 0, width, height).data;
  return {
    width,
    height,
    sample(u, v) {
      const x = clamp(Math.floor(wrap01(u) * width), 0, width - 1);
      const y = clamp(Math.floor((1 - wrap01(v)) * height), 0, height - 1);
      const offset = (x + y * width) * 4;
      return {
        r: data[offset],
        g: data[offset + 1],
        b: data[offset + 2]
      };
    }
  };
}

function wrap01(value) {
  const wrapped = value - Math.floor(value);
  return wrapped < 0 ? wrapped + 1 : wrapped;
}

function materialColor(material) {
  const mat = Array.isArray(material) ? material[0] : material;
  const color = mat?.color || new THREE.Color(0xb9a06a);
  return {
    r: Math.round(color.r * 255),
    g: Math.round(color.g * 255),
    b: Math.round(color.b * 255)
  };
}

function triangleMaterial(mesh, geometry, triOffset) {
  if (!Array.isArray(mesh.material)) return mesh.material;
  for (const group of geometry.groups) {
    if (triOffset >= group.start && triOffset < group.start + group.count) {
      return mesh.material[group.materialIndex];
    }
  }
  return mesh.material[0];
}

function collectTriangles(scene, options = {}) {
  scene.updateMatrixWorld(true);
  const triangles = [];
  const allPoints = [];
  const excludedMeshes = requiredMeshExclusionSet(scene, options.requiredExcludedMeshes);
  const excludedVertexRanges = requiredMeshVertexRangeExclusions(
    scene,
    options.requiredExcludedVertexRanges
  );

  scene.traverse((node) => {
    if (!node.isMesh) return;
    if (excludedMeshes.has(node)) return;
    if (options.includeMesh && !options.includeMesh(node)) return;
    const geometry = node.geometry;
    const positions = geometry.attributes.position;
    const index = geometry.index;
    const matrix = node.matrixWorld;
    const triangleCount = index ? index.count / 3 : positions.count / 3;

    for (let tri = 0; tri < triangleCount; tri++) {
      const offset = tri * 3;
      const ids = index
        ? [index.getX(offset), index.getX(offset + 1), index.getX(offset + 2)]
        : [offset, offset + 1, offset + 2];
      const componentExclusion = excludedVertexRanges.get(node)?.find((spec) => (
        ids.every((id) => id >= spec.firstVertex && id <= spec.lastVertex)
      ));
      if (componentExclusion) {
        componentExclusion.removedTriangleCount += 1;
        continue;
      }
      const points = ids.map((id) => {
        const point = new THREE.Vector3(
          positions.getX(id),
          positions.getY(id),
          positions.getZ(id)
        );
        if (node.isSkinnedMesh) node.applyBoneTransform(id, point);
        point.applyMatrix4(matrix);
        return options.transformPoint ? options.transformPoint(point, node) : point;
      });
      const uvs = geometry.attributes.uv
        ? ids.map((id) => new THREE.Vector2(
          geometry.attributes.uv.getX(id),
          geometry.attributes.uv.getY(id)
        ))
        : null;

      for (const point of points) allPoints.push(point);
      const material = triangleMaterial(node, geometry, offset);
      triangles.push({
        points,
        uvs,
        color: options.meshColors?.get(node.name) || materialColor(material),
        textureSampler: options.meshTextureSamplers?.get(node.name) ||
          options.materialTextureSamplers?.get(material?.name) || null,
        sourceMeshName: node.name
      });
    }
  });

  for (const specs of excludedVertexRanges.values()) {
    for (const spec of specs) {
      if (spec.removedTriangleCount === 0) {
        throw new Error(
          `Source component exclusion removed no triangles: ${spec.nodeName} ` +
          `${spec.firstVertex}..${spec.lastVertex}`
        );
      }
    }
  }

  if (triangles.length === 0) throw new Error("No mesh triangles found in ship model");
  const sourceBounds = boundsForPoints(allPoints);
  const targetMaxDim = options.targetMaxDim === undefined
    ? defaultTargetModelMaxDim
    : options.targetMaxDim;
  if (targetMaxDim !== null) {
    fitTrianglesToMaxDimension(triangles, sourceBounds, targetMaxDim);
  }
  return {
    triangles,
    sourceBounds,
    sourceMaxDim: sourceBounds.maxDim,
    targetMaxDim
  };
}

function requiredMeshExclusionSet(scene, specs = []) {
  if (!Array.isArray(specs)) throw new Error("Required mesh exclusions must be an array");
  if (specs.length === 0) return new Set();
  const meshes = [];
  scene.traverse((node) => {
    if (node.isMesh) meshes.push(node);
  });
  const excluded = new Set();
  for (const spec of specs) {
    const matches = meshes.filter((node) => (
      node.name === spec.nodeName && node.parent?.name === spec.parentName
    ));
    if (matches.length !== 1) {
      const sameName = meshes
        .filter((node) => node.name === spec.nodeName)
        .map((node) => `${node.parent?.name || "<no parent>"}/${node.name}`);
      throw new Error(
        `Expected one source mesh ${spec.parentName}/${spec.nodeName}, found ${matches.length}; ` +
        `same-name meshes: ${sameName.join(", ") || "none"}`
      );
    }
    const mesh = matches[0];
    const positionCount = mesh.geometry?.attributes?.position?.count;
    if (positionCount !== spec.positionCount) {
      throw new Error(
        `Source mesh ${spec.parentName}/${spec.nodeName} changed: ` +
        `expected ${spec.positionCount} positions, found ${positionCount}`
      );
    }
    excluded.add(mesh);
  }
  if (excluded.size !== specs.length) throw new Error("Required mesh exclusions overlap");
  return excluded;
}

function requiredMeshVertexRangeExclusions(scene, specs = []) {
  if (!Array.isArray(specs)) throw new Error("Required mesh vertex-range exclusions must be an array");
  if (specs.length === 0) return new Map();
  const meshes = [];
  scene.traverse((node) => {
    if (node.isMesh) meshes.push(node);
  });
  const exclusions = new Map();
  for (const spec of specs) {
    const matches = meshes.filter((node) => (
      node.name === spec.nodeName &&
      (spec.parentName === undefined || node.parent?.name === spec.parentName)
    ));
    if (matches.length !== 1) {
      throw new Error(
        `Expected one component source mesh ${spec.parentName ? `${spec.parentName}/` : ""}` +
        `${spec.nodeName}, found ${matches.length}`
      );
    }
    const mesh = matches[0];
    const positionCount = mesh.geometry?.attributes?.position?.count;
    if (positionCount !== spec.positionCount) {
      throw new Error(
        `Component source mesh ${spec.nodeName} changed: ` +
        `expected ${spec.positionCount} positions, found ${positionCount}`
      );
    }
    if (
      !Number.isInteger(spec.firstVertex) || !Number.isInteger(spec.lastVertex) ||
      spec.firstVertex < 0 || spec.lastVertex < spec.firstVertex ||
      spec.lastVertex >= positionCount
    ) {
      throw new Error(
        `Invalid component vertex range for ${spec.nodeName}: ` +
        `${spec.firstVertex}..${spec.lastVertex}`
      );
    }
    const meshExclusions = exclusions.get(mesh) ?? [];
    meshExclusions.push({ ...spec, removedTriangleCount: 0 });
    exclusions.set(mesh, meshExclusions);
  }
  return exclusions;
}

function boundsForPoints(points) {
  const box = new THREE.Box3();
  for (const point of points) box.expandByPoint(point);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  if (!Number.isFinite(maxDim) || maxDim <= 0) throw new Error("Ship model has invalid bounds");
  return {
    box,
    center: box.getCenter(new THREE.Vector3()),
    size,
    maxDim
  };
}

function fitTrianglesToMaxDimension(triangles, bounds, targetMaxDim) {
  if (!Number.isFinite(targetMaxDim) || targetMaxDim <= 0) {
    throw new Error(`Invalid target ship model size: ${targetMaxDim}`);
  }
  const scale = targetMaxDim / bounds.maxDim;
  for (const tri of triangles) {
    for (const point of tri.points) {
      point.sub(bounds.center).multiplyScalar(scale);
    }
  }
}

function estimateWaterlineForConfig(triangles, config) {
  if (!config?.slug) throw new Error("Ship waterline analysis requires a configured ship slug");
  const estimated = config.waterlineBoundsRatio === undefined
    ? estimateShipWaterlineY(triangles, {
        expectedHullCount: config.expectedWaterlineHullCount ?? 1,
        immersionRatio: config.waterlineImmersionRatio,
        label: config.slug
      })
    : explicitBoundsWaterline(triangles, config);
  const offsetY = config.waterlineOffsetY ?? 0;
  if (!Number.isFinite(offsetY)) throw new Error(`${config.slug} has invalid waterline offset: ${offsetY}`);
  const y = estimated.y + offsetY;
  let modelMinY = Infinity;
  let modelMaxY = -Infinity;
  for (const triangle of triangles) {
    for (const point of triangle.points) {
      modelMinY = Math.min(modelMinY, point.y);
      modelMaxY = Math.max(modelMaxY, point.y);
    }
  }
  if (y <= modelMinY || y >= modelMaxY) {
    throw new Error(
      `${config.slug} adjusted waterline ${y} leaves its model bounds ${modelMinY}..${modelMaxY}`
    );
  }
  return { ...estimated, y };
}

function explicitBoundsWaterline(triangles, config) {
  const ratio = config.waterlineBoundsRatio;
  if (!Number.isFinite(ratio) || ratio <= 0 || ratio >= 1) {
    throw new Error(`${config.slug} has invalid explicit waterline ratio: ${ratio}`);
  }
  const points = triangles.flatMap((triangle) => triangle.points);
  const bounds = boundsForPoints(points);
  const y = bounds.box.min.y + bounds.size.y * ratio;
  return {
    y,
    expectedHullCount: 1,
    componentCount: 1,
    dominantLengthRatio: 1,
    beam: bounds.size.x,
    length: bounds.size.z,
    hullIntervalMinY: bounds.box.min.y,
    hullIntervalMaxY: bounds.box.max.y
  };
}

function makeCamera() {
  const camera = new THREE.OrthographicCamera(
    -cameraExtent,
    cameraExtent,
    cameraExtent,
    -cameraExtent,
    0.01,
    30
  );
  camera.position.set(0, 4.2, 4.2);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();
  return camera;
}

function baseColor(color, normal) {
  const top = Math.max(0, normal.y);
  const face = Math.max(0, normal.z);
  const light = 0.66 + top * 0.18 + face * 0.06;
  return {
    r: clamp255(color.r * light),
    g: clamp255(color.g * light),
    b: clamp255(color.b * light),
    a: 255
  };
}

function clamp255(v) {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function projectedPoint(point, camera, viewport = { width: renderSize, height: renderSize }) {
  const ndc = point.clone().project(camera);
  const view = point.clone().applyMatrix4(camera.matrixWorldInverse);
  return {
    x: (ndc.x * 0.5 + 0.5) * viewport.width,
    y: (-ndc.y * 0.5 + 0.5) * viewport.height,
    z: view.z,
    wx: point.x,
    wy: point.y,
    wz: point.z
  };
}

function renderHeading(baseTriangles, headingIndex, camera, renderOptions, viewport = null) {
  const size = viewport || { width: renderSize, height: renderSize };
  const canvas = createCanvas(size.width, size.height);
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, size.width, size.height);
  const image = ctx.createImageData(size.width, size.height);
  const depth = new Float32Array(size.width * size.height);
  const normals = new Float32Array(size.width * size.height * 3);
  const positions = new Float32Array(size.width * size.height * 3);
  const features = new Int32Array(size.width * size.height);
  const casters = renderOptions?.collectCasters === false ? null : [];
  depth.fill(-Infinity);
  features.fill(-1);
  const featureIds = new Map();

  const modelYaw = renderOptions?.modelYaw ?? modelYawForScreenHeading(headingIndex, camera);
  const rotation = new THREE.Matrix4().makeRotationY(modelYaw);

  for (const tri of baseTriangles) {
    const points = tri.points.map((point) => point.clone().applyMatrix4(rotation));
    if (casters) casters.push(makeCasterTriangle(points));
    const normal = new THREE.Vector3()
      .subVectors(points[1], points[0])
      .cross(new THREE.Vector3().subVectors(points[2], points[0]))
      .normalize();
    const screen = points.map((point) => projectedPoint(point, camera, size));
    if (screen.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y))) continue;

    const screenNormal = normal.clone().transformDirection(camera.matrixWorldInverse);
    const featureId = tri.rasterFeature == null
      ? -1
      : featureIds.has(tri.rasterFeature)
        ? featureIds.get(tri.rasterFeature)
        : featureIds.set(tri.rasterFeature, featureIds.size).get(tri.rasterFeature);
    rasterizeTriangle(image.data, depth, normals, positions, features, screen, {
      color: tri.color,
      normal,
      uvs: tri.uvs,
      textureSampler: tri.textureSampler || renderOptions?.textureSampler,
      colorTransform: renderOptions?.colorTransform,
      sourceMeshName: tri.sourceMeshName,
      featureId
    }, {
      x: screenNormal.x,
      y: -screenNormal.y,
      z: screenNormal.z
    }, size);
  }

  ctx.putImageData(image, 0, 0);
  return { canvas, depth, normals, positions, features, casters: casters || [] };
}

function modelYawForScreenHeading(headingIndex, camera) {
  return modelYawForScreenDirection(frameScreenHeading(headingIndex), camera);
}

function modelYawForScreenDirection(desired, camera) {
  if (!desired || ![desired.x, desired.y].every(Number.isFinite)) {
    throw new Error("Ship screen heading requires finite coordinates");
  }
  const elements = camera.matrixWorld.elements;
  const cameraRight = new THREE.Vector3(elements[0], 0, elements[2]);
  const cameraUp = new THREE.Vector3(elements[4], 0, elements[6]);
  const rightProjection = cameraRight.length();
  const downProjection = cameraUp.length();
  if (rightProjection <= 1e-6 || downProjection <= 1e-6) {
    throw new Error("Ship camera cannot resolve screen-aligned headings");
  }
  const worldForward = cameraRight.normalize().multiplyScalar(desired.x / rightProjection)
    .add(cameraUp.normalize().multiplyScalar(-desired.y / downProjection))
    .normalize();
  return Math.atan2(worldForward.x, worldForward.z);
}

function makeCasterTriangle(points) {
  const [a, b, c] = points;
  return {
    a,
    b,
    c
  };
}

function rasterizeTriangle(data, depth, normals, positions, features, points, surface, normal, viewport) {
  const [a, b, c] = points;
  const minX = Math.max(0, Math.floor(Math.min(a.x, b.x, c.x)));
  const minY = Math.max(0, Math.floor(Math.min(a.y, b.y, c.y)));
  const maxX = Math.min(viewport.width - 1, Math.ceil(Math.max(a.x, b.x, c.x)));
  const maxY = Math.min(viewport.height - 1, Math.ceil(Math.max(a.y, b.y, c.y)));
  const area = edge(a, b, c.x, c.y);

  if (Math.abs(area) < 0.00001) return;

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      const w0 = edge(b, c, px, py) / area;
      const w1 = edge(c, a, px, py) / area;
      const w2 = edge(a, b, px, py) / area;
      if (w0 < 0 || w1 < 0 || w2 < 0) continue;

      const z = w0 * a.z + w1 * b.z + w2 * c.z;
      const index = x + y * viewport.width;
      if (z <= depth[index]) continue;

      depth[index] = z;
      const wx = w0 * a.wx + w1 * b.wx + w2 * c.wx;
      const wy = w0 * a.wy + w1 * b.wy + w2 * c.wy;
      const wz = w0 * a.wz + w1 * b.wz + w2 * c.wz;
      const color = shadeSurfaceColor(surface, { x: wx, y: wy, z: wz }, w0, w1, w2);
      const offset = index * 4;
      data[offset] = color.r;
      data[offset + 1] = color.g;
      data[offset + 2] = color.b;
      data[offset + 3] = color.a;
      const normalOffset = index * 3;
      normals[normalOffset] = normal.x;
      normals[normalOffset + 1] = normal.y;
      normals[normalOffset + 2] = normal.z;
      positions[normalOffset] = wx;
      positions[normalOffset + 1] = wy;
      positions[normalOffset + 2] = wz;
      features[index] = surface.featureId;
    }
  }
}

function shadeSurfaceColor(surface, point, w0, w1, w2) {
  let color = surface.color;
  if (surface.textureSampler && surface.uvs) {
    const u = w0 * surface.uvs[0].x + w1 * surface.uvs[1].x + w2 * surface.uvs[2].x;
    const v = w0 * surface.uvs[0].y + w1 * surface.uvs[1].y + w2 * surface.uvs[2].y;
    color = surface.textureSampler.sample(u, v);
  }
  if (surface.colorTransform) color = surface.colorTransform(color, surface);
  return baseColor(color, surface.normal);
}

function edge(a, b, x, y) {
  return (x - a.x) * (b.y - a.y) - (y - a.y) * (b.x - a.x);
}

function alphaBounds(canvas) {
  const ctx = canvas.getContext("2d");
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = image.data;
  let minX = canvas.width;
  let minY = canvas.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      if (data[(x + y * canvas.width) * 4 + 3] <= 8) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < minX || maxY < minY) throw new Error("Rendered ship frame was blank");
  return { minX, minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

function fixedFrameScale(boundsByHeading) {
  const maxDraw = frameSize - 4;
  const maxWidth = Math.max(...boundsByHeading.map((bounds) => bounds.width));
  const maxHeight = Math.max(...boundsByHeading.map((bounds) => bounds.height));
  return Math.min(maxDraw / maxWidth, maxDraw / maxHeight);
}

function makeFrame(rendered, registration) {
  return makeRasterFrame(rendered, {
    bounds: registration.sourceBounds,
    drawX: registration.draw.x,
    drawY: registration.draw.y,
    drawW: registration.draw.width,
    drawH: registration.draw.height
  });
}

function makeCenteredFrame(rendered, bounds, scale) {
  const drawW = Math.max(1, Math.round(bounds.width * scale));
  const drawH = Math.max(1, Math.round(bounds.height * scale));
  return makeRasterFrame(rendered, {
    bounds,
    drawX: Math.floor((frameSize - drawW) / 2),
    drawY: Math.floor((frameSize - drawH) / 2),
    drawW,
    drawH
  });
}

function makeRasterFrame(rendered, { bounds, drawX, drawY, drawW, drawH }) {
  const sourceCtx = rendered.canvas.getContext("2d");
  const sourceWidth = rendered.canvas.width;
  const sourceHeight = rendered.canvas.height;
  const source = sourceCtx.getImageData(0, 0, sourceWidth, sourceHeight);
  const canvas = createCanvas(frameSize, frameSize);
  const ctx = canvas.getContext("2d");
  const image = ctx.createImageData(frameSize, frameSize);
  const normals = new Float32Array(frameSize * frameSize * 3);
  const positions = new Float32Array(frameSize * frameSize * 3);
  const alpha = new Uint8Array(frameSize * frameSize);
  const sourceSamples = hardEdgeSampleMap({
    rgba: source.data,
    sourceWidth,
    sourceHeight,
    sourceFeatures: rendered.features,
    bounds,
    targetWidth: drawW,
    targetHeight: drawH
  });

  for (let dy = 0; dy < drawH; dy++) {
    for (let dx = 0; dx < drawW; dx++) {
      const sourceIndex = sourceSamples[dx + dy * drawW];
      if (sourceIndex < 0) continue;
      const sourceOffset = sourceIndex * 4;

      const x = drawX + dx;
      const y = drawY + dy;
      const frameIndex = x + y * frameSize;
      const frameOffset = frameIndex * 4;
      image.data[frameOffset] = source.data[sourceOffset];
      image.data[frameOffset + 1] = source.data[sourceOffset + 1];
      image.data[frameOffset + 2] = source.data[sourceOffset + 2];
      image.data[frameOffset + 3] = 255;
      alpha[frameIndex] = 1;

      const sourceNormalOffset = sourceIndex * 3;
      const frameNormalOffset = frameIndex * 3;
      normals[frameNormalOffset] = rendered.normals[sourceNormalOffset];
      normals[frameNormalOffset + 1] = rendered.normals[sourceNormalOffset + 1];
      normals[frameNormalOffset + 2] = rendered.normals[sourceNormalOffset + 2];
      positions[frameNormalOffset] = rendered.positions[sourceNormalOffset];
      positions[frameNormalOffset + 1] = rendered.positions[sourceNormalOffset + 1];
      positions[frameNormalOffset + 2] = rendered.positions[sourceNormalOffset + 2];
    }
  }

  ctx.putImageData(image, 0, 0);
  return {
    canvas,
    image,
    normals,
    positions,
    alpha,
    casters: rendered.casters,
    bounds,
    drawX,
    drawY,
    drawW,
    drawH
  };
}

function validateRegistrationSourceBounds(slug, registration, sourceWidth, sourceHeight) {
  const { minX, minY, width, height } = registration.sourceBounds;
  if (
    minX < 0 || minY < 0 ||
    minX + width > sourceWidth || minY + height > sourceHeight
  ) {
    throw new Error(
      `${slug} anchored sprite viewport leaves its ${sourceWidth}x${sourceHeight} render: ` +
      `${minX.toFixed(2)},${minY.toFixed(2)} ${width.toFixed(2)}x${height.toFixed(2)}`
    );
  }
}

function makeFlagAnchors(
  modelPoint,
  frames,
  camera,
  maxSnapDistancePx = flagAnchorMaxSnapDistancePx
) {
  return frames.map((frame, headingIndex) => {
    const modelYaw = modelYawForScreenHeading(headingIndex, camera);
    const rotation = new THREE.Matrix4().makeRotationY(modelYaw);
    const rotatedPoint = new THREE.Vector3(modelPoint.x, modelPoint.y, modelPoint.z)
      .applyMatrix4(rotation);
    const projected = projectedPoint(rotatedPoint, camera);
    const preferredX = frame.drawX + clamp(
      Math.floor((projected.x - frame.bounds.minX) / frame.bounds.width * frame.drawW),
      0,
      frame.drawW - 1
    );
    const preferredY = frame.drawY + clamp(
      Math.floor((projected.y - frame.bounds.minY) / frame.bounds.height * frame.drawH),
      0,
      frame.drawH - 1
    );
    const anchor = nearestOpaqueFlagAnchor(frame, preferredX, preferredY);
    const snapDistance = Math.hypot(anchor.x - preferredX, anchor.y - preferredY);
    if (snapDistance > maxSnapDistancePx) {
      throw new Error(
        `Ship flag anchor heading ${headingIndex} is ${snapDistance.toFixed(2)}px from its model point projection`
      );
    }
    return anchor;
  });
}

function nearestOpaqueFlagAnchor(frame, preferredX, preferredY) {
  let best = null;
  for (let y = 0; y < frameSize; y++) {
    for (let x = 0; x < frameSize; x++) {
      if (!frame.alpha[x + y * frameSize]) continue;
      const distanceSquared = (x - preferredX) ** 2 + (y - preferredY) ** 2;
      if (
        !best ||
        distanceSquared < best.distanceSquared ||
        (
          distanceSquared === best.distanceSquared &&
          (y < best.y || (y === best.y && Math.abs(x - frameSize / 2) < Math.abs(best.x - frameSize / 2)))
        )
      ) {
        best = { x, y, distanceSquared };
      }
    }
  }
  if (!best) throw new Error("Ship flag anchor projection found a blank sprite frame");
  return { x: best.x, y: best.y };
}

function copyFrameToSheet(frame, sheetCtx, frameIndex) {
  const cell = sheetCell(frameIndex, frameSize);
  sheetCtx.putImageData(edgeShadedFrameImage(frame, sheetCtx), cell.x, cell.y);
}

function makeSinkDepthSheet(frames, waterlineY, { exactModelHeight = false } = {}) {
  let minHeight = Infinity;
  let maxHeight = -Infinity;
  for (const frame of frames) {
    for (let pixel = 0; pixel < frame.alpha.length; pixel++) {
      if (!frame.alpha[pixel]) continue;
      const height = frame.positions[pixel * 3 + 1];
      if (!Number.isFinite(height)) throw new Error("Ship sink-depth bake found a non-finite model height");
      minHeight = Math.min(minHeight, height);
      maxHeight = Math.max(maxHeight, height);
    }
  }
  const heightRange = maxHeight - minHeight;
  if (!Number.isFinite(heightRange) || heightRange <= 1e-6) {
    throw new Error(`Ship sink-depth bake has no usable height range: ${heightRange}`);
  }
  const encodedWaterlineY = encodedShipWaterlineY(waterlineY, minHeight, maxHeight);
  const waterlineRasterPadding = heightRange / (SHIP_WATERLINE_DEPTH_BYTE - 1);
  if (encodedWaterlineY <= minHeight || encodedWaterlineY >= maxHeight) {
    throw new Error(`Ship encoded waterline ${encodedWaterlineY} is outside its visible height range ${minHeight}..${maxHeight}`);
  }

  const sheet = createCanvas(frameSize * sheetCols, frameSize * Math.ceil(headings / sheetCols));
  const ctx = sheet.getContext("2d");
  for (let frameIndex = 0; frameIndex < frames.length; frameIndex++) {
    const frame = frames[frameIndex];
    const image = ctx.createImageData(frameSize, frameSize);
    const levels = new Uint8Array(frame.alpha.length);
    let submergedPixels = 0;
    for (let pixel = 0; pixel < frame.alpha.length; pixel++) {
      if (!frame.alpha[pixel]) continue;
      const normalY = frame.normals[pixel * 3 + 1];
      const modelHeight = frame.positions[pixel * 3 + 1];
      const height = exactModelHeight
        ? modelHeight
        : shipPixelBakeHeight(modelHeight, normalY, encodedWaterlineY, waterlineRasterPadding);
      const level = height < encodedWaterlineY
        ? Math.round(clamp((height - minHeight) / (encodedWaterlineY - minHeight), 0, 1) * (SHIP_WATERLINE_DEPTH_BYTE - 1))
        : SHIP_WATERLINE_DEPTH_BYTE + Math.round(
          clamp((height - encodedWaterlineY) / (maxHeight - encodedWaterlineY), 0, 1) *
            (255 - SHIP_WATERLINE_DEPTH_BYTE)
        );
      levels[pixel] = level;
      if (level <= SHIP_WATERLINE_DEPTH_BYTE) submergedPixels++;
    }
    if (submergedPixels === 0) {
      reconcileOccludedWaterline(frame, levels, waterlineRasterPadding, frameIndex);
    }
    for (let pixel = 0; pixel < frame.alpha.length; pixel++) {
      if (!frame.alpha[pixel]) continue;
      const level = levels[pixel];
      const offset = pixel * 4;
      image.data[offset] = level;
      image.data[offset + 1] = level;
      image.data[offset + 2] = level;
      image.data[offset + 3] = 255;
    }
    const cell = sheetCell(frameIndex, frameSize);
    ctx.putImageData(image, cell.x, cell.y);
  }
  return {
    sheet,
    minHeight,
    maxHeight,
    encodedWaterlineY,
    waterlineLevel: SHIP_WATERLINE_LEVEL
  };
}

function reconcileOccludedWaterline(frame, levels, rasterPadding, frameIndex) {
  let lowestSideHeight = Infinity;
  for (let pixel = 0; pixel < frame.alpha.length; pixel++) {
    if (!frame.alpha[pixel]) continue;
    if (frame.normals[pixel * 3 + 1] >= SHIP_DECK_NORMAL_Y) continue;
    lowestSideHeight = Math.min(lowestSideHeight, frame.positions[pixel * 3 + 1]);
  }
  if (!Number.isFinite(lowestSideHeight)) {
    throw new Error(`Ship frame ${frameIndex} has no visible side hull for waterline reconciliation`);
  }

  let reconciledPixels = 0;
  for (let pixel = 0; pixel < frame.alpha.length; pixel++) {
    if (!frame.alpha[pixel]) continue;
    if (frame.normals[pixel * 3 + 1] >= SHIP_DECK_NORMAL_Y) continue;
    if (frame.positions[pixel * 3 + 1] > lowestSideHeight + rasterPadding) continue;
    levels[pixel] = SHIP_WATERLINE_DEPTH_BYTE - 1;
    reconciledPixels++;
  }
  if (reconciledPixels === 0) {
    throw new Error(`Ship frame ${frameIndex} could not reconcile its occluded waterline`);
  }
}

function edgeShadedFrameImage(frame, targetCtx) {
  const shaded = targetCtx.createImageData(frameSize, frameSize);
  shaded.data.set(frame.image.data);

  for (let y = 0; y < frameSize; y++) {
    for (let x = 0; x < frameSize; x++) {
      const pixel = x + y * frameSize;
      const offset = pixel * 4;
      if (frame.image.data[offset + 3] === 0 || !pixelTouchesTransparency(frame.image.data, x, y)) continue;
      shaded.data[offset] = Math.round(shaded.data[offset] * shipEdgeShadeScale);
      shaded.data[offset + 1] = Math.round(shaded.data[offset + 1] * shipEdgeShadeScale);
      shaded.data[offset + 2] = Math.round(shaded.data[offset + 2] * shipEdgeShadeScale);
    }
  }
  return shaded;
}

function pixelTouchesTransparency(data, x, y, width = frameSize, height = frameSize) {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) return true;
      if (data[(nx + ny * width) * 4 + 3] === 0) return true;
    }
  }
  return false;
}

function sheetCell(frameIndex, size) {
  return {
    x: (frameIndex % sheetCols) * size,
    y: Math.floor(frameIndex / sheetCols) * size
  };
}

function makeWakeAnchors(frames, waterlineY, waterlineBand = wakeWaterlineBand) {
  return frames.map((frame, frameIndex) => makeWakeAnchor(frame, frameIndex, waterlineY, waterlineBand));
}

function makeHullFootprints(frames, waterlineY, waterlineBand = footprintWaterlineBand, projectileFrames = frames) {
  if (frames.length !== projectileFrames.length) {
    throw new Error("Ship hull footprints and projectile silhouettes need matching headings");
  }
  return frames.map((frame, frameIndex) => ({
    ...makeHullFootprint(frame, frameIndex, waterlineY, waterlineBand),
    projectilePolygon: shipProjectileSilhouetteFromAlpha(
      projectileFrames[frameIndex].alpha,
      frameSize,
      frameSize
    )
  }));
}

function makeHullFootprint(frame, frameIndex, waterlineY, waterlineBand) {
  const effectiveBand = visibleWaterlineBand(frame, frameIndex, waterlineY, waterlineBand);
  const points = [];
  for (let y = 0; y < frameSize; y++) {
    for (let x = 0; x < frameSize; x++) {
      const pixel = x + y * frameSize;
      if (!frame.alpha[pixel]) continue;
      const worldY = frame.positions[pixel * 3 + 1];
      if (Math.abs(worldY - waterlineY) > effectiveBand) continue;
      points.push({
        x: x + 0.5 - frameSize / 2,
        y: y + 0.5 - frameSize / 2
      });
    }
  }
  const polygon = convexPolygonHull(points).map((point) => ({
    x: Number(point.x.toFixed(2)),
    y: Number(point.y.toFixed(2))
  }));
  const area = Math.abs(polygonArea(polygon));
  if (polygon.length < 3 || area < 0.25) {
    throw new Error(
      `Ship frame ${frameIndex} has an invalid waterline hull footprint: ${polygon.length} points, area ${area}`
    );
  }
  const samples = rasterizeFootprint(polygon);
  if (samples.length < 3) throw new Error(`Ship frame ${frameIndex} has no usable hull footprint samples`);
  return { polygon, samples };
}

function visibleWaterlineBand(frame, frameIndex, waterlineY, requestedBand) {
  const visibleWaterlineDistances = [];
  for (let pixel = 0; pixel < frame.alpha.length; pixel++) {
    if (!frame.alpha[pixel]) continue;
    visibleWaterlineDistances.push(Math.abs(frame.positions[pixel * 3 + 1] - waterlineY));
  }
  if (visibleWaterlineDistances.length < 3) {
    throw new Error(`Ship frame ${frameIndex} has fewer than three visible hull pixels`);
  }
  visibleWaterlineDistances.sort((a, b) => a - b);
  const visibleBand = visibleWaterlineDistances[
    Math.floor((visibleWaterlineDistances.length - 1) * 0.12)
  ];
  return Math.max(requestedBand, visibleBand + 1e-6);
}

function polygonArea(polygon) {
  let area = 0;
  for (let i = 0; i < polygon.length; i++) {
    const next = polygon[(i + 1) % polygon.length];
    area += polygon[i].x * next.y - next.x * polygon[i].y;
  }
  return area / 2;
}

function rasterizeFootprint(polygon) {
  const minX = Math.floor(Math.min(...polygon.map((point) => point.x)));
  const maxX = Math.ceil(Math.max(...polygon.map((point) => point.x)));
  const minY = Math.floor(Math.min(...polygon.map((point) => point.y)));
  const maxY = Math.ceil(Math.max(...polygon.map((point) => point.y)));
  const samples = [];
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (!pointInsideConvexPolygon({ x, y }, polygon)) continue;
      samples.push({ x, y });
    }
  }
  return samples;
}

function pointInsideConvexPolygon(point, polygon) {
  let sign = 0;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    const cross = (b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x);
    if (Math.abs(cross) < 1e-6) continue;
    const nextSign = Math.sign(cross);
    if (sign !== 0 && sign !== nextSign) return false;
    sign = nextSign;
  }
  return true;
}

function makeWakeAnchor(frame, frameIndex, waterlineY, waterlineBand) {
  const direction = frameScreenHeading(frameIndex);
  const side = { x: -direction.y, y: direction.x };
  const effectiveBand = visibleWaterlineBand(frame, frameIndex, waterlineY, waterlineBand);
  const points = [];
  let aftProjection = Infinity;
  let bowProjection = -Infinity;

  for (let y = 0; y < frameSize; y++) {
    for (let x = 0; x < frameSize; x++) {
      const pixel = x + y * frameSize;
      if (!frame.alpha[pixel]) continue;
      const worldY = frame.positions[pixel * 3 + 1];
      if (Math.abs(worldY - waterlineY) > effectiveBand) continue;
      const ox = x + 0.5 - frameSize / 2;
      const oy = y + 0.5 - frameSize / 2;
      const projection = ox * direction.x + oy * direction.y;
      const lateral = ox * side.x + oy * side.y;
      aftProjection = Math.min(aftProjection, projection);
      bowProjection = Math.max(bowProjection, projection);
      points.push({ projection, lateral });
    }
  }

  if (points.length < 3 || !Number.isFinite(aftProjection) || !Number.isFinite(bowProjection)) {
    throw new Error(`Ship frame ${frameIndex} has insufficient visible waterline pixels for wake anchors`);
  }

  const length = bowProjection - aftProjection;
  if (length < 2) throw new Error(`Ship frame ${frameIndex} has an invalid waterline length: ${length}`);
  const stern = weightedWakePoint(points, (point) => {
    const aftLimit = aftProjection + Math.max(1, length * wakeAftBandRatio);
    return point.projection <= aftLimit ? 1 : 0;
  });
  if (!stern) throw new Error(`Ship frame ${frameIndex} has no stern waterline pixels`);

  const positiveShoulder = wakeShoulderAnchor(points, aftProjection, length, direction, side, 1);
  const negativeShoulder = wakeShoulderAnchor(points, aftProjection, length, direction, side, -1);
  if (!positiveShoulder && !negativeShoulder) {
    throw new Error(`Ship frame ${frameIndex} has no bow shoulder waterline pixels`);
  }

  const sternProjection = aftProjection - wakeSternClearancePx;
  return alignHorizontalShipWakeShoulders({
    stern: wakeAnchorPoint(sternProjection, stern.lateral, direction, side),
    positiveShoulder: positiveShoulder || mirrorWakeShoulder(negativeShoulder, direction, side),
    negativeShoulder: negativeShoulder || mirrorWakeShoulder(positiveShoulder, direction, side)
  }, direction, frameSize);
}

function wakeShoulderAnchor(points, aftProjection, length, direction, side, sideSign) {
  const targetProjection = aftProjection + length * wakeBowShoulderRatio;
  const projectionBand = Math.max(1, length * wakeBowShoulderBandRatio);
  const minimumProjection = aftProjection + length * 0.42;
  const anchor = weightedWakePoint(points, (point) => {
    const sideDistance = point.lateral * sideSign;
    if (point.projection < minimumProjection || sideDistance < -0.01) return 0;
    const normalizedDistance = (point.projection - targetProjection) / projectionBand;
    const projectionWeight = 1 / (1 + normalizedDistance * normalizedDistance);
    return projectionWeight * (0.75 + Math.max(0, sideDistance));
  });
  if (!anchor) return null;
  return wakeAnchorPoint(
    anchor.projection,
    anchor.lateral + wakeBowShoulderOutsetPx * sideSign,
    direction,
    side
  );
}

function weightedWakePoint(points, weightForPoint) {
  let projectionSum = 0;
  let lateralSum = 0;
  let weightSum = 0;
  for (const point of points) {
    const weight = weightForPoint(point);
    if (weight <= 0) continue;
    projectionSum += point.projection * weight;
    lateralSum += point.lateral * weight;
    weightSum += weight;
  }
  if (weightSum <= 0) return null;
  return {
    projection: projectionSum / weightSum,
    lateral: lateralSum / weightSum
  };
}

function wakeAnchorPoint(projection, lateral, direction, side) {
  return {
    x: Math.round(direction.x * projection + side.x * lateral),
    y: Math.round(direction.y * projection + side.y * lateral)
  };
}

function mirrorWakeShoulder(anchor, direction, side) {
  const projection = anchor.x * direction.x + anchor.y * direction.y;
  const lateral = anchor.x * side.x + anchor.y * side.y;
  return wakeAnchorPoint(projection, -lateral, direction, side);
}

function frameScreenHeading(frameIndex) {
  const angle = frameIndex / headings * Math.PI * 2;
  return {
    x: Math.cos(angle),
    y: -Math.sin(angle)
  };
}

function makeLightingDirections() {
  const directions = [];
  for (let elevationIndex = 0; elevationIndex < lightElevationBins; elevationIndex++) {
    const elevationAngle = lightElevationAngles[elevationIndex];
    if (!Number.isFinite(elevationAngle)) throw new Error(`Missing light elevation angle ${elevationIndex}`);
    const z = Math.tan(elevationAngle);
    for (let azimuthIndex = 0; azimuthIndex < lightAzimuthBins; azimuthIndex++) {
      const angle = (azimuthIndex / lightAzimuthBins) * Math.PI * 2;
      const x = Math.cos(angle);
      const y = Math.sin(angle);
      const length = Math.hypot(x, y, z);
      directions.push({
        azimuthIndex,
        elevationIndex,
        elevationAngle,
        screenX: x,
        screenY: y,
        x: x / length,
        y: y / length,
        z: z / length
      });
    }
  }
  if (directions.length !== lightBinCount) {
    throw new Error(`Expected ${lightBinCount} lighting directions, got ${directions.length}`);
  }
  return directions;
}

function lightBinIndex(dir) {
  return dir.elevationIndex * lightAzimuthBins + dir.azimuthIndex;
}

function makeSelfShadowMaps(frames, directions, camera) {
  return frames.map((frame) => {
    const maps = Array.from({ length: lightBinCount });
    for (const dir of directions) {
      maps[lightBinIndex(dir)] = makeSelfShadowMap(
        frame.casters,
        worldLightDirectionForScreen(camera, dir)
      );
    }
    return maps;
  });
}

function makeSelfShadowMap(casters, light) {
  const basis = makeLightBasis(light);
  const bounds = lightMapBounds(casters, basis);
  const depth = new Float32Array(selfShadowMapSize * selfShadowMapSize);
  depth.fill(-Infinity);

  for (const tri of casters) {
    const points = [tri.a, tri.b, tri.c].map((point) => lightMapPoint(point, basis, bounds));
    rasterizeLightDepthTriangle(depth, points);
  }

  return { basis, bounds, depth };
}

function makeLightBasis(light) {
  const forward = light.clone().normalize();
  const helper = Math.abs(forward.y) > 0.92
    ? new THREE.Vector3(1, 0, 0)
    : new THREE.Vector3(0, 1, 0);
  const right = new THREE.Vector3().crossVectors(helper, forward).normalize();
  const up = new THREE.Vector3().crossVectors(forward, right).normalize();
  return { right, up, forward };
}

function lightMapBounds(casters, basis) {
  let minU = Infinity;
  let minV = Infinity;
  let maxU = -Infinity;
  let maxV = -Infinity;

  for (const tri of casters) {
    for (const point of [tri.a, tri.b, tri.c]) {
      const u = point.dot(basis.right);
      const v = point.dot(basis.up);
      minU = Math.min(minU, u);
      minV = Math.min(minV, v);
      maxU = Math.max(maxU, u);
      maxV = Math.max(maxV, v);
    }
  }

  const span = Math.max(maxU - minU, maxV - minV);
  if (!Number.isFinite(span) || span <= 0) throw new Error("Invalid ship light-space bounds");
  const margin = span * 0.08 + 0.04;
  return {
    minU: minU - margin,
    minV: minV - margin,
    maxU: maxU + margin,
    maxV: maxV + margin
  };
}

function lightMapPoint(point, basis, bounds) {
  const u = point.dot(basis.right);
  const v = point.dot(basis.up);
  return {
    x: ((u - bounds.minU) / (bounds.maxU - bounds.minU)) * selfShadowMapSize,
    y: ((v - bounds.minV) / (bounds.maxV - bounds.minV)) * selfShadowMapSize,
    z: point.dot(basis.forward)
  };
}

function rasterizeLightDepthTriangle(depth, points) {
  const [a, b, c] = points;
  const minX = Math.max(0, Math.floor(Math.min(a.x, b.x, c.x)));
  const minY = Math.max(0, Math.floor(Math.min(a.y, b.y, c.y)));
  const maxX = Math.min(selfShadowMapSize - 1, Math.ceil(Math.max(a.x, b.x, c.x)));
  const maxY = Math.min(selfShadowMapSize - 1, Math.ceil(Math.max(a.y, b.y, c.y)));
  const area = edge(a, b, c.x, c.y);
  if (Math.abs(area) < 0.00001) return;

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      const w0 = edge(b, c, px, py) / area;
      const w1 = edge(c, a, px, py) / area;
      const w2 = edge(a, b, px, py) / area;
      if (w0 < 0 || w1 < 0 || w2 < 0) continue;

      const z = w0 * a.z + w1 * b.z + w2 * c.z;
      const index = x + y * selfShadowMapSize;
      if (z > depth[index]) depth[index] = z;
    }
  }
}

function pointIsSelfShadowed(map, frame, framePixel) {
  const positionOffset = framePixel * 3;
  const point = new THREE.Vector3(
    frame.positions[positionOffset],
    frame.positions[positionOffset + 1],
    frame.positions[positionOffset + 2]
  );
  const projected = lightMapPoint(point, map.basis, map.bounds);
  const px = Math.floor(projected.x);
  const py = Math.floor(projected.y);
  if (px < 0 || px >= selfShadowMapSize || py < 0 || py >= selfShadowMapSize) return false;

  for (let yy = -selfShadowLookupRadius; yy <= selfShadowLookupRadius; yy++) {
    const sy = py + yy;
    if (sy < 0 || sy >= selfShadowMapSize) continue;
    for (let xx = -selfShadowLookupRadius; xx <= selfShadowLookupRadius; xx++) {
      if (Math.abs(xx) + Math.abs(yy) > selfShadowLookupRadius + 1) continue;
      const sx = px + xx;
      if (sx < 0 || sx >= selfShadowMapSize) continue;
      const casterDepth = map.depth[sx + sy * selfShadowMapSize];
      if (casterDepth > projected.z + selfShadowDepthBias) return true;
    }
  }
  return false;
}

function makeLightingMaskSheet(frames, directions, kind, selfShadowMaps) {
  const rows = Math.ceil(headings / sheetCols);
  const canvas = createCanvas(frameSize * sheetCols, frameSize * rows * lightElevationBins);
  const ctx = canvas.getContext("2d");
  const image = ctx.createImageData(canvas.width, canvas.height);

  for (let frameIndex = 0; frameIndex < frames.length; frameIndex++) {
    const frame = frames[frameIndex];
    const cell = sheetCell(frameIndex, frameSize);
    for (let y = 0; y < frameSize; y++) {
      for (let x = 0; x < frameSize; x++) {
        const pixel = x + y * frameSize;
        if (!frame.alpha[pixel]) continue;
        const normalOffset = pixel * 3;
        const nx = frame.normals[normalOffset];
        const ny = frame.normals[normalOffset + 1];
        const nz = frame.normals[normalOffset + 2];
        for (const dir of directions) {
          const binIndex = lightBinIndex(dir);
          const dot = nx * dir.x + ny * dir.y + nz * dir.z;
          const selfShadowed = selfShadowMaps
            ? pointIsSelfShadowed(selfShadowMaps[frameIndex][binIndex], frame, pixel)
            : false;
          const masked = kind === "light"
            ? dot >= highlightDotThreshold && !selfShadowed
            : dot <= shadeDotThreshold || selfShadowed;
          if (!masked) continue;
          setAzimuthMaskBit(
            image.data,
            canvas.width,
            cell.x + x,
            cell.y + dir.elevationIndex * rows * frameSize + y,
            dir.azimuthIndex
          );
        }
      }
    }
  }

  ctx.putImageData(image, 0, 0);
  return canvas;
}

function makeShadowMaskSheet(frames, directions, camera, waterlineY) {
  const rows = Math.ceil(headings / sheetCols);
  const canvas = createCanvas(shadowFrameSize * sheetCols, shadowFrameSize * rows * lightElevationBins);
  const ctx = canvas.getContext("2d");
  const image = ctx.createImageData(canvas.width, canvas.height);

  for (let frameIndex = 0; frameIndex < frames.length; frameIndex++) {
    const frame = frames[frameIndex];
    const cell = sheetCell(frameIndex, shadowFrameSize);
    for (let y = 0; y < frameSize; y++) {
      for (let x = 0; x < frameSize; x++) {
        const pixel = x + y * frameSize;
        if (!frame.alpha[pixel]) continue;
        const positionOffset = pixel * 3;
        const source = new THREE.Vector3(
          frame.positions[positionOffset],
          frame.positions[positionOffset + 1],
          frame.positions[positionOffset + 2]
        );
        const heightAboveWater = source.y - waterlineY;
        if (heightAboveWater <= 0.002) continue;

        for (const dir of directions) {
          const bandY = dir.elevationIndex * rows * shadowFrameSize;
          const clip = {
            minX: cell.x,
            minY: bandY + cell.y,
            maxX: cell.x + shadowFrameSize - 1,
            maxY: bandY + cell.y + shadowFrameSize - 1
          };
          const light = worldLightDirectionForScreen(camera, dir);
          if (light.y <= 0.01) continue;
          const rayT = heightAboveWater / light.y;
          const shadowPoint = source.clone().addScaledVector(light, -rayT);
          const projected = projectedPoint(shadowPoint, camera);
          const mapped = mapProjectedToFrame(frame, projected);
          const sx = cell.x + shadowFrameInset + mapped.x;
          const sy = bandY + cell.y + shadowFrameInset + mapped.y;
          const radius = dir.elevationIndex === 0 ? 1 : 0;
          setAzimuthMaskBrush(image.data, canvas.width, sx, sy, dir.azimuthIndex, radius, clip);
        }
      }
    }
  }

  ctx.putImageData(image, 0, 0);
  return canvas;
}

function worldLightDirectionForScreen(camera, dir) {
  const e = camera.matrixWorld.elements;
  const right = new THREE.Vector3(e[0], e[1], e[2]);
  const up = new THREE.Vector3(e[4], e[5], e[6]);
  const horizontalDir = right.multiplyScalar(dir.screenX).add(up.multiplyScalar(-dir.screenY));
  horizontalDir.y = 0;
  const hLen = horizontalDir.length();
  if (hLen <= 1e-6) {
    return new THREE.Vector3(0, 1, 0);
  }

  const horizontal = Math.cos(dir.elevationAngle);
  return new THREE.Vector3(
    (horizontalDir.x / hLen) * horizontal,
    Math.sin(dir.elevationAngle),
    (horizontalDir.z / hLen) * horizontal
  ).normalize();
}

function mapProjectedToFrame(frame, projected) {
  const u = (projected.x - frame.bounds.minX) / frame.bounds.width;
  const v = (projected.y - frame.bounds.minY) / frame.bounds.height;
  return {
    x: Math.round(frame.drawX + u * frame.drawW),
    y: Math.round(frame.drawY + v * frame.drawH)
  };
}

function setAzimuthMaskBit(data, width, x, y, azimuthIndex) {
  if (azimuthIndex < 0 || azimuthIndex >= lightAzimuthBins) {
    throw new Error(`Invalid azimuth bit: ${azimuthIndex}`);
  }
  const offset = (x + y * width) * 4;
  const channel = azimuthIndex < 8 ? 0 : 1;
  data[offset + channel] |= 1 << (azimuthIndex & 7);
  data[offset + 3] = 255;
}

function setAzimuthMaskBrush(data, width, x, y, azimuthIndex, radius, clip) {
  for (let yy = -radius; yy <= radius; yy++) {
    for (let xx = -radius; xx <= radius; xx++) {
      if (Math.abs(xx) + Math.abs(yy) > radius + 1) continue;
      const sx = x + xx;
      const sy = y + yy;
      if (sx < 0 || sx >= width || sy < 0 || sy >= data.length / 4 / width) continue;
      if (clip && (sx < clip.minX || sx > clip.maxX || sy < clip.minY || sy > clip.maxY)) continue;
      setAzimuthMaskBit(data, width, sx, sy, azimuthIndex);
    }
  }
}

function makeLightingPreview(sheet, lightMask, shadeMask, shadowMask) {
  const preview = createCanvas(sheet.width * previewScale, sheet.height * previewScale);
  const ctx = preview.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#18243a";
  ctx.fillRect(0, 0, preview.width, preview.height);
  ctx.drawImage(sheet, 0, 0, preview.width, preview.height);

  const lightCtx = lightMask.getContext("2d");
  const shadeCtx = shadeMask.getContext("2d");
  const shadowCtx = shadowMask.getContext("2d");
  const lightData = lightCtx.getImageData(0, 0, lightMask.width, lightMask.height).data;
  const shadeData = shadeCtx.getImageData(0, 0, shadeMask.width, shadeMask.height).data;
  const shadowData = shadowCtx.getImageData(0, 0, shadowMask.width, shadowMask.height).data;
  const previewBin = 2;
  const shadowOffset = (shadowFrameSize - frameSize) / 2;

  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = "rgba(32, 24, 48, 0.34)";
  drawPreviewMaskBits(ctx, shadeData, shadeMask.width, frameSize, previewBin, 0, 0, 1);
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "rgba(255, 245, 196, 0.38)";
  drawPreviewMaskBits(ctx, lightData, lightMask.width, frameSize, previewBin, 0, 0, 1);
  ctx.fillStyle = "rgba(20, 15, 26, 0.24)";
  drawPreviewMaskBits(ctx, shadowData, shadowMask.width, shadowFrameSize, previewBin, -shadowOffset, -shadowOffset, 1);
  ctx.globalCompositeOperation = "source-over";

  return preview;
}

function drawPreviewMaskBits(targetCtx, maskData, maskWidth, maskFrameSize, bit, offsetX, offsetY, elevationIndex) {
  const rows = Math.ceil(headings / sheetCols);
  const elevationY = elevationIndex * rows * maskFrameSize;
  const channel = bit < 8 ? 0 : 1;
  const mask = 1 << (bit & 7);
  for (let frameIndex = 0; frameIndex < headings; frameIndex++) {
    const sourceCell = sheetCell(frameIndex, maskFrameSize);
    const targetCell = sheetCell(frameIndex, frameSize);
    for (let y = 0; y < maskFrameSize; y++) {
      for (let x = 0; x < maskFrameSize; x++) {
        const sourceOffset = (sourceCell.x + x + (elevationY + sourceCell.y + y) * maskWidth) * 4;
        if ((maskData[sourceOffset + channel] & mask) === 0) continue;
        targetCtx.fillRect(
          Math.round((targetCell.x + x + offsetX) * previewScale),
          Math.round((targetCell.y + y + offsetY) * previewScale),
          previewScale,
          previewScale
        );
      }
    }
  }
}

function makePreview(sheet) {
  const preview = createCanvas(sheet.width * previewScale, sheet.height * previewScale);
  const ctx = preview.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#18243a";
  ctx.fillRect(0, 0, preview.width, preview.height);
  ctx.drawImage(sheet, 0, 0, preview.width, preview.height);

  ctx.fillStyle = "rgba(255,255,255,0.18)";
  for (let x = 0; x <= sheet.width; x += frameSize) {
    ctx.fillRect(x * previewScale, 0, 1, preview.height);
  }
  for (let y = 0; y <= sheet.height; y += frameSize) {
    ctx.fillRect(0, y * previewScale, preview.width, 1);
  }

  return preview;
}

async function renderShipSpriteSet(config) {
  mkdirSync(config.outputDir, { recursive: true });
  const scene = await loadScene(config.modelPath);
  const textureSampler = config.texturePath ? await loadTextureSampler(config.texturePath) : null;
  const materialTextureSamplers = await loadGltfMaterialTextureSamplers(
    config.modelPath,
    config.gltfTextureSamplerOptions
  );
  const model = collectTriangles(scene, {
    targetMaxDim: config.targetModelMaxDim ?? defaultTargetModelMaxDim,
    materialTextureSamplers,
    ...config.collectOptions
  });
  const hullTriangles = model.triangles;
  const flagAnchorTriangles = config.flagAnchorMeshName
    ? hullTriangles.filter((triangle) => triangle.sourceMeshName === config.flagAnchorMeshName)
    : hullTriangles;
  if (flagAnchorTriangles.length === 0) {
    const availableMeshes = [...new Set(hullTriangles.map((triangle) => triangle.sourceMeshName))];
    throw new Error(
      `${config.slug} flag anchor source mesh is absent: ${config.flagAnchorMeshName}; ` +
      `available meshes: ${availableMeshes.join(", ")}`
    );
  }
  const flagAnchorModelPoint = selectShipFlagAnchorPoint(flagAnchorTriangles);
  const waterline = estimateWaterlineForConfig(hullTriangles, config);
  const waterlineY = waterline.y;
  const renderTriangles = staticTrianglesForConfig(hullTriangles, waterlineY, config);
  const camera = makeCamera();
  const sheet = createCanvas(frameSize * sheetCols, frameSize * Math.ceil(headings / sheetCols));
  const sheetCtx = sheet.getContext("2d");
  sheetCtx.clearRect(0, 0, sheet.width, sheet.height);
  sheetCtx.imageSmoothingEnabled = false;

  const renderOptions = {
    textureSampler,
    colorTransform: config.colorTransform,
    waterlineY,
    collectCasters: !config.skipSelfShadowMaps
  };
  const renderedAnimationModes = config.animationTrianglesForFrame
    ? ROWING_RENDER_MODES.map((mode) => ({
        ...mode,
        renderedHeadings: Array.from({ length: config.animationFrameCount }, (_, frameIndex) => {
          const triangles = config.animationTrianglesForFrame(
            renderTriangles,
            frameIndex,
            waterlineY,
            mode.rowingMode
          );
          return Array.from(
            { length: headings },
            (_, headingIndex) => renderHeading(triangles, headingIndex, camera, renderOptions)
          );
        })
      }))
    : null;
  const renderedAnimationHeadings = renderedAnimationModes?.[0].renderedHeadings ?? null;
  const renderedHeadings = renderedAnimationHeadings?.[0] ?? Array.from(
    { length: headings },
    (_, headingIndex) => renderHeading(renderTriangles, headingIndex, camera, renderOptions)
  );
  // Every heading and oar pose shares one model-space waterline anchor and one
  // affine crop. Rotation can change the silhouette, never the ship's position.
  const boundsByHeading = renderedAnimationHeadings
    ? Array.from({ length: headings }, (_, headingIndex) => (
        unionAlphaBounds(renderedAnimationModes.flatMap((mode) => (
          mode.renderedHeadings.map((frames) => alphaBounds(frames[headingIndex].canvas))
        )))
      ))
    : renderedHeadings.map((rendered) => alphaBounds(rendered.canvas));
  const turntableModelAnchor = new THREE.Vector3(0, waterlineY, 0);
  const turntableSourceAnchor = projectedPoint(turntableModelAnchor, camera);
  const frameRegistration = anchoredShipFrameRegistration({
    boundsByHeading,
    sourceAnchor: turntableSourceAnchor,
    frameSize,
    requestedScale: config.frameScale ?? null,
    margin: config.frameRegistrationMargin
  });
  validateRegistrationSourceBounds(config.slug, frameRegistration, renderSize, renderSize);
  const frameScale = frameRegistration.scale;
  const animationModes = renderedAnimationModes?.map((mode) => ({
    ...mode,
    frames: mode.renderedHeadings.map((renderedFrames) => (
      renderedFrames.map((rendered, headingIndex) => (
        makeFrame(rendered, frameRegistration)
      ))
    ))
  })) ?? null;
  const animationFrames = animationModes?.[0].frames ?? null;
  const frames = animationFrames?.[0] ?? renderedHeadings.map(
    (rendered) => makeFrame(rendered, frameRegistration)
  );
  if (animationModes) {
    validateStableAnimationFraming(
      config.slug,
      animationModes.flatMap((mode) => mode.frames)
    );
  }
  const baseFlagAnchors = makeFlagAnchors(
    flagAnchorModelPoint,
    frames,
    camera,
    config.flagAnchorMaxSnapDistancePx
  );
  const footprintFrames = config.animationTrianglesForFrame || config.staticTrianglesForHull
    ? Array.from({ length: headings }, (_, i) => {
        const rendered = renderHeading(hullTriangles, i, camera, renderOptions);
        return makeFrame(rendered, frameRegistration);
      })
    : frames;
  for (let i = 0; i < headings; i++) {
    copyFrameToSheet(frames[i], sheetCtx, i);
  }
  const sinkDepth = makeSinkDepthSheet(frames, waterlineY, {
    exactModelHeight: config.exactSinkDepth === true
  });
  const wakeAnchors = makeWakeAnchors(frames, waterlineY, config.wakeWaterlineBand);
  const hullFootprints = makeHullFootprints(
    footprintFrames,
    waterlineY,
    config.footprintWaterlineBand,
    frames
  );

  const lightDirections = makeLightingDirections();
  const selfShadowMaps = config.skipSelfShadowMaps
    ? null
    : makeSelfShadowMaps(frames, lightDirections, camera);
  const lightMask = makeLightingMaskSheet(frames, lightDirections, "light", selfShadowMaps);
  const shadeMask = makeLightingMaskSheet(frames, lightDirections, "shade", selfShadowMaps);
  const shadowMask = makeShadowMaskSheet(frames, lightDirections, camera, waterlineY);
  const preview = makePreview(sheet);
  const lightingPreview = makeLightingPreview(sheet, lightMask, shadeMask, shadowMask);
  const sheetPath = join(config.outputDir, `${config.outputPrefix}.png`);
  const sinkDepthPath = join(config.outputDir, `${config.outputPrefix}-sink-depth.png`);
  const lightPath = join(config.outputDir, `${config.outputPrefix}-light.png`);
  const shadePath = join(config.outputDir, `${config.outputPrefix}-shade.png`);
  const shadowPath = join(config.outputDir, `${config.outputPrefix}-shadow.png`);
  const previewPath = join(config.outputDir, `${config.outputPrefix}-preview.png`);
  const lightingPreviewPath = join(config.outputDir, `${config.outputPrefix}-lighting-preview.png`);
  writeFileSync(sheetPath, sheet.toBuffer("image/png"));
  writeFileSync(sinkDepthPath, sinkDepth.sheet.toBuffer("image/png"));
  writeFileSync(lightPath, lightMask.toBuffer("image/png"));
  writeFileSync(shadePath, shadeMask.toBuffer("image/png"));
  writeFileSync(shadowPath, shadowMask.toBuffer("image/png"));
  writeFileSync(previewPath, preview.toBuffer("image/png"));
  writeFileSync(lightingPreviewPath, lightingPreview.toBuffer("image/png"));
  const animationFilesByMode = animationModes
    ? Object.fromEntries(animationModes.map((mode, modeIndex) => [
        mode.id,
        renderShipAnimationSheets({
          config,
          flagAnchorModelPoint,
          waterlineY,
          camera,
          firstSheet: modeIndex === 0 ? sheet : null,
          animationFrames: mode.frames,
          fileStem: mode.id,
          contactSheetPath: modeIndex === 0 ? config.animationContactSheetPath : null
        })
      ]))
    : null;
  const animationFiles = animationFilesByMode?.rowing ?? null;
  const flagAnchors = {
    base: baseFlagAnchors,
    ...(animationFiles ? { rowing: animationFiles.flagAnchors } : {})
  };
  return {
    slug: config.slug || stripShipHeadingSuffix(config.outputPrefix),
    label: config.label || config.outputPrefix,
    category: config.category || "default",
    assetLabel: config.assetLabel || config.label || config.outputPrefix,
    identifiedType: config.identifiedType || config.label || config.outputPrefix,
    identificationConfidence: config.identificationConfidence || "unknown",
    identificationNotes: config.identificationNotes || "",
    ...(config.collectOptions?.requiredExcludedMeshes ? {
      removedSourceMeshes: config.collectOptions.requiredExcludedMeshes.map((spec) => ({ ...spec }))
    } : {}),
    ...(config.collectOptions?.requiredExcludedVertexRanges ? {
      removedSourceComponents: config.collectOptions.requiredExcludedVertexRanges.map(
        (spec) => ({ ...spec })
      )
    } : {}),
    ...(config.creator ? { creator: config.creator } : {}),
    ...(config.license ? { license: config.license } : {}),
    ...(config.sourceTitle ? { sourceTitle: config.sourceTitle } : {}),
    ...(config.sourceOrientation ? { sourceOrientation: config.sourceOrientation } : {}),
    ...(Number.isInteger(config.animatedOarCount) ? {
      animatedOarCount: config.animatedOarCount
    } : {}),
    sourceModel: portablePath(config.modelPath),
    sourceTexture: config.texturePath ? portablePath(config.texturePath) : null,
    sourceMaxDim: Number(model.sourceMaxDim.toFixed(4)),
    targetModelMaxDim: Number(model.targetMaxDim.toFixed(4)),
    frameScale: Number(frameScale.toFixed(4)),
    turntableAnchor: {
      x: Number(frameRegistration.targetAnchor.x.toFixed(4)),
      y: Number(frameRegistration.targetAnchor.y.toFixed(4))
    },
    scaleMode: config.scaleMode || "fit-model",
    waterlineY,
    waterlineOffsetY: config.waterlineOffsetY ?? 0,
    waterlineSlice: {
      expectedHullCount: waterline.expectedHullCount,
      componentCount: waterline.componentCount,
      dominantLengthRatio: Number(waterline.dominantLengthRatio.toFixed(4)),
      hullIntervalMinY: Number(waterline.hullIntervalMinY.toFixed(6)),
      hullIntervalMaxY: Number(waterline.hullIntervalMaxY.toFixed(6))
    },
    encodedWaterlineY: Number(sinkDepth.encodedWaterlineY.toFixed(6)),
    sinkHeightBins: 256,
    sinkHeightMin: Number(sinkDepth.minHeight.toFixed(6)),
    sinkHeightMax: Number(sinkDepth.maxHeight.toFixed(6)),
    sinkWaterlineLevel: Number(sinkDepth.waterlineLevel.toFixed(6)),
    frameSize,
    shadowFrameSize,
    headings,
    sheetCols,
    lightAzimuthBins,
    lightElevationBins,
    wakeAnchors,
    hullFootprints,
    flagAnchorSelection: "upper-centerline-model-point-aftmost-tiebreak",
    ...(config.flagAnchorMeshName ? { flagAnchorSourceMesh: config.flagAnchorMeshName } : {}),
    flagAnchorModelPoint: Object.fromEntries(
      Object.entries(flagAnchorModelPoint).map(([axis, value]) => [axis, Number(value.toFixed(6))])
    ),
    flagAnchors,
    ...(config.stats ? { stats: config.stats } : {}),
    files: {
      sheet: portablePath(sheetPath),
      sinkDepth: portablePath(sinkDepthPath),
      light: portablePath(lightPath),
      shade: portablePath(shadePath),
      shadow: portablePath(shadowPath),
      preview: portablePath(previewPath),
      lightingPreview: portablePath(lightingPreviewPath),
      ...(animationFiles ? {
        rowingAnimation: animationFiles.spritePaths.map(portablePath),
        rowingSinkDepth: animationFiles.sinkDepthPaths.map(portablePath),
        pivotPortAnimation: animationFilesByMode["pivot-port"].spritePaths.map(portablePath),
        pivotPortSinkDepth: animationFilesByMode["pivot-port"].sinkDepthPaths.map(portablePath),
        pivotStarboardAnimation: animationFilesByMode["pivot-starboard"].spritePaths.map(portablePath),
        pivotStarboardSinkDepth: animationFilesByMode["pivot-starboard"].sinkDepthPaths.map(portablePath)
      } : {})
    },
    sheet
  };
}

function renderShipAnimationSheets({
  config,
  flagAnchorModelPoint,
  waterlineY,
  camera,
  firstSheet,
  animationFrames,
  fileStem,
  contactSheetPath
}) {
  if (animationFrames.length !== config.animationFrameCount) {
    throw new Error(
      `${config.slug} rendered ${animationFrames.length} animation frames; ` +
      `expected ${config.animationFrameCount}`
    );
  }
  const animationSheets = animationFrames.map((frames, frameIndex) => (
    frameIndex === 0 && firstSheet ? firstSheet : makeShipHeadingSheet(frames)
  ));
  const animationFlagAnchors = animationFrames.map((frames) => makeFlagAnchors(
    flagAnchorModelPoint,
    frames,
    camera,
    config.flagAnchorMaxSnapDistancePx
  ));
  const spritePaths = [];
  const sinkDepthPaths = [];
  const basePrefix = stripShipHeadingSuffix(config.outputPrefix);
  for (let frameIndex = 0; frameIndex < config.animationFrameCount; frameIndex++) {
    const sheet = animationSheets[frameIndex];
    const frames = animationFrames[frameIndex];
    if (!frames) throw new Error(`Missing ship animation geometry for frame ${frameIndex}`);
    const spritePath = join(
      config.outputDir,
      `${basePrefix}-${fileStem}-${frameIndex}-${SHIP_SPRITE_HEADING_SUFFIX}.png`
    );
    const sinkDepthPath = join(
      config.outputDir,
      `${basePrefix}-${fileStem}-${frameIndex}-${SHIP_SPRITE_HEADING_SUFFIX}-sink-depth.png`
    );
    const sinkDepth = makeSinkDepthSheet(frames, waterlineY);
    writeFileSync(spritePath, sheet.toBuffer("image/png"));
    writeFileSync(sinkDepthPath, sinkDepth.sheet.toBuffer("image/png"));
    spritePaths.push(spritePath);
    sinkDepthPaths.push(sinkDepthPath);
  }
  if (contactSheetPath) {
    mkdirSync(dirname(contactSheetPath), { recursive: true });
    const contactSheet = makeRowingAnimationContactSheet(
      animationSheets,
      config.animationContactScale,
      config.animationReviewHeading
    );
    writeFileSync(contactSheetPath, contactSheet.toBuffer("image/png"));
  }
  return { spritePaths, sinkDepthPaths, flagAnchors: animationFlagAnchors };
}

function makeShipHeadingSheet(frames) {
  if (!Array.isArray(frames) || frames.length !== headings) {
    throw new Error(`Ship heading sheet requires ${headings} frames`);
  }
  const sheet = createCanvas(frameSize * sheetCols, frameSize * Math.ceil(headings / sheetCols));
  const sheetCtx = sheet.getContext("2d");
  sheetCtx.imageSmoothingEnabled = false;
  for (let headingIndex = 0; headingIndex < headings; headingIndex++) {
    copyFrameToSheet(frames[headingIndex], sheetCtx, headingIndex);
  }
  return sheet;
}

function validateStableAnimationFraming(slug, framesByAnimation) {
  if (!Array.isArray(framesByAnimation) || framesByAnimation.length < 2) {
    throw new Error(`${slug} animated framing requires at least two frames`);
  }
  for (let headingIndex = 0; headingIndex < headings; headingIndex++) {
    const first = framesByAnimation[0][headingIndex];
    const expected = frameRegistration(first);
    for (let frameIndex = 1; frameIndex < framesByAnimation.length; frameIndex++) {
      const actual = frameRegistration(framesByAnimation[frameIndex][headingIndex]);
      if (actual !== expected) {
        throw new Error(
          `${slug} heading ${headingIndex} shifts between animation frames 0 and ${frameIndex}: ` +
          `${expected} != ${actual}`
        );
      }
    }
  }
}

function frameRegistration(frame) {
  return [
    frame.bounds.minX,
    frame.bounds.minY,
    frame.bounds.width,
    frame.bounds.height,
    frame.drawX,
    frame.drawY,
    frame.drawW,
    frame.drawH
  ].join(",");
}

function makeRowingAnimationContactSheet(animationSheets, requestedScale = 6, reviewHeading = 2) {
  const scale = requestedScale;
  const labelHeight = 22;
  const cellWidth = frameSize * scale;
  const canvas = createCanvas(cellWidth * animationSheets.length, frameSize * scale + labelHeight);
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#14151f";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = "14px monospace";
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  for (let frameIndex = 0; frameIndex < animationSheets.length; frameIndex++) {
    const x = frameIndex * cellWidth;
    const sourceCell = sheetCell(reviewHeading, frameSize);
    ctx.drawImage(
      animationSheets[frameIndex],
      sourceCell.x,
      sourceCell.y,
      frameSize,
      frameSize,
      x,
      0,
      cellWidth,
      frameSize * scale
    );
    ctx.fillStyle = "#f4ecd8";
    ctx.fillText(`FRAME ${frameIndex + 1}`, x + cellWidth / 2, frameSize * scale + labelHeight / 2);
  }
  return canvas;
}

function portablePath(path) {
  return relative(repoRoot, path).split("/").join("/");
}

function stripShipHeadingSuffix(value) {
  const suffix = `-${SHIP_SPRITE_HEADING_SUFFIX}`;
  if (!value.endsWith(suffix)) {
    throw new Error(`Ship output prefix must end with ${suffix}: ${value}`);
  }
  return value.slice(0, -suffix.length);
}

function unityShipModels() {
  const files = [];
  walkFiles(unityShipModelRoot, (path) => {
    if (extname(path).toLowerCase() !== ".fbx") return;
    const rel = relative(unityShipModelRoot, path).split("/").join("/");
    if (unityFleetExcludedModels.has(rel)) return;
    files.push(path);
  });
  return files.sort((a, b) => portableUnityModelPath(a).localeCompare(portableUnityModelPath(b)));
}

function walkFiles(dir, visit) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) walkFiles(path, visit);
    else visit(path);
  }
}

function portableUnityModelPath(path) {
  return relative(unityShipModelRoot, path).split("/").join("/");
}

function unityShipConfig(modelPath) {
  const rel = portableUnityModelPath(modelPath);
  const sourceCategory = dirname(rel).split("/").join(" ");
  const bareName = basename(modelPath, extname(modelPath));
  const assetLabel = titleize(bareName);
  const rosterEntry = unityShipRoster.get(rel);
  if (!rosterEntry) {
    throw new Error(`No ship roster identification for Unity model: ${rel}`);
  }
  return {
    slug: rosterEntry.slug,
    label: rosterEntry.label,
    category: sourceCategory,
    assetLabel,
    identifiedType: rosterEntry.identifiedType,
    identificationConfidence: rosterEntry.confidence,
    identificationNotes: rosterEntry.notes,
    ...UNITY_FLEET_MODEL_CREDIT,
    stats: shipStatsForSlug(rosterEntry.slug),
    modelPath,
    texturePath: unityShipTexturePath,
    targetModelMaxDim: rosterEntry.targetModelMaxDim,
    sideViewTargetModelMaxDim: rosterEntry.sideViewTargetModelMaxDim,
    frameScale: rosterEntry.frameScale,
    waterlineOffsetY: rosterEntry.waterlineOffsetY,
    flagAnchorMaxSnapDistancePx: rosterEntry.flagAnchorMaxSnapDistancePx,
    collectOptions: rosterEntry.collectOptions,
    staticTrianglesForHull: rosterEntry.staticTrianglesForHull,
    scaleMode: "source-relative-fleet",
    outputDir: unityFleetOutputRoot,
    outputPrefix: `${rosterEntry.slug}-${SHIP_SPRITE_HEADING_SUFFIX}`
  };
}

async function measureSourceMaxDim(modelPath) {
  const scene = await loadScene(modelPath);
  return collectTriangles(scene, { targetMaxDim: null }).sourceMaxDim;
}

async function measureRenderedBounds(config) {
  const scene = await loadScene(config.modelPath);
  const model = collectTriangles(scene, { targetMaxDim: config.targetModelMaxDim });
  const camera = makeCamera();
  const waterlineY = estimateWaterlineForConfig(model.triangles, config).y;
  const renderTriangles = staticTrianglesForConfig(model.triangles, waterlineY, config);
  return Array.from({ length: headings }, (_, i) => (
    alphaBounds(renderHeading(renderTriangles, i, camera, {
      textureSampler: null,
      waterlineY
    }).canvas)
  ));
}

function fleetTargetModelMaxDim(sourceMaxDim, largestSourceMaxDim) {
  if (!Number.isFinite(sourceMaxDim) || sourceMaxDim <= 0) {
    throw new Error(`Invalid source ship size: ${sourceMaxDim}`);
  }
  if (!Number.isFinite(largestSourceMaxDim) || largestSourceMaxDim <= 0) {
    throw new Error(`Invalid largest source ship size: ${largestSourceMaxDim}`);
  }
  const ratio = sourceMaxDim / largestSourceMaxDim;
  return defaultTargetModelMaxDim * Math.pow(ratio, unityFleetScaleExponent);
}

function resetUnityFleetOutput() {
  const relativeOutput = portablePath(unityFleetOutputRoot);
  if (relativeOutput !== "apps/pixel-globe/public/assets/vehicles/unity-ships") {
    throw new Error(`Refusing to clear unexpected Unity fleet output path: ${unityFleetOutputRoot}`);
  }
  rmSync(unityFleetOutputRoot, { recursive: true, force: true });
  mkdirSync(unityFleetOutputRoot, { recursive: true });
}

function resetUnityFleetReferenceOutput() {
  const relativeOutput = portablePath(unityFleetReferenceOutputRoot);
  if (relativeOutput !== "apps/pixel-globe/docs/ship-reference/high-res") {
    throw new Error(`Refusing to clear unexpected Unity fleet reference output path: ${unityFleetReferenceOutputRoot}`);
  }
  rmSync(unityFleetReferenceOutputRoot, { recursive: true, force: true });
  mkdirSync(unityFleetReferenceOutputRoot, { recursive: true });
}

function resetUnityFleetSideViewOutput() {
  const relativeOutput = portablePath(unityFleetSideViewOutputRoot);
  if (relativeOutput !== "apps/pixel-globe/public/assets/vehicles/unity-ships/side-views") {
    throw new Error(`Refusing to clear unexpected Unity fleet side-view path: ${unityFleetSideViewOutputRoot}`);
  }
  rmSync(unityFleetSideViewOutputRoot, { recursive: true, force: true });
  mkdirSync(unityFleetSideViewOutputRoot, { recursive: true });
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function titleize(value) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b[a-z]/g, (char) => char.toUpperCase());
}

function makeFleetContactSheet(entries, options = {}) {
  const itemScale = options.itemScale ?? 2;
  const labelHeight = 18;
  const itemWidth = Math.round(frameSize * sheetCols * itemScale);
  const itemSheetHeight = Math.round(frameSize * Math.ceil(headings / sheetCols) * itemScale);
  const itemHeight = itemSheetHeight + labelHeight;
  const cols = 5;
  const rows = Math.ceil(entries.length / cols);
  const canvas = createCanvas(itemWidth * cols, itemHeight * rows);
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#14151f";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = "12px monospace";
  ctx.textBaseline = "top";

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const x = (i % cols) * itemWidth;
    const y = Math.floor(i / cols) * itemHeight;
    ctx.drawImage(entry.sheet, x, y, itemWidth, itemSheetHeight);
    ctx.fillStyle = "#f4ecd8";
    ctx.fillText(entry.label.slice(0, 30), x + 4, y + itemSheetHeight + 3);
  }

  return canvas;
}

async function renderShipReferenceSet(config) {
  mkdirSync(config.outputDir, { recursive: true });
  const scene = await loadScene(config.modelPath);
  const textureSampler = config.texturePath ? await loadTextureSampler(config.texturePath) : null;
  const materialTextureSamplers = await loadGltfMaterialTextureSamplers(
    config.modelPath,
    config.gltfTextureSamplerOptions
  );
  const model = collectTriangles(scene, {
    targetMaxDim: config.targetModelMaxDim ?? defaultTargetModelMaxDim,
    materialTextureSamplers,
    ...config.collectOptions
  });
  const waterlineY = estimateWaterlineForConfig(model.triangles, config).y;
  const staticTriangles = staticTrianglesForConfig(model.triangles, waterlineY, config);
  const triangles = config.animationTrianglesForFrame
    ? config.animationTrianglesForFrame(staticTriangles, 0, waterlineY)
    : staticTriangles;
  const camera = makeCamera();
  const sheet = createCanvas(frameSize * sheetCols, frameSize * Math.ceil(headings / sheetCols));
  const sheetCtx = sheet.getContext("2d");
  sheetCtx.clearRect(0, 0, sheet.width, sheet.height);
  sheetCtx.imageSmoothingEnabled = false;

  const renderOptions = {
    textureSampler,
    colorTransform: config.colorTransform,
    waterlineY,
    collectCasters: false
  };
  const renderedHeadings = Array.from({ length: headings }, (_, i) => renderHeading(triangles, i, camera, renderOptions));
  const boundsByHeading = renderedHeadings.map((rendered) => alphaBounds(rendered.canvas));
  const turntableSourceAnchor = projectedPoint(new THREE.Vector3(0, waterlineY, 0), camera);
  const frameRegistration = anchoredShipFrameRegistration({
    boundsByHeading,
    sourceAnchor: turntableSourceAnchor,
    frameSize,
    requestedScale: config.frameScale ?? null
  });
  validateRegistrationSourceBounds(config.slug, frameRegistration, renderSize, renderSize);
  const frameScale = frameRegistration.scale;
  const frames = renderedHeadings.map((rendered) => makeFrame(rendered, frameRegistration));
  for (let i = 0; i < headings; i++) {
    copyFrameToSheet(frames[i], sheetCtx, i);
  }

  const preview = makePreview(sheet);
  const sheetPath = join(config.outputDir, `${config.outputPrefix}.png`);
  const previewPath = join(config.outputDir, `${config.outputPrefix}-preview.png`);
  writeFileSync(sheetPath, sheet.toBuffer("image/png"));
  writeFileSync(previewPath, preview.toBuffer("image/png"));
  return {
    slug: config.slug,
    label: config.label,
    category: config.category,
    assetLabel: config.assetLabel,
    identifiedType: config.identifiedType,
    identificationConfidence: config.identificationConfidence,
    identificationNotes: config.identificationNotes,
    sourceModel: portablePath(config.modelPath),
    sourceTexture: config.texturePath ? portablePath(config.texturePath) : null,
    sourceMaxDim: Number(model.sourceMaxDim.toFixed(4)),
    targetModelMaxDim: Number(model.targetMaxDim.toFixed(4)),
    frameScale: Number(frameScale.toFixed(4)),
    turntableAnchor: {
      x: Number(frameRegistration.targetAnchor.x.toFixed(4)),
      y: Number(frameRegistration.targetAnchor.y.toFixed(4))
    },
    scaleMode: config.scaleMode || "fit-model",
    waterlineY,
    frameSize,
    renderSize,
    headings,
    sheetCols,
    files: {
      referenceSheet: portablePath(sheetPath),
      referencePreview: portablePath(previewPath)
    },
    sheet
  };
}

function makeSideViewCamera() {
  const extentY = 1.15;
  const extentX = extentY * sideViewWidth / sideViewHeight;
  const camera = new THREE.OrthographicCamera(-extentX, extentX, extentY, -extentY, 0.01, 30);
  camera.position.set(0, 1.15, 7.5);
  camera.lookAt(0, 0.05, 0);
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();
  return camera;
}

function makeLevelSideViewCamera() {
  const extentY = 1.15;
  const extentX = extentY * sideViewWidth / sideViewHeight;
  const camera = new THREE.OrthographicCamera(-extentX, extentX, extentY, -extentY, 0.01, 30);
  camera.position.set(0, 0.05, 7.5);
  camera.lookAt(0, 0.05, 0);
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();
  return camera;
}

function resurrectPalette() {
  return RESURRECT_64_HEX.map((hex) => ({
    hex,
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16)
  }));
}

const RESURRECT_64_COLORS = resurrectPalette();

function nearestResurrectColor(r, g, b) {
  let best = null;
  let bestDistance = Infinity;
  for (const color of RESURRECT_64_COLORS) {
    const dr = r - color.r;
    const dg = g - color.g;
    const db = b - color.b;
    const distance = dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11;
    if (distance < bestDistance) {
      best = color;
      bestDistance = distance;
    }
  }
  if (!best) throw new Error("Resurrect palette is empty");
  return best;
}

function shadeEdgesAndQuantizeToResurrect(canvas, {
  shadeEdges = true,
  exposure = 1,
  lift = 0
} = {}) {
  if (!Number.isFinite(exposure) || exposure <= 0) {
    throw new Error(`Invalid sprite color exposure: ${exposure}`);
  }
  if (!Number.isFinite(lift)) throw new Error(`Invalid sprite color lift: ${lift}`);
  const ctx = canvas.getContext("2d");
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const source = new Uint8ClampedArray(image.data);
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const offset = (x + y * canvas.width) * 4;
      if (source[offset + 3] < 128) {
        image.data[offset] = 0;
        image.data[offset + 1] = 0;
        image.data[offset + 2] = 0;
        image.data[offset + 3] = 0;
        continue;
      }
      const edgeScale = shadeEdges && pixelTouchesTransparency(source, x, y, canvas.width, canvas.height)
        ? shipEdgeShadeScale
        : 1;
      const color = nearestResurrectColor(
        (source[offset] * exposure + lift) * edgeScale,
        (source[offset + 1] * exposure + lift) * edgeScale,
        (source[offset + 2] * exposure + lift) * edgeScale
      );
      image.data[offset] = color.r;
      image.data[offset + 1] = color.g;
      image.data[offset + 2] = color.b;
      image.data[offset + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
}

async function renderHorseCart() {
  mkdirSync(horseCartOutputRoot, { recursive: true });
  const horsePath = join(cartoonHorseSourceRoot, "scene.gltf");
  const cartPath = join(woodenCartSourceRoot, "scene.gltf");
  const [horseGltf, cartGltf, horseMaterials, cartMaterials] = await Promise.all([
    loadGltf(horsePath),
    loadGltf(cartPath),
    loadGltfMaterialTextureSamplers(horsePath),
    loadGltfMaterialTextureSamplers(cartPath)
  ]);
  const walkClip = horseWalkClip(horseGltf.animations);
  const mixer = new THREE.AnimationMixer(horseGltf.scene);
  const action = mixer.clipAction(walkClip);
  action.setLoop(THREE.LoopRepeat, Infinity);
  action.play();

  mixer.setTime(0);
  updateAnimatedScene(horseGltf.scene);
  const horseOrientation = horseForwardQuaternion(horseGltf.scene);
  const horseFrames = [];
  for (let frameIndex = 0; frameIndex < groundVehicleWalkFrameCount; frameIndex++) {
    mixer.setTime(walkClip.duration * frameIndex / groundVehicleWalkFrameCount);
    updateAnimatedScene(horseGltf.scene);
    horseFrames.push(collectTriangles(horseGltf.scene, {
      targetMaxDim: null,
      materialTextureSamplers: horseMaterials,
      transformPoint: (point) => point.clone().applyQuaternion(horseOrientation)
    }).triangles);
  }
  const cartTriangles = collectTriangles(cartGltf.scene, {
    targetMaxDim: null,
    materialTextureSamplers: cartMaterials,
    transformPoint: (point) => vectorFromCoordinates(orientNegativeXForwardYUpToZForward(point))
  }).triangles;
  const normalizedHorseFrames = normalizeAnimatedGroundModel(horseFrames, 1.0);
  const normalizedCart = normalizeGroundModel(cartTriangles, 1.0);
  const combinedFrames = composeHorseAndCart(normalizedHorseFrames, normalizedCart);
  return writeGroundVehicleBake({
    combinedFrames,
    outputDir: horseCartOutputRoot,
    outputPrefix: "horse-cart",
    generatedBy: "tools/render-sail-ship-sprites.mjs --horse-cart",
    contactSheetPath: join(appRoot, "docs/ship-reference/horse-cart-walk-frames.png"),
    maxDrawPixels: horseCartMaxDrawPixels,
    exposure: horseCartColorExposure,
    lift: horseCartColorLift,
    manifestDetails: {
      horse: {
        ...CARTOON_HORSE_MODEL_CREDIT,
        sourceModel: portablePath(horsePath),
        animation: walkClip.name,
        durationSeconds: walkClip.duration
      },
      cart: {
        ...WOODEN_CART_MODEL_CREDIT,
        sourceModel: portablePath(cartPath)
      }
    }
  });
}

async function renderLlamaCaravan() {
  mkdirSync(llamaCaravanOutputRoot, { recursive: true });
  const llamaPath = join(lowpolyLlamaSourceRoot, "scene.gltf");
  const [llamaGltf, llamaMaterials] = await Promise.all([
    loadGltf(llamaPath),
    loadGltfMaterialTextureSamplers(llamaPath)
  ]);
  const walkClip = requiredSingleWalkClip(llamaGltf.animations, "Llama");
  const hat = llamaGltf.scene.getObjectByName("DefaultHat");
  if (!hat) throw new Error("Llama source model is missing its removable DefaultHat node");
  hat.parent.remove(hat);
  const mixer = new THREE.AnimationMixer(llamaGltf.scene);
  const action = mixer.clipAction(walkClip);
  action.setLoop(THREE.LoopRepeat, Infinity);
  action.play();

  mixer.setTime(0);
  updateAnimatedScene(llamaGltf.scene);
  const llamaOrientation = llamaForwardQuaternion(llamaGltf.scene);
  const llamaFrames = [];
  for (let frameIndex = 0; frameIndex < groundVehicleWalkFrameCount; frameIndex++) {
    mixer.setTime(walkClip.duration * frameIndex / groundVehicleWalkFrameCount);
    updateAnimatedScene(llamaGltf.scene);
    llamaFrames.push(collectTriangles(llamaGltf.scene, {
      targetMaxDim: null,
      materialTextureSamplers: llamaMaterials,
      transformPoint: (point) => point.clone().applyQuaternion(llamaOrientation)
    }).triangles);
  }
  const normalizedFrames = normalizeAnimatedGroundModel(llamaFrames, 1.0);
  const combinedFrames = composeLoadedLlamaFrames(normalizedFrames);
  const orientationReviewPath = join(
    appRoot,
    "docs/ship-reference/llama-caravan-orientation-review.png"
  );
  return writeGroundVehicleBake({
    combinedFrames,
    outputDir: llamaCaravanOutputRoot,
    outputPrefix: "llama-caravan",
    generatedBy: "tools/render-sail-ship-sprites.mjs --llama-caravan",
    contactSheetPath: join(appRoot, "docs/ship-reference/llama-caravan-walk-frames.png"),
    orientationReviewPath,
    maxDrawPixels: loadedLlamaMaxDrawPixels,
    exposure: llamaCaravanColorExposure,
    lift: llamaCaravanColorLift,
    manifestDetails: {
      llama: {
        ...LOWPOLY_LLAMA_MODEL_CREDIT,
        sourceModel: portablePath(llamaPath),
        animation: walkClip.name,
        durationSeconds: walkClip.duration,
        runtimeCaravanCount: 3,
        sourceOrientation: "scene Y-up; head and forelegs toward +Z",
        gameOrientation: "Y-up; travel toward +Z",
        removedSourceNodes: ["DefaultHat"]
      },
      load: {
        description: "paired procedural pack sacks on each llama",
        sacksPerLlama: 2,
        runtimeSackPairs: 3
      }
    }
  });
}

async function renderDromedaryCaravan() {
  mkdirSync(dromedaryCaravanOutputRoot, { recursive: true });
  const modelPath = join(dromedaryCamelSourceRoot, "scene.gltf");
  const [gltf, materials] = await Promise.all([
    loadGltf(modelPath),
    loadGltfMaterialTextureSamplers(modelPath)
  ]);
  const walkClip = requiredSingleWalkClip(gltf.animations, "Dromedary camel");
  const mixer = new THREE.AnimationMixer(gltf.scene);
  mixer.clipAction(walkClip).setLoop(THREE.LoopRepeat, Infinity).play();
  mixer.setTime(0);
  updateAnimatedScene(gltf.scene);
  const orientation = groundAnimalForwardQuaternion(gltf.scene, {
    label: "Dromedary camel",
    headNode: "head0_0",
    rearNodes: ["leg_hind_left_top0_22", "leg_hind_right_top0_27"]
  });
  const frames = animatedGroundAnimalFrames({
    scene: gltf.scene,
    mixer,
    clip: walkClip,
    orientation,
    materialTextureSamplers: materials
  });
  return writeLoadedCamelBake({
    frames,
    outputDir: dromedaryCaravanOutputRoot,
    outputPrefix: "dromedary-caravan",
    generatedBy: "tools/render-sail-ship-sprites.mjs --dromedary-caravan",
    creditKey: "dromedary",
    credit: DROMEDARY_CAMEL_MODEL_CREDIT,
    modelPath,
    animation: walkClip.name,
    durationSeconds: walkClip.duration,
    animationMethod: "authored walk clip"
  });
}

async function renderBactrianCaravan() {
  mkdirSync(bactrianCaravanOutputRoot, { recursive: true });
  const modelPath = join(bactrianCamelSourceRoot, "scene.gltf");
  const [gltf, materials] = await Promise.all([
    loadGltf(modelPath),
    loadGltfMaterialTextureSamplers(modelPath)
  ]);
  const idleClip = requiredSingleWalkClip(gltf.animations, "Bactrian camel");
  if (!/idle/i.test(idleClip.name)) {
    throw new Error(`Bactrian camel source animation changed; expected idle clip, got ${idleClip.name}`);
  }
  const mixer = new THREE.AnimationMixer(gltf.scene);
  mixer.clipAction(idleClip).setLoop(THREE.LoopRepeat, Infinity).play();
  mixer.setTime(0);
  updateAnimatedScene(gltf.scene);
  const orientation = groundAnimalForwardQuaternion(gltf.scene, {
    label: "Bactrian camel",
    headNode: "Head_M_19_23",
    rearNodes: ["Tail0_M_56_57"]
  });
  const frames = animatedGroundAnimalFrames({
    scene: gltf.scene,
    mixer,
    clip: idleClip,
    orientation,
    materialTextureSamplers: materials,
    poseFrame: (frameIndex) => applyBactrianWalkPose(gltf.scene, frameIndex)
  });
  return writeLoadedCamelBake({
    frames,
    outputDir: bactrianCaravanOutputRoot,
    outputPrefix: "bactrian-caravan",
    generatedBy: "tools/render-sail-ship-sprites.mjs --bactrian-caravan",
    creditKey: "bactrian",
    credit: BACTRIAN_CAMEL_MODEL_CREDIT,
    modelPath,
    animation: idleClip.name,
    durationSeconds: idleClip.duration,
    animationMethod: "authored idle motion with procedural lateral walk cycle"
  });
}

function animatedGroundAnimalFrames({
  scene,
  mixer,
  clip,
  orientation,
  materialTextureSamplers,
  poseFrame = null
}) {
  const frames = [];
  for (let frameIndex = 0; frameIndex < groundVehicleWalkFrameCount; frameIndex++) {
    mixer.setTime(clip.duration * frameIndex / groundVehicleWalkFrameCount);
    if (poseFrame) poseFrame(frameIndex);
    updateAnimatedScene(scene);
    frames.push(collectTriangles(scene, {
      targetMaxDim: null,
      materialTextureSamplers,
      transformPoint: (point) => point.clone().applyQuaternion(orientation)
    }).triangles);
  }
  return frames;
}

function groundAnimalForwardQuaternion(scene, { label, headNode, rearNodes }) {
  const head = scene.getObjectByName(headNode);
  const rear = rearNodes.map((name) => scene.getObjectByName(name));
  if (!head || rear.some((node) => !node)) {
    throw new Error(`${label} rig is missing its head or rear landmark bones`);
  }
  const headPosition = head.getWorldPosition(new THREE.Vector3());
  const rearPosition = rear.reduce((sum, node) => (
    sum.add(node.getWorldPosition(new THREE.Vector3()))
  ), new THREE.Vector3()).multiplyScalar(1 / rear.length);
  const forward = headPosition.sub(rearPosition);
  forward.y = 0;
  if (forward.lengthSq() <= 1e-8) throw new Error(`${label} rig cannot resolve a forward direction`);
  return new THREE.Quaternion().setFromUnitVectors(
    forward.normalize(),
    new THREE.Vector3(0, 0, 1)
  );
}

function applyBactrianWalkPose(scene, frameIndex) {
  const phase = frameIndex * Math.PI * 2 / groundVehicleWalkFrameCount;
  const lateralSwing = Math.sin(phase) * 0.2;
  const kneeBend = Math.max(0, Math.sin(phase + Math.PI / 3)) * 0.13;
  const oppositeKneeBend = Math.max(0, Math.sin(phase + Math.PI + Math.PI / 3)) * 0.13;
  rotateRigNode(scene, "Shoulder_L_31_35", lateralSwing);
  rotateRigNode(scene, "Hip_L_49_50", lateralSwing);
  rotateRigNode(scene, "Shoulder_R_39_43", -lateralSwing);
  rotateRigNode(scene, "Hip_R_8_9", -lateralSwing);
  rotateRigNode(scene, "Elbow_L_30_36", -kneeBend);
  rotateRigNode(scene, "Knee_L_48_51", -kneeBend);
  rotateRigNode(scene, "Elbow_R_38_44", oppositeKneeBend);
  rotateRigNode(scene, "Knee_R_7_10", oppositeKneeBend);
}

function rotateRigNode(scene, nodeName, angle) {
  const node = scene.getObjectByName(nodeName);
  if (!node) throw new Error(`Bactrian camel rig is missing ${nodeName}`);
  node.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 0, 1),
    angle
  ));
}

function writeLoadedCamelBake({
  frames,
  outputDir,
  outputPrefix,
  generatedBy,
  creditKey,
  credit,
  modelPath,
  animation,
  durationSeconds,
  animationMethod
}) {
  const normalizedFrames = normalizeAnimatedGroundModel(frames, 1.0);
  const combinedFrames = composeLoadedAnimalFrames(normalizedFrames, camelPackSackTriangles());
  return writeGroundVehicleBake({
    combinedFrames,
    outputDir,
    outputPrefix,
    generatedBy,
    contactSheetPath: join(appRoot, "docs/ship-reference", `${outputPrefix}-walk-frames.png`),
    orientationReviewPath: join(
      appRoot,
      "docs/ship-reference",
      `${outputPrefix}-orientation-review.png`
    ),
    maxDrawPixels: loadedCamelMaxDrawPixels,
    exposure: camelCaravanColorExposure,
    lift: camelCaravanColorLift,
    manifestDetails: {
      [creditKey]: {
        ...credit,
        sourceModel: portablePath(modelPath),
        animation,
        durationSeconds,
        animationMethod,
        runtimeCaravanCount: 3,
        gameOrientation: "Y-up; travel toward +Z"
      },
      load: {
        description: "paired procedural pack sacks on each camel",
        sacksPerCamel: 2,
        runtimeSackPairs: 3
      }
    }
  });
}

function writeGroundVehicleBake({
  combinedFrames,
  outputDir,
  outputPrefix,
  generatedBy,
  contactSheetPath,
  orientationReviewPath = null,
  maxDrawPixels,
  exposure,
  lift,
  manifestDetails
}) {
  if (!Array.isArray(combinedFrames) || combinedFrames.length !== groundVehicleWalkFrameCount) {
    throw new Error(`${outputPrefix} requires ${groundVehicleWalkFrameCount} animation frames`);
  }
  const camera = makeCamera();
  const renderOptions = { collectCasters: true };
  const renderedByFrame = combinedFrames.map((triangles) => (
    Array.from({ length: headings }, (_, headingIndex) => (
      renderHeading(triangles, headingIndex, camera, renderOptions)
    ))
  ));
  const sharedBoundsByHeading = Array.from({ length: headings }, (_, headingIndex) => (
    unionAlphaBounds(renderedByFrame.map((frames) => alphaBounds(frames[headingIndex].canvas)))
  ));
  const maxWidth = Math.max(...sharedBoundsByHeading.map((bounds) => bounds.width));
  const maxHeight = Math.max(...sharedBoundsByHeading.map((bounds) => bounds.height));
  const frameScale = Math.min(maxDrawPixels / maxWidth, maxDrawPixels / maxHeight);
  const framesByAnimation = renderedByFrame.map((renderedFrames) => (
    renderedFrames.map((rendered, headingIndex) => (
      makeCenteredFrame(rendered, sharedBoundsByHeading[headingIndex], frameScale)
    ))
  ));
  const lightDirections = makeLightingDirections();
  const sheets = [];
  const files = [];
  const reviewFiles = [];
  for (let frameIndex = 0; frameIndex < groundVehicleWalkFrameCount; frameIndex++) {
    const frames = framesByAnimation[frameIndex];
    const sheet = createCanvas(frameSize * sheetCols, frameSize * Math.ceil(headings / sheetCols));
    const sheetCtx = sheet.getContext("2d");
    sheetCtx.imageSmoothingEnabled = false;
    for (let headingIndex = 0; headingIndex < headings; headingIndex++) {
      copyFrameToSheet(frames[headingIndex], sheetCtx, headingIndex);
    }
    shadeEdgesAndQuantizeToResurrect(sheet, {
      shadeEdges: false,
      exposure,
      lift
    });
    const selfShadowMaps = makeSelfShadowMaps(frames, lightDirections, camera);
    const lightMask = makeLightingMaskSheet(frames, lightDirections, "light", selfShadowMaps);
    const shadeMask = makeLightingMaskSheet(frames, lightDirections, "shade", selfShadowMaps);
    const shadowMask = makeShadowMaskSheet(frames, lightDirections, camera, 0);
    const lightingPreview = makeLightingPreview(sheet, lightMask, shadeMask, shadowMask);
    const prefix = `${outputPrefix}-walk-${frameIndex}-${SHIP_SPRITE_HEADING_SUFFIX}`;
    const filePath = join(outputDir, `${prefix}.png`);
    const lightPath = join(outputDir, `${prefix}-light.png`);
    const shadePath = join(outputDir, `${prefix}-shade.png`);
    const shadowPath = join(outputDir, `${prefix}-shadow.png`);
    const lightingPreviewPath = join(appRoot, "docs/ship-reference", `${prefix}-lighting-preview.png`);
    writeFileSync(filePath, sheet.toBuffer("image/png"));
    writeFileSync(lightPath, lightMask.toBuffer("image/png"));
    writeFileSync(shadePath, shadeMask.toBuffer("image/png"));
    writeFileSync(shadowPath, shadowMask.toBuffer("image/png"));
    writeFileSync(lightingPreviewPath, lightingPreview.toBuffer("image/png"));
    sheets.push(sheet);
    files.push(
      portablePath(filePath),
      portablePath(lightPath),
      portablePath(shadePath),
      portablePath(shadowPath)
    );
    reviewFiles.push(portablePath(lightingPreviewPath));
  }
  const contactSheet = makeRowingAnimationContactSheet(sheets, 6, 0);
  writeFileSync(contactSheetPath, contactSheet.toBuffer("image/png"));
  if (orientationReviewPath) {
    writeShipOrientationReview(sheets[0], {
      label: outputPrefix,
      outputPath: orientationReviewPath
    });
    reviewFiles.push(portablePath(orientationReviewPath));
  }
  const manifestPath = join(outputDir, "manifest.json");
  writeFileSync(manifestPath, `${JSON.stringify({
    generatedBy,
    frameSize,
    headings,
    sheetCols,
    animationFrames: groundVehicleWalkFrameCount,
    maxDrawPixels,
    frameScale: Number(frameScale.toFixed(4)),
    colorGrade: {
      exposure,
      lift
    },
    lighting: {
      azimuthBins: lightAzimuthBins,
      elevationBins: lightElevationBins,
      shadowFrameSize,
      selfShadowed: true,
      groundY: 0
    },
    ...manifestDetails,
    files,
    reviewFiles
  }, null, 2)}\n`);
  console.log(manifestPath);
  console.log(contactSheetPath);
}

function requiredSingleWalkClip(animations, label) {
  if (!Array.isArray(animations) || animations.length === 0) {
    throw new Error(`${label} source model contains no animation clips`);
  }
  const clips = animations.filter((clip) => Number.isFinite(clip.duration) && clip.duration > 0.5);
  if (clips.length !== 1) {
    throw new Error(`${label} source must contain exactly one moving clip, found ${clips.length}`);
  }
  return clips[0];
}

function horseWalkClip(animations) {
  return requiredSingleWalkClip(animations, "Horse");
}

function updateAnimatedScene(scene) {
  scene.updateMatrixWorld(true);
  scene.traverse((node) => {
    if (node.isSkinnedMesh) node.skeleton.update();
  });
  scene.updateMatrixWorld(true);
}

function horseForwardQuaternion(scene) {
  const head = scene.getObjectByName("head0_040");
  const tail = scene.getObjectByName("tail0_017");
  if (!head || !tail) throw new Error("Horse rig is missing its head or tail landmark bone");
  const headPosition = head.getWorldPosition(new THREE.Vector3());
  const tailPosition = tail.getWorldPosition(new THREE.Vector3());
  const forward = headPosition.sub(tailPosition);
  forward.y = 0;
  if (forward.lengthSq() <= 1e-8) throw new Error("Horse rig cannot resolve a forward direction");
  forward.normalize();
  return new THREE.Quaternion().setFromUnitVectors(forward, new THREE.Vector3(0, 0, 1));
}

function llamaForwardQuaternion(scene) {
  const head = scene.getObjectByName("CATRigHead_013");
  const tail = scene.getObjectByName("CATRigTail1_033");
  if (!head || !tail) throw new Error("Llama rig is missing its head or true tail landmark bone");
  const headPosition = head.getWorldPosition(new THREE.Vector3());
  const tailPosition = tail.getWorldPosition(new THREE.Vector3());
  const forward = headPosition.sub(tailPosition);
  forward.y = 0;
  if (forward.lengthSq() <= 1e-8) throw new Error("Llama rig cannot resolve a forward direction");
  forward.normalize();
  if (forward.z < 0.8) {
    throw new Error(`Llama source orientation changed; expected scene +Z forward, got ${forward.toArray()}`);
  }
  return new THREE.Quaternion().setFromUnitVectors(forward, new THREE.Vector3(0, 0, 1));
}

function normalizeAnimatedGroundModel(frames, targetMaxDim) {
  if (!Array.isArray(frames) || frames.length !== groundVehicleWalkFrameCount) {
    throw new Error(`Ground-vehicle walk requires ${groundVehicleWalkFrameCount} geometry frames`);
  }
  const allPoints = frames.flatMap((triangles) => triangles.flatMap((triangle) => triangle.points));
  const bounds = boundsForPoints(allPoints);
  return frames.map((triangles) => normalizeGroundTriangles(triangles, bounds, targetMaxDim));
}

function normalizeGroundModel(triangles, targetMaxDim) {
  return normalizeGroundTriangles(triangles, boundsForPoints(
    triangles.flatMap((triangle) => triangle.points)
  ), targetMaxDim);
}

function normalizeGroundTriangles(triangles, bounds, targetMaxDim) {
  if (!Number.isFinite(targetMaxDim) || targetMaxDim <= 0) {
    throw new Error(`Invalid ground-model target dimension: ${targetMaxDim}`);
  }
  const scale = targetMaxDim / bounds.maxDim;
  return triangles.map((triangle) => ({
    ...triangle,
    points: triangle.points.map((point) => new THREE.Vector3(
      (point.x - bounds.center.x) * scale,
      (point.y - bounds.box.min.y) * scale,
      (point.z - bounds.center.z) * scale
    ))
  }));
}

function composeHorseAndCart(horseFrames, cartTriangles) {
  const cartBounds = boundsForPoints(cartTriangles.flatMap((triangle) => triangle.points));
  return horseFrames.map((horseTriangles) => {
    const horseBounds = boundsForPoints(horseTriangles.flatMap((triangle) => triangle.points));
    const overlap = 0.24;
    const cartOffsetZ = horseBounds.box.min.z - cartBounds.box.max.z + overlap;
    const combined = [
      ...horseTriangles,
      ...translatedTriangles(cartTriangles, 0, 0, cartOffsetZ)
    ];
    const bounds = boundsForPoints(combined.flatMap((triangle) => triangle.points));
    return translatedTriangles(combined, -bounds.center.x, -bounds.box.min.y, -bounds.center.z);
  });
}

function composeLoadedLlamaFrames(llamaFrames) {
  return composeLoadedAnimalFrames(llamaFrames, llamaPackSackTriangles());
}

function composeLoadedAnimalFrames(animalFrames, loadTriangles) {
  return animalFrames.map((animalTriangles) => {
    const combined = [...animalTriangles, ...loadTriangles];
    const bounds = boundsForPoints(combined.flatMap((triangle) => triangle.points));
    return translatedTriangles(combined, -bounds.center.x, -bounds.box.min.y, -bounds.center.z);
  });
}

function llamaPackSackTriangles() {
  const sackColor = { r: 187, g: 132, b: 82 };
  const tieColor = { r: 95, g: 70, b: 50 };
  return [
    ...cuboidTriangles(-0.13, 0.49, -0.02, 0.17, 0.18, 0.22, sackColor),
    ...cuboidTriangles(0.13, 0.49, -0.02, 0.17, 0.18, 0.22, sackColor),
    ...cuboidTriangles(0, 0.55, -0.02, 0.31, 0.035, 0.08, tieColor)
  ];
}

function camelPackSackTriangles() {
  const sackColor = { r: 187, g: 132, b: 82 };
  const tieColor = { r: 95, g: 70, b: 50 };
  return [
    ...cuboidTriangles(-0.14, 0.49, -0.015, 0.18, 0.18, 0.24, sackColor),
    ...cuboidTriangles(0.14, 0.49, -0.015, 0.18, 0.18, 0.24, sackColor),
    ...cuboidTriangles(0, 0.57, -0.015, 0.33, 0.035, 0.09, tieColor)
  ];
}

function cuboidTriangles(cx, cy, cz, width, height, depth, color) {
  const x = width / 2;
  const y = height / 2;
  const z = depth / 2;
  const points = [
    new THREE.Vector3(cx - x, cy - y, cz - z),
    new THREE.Vector3(cx + x, cy - y, cz - z),
    new THREE.Vector3(cx + x, cy + y, cz - z),
    new THREE.Vector3(cx - x, cy + y, cz - z),
    new THREE.Vector3(cx - x, cy - y, cz + z),
    new THREE.Vector3(cx + x, cy - y, cz + z),
    new THREE.Vector3(cx + x, cy + y, cz + z),
    new THREE.Vector3(cx - x, cy + y, cz + z)
  ];
  const faces = [
    [0, 2, 1], [0, 3, 2], [4, 5, 6], [4, 6, 7],
    [0, 1, 5], [0, 5, 4], [3, 7, 6], [3, 6, 2],
    [0, 4, 7], [0, 7, 3], [1, 2, 6], [1, 6, 5]
  ];
  return faces.map((face) => ({
    points: face.map((index) => points[index].clone()),
    uvs: null,
    color,
    textureSampler: null,
    sourceMeshName: "procedural-llama-pack-sack"
  }));
}

function staticTrianglesForConfig(hullTriangles, waterlineY, config) {
  if (!config.staticTrianglesForHull) return hullTriangles;
  const triangles = config.staticTrianglesForHull(hullTriangles, waterlineY);
  if (!Array.isArray(triangles) || triangles.length <= hullTriangles.length) {
    throw new Error(`${config.slug} static ship geometry added no triangles`);
  }
  return triangles;
}

function javaneseJongTriangles(hullTriangles, waterlineY) {
  const points = hullTriangles.flatMap((triangle) => triangle.points);
  const bounds = boundsForPoints(points);
  const height = bounds.size.y;
  const lowerHullPoints = points.filter((point) => (
    point.y <= waterlineY + height * 0.18
  ));
  if (lowerHullPoints.length === 0) {
    throw new Error("Javanese jong has no lower hull points for its quarter rudders");
  }
  const lowerHullBounds = boundsForPoints(lowerHullPoints);
  const halfBeam = lowerHullBounds.size.x / 2;
  const length = lowerHullBounds.size.z;
  const sternZ = lowerHullBounds.box.min.z;
  const shaftColor = { r: 91, g: 64, b: 50 };
  const bladeColor = { r: 128, g: 91, b: 63 };
  const shaftRadius = bounds.maxDim * 0.008;
  const bladeRadius = bounds.maxDim * 0.019;
  const rudders = [];

  for (const side of [-1, 1]) {
    const desiredPivot = new THREE.Vector3(
      side * halfBeam * 0.58,
      waterlineY + height * 0.06,
      sternZ + length * 0.08
    );
    const attachmentCandidates = lowerHullPoints.filter((point) => (
      Math.sign(point.x) === side &&
      point.z <= sternZ + length * 0.24 &&
      point.y >= waterlineY - height * 0.08
    ));
    if (attachmentCandidates.length === 0) {
      throw new Error(`Javanese jong has no stern attachment point for rudder ${side}`);
    }
    const pivot = attachmentCandidates.reduce((nearest, point) => (
      point.distanceToSquared(desiredPivot) < nearest.distanceToSquared(desiredPivot)
        ? point
        : nearest
    )).clone();
    const shaftEnd = new THREE.Vector3(
      side * halfBeam * 0.69,
      waterlineY - height * 0.015,
      sternZ + length * 0.025
    );
    const bladeEnd = new THREE.Vector3(
      side * halfBeam * 0.72,
      waterlineY - height * 0.04,
      sternZ + length * 0.005
    );
    rudders.push(...makePrismTriangles(
      pivot,
      shaftEnd,
      shaftRadius,
      shaftColor,
      5,
      `javanese-jong-rudder-${side}`
    ));
    rudders.push(...makePrismTriangles(
      shaftEnd,
      bladeEnd,
      bladeRadius,
      bladeColor,
      4,
      `javanese-jong-rudder-blade-${side}`
    ));
  }
  return [...hullTriangles, ...rudders];
}

function translatedTriangles(triangles, x, y, z) {
  return triangles.map((triangle) => ({
    ...triangle,
    points: triangle.points.map((point) => point.clone().add(new THREE.Vector3(x, y, z)))
  }));
}

function unionAlphaBounds(boundsList) {
  if (!Array.isArray(boundsList) || boundsList.length === 0) {
    throw new Error("Cannot union an empty set of raster bounds");
  }
  const minX = Math.min(...boundsList.map((bounds) => bounds.minX));
  const minY = Math.min(...boundsList.map((bounds) => bounds.minY));
  const maxX = Math.max(...boundsList.map((bounds) => bounds.minX + bounds.width - 1));
  const maxY = Math.max(...boundsList.map((bounds) => bounds.minY + bounds.height - 1));
  return { minX, minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

async function renderShipSideView(config) {
  const { canvas: sideView } = await renderShipSideViewCanvas(config, {
    camera: makeSideViewCamera()
  });
  const outputPath = join(unityFleetSideViewOutputRoot, `${config.slug}.png`);
  writeFileSync(outputPath, sideView.toBuffer("image/png"));
  return {
    slug: config.slug,
    label: config.label,
    sourceModel: portablePath(config.modelPath),
    sourceMaxDim: Number(config.sourceMaxDim.toFixed(4)),
    targetModelMaxDim: Number((config.sideViewTargetModelMaxDim ?? config.targetModelMaxDim).toFixed(4)),
    width: sideViewWidth,
    height: sideViewHeight,
    palette: "Resurrect 64",
    file: portablePath(outputPath),
    ...(config.creator ? { creator: config.creator } : {}),
    ...(config.license ? { license: config.license } : {}),
    ...(config.sourceTitle ? { sourceTitle: config.sourceTitle } : {})
  };
}

async function renderShipSideViewCanvas(config, { camera, waterlineY, modelYaw } = {}) {
  if (!camera) throw new Error(`Ship side view requires a camera: ${config.slug}`);
  const loaded = await loadConfiguredShipTriangles(config, {
    targetMaxDim: config.sideViewTargetModelMaxDim ?? config.targetModelMaxDim,
    waterlineY
  });
  const { triangles, textureSampler, waterlineY: resolvedWaterlineY } = loaded;
  const renderViewport = {
    width: sideViewWidth * sideViewRenderScale,
    height: sideViewHeight * sideViewRenderScale
  };
  const rendered = renderHeading(triangles, config.sideViewHeading ?? 0, camera, {
    textureSampler,
    colorTransform: config.colorTransform,
    waterlineY: resolvedWaterlineY,
    modelYaw
  }, renderViewport);
  alphaBounds(rendered.canvas);

  const sideView = createCanvas(sideViewWidth, sideViewHeight);
  const ctx = sideView.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, sideViewWidth, sideViewHeight);
  ctx.drawImage(rendered.canvas, 0, 0, sideViewWidth, sideViewHeight);
  shadeEdgesAndQuantizeToResurrect(sideView);
  const finalBounds = alphaBounds(sideView);
  if (
    finalBounds.minX <= 0 ||
    finalBounds.minY <= 0 ||
    finalBounds.minX + finalBounds.width >= sideViewWidth ||
    finalBounds.minY + finalBounds.height >= sideViewHeight
  ) {
    throw new Error(`Ship side view clips its ${sideViewWidth}x${sideViewHeight} frame: ${config.slug}`);
  }
  return { canvas: sideView, waterlineY: resolvedWaterlineY };
}

async function loadConfiguredShipTriangles(config, {
  targetMaxDim,
  waterlineY,
  includeAnimation = true,
  gltfTextureSamplerOptions = config.gltfTextureSamplerOptions
} = {}) {
  const scene = await loadScene(config.modelPath);
  const textureSampler = config.texturePath ? await loadTextureSampler(config.texturePath) : null;
  const materialTextureSamplers = await loadGltfMaterialTextureSamplers(
    config.modelPath,
    gltfTextureSamplerOptions
  );
  const model = collectTriangles(scene, {
    targetMaxDim: targetMaxDim ?? config.targetModelMaxDim,
    materialTextureSamplers,
    ...config.collectOptions
  });
  const resolvedWaterlineY = waterlineY ?? estimateWaterlineForConfig(model.triangles, config).y;
  const staticTriangles = staticTrianglesForConfig(model.triangles, resolvedWaterlineY, config);
  const triangles = includeAnimation && config.animationTrianglesForFrame
    ? config.animationTrianglesForFrame(staticTriangles, 0, resolvedWaterlineY)
    : staticTriangles;
  return { triangles, textureSampler, waterlineY: resolvedWaterlineY };
}

const PORT_ASSAULT_SHIP_WIDTH = 320;
const PORT_ASSAULT_SHIP_HEIGHT = 160;
const PORT_ASSAULT_RENDER_SCALE = 3;
const PORT_ASSAULT_FLEET_SCALE_SAFETY = 0.75;
const PORT_ASSAULT_VARIANTS = Object.freeze([
  Object.freeze({ id: "restrained", broadsideOffsetDegrees: 55, cameraElevationDegrees: 20 }),
  Object.freeze({ id: "moderate", broadsideOffsetDegrees: 65, cameraElevationDegrees: 25 }),
  Object.freeze({
    id: "production",
    broadsideOffsetDegrees: 72.5,
    cameraElevationDegrees: 30,
    selected: true
  }),
  Object.freeze({ id: "steep", broadsideOffsetDegrees: 75, cameraElevationDegrees: 32.5 })
]);

function makePortAssaultCamera(elevationDegrees) {
  if (!Number.isFinite(elevationDegrees) || elevationDegrees <= 0 || elevationDegrees >= 45) {
    throw new Error(`Invalid port-assault camera elevation: ${elevationDegrees}`);
  }
  const extentY = 1.6;
  const extentX = extentY * PORT_ASSAULT_SHIP_WIDTH / PORT_ASSAULT_SHIP_HEIGHT;
  const camera = new THREE.OrthographicCamera(-extentX, extentX, extentY, -extentY, 0.01, 30);
  const angle = elevationDegrees * Math.PI / 180;
  const distance = 8;
  camera.position.set(0, Math.sin(angle) * distance, Math.cos(angle) * distance);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  camera.updateProjectionMatrix();
  return camera;
}

function portAssaultModelYaw(broadsideOffsetDegrees) {
  if (
    !Number.isFinite(broadsideOffsetDegrees) ||
    broadsideOffsetDegrees < 0 ||
    broadsideOffsetDegrees >= 90
  ) {
    throw new Error(`Invalid port-assault broadside offset: ${broadsideOffsetDegrees}`);
  }
  const angle = broadsideOffsetDegrees * Math.PI / 180;
  // Pure broadside with the bow to screen-right is +90 degrees. Rotate the
  // bow away from the elevated camera to expose the port deck edge.
  return Math.PI / 2 + angle;
}

function portAssaultRasterScale(rendered) {
  const sourceBounds = alphaBounds(rendered.canvas);
  const padding = { x: 6, top: 4, bottom: 5 };
  return Math.min(
    (PORT_ASSAULT_SHIP_WIDTH - padding.x * 2) / sourceBounds.width,
    (PORT_ASSAULT_SHIP_HEIGHT - padding.top - padding.bottom) / sourceBounds.height
  );
}

function fitPortAssaultRaster(rendered, scale = portAssaultRasterScale(rendered)) {
  if (!Number.isFinite(scale) || scale <= 0) {
    throw new Error(`Invalid port-assault raster scale: ${scale}`);
  }
  const sourceBounds = alphaBounds(rendered.canvas);
  const padding = { x: 6, top: 4, bottom: 5 };
  const drawWidth = Math.max(1, Math.round(sourceBounds.width * scale));
  const drawHeight = Math.max(1, Math.round(sourceBounds.height * scale));
  const drawX = Math.floor((PORT_ASSAULT_SHIP_WIDTH - drawWidth) / 2);
  const drawY = PORT_ASSAULT_SHIP_HEIGHT - padding.bottom - drawHeight;
  const canvas = createCanvas(PORT_ASSAULT_SHIP_WIDTH, PORT_ASSAULT_SHIP_HEIGHT);
  const ctx = canvas.getContext("2d");
  const sourceCtx = rendered.canvas.getContext("2d");
  const sourceImage = sourceCtx.getImageData(0, 0, rendered.canvas.width, rendered.canvas.height);
  const image = ctx.createImageData(canvas.width, canvas.height);
  const depth = new Float32Array(canvas.width * canvas.height);
  const positions = new Float32Array(canvas.width * canvas.height * 3);
  const alpha = new Uint8Array(canvas.width * canvas.height);
  depth.fill(-Infinity);
  const sourceSamples = hardEdgeSampleMap({
    rgba: sourceImage.data,
    sourceWidth: rendered.canvas.width,
    sourceHeight: rendered.canvas.height,
    sourceFeatures: rendered.features,
    bounds: sourceBounds,
    targetWidth: drawWidth,
    targetHeight: drawHeight
  });
  for (let dy = 0; dy < drawHeight; dy++) {
    for (let dx = 0; dx < drawWidth; dx++) {
      const sourceIndex = sourceSamples[dx + dy * drawWidth];
      if (sourceIndex < 0) continue;
      const targetX = drawX + dx;
      const targetY = drawY + dy;
      const targetIndex = targetX + targetY * canvas.width;
      const sourceOffset = sourceIndex * 4;
      const targetOffset = targetIndex * 4;
      image.data[targetOffset] = sourceImage.data[sourceOffset];
      image.data[targetOffset + 1] = sourceImage.data[sourceOffset + 1];
      image.data[targetOffset + 2] = sourceImage.data[sourceOffset + 2];
      image.data[targetOffset + 3] = 255;
      depth[targetIndex] = rendered.depth[sourceIndex];
      alpha[targetIndex] = 1;
      const sourcePositionOffset = sourceIndex * 3;
      const targetPositionOffset = targetIndex * 3;
      positions[targetPositionOffset] = rendered.positions[sourcePositionOffset];
      positions[targetPositionOffset + 1] = rendered.positions[sourcePositionOffset + 1];
      positions[targetPositionOffset + 2] = rendered.positions[sourcePositionOffset + 2];
    }
  }
  ctx.putImageData(image, 0, 0);
  shadeEdgesAndQuantizeToResurrect(canvas);
  const bounds = alphaBounds(canvas);
  if (
    bounds.minX <= 0 ||
    bounds.minY <= 0 ||
    bounds.minX + bounds.width >= canvas.width ||
    bounds.minY + bounds.height >= canvas.height
  ) {
    throw new Error("Port-assault ship raster clips its production frame");
  }
  return {
    canvas,
    bounds,
    depth,
    positions,
    alpha,
    sourceBounds,
    drawX,
    drawY,
    drawWidth,
    drawHeight
  };
}

function portAssaultFramePoint(modelPoint, camera, modelYaw, frame) {
  const rotation = new THREE.Matrix4().makeRotationY(modelYaw);
  const worldPoint = modelPoint.clone().applyMatrix4(rotation);
  const projected = projectedPoint(worldPoint, camera, {
    width: PORT_ASSAULT_SHIP_WIDTH * PORT_ASSAULT_RENDER_SCALE,
    height: PORT_ASSAULT_SHIP_HEIGHT * PORT_ASSAULT_RENDER_SCALE
  });
  return {
    x: Math.round(frame.drawX + (
      (projected.x - frame.sourceBounds.minX) / frame.sourceBounds.width * frame.drawWidth
    )),
    y: Math.round(frame.drawY + (
      (projected.y - frame.sourceBounds.minY) / frame.sourceBounds.height * frame.drawHeight
    )),
    depth: projected.z
  };
}

function makePortAssaultDepthMap(frame) {
  const opaqueDepths = [];
  for (let index = 0; index < frame.depth.length; index++) {
    if (frame.alpha[index]) opaqueDepths.push(frame.depth[index]);
  }
  if (opaqueDepths.length === 0) throw new Error("Port-assault depth map requires opaque pixels");
  const farDepth = Math.min(...opaqueDepths);
  const nearDepth = Math.max(...opaqueDepths);
  const range = nearDepth - farDepth;
  if (!Number.isFinite(range) || range <= 0) {
    throw new Error("Port-assault depth map has no usable view-depth range");
  }
  const canvas = createCanvas(PORT_ASSAULT_SHIP_WIDTH, PORT_ASSAULT_SHIP_HEIGHT);
  const ctx = canvas.getContext("2d");
  const image = ctx.createImageData(canvas.width, canvas.height);
  for (let index = 0; index < frame.depth.length; index++) {
    if (!frame.alpha[index]) continue;
    const value = 1 + Math.round((frame.depth[index] - farDepth) / range * 254);
    const offset = index * 4;
    image.data[offset] = value;
    image.data[offset + 1] = value;
    image.data[offset + 2] = value;
    image.data[offset + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  return { canvas, farDepth, nearDepth };
}

function makePortAssaultForeground(frame, sailorDepth) {
  if (!Number.isFinite(sailorDepth)) throw new Error("Port-assault sailor depth must be finite");
  const sourceCtx = frame.canvas.getContext("2d");
  const source = sourceCtx.getImageData(0, 0, frame.canvas.width, frame.canvas.height);
  const canvas = createCanvas(frame.canvas.width, frame.canvas.height);
  const ctx = canvas.getContext("2d");
  const image = ctx.createImageData(canvas.width, canvas.height);
  let opaquePixels = 0;
  for (let index = 0; index < frame.depth.length; index++) {
    if (!frame.alpha[index] || frame.depth[index] <= sailorDepth + 0.002) continue;
    const offset = index * 4;
    image.data[offset] = source.data[offset];
    image.data[offset + 1] = source.data[offset + 1];
    image.data[offset + 2] = source.data[offset + 2];
    image.data[offset + 3] = 255;
    opaquePixels++;
  }
  if (opaquePixels === 0) throw new Error("Port-assault foreground occlusion layer is blank");
  ctx.putImageData(image, 0, 0);
  return { canvas, opaquePixels };
}

function portAssaultDeckCompositing(loaded, selected) {
  const points = loaded.triangles.flatMap((triangle) => triangle.points);
  const bounds = boundsForPoints(points);
  const deckY = loaded.waterlineY + bounds.size.y * 0.14;
  const centerX = bounds.center.x;
  const centerZ = bounds.center.z;
  const farX = centerX + bounds.size.x * 0.12;
  const nearX = centerX - bounds.size.x * 0.24;
  const forwardZ = centerZ + bounds.size.z * 0.2;
  const aftZ = centerZ - bounds.size.z * 0.28;
  const modelDeckPolygon = [
    new THREE.Vector3(farX, deckY, forwardZ),
    new THREE.Vector3(farX, deckY, aftZ),
    new THREE.Vector3(nearX, deckY, aftZ),
    new THREE.Vector3(nearX, deckY, forwardZ)
  ];
  const deckPolygon = modelDeckPolygon.map((point) => {
    const projected = portAssaultFramePoint(
      point,
      selected.camera,
      selected.modelYaw,
      selected
    );
    return { x: projected.x, y: projected.y };
  });
  const deckEntry = portAssaultFramePoint(
    new THREE.Vector3(
      centerX - bounds.size.x * 0.18,
      deckY,
      centerZ + bounds.size.z * 0.18
    ),
    selected.camera,
    selected.modelYaw,
    selected
  );
  const jumpPoint = portAssaultFramePoint(
    new THREE.Vector3(
      centerX - bounds.size.x * 0.38,
      deckY - bounds.size.y * 0.05,
      centerZ + bounds.size.z * 0.3
    ),
    selected.camera,
    selected.modelYaw,
    selected
  );
  const visibleDepths = [];
  for (let index = 0; index < selected.depth.length; index++) {
    if (selected.alpha[index]) visibleDepths.push(selected.depth[index]);
  }
  if (visibleDepths.length === 0) throw new Error("Port-assault deck has no visible ship depth");
  visibleDepths.sort((a, b) => a - b);
  const depthAtQuantile = (quantile) => visibleDepths[Math.min(
    visibleDepths.length - 1,
    Math.floor(visibleDepths.length * quantile)
  )];
  const sailorDepth = clamp(
    deckEntry.depth,
    depthAtQuantile(0.15),
    depthAtQuantile(0.85)
  );
  return {
    deckY,
    deckPolygon,
    deckEntryAnchor: { x: deckEntry.x, y: deckEntry.y },
    sailorSpawnAnchor: { x: jumpPoint.x, y: jumpPoint.y },
    sailorDepth
  };
}

function makePortAssaultCompositingReview({ selected, foreground, depthMap, deck }) {
  const displayScale = 2;
  const labelHeight = 42;
  const cellWidth = PORT_ASSAULT_SHIP_WIDTH * displayScale;
  const cellHeight = PORT_ASSAULT_SHIP_HEIGHT * displayScale + labelHeight;
  const sheet = createCanvas(cellWidth * 3, cellHeight);
  const ctx = sheet.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#172038";
  ctx.fillRect(0, 0, sheet.width, sheet.height);
  ctx.font = "bold 18px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const panels = [
    { label: "DECK + ANCHORS", canvas: selected.canvas },
    { label: "FOREGROUND OCCLUSION", canvas: foreground.canvas },
    { label: "DEPTH  FAR (DARK) -> NEAR (LIGHT)", canvas: depthMap.canvas }
  ];
  panels.forEach((panel, index) => {
    const x = index * cellWidth;
    ctx.strokeStyle = "#566c86";
    ctx.strokeRect(x + 0.5, 0.5, cellWidth - 1, cellHeight - 1);
    ctx.fillStyle = "#f4f4f4";
    ctx.fillText(panel.label, x + cellWidth / 2, labelHeight / 2);
    ctx.drawImage(
      panel.canvas,
      x,
      labelHeight,
      PORT_ASSAULT_SHIP_WIDTH * displayScale,
      PORT_ASSAULT_SHIP_HEIGHT * displayScale
    );
  });
  ctx.save();
  ctx.translate(0, labelHeight);
  ctx.scale(displayScale, displayScale);
  ctx.strokeStyle = "#f7d038";
  ctx.lineWidth = 1;
  ctx.beginPath();
  deck.deckPolygon.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.closePath();
  ctx.stroke();
  for (const [point, color] of [
    [deck.deckEntryAnchor, "#73eff7"],
    [deck.sailorSpawnAnchor, "#e83b3b"]
  ]) {
    ctx.fillStyle = color;
    ctx.fillRect(point.x - 2, point.y - 2, 5, 5);
  }
  ctx.restore();
  return sheet;
}

function makePortAssaultContactSheet(renderedVariants) {
  const displayScale = 2;
  const labelHeight = 46;
  const cellWidth = PORT_ASSAULT_SHIP_WIDTH * displayScale;
  const cellHeight = PORT_ASSAULT_SHIP_HEIGHT * displayScale + labelHeight;
  const sheet = createCanvas(cellWidth * 2, cellHeight * 2);
  const ctx = sheet.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#172038";
  ctx.fillRect(0, 0, sheet.width, sheet.height);
  ctx.font = "bold 19px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  renderedVariants.forEach(({ variant, canvas }, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = col * cellWidth;
    const y = row * cellHeight;
    ctx.strokeStyle = variant.selected ? "#f7d038" : "#566c86";
    ctx.lineWidth = variant.selected ? 4 : 1;
    ctx.strokeRect(x + 2, y + 2, cellWidth - 4, cellHeight - 4);
    ctx.fillStyle = variant.selected ? "#f7d038" : "#f4f4f4";
    const suffix = variant.selected ? "  SELECTED" : "";
    ctx.fillText(
      `${variant.broadsideOffsetDegrees}deg broadside / ${variant.cameraElevationDegrees}deg high${suffix}`,
      x + cellWidth / 2,
      y + labelHeight / 2
    );
    ctx.drawImage(
      canvas,
      0,
      0,
      PORT_ASSAULT_SHIP_WIDTH,
      PORT_ASSAULT_SHIP_HEIGHT,
      x,
      y + labelHeight,
      PORT_ASSAULT_SHIP_WIDTH * displayScale,
      PORT_ASSAULT_SHIP_HEIGHT * displayScale
    );
  });
  return sheet;
}

function makePortAssaultFleetContactSheet(renderedShips) {
  if (!Array.isArray(renderedShips) || renderedShips.length === 0) {
    throw new Error("Port-assault fleet contact sheet requires ships");
  }
  const columns = 4;
  const labelHeight = 28;
  const rows = Math.ceil(renderedShips.length / columns);
  const sheet = createCanvas(
    columns * PORT_ASSAULT_SHIP_WIDTH,
    rows * (PORT_ASSAULT_SHIP_HEIGHT + labelHeight)
  );
  const ctx = sheet.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#172038";
  ctx.fillRect(0, 0, sheet.width, sheet.height);
  ctx.font = "bold 14px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  renderedShips.forEach(({ slug, canvas }, index) => {
    const x = index % columns * PORT_ASSAULT_SHIP_WIDTH;
    const y = Math.floor(index / columns) * (PORT_ASSAULT_SHIP_HEIGHT + labelHeight);
    ctx.strokeStyle = "#566c86";
    ctx.strokeRect(
      x + 0.5,
      y + 0.5,
      PORT_ASSAULT_SHIP_WIDTH - 1,
      PORT_ASSAULT_SHIP_HEIGHT + labelHeight - 1
    );
    ctx.fillStyle = "#f4f4f4";
    ctx.fillText(slug, x + PORT_ASSAULT_SHIP_WIDTH / 2, y + labelHeight / 2);
    ctx.drawImage(canvas, x, y + labelHeight);
  });
  return sheet;
}

function portAssaultTargetModelMaxDim(productionEntry, galleonProductionEntry) {
  for (const [label, value] of Object.entries({
    targetModelMaxDim: productionEntry?.targetModelMaxDim,
    frameScale: productionEntry?.frameScale,
    galleonFrameScale: galleonProductionEntry?.frameScale
  })) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`Invalid port-assault production ${label}: ${value}`);
    }
  }
  return productionEntry.targetModelMaxDim *
    productionEntry.frameScale / galleonProductionEntry.frameScale;
}

async function loadPortAssaultShip(config, targetModelMaxDim) {
  return loadConfiguredShipTriangles(config, {
    targetMaxDim: targetModelMaxDim,
    includeAnimation: false,
    gltfTextureSamplerOptions: {
      ...config.gltfTextureSamplerOptions,
      maxDimension: 64
    }
  });
}

function renderPortAssaultVariant(loaded, config, variant) {
  const renderViewport = {
    width: PORT_ASSAULT_SHIP_WIDTH * PORT_ASSAULT_RENDER_SCALE,
    height: PORT_ASSAULT_SHIP_HEIGHT * PORT_ASSAULT_RENDER_SCALE
  };
  const camera = makePortAssaultCamera(variant.cameraElevationDegrees);
  const modelYaw = portAssaultModelYaw(variant.broadsideOffsetDegrees);
  const rendered = renderHeading(loaded.triangles, 0, camera, {
    textureSampler: loaded.textureSampler,
    colorTransform: config.colorTransform,
    waterlineY: loaded.waterlineY,
    modelYaw,
    collectCasters: false
  }, renderViewport);
  return { variant, camera, modelYaw, rendered };
}

function resetPortAssaultShipOutput() {
  const relativeOutput = portablePath(portAssaultShipOutputRoot);
  if (relativeOutput !== "apps/pixel-globe/public/assets/vehicles/unity-ships/port-assault") {
    throw new Error(`Refusing to clear unexpected port-assault output: ${portAssaultShipOutputRoot}`);
  }
  rmSync(portAssaultShipOutputRoot, { recursive: true, force: true });
  mkdirSync(portAssaultShipOutputRoot, { recursive: true });
  mkdirSync(portAssaultShipReferenceOutputRoot, { recursive: true });
  for (const fileName of [
    "galleon-dockside-contact-sheet.png",
    "galleon-dockside-compositing-review.png",
    "fleet-dockside-contact-sheet.png"
  ]) {
    rmSync(join(portAssaultShipReferenceOutputRoot, fileName), { force: true });
  }
}

function writePortAssaultGeometryModule(ships) {
  const geometry = Object.fromEntries(ships.map((ship) => [ship.slug, {
    deckPolygon: ship.deckPolygon,
    deckEntryAnchor: ship.deckEntryAnchor,
    sailorSpawnAnchor: ship.sailorSpawnAnchor
  }]));
  writeFileSync(
    portAssaultShipGeometryOutputPath,
    `// Generated by tools/render-sail-ship-sprites.mjs --port-assault-ships.\n` +
      "// Regenerate the fleet bake instead of editing these coordinates.\n" +
      `export const PORT_ASSAULT_SHIP_GEOMETRY = ${JSON.stringify(geometry, null, 2)};\n`
  );
}

async function renderPortAssaultShips() {
  const configs = productionShipRenderConfigs();
  const productionManifest = JSON.parse(
    readFileSync(join(unityFleetOutputRoot, "manifest.json"), "utf8")
  );
  const productionBySlug = uniqueShipEntriesBySlug(
    productionManifest.ships,
    "production ship manifest"
  );
  const rosterSlugs = SHIP_STATS.map((entry) => entry.slug);
  if (
    JSON.stringify([...productionBySlug.keys()].sort()) !==
      JSON.stringify([...rosterSlugs].sort()) ||
    JSON.stringify([...configs.keys()].sort()) !== JSON.stringify([...rosterSlugs].sort())
  ) {
    throw new Error("Port-assault fleet must exactly match the production ship roster");
  }
  const productionVariant = PORT_ASSAULT_VARIANTS.find((variant) => variant.selected);
  if (!productionVariant) throw new Error("Port-assault fleet has no selected production view");
  const galleonConfig = configs.get("galleon");
  const galleonProduction = productionBySlug.get("galleon");
  const galleonTargetModelMaxDim = portAssaultTargetModelMaxDim(
    galleonProduction,
    galleonProduction
  );
  const galleonLoaded = await loadPortAssaultShip(galleonConfig, galleonTargetModelMaxDim);
  const galleonRawVariants = PORT_ASSAULT_VARIANTS.map((variant) => (
    renderPortAssaultVariant(galleonLoaded, galleonConfig, variant)
  ));
  const galleonSelectedRaw = galleonRawVariants.find(({ variant }) => variant.selected);
  if (!galleonSelectedRaw) throw new Error("Galleon camera review has no production view");
  const fleetRasterScale = portAssaultRasterScale(galleonSelectedRaw.rendered) *
    PORT_ASSAULT_FLEET_SCALE_SAFETY;
  const galleonReviewVariants = galleonRawVariants.map((entry) => ({
    variant: entry.variant,
    camera: entry.camera,
    modelYaw: entry.modelYaw,
    ...fitPortAssaultRaster(entry.rendered)
  }));

  resetPortAssaultShipOutput();
  const cameraReviewPath = join(
    portAssaultShipReferenceOutputRoot,
    "galleon-dockside-contact-sheet.png"
  );
  const manifestPath = join(portAssaultShipOutputRoot, "manifest.json");
  const compositingReviewPath = join(
    portAssaultShipReferenceOutputRoot,
    "galleon-dockside-compositing-review.png"
  );
  writeFileSync(
    cameraReviewPath,
    makePortAssaultContactSheet(galleonReviewVariants).toBuffer("image/png")
  );

  const ships = [];
  const renderedShips = [];
  let galleonCompositing = null;
  for (const slug of rosterSlugs) {
    console.log(`port assault ${slug}`);
    const config = configs.get(slug);
    const productionEntry = productionBySlug.get(slug);
    const targetModelMaxDim = portAssaultTargetModelMaxDim(
      productionEntry,
      galleonProduction
    );
    const loaded = slug === "galleon"
      ? galleonLoaded
      : await loadPortAssaultShip(config, targetModelMaxDim);
    const raw = slug === "galleon"
      ? galleonSelectedRaw
      : renderPortAssaultVariant(loaded, config, productionVariant);
    const maximumRasterScale = portAssaultRasterScale(raw.rendered);
    if (fleetRasterScale > maximumRasterScale) {
      throw new Error(
        `${slug} port-assault projection requires raster scale ${maximumRasterScale.toFixed(4)}, ` +
          `below the fleet scale ${fleetRasterScale.toFixed(4)}`
      );
    }
    const selected = {
      variant: raw.variant,
      camera: raw.camera,
      modelYaw: raw.modelYaw,
      ...fitPortAssaultRaster(raw.rendered, fleetRasterScale)
    };
    const deck = portAssaultDeckCompositing(loaded, selected);
    const depthMap = makePortAssaultDepthMap(selected);
    const foreground = makePortAssaultForeground(selected, deck.sailorDepth);
    const spritePath = join(portAssaultShipOutputRoot, `${slug}-dockside.png`);
    const foregroundPath = join(portAssaultShipOutputRoot, `${slug}-dockside-foreground.png`);
    const depthPath = join(portAssaultShipOutputRoot, `${slug}-dockside-depth.png`);
    writeFileSync(spritePath, selected.canvas.toBuffer("image/png"));
    writeFileSync(foregroundPath, foreground.canvas.toBuffer("image/png"));
    writeFileSync(depthPath, depthMap.canvas.toBuffer("image/png"));
    const opaquePixels = selected.alpha.reduce((sum, value) => sum + value, 0);
    const entry = {
      slug,
      file: portablePath(spritePath),
      foregroundFile: portablePath(foregroundPath),
      depthFile: portablePath(depthPath),
      sourceTitle: config.sourceTitle,
      creator: config.creator,
      license: config.license,
      targetModelMaxDim: Number(targetModelMaxDim.toFixed(4)),
      opaqueBounds: selected.bounds,
      opaquePixels,
      deckPolygon: deck.deckPolygon,
      deckEntryAnchor: deck.deckEntryAnchor,
      sailorSpawnAnchor: deck.sailorSpawnAnchor,
      foregroundOpaquePixels: foreground.opaquePixels
    };
    ships.push(entry);
    renderedShips.push({ slug, canvas: selected.canvas });
    if (slug === "galleon") {
      galleonCompositing = { selected, foreground, depthMap, deck };
    }
  }
  if (!galleonCompositing) throw new Error("Port-assault fleet omitted the Galleon review");
  writeFileSync(
    compositingReviewPath,
    makePortAssaultCompositingReview(galleonCompositing).toBuffer("image/png")
  );
  const fleetContactSheetPath = join(
    portAssaultShipReferenceOutputRoot,
    "fleet-dockside-contact-sheet.png"
  );
  writeFileSync(
    fleetContactSheetPath,
    makePortAssaultFleetContactSheet(renderedShips).toBuffer("image/png")
  );
  const view = {
    projection: "orthographic",
    broadsideOffsetDegrees: productionVariant.broadsideOffsetDegrees,
    cameraElevationDegrees: productionVariant.cameraElevationDegrees,
    bowScreenDirection: "up-right",
    dockFacingSide: "port"
  };
  const depthEncoding = {
    transparentAlpha: 0,
    farValue: 1,
    nearValue: 255,
    comparison: "asset-local orthographic view depth"
  };
  writeFileSync(manifestPath, `${JSON.stringify({
    generatedBy: "tools/render-sail-ship-sprites.mjs --port-assault-ships",
    palette: "Resurrect 64",
    width: PORT_ASSAULT_SHIP_WIDTH,
    height: PORT_ASSAULT_SHIP_HEIGHT,
    scaleMode: "production-roster-relative",
    scaleNotes: "Target dimensions and frame scales follow the 47px production fleet; every hull shares one dockside raster scale.",
    fleetRasterScale: Number(fleetRasterScale.toFixed(6)),
    view,
    depthEncoding,
    ships,
    reviewFile: portablePath(fleetContactSheetPath),
    cameraReviewFile: portablePath(cameraReviewPath),
    compositingReviewFile: portablePath(compositingReviewPath)
  }, null, 2)}\n`);
  writePortAssaultGeometryModule(ships);
  console.log(fleetContactSheetPath);
  console.log(cameraReviewPath);
  console.log(compositingReviewPath);
  console.log(manifestPath);
  console.log(portAssaultShipGeometryOutputPath);
}

async function renderShipWaterlineReview(targetSlug = null) {
  const manifest = JSON.parse(readFileSync(join(unityFleetOutputRoot, "manifest.json"), "utf8"));
  const sideViewManifest = JSON.parse(
    readFileSync(join(unityFleetSideViewOutputRoot, "manifest.json"), "utf8")
  );
  if (!Array.isArray(manifest.ships) || !Array.isArray(sideViewManifest.ships)) {
    throw new Error("Ship waterline review requires production and side-view manifests");
  }
  const productionBySlug = uniqueShipEntriesBySlug(manifest.ships, "production manifest");
  const sideViewBySlug = uniqueShipEntriesBySlug(sideViewManifest.ships, "side-view manifest");
  const expectedSlugs = SHIP_STATS.map((entry) => entry.slug).sort();
  if (JSON.stringify([...productionBySlug.keys()].sort()) !== JSON.stringify(expectedSlugs)) {
    throw new Error("Production ship manifest does not exactly match the ship roster");
  }
  if (JSON.stringify([...sideViewBySlug.keys()].sort()) !== JSON.stringify(expectedSlugs)) {
    throw new Error("Side-view ship manifest does not exactly match the ship roster");
  }
  if (targetSlug !== null && !expectedSlugs.includes(targetSlug)) {
    throw new Error(`Unknown focused waterline-review ship: ${targetSlug}`);
  }
  // A focused review should only require that ship's private source model.
  const configBySlug = targetSlug === null
    ? productionShipRenderConfigs()
    : new Map([[targetSlug, standaloneShipConfigForSlug(targetSlug)]]);

  let entries = [];
  if (targetSlug === null) {
    resetWaterlineReviewOutput();
  } else {
    mkdirSync(waterlineReviewOutputRoot, { recursive: true });
    const existingManifest = JSON.parse(readFileSync(
      join(waterlineReviewOutputRoot, "manifest.json"),
      "utf8"
    ));
    if (!Array.isArray(existingManifest.ships)) {
      throw new Error("Focused waterline review requires an existing review manifest");
    }
    entries = await Promise.all(existingManifest.ships
      .filter((entry) => entry.slug !== targetSlug)
      .map(async (entry) => ({
        ...entry,
        canvas: await loadImage(resolve(repoRoot, entry.file))
      })));
  }
  const reviewSlugs = targetSlug === null ? expectedSlugs : [targetSlug];
  for (const slug of reviewSlugs) {
    const production = productionBySlug.get(slug);
    const sideView = sideViewBySlug.get(slug);
    const config = configBySlug.get(slug);
    config.targetModelMaxDim = production.targetModelMaxDim;
    config.sideViewTargetModelMaxDim = sideView.targetModelMaxDim;
    const camera = makeLevelSideViewCamera();
    const scaledWaterlineY = scaledSideViewWaterlineY(production, sideView);
    const { canvas: review } = await renderShipSideViewCanvas(config, {
      camera,
      waterlineY: scaledWaterlineY,
      modelYaw: Math.PI / 2
    });
    const waterlinePixelY = sideViewWaterlinePixelY(production, sideView, camera);
    const oarPivotPoints = config.animationTrianglesForFrame
      ? proceduralOarPivotPoints(slug, scaledWaterlineY)
      : [];
    const oarPivotPixels = uniqueProjectedSideViewPixels(oarPivotPoints, camera, Math.PI / 2, slug);
    const opaqueBounds = alphaBounds(review);
    const lowestOpaquePixelY = opaqueBounds.minY + opaqueBounds.height - 1;
    const lowestOpaqueRelativeToWaterlinePx = lowestOpaquePixelY - waterlinePixelY;
    const maxRasterWaterlineDepth = shipMaxRasterWaterlineDepth(slug);
    if (
      lowestOpaqueRelativeToWaterlinePx < SHIP_MIN_RASTER_WATERLINE_DEPTH ||
      lowestOpaqueRelativeToWaterlinePx > maxRasterWaterlineDepth
    ) {
      throw new Error(
        `${slug} waterline depth ${lowestOpaqueRelativeToWaterlinePx}px is outside ` +
        `${SHIP_MIN_RASTER_WATERLINE_DEPTH}..${maxRasterWaterlineDepth}px`
      );
    }
    const ctx = review.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = "#18243a";
    ctx.fillRect(0, 0, sideViewWidth, sideViewHeight);
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = waterlineReviewColor;
    ctx.fillRect(0, waterlinePixelY, sideViewWidth, 1);
    ctx.fillStyle = oarPivotReviewColor;
    for (const pivot of oarPivotPixels) ctx.fillRect(pivot.x - 1, pivot.y - 1, 3, 3);
    const outputPath = join(waterlineReviewOutputRoot, `${slug}-waterline.png`);
    writeFileSync(outputPath, review.toBuffer("image/png"));
    entries.push({
      slug,
      label: production.label,
      waterlineY: production.waterlineY,
      waterlineOffsetY: production.waterlineOffsetY ?? 0,
      sideViewWaterlineY: waterlinePixelY,
      lowestOpaquePixelY,
      lowestOpaqueRelativeToWaterlinePx,
      opaqueRowsBelowWaterline: Math.max(0, lowestOpaqueRelativeToWaterlinePx),
      oarPivotCount: oarPivotPoints.length,
      oarPivotPixels,
      file: portablePath(outputPath),
      canvas: review
    });
  }
  entries.sort((a, b) => a.slug.localeCompare(b.slug));

  const contactSheetPath = join(waterlineReviewOutputRoot, "ship-waterlines-contact-sheet.png");
  writeFileSync(contactSheetPath, makeWaterlineReviewContactSheet(entries).toBuffer("image/png"));
  const reviewManifestPath = join(waterlineReviewOutputRoot, "manifest.json");
  writeFileSync(reviewManifestPath, `${JSON.stringify({
    generatedBy: "tools/render-sail-ship-sprites.mjs --waterline-review",
    lineColor: waterlineReviewColor,
    oarPivotColor: oarPivotReviewColor,
    width: sideViewWidth,
    height: sideViewHeight,
    ships: entries.map(({ canvas, ...entry }) => entry)
  }, null, 2)}\n`);
  writeFileSync(join(waterlineReviewOutputRoot, "README.md"), [
    "# Ship waterline review",
    "",
    `The ${waterlineReviewColor} guide marks each production ship's model-space waterline`,
    "projected through the same camera as its side-view raster.",
    "",
    "Regenerate the review with:",
    "",
    "```sh",
    "npm run render:ship-waterline-review",
    "```",
    "",
    "To inspect one newly added ship without reloading every source model:",
    "",
    "```sh",
    "npm run render:ship-waterline-review -- <ship-slug>",
    "```",
    "",
    "Unity fleet corrections belong in `waterlineOffsetY` on the corresponding",
    "`unityShipRoster` entry. Re-bake one corrected Unity ship with:",
    "",
    "```sh",
    "npm run render:unity-ship -- <slug>",
    "```",
    "",
    "A negative offset lowers the waterline toward the keel; a positive offset raises it.",
    "The bake rejects offsets outside the model bounds.",
    "",
    "`lowestOpaqueRelativeToWaterlinePx` is the signed vertical distance from the guide",
    "to the raster's lowest non-transparent pixel before the guide and background are drawn.",
    "Red 3x3 markers show the projected pivot points used by procedural oars and paddles.",
    ""
  ].join("\n"));
  writeFileSync(
    join(waterlineReviewOutputRoot, "waterline-depths.md"),
    makeWaterlineDepthReport(entries)
  );
  console.log(reviewManifestPath);
  console.log(contactSheetPath);
}

function uniqueShipEntriesBySlug(entries, label) {
  const bySlug = new Map();
  for (const entry of entries) {
    if (!entry || typeof entry.slug !== "string" || entry.slug.length === 0) {
      throw new Error(`${label} contains a ship without a slug`);
    }
    if (bySlug.has(entry.slug)) throw new Error(`${label} contains duplicate ship ${entry.slug}`);
    bySlug.set(entry.slug, entry);
  }
  return bySlug;
}

function productionShipRenderConfigs() {
  const configs = [
    ...unityShipModels().map((modelPath) => unityShipConfig(modelPath)),
    ...nativeBoatConfigs(),
    ...[
      "mediterranean-galley",
      FUSTA_SLUG,
      "galleass",
      "joseon-turtle-ship",
      JOSEON_HYEOPSEON_SLUG,
      "joseon-panokseon",
      "japanese-kuribune",
      "japanese-kobaya",
      "japanese-sekibune",
      "japanese-atakebune",
      "spanish-nao",
      "portuguese-carrack",
      "dhow",
      "ocean-dhow",
      "galleon",
      "nusantaran-outrigger",
      "kelulus",
      "penjajap",
      "lancaran",
      "royal-lancaran",
      "ottoman-coastal-trader",
      "viking-longship"
    ].map((slug) => standaloneShipConfigForSlug(slug))
  ];
  const bySlug = uniqueShipEntriesBySlug(configs, "production ship render configuration");
  const expectedSlugs = SHIP_STATS.map((entry) => entry.slug).sort();
  if (JSON.stringify([...bySlug.keys()].sort()) !== JSON.stringify(expectedSlugs)) {
    throw new Error("Production ship render configurations do not exactly match the ship roster");
  }
  return bySlug;
}

function scaledSideViewWaterlineY(production, sideView) {
  for (const [label, value] of Object.entries({
    waterlineY: production.waterlineY,
    productionTargetModelMaxDim: production.targetModelMaxDim,
    sideViewTargetModelMaxDim: sideView.targetModelMaxDim
  })) {
    if (!Number.isFinite(value)) throw new Error(`${production.slug} has invalid ${label}: ${value}`);
  }
  if (production.targetModelMaxDim <= 0 || sideView.targetModelMaxDim <= 0) {
    throw new Error(`${production.slug} has non-positive model scale in its manifests`);
  }
  return production.waterlineY * sideView.targetModelMaxDim / production.targetModelMaxDim;
}

function sideViewWaterlinePixelY(production, sideView, camera) {
  const point = new THREE.Vector3(0, scaledSideViewWaterlineY(production, sideView), 0).project(camera);
  const pixelY = Math.round((1 - point.y) * 0.5 * sideViewHeight);
  if (pixelY < 0 || pixelY >= sideViewHeight) {
    throw new Error(`${production.slug} waterline projects outside its side view: ${pixelY}`);
  }
  return pixelY;
}

function uniqueProjectedSideViewPixels(points, camera, modelYaw, slug) {
  const rotation = new THREE.Matrix4().makeRotationY(modelYaw);
  const unique = new Map();
  for (const point of points) {
    const projected = point.clone().applyMatrix4(rotation).project(camera);
    const pixel = {
      x: Math.round((projected.x * 0.5 + 0.5) * sideViewWidth),
      y: Math.round((1 - projected.y) * 0.5 * sideViewHeight)
    };
    if (pixel.x < 1 || pixel.x >= sideViewWidth - 1 || pixel.y < 1 || pixel.y >= sideViewHeight - 1) {
      throw new Error(`${slug} oar pivot projects outside its side-view review: ${pixel.x},${pixel.y}`);
    }
    unique.set(`${pixel.x}:${pixel.y}`, pixel);
  }
  return [...unique.values()].sort((a, b) => a.x - b.x || a.y - b.y);
}

function makeWaterlineReviewContactSheet(entries) {
  const scale = 2;
  const columns = 3;
  const labelHeight = 20;
  const cellWidth = sideViewWidth * scale;
  const imageHeight = sideViewHeight * scale;
  const cellHeight = imageHeight + labelHeight;
  const sheet = createCanvas(cellWidth * columns, cellHeight * Math.ceil(entries.length / columns));
  const ctx = sheet.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#14151f";
  ctx.fillRect(0, 0, sheet.width, sheet.height);
  ctx.font = "12px monospace";
  ctx.textBaseline = "middle";
  for (let index = 0; index < entries.length; index++) {
    const entry = entries[index];
    const x = index % columns * cellWidth;
    const y = Math.floor(index / columns) * cellHeight;
    ctx.drawImage(entry.canvas, x, y, cellWidth, imageHeight);
    ctx.fillStyle = "#f4ecd8";
    const offset = `${entry.waterlineOffsetY >= 0 ? "+" : ""}${entry.waterlineOffsetY.toFixed(3)}`;
    ctx.fillText(
      `${entry.label} | depth ${entry.lowestOpaqueRelativeToWaterlinePx}px | ${offset}`,
      x + 6,
      y + imageHeight + labelHeight / 2
    );
  }
  return sheet;
}

function makeWaterlineDepthReport(entries) {
  const sorted = [...entries].sort((a, b) => (
    b.lowestOpaqueRelativeToWaterlinePx - a.lowestOpaqueRelativeToWaterlinePx ||
    a.label.localeCompare(b.label)
  ));
  return [
    "# Ship waterline depth report",
    "",
    "Positive depth is the number of vertical raster pixels from the waterline to the lowest opaque pixel.",
    "Procedural oars and outriggers are included because this is a literal whole-raster measurement.",
    "",
    "| Ship | Relative depth | Waterline row | Lowest opaque row | Manual offset |",
    "| --- | ---: | ---: | ---: | ---: |",
    ...sorted.map((entry) => (
      `| ${entry.label} | ${entry.lowestOpaqueRelativeToWaterlinePx} | ` +
      `${entry.sideViewWaterlineY} | ${entry.lowestOpaquePixelY} | ${entry.waterlineOffsetY.toFixed(3)} |`
    )),
    ""
  ].join("\n");
}

function resetWaterlineReviewOutput() {
  const relativeOutput = portablePath(waterlineReviewOutputRoot);
  if (relativeOutput !== "apps/pixel-globe/docs/ship-reference/waterlines") {
    throw new Error(`Refusing to clear unexpected waterline review path: ${waterlineReviewOutputRoot}`);
  }
  rmSync(waterlineReviewOutputRoot, { recursive: true, force: true });
  mkdirSync(waterlineReviewOutputRoot, { recursive: true });
}

const MEDITERRANEAN_GALLEY_BASE_MAX_DIM = 2.22;
const MEDITERRANEAN_GALLEY_SIDE_BASE_MAX_DIM = 1.9;
const MEDITERRANEAN_GALLEY_WATERLINE_OFFSET_Y = -0.15;
const MEDITERRANEAN_GALLEY_SCALE = 0.85;
const GALLEASS_SCALE = 1.025;
const FUSTA_SCALE = 0.68;
const FUSTA_WATERLINE_OFFSET_Y = -0.35;

function mediterraneanGalleyConfig() {
  const slug = "mediterranean-galley";
  return {
    slug,
    label: "Mediterranean Galley",
    category: "Mediterranean warship",
    assetLabel: "Russian 22-bank Baltic galley",
    identifiedType: "sixteenth-century Mediterranean-style sailing galley",
    identificationConfidence: "high",
    identificationNotes:
      "The source model's mizzen mast and sail are removed for a leaner galley silhouette; " +
      "a readable animated bank of oars is added.",
    ...MEDITERRANEAN_GALLEY_MODEL_CREDIT,
    stats: shipStatsForSlug(slug),
    modelPath: join(mediterraneanGalleySourceRoot, "scene.gltf"),
    targetModelMaxDim: MEDITERRANEAN_GALLEY_BASE_MAX_DIM * MEDITERRANEAN_GALLEY_SCALE,
    frameScale: 0.6667,
    sideViewTargetModelMaxDim:
      MEDITERRANEAN_GALLEY_SIDE_BASE_MAX_DIM * MEDITERRANEAN_GALLEY_SCALE,
    colorTransform: mediterraneanGalleyHullColor,
    scaleMode: "galley-pixel-derivative",
    outputDir: unityFleetOutputRoot,
    outputPrefix: `${slug}-${SHIP_SPRITE_HEADING_SUFFIX}`,
    waterlineOffsetY: MEDITERRANEAN_GALLEY_WATERLINE_OFFSET_Y * MEDITERRANEAN_GALLEY_SCALE,
    wakeWaterlineBand: 0.22,
    skipSelfShadowMaps: true,
    collectOptions: {
      includeMesh: (node) => mediterraneanGalleyMeshNames.has(node.name),
      requiredExcludedVertexRanges: mediterraneanGalleyRemovedMizzenComponents
    },
    animationFrameCount: SHIP_ROWING_FRAME_COUNT,
    animationTrianglesForFrame: mediterraneanGalleyTrianglesForFrame,
    animationContactSheetPath: join(
      appRoot,
      "docs/ship-reference/mediterranean-galley-rowing-frames.png"
    )
  };
}

function galleassConfig() {
  const slug = "galleass";
  return {
    ...mediterraneanGalleyConfig(),
    slug,
    label: "Galleass",
    category: "heavy Mediterranean warship",
    identifiedType: "sixteenth-century Mediterranean galleass",
    identificationNotes:
      "The complete three-sail galley rig is retained and rendered at a larger scale to represent " +
      "a broad, heavily armed galleass.",
    stats: shipStatsForSlug(slug),
    targetModelMaxDim: MEDITERRANEAN_GALLEY_BASE_MAX_DIM * GALLEASS_SCALE,
    frameRegistrationMargin: 1,
    sideViewTargetModelMaxDim: MEDITERRANEAN_GALLEY_SIDE_BASE_MAX_DIM * GALLEASS_SCALE,
    scaleMode: "large-galley-pixel-derivative",
    colorTransform: galleassHullColor,
    outputPrefix: `${slug}-${SHIP_SPRITE_HEADING_SUFFIX}`,
    waterlineOffsetY: MEDITERRANEAN_GALLEY_WATERLINE_OFFSET_Y * GALLEASS_SCALE,
    collectOptions: {
      includeMesh: (node) => mediterraneanGalleyMeshNames.has(node.name)
    },
    animationTrianglesForFrame: (hullTriangles, frameIndex, waterlineY, rowingMode) => [
      ...hullTriangles,
      ...makeOarBankTriangles(
        frameIndex,
        waterlineY,
        proceduralOarConfig(slug),
        rowingMode
      )
    ],
    animationContactSheetPath: join(
      appRoot,
      "docs/ship-reference/galleass-rowing-frames.png"
    )
  };
}

function fustaConfig() {
  const slug = FUSTA_SLUG;
  return {
    ...mediterraneanGalleyConfig(),
    slug,
    label: "Fusta",
    category: "light Mediterranean war galley",
    identifiedType: "sixteenth-century one-masted fusta",
    identificationNotes:
      "The source galley is reduced to its central lateen rig and rendered on a smaller hull scale; " +
      "three animated representative oars per side preserve a clean light-galley silhouette.",
    stats: shipStatsForSlug(slug),
    targetModelMaxDim: MEDITERRANEAN_GALLEY_BASE_MAX_DIM * FUSTA_SCALE,
    sideViewTargetModelMaxDim: MEDITERRANEAN_GALLEY_SIDE_BASE_MAX_DIM * FUSTA_SCALE,
    flagAnchorMaxSnapDistancePx: 5,
    scaleMode: "light-galley-pixel-derivative",
    colorTransform: fustaHullColor,
    outputPrefix: `${slug}-${SHIP_SPRITE_HEADING_SUFFIX}`,
    waterlineOffsetY: FUSTA_WATERLINE_OFFSET_Y * FUSTA_SCALE,
    collectOptions: {
      includeMesh: (node) => mediterraneanGalleyMeshNames.has(node.name),
      requiredExcludedVertexRanges: fustaRemovedForeAndMizzenComponents
    },
    animationTrianglesForFrame: fustaTrianglesForFrame,
    animationContactSheetPath: join(appRoot, "docs/ship-reference/fusta-rowing-frames.png"),
    orientationReviewPath: join(appRoot, "docs/ship-reference/fusta-cardinal-headings.png")
  };
}

function scaledProceduralOarConfig(config, scale) {
  if (!Number.isFinite(scale) || scale <= 0) throw new Error(`Invalid procedural oar scale: ${scale}`);
  return {
    ...config,
    bankPositions: config.bankPositions.map((position) => position * scale),
    bankOffset: (config.bankOffset ?? 0) * scale,
    pivotYOffset: config.pivotYOffset * scale,
    pivotHalfBeam: config.pivotHalfBeam * scale,
    shaftLength: config.shaftLength * scale,
    bladeLength: config.bladeLength * scale,
    shaftRadius: config.shaftRadius * scale,
    bladeRadius: config.bladeRadius * scale,
    inboardLength: (config.inboardLength ?? 0) * scale
  };
}

function mediterraneanGalleyTrianglesForFrame(hullTriangles, frameIndex, waterlineY, rowingMode) {
  return [
    ...hullTriangles,
    ...makeGalleyOarTriangles(frameIndex, waterlineY, rowingMode)
  ];
}

function fustaTrianglesForFrame(hullTriangles, frameIndex, waterlineY, rowingMode) {
  return [
    ...hullTriangles,
    ...makeOarBankTriangles(frameIndex, waterlineY, proceduralOarConfig(FUSTA_SLUG), rowingMode)
  ];
}

function joseonTurtleShipConfig() {
  const slug = "joseon-turtle-ship";
  return {
    slug,
    label: "Turtle Ship",
    category: "Joseon warship",
    assetLabel: "Geobukseon (Turtle Ship)",
    identifiedType: "early Joseon armored oar-and-sail warship",
    identificationConfidence: "high",
    identificationNotes: "Textured geobukseon model with a procedurally animated bank of working oars.",
    ...JOSEON_TURTLE_SHIP_MODEL_CREDIT,
    stats: shipStatsForSlug(slug),
    modelPath: join(joseonTurtleShipSourceRoot, "scene.gltf"),
    targetModelMaxDim: 2.28,
    frameScale: 0.56,
    flagAnchorMaxSnapDistancePx: 8,
    sideViewTargetModelMaxDim: 2.05,
    scaleMode: "joseon-warship",
    outputDir: unityFleetOutputRoot,
    outputPrefix: `${slug}-${SHIP_SPRITE_HEADING_SUFFIX}`,
    waterlineOffsetY: -0.05,
    wakeWaterlineBand: 0.22,
    skipSelfShadowMaps: true,
    collectOptions: {
      transformPoint: orientTurtleShipPoint
    },
    animationFrameCount: SHIP_ROWING_FRAME_COUNT,
    animationTrianglesForFrame: joseonTurtleShipTrianglesForFrame,
    animationContactSheetPath: join(
      appRoot,
      "docs/ship-reference/joseon-turtle-ship-rowing-frames.png"
    )
  };
}

function joseonTurtleShipTrianglesForFrame(hullTriangles, frameIndex, waterlineY, rowingMode) {
  return [
    ...hullTriangles,
    ...makeOarBankTriangles(
      frameIndex,
      waterlineY,
      proceduralOarConfig("joseon-turtle-ship"),
      rowingMode
    )
  ];
}

function joseonHyeopseonConfig() {
  const slug = JOSEON_HYEOPSEON_SLUG;
  return {
    slug,
    label: "Hyeopseon",
    category: "light Joseon warship",
    assetLabel: "Panok ship derivative",
    identifiedType: "light Joseon fleet companion and scout",
    identificationConfidence: "medium",
    identificationNotes:
      "The documented medium Hyeopseon is represented conservatively with the credited Panokseon " +
      "source model at a smaller scale, its aft mast removed, a lighter timber palette, and four " +
      "representative animated oars per side.",
    ...JOSEON_PANOKSEON_MODEL_CREDIT,
    stats: shipStatsForSlug(slug),
    modelPath: join(joseonPanokseonSourceRoot, "scene.gltf"),
    targetModelMaxDim: 1.72,
    frameScale: 0.62,
    flagAnchorMaxSnapDistancePx: 6,
    sideViewTargetModelMaxDim: 1.54,
    scaleMode: "light-joseon-panokseon-derivative",
    colorTransform: hyeopseonHullColor,
    outputDir: unityFleetOutputRoot,
    outputPrefix: `${slug}-${SHIP_SPRITE_HEADING_SUFFIX}`,
    waterlineBoundsRatio: 0.249,
    waterlineOffsetY: -0.265,
    wakeWaterlineBand: 0.2,
    skipSelfShadowMaps: true,
    collectOptions: {
      requiredExcludedMeshes: joseonHyeopseonRemovedMeshes,
      transformPoint: orientPanokseonPoint
    },
    animationFrameCount: SHIP_ROWING_FRAME_COUNT,
    animationTrianglesForFrame: joseonHyeopseonTrianglesForFrame,
    animationContactSheetPath: join(
      appRoot,
      "docs/ship-reference/joseon-hyeopseon-rowing-frames.png"
    ),
    orientationReviewPath: join(
      appRoot,
      "docs/ship-reference/joseon-hyeopseon-cardinal-headings.png"
    )
  };
}

function joseonHyeopseonTrianglesForFrame(hullTriangles, frameIndex, waterlineY, rowingMode) {
  return [
    ...hullTriangles,
    ...makeOarBankTriangles(
      frameIndex,
      waterlineY,
      proceduralOarConfig(JOSEON_HYEOPSEON_SLUG),
      rowingMode
    )
  ];
}

function joseonPanokseonConfig() {
  const slug = "joseon-panokseon";
  return {
    slug,
    label: "Panokseon",
    category: "Joseon warship",
    assetLabel: "Panok ship (Panokseon)",
    identifiedType: "Joseon decked oar-and-sail warship",
    identificationConfidence: "high",
    identificationNotes: "The source model's static paddles are removed and replaced with smaller procedurally animated Joseon oars.",
    ...JOSEON_PANOKSEON_MODEL_CREDIT,
    stats: shipStatsForSlug(slug),
    modelPath: join(joseonPanokseonSourceRoot, "scene.gltf"),
    targetModelMaxDim: 2.3,
    frameScale: 0.58,
    sideViewTargetModelMaxDim: 2.05,
    scaleMode: "joseon-decked-warship",
    outputDir: unityFleetOutputRoot,
    outputPrefix: `${slug}-${SHIP_SPRITE_HEADING_SUFFIX}`,
    // Keep the shallow, flat-bottomed hull seated three raster pixels into the water.
    waterlineBoundsRatio: 0.249,
    waterlineOffsetY: -0.354,
    wakeWaterlineBand: 0.22,
    skipSelfShadowMaps: true,
    collectOptions: {
      requiredExcludedMeshes: joseonPanokseonStaticOarMeshes,
      transformPoint: orientPanokseonPoint
    },
    animationFrameCount: SHIP_ROWING_FRAME_COUNT,
    animationTrianglesForFrame: joseonPanokseonTrianglesForFrame,
    animationContactSheetPath: join(
      appRoot,
      "docs/ship-reference/joseon-panokseon-rowing-frames.png"
    )
  };
}

function joseonPanokseonTrianglesForFrame(hullTriangles, frameIndex, waterlineY, rowingMode) {
  return [
    ...hullTriangles,
    ...makeOarBankTriangles(frameIndex, waterlineY, proceduralOarConfig("joseon-panokseon"), rowingMode)
  ];
}

function japaneseAtakebuneConfig() {
  const slug = "japanese-atakebune";
  return {
    slug,
    label: "Atakebune",
    category: "Japanese warship",
    assetLabel: "Atakebune Japanese Medieval Warship",
    identifiedType: "Japanese coastal fortress warship",
    identificationConfidence: "high",
    identificationNotes: "The source model's static oars are removed and replaced with procedurally animated working oars.",
    ...JAPANESE_ATAKEBUNE_MODEL_CREDIT,
    stats: shipStatsForSlug(slug),
    modelPath: join(japaneseAtakebuneSourceRoot, "scene.gltf"),
    targetModelMaxDim: 2.3,
    frameScale: 0.6,
    sideViewTargetModelMaxDim: 2.08,
    scaleMode: "japanese-fortress-warship",
    outputDir: unityFleetOutputRoot,
    outputPrefix: `${slug}-${SHIP_SPRITE_HEADING_SUFFIX}`,
    waterlineOffsetY: 0.073,
    wakeWaterlineBand: 0.22,
    skipSelfShadowMaps: true,
    collectOptions: {
      requiredExcludedMeshes: japaneseAtakebuneStaticOarMeshes,
      transformPoint: orientAtakebunePoint
    },
    animationFrameCount: SHIP_ROWING_FRAME_COUNT,
    animationTrianglesForFrame: japaneseAtakebuneTrianglesForFrame,
    animationContactSheetPath: join(
      appRoot,
      "docs/ship-reference/japanese-atakebune-rowing-frames.png"
    )
  };
}

function japaneseKuribuneConfig() {
  const slug = "japanese-kuribune";
  validateJapaneseKuribuneOrientation();
  return {
    slug,
    label: "Umi-bune",
    category: "Japanese coastal trader",
    assetLabel: "Kamakura Period Umi-Bune Japanese Boat",
    identifiedType: "small Japanese coastal cargo vessel",
    identificationConfidence: "medium",
    identificationNotes:
      "The source model's eight static stern oars are removed. Four animated oars retain two measured source stations per side for a clearer gameplay silhouette.",
    ...JAPANESE_KURIBUNE_MODEL_CREDIT,
    stats: shipStatsForSlug(slug),
    modelPath: join(japaneseKuribuneSourceRoot, "scene.gltf"),
    targetModelMaxDim: 1.48,
    frameScale: 0.63,
    sideViewTargetModelMaxDim: 1.38,
    scaleMode: "standalone-source-relative",
    outputDir: unityFleetOutputRoot,
    outputPrefix: `${slug}-${SHIP_SPRITE_HEADING_SUFFIX}`,
    waterlineOffsetY: -0.018,
    wakeWaterlineBand: 0.2,
    skipSelfShadowMaps: true,
    sourceOrientation: {
      rawUpAxis: "+Y",
      rawForwardAxis: "local -X",
      importedSceneForward: [-0.623437353, 0, 0.781872239],
      removedPresentationYawDeg: Number(
        (japaneseKuribunePresentationYawRad * 180 / Math.PI).toFixed(6)
      ),
      evidence:
        "The paired bow anchors identify local -X as forward, the stern oar bank identifies local +X as aft, and the hull underside lies below the deck on Y."
    },
    orientationReviewPath: join(
      appRoot,
      "docs/ship-reference/japanese-kuribune-orientation-review.png"
    ),
    collectOptions: {
      requiredExcludedMeshes: japaneseKuribuneStaticOarMeshes,
      includeMesh: includeJapaneseKuribuneMesh,
      transformPoint: orientJapaneseKuribunePoint
    },
    animationFrameCount: SHIP_ROWING_FRAME_COUNT,
    animatedOarCount: 4,
    animationTrianglesForFrame: japaneseKuribuneTrianglesForFrame,
    animationContactSheetPath: join(
      appRoot,
      "docs/ship-reference/japanese-kuribune-rowing-frames.png"
    ),
    animationReviewHeading: 4
  };
}

function japaneseKuribuneTrianglesForFrame(hullTriangles, frameIndex, waterlineY, rowingMode) {
  return [
    ...hullTriangles,
    ...makeOarBankTriangles(frameIndex, waterlineY, proceduralOarConfig("japanese-kuribune"), rowingMode)
  ];
}

function japaneseKobayaConfig() {
  const slug = "japanese-kobaya";
  validateJapaneseKobayaOrientation();
  return {
    slug,
    label: "Kobaya",
    category: "Japanese light warship",
    assetLabel: "Japanese Boat: Kobaya 3D Model",
    identifiedType: "light Japanese scout and fighting boat",
    identificationConfidence: "medium",
    identificationNotes:
      "The purchased source is an artist's reconstruction. Its 20 static oars are removed and replaced with eight widely spaced animated oars for a readable light-warship silhouette.",
    ...JAPANESE_KOBAYA_MODEL_CREDIT,
    stats: shipStatsForSlug(slug),
    modelPath: join(japaneseKobayaSourceRoot, "kobaya-v1.2.fbx"),
    targetModelMaxDim: 1.68,
    frameScale: 0.62,
    sideViewTargetModelMaxDim: 1.56,
    scaleMode: "japanese-light-warship",
    outputDir: unityFleetOutputRoot,
    outputPrefix: `${slug}-${SHIP_SPRITE_HEADING_SUFFIX}`,
    wakeWaterlineBand: 0.2,
    skipSelfShadowMaps: true,
    sourceOrientation: {
      rawUpAxis: "+Y",
      rawForwardAxis: "-X",
      evidence:
        "The rudder is centred at the +X end, identifying +X as stern and -X as bow; the deck and protective shields rise on +Y while the keel lies below them on -Y."
    },
    orientationReviewPath: join(
      appRoot,
      "docs/ship-reference/japanese-kobaya-orientation-review.png"
    ),
    collectOptions: {
      requiredExcludedMeshes: japaneseKobayaStaticOarMeshes,
      meshTextureSamplers: japaneseKobayaTextureSamplers(),
      transformPoint: orientJapaneseKobayaPoint
    },
    animationFrameCount: SHIP_ROWING_FRAME_COUNT,
    animatedOarCount: 8,
    animationTrianglesForFrame: japaneseKobayaTrianglesForFrame,
    animationContactSheetPath: join(
      appRoot,
      "docs/ship-reference/japanese-kobaya-rowing-frames.png"
    ),
    animationReviewHeading: 4
  };
}

function japaneseKobayaTrianglesForFrame(hullTriangles, frameIndex, waterlineY, rowingMode) {
  return [
    ...hullTriangles,
    ...makeOarBankTriangles(frameIndex, waterlineY, proceduralOarConfig("japanese-kobaya"), rowingMode)
  ];
}

function japaneseSekibuneConfig() {
  const slug = "japanese-sekibune";
  validateJapaneseSekibuneOrientation();
  return {
    slug,
    label: "Sekibune",
    category: "Japanese warship",
    assetLabel: "Japanese Boat: Sekibune 3D Model",
    identifiedType: "medium Japanese coastal fighting ship",
    identificationConfidence: "medium",
    identificationNotes:
      "The purchased source is an artist's reconstruction. Its 64 static oars are removed and replaced with 10 animated oars so the historical long-bank silhouette remains legible at gameplay scale.",
    ...JAPANESE_SEKIBUNE_MODEL_CREDIT,
    stats: shipStatsForSlug(slug),
    modelPath: join(japaneseSekibuneSourceRoot, "sekibune-v1.2.fbx"),
    targetModelMaxDim: 1.95,
    frameScale: 0.61,
    sideViewTargetModelMaxDim: 1.82,
    scaleMode: "japanese-medium-warship",
    outputDir: unityFleetOutputRoot,
    outputPrefix: `${slug}-${SHIP_SPRITE_HEADING_SUFFIX}`,
    wakeWaterlineBand: 0.22,
    skipSelfShadowMaps: true,
    sourceOrientation: {
      rawUpAxis: "+Y",
      rawForwardAxis: "-X",
      evidence:
        "The rudder is centred at the +X end, identifying +X as stern and -X as bow; the deck and mast rise on +Y while the keel lies below them on -Y."
    },
    orientationReviewPath: join(
      appRoot,
      "docs/ship-reference/japanese-sekibune-orientation-review.png"
    ),
    collectOptions: {
      requiredExcludedMeshes: japaneseSekibuneStaticOarMeshes,
      meshTextureSamplers: japaneseSekibuneTextureSamplers(),
      transformPoint: orientJapaneseSekibunePoint
    },
    animationFrameCount: SHIP_ROWING_FRAME_COUNT,
    animatedOarCount: 10,
    animationTrianglesForFrame: japaneseSekibuneTrianglesForFrame,
    animationContactSheetPath: join(
      appRoot,
      "docs/ship-reference/japanese-sekibune-rowing-frames.png"
    ),
    animationReviewHeading: 4
  };
}

function japaneseSekibuneTrianglesForFrame(hullTriangles, frameIndex, waterlineY, rowingMode) {
  return [
    ...hullTriangles,
    ...makeOarBankTriangles(frameIndex, waterlineY, proceduralOarConfig("japanese-sekibune"), rowingMode)
  ];
}

function spanishNaoConfig() {
  const slug = "spanish-nao";
  return {
    slug,
    label: "Spanish Nao",
    category: "Iberian exploration ship",
    assetLabel: "Nao Victoria Galleon Ship",
    identifiedType: "early-16th-century Spanish nao / small carrack",
    identificationConfidence: "high",
    identificationNotes: "The source depicts Nao Victoria; the gameplay hull represents the broader Spanish nao class.",
    ...NAO_VICTORIA_MODEL_CREDIT,
    stats: shipStatsForSlug(slug),
    modelPath: join(naoVictoriaSourceRoot, "scene.gltf"),
    targetModelMaxDim: 2.3,
    frameScale: 0.54,
    sideViewTargetModelMaxDim: 2.0,
    colorTransform: simplifySpanishNaoTextureColor,
    gltfTextureSamplerOptions: {
      maxDimension: 96,
      smoothing: true
    },
    scaleMode: "spanish-nao",
    outputDir: unityFleetOutputRoot,
    outputPrefix: `${slug}-${SHIP_SPRITE_HEADING_SUFFIX}`,
    waterlineOffsetY: -0.025,
    wakeWaterlineBand: 0.2,
    skipSelfShadowMaps: true
  };
}

function portugueseCarrackConfig() {
  const slug = "portuguese-carrack";
  return {
    slug,
    label: "Portuguese Carrack",
    category: "Portuguese ocean-going merchant",
    assetLabel: "Portuguese Carrack",
    identifiedType: "early-16th-century Portuguese carrack",
    identificationConfidence: "high",
    identificationNotes: "Portugal-specific armed merchant carrack retaining the source model's cream and red sail treatment.",
    ...PORTUGUESE_CARRACK_MODEL_CREDIT,
    stats: shipStatsForSlug(slug),
    modelPath: join(portugueseCarrackSourceRoot, "scene.gltf"),
    targetModelMaxDim: 2.3,
    frameScale: 0.62,
    sideViewTargetModelMaxDim: 2.1,
    gltfTextureSamplerOptions: {
      maxDimension: 96,
      smoothing: true
    },
    scaleMode: "portuguese-carrack",
    outputDir: unityFleetOutputRoot,
    outputPrefix: `${slug}-${SHIP_SPRITE_HEADING_SUFFIX}`,
    waterlineOffsetY: 0.073,
    wakeWaterlineBand: 0.2,
    collectOptions: {
      transformPoint: orientPortugueseCarrackPoint
    }
  };
}

function gogiartDhowConfig() {
  const slug = "dhow";
  return {
    slug,
    label: "Dhow",
    category: "Indian Ocean merchant",
    assetLabel: "Dhow",
    identifiedType: "small coastal dhow / fishing craft",
    identificationConfidence: "high",
    identificationNotes: "A purpose-built one-person coastal dhow model used as a light fishing and trading craft.",
    ...GOGIART_DHOW_MODEL_CREDIT,
    stats: shipStatsForSlug(slug),
    modelPath: join(gogiartDhowSourceRoot, "scene.gltf"),
    targetModelMaxDim: 0.95,
    frameScale: 0.56,
    flagAnchorMaxSnapDistancePx: 6,
    sideViewTargetModelMaxDim: 0.95,
    scaleMode: "standalone-source-relative",
    outputDir: unityFleetOutputRoot,
    outputPrefix: `${slug}-${SHIP_SPRITE_HEADING_SUFFIX}`,
    waterlineOffsetY: -0.244,
    wakeWaterlineBand: 0.18,
    collectOptions: {
      transformPoint: orientGogiartDhowPoint
    }
  };
}

function oceanDhowConfig() {
  const slug = "ocean-dhow";
  return {
    slug,
    label: "Ocean Dhow",
    category: "Indian Ocean merchant",
    assetLabel: "Low Poly Ancient Dhow Ship",
    identifiedType: "medium western Indian Ocean lateen trader",
    identificationConfidence: "high",
    identificationNotes:
      "A broad-beamed, two-masted cargo dhow scaled between small coastal lateen craft and large ocean warships.",
    ...OCEAN_DHOW_MODEL_CREDIT,
    stats: shipStatsForSlug(slug),
    modelPath: join(ancientDhowSourceRoot, "scene.gltf"),
    targetModelMaxDim: 1.9,
    frameScale: 0.62,
    sideViewTargetModelMaxDim: 1.72,
    scaleMode: "standalone-source-relative",
    outputDir: unityFleetOutputRoot,
    outputPrefix: `${slug}-${SHIP_SPRITE_HEADING_SUFFIX}`,
    waterlineOffsetY: 0,
    wakeWaterlineBand: 0.2,
    flagAnchorMeshName: "Cube007_worn_wood_dhow_0",
    flagAnchorMaxSnapDistancePx: 5,
    sourceOrientation: {
      rawUpAxis: "+Z",
      rawForwardAxis: "+X",
      importedSceneForward: [-0.764302178, 0.059440944, 0.642112883],
      evidence: "high stern at raw -X; low bow and foredeck extend toward raw +X"
    },
    orientationReviewPath: join(
      appRoot,
      "docs/ship-reference/ocean-dhow-orientation-review.png"
    ),
    collectOptions: {
      transformPoint: orientAncientDhowPoint
    }
  };
}

function cyc3wGalleonConfig() {
  const slug = "galleon";
  return {
    slug,
    label: "Galleon",
    category: "European armed merchant",
    assetLabel: "Sailing ship",
    identifiedType: "three-masted galleon / armed merchant",
    identificationConfidence: "medium",
    identificationNotes: "A detailed mixed square-and-lateen rig replaces the generic Unity galleon while retaining the existing gameplay hull.",
    ...CYC3W_SAILING_SHIP_MODEL_CREDIT,
    stats: shipStatsForSlug(slug),
    modelPath: join(cyc3wSailingShipSourceRoot, "scene.gltf"),
    targetModelMaxDim: 2.3,
    frameScale: 0.62,
    sideViewTargetModelMaxDim: 2.1,
    gltfTextureSamplerOptions: {
      maxDimension: 96,
      smoothing: true
    },
    scaleMode: "standalone-source-relative",
    outputDir: unityFleetOutputRoot,
    outputPrefix: `${slug}-${SHIP_SPRITE_HEADING_SUFFIX}`,
    wakeWaterlineBand: 0.2,
    sourceOrientation: {
      rawUpAxis: "+Y",
      rawForwardAxis: "20 degrees from -X toward +Z",
      importedSceneForward: [
        -Math.cos(Math.PI / 9),
        0,
        Math.sin(Math.PI / 9)
      ],
      evidence: "bowsprit and forecastle extend along the measured imported scene vector"
    },
    orientationReviewPath: join(
      appRoot,
      "docs/ship-reference/galleon-orientation-review.png"
    ),
    collectOptions: {
      transformPoint: orientCyc3wSailingShipPoint
    }
  };
}

function nusantaranOutriggerConfig() {
  const slug = "nusantaran-outrigger";
  return {
    slug,
    label: "Nusantaran Outrigger",
    category: "Maritime Southeast Asian trader",
    assetLabel: "Low Poly Borobudur Ship of Sriwijaya",
    identifiedType: "ocean-going double-outrigger trading vessel",
    identificationConfidence: "high",
    identificationNotes: "An older Borobudur ship reconstruction used as a representative descendant of the Nusantaran outrigger tradition in 1522.",
    ...BOROBUDUR_SHIP_MODEL_CREDIT,
    stats: shipStatsForSlug(slug),
    modelPath: join(borobudurShipSourceRoot, "scene.gltf"),
    targetModelMaxDim: 1.9,
    frameScale: 0.6,
    sideViewTargetModelMaxDim: 1.85,
    scaleMode: "nusantaran-ocean-trader",
    outputDir: unityFleetOutputRoot,
    outputPrefix: `${slug}-${SHIP_SPRITE_HEADING_SUFFIX}`,
    waterlineOffsetY: -0.012,
    wakeWaterlineBand: 0.2,
    expectedWaterlineHullCount: 1,
    waterlineImmersionRatio: 0.82,
    collectOptions: {
      transformPoint: orientBorobudurShipPoint
    }
  };
}

function ottomanCoastalTraderConfig() {
  const slug = "ottoman-coastal-trader";
  return {
    slug,
    label: "Kancabash",
    category: "Ottoman merchant",
    assetLabel: "Ottoman Coastal Trade Tall Ship 3D Model",
    identifiedType: "Ottoman Kancabash coastal trader",
    identificationConfidence: "medium",
    identificationNotes:
      "The hooked bow, single fore-and-aft mast, and headsail match published Kancabaş coastal-trade plans. The surviving plan is later than 1522, so the game uses it as a representative Ottoman regional trader rather than an exact reconstruction for the start year.",
    ...OTTOMAN_COASTAL_TRADER_MODEL_CREDIT,
    stats: shipStatsForSlug(slug),
    modelPath: join(ottomanCoastalTraderSourceRoot, "scene.gltf"),
    targetModelMaxDim: 2.1,
    frameScale: 0.6,
    sideViewTargetModelMaxDim: 2.0,
    scaleMode: "ottoman-regional-merchant",
    outputDir: unityFleetOutputRoot,
    outputPrefix: `${slug}-${SHIP_SPRITE_HEADING_SUFFIX}`,
    waterlineOffsetY: -0.883,
    wakeWaterlineBand: 0.2,
    skipSelfShadowMaps: true
  };
}

function japaneseSekibuneTextureSamplers() {
  const hull = repeatingTextureSampler((u, v) => {
    const horizontalSeam = wrap01(v * 14) < 0.045;
    const staggeredU = u + Math.floor(v * 14) * 0.059;
    const verticalSeam = wrap01(staggeredU * 9) < 0.03;
    if (horizontalSeam || verticalSeam) return { r: 58, g: 39, b: 30 };
    const grain = Math.sin((u * 7 + v * 3) * Math.PI * 2) * 8 +
      Math.sin((u * 29 - v * 11) * Math.PI * 2) * 5;
    const fleck = ((Math.floor(u * 22) + Math.floor(v * 19)) & 1) ? 5 : -5;
    const plank = (Math.floor(v * 14) % 3 - 1) * 5;
    return {
      r: clamp255(132 + grain + fleck + plank),
      g: clamp255(82 + grain * 0.55 + fleck * 0.45 + plank * 0.45),
      b: clamp255(45 + grain * 0.3 + fleck * 0.25)
    };
  });
  const fightingWorks = repeatingTextureSampler((u, v) => {
    const panelU = wrap01(u * 13);
    const panelV = wrap01(v * 12);
    if (panelU < 0.035 || panelV < 0.04) return { r: 45, g: 32, b: 29 };
    const alternate = (Math.floor(u * 13) + Math.floor(v * 12)) % 3 - 1;
    const grain = Math.sin((u * 8 - v * 5) * Math.PI * 2) * 10 +
      Math.sin((u * 31 + v * 13) * Math.PI * 2) * 5;
    const fleck = ((Math.floor(u * 24) + Math.floor(v * 21)) & 1) ? 6 : -6;
    return {
      r: clamp255(145 + alternate * 7 + grain + fleck),
      g: clamp255(84 + alternate * 5 + grain * 0.55 + fleck * 0.45),
      b: clamp255(45 + alternate * 3 + grain * 0.3 + fleck * 0.25)
    };
  });
  const darkTimber = repeatingTextureSampler((u, v) => {
    const grain = Math.sin((u * 23 + v * 5) * Math.PI * 2) * 5;
    return {
      r: clamp255(76 + grain),
      g: clamp255(49 + grain * 0.6),
      b: clamp255(34 + grain * 0.35)
    };
  });
  const sail = repeatingTextureSampler((u, v) => {
    const du = u - 0.5;
    const dv = v - 0.5;
    // The complete maru-ni-futatsubiki crest is a circle around two bars, but
    // its circle becomes a misleading arch on a roughly ten-pixel sail. Keep
    // the identifying two bars bold and separated at gameplay resolution.
    const ashikagaBars = Math.abs(dv) < 0.31 &&
      (Math.abs(du - 0.14) < 0.055 || Math.abs(du + 0.14) < 0.055);
    if (ashikagaBars) return { r: 43, g: 54, b: 69 };
    const clothSeam = wrap01(u * 10) < 0.025 || wrap01(v * 8) < 0.018;
    if (clothSeam) return { r: 184, g: 158, b: 113 };
    const weave = ((Math.floor(u * 48) + Math.floor(v * 48)) & 1) * 5;
    return { r: 232 - weave, g: 213 - weave, b: 169 - weave };
  });
  const banner = repeatingTextureSampler((u, v) => {
    const du = u - 0.5;
    const dv = v - 0.5;
    const border = u < 0.075 || u > 0.925 || v < 0.04 || v > 0.96;
    if (border) return { r: 49, g: 35, b: 31 };
    // Reverse the colours on the tiny banners so the cloth itself supplies a
    // large, legible field and the two light bars survive downsampling.
    if (Math.abs(dv) < 0.38 &&
      (Math.abs(du - 0.13) < 0.075 || Math.abs(du + 0.13) < 0.075)) {
      return { r: 238, g: 218, b: 174 };
    }
    return { r: 43, g: 54, b: 69 };
  });
  return new Map([
    ["船体", hull],
    ["櫓", fightingWorks],
    ["舵", darkTimber],
    ["帆柱_倒", darkTimber],
    ["帆柱_立", darkTimber],
    ["帆桁", darkTimber],
    ["表車立", darkTimber],
    ["艫車立", darkTimber],
    ["筒車立", darkTimber],
    ["帆", sail],
    ["旗", banner],
    ["旗001", banner],
    ["旗002", banner],
    ["旗003", banner]
  ]);
}

function japaneseKobayaTextureSamplers() {
  const hull = repeatingTextureSampler((u, v) => {
    const row = Math.floor(v * 13);
    const seamV = wrap01(v * 13) < 0.045;
    const seamU = wrap01((u + row * 0.067) * 9) < 0.03;
    if (seamV || seamU) return { r: 66, g: 43, b: 31 };
    const grain = Math.sin((u * 47 + v * 9) * Math.PI * 2) * 9 +
      Math.sin((u * 21 - v * 31) * Math.PI * 2) * 4;
    const plank = (row % 3 - 1) * 5;
    return {
      r: clamp255(153 + plank + grain),
      g: clamp255(94 + plank * 0.5 + grain * 0.55),
      b: clamp255(49 + grain * 0.28)
    };
  });
  const shields = repeatingTextureSampler((u, v) => {
    const seam = wrap01(u * 11) < 0.045 || wrap01(v * 15) < 0.035;
    if (seam) return { r: 76, g: 49, b: 32 };
    const slat = (Math.floor(u * 11) % 3 - 1) * 5;
    const grain = Math.sin((u * 61 + v * 13) * Math.PI * 2) * 6 +
      Math.sin((u * 23 - v * 37) * Math.PI * 2) * 2.5;
    return {
      r: clamp255(198 + slat + grain),
      g: clamp255(132 + slat * 0.55 + grain * 0.5),
      b: clamp255(70 + grain * 0.25)
    };
  });
  const darkTimber = repeatingTextureSampler((u, v) => {
    const grain = Math.sin((u * 31 + v * 7) * Math.PI * 2) * 5 +
      Math.sin((u * 13 - v * 19) * Math.PI * 2) * 2;
    return {
      r: clamp255(91 + grain),
      g: clamp255(58 + grain * 0.6),
      b: clamp255(37 + grain * 0.35)
    };
  });
  const banner = repeatingTextureSampler((u, v) => {
    const du = u - 0.5;
    const dv = v - 0.5;
    const border = u < 0.075 || u > 0.925 || v < 0.04 || v > 0.96;
    if (border) return { r: 49, g: 35, b: 31 };
    if (Math.abs(dv) < 0.38 &&
      (Math.abs(du - 0.13) < 0.075 || Math.abs(du + 0.13) < 0.075)) {
      return { r: 238, g: 218, b: 174 };
    }
    return { r: 43, g: 54, b: 69 };
  });
  return new Map([
    ["小早船本体", hull],
    ["舵", darkTimber],
    ["旗", banner],
    ["旗001", banner],
    ...["L", "R"].flatMap((side) => Array.from(
      { length: 8 },
      (_, index) => [`盾${side}${index + 1}`, shields]
    ))
  ]);
}

function repeatingTextureSampler(sample) {
  return Object.freeze({
    sample(u, v) {
      return sample(wrap01(u), wrap01(v));
    }
  });
}

function orientAtakebunePoint(point) {
  return vectorFromCoordinates(orientPositiveXForwardToZForward(point));
}

function orientJapaneseKuribunePoint(point) {
  const axisOriented = orientNegativeXForwardYUpToZForward(point);
  return vectorFromCoordinates(rotateY(axisOriented, -japaneseKuribunePresentationYawRad));
}

function orientJapaneseKobayaPoint(point) {
  return vectorFromCoordinates(orientNegativeXForwardYUpToZForward(point));
}

function orientJapaneseSekibunePoint(point) {
  return vectorFromCoordinates(orientNegativeXForwardYUpToZForward(point));
}

function validateJapaneseKobayaOrientation() {
  const forward = orientJapaneseKobayaPoint(new THREE.Vector3(-1, 0, 0));
  const up = orientJapaneseKobayaPoint(new THREE.Vector3(0, 1, 0));
  if (Math.abs(forward.x) > 1e-9 || Math.abs(forward.y) > 1e-9 || forward.z < 1 - 1e-9) {
    throw new Error(`Kobaya bow does not point forward after orientation: ${forward.toArray()}`);
  }
  if (Math.abs(up.x) > 1e-9 || up.y < 1 - 1e-9 || Math.abs(up.z) > 1e-9) {
    throw new Error(`Kobaya keel is not below the deck after orientation: ${up.toArray()}`);
  }
}

function validateJapaneseSekibuneOrientation() {
  const forward = orientJapaneseSekibunePoint(new THREE.Vector3(-1, 0, 0));
  const up = orientJapaneseSekibunePoint(new THREE.Vector3(0, 1, 0));
  if (Math.abs(forward.x) > 1e-9 || Math.abs(forward.y) > 1e-9 || forward.z < 1 - 1e-9) {
    throw new Error(`Sekibune bow does not point forward after orientation: ${forward.toArray()}`);
  }
  if (Math.abs(up.x) > 1e-9 || up.y < 1 - 1e-9 || Math.abs(up.z) > 1e-9) {
    throw new Error(`Sekibune keel is not below the deck after orientation: ${up.toArray()}`);
  }
}

function validateJapaneseKuribuneOrientation() {
  const importedForward = new THREE.Vector3(
    -0.6234373530827396,
    0,
    0.7818722388292283
  ).normalize();
  const forward = orientJapaneseKuribunePoint(importedForward);
  const up = orientJapaneseKuribunePoint(new THREE.Vector3(0, 1, 0));
  if (Math.abs(forward.x) > 1e-9 || Math.abs(forward.y) > 1e-9 || forward.z < 1 - 1e-9) {
    throw new Error(`Umi-bune bow axis must map exactly to +Z: ${forward.toArray()}`);
  }
  if (Math.abs(up.x) > 1e-9 || up.y < 1 - 1e-9 || Math.abs(up.z) > 1e-9) {
    throw new Error(`Umi-bune keel-up axis must map exactly to +Y: ${up.toArray()}`);
  }
}

function includeJapaneseKuribuneMesh(node) {
  const name = node?.name || "";
  return !(
    name.includes("_ropes_") ||
    name.includes("_Lantern") ||
    /^stone/i.test(name)
  );
}

function orientTurtleShipPoint(point) {
  return vectorFromCoordinates(orientPositiveXForwardToZForward(point));
}

function orientPanokseonPoint(point) {
  // This source is already Y-up with its bow on positive Z.
  return vectorFromCoordinates(point);
}

function orientPortugueseCarrackPoint(point) {
  return vectorFromCoordinates(orientNegativeXForwardYUpToZForward(point));
}

function orientGogiartDhowPoint(point) {
  return vectorFromCoordinates(orientNegativeXForwardYUpToZForward(point));
}

function orientAncientDhowPoint(point) {
  return vectorFromCoordinates(ancientDhowOrientation(point));
}

function orientCyc3wSailingShipPoint(point) {
  return vectorFromCoordinates(orientCyc3wGalleonToCanonical(point));
}

function orientBorobudurShipPoint(point) {
  return vectorFromCoordinates(orientNegativeXForwardYUpToZForward(point));
}

function vectorFromCoordinates(point) {
  return new THREE.Vector3(point.x, point.y, point.z);
}

function japaneseAtakebuneTrianglesForFrame(hullTriangles, frameIndex, waterlineY, rowingMode) {
  return [
    ...hullTriangles,
    ...makeOarBankTriangles(frameIndex, waterlineY, proceduralOarConfig("japanese-atakebune"), rowingMode)
  ];
}

function makeGalleyOarTriangles(frameIndex, waterlineY, rowingMode) {
  return makeOarBankTriangles(
    frameIndex,
    waterlineY,
    proceduralOarConfig("mediterranean-galley"),
    rowingMode
  );
}

function makeOarBankTriangles(frameIndex, waterlineY, config, rowingMode = SHIP_ROWING_MODE_AHEAD) {
  validateProceduralOarStroke(config);
  const oarColor = { r: 140, g: 86, b: 48 };
  const bladeColor = { r: 111, g: 68, b: 44 };
  const triangles = [];
  for (const { pivot, side, bankIndex } of oarBankPivotEntries(waterlineY, config)) {
    const { sweep, lift } = rowingOarPose(frameIndex, {
      strokeDirection: rowingBankStrokeDirection(rowingMode, side)
    });
    const inboardLength = config.inboardLength ?? 0;
    const shaftStart = new THREE.Vector3(
      pivot.x - side * inboardLength * Math.cos(sweep),
      pivot.y,
      pivot.z - inboardLength * Math.sin(sweep)
    );
    const shaftEnd = new THREE.Vector3(
      pivot.x + side * config.shaftLength * Math.cos(sweep),
      pivot.y + lift,
      pivot.z + config.shaftLength * Math.sin(sweep)
    );
    const bladeEnd = shaftEnd.clone().add(new THREE.Vector3(
      side * config.bladeLength * Math.cos(sweep),
      lift * 0.35,
      config.bladeLength * Math.sin(sweep)
    ));
    const rasterFeature = `oar:${side}:${bankIndex}`;
    triangles.push(...makePrismTriangles(shaftStart, shaftEnd, config.shaftRadius, oarColor, 5, rasterFeature));
    triangles.push(...makePrismTriangles(shaftEnd, bladeEnd, config.bladeRadius, bladeColor, 5, rasterFeature));
  }
  return triangles;
}

function validateProceduralOarStroke(config, poseOptions = {}) {
  const bladeTipOffsets = Array.from({ length: SHIP_ROWING_FRAME_COUNT }, (_, frameIndex) => {
    const { lift } = rowingOarPose(frameIndex, poseOptions);
    return config.pivotYOffset + lift * 1.35;
  });
  if (Math.min(...bladeTipOffsets) >= 0 || Math.max(...bladeTipOffsets) <= 0) {
    throw new Error(
      `Procedural oar stroke must move its blade tip below and above the waterline: ` +
      `${bladeTipOffsets.join(",")}`
    );
  }
}

function oarBankPivotEntries(waterlineY, config) {
  const pivotY = proceduralOarPivotY(waterlineY, config);
  const entries = [];
  for (const side of [-1, 1]) {
    for (let bankIndex = 0; bankIndex < config.bankPositions.length; bankIndex++) {
      const bankZ = config.bankPositions[bankIndex] + (config.bankOffset ?? 0);
      entries.push({
        side,
        bankIndex,
        pivot: new THREE.Vector3(side * config.pivotHalfBeam, pivotY, bankZ)
      });
    }
  }
  return entries;
}

function proceduralOarPivotY(waterlineY, config) {
  if (!Number.isFinite(waterlineY)) throw new Error(`Procedural oars require a finite waterline: ${waterlineY}`);
  if (!Number.isFinite(config.pivotYOffset) || config.pivotYOffset < 0) {
    throw new Error(`Procedural oar pivot must be at or above the waterline: ${config.pivotYOffset}`);
  }
  return waterlineY + config.pivotYOffset;
}

function evenBankPositions(min, max, count) {
  if (!Number.isFinite(min) || !Number.isFinite(max) || !(max > min)) {
    throw new Error(`Oar bank requires a finite increasing range, got ${min} to ${max}`);
  }
  if (!Number.isInteger(count) || count < 2) {
    throw new Error(`Oar bank requires at least two positions, got ${count}`);
  }
  return Array.from({ length: count }, (_, index) => min + (max - min) * index / (count - 1));
}

function proceduralOarConfig(slug) {
  if (slug === "penjajap") return {
    kind: "bank",
    bankPositions: evenBankPositions(-0.58, 0.55, 4),
    pivotYOffset: 0.045,
    pivotHalfBeam: 0.16,
    shaftLength: 0.44,
    bladeLength: 0.14,
    shaftRadius: 0.036,
    bladeRadius: 0.057
  };
  if (slug === "lancaran") return {
    kind: "bank",
    bankPositions: evenBankPositions(-0.68, 0.65, 5),
    pivotYOffset: 0.05,
    pivotHalfBeam: 0.20,
    shaftLength: 0.48,
    bladeLength: 0.15,
    shaftRadius: 0.038,
    bladeRadius: 0.06
  };
  if (slug === "royal-lancaran") return {
    kind: "bank",
    bankPositions: evenBankPositions(-0.76, 0.72, 6),
    pivotYOffset: 0.055,
    pivotHalfBeam: 0.24,
    shaftLength: 0.52,
    bladeLength: 0.16,
    shaftRadius: 0.04,
    bladeRadius: 0.063
  };
  if (slug === "kelulus") return {
    kind: "bank",
    // Four representative stations preserve the full bank span without making
    // this compact hull read as a comb at the production sprite size.
    bankPositions: evenBankPositions(-0.68, 0.66, 4),
    pivotYOffset: 0.045,
    pivotHalfBeam: 0.19,
    shaftLength: 0.47,
    bladeLength: 0.14,
    shaftRadius: 0.03,
    bladeRadius: 0.05
  };
  if (slug === FUSTA_SLUG || slug === "mediterranean-galley" || slug === "galleass") {
    const isFusta = slug === FUSTA_SLUG;
    const config = scaledProceduralOarConfig({
    kind: "bank",
    bankPositions: evenBankPositions(-0.45, 0.45, slug === "galleass" ? 6 : isFusta ? 3 : 4),
    pivotYOffset: 0.05,
    pivotHalfBeam: 0.19,
    shaftLength: 0.57,
    bladeLength: 0.16,
    shaftRadius: 0.032,
    bladeRadius: 0.05
    }, slug === "galleass" ? GALLEASS_SCALE : isFusta ? FUSTA_SCALE : MEDITERRANEAN_GALLEY_SCALE);
    return slug === "galleass"
      ? { ...config, shaftLength: config.shaftLength * 0.97, bladeLength: config.bladeLength * 0.97 }
      : config;
  }
  if (slug === "joseon-turtle-ship") return {
    kind: "bank",
    bankPositions: evenBankPositions(-0.48, 0.48, 5),
    bankOffset: 0.28,
    pivotYOffset: 0.04,
    pivotHalfBeam: 0.27,
    shaftLength: 0.48,
    bladeLength: 0.14,
    shaftRadius: 0.032,
    bladeRadius: 0.052
  };
  if (slug === JOSEON_HYEOPSEON_SLUG) return {
    kind: "bank",
    bankPositions: evenBankPositions(-0.37, 0.37, 4),
    pivotYOffset: 0.075,
    pivotHalfBeam: 0.23,
    shaftLength: 0.27,
    bladeLength: 0.085,
    shaftRadius: 0.023,
    bladeRadius: 0.038
  };
  if (slug === "joseon-panokseon") return {
    kind: "bank",
    bankPositions: evenBankPositions(-0.5, 0.5, 6),
    pivotYOffset: 0.1,
    pivotHalfBeam: 0.31,
    shaftLength: 0.32,
    bladeLength: 0.1,
    shaftRadius: 0.03,
    bladeRadius: 0.048
  };
  if (slug === "japanese-kuribune") return {
    kind: "bank",
    // The source has four stations per side. Retain its first and third
    // measured stations so the animated silhouette stays readable at 32px.
    bankPositions: [-0.070, -0.252],
    pivotYOffset: 0.045,
    pivotHalfBeam: 0.10,
    shaftLength: 0.14,
    bladeLength: 0.045,
    shaftRadius: 0.010,
    bladeRadius: 0.016
  };
  if (slug === "japanese-kobaya") return {
    kind: "bank",
    // Four representative stations per side keep the small hull open and
    // readable while still communicating its oar-driven speed.
    bankPositions: evenBankPositions(-0.52, 0.31, 4),
    pivotYOffset: 0.035,
    pivotHalfBeam: 0.19,
    inboardLength: 0.075,
    shaftLength: 0.26,
    bladeLength: 0.08,
    shaftRadius: 0.014,
    bladeRadius: 0.022
  };
  if (slug === "japanese-sekibune") return {
    kind: "bank",
    // The purchased reconstruction carries 32 oars per side. Five oversized
    // representative stations per side preserve the rowing silhouette without
    // collapsing into a comb at the production sprite size.
    bankPositions: evenBankPositions(-0.64, 0.61, 5),
    pivotYOffset: 0.04,
    pivotHalfBeam: 0.27,
    // Carry each shaft through the gunwale so its root cannot rasterize as a
    // detached segment beside the hull at oblique headings.
    inboardLength: 0.09,
    shaftLength: 0.31,
    bladeLength: 0.09,
    shaftRadius: 0.017,
    bladeRadius: 0.027
  };
  if (slug === "japanese-atakebune") return {
    kind: "bank",
    bankPositions: evenBankPositions(-0.42, 0.28, 4),
    pivotYOffset: 0.035,
    pivotHalfBeam: 0.35,
    shaftLength: 0.28,
    bladeLength: 0.09,
    shaftRadius: 0.03,
    bladeRadius: 0.048
  };
  if (slug === "viking-longship") return {
    kind: "bank",
    bankPositions: evenBankPositions(-0.56, 0.56, 6),
    pivotYOffset: 0.05,
    pivotHalfBeam: 0.18,
    shaftLength: 0.5,
    bladeLength: 0.14,
    shaftRadius: 0.03,
    bladeRadius: 0.048
  };
  if (slug === "mesoamerican-dugout-canoe") return {
    kind: "paddles",
    paddles: [
      { side: -1, z: -0.23 },
      { side: 1, z: 0.23 }
    ],
    pivotYOffset: 0.11,
    pivotHalfBeam: 0.22,
    shaftLength: 0.3,
    bladeLength: 0.1,
    shaftRadius: 0.016,
    bladeRadius: 0.028
  };
  throw new Error(`No procedural oar configuration for ship: ${slug}`);
}

function proceduralOarPivotPoints(slug, waterlineY) {
  const config = proceduralOarConfig(slug);
  if (config.kind === "bank") {
    return oarBankPivotEntries(waterlineY, config).map((entry) => entry.pivot);
  }
  if (config.kind === "paddles") {
    return paddlePivotEntries(waterlineY, config).map((entry) => entry.pivot);
  }
  throw new Error(`Unknown procedural oar configuration kind for ${slug}: ${config.kind}`);
}

function kelulusConfig() {
  const slug = "kelulus";
  return {
    slug,
    label: "Kelulus",
    category: "Malay oar-and-sail vessel",
    assetLabel: "Procedural Kelulus",
    identifiedType: "fifteenth- and early-sixteenth-century Malay kelulus",
    identificationConfidence: "medium",
    identificationNotes: "Independent low-poly reconstruction emphasizing a narrow double-ended hull, canted tanja sail, and palm-thatch shelter.",
    ...KELULUS_MODEL_CREDIT,
    stats: shipStatsForSlug(slug),
    modelPath: join(kelulusSourceRoot, "scene.gltf"),
    targetModelMaxDim: 1.86,
    sideViewTargetModelMaxDim: 1.68,
    scaleMode: "small-malay-oar-sail-vessel",
    outputDir: unityFleetOutputRoot,
    outputPrefix: `${slug}-${SHIP_SPRITE_HEADING_SUFFIX}`,
    waterlineOffsetY: -0.02,
    waterlineImmersionRatio: 0.34,
    wakeWaterlineBand: 0.2,
    animationFrameCount: SHIP_ROWING_FRAME_COUNT,
    animationTrianglesForFrame: kelulusTrianglesForFrame,
    animationContactSheetPath: join(
      appRoot,
      "docs/ship-reference/kelulus/kelulus-rowing-frames.png"
    ),
    animationReviewHeading: 4
  };
}

function kelulusTrianglesForFrame(hullTriangles, frameIndex, waterlineY, rowingMode) {
  return [
    ...hullTriangles,
    ...makeOarBankTriangles(frameIndex, waterlineY, proceduralOarConfig("kelulus"), rowingMode)
  ];
}

const MALAY_WARSHIP_RENDER_SPECS = Object.freeze({
  penjajap: Object.freeze({
    label: "Penjajap",
    category: "Malay coastal raider",
    assetLabel: "Procedural Penjajap",
    identifiedType: "fifteenth- and early-sixteenth-century Malay penjajap",
    identificationNotes: "Original one-masted reconstruction with a lean shallow hull, canted tanja sail, fighting platform, and animated oars.",
    credit: PENJAJAP_MODEL_CREDIT,
    targetModelMaxDim: 1.90,
    sideViewTargetModelMaxDim: 1.74,
    waterlineOffsetY: -0.02
  }),
  lancaran: Object.freeze({
    label: "Lancaran",
    category: "Malay fleet warship",
    assetLabel: "Procedural Lancaran",
    identifiedType: "fifteenth- and early-sixteenth-century Malay lancaran",
    identificationNotes: "Original two-masted reconstruction emphasizing the long shallow hull, tanja sail plan, fighting platforms, and animated oar banks.",
    credit: LANCARAN_MODEL_CREDIT,
    targetModelMaxDim: 2.16,
    sideViewTargetModelMaxDim: 1.74,
    waterlineOffsetY: 0.04
  }),
  "royal-lancaran": Object.freeze({
    label: "Royal Lancaran",
    category: "Malay command warship",
    assetLabel: "Procedural Royal Lancaran",
    identifiedType: "large royal Malay lancaran",
    identificationNotes: "Original three-masted command-ship reconstruction with dyed sails, gilt rails, a royal pavilion, fighting platforms, and animated oar banks.",
    credit: ROYAL_LANCARAN_MODEL_CREDIT,
    targetModelMaxDim: 2.42,
    sideViewTargetModelMaxDim: 1.78,
    waterlineOffsetY: 0.04
  })
});

function malayWarshipConfig(slug) {
  const spec = MALAY_WARSHIP_RENDER_SPECS[slug];
  if (!spec) throw new Error(`Unsupported procedural Malay warship: ${slug}`);
  return {
    slug,
    label: spec.label,
    category: spec.category,
    assetLabel: spec.assetLabel,
    identifiedType: spec.identifiedType,
    identificationConfidence: "medium",
    identificationNotes: spec.identificationNotes,
    ...spec.credit,
    stats: shipStatsForSlug(slug),
    modelPath: join(proceduralShipSourceRoot, slug, "scene.gltf"),
    targetModelMaxDim: spec.targetModelMaxDim,
    sideViewTargetModelMaxDim: spec.sideViewTargetModelMaxDim,
    scaleMode: "procedural-malay-oar-sail-vessel",
    outputDir: unityFleetOutputRoot,
    outputPrefix: `${slug}-${SHIP_SPRITE_HEADING_SUFFIX}`,
    waterlineOffsetY: spec.waterlineOffsetY,
    waterlineImmersionRatio: 0.34,
    wakeWaterlineBand: 0.2,
    animationFrameCount: SHIP_ROWING_FRAME_COUNT,
    animationTrianglesForFrame: (hullTriangles, frameIndex, waterlineY, rowingMode) => [
      ...hullTriangles,
      ...makeOarBankTriangles(frameIndex, waterlineY, proceduralOarConfig(slug), rowingMode)
    ],
    animationContactSheetPath: join(
      appRoot,
      "docs/ship-reference",
      slug,
      `${slug}-rowing-frames.png`
    ),
    animationReviewHeading: 4
  };
}

function vikingLongshipConfig() {
  const slug = "viking-longship";
  return {
    slug,
    label: "Viking Longship",
    category: "special quest ship",
    assetLabel: "Viking Ship 1",
    identifiedType: "Norse-style clinker-built longship reconstruction",
    identificationConfidence: "high",
    identificationNotes: "Bright red-and-white square sail retained from the source model; animated oars are procedurally added.",
    ...UNITY_FLEET_MODEL_CREDIT,
    stats: shipStatsForSlug(slug),
    modelPath: join(unityShipModelRoot, "viking ships/viking ship 1.fbx"),
    texturePath: unityShipTexturePath,
    targetModelMaxDim: 2.05,
    sideViewTargetModelMaxDim: 1.8,
    scaleMode: "special-longship",
    outputDir: unityFleetOutputRoot,
    outputPrefix: `${slug}-${SHIP_SPRITE_HEADING_SUFFIX}`,
    wakeWaterlineBand: 0.2,
    animationFrameCount: SHIP_ROWING_FRAME_COUNT,
    animationTrianglesForFrame: vikingLongshipTrianglesForFrame,
    animationContactSheetPath: join(
      appRoot,
      "docs/ship-reference/viking-longship-rowing-frames.png"
    )
  };
}

function vikingLongshipTrianglesForFrame(hullTriangles, frameIndex, waterlineY, rowingMode) {
  return [
    ...hullTriangles,
    ...makeOarBankTriangles(frameIndex, waterlineY, proceduralOarConfig("viking-longship"), rowingMode)
  ];
}

function mesoamericanCanoeTrianglesForFrame(hullTriangles, frameIndex, waterlineY, rowingMode) {
  return [
    ...hullTriangles,
    ...makeCanoePaddleTriangles(
      frameIndex,
      waterlineY,
      proceduralOarConfig("mesoamerican-dugout-canoe"),
      rowingMode
    )
  ];
}

function makeCanoePaddleTriangles(
  frameIndex,
  waterlineY,
  config,
  rowingMode = SHIP_ROWING_MODE_AHEAD
) {
  const poseOptions = { sweepScale: 0.5, liftScale: 0.1 };
  validateProceduralOarStroke(config, poseOptions);
  const shaftColor = { r: 140, g: 86, b: 48 };
  const bladeColor = { r: 111, g: 68, b: 44 };
  const triangles = [];

  for (const { paddle, pivot } of paddlePivotEntries(waterlineY, config)) {
    const { sweep, lift } = rowingOarPose(frameIndex, {
      ...poseOptions,
      strokeDirection: rowingBankStrokeDirection(rowingMode, paddle.side)
    });
    const shaftEnd = new THREE.Vector3(
      pivot.x + paddle.side * config.shaftLength * Math.cos(sweep),
      pivot.y + lift,
      pivot.z + config.shaftLength * Math.sin(sweep)
    );
    const bladeEnd = shaftEnd.clone().add(new THREE.Vector3(
      paddle.side * config.bladeLength * Math.cos(sweep),
      lift * 0.35,
      config.bladeLength * Math.sin(sweep)
    ));
    triangles.push(...makePrismTriangles(pivot, shaftEnd, config.shaftRadius, shaftColor, 5));
    triangles.push(...makePrismTriangles(shaftEnd, bladeEnd, config.bladeRadius, bladeColor, 5));
  }
  return triangles;
}

function paddlePivotEntries(waterlineY, config) {
  const pivotY = proceduralOarPivotY(waterlineY, config);
  return config.paddles.map((paddle) => ({
    paddle,
    pivot: new THREE.Vector3(paddle.side * config.pivotHalfBeam, pivotY, paddle.z)
  }));
}

function makePrismTriangles(start, end, radius, color, sides, rasterFeature = null) {
  const axis = end.clone().sub(start).normalize();
  const reference = Math.abs(axis.y) < 0.9
    ? new THREE.Vector3(0, 1, 0)
    : new THREE.Vector3(0, 0, 1);
  const u = new THREE.Vector3().crossVectors(axis, reference).normalize().multiplyScalar(radius);
  const v = new THREE.Vector3().crossVectors(axis, u).normalize().multiplyScalar(radius);
  const rings = [start, end].map((center) => Array.from({ length: sides }, (_, index) => {
    const angle = index / sides * Math.PI * 2;
    return center.clone()
      .addScaledVector(u, Math.cos(angle))
      .addScaledVector(v, Math.sin(angle));
  }));
  const triangles = [];
  const addTriangle = (a, b, c) => triangles.push({
    points: [a.clone(), b.clone(), c.clone()],
    uvs: null,
    color,
    textureSampler: null,
    rasterFeature
  });
  for (let index = 0; index < sides; index++) {
    const next = (index + 1) % sides;
    addTriangle(rings[0][index], rings[1][index], rings[1][next]);
    addTriangle(rings[0][index], rings[1][next], rings[0][next]);
    addTriangle(start, rings[0][next], rings[0][index]);
    addTriangle(end, rings[1][index], rings[1][next]);
  }
  return triangles;
}

async function renderMediterraneanGalley() {
  const config = mediterraneanGalleyConfig();
  const result = await renderStandaloneShip(
    config,
    "mediterraneanGalleyGenerator",
    "--mediterranean-galley"
  );
  console.log(result.entry.files.sheet);
  console.log(config.animationContactSheetPath);
}

async function renderFusta() {
  const config = fustaConfig();
  const result = await renderStandaloneShip(config, "fustaGenerator", "--fusta");
  console.log(result.entry.files.sheet);
  console.log(config.animationContactSheetPath);
  console.log(config.orientationReviewPath);
}

async function renderGalleass() {
  const config = galleassConfig();
  const result = await renderStandaloneShip(config, "galleassGenerator", "--galleass");
  console.log(result.entry.files.sheet);
  console.log(config.animationContactSheetPath);
}

async function renderVikingLongship() {
  const config = vikingLongshipConfig();
  const result = await renderStandaloneShip(config, "vikingLongshipGenerator", "--viking-longship");
  console.log(result.entry.files.sheet);
  console.log(config.animationContactSheetPath);
}

async function renderJoseonTurtleShip() {
  const config = joseonTurtleShipConfig();
  const result = await renderStandaloneShip(
    config,
    "joseonTurtleShipGenerator",
    "--joseon-turtle-ship"
  );
  console.log(result.entry.files.sheet);
  console.log(config.animationContactSheetPath);
}

async function renderJoseonHyeopseon() {
  const config = joseonHyeopseonConfig();
  const result = await renderStandaloneShip(
    config,
    "joseonHyeopseonGenerator",
    "--joseon-hyeopseon"
  );
  console.log(result.entry.files.sheet);
  console.log(config.animationContactSheetPath);
  console.log(config.orientationReviewPath);
}

async function renderJoseonPanokseon() {
  const config = joseonPanokseonConfig();
  const result = await renderStandaloneShip(
    config,
    "joseonPanokseonGenerator",
    "--joseon-panokseon"
  );
  console.log(result.entry.files.sheet);
  console.log(config.animationContactSheetPath);
}

async function renderJapaneseAtakebune() {
  const config = japaneseAtakebuneConfig();
  const result = await renderStandaloneShip(
    config,
    "japaneseAtakebuneGenerator",
    "--japanese-atakebune"
  );
  console.log(result.entry.files.sheet);
  console.log(config.animationContactSheetPath);
}

async function renderJapaneseKuribune() {
  const config = japaneseKuribuneConfig();
  const result = await renderStandaloneShip(
    config,
    "japaneseKuribuneGenerator",
    "--japanese-kuribune"
  );
  console.log(result.entry.files.sheet);
  console.log(config.animationContactSheetPath);
}

async function renderJapaneseKobaya() {
  const config = japaneseKobayaConfig();
  const result = await renderStandaloneShip(
    config,
    "japaneseKobayaGenerator",
    "--japanese-kobaya"
  );
  console.log(result.entry.files.sheet);
  console.log(config.animationContactSheetPath);
}

async function renderJapaneseSekibune() {
  const config = japaneseSekibuneConfig();
  const result = await renderStandaloneShip(
    config,
    "japaneseSekibuneGenerator",
    "--japanese-sekibune"
  );
  console.log(result.entry.files.sheet);
  console.log(config.animationContactSheetPath);
}

async function renderSpanishNao() {
  const config = spanishNaoConfig();
  const result = await renderStandaloneShip(config, "spanishNaoGenerator", "--spanish-nao");
  console.log(result.entry.files.sheet);
}

async function renderPortugueseCarrack() {
  const config = portugueseCarrackConfig();
  const result = await renderStandaloneShip(
    config,
    "portugueseCarrackGenerator",
    "--portuguese-carrack"
  );
  console.log(result.entry.files.sheet);
}

async function renderGogiartDhow() {
  const config = gogiartDhowConfig();
  const result = await renderStandaloneShip(config, "gogiartDhowGenerator", "--gogiart-dhow");
  console.log(result.entry.files.sheet);
}

async function renderOceanDhow() {
  const config = oceanDhowConfig();
  const result = await renderStandaloneShip(config, "oceanDhowGenerator", "--ocean-dhow");
  console.log(result.entry.files.sheet);
}

async function renderCyc3wGalleon() {
  const config = cyc3wGalleonConfig();
  const result = await renderStandaloneShip(config, "cyc3wGalleonGenerator", "--cyc3w-galleon");
  console.log(result.entry.files.sheet);
}

async function renderNusantaranOutrigger() {
  const config = nusantaranOutriggerConfig();
  const result = await renderStandaloneShip(
    config,
    "nusantaranOutriggerGenerator",
    "--nusantaran-outrigger"
  );
  console.log(result.entry.files.sheet);
}

async function renderOttomanCoastalTrader() {
  const config = ottomanCoastalTraderConfig();
  const result = await renderStandaloneShip(
    config,
    "ottomanCoastalTraderGenerator",
    "--ottoman-coastal-trader"
  );
  console.log(result.entry.files.sheet);
}

const WHALE_RENDER_CONFIGS = Object.freeze([
  whaleRenderConfig(
    "north-atlantic-right-whale",
    "North Atlantic right whale",
    NORTH_ATLANTIC_RIGHT_WHALE_MODEL_CREDIT,
    join(northAtlanticRightWhaleSourceRoot, "scene.gltf"),
    2.3
  ),
  whaleRenderConfig(
    "blue-whale",
    "Blue whale",
    BLUE_WHALE_MODEL_CREDIT,
    join(blueWhaleSourceRoot, "scene.gltf"),
    2.45
  ),
  whaleRenderConfig(
    "humpback-whale",
    "Humpback whale",
    HUMPBACK_WHALE_MODEL_CREDIT,
    join(humpbackWhaleSourceRoot, "scene.gltf"),
    2.3
  ),
  whaleRenderConfig(
    "southern-minke-whale",
    "Southern minke whale",
    SOUTHERN_MINKE_WHALE_MODEL_CREDIT,
    join(southernMinkeWhaleSourceRoot, "scene.gltf"),
    1.72
  ),
  whaleRenderConfig(
    "sperm-whale",
    "Sperm whale",
    SPERM_WHALE_MODEL_CREDIT,
    join(spermWhaleSourceRoot, "source/model.fbx"),
    2.3,
    { texturePath: join(spermWhaleSourceRoot, "textures/SpermWhale_albedo.jpeg") }
  ),
  whaleRenderConfig(
    "white-sperm-whale",
    "White whale",
    SPERM_WHALE_MODEL_CREDIT,
    join(spermWhaleSourceRoot, "source/model.fbx"),
    2.38,
    {
      texturePath: join(spermWhaleSourceRoot, "textures/SpermWhale_albedo.jpeg"),
      colorTransform: whiteWhaleColor
    }
  )
]);

function whaleRenderConfig(slug, label, credit, modelPath, targetModelMaxDim, extra = {}) {
  return Object.freeze({
    slug,
    label,
    category: "animal",
    ...credit,
    modelPath,
    outputDir: animalOutputRoot,
    outputPrefix: `${slug}-${SHIP_SPRITE_HEADING_SUFFIX}`,
    targetModelMaxDim,
    waterlineBoundsRatio: 0.5,
    exactSinkDepth: true,
    skipSelfShadowMaps: true,
    ...extra
  });
}

function whiteWhaleColor(color) {
  const luminance = color.r * 0.2126 + color.g * 0.7152 + color.b * 0.0722;
  const value = clamp255(172 + luminance * 0.28);
  return { r: value, g: clamp255(value + 3), b: clamp255(value + 5), a: color.a ?? 255 };
}

const ICEBERG_VARIANTS = Object.freeze([
  Object.freeze({
    slug: "iceberg-small",
    label: "Small Iceberg",
    targetModelMaxDim: 1.05,
    transform: icebergShapeTransform({ x: 0.78, z: 1.12, yaw: -0.22 })
  }),
  Object.freeze({
    slug: "iceberg-medium",
    label: "Medium Iceberg",
    targetModelMaxDim: 1.58,
    transform: icebergShapeTransform({ x: 1.08, z: 0.9, yaw: 0.14 })
  }),
  Object.freeze({
    slug: "iceberg-large",
    label: "Large Iceberg",
    targetModelMaxDim: 2.3,
    transform: icebergShapeTransform({ x: 1, z: 1, yaw: 0 })
  })
]);

function icebergShapeTransform({ x: xScale, z: zScale, yaw }) {
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  return (point) => {
    const x = point.x * xScale;
    const z = point.z * zScale;
    point.x = x * cos + z * sin;
    point.z = -x * sin + z * cos;
    return point;
  };
}

function icebergRenderConfig(spec) {
  return {
    slug: spec.slug,
    label: spec.label,
    category: "iceberg",
    ...ICEBERG_MODEL_CREDIT,
    modelPath: join(icebergSourceRoot, "iceberg-1.glb"),
    outputDir: icebergOutputRoot,
    outputPrefix: `${spec.slug}-${SHIP_SPRITE_HEADING_SUFFIX}`,
    targetModelMaxDim: spec.targetModelMaxDim,
    waterlineBoundsRatio: 0.6,
    exactSinkDepth: true,
    skipSelfShadowMaps: true,
    scaleMode: "shared-iceberg-scale",
    collectOptions: { transformPoint: spec.transform }
  };
}

async function renderIcebergs() {
  const configs = ICEBERG_VARIANTS.map(icebergRenderConfig);
  for (const config of configs) config.sourceMaxDim = await measureSourceMaxDim(config.modelPath);
  const bounds = [];
  for (const config of configs) bounds.push(...await measureRenderedBounds(config));
  const sharedFrameScale = fixedFrameScale(bounds);
  for (const config of configs) config.frameScale = sharedFrameScale;

  const icebergs = [];
  mkdirSync(icebergReferenceOutputRoot, { recursive: true });
  for (const config of configs) {
    console.log(`render ${config.slug}`);
    const rendered = await renderShipSpriteSet(config);
    const reviewPath = join(icebergReferenceOutputRoot, `${config.slug}-cardinal-headings.png`);
    writeShipOrientationReview(rendered.sheet, { label: config.label, outputPath: reviewPath });
    const { sheet, wakeAnchors, flagAnchors, flagAnchorSelection, flagAnchorModelPoint, ...entry } = rendered;
    icebergs.push(entry);
  }
  const manifestPath = join(icebergOutputRoot, "manifest.json");
  writeFileSync(manifestPath, `${JSON.stringify({
    generatedBy: "tools/render-sail-ship-sprites.mjs --icebergs",
    frameSize,
    headings,
    sheetCols,
    variants: icebergs
  }, null, 2)}\n`);
  console.log(manifestPath);
}

async function renderWhales() {
  const animals = [];
  for (const config of WHALE_RENDER_CONFIGS) {
    console.log(`render ${config.slug}`);
    const rendered = await renderShipSpriteSet(config);
    const {
      sheet,
      wakeAnchors,
      hullFootprints,
      flagAnchors,
      flagAnchorSelection,
      flagAnchorModelPoint,
      ...manifestEntry
    } = rendered;
    animals.push(manifestEntry);
    console.log(rendered.files.sheet);
    console.log(rendered.files.sinkDepth);
  }
  const manifestPath = join(animalOutputRoot, "whale-manifest.json");
  writeFileSync(manifestPath, `${JSON.stringify({
    generatedBy: "tools/render-sail-ship-sprites.mjs --whales",
    animals
  }, null, 2)}\n`);
  console.log(manifestPath);
}

function standaloneShipConfigForSlug(slug) {
  const unityModelPath = unityShipModels().find((candidate) => (
    unityShipConfig(candidate).slug === slug
  ));
  if (unityModelPath) return unityShipConfig(unityModelPath);
  if (slug === "mediterranean-galley") return mediterraneanGalleyConfig();
  if (slug === FUSTA_SLUG) return fustaConfig();
  if (slug === "galleass") return galleassConfig();
  if (slug === "joseon-turtle-ship") return joseonTurtleShipConfig();
  if (slug === JOSEON_HYEOPSEON_SLUG) return joseonHyeopseonConfig();
  if (slug === "joseon-panokseon") return joseonPanokseonConfig();
  if (slug === "japanese-kuribune") return japaneseKuribuneConfig();
  if (slug === "japanese-kobaya") return japaneseKobayaConfig();
  if (slug === "japanese-sekibune") return japaneseSekibuneConfig();
  if (slug === "japanese-atakebune") return japaneseAtakebuneConfig();
  if (slug === "spanish-nao") return spanishNaoConfig();
  if (slug === "portuguese-carrack") return portugueseCarrackConfig();
  if (slug === "dhow") return gogiartDhowConfig();
  if (slug === "ocean-dhow") return oceanDhowConfig();
  if (slug === "galleon") return cyc3wGalleonConfig();
  if (slug === "nusantaran-outrigger") return nusantaranOutriggerConfig();
  if (slug === "kelulus") return kelulusConfig();
  if (MALAY_WARSHIP_RENDER_SPECS[slug]) return malayWarshipConfig(slug);
  if (slug === "ottoman-coastal-trader") return ottomanCoastalTraderConfig();
  if (slug === "viking-longship") return vikingLongshipConfig();
  throw new Error(`Unsupported standalone comparison ship: ${slug}`);
}

async function renderStandaloneComparison(args) {
  const slug = args.value("--comparison-ship");
  const outputDir = args.value("--output-dir");
  if (!slug) throw new Error("--comparison-ship requires a ship slug");
  if (!outputDir) throw new Error("--comparison-ship requires --output-dir");
  const config = standaloneShipConfigForSlug(slug);
  config.outputDir = resolve(outputDir);
  config.outputPrefix = args.value("--output-prefix") || `${slug}-comparison-${SHIP_SPRITE_HEADING_SUFFIX}`;
  const result = await renderShipReferenceSet(config);
  console.log(result.files.referenceSheet);
}

async function renderStandaloneShip(config, generatorKey, generatorFlag) {
  const sourceScene = await loadScene(config.modelPath);
  config.sourceMaxDim = collectTriangles(sourceScene, {
    targetMaxDim: null,
    ...config.collectOptions
  }).sourceMaxDim;
  validateShipStatsForSlugs([config.slug]);

  console.log(`render ${config.slug}`);
  const rendered = await renderShipSpriteSet(config);
  if (config.orientationReviewPath) {
    writeShipOrientationReview(rendered.sheet, {
      label: config.label,
      outputPath: config.orientationReviewPath
    });
  }
  const manifestPath = join(unityFleetOutputRoot, "manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const { sheet, wakeAnchors, hullFootprints, flagAnchors, ...entry } = rendered;
  manifest.ships = upsertShipEntries(manifest.ships, [entry]);
  manifest.skipped = unityFleetSkippedModels;
  manifest[generatorKey] = `tools/render-sail-ship-sprites.mjs ${generatorFlag}`;
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  const wakePath = join(unityFleetOutputRoot, "wake-anchors.json");
  const wakeManifest = JSON.parse(readFileSync(wakePath, "utf8"));
  wakeManifest.ships[config.slug] = wakeAnchors;
  wakeManifest[generatorKey] = `tools/render-sail-ship-sprites.mjs ${generatorFlag}`;
  writeFileSync(wakePath, `${JSON.stringify(wakeManifest)}\n`);

  upsertShipFrameBake(
    "hull-footprints.json",
    "hull footprint",
    [[config.slug, hullFootprints]],
    generatorKey,
    generatorFlag
  );
  upsertShipFrameBake(
    "flag-anchors.json",
    "flag anchor",
    [[config.slug, flagAnchors]],
    generatorKey,
    generatorFlag
  );

  const sideViewPath = join(unityFleetSideViewOutputRoot, "manifest.json");
  const sideViewManifest = JSON.parse(readFileSync(sideViewPath, "utf8"));
  const sideView = await renderShipSideView(config);
  sideViewManifest.ships = upsertShipEntries(sideViewManifest.ships, [sideView]);
  sideViewManifest[generatorKey] = `tools/render-sail-ship-sprites.mjs ${generatorFlag}`;
  writeFileSync(sideViewPath, `${JSON.stringify(sideViewManifest, null, 2)}\n`);
  return { entry, wakeAnchors, hullFootprints, sideView };
}

function writeShipOrientationReview(sheet, { label, outputPath }) {
  if (!sheet || !Number.isInteger(sheet.width) || !Number.isInteger(sheet.height)) {
    throw new Error(`${label} orientation review requires a sprite sheet`);
  }
  if (typeof outputPath !== "string" || outputPath === "") {
    throw new Error(`${label} orientation review requires an output path`);
  }
  const directions = [
    { label: "RIGHT", frame: 0 },
    { label: "LEFT", frame: headings / 2 },
    { label: "TOWARD US", frame: headings * 3 / 4 },
    { label: "AWAY", frame: headings / 4 }
  ];
  if (directions.some(({ frame }) => !Number.isInteger(frame))) {
    throw new Error(`Orientation review requires cardinal frames for ${headings} headings`);
  }
  const scaledFrame = frameSize * orientationReviewScale;
  const labelHeight = 34;
  const cellWidth = scaledFrame;
  const cellHeight = labelHeight + scaledFrame;
  const review = createCanvas(cellWidth * 2, cellHeight * 2);
  const ctx = review.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#172038";
  ctx.fillRect(0, 0, review.width, review.height);
  ctx.font = "bold 20px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  directions.forEach(({ label: directionLabel, frame }, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = col * cellWidth;
    const y = row * cellHeight;
    const sourceX = (frame % sheetCols) * frameSize;
    const sourceY = Math.floor(frame / sheetCols) * frameSize;
    ctx.strokeStyle = "#566c86";
    ctx.strokeRect(x + 0.5, y + 0.5, cellWidth - 1, cellHeight - 1);
    ctx.fillStyle = "#f4f4f4";
    ctx.fillText(`${directionLabel}  [${frame}]`, x + cellWidth / 2, y + labelHeight / 2);
    ctx.drawImage(
      sheet,
      sourceX,
      sourceY,
      frameSize,
      frameSize,
      x,
      y + labelHeight,
      scaledFrame,
      scaledFrame
    );
  });
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, review.toBuffer("image/png"));
  console.log(outputPath);
}

async function renderUnityShip(slug) {
  if (!slug) throw new Error("--unity-ship requires a ship slug");
  const modelPath = unityShipModels().find((candidate) => unityShipConfig(candidate).slug === slug);
  if (!modelPath) throw new Error(`No Unity fleet ship has slug: ${slug}`);
  const manifest = JSON.parse(readFileSync(join(unityFleetOutputRoot, "manifest.json"), "utf8"));
  const existing = manifest.ships?.find((entry) => entry.slug === slug);
  if (!existing) throw new Error(`Production manifest has no Unity fleet ship: ${slug}`);
  if (!Number.isFinite(existing.targetModelMaxDim) || !Number.isFinite(existing.frameScale)) {
    throw new Error(`Production manifest has incomplete render scale for Unity fleet ship: ${slug}`);
  }
  const config = unityShipConfig(modelPath);
  config.targetModelMaxDim ??= existing.targetModelMaxDim;
  config.frameScale ??= existing.frameScale;
  return renderStandaloneShip(config, "unitySingleShipGenerator", `--unity-ship ${slug}`);
}

async function renderMediterraneanGalleyReference() {
  const config = mediterraneanGalleyConfig();
  config.outputDir = join(repoRoot, "tmp/mediterranean-galley-reference");
  config.outputPrefix = `mediterranean-galley-reference-${SHIP_SPRITE_HEADING_SUFFIX}`;
  config.animationContactScale = 2;
  config.animationContactSheetPath = join(
    appRoot,
    "docs/ship-reference/mediterranean-galley-rowing-frames-large.png"
  );
  await renderShipSpriteSet(config);
  console.log(config.animationContactSheetPath);
}

async function renderKelulusReference() {
  const config = kelulusConfig();
  config.outputDir = kelulusReferenceOutputRoot;
  config.outputPrefix = `kelulus-reference-${SHIP_SPRITE_HEADING_SUFFIX}`;
  rmSync(kelulusReferenceOutputRoot, { recursive: true, force: true });
  mkdirSync(kelulusReferenceOutputRoot, { recursive: true });
  const rendered = await renderShipSpriteSet(config);

  const { canvas: sideView } = await renderShipSideViewCanvas(config, {
    camera: makeSideViewCamera(),
    modelYaw: Math.PI / 2
  });
  const sideViewPath = join(kelulusReferenceOutputRoot, "kelulus-side-view.png");
  writeFileSync(sideViewPath, sideView.toBuffer("image/png"));

  const reviewCamera = makeLevelSideViewCamera();
  const { canvas: waterlineReview, waterlineY } = await renderShipSideViewCanvas(config, {
    camera: reviewCamera,
    modelYaw: Math.PI / 2
  });
  const waterlinePoint = new THREE.Vector3(0, waterlineY, 0).project(reviewCamera);
  const waterlinePixelY = Math.round((1 - waterlinePoint.y) * 0.5 * sideViewHeight);
  const pivotPixels = uniqueProjectedSideViewPixels(
    proceduralOarPivotPoints("kelulus", waterlineY),
    reviewCamera,
    Math.PI / 2,
    "kelulus"
  );
  const reviewCtx = waterlineReview.getContext("2d");
  reviewCtx.fillStyle = waterlineReviewColor;
  reviewCtx.fillRect(0, waterlinePixelY, sideViewWidth, 1);
  reviewCtx.fillStyle = oarPivotReviewColor;
  for (const pivot of pivotPixels) reviewCtx.fillRect(pivot.x - 1, pivot.y - 1, 3, 3);
  const waterlinePath = join(kelulusReferenceOutputRoot, "kelulus-waterline.png");
  writeFileSync(waterlinePath, waterlineReview.toBuffer("image/png"));

  const manifestPath = join(kelulusReferenceOutputRoot, "manifest.json");
  const comparisonPath = join(kelulusReferenceOutputRoot, "kelulus-scale-comparison.png");
  writeFileSync(
    comparisonPath,
    (await makeKelulusScaleComparison(rendered.sheet)).toBuffer("image/png")
  );
  const { sheet, ...manifestEntry } = rendered;
  writeFileSync(manifestPath, `${JSON.stringify({
    generatedBy: "npm run render:kelulus-reference",
    purpose: "Reference review for the playable production Kelulus",
    sideView: portablePath(sideViewPath),
    waterlineReview: portablePath(waterlinePath),
    scaleComparison: portablePath(comparisonPath),
    oarPivotPixels: pivotPixels,
    ship: manifestEntry
  }, null, 2)}\n`);
  console.log(rendered.files.preview);
  console.log(config.animationContactSheetPath);
  console.log(sideViewPath);
  console.log(waterlinePath);
  console.log(comparisonPath);
  console.log(manifestPath);
}

async function renderKelulus() {
  return renderStandaloneShip(kelulusConfig(), "kelulusGenerator", "--kelulus");
}

async function renderMalayWarships() {
  for (const slug of Object.keys(MALAY_WARSHIP_RENDER_SPECS)) {
    await renderStandaloneShip(
      malayWarshipConfig(slug),
      "malayWarshipGenerator",
      "--malay-warships"
    );
  }
}

async function makeKelulusScaleComparison(kelulusSheet) {
  const comparisonRows = [
    { label: "KELULUS", sheet: kelulusSheet },
    {
      label: "NUSANTARAN OUTRIGGER",
      sheet: await loadImage(join(unityFleetOutputRoot, `nusantaran-outrigger-${SHIP_SPRITE_HEADING_SUFFIX}.png`))
    },
    {
      label: "MEDITERRANEAN GALLEY",
      sheet: await loadImage(join(unityFleetOutputRoot, `mediterranean-galley-${SHIP_SPRITE_HEADING_SUFFIX}.png`))
    },
    {
      label: "DHOW",
      sheet: await loadImage(join(unityFleetOutputRoot, `dhow-${SHIP_SPRITE_HEADING_SUFFIX}.png`))
    },
    {
      label: "SMALL JUNK",
      sheet: await loadImage(join(unityFleetOutputRoot, `small-junk-${SHIP_SPRITE_HEADING_SUFFIX}.png`))
    }
  ];
  const reviewHeadings = [0, 4, 8, 12];
  const scale = 4;
  const labelWidth = 190;
  const cellSize = frameSize * scale;
  const rowHeight = cellSize + 2;
  const canvas = createCanvas(labelWidth + reviewHeadings.length * cellSize, comparisonRows.length * rowHeight);
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#14151f";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = "13px monospace";
  ctx.textBaseline = "middle";
  for (let rowIndex = 0; rowIndex < comparisonRows.length; rowIndex++) {
    const row = comparisonRows[rowIndex];
    const y = rowIndex * rowHeight;
    ctx.fillStyle = "#f4ecd8";
    ctx.fillText(row.label, 10, y + cellSize / 2);
    for (let column = 0; column < reviewHeadings.length; column++) {
      const source = sheetCell(reviewHeadings[column], frameSize);
      ctx.drawImage(
        row.sheet,
        source.x,
        source.y,
        frameSize,
        frameSize,
        labelWidth + column * cellSize,
        y,
        cellSize,
        cellSize
      );
    }
  }
  return canvas;
}

function nativeBoatConfigs() {
  return [
    {
      slug: "polynesian-voyaging-canoe",
      label: "Polynesian Voyaging Canoe",
      category: "native boat",
      assetLabel: "Polynesian Voyaging Canoe",
      identifiedType: "double-hulled Polynesian voyaging canoe",
      identificationConfidence: "high",
      identificationNotes: "Model depicts a Hawaiian double-hulled ocean-going voyaging canoe.",
      ...POLYNESIAN_CANOE_MODEL_CREDIT,
      stats: shipStatsForSlug("polynesian-voyaging-canoe"),
      modelPath: join(nativeBoatSourceRoot, "polynesian-voyaging-canoe/scene.gltf"),
      targetModelMaxDim: 2.25,
      scaleMode: "native-boat-relative",
      outputDir: unityFleetOutputRoot,
      outputPrefix: `polynesian-voyaging-canoe-${SHIP_SPRITE_HEADING_SUFFIX}`,
      waterlineOffsetY: -0.995,
      expectedWaterlineHullCount: 2
    },
    {
      slug: "mesoamerican-dugout-canoe",
      label: "Dugout Canoe",
      category: "native boat",
      assetLabel: "Low Poly Canoe",
      identifiedType: "open paddled canoe",
      identificationConfidence: "medium",
      identificationNotes: "Generic intact canoe used as a readable stand-in for a Mesoamerican coastal dugout.",
      ...MESOAMERICAN_CANOE_MODEL_CREDIT,
      stats: shipStatsForSlug("mesoamerican-dugout-canoe"),
      modelPath: join(nativeBoatSourceRoot, "mesoamerican-dugout-canoe/scene.gltf"),
      targetModelMaxDim: 1.85,
      scaleMode: "native-boat-relative",
      outputDir: unityFleetOutputRoot,
      outputPrefix: `mesoamerican-dugout-canoe-${SHIP_SPRITE_HEADING_SUFFIX}`,
      waterlineOffsetY: 0.023,
      animationFrameCount: SHIP_ROWING_FRAME_COUNT,
      animationTrianglesForFrame: mesoamericanCanoeTrianglesForFrame,
      animationContactSheetPath: join(
        appRoot,
        "docs/ship-reference/mesoamerican-canoe-paddling-frames.png"
      ),
      animationReviewHeading: 5
    }
  ];
}

async function renderNativeBoats() {
  const configs = nativeBoatConfigs();
  for (const config of configs) {
    config.sourceMaxDim = await measureSourceMaxDim(config.modelPath);
  }
  const fleetBounds = [];
  for (const config of configs) fleetBounds.push(...await measureRenderedBounds(config));
  const sharedFrameScale = fixedFrameScale(fleetBounds);
  for (const config of configs) config.frameScale = sharedFrameScale;
  validateShipStatsForSlugs(configs.map((config) => config.slug));

  const rendered = [];
  for (const config of configs) {
    console.log(`render native boat ${config.slug}`);
    rendered.push(await renderShipSpriteSet(config));
  }

  const manifestPath = join(unityFleetOutputRoot, "manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  manifest.ships = upsertShipEntries(
    manifest.ships,
    rendered.map(({ sheet, wakeAnchors, hullFootprints, flagAnchors, ...entry }) => entry)
  );
  manifest.nativeBoatGenerator = "tools/render-sail-ship-sprites.mjs --native-boats";
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  const wakePath = join(unityFleetOutputRoot, "wake-anchors.json");
  const wakeManifest = JSON.parse(readFileSync(wakePath, "utf8"));
  for (const entry of rendered) wakeManifest.ships[entry.slug] = entry.wakeAnchors;
  wakeManifest.nativeBoatGenerator = "tools/render-sail-ship-sprites.mjs --native-boats";
  writeFileSync(wakePath, `${JSON.stringify(wakeManifest)}\n`);

  upsertShipFrameBake(
    "hull-footprints.json",
    "hull footprint",
    rendered.map((entry) => [entry.slug, entry.hullFootprints]),
    "nativeBoatGenerator",
    "--native-boats"
  );
  upsertShipFrameBake(
    "flag-anchors.json",
    "flag anchor",
    rendered.map((entry) => [entry.slug, entry.flagAnchors]),
    "nativeBoatGenerator",
    "--native-boats"
  );

  const sideViewPath = join(unityFleetSideViewOutputRoot, "manifest.json");
  const sideViewManifest = JSON.parse(readFileSync(sideViewPath, "utf8"));
  const sideViews = [];
  for (const config of configs) sideViews.push(await renderShipSideView(config));
  sideViewManifest.ships = upsertShipEntries(sideViewManifest.ships, sideViews);
  sideViewManifest.nativeBoatGenerator = "tools/render-sail-ship-sprites.mjs --native-boats";
  writeFileSync(sideViewPath, `${JSON.stringify(sideViewManifest, null, 2)}\n`);
}

function upsertShipEntries(existing, replacements) {
  const replacementBySlug = new Map(replacements.map((entry) => [entry.slug, entry]));
  const result = existing.map((entry) => {
    const replacement = replacementBySlug.get(entry.slug);
    if (!replacement) return entry;
    replacementBySlug.delete(entry.slug);
    return replacement;
  });
  return [...result, ...replacementBySlug.values()];
}

function upsertShipFrameBake(fileName, label, entries, generatorKey, generatorFlag) {
  const path = join(unityFleetOutputRoot, fileName);
  const bake = JSON.parse(readFileSync(path, "utf8"));
  if (bake.frameSize !== frameSize || bake.headings !== headings || !bake.ships) {
    throw new Error(`Existing ship ${label} bake has incompatible dimensions`);
  }
  for (const [slug, frames] of entries) bake.ships[slug] = frames;
  bake[generatorKey] = `tools/render-sail-ship-sprites.mjs ${generatorFlag}`;
  writeFileSync(path, `${JSON.stringify(bake)}\n`);
}

async function renderUnityFleetSideViews() {
  resetUnityFleetSideViewOutput();
  const configs = [...productionShipRenderConfigs().values()];
  const fleetScaledConfigs = configs.filter((config) => config.scaleMode === "source-relative-fleet");
  if (fleetScaledConfigs.length === 0) {
    throw new Error("Production side views have no source-relative Unity fleet");
  }
  for (const config of configs) {
    config.sourceMaxDim = await measureSourceMaxDim(config.modelPath);
  }
  const largestSourceMaxDim = Math.max(...fleetScaledConfigs.map((config) => config.sourceMaxDim));
  for (const config of fleetScaledConfigs) {
    config.targetModelMaxDim ??= fleetTargetModelMaxDim(config.sourceMaxDim, largestSourceMaxDim);
  }
  validateShipStatsForSlugs(configs.map((config) => config.slug));

  const entries = [];
  for (const config of configs) {
    console.log(`side view ${config.slug}`);
    const entry = await renderShipSideView(config);
    entries.push(entry);
    console.log(`  ${entry.file}`);
  }
  const manifestPath = join(unityFleetSideViewOutputRoot, "manifest.json");
  writeFileSync(manifestPath, `${JSON.stringify({
    generatedBy: "tools/render-sail-ship-sprites.mjs --unity-fleet-side-views",
    scaleMode: "production-roster",
    palette: "Resurrect 64",
    width: sideViewWidth,
    height: sideViewHeight,
    ships: entries
  }, null, 2)}\n`);
  console.log(manifestPath);
}

async function renderUnityFleet() {
  resetUnityFleetOutput();
  const models = unityShipModels();
  if (models.length === 0) {
    throw new Error(`No Unity ship FBX files found in ${unityShipModelRoot}`);
  }

  const measuredConfigs = [];
  for (const modelPath of models) {
    const config = unityShipConfig(modelPath);
    config.sourceMaxDim = await measureSourceMaxDim(modelPath);
    measuredConfigs.push(config);
  }
  const vikingConfig = vikingLongshipConfig();
  vikingConfig.sourceMaxDim = await measureSourceMaxDim(vikingConfig.modelPath);
  measuredConfigs.push(vikingConfig);
  const largestSourceMaxDim = Math.max(...measuredConfigs.map((config) => config.sourceMaxDim));
  for (const config of measuredConfigs) {
    config.targetModelMaxDim ??= fleetTargetModelMaxDim(config.sourceMaxDim, largestSourceMaxDim);
  }

  const fleetBounds = [];
  for (const config of measuredConfigs) {
    fleetBounds.push(...await measureRenderedBounds(config));
  }
  const sharedFrameScale = fixedFrameScale(fleetBounds);
  for (const config of measuredConfigs) {
    config.frameScale ??= sharedFrameScale;
  }
  validateShipStatsForSlugs(measuredConfigs.map((config) => config.slug));

  const manifest = [];
  for (const config of measuredConfigs) {
    console.log(`render ${config.slug}`);
    const entry = await renderShipSpriteSet(config);
    manifest.push(entry);
    console.log(`  sourceMaxDim=${entry.sourceMaxDim.toFixed(1)} targetModelMaxDim=${entry.targetModelMaxDim.toFixed(3)}`);
    console.log(`  waterlineY=${entry.waterlineY.toFixed(4)}`);
    console.log(`  ${entry.files.sheet}`);
  }

  const manifestForDisk = manifest.map(({ sheet, wakeAnchors, hullFootprints, flagAnchors, ...entry }) => entry);
  const manifestPath = join(unityFleetOutputRoot, "manifest.json");
  const wakeAnchorsPath = join(unityFleetOutputRoot, "wake-anchors.json");
  const hullFootprintsPath = join(unityFleetOutputRoot, "hull-footprints.json");
  const flagAnchorsPath = join(unityFleetOutputRoot, "flag-anchors.json");
  writeFileSync(manifestPath, `${JSON.stringify({
    generatedBy: "tools/render-sail-ship-sprites.mjs --unity-fleet",
    sourceRoot: portablePath(unityShipSourceRoot),
    scaleMode: "source-relative-fleet",
    scaleNotes: `Imported FBX source sizes are preserved through a compressed readability curve so boats stay smaller without becoming illegible at ${frameSize}px.`,
    targetMaxDimForLargestShip: defaultTargetModelMaxDim,
    fleetScaleExponent: unityFleetScaleExponent,
    sharedFrameScale: Number(sharedFrameScale.toFixed(4)),
    skipped: unityFleetSkippedModels,
    ships: manifestForDisk
  }, null, 2)}\n`);
  writeFileSync(wakeAnchorsPath, `${JSON.stringify({
    generatedBy: "tools/render-sail-ship-sprites.mjs --unity-fleet",
    frameSize,
    headings,
    ships: Object.fromEntries(manifest.map((entry) => [entry.slug, entry.wakeAnchors]))
  })}\n`);
  writeFileSync(hullFootprintsPath, `${JSON.stringify({
    generatedBy: "tools/render-sail-ship-sprites.mjs --unity-fleet",
    frameSize,
    headings,
    ships: Object.fromEntries(manifest.map((entry) => [entry.slug, entry.hullFootprints]))
  })}\n`);
  writeFileSync(flagAnchorsPath, `${JSON.stringify({
    generatedBy: "tools/render-sail-ship-sprites.mjs --unity-fleet",
    frameSize,
    headings,
    ships: Object.fromEntries(manifest.map((entry) => [entry.slug, entry.flagAnchors]))
  })}\n`);

  const contactSheet = makeFleetContactSheet(manifest);
  const contactSheetPath = join(unityFleetOutputRoot, "unity-ships-contact-sheet.png");
  writeFileSync(contactSheetPath, contactSheet.toBuffer("image/png"));
  console.log(manifestPath);
  console.log(wakeAnchorsPath);
  console.log(hullFootprintsPath);
  console.log(flagAnchorsPath);
  console.log(contactSheetPath);
}

async function renderAllProductionShips() {
  const rendererPath = fileURLToPath(import.meta.url);
  const stages = [
    "--unity-fleet",
    "--unity-fleet-side-views",
    "--native-boats",
    "--mediterranean-galley",
    "--fusta",
    "--galleass",
    "--joseon-turtle-ship",
    "--joseon-hyeopseon",
    "--joseon-panokseon",
    "--japanese-kuribune",
    "--japanese-kobaya",
    "--japanese-sekibune",
    "--japanese-atakebune",
    "--spanish-nao",
    "--portuguese-carrack",
    "--gogiart-dhow",
    "--ocean-dhow",
    "--cyc3w-galleon",
    "--nusantaran-outrigger",
    "--kelulus",
    "--malay-warships",
    "--ottoman-coastal-trader",
    "--viking-longship",
    "--port-assault-ships"
  ];
  for (const stage of stages) {
    console.log(`production fleet stage ${stage}`);
    const result = spawnSync(
      process.execPath,
      ["--max-old-space-size=8192", rendererPath, stage],
      { cwd: appRoot, env: process.env, stdio: "inherit" }
    );
    if (result.error) throw result.error;
    if (result.status !== 0) {
      throw new Error(`Production fleet stage failed (${result.status}): ${stage}`);
    }
  }
  await bakeAllShipRenderLayers();
  console.log("production fleet stage ship render layers");
}

async function renderRowingShips() {
  await renderNativeBoats();
  await renderMediterraneanGalley();
  await renderFusta();
  await renderGalleass();
  await renderJoseonTurtleShip();
  await renderJoseonPanokseon();
  await renderJapaneseKuribune();
  await renderJapaneseKobaya();
  await renderJapaneseSekibune();
  await renderJapaneseAtakebune();
  await renderKelulus();
  await renderMalayWarships();
  await renderVikingLongship();
}

async function renderUnityFleetReferences() {
  resetUnityFleetReferenceOutput();
  const models = unityShipModels();
  if (models.length === 0) {
    throw new Error(`No Unity ship FBX files found in ${unityShipModelRoot}`);
  }

  const measuredConfigs = [];
  for (const modelPath of models) {
    const config = unityShipConfig(modelPath);
    config.sourceMaxDim = await measureSourceMaxDim(modelPath);
    config.outputDir = unityFleetReferenceOutputRoot;
    config.outputPrefix = `${config.slug}-reference-${SHIP_SPRITE_HEADING_SUFFIX}`;
    measuredConfigs.push(config);
  }
  const vikingConfig = vikingLongshipConfig();
  vikingConfig.sourceMaxDim = await measureSourceMaxDim(vikingConfig.modelPath);
  vikingConfig.outputDir = unityFleetReferenceOutputRoot;
  vikingConfig.outputPrefix = `${vikingConfig.slug}-reference-${SHIP_SPRITE_HEADING_SUFFIX}`;
  measuredConfigs.push(vikingConfig);
  const largestSourceMaxDim = Math.max(...measuredConfigs.map((config) => config.sourceMaxDim));
  for (const config of measuredConfigs) {
    config.targetModelMaxDim ??= fleetTargetModelMaxDim(config.sourceMaxDim, largestSourceMaxDim);
  }

  const fleetBounds = [];
  for (const config of measuredConfigs) {
    fleetBounds.push(...await measureRenderedBounds(config));
  }
  const sharedFrameScale = fixedFrameScale(fleetBounds);
  for (const config of measuredConfigs) {
    config.frameScale ??= sharedFrameScale;
  }
  validateShipStatsForSlugs(measuredConfigs.map((config) => config.slug));

  const references = [];
  for (const config of measuredConfigs) {
    console.log(`reference ${config.slug}`);
    const entry = await renderShipReferenceSet(config);
    references.push(entry);
    console.log(`  ${entry.files.referenceSheet}`);
  }
  for (const config of [gogiartDhowConfig(), oceanDhowConfig(), cyc3wGalleonConfig()]) {
    config.sourceMaxDim = await measureSourceMaxDim(config.modelPath);
    config.outputDir = unityFleetReferenceOutputRoot;
    config.outputPrefix = `${config.slug}-reference-${SHIP_SPRITE_HEADING_SUFFIX}`;
    console.log(`reference ${config.slug}`);
    const entry = await renderShipReferenceSet(config);
    references.push(entry);
    console.log(`  ${entry.files.referenceSheet}`);
  }

  const manifestForDisk = references.map(({ sheet, ...entry }) => entry);
  const manifestPath = join(unityFleetReferenceOutputRoot, "reference-manifest.json");
  writeFileSync(manifestPath, `${JSON.stringify({
    generatedBy: "PIXEL_GLOBE_SHIP_FRAME_SIZE=160 PIXEL_GLOBE_SHIP_RENDER_SIZE=320 PIXEL_GLOBE_SHIP_SHADOW_FRAME_SIZE=320 PIXEL_GLOBE_SHIP_PREVIEW_SCALE=1 tools/render-sail-ship-sprites.mjs --unity-fleet-reference",
    sourceRoot: portablePath(unityShipSourceRoot),
    scaleMode: "source-relative-fleet",
    scaleNotes: "High-resolution review rasters use the same source-relative fleet scale as the gameplay bake.",
    targetMaxDimForLargestShip: defaultTargetModelMaxDim,
    fleetScaleExponent: unityFleetScaleExponent,
    sharedFrameScale: Number(sharedFrameScale.toFixed(4)),
    skipped: unityFleetSkippedModels,
    ships: manifestForDisk
  }, null, 2)}\n`);

  const contactSheet = makeFleetContactSheet(references, { itemScale: 0.5 });
  const contactSheetPath = join(unityFleetReferenceOutputRoot, "unity-ships-reference-contact-sheet.png");
  writeFileSync(contactSheetPath, contactSheet.toBuffer("image/png"));
  console.log(manifestPath);
  console.log(contactSheetPath);
}

function parseArgs(argv) {
  const flags = new Set();
  const values = new Map();
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const equalsIndex = arg.indexOf("=");
    if (equalsIndex >= 0) {
      values.set(arg.slice(0, equalsIndex), arg.slice(equalsIndex + 1));
    } else if (i + 1 < argv.length && !argv[i + 1].startsWith("--")) {
      values.set(arg, argv[i + 1]);
      i++;
    } else {
      flags.add(arg);
    }
  }
  return {
    has(flag) {
      return flags.has(flag) || values.has(flag);
    },
    value(name) {
      return values.get(name);
    }
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.has("--horse-cart")) {
    await renderHorseCart();
    return;
  }
  if (args.has("--llama-caravan")) {
    await renderLlamaCaravan();
    return;
  }
  if (args.has("--dromedary-caravan")) {
    await renderDromedaryCaravan();
    return;
  }
  if (args.has("--bactrian-caravan")) {
    await renderBactrianCaravan();
    return;
  }
  if (args.has("--whales") || args.has("--north-atlantic-right-whale")) {
    await renderWhales();
    return;
  }
  if (args.has("--icebergs")) {
    await renderIcebergs();
    return;
  }
  if (args.has("--waterline-review")) {
    await renderShipWaterlineReview(args.value("--waterline-review") ?? null);
    return;
  }
  if (args.has("--all-production-ships")) {
    await renderAllProductionShips();
    return;
  }
  if (args.has("--unity-ship")) {
    await renderUnityShip(args.value("--unity-ship"));
    return;
  }
  if (args.has("--rowing-ships")) {
    await renderRowingShips();
    return;
  }
  if (args.has("--comparison-ship")) {
    await renderStandaloneComparison(args);
    return;
  }
  if (args.has("--mediterranean-galley-reference")) {
    await renderMediterraneanGalleyReference();
    return;
  }
  if (args.has("--kelulus-reference")) {
    await renderKelulusReference();
    return;
  }
  if (args.has("--kelulus")) {
    await renderKelulus();
    return;
  }
  if (args.has("--malay-warships")) {
    await renderMalayWarships();
    return;
  }
  if (args.has("--mediterranean-galley")) {
    await renderMediterraneanGalley();
    return;
  }
  if (args.has("--fusta")) {
    await renderFusta();
    return;
  }
  if (args.has("--galleass")) {
    await renderGalleass();
    return;
  }
  if (args.has("--viking-longship")) {
    await renderVikingLongship();
    return;
  }
  if (args.has("--joseon-turtle-ship")) {
    await renderJoseonTurtleShip();
    return;
  }
  if (args.has("--joseon-hyeopseon")) {
    await renderJoseonHyeopseon();
    return;
  }
  if (args.has("--joseon-panokseon")) {
    await renderJoseonPanokseon();
    return;
  }
  if (args.has("--japanese-kuribune")) {
    await renderJapaneseKuribune();
    return;
  }
  if (args.has("--japanese-kobaya")) {
    await renderJapaneseKobaya();
    return;
  }
  if (args.has("--japanese-sekibune")) {
    await renderJapaneseSekibune();
    return;
  }
  if (args.has("--japanese-atakebune")) {
    await renderJapaneseAtakebune();
    return;
  }
  if (args.has("--spanish-nao")) {
    await renderSpanishNao();
    return;
  }
  if (args.has("--portuguese-carrack")) {
    await renderPortugueseCarrack();
    return;
  }
  if (args.has("--gogiart-dhow")) {
    await renderGogiartDhow();
    return;
  }
  if (args.has("--ocean-dhow")) {
    await renderOceanDhow();
    return;
  }
  if (args.has("--cyc3w-galleon")) {
    await renderCyc3wGalleon();
    return;
  }
  if (args.has("--port-assault-ships")) {
    await renderPortAssaultShips();
    return;
  }
  if (args.has("--nusantaran-outrigger")) {
    await renderNusantaranOutrigger();
    return;
  }
  if (args.has("--ottoman-coastal-trader")) {
    await renderOttomanCoastalTrader();
    return;
  }
  if (args.has("--native-boats")) {
    await renderNativeBoats();
    return;
  }
  if (args.has("--unity-fleet")) {
    await renderUnityFleet();
    return;
  }
  if (args.has("--unity-fleet-reference")) {
    await renderUnityFleetReferences();
    return;
  }
  if (args.has("--unity-fleet-side-views")) {
    await renderUnityFleetSideViews();
    return;
  }

  const modelPath = args.value("--model")
    ? resolve(args.value("--model"))
    : defaultModelPath;
  const outputDir = args.value("--output-dir")
    ? resolve(args.value("--output-dir"))
    : outputRoot;
  const outputPrefix = args.value("--output-prefix") || `sail-ship-${SHIP_SPRITE_HEADING_SUFFIX}`;
  const texturePath = args.value("--texture") ? resolve(args.value("--texture")) : null;
  const result = await renderShipSpriteSet({
    slug: stripShipHeadingSuffix(outputPrefix),
    label: outputPrefix,
    category: "single",
    modelPath,
    texturePath,
    outputDir,
    outputPrefix
  });
  console.log(`waterlineY=${result.waterlineY.toFixed(4)}`);
  console.log(result.files.sheet);
  console.log(result.files.light);
  console.log(result.files.shade);
  console.log(result.files.shadow);
  console.log(result.files.preview);
  console.log(result.files.lightingPreview);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
