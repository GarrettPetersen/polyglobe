import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas, loadImage } from "../../../examples/globe-demo/node_modules/canvas/index.js";
import * as THREE from "../../../examples/globe-demo/node_modules/three/build/three.module.js";
import { FBXLoader } from "../../../examples/globe-demo/node_modules/three/examples/jsm/loaders/FBXLoader.js";
import { GLTFLoader } from "../../../examples/globe-demo/node_modules/three/examples/jsm/loaders/GLTFLoader.js";
import {
  BOROBUDUR_SHIP_MODEL_CREDIT,
  CYC3W_SAILING_SHIP_MODEL_CREDIT,
  GOGIART_DHOW_MODEL_CREDIT,
  JAPANESE_ATAKEBUNE_MODEL_CREDIT,
  JOSEON_PANOKSEON_MODEL_CREDIT,
  JOSEON_TURTLE_SHIP_MODEL_CREDIT,
  MEDITERRANEAN_GALLEY_MODEL_CREDIT,
  MESOAMERICAN_CANOE_MODEL_CREDIT,
  POLYNESIAN_CANOE_MODEL_CREDIT,
  NAO_VICTORIA_MODEL_CREDIT,
  OTTOMAN_COASTAL_TRADER_MODEL_CREDIT,
  PORTUGUESE_CARRACK_MODEL_CREDIT,
  UNITY_FLEET_MODEL_CREDIT
} from "../src/modelCredits.js";
import { shipStatsForSlug, validateShipStatsForSlugs } from "../src/shipStats.js";
import { hardEdgeSampleMap } from "../src/hardEdgeDownsample.js";
import {
  SHIP_DECK_NORMAL_Y,
  SHIP_WATERLINE_DEPTH_BYTE,
  SHIP_WATERLINE_LEVEL,
  encodedShipWaterlineY,
  shipPixelBakeHeight
} from "../src/shipWaterline.js";
import { estimateShipWaterlineY } from "../src/shipWaterlineSlice.js";
import {
  orientNegativeXForwardYUpToZForward,
  orientPositiveXForwardToZForward,
  orientPositiveXForwardZUpToZForward,
  orientYForwardZDownToZForward,
  rotateY
} from "../src/shipModelOrientation.js";
import {
  SHIP_SHADOW_FRAME_SIZE,
  SHIP_SPRITE_FRAME_SIZE,
  SHIP_SPRITE_HEADINGS,
  SHIP_SPRITE_RENDER_SIZE,
  SHIP_SPRITE_SHEET_COLS
} from "../src/shipSpriteLayout.js";
import { SHIP_ROWING_FRAME_COUNT, rowingOarPose } from "../src/shipRowingAnimation.js";
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
const naoVictoriaSourceRoot = join(shipSourceRoot, "sketchfab/nao-victoria");
const portugueseCarrackSourceRoot = join(shipSourceRoot, "sketchfab/portuguese-carrack");
const gogiartDhowSourceRoot = join(shipSourceRoot, "sketchfab/dhow-gogiart");
const cyc3wSailingShipSourceRoot = join(shipSourceRoot, "sketchfab/cyc3w-sailing-ship");
const borobudurShipSourceRoot = join(shipSourceRoot, "sketchfab/borobudur-sriwijaya");
const ottomanCoastalTraderSourceRoot = join(shipSourceRoot, "sketchfab/ottoman-coastal-trader");
const outputRoot = join(appRoot, "public/assets/vehicles");
const unityFleetOutputRoot = join(outputRoot, "unity-ships");
const unityFleetSideViewOutputRoot = join(unityFleetOutputRoot, "side-views");
const unityFleetReferenceOutputRoot = join(appRoot, "docs/ship-reference/high-res");

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
const shipEdgeShadeScale = 0.76;
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
const japaneseAtakebuneStaticOarMeshes = Object.freeze([
  Object.freeze({
    nodeName: "Object_13",
    parentName: "Cube071_3",
    positionCount: 480
  })
]);
const joseonPanokseonStaticOarMeshes = Object.freeze([
  Object.freeze({
    nodeName: "Object_9",
    parentName: "Object_4",
    positionCount: 2544
  })
]);
const unityFleetExcludedModels = new Map([
  ["boats/boat 2.fbx", "superseded by the credited one-person Dhow model"],
  ["boats/boat 4.fbx", "superseded by the credited gogiart Dhow model"],
  ["ships large/ship large 1.fbx", "superseded by the credited cyc3w Sailing ship model"],
  ["ships large/pirate ship large 2.fbx", "redundant with the more detailed credited Galleon model"],
  ["ships large/ship large 2.fbx", "redundant with the more detailed credited Galleon model"],
  ["ships medium/pirate ship medium.fbx", "redundant with the Brigantine and Xebec"],
  ["ships medium/ship medium 3.fbx", "redundant with the stronger Carrack and Spanish Nao models"],
  ["ships medium/ship medium 6.fbx", "redundant with the more distinctive Heavy Caravel"],
  ["ships small/pirate ship small.fbx", "redundant with the cleaner Coastal Pinnace"],
  ["ships small/ship small 1.fbx", "redundant with the more distinctive Xebec"],
  ["ships small/ship small 4.fbx", "redundant with the credited gogiart Dhow model"],
  ["ships small/ship small 6.fbx", "redundant with the Small Cog and Caravel"],
  ["ships small/ship small 7.fbx", "redundant with the Felucca and credited gogiart Dhow models"],
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
    targetModelMaxDim: 1.55
  }],
  ["boats/chinese boat.fbx", {
    label: "Sampan",
    slug: "sampan",
    identifiedType: "small junk / sampan",
    confidence: "high",
    notes: "Small Chinese-rigged vessel; good for river/coastal Asian traffic."
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
    notes: "Small explorer/trader silhouette."
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
    notes: "Small single-lateen craft."
  }],
  ["ships small/ship small 3.fbx", {
    label: "Coastal Pinnace",
    slug: "cutter",
    identifiedType: "small pinnace",
    confidence: "medium",
    notes: "Small European fore-and-aft silhouette used as a coastal pinnace."
  }],
  ["ships small/ship small 5.fbx", {
    label: "Lateen Barque",
    slug: "ketch",
    identifiedType: "two-masted lateen barque",
    confidence: "medium",
    notes: "Two triangular sails interpreted as a small Mediterranean lateen trader."
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

async function loadGltfMaterialTextureSamplers(path) {
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
      512
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

async function loadTextureSampler(path, maxDimension = Infinity) {
  const image = await loadImage(path);
  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
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
      const points = ids.map((id) => {
        const point = new THREE.Vector3(
          positions.getX(id),
          positions.getY(id),
          positions.getZ(id)
        ).applyMatrix4(matrix);
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
        color: materialColor(material),
        textureSampler: options.materialTextureSamplers?.get(material?.name) || null
      });
    }
  });

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
  return estimateShipWaterlineY(triangles, {
    expectedHullCount: config.expectedWaterlineHullCount ?? 1,
    immersionRatio: config.waterlineImmersionRatio,
    label: config.slug
  });
}

function proceduralAnimationReferenceY(triangles) {
  const yValues = [];
  for (const triangle of triangles) {
    for (const point of triangle.points) yValues.push(point.y);
  }
  if (yValues.length === 0) throw new Error("Procedural ship animation requires model points");
  yValues.sort((a, b) => a - b);
  return yValues[Math.floor((yValues.length - 1) * 0.08)];
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

  const rotation = new THREE.Matrix4().makeRotationY(modelYawForScreenHeading(headingIndex, camera));

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
      featureId
    }, {
      x: screenNormal.x,
      y: -screenNormal.y,
      z: screenNormal.z
    }, size);
  }

  ctx.putImageData(image, 0, 0);
  return { canvas, normals, positions, features, casters: casters || [] };
}

function modelYawForScreenHeading(headingIndex, camera) {
  const desired = frameScreenHeading(headingIndex);
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
  if (surface.colorTransform) color = surface.colorTransform(color);
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

function makeFrame(rendered, bounds, scale) {
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
  const drawW = Math.max(1, Math.round(bounds.width * scale));
  const drawH = Math.max(1, Math.round(bounds.height * scale));
  const drawX = Math.floor((frameSize - drawW) / 2);
  const drawY = Math.floor((frameSize - drawH) / 2);
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

function copyFrameToSheet(frame, sheetCtx, frameIndex) {
  const cell = sheetCell(frameIndex, frameSize);
  sheetCtx.putImageData(edgeShadedFrameImage(frame, sheetCtx), cell.x, cell.y);
}

function makeSinkDepthSheet(frames, waterlineY) {
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
      const height = shipPixelBakeHeight(
        frame.positions[pixel * 3 + 1],
        normalY,
        encodedWaterlineY,
        waterlineRasterPadding
      );
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

function makeHullFootprints(frames, waterlineY, waterlineBand = footprintWaterlineBand) {
  return frames.map((frame, frameIndex) => makeHullFootprint(frame, frameIndex, waterlineY, waterlineBand));
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
  const polygon = convexHull(points).map((point) => ({
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

function convexHull(points) {
  const unique = [...new Map(points.map((point) => [`${point.x},${point.y}`, point])).values()]
    .sort((a, b) => a.x - b.x || a.y - b.y);
  if (unique.length < 3) return unique;
  const lower = [];
  for (const point of unique) {
    while (lower.length >= 2 && hullTurn(lower.at(-2), lower.at(-1), point) <= 0) lower.pop();
    lower.push(point);
  }
  const upper = [];
  for (let i = unique.length - 1; i >= 0; i--) {
    const point = unique[i];
    while (upper.length >= 2 && hullTurn(upper.at(-2), upper.at(-1), point) <= 0) upper.pop();
    upper.push(point);
  }
  lower.pop();
  upper.pop();
  return [...lower, ...upper];
}

function hullTurn(a, b, c) {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
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
  return alignHorizontalWakeShoulders({
    stern: wakeAnchorPoint(sternProjection, stern.lateral, direction, side),
    positiveShoulder: positiveShoulder || mirrorWakeShoulder(negativeShoulder, direction, side),
    negativeShoulder: negativeShoulder || mirrorWakeShoulder(positiveShoulder, direction, side)
  }, direction);
}

function alignHorizontalWakeShoulders(anchors, direction) {
  if (Math.abs(direction.y) > 1e-6) return anchors;
  const shoulderCenterY = (anchors.positiveShoulder.y + anchors.negativeShoulder.y) / 2;
  const yOffset = Math.round(anchors.stern.y - shoulderCenterY);
  return {
    stern: anchors.stern,
    positiveShoulder: {
      x: anchors.positiveShoulder.x,
      y: anchors.positiveShoulder.y + yOffset
    },
    negativeShoulder: {
      x: anchors.negativeShoulder.x,
      y: anchors.negativeShoulder.y + yOffset
    }
  };
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
  const materialTextureSamplers = await loadGltfMaterialTextureSamplers(config.modelPath);
  const model = collectTriangles(scene, {
    targetMaxDim: config.targetModelMaxDim ?? defaultTargetModelMaxDim,
    materialTextureSamplers,
    ...config.collectOptions
  });
  const hullTriangles = model.triangles;
  const waterline = estimateWaterlineForConfig(hullTriangles, config);
  const waterlineY = waterline.y;
  const animationReferenceY = config.animationTrianglesForFrame
    ? proceduralAnimationReferenceY(hullTriangles)
    : waterlineY;
  const triangles = config.animationTrianglesForFrame
    ? config.animationTrianglesForFrame(hullTriangles, 0, animationReferenceY)
    : hullTriangles;
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
  const renderedHeadings = Array.from({ length: headings }, (_, i) => renderHeading(triangles, i, camera, renderOptions));
  const boundsByHeading = renderedHeadings.map((rendered) => alphaBounds(rendered.canvas));
  const frameScale = config.frameScale ?? fixedFrameScale(boundsByHeading);
  const frames = renderedHeadings.map((rendered, i) => makeFrame(rendered, boundsByHeading[i], frameScale));
  const footprintFrames = config.animationTrianglesForFrame
    ? Array.from({ length: headings }, (_, i) => {
        const rendered = renderHeading(hullTriangles, i, camera, renderOptions);
        return makeFrame(rendered, boundsByHeading[i], frameScale);
      })
    : frames;
  for (let i = 0; i < headings; i++) {
    copyFrameToSheet(frames[i], sheetCtx, i);
  }
  const sinkDepth = makeSinkDepthSheet(frames, waterlineY);
  const wakeAnchors = makeWakeAnchors(frames, waterlineY, config.wakeWaterlineBand);
  const hullFootprints = makeHullFootprints(footprintFrames, waterlineY, config.footprintWaterlineBand);

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
  const animationFiles = config.animationFrameCount
    ? await renderShipAnimationSheets({
      config,
      hullTriangles,
      waterlineY,
      animationReferenceY,
      camera,
      renderOptions,
      frameScale,
      firstSheet: sheet,
      firstFrames: frames
    })
    : null;
  return {
    slug: config.slug || config.outputPrefix.replace(/-16-headings$/, ""),
    label: config.label || config.outputPrefix,
    category: config.category || "default",
    assetLabel: config.assetLabel || config.label || config.outputPrefix,
    identifiedType: config.identifiedType || config.label || config.outputPrefix,
    identificationConfidence: config.identificationConfidence || "unknown",
    identificationNotes: config.identificationNotes || "",
    ...(config.collectOptions?.requiredExcludedMeshes ? {
      removedSourceMeshes: config.collectOptions.requiredExcludedMeshes.map((spec) => ({ ...spec }))
    } : {}),
    ...(config.creator ? { creator: config.creator } : {}),
    ...(config.license ? { license: config.license } : {}),
    ...(config.sourceTitle ? { sourceTitle: config.sourceTitle } : {}),
    sourceModel: portablePath(config.modelPath),
    sourceTexture: config.texturePath ? portablePath(config.texturePath) : null,
    sourceMaxDim: Number(model.sourceMaxDim.toFixed(4)),
    targetModelMaxDim: Number(model.targetMaxDim.toFixed(4)),
    frameScale: Number(frameScale.toFixed(4)),
    scaleMode: config.scaleMode || "fit-model",
    waterlineY,
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
        rowingSinkDepth: animationFiles.sinkDepthPaths.map(portablePath)
      } : {})
    },
    sheet
  };
}

async function renderShipAnimationSheets({
  config,
  hullTriangles,
  waterlineY,
  animationReferenceY,
  camera,
  renderOptions,
  frameScale,
  firstSheet,
  firstFrames
}) {
  const animationSheets = [firstSheet];
  const animationFrames = [firstFrames];
  const spritePaths = [];
  const sinkDepthPaths = [];
  const basePrefix = config.outputPrefix.replace(/-16-headings$/, "");
  for (let frameIndex = 0; frameIndex < config.animationFrameCount; frameIndex++) {
    let sheet = animationSheets[frameIndex];
    let frames = animationFrames[frameIndex];
    if (!sheet) {
      const triangles = config.animationTrianglesForFrame(hullTriangles, frameIndex, animationReferenceY);
      const renderedHeadings = Array.from(
        { length: headings },
        (_, headingIndex) => renderHeading(triangles, headingIndex, camera, renderOptions)
      );
      const boundsByHeading = renderedHeadings.map((rendered) => alphaBounds(rendered.canvas));
      frames = renderedHeadings.map((rendered, headingIndex) => (
        makeFrame(rendered, boundsByHeading[headingIndex], frameScale)
      ));
      sheet = createCanvas(frameSize * sheetCols, frameSize * Math.ceil(headings / sheetCols));
      const sheetCtx = sheet.getContext("2d");
      sheetCtx.imageSmoothingEnabled = false;
      for (let headingIndex = 0; headingIndex < headings; headingIndex++) {
        copyFrameToSheet(frames[headingIndex], sheetCtx, headingIndex);
      }
      animationSheets.push(sheet);
      animationFrames.push(frames);
    }
    if (!frames) throw new Error(`Missing ship animation geometry for frame ${frameIndex}`);
    const spritePath = join(config.outputDir, `${basePrefix}-rowing-${frameIndex}-16-headings.png`);
    const sinkDepthPath = join(
      config.outputDir,
      `${basePrefix}-rowing-${frameIndex}-16-headings-sink-depth.png`
    );
    const sinkDepth = makeSinkDepthSheet(frames, waterlineY);
    writeFileSync(spritePath, sheet.toBuffer("image/png"));
    writeFileSync(sinkDepthPath, sinkDepth.sheet.toBuffer("image/png"));
    spritePaths.push(spritePath);
    sinkDepthPaths.push(sinkDepthPath);
  }
  if (config.animationContactSheetPath) {
    mkdirSync(dirname(config.animationContactSheetPath), { recursive: true });
    const contactSheet = makeRowingAnimationContactSheet(
      animationSheets,
      config.animationContactScale,
      config.animationReviewHeading
    );
    writeFileSync(config.animationContactSheetPath, contactSheet.toBuffer("image/png"));
  }
  return { spritePaths, sinkDepthPaths };
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
    scaleMode: "source-relative-fleet",
    outputDir: unityFleetOutputRoot,
    outputPrefix: `${rosterEntry.slug}-16-headings`
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
  return Array.from({ length: headings }, (_, i) => (
    alphaBounds(renderHeading(model.triangles, i, camera, {
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
  const materialTextureSamplers = await loadGltfMaterialTextureSamplers(config.modelPath);
  const model = collectTriangles(scene, {
    targetMaxDim: config.targetModelMaxDim ?? defaultTargetModelMaxDim,
    materialTextureSamplers,
    ...config.collectOptions
  });
  const waterlineY = estimateWaterlineForConfig(model.triangles, config).y;
  const animationReferenceY = config.animationTrianglesForFrame
    ? proceduralAnimationReferenceY(model.triangles)
    : waterlineY;
  const triangles = config.animationTrianglesForFrame
    ? config.animationTrianglesForFrame(model.triangles, 0, animationReferenceY)
    : model.triangles;
  const camera = makeCamera();
  const sheet = createCanvas(frameSize * sheetCols, frameSize * Math.ceil(headings / sheetCols));
  const sheetCtx = sheet.getContext("2d");
  sheetCtx.clearRect(0, 0, sheet.width, sheet.height);
  sheetCtx.imageSmoothingEnabled = false;

  const renderOptions = {
    textureSampler,
    colorTransform: config.colorTransform,
    waterlineY
  };
  const renderedHeadings = Array.from({ length: headings }, (_, i) => renderHeading(triangles, i, camera, renderOptions));
  const boundsByHeading = renderedHeadings.map((rendered) => alphaBounds(rendered.canvas));
  const frameScale = config.frameScale ?? fixedFrameScale(boundsByHeading);
  const frames = renderedHeadings.map((rendered, i) => makeFrame(rendered, boundsByHeading[i], frameScale));
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

function shadeEdgesAndQuantizeToResurrect(canvas) {
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
      const edgeScale = pixelTouchesTransparency(source, x, y, canvas.width, canvas.height)
        ? shipEdgeShadeScale
        : 1;
      const color = nearestResurrectColor(
        source[offset] * edgeScale,
        source[offset + 1] * edgeScale,
        source[offset + 2] * edgeScale
      );
      image.data[offset] = color.r;
      image.data[offset + 1] = color.g;
      image.data[offset + 2] = color.b;
      image.data[offset + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
}

async function renderShipSideView(config) {
  const scene = await loadScene(config.modelPath);
  const textureSampler = config.texturePath ? await loadTextureSampler(config.texturePath) : null;
  const materialTextureSamplers = await loadGltfMaterialTextureSamplers(config.modelPath);
  const model = collectTriangles(scene, {
    targetMaxDim: config.sideViewTargetModelMaxDim ?? config.targetModelMaxDim,
    materialTextureSamplers,
    ...config.collectOptions
  });
  const waterlineY = estimateWaterlineForConfig(model.triangles, config).y;
  const animationReferenceY = config.animationTrianglesForFrame
    ? proceduralAnimationReferenceY(model.triangles)
    : waterlineY;
  const triangles = config.animationTrianglesForFrame
    ? config.animationTrianglesForFrame(model.triangles, 0, animationReferenceY)
    : model.triangles;
  const renderViewport = {
    width: sideViewWidth * sideViewRenderScale,
    height: sideViewHeight * sideViewRenderScale
  };
  const rendered = renderHeading(triangles, config.sideViewHeading ?? 0, makeSideViewCamera(), {
    textureSampler,
    colorTransform: config.colorTransform,
    waterlineY
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

function mediterraneanGalleyConfig() {
  const slug = "mediterranean-galley";
  return {
    slug,
    label: "Mediterranean Galley",
    category: "Mediterranean warship",
    assetLabel: "Russian 22-bank Baltic galley",
    identifiedType: "sixteenth-century Mediterranean-style sailing galley",
    identificationConfidence: "high",
    identificationNotes: "An unfurled-sail galley model adapted with a readable animated bank of oars.",
    ...MEDITERRANEAN_GALLEY_MODEL_CREDIT,
    stats: shipStatsForSlug(slug),
    modelPath: join(mediterraneanGalleySourceRoot, "scene.gltf"),
    targetModelMaxDim: 2.22,
    frameScale: 0.6667,
    sideViewTargetModelMaxDim: 1.9,
    scaleMode: "galley-pixel-derivative",
    outputDir: unityFleetOutputRoot,
    outputPrefix: `${slug}-16-headings`,
    wakeWaterlineBand: 0.22,
    skipSelfShadowMaps: true,
    collectOptions: {
      includeMesh: (node) => mediterraneanGalleyMeshNames.has(node.name)
    },
    animationFrameCount: SHIP_ROWING_FRAME_COUNT,
    animationTrianglesForFrame: mediterraneanGalleyTrianglesForFrame,
    animationContactSheetPath: join(
      appRoot,
      "docs/ship-reference/mediterranean-galley-rowing-frames.png"
    )
  };
}

function mediterraneanGalleyTrianglesForFrame(hullTriangles, frameIndex, waterlineY) {
  return [
    ...hullTriangles,
    ...makeGalleyOarTriangles(frameIndex, waterlineY)
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
    sideViewTargetModelMaxDim: 2.05,
    scaleMode: "joseon-warship",
    outputDir: unityFleetOutputRoot,
    outputPrefix: `${slug}-16-headings`,
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

function joseonTurtleShipTrianglesForFrame(hullTriangles, frameIndex, waterlineY) {
  return [
    ...hullTriangles,
    ...makeOarBankTriangles(frameIndex, waterlineY, {
      bankPositions: evenBankPositions(-0.48, 0.48, 5),
      bankOffset: 0.28,
      pivotYOffset: -0.45,
      pivotHalfBeam: 0.27,
      shaftLength: 0.48,
      bladeLength: 0.14,
      shaftRadius: 0.032,
      bladeRadius: 0.052
    })
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
    outputPrefix: `${slug}-16-headings`,
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

function joseonPanokseonTrianglesForFrame(hullTriangles, frameIndex, waterlineY) {
  return [
    ...hullTriangles,
    ...makeOarBankTriangles(frameIndex, waterlineY, {
      bankPositions: evenBankPositions(-0.5, 0.5, 6),
      pivotYOffset: 0.1,
      pivotHalfBeam: 0.31,
      shaftLength: 0.32,
      bladeLength: 0.1,
      shaftRadius: 0.03,
      bladeRadius: 0.048
    })
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
    outputPrefix: `${slug}-16-headings`,
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
    frameScale: 0.56,
    sideViewTargetModelMaxDim: 2.0,
    colorTransform: spanishNaoTextureColor,
    scaleMode: "spanish-nao",
    outputDir: unityFleetOutputRoot,
    outputPrefix: `${slug}-16-headings`,
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
    scaleMode: "portuguese-carrack",
    outputDir: unityFleetOutputRoot,
    outputPrefix: `${slug}-16-headings`,
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
    frameScale: 0.6,
    sideViewTargetModelMaxDim: 0.95,
    scaleMode: "standalone-source-relative",
    outputDir: unityFleetOutputRoot,
    outputPrefix: `${slug}-16-headings`,
    wakeWaterlineBand: 0.18,
    collectOptions: {
      transformPoint: orientGogiartDhowPoint
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
    colorTransform: cyc3wSailingShipTextureColor,
    scaleMode: "standalone-source-relative",
    outputDir: unityFleetOutputRoot,
    outputPrefix: `${slug}-16-headings`,
    wakeWaterlineBand: 0.2,
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
    outputPrefix: `${slug}-16-headings`,
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
    label: "Ottoman Coastal Trader",
    category: "Ottoman merchant",
    assetLabel: "Ottoman Coastal Trade Tall Ship 3D Model",
    identifiedType: "armed Ottoman coastal merchant",
    identificationConfidence: "medium",
    identificationNotes: "A substantial square-rigged merchant model used as an Ottoman-specific regional trading hull rather than a named naval class.",
    ...OTTOMAN_COASTAL_TRADER_MODEL_CREDIT,
    stats: shipStatsForSlug(slug),
    modelPath: join(ottomanCoastalTraderSourceRoot, "scene.gltf"),
    targetModelMaxDim: 2.1,
    frameScale: 0.6,
    sideViewTargetModelMaxDim: 2.0,
    scaleMode: "ottoman-regional-merchant",
    outputDir: unityFleetOutputRoot,
    outputPrefix: `${slug}-16-headings`,
    wakeWaterlineBand: 0.2,
    skipSelfShadowMaps: true
  };
}

function spanishNaoTextureColor(color) {
  return liftTextureColor(color, { rScale: 1.75, gScale: 1.65, bScale: 1.5, rOffset: 20, gOffset: 18, bOffset: 14 });
}

function cyc3wSailingShipTextureColor(color) {
  return liftTextureColor(color, { rScale: 1.4, gScale: 1.4, bScale: 1.4, rOffset: 16, gOffset: 16, bOffset: 16 });
}

function liftTextureColor(color, { rScale, gScale, bScale, rOffset, gOffset, bOffset }) {
  return {
    r: clamp255(color.r * rScale + rOffset),
    g: clamp255(color.g * gScale + gOffset),
    b: clamp255(color.b * bScale + bOffset)
  };
}

function orientAtakebunePoint(point) {
  return vectorFromCoordinates(orientNegativeXForwardYUpToZForward(point));
}

function orientTurtleShipPoint(point) {
  return vectorFromCoordinates(orientPositiveXForwardToZForward(point));
}

function orientPanokseonPoint(point) {
  return vectorFromCoordinates(orientYForwardZDownToZForward(point));
}

function orientPortugueseCarrackPoint(point) {
  return vectorFromCoordinates(orientNegativeXForwardYUpToZForward(point));
}

function orientGogiartDhowPoint(point) {
  return vectorFromCoordinates(orientNegativeXForwardYUpToZForward(point));
}

function orientCyc3wSailingShipPoint(point) {
  const oriented = orientNegativeXForwardYUpToZForward(point);
  return vectorFromCoordinates(rotateY(oriented, -Math.PI / 9));
}

function orientBorobudurShipPoint(point) {
  return vectorFromCoordinates(orientNegativeXForwardYUpToZForward(point));
}

function vectorFromCoordinates(point) {
  return new THREE.Vector3(point.x, point.y, point.z);
}

function japaneseAtakebuneTrianglesForFrame(hullTriangles, frameIndex, waterlineY) {
  return [
    ...hullTriangles,
    ...makeOarBankTriangles(frameIndex, waterlineY, {
      bankPositions: evenBankPositions(-0.42, 0.28, 4),
      pivotYOffset: 0.035,
      pivotHalfBeam: 0.35,
      shaftLength: 0.28,
      bladeLength: 0.09,
      shaftRadius: 0.03,
      bladeRadius: 0.048
    })
  ];
}

function makeGalleyOarTriangles(frameIndex, waterlineY) {
  return makeOarBankTriangles(frameIndex, waterlineY, {
    bankPositions: evenBankPositions(-0.45, 0.45, 5),
    pivotYOffset: 0.21,
    pivotHalfBeam: 0.19,
    shaftLength: 0.57,
    bladeLength: 0.16,
    shaftRadius: 0.032,
    bladeRadius: 0.05
  });
}

function makeOarBankTriangles(frameIndex, waterlineY, config) {
  const { sweep, lift } = rowingOarPose(frameIndex);
  const oarColor = { r: 140, g: 86, b: 48 };
  const bladeColor = { r: 111, g: 68, b: 44 };
  const triangles = [];
  const pivotY = waterlineY + config.pivotYOffset;
  for (const side of [-1, 1]) {
    for (let bankIndex = 0; bankIndex < config.bankPositions.length; bankIndex++) {
      const bankZ = config.bankPositions[bankIndex] + (config.bankOffset ?? 0);
      const pivot = new THREE.Vector3(side * config.pivotHalfBeam, pivotY, bankZ);
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
      triangles.push(...makePrismTriangles(pivot, shaftEnd, config.shaftRadius, oarColor, 5, rasterFeature));
      triangles.push(...makePrismTriangles(shaftEnd, bladeEnd, config.bladeRadius, bladeColor, 5, rasterFeature));
    }
  }
  return triangles;
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
    outputPrefix: `${slug}-16-headings`,
    wakeWaterlineBand: 0.2,
    animationFrameCount: SHIP_ROWING_FRAME_COUNT,
    animationTrianglesForFrame: vikingLongshipTrianglesForFrame,
    animationContactSheetPath: join(
      appRoot,
      "docs/ship-reference/viking-longship-rowing-frames.png"
    )
  };
}

function vikingLongshipTrianglesForFrame(hullTriangles, frameIndex, waterlineY) {
  return [
    ...hullTriangles,
    ...makeOarBankTriangles(frameIndex, waterlineY, {
      bankPositions: evenBankPositions(-0.56, 0.56, 6),
      pivotYOffset: 0.19,
      pivotHalfBeam: 0.18,
      shaftLength: 0.5,
      bladeLength: 0.14,
      shaftRadius: 0.03,
      bladeRadius: 0.048
    })
  ];
}

function mesoamericanCanoeTrianglesForFrame(hullTriangles, frameIndex, waterlineY) {
  return [
    ...hullTriangles,
    ...makeCanoePaddleTriangles(frameIndex, waterlineY, {
      paddles: [
        { side: -1, z: -0.23 },
        { side: 1, z: 0.23 }
      ],
      pivotYOffset: 0.13,
      pivotHalfBeam: 0.22,
      shaftLength: 0.3,
      bladeLength: 0.1,
      shaftRadius: 0.016,
      bladeRadius: 0.028
    })
  ];
}

function makeCanoePaddleTriangles(frameIndex, waterlineY, config) {
  const { sweep, lift } = rowingOarPose(frameIndex, { sweepScale: 0.5, liftScale: 0.06 });
  const shaftColor = { r: 140, g: 86, b: 48 };
  const bladeColor = { r: 111, g: 68, b: 44 };
  const pivotY = waterlineY + config.pivotYOffset;
  const triangles = [];

  for (const paddle of config.paddles) {
    const pivot = new THREE.Vector3(paddle.side * config.pivotHalfBeam, pivotY, paddle.z);
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

function standaloneShipConfigForSlug(slug) {
  if (slug === "mediterranean-galley") return mediterraneanGalleyConfig();
  if (slug === "joseon-turtle-ship") return joseonTurtleShipConfig();
  if (slug === "joseon-panokseon") return joseonPanokseonConfig();
  if (slug === "japanese-atakebune") return japaneseAtakebuneConfig();
  if (slug === "spanish-nao") return spanishNaoConfig();
  if (slug === "portuguese-carrack") return portugueseCarrackConfig();
  if (slug === "dhow") return gogiartDhowConfig();
  if (slug === "galleon") return cyc3wGalleonConfig();
  if (slug === "nusantaran-outrigger") return nusantaranOutriggerConfig();
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
  config.outputPrefix = args.value("--output-prefix") || `${slug}-comparison-16-headings`;
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
  const manifestPath = join(unityFleetOutputRoot, "manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const { sheet, wakeAnchors, hullFootprints, ...entry } = rendered;
  manifest.ships = upsertShipEntries(manifest.ships, [entry]);
  manifest.skipped = unityFleetSkippedModels;
  manifest[generatorKey] = `tools/render-sail-ship-sprites.mjs ${generatorFlag}`;
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  const wakePath = join(unityFleetOutputRoot, "wake-anchors.json");
  const wakeManifest = JSON.parse(readFileSync(wakePath, "utf8"));
  wakeManifest.ships[config.slug] = wakeAnchors;
  wakeManifest[generatorKey] = `tools/render-sail-ship-sprites.mjs ${generatorFlag}`;
  writeFileSync(wakePath, `${JSON.stringify(wakeManifest)}\n`);

  upsertHullFootprints(config.slug, hullFootprints, generatorKey, generatorFlag);

  const sideViewPath = join(unityFleetSideViewOutputRoot, "manifest.json");
  const sideViewManifest = JSON.parse(readFileSync(sideViewPath, "utf8"));
  const sideView = await renderShipSideView(config);
  sideViewManifest.ships = upsertShipEntries(sideViewManifest.ships, [sideView]);
  sideViewManifest[generatorKey] = `tools/render-sail-ship-sprites.mjs ${generatorFlag}`;
  writeFileSync(sideViewPath, `${JSON.stringify(sideViewManifest, null, 2)}\n`);
  return { entry, wakeAnchors, hullFootprints, sideView };
}

async function renderMediterraneanGalleyReference() {
  const config = mediterraneanGalleyConfig();
  config.outputDir = join(repoRoot, "tmp/mediterranean-galley-reference");
  config.outputPrefix = "mediterranean-galley-reference-16-headings";
  config.animationContactScale = 2;
  config.animationContactSheetPath = join(
    appRoot,
    "docs/ship-reference/mediterranean-galley-rowing-frames-large.png"
  );
  await renderShipSpriteSet(config);
  console.log(config.animationContactSheetPath);
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
      outputPrefix: "polynesian-voyaging-canoe-16-headings",
      expectedWaterlineHullCount: 2
    },
    {
      slug: "mesoamerican-dugout-canoe",
      label: "Mesoamerican Dugout Canoe",
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
      outputPrefix: "mesoamerican-dugout-canoe-16-headings",
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
    rendered.map(({ sheet, wakeAnchors, hullFootprints, ...entry }) => entry)
  );
  manifest.nativeBoatGenerator = "tools/render-sail-ship-sprites.mjs --native-boats";
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  const wakePath = join(unityFleetOutputRoot, "wake-anchors.json");
  const wakeManifest = JSON.parse(readFileSync(wakePath, "utf8"));
  for (const entry of rendered) wakeManifest.ships[entry.slug] = entry.wakeAnchors;
  wakeManifest.nativeBoatGenerator = "tools/render-sail-ship-sprites.mjs --native-boats";
  writeFileSync(wakePath, `${JSON.stringify(wakeManifest)}\n`);

  for (const entry of rendered) {
    upsertHullFootprints(entry.slug, entry.hullFootprints, "nativeBoatGenerator", "--native-boats");
  }

  const sideViewPath = join(unityFleetSideViewOutputRoot, "manifest.json");
  const sideViewManifest = JSON.parse(readFileSync(sideViewPath, "utf8"));
  const sideViews = [];
  for (const config of configs) sideViews.push(await renderShipSideView(config));
  sideViewManifest.ships = upsertShipEntries(sideViewManifest.ships, sideViews);
  sideViewManifest.nativeBoatGenerator = "tools/render-sail-ship-sprites.mjs --native-boats";
  writeFileSync(sideViewPath, `${JSON.stringify(sideViewManifest, null, 2)}\n`);
}

function upsertShipEntries(existing, replacements) {
  const replacementSlugs = new Set(replacements.map((entry) => entry.slug));
  return [...existing.filter((entry) => !replacementSlugs.has(entry.slug)), ...replacements];
}

function upsertHullFootprints(slug, hullFootprints, generatorKey, generatorFlag) {
  const footprintPath = join(unityFleetOutputRoot, "hull-footprints.json");
  const bake = JSON.parse(readFileSync(footprintPath, "utf8"));
  if (bake.frameSize !== frameSize || bake.headings !== headings || !bake.ships) {
    throw new Error("Existing ship hull footprint bake has incompatible dimensions");
  }
  bake.ships[slug] = hullFootprints;
  bake[generatorKey] = `tools/render-sail-ship-sprites.mjs ${generatorFlag}`;
  writeFileSync(footprintPath, `${JSON.stringify(bake)}\n`);
}

async function renderUnityFleetSideViews() {
  resetUnityFleetSideViewOutput();
  const models = unityShipModels();
  if (models.length === 0) throw new Error(`No Unity ship FBX files found in ${unityShipModelRoot}`);

  const configs = [];
  for (const modelPath of models) {
    const config = unityShipConfig(modelPath);
    config.sourceMaxDim = await measureSourceMaxDim(modelPath);
    configs.push(config);
  }
  const vikingConfig = vikingLongshipConfig();
  vikingConfig.sourceMaxDim = await measureSourceMaxDim(vikingConfig.modelPath);
  configs.push(vikingConfig);
  const largestSourceMaxDim = Math.max(...configs.map((config) => config.sourceMaxDim));
  for (const config of configs) {
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
    scaleMode: "source-relative-fleet",
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
    config.frameScale = sharedFrameScale;
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

  const manifestForDisk = manifest.map(({ sheet, wakeAnchors, hullFootprints, ...entry }) => entry);
  const manifestPath = join(unityFleetOutputRoot, "manifest.json");
  const wakeAnchorsPath = join(unityFleetOutputRoot, "wake-anchors.json");
  const hullFootprintsPath = join(unityFleetOutputRoot, "hull-footprints.json");
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

  const contactSheet = makeFleetContactSheet(manifest);
  const contactSheetPath = join(unityFleetOutputRoot, "unity-ships-contact-sheet.png");
  writeFileSync(contactSheetPath, contactSheet.toBuffer("image/png"));
  console.log(manifestPath);
  console.log(wakeAnchorsPath);
  console.log(hullFootprintsPath);
  console.log(contactSheetPath);
}

async function renderAllProductionShips() {
  await renderUnityFleet();
  await renderUnityFleetSideViews();
  await renderNativeBoats();
  await renderMediterraneanGalley();
  await renderJoseonTurtleShip();
  await renderJoseonPanokseon();
  await renderJapaneseAtakebune();
  await renderSpanishNao();
  await renderPortugueseCarrack();
  await renderGogiartDhow();
  await renderCyc3wGalleon();
  await renderNusantaranOutrigger();
  await renderOttomanCoastalTrader();
}

async function renderRowingShips() {
  await renderNativeBoats();
  await renderMediterraneanGalley();
  await renderJoseonTurtleShip();
  await renderJoseonPanokseon();
  await renderJapaneseAtakebune();
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
    config.outputPrefix = `${config.slug}-reference-16-headings`;
    measuredConfigs.push(config);
  }
  const vikingConfig = vikingLongshipConfig();
  vikingConfig.sourceMaxDim = await measureSourceMaxDim(vikingConfig.modelPath);
  vikingConfig.outputDir = unityFleetReferenceOutputRoot;
  vikingConfig.outputPrefix = `${vikingConfig.slug}-reference-16-headings`;
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
    config.frameScale = sharedFrameScale;
  }
  validateShipStatsForSlugs(measuredConfigs.map((config) => config.slug));

  const references = [];
  for (const config of measuredConfigs) {
    console.log(`reference ${config.slug}`);
    const entry = await renderShipReferenceSet(config);
    references.push(entry);
    console.log(`  ${entry.files.referenceSheet}`);
  }
  for (const config of [gogiartDhowConfig(), cyc3wGalleonConfig()]) {
    config.sourceMaxDim = await measureSourceMaxDim(config.modelPath);
    config.outputDir = unityFleetReferenceOutputRoot;
    config.outputPrefix = `${config.slug}-reference-16-headings`;
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
  if (args.has("--all-production-ships")) {
    await renderAllProductionShips();
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
  if (args.has("--mediterranean-galley")) {
    await renderMediterraneanGalley();
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
  if (args.has("--joseon-panokseon")) {
    await renderJoseonPanokseon();
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
  if (args.has("--cyc3w-galleon")) {
    await renderCyc3wGalleon();
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
  const outputPrefix = args.value("--output-prefix") || "sail-ship-16-headings";
  const texturePath = args.value("--texture") ? resolve(args.value("--texture")) : null;
  const result = await renderShipSpriteSet({
    slug: outputPrefix.replace(/-16-headings$/, ""),
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
