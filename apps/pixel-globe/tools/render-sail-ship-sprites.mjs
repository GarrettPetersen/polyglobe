import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas, loadImage } from "../../../examples/globe-demo/node_modules/canvas/index.js";
import * as THREE from "../../../examples/globe-demo/node_modules/three/build/three.module.js";
import { FBXLoader } from "../../../examples/globe-demo/node_modules/three/examples/jsm/loaders/FBXLoader.js";
import { GLTFLoader } from "../../../examples/globe-demo/node_modules/three/examples/jsm/loaders/GLTFLoader.js";
import { shipStatsForSlug, validateShipStatsForSlugs } from "../src/shipStats.js";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(appRoot, "../..");
const defaultModelPath = join(repoRoot, "examples/globe-demo/public/assets/vehicles/Sail Ship.glb");
const unityShipSourceRoot = join(repoRoot, "tmp/unity-assets/low-poly-cartoon-sailing-ships");
const unityShipModelRoot = join(unityShipSourceRoot, "Models");
const unityShipTexturePath = join(unityShipSourceRoot, "Textures/texture main.png");
const outputRoot = join(appRoot, "public/assets/vehicles");
const unityFleetOutputRoot = join(outputRoot, "unity-ships");
const unityFleetReferenceOutputRoot = join(appRoot, "docs/ship-reference/high-res");

const frameSize = integerEnv("PIXEL_GLOBE_SHIP_FRAME_SIZE", 36);
const headings = 16;
const sheetCols = 4;
const renderSize = integerEnv("PIXEL_GLOBE_SHIP_RENDER_SIZE", 72);
const lightAzimuthBins = 16;
const lightElevationBins = 2;
const lightBinCount = lightAzimuthBins * lightElevationBins;
const shadowFrameSize = integerEnv("PIXEL_GLOBE_SHIP_SHADOW_FRAME_SIZE", 72);
const shadowFrameInset = Math.floor((shadowFrameSize - frameSize) / 2);
const previewScale = integerEnv("PIXEL_GLOBE_SHIP_PREVIEW_SCALE", 4);
const cameraExtent = 1.62;
const defaultTargetModelMaxDim = 2.3;
const unityFleetScaleExponent = 0.5;
const highlightDotThreshold = 0.52;
const shadeDotThreshold = 0.1;
const selfShadowMapSize = 128;
const selfShadowDepthBias = 0.035;
const selfShadowLookupRadius = 1;
const waterlineQuantile = 0.18;
const lightElevationAngles = [Math.PI / 9, Math.PI / 4.1];

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
    label: "Fishing Lugger",
    slug: "fishing-lugger",
    identifiedType: "small lugger / fishing boat",
    confidence: "medium",
    notes: "Small single-mast coastal working boat."
  }],
  ["boats/boat 2.fbx", {
    label: "Small Dhow",
    slug: "small-dhow",
    identifiedType: "small dhow / coastal lateen boat",
    confidence: "medium",
    notes: "Small open hull with a triangular lateen-like sail reads closer to a dhow than a European sloop."
  }],
  ["boats/boat 3.fbx", {
    label: "Small Cog",
    slug: "small-cog",
    identifiedType: "small cog / roundship",
    confidence: "medium",
    notes: "Broad little hull with a simple square-sail profile."
  }],
  ["boats/boat 4.fbx", {
    label: "Dhow",
    slug: "dhow",
    identifiedType: "dhow / felucca",
    confidence: "high",
    notes: "Lateen sail and narrow hull read strongly as an Indian Ocean or Red Sea craft."
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
    label: "Pirate Brig",
    slug: "pirate-brig",
    identifiedType: "pirate brig / snow",
    confidence: "medium",
    notes: "Black-sailed multi-mast raider; brig is the cleanest game label."
  }],
  ["ships large/pirate ship large 2.fbx", {
    label: "Pirate Frigate",
    slug: "pirate-frigate",
    identifiedType: "pirate frigate / raider",
    confidence: "medium",
    notes: "Longer, heavier black-sailed raider silhouette."
  }],
  ["ships large/ship large 1.fbx", {
    label: "Galleon",
    slug: "galleon",
    identifiedType: "galleon",
    confidence: "high",
    notes: "Tall stern and large square-rigged profile."
  }],
  ["ships large/ship large 2.fbx", {
    label: "Frigate",
    slug: "frigate",
    identifiedType: "frigate / man-of-war",
    confidence: "high",
    notes: "Long square-rigged warship silhouette."
  }],
  ["ships large/ship large 3.fbx", {
    label: "Fluyt",
    slug: "fluyt",
    identifiedType: "fluyt / merchantman",
    confidence: "medium",
    notes: "Bulky merchant hull, useful as a cargo specialist."
  }],
  ["ships large/ship large 4.fbx", {
    label: "Carrack",
    slug: "carrack",
    identifiedType: "carrack / nao",
    confidence: "medium",
    notes: "Large early ocean-going merchant/explorer profile."
  }],
  ["ships large/ship large 5.fbx", {
    label: "Ship of the Line",
    slug: "ship-of-the-line",
    identifiedType: "ship-of-the-line / heavy frigate",
    confidence: "medium",
    notes: "Largest heavy square-rigger in the pack."
  }],
  ["ships medium/chinese ship medium.fbx", {
    label: "Medium Junk",
    slug: "medium-junk",
    identifiedType: "junk",
    confidence: "high",
    notes: "Medium battened-sail Chinese vessel."
  }],
  ["ships medium/pirate ship medium.fbx", {
    label: "Pirate Brigantine",
    slug: "pirate-brigantine",
    identifiedType: "pirate brigantine / brig",
    confidence: "high",
    notes: "Compact black-sailed raider."
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
  ["ships medium/ship medium 3.fbx", {
    label: "Small Carrack",
    slug: "small-carrack",
    identifiedType: "cog / small carrack",
    confidence: "medium",
    notes: "Roundship profile, larger than a cog but less imposing than the carrack."
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
    identifiedType: "brigantine / brig",
    confidence: "medium",
    notes: "Medium square/fore-and-aft trader or light naval vessel."
  }],
  ["ships medium/ship medium 6.fbx", {
    label: "Corvette",
    slug: "corvette",
    identifiedType: "corvette / small frigate",
    confidence: "medium",
    notes: "Small naval square-rigger."
  }],
  ["ships small/chinese ship small.fbx", {
    label: "Small Junk",
    slug: "small-junk",
    identifiedType: "junk",
    confidence: "high",
    notes: "Small battened-sail Chinese vessel."
  }],
  ["ships small/pirate ship small.fbx", {
    label: "Pirate Sloop",
    slug: "pirate-sloop",
    identifiedType: "pirate sloop / cutter",
    confidence: "medium",
    notes: "Small black-sailed raider."
  }],
  ["ships small/ship small 1.fbx", {
    label: "Lateen Xebec",
    slug: "lateen-xebec",
    identifiedType: "xebec / small lateen trader",
    confidence: "medium",
    notes: "Small lateen-rigged Mediterranean-style craft."
  }],
  ["ships small/ship small 2.fbx", {
    label: "Felucca",
    slug: "felucca",
    identifiedType: "dhow / felucca",
    confidence: "high",
    notes: "Small single-lateen craft."
  }],
  ["ships small/ship small 3.fbx", {
    label: "Cutter",
    slug: "cutter",
    identifiedType: "sloop / cutter",
    confidence: "high",
    notes: "Small fore-and-aft European craft."
  }],
  ["ships small/ship small 4.fbx", {
    label: "Lateen Dhow",
    slug: "lateen-dhow",
    identifiedType: "dhow / lateen boat",
    confidence: "high",
    notes: "Curved lateen silhouette; good Indian Ocean/Arabian Sea craft."
  }],
  ["ships small/ship small 5.fbx", {
    label: "Ketch",
    slug: "ketch",
    identifiedType: "ketch / small fore-and-aft trader",
    confidence: "medium",
    notes: "Two-mast fore-and-aft rig with a smaller aft sail reads more like a ketch than a caravel."
  }],
  ["ships small/ship small 6.fbx", {
    label: "Square-Sail Trader",
    slug: "square-sail-trader",
    identifiedType: "small cog / square-sail trader",
    confidence: "medium",
    notes: "Simple small trader with square-sail read."
  }],
  ["ships small/ship small 7.fbx", {
    label: "Dhow-Felucca",
    slug: "dhow-felucca",
    identifiedType: "felucca / dhow",
    confidence: "high",
    notes: "Another small lateen craft; distinct source model from Felucca."
  }]
]);

async function loadGltf(path) {
  const bytes = readFileSync(path);
  const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return new Promise((resolveLoad, rejectLoad) => {
    new GLTFLoader().parse(arrayBuffer, "", resolveLoad, rejectLoad);
  });
}

function installNodeImageShim() {
  if (globalThis.document) return;
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

function loadFbx(path) {
  installNodeImageShim();
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

async function loadTextureSampler(path) {
  const image = await loadImage(path);
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, 0, 0);
  const data = ctx.getImageData(0, 0, image.width, image.height).data;
  return {
    width: image.width,
    height: image.height,
    sample(u, v) {
      const x = clamp(Math.floor(wrap01(u) * image.width), 0, image.width - 1);
      const y = clamp(Math.floor((1 - wrap01(v)) * image.height), 0, image.height - 1);
      const offset = (x + y * image.width) * 4;
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
  if (!Array.isArray(mesh.material)) return materialColor(mesh.material);
  for (const group of geometry.groups) {
    if (triOffset >= group.start && triOffset < group.start + group.count) {
      return materialColor(mesh.material[group.materialIndex]);
    }
  }
  return materialColor(mesh.material[0]);
}

function collectTriangles(scene, options = {}) {
  scene.updateMatrixWorld(true);
  const triangles = [];
  const allPoints = [];

  scene.traverse((node) => {
    if (!node.isMesh) return;
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
      const points = ids.map((id) => new THREE.Vector3(
        positions.getX(id),
        positions.getY(id),
        positions.getZ(id)
      ).applyMatrix4(matrix));
      const uvs = geometry.attributes.uv
        ? ids.map((id) => new THREE.Vector2(
          geometry.attributes.uv.getX(id),
          geometry.attributes.uv.getY(id)
        ))
        : null;

      for (const point of points) allPoints.push(point);
      triangles.push({
        points,
        uvs,
        color: triangleMaterial(node, geometry, offset)
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

function estimateWaterlineY(triangles) {
  const yValues = [];
  for (const tri of triangles) {
    for (const point of tri.points) yValues.push(point.y);
  }
  if (yValues.length === 0) throw new Error("Cannot estimate ship waterline without model points");
  yValues.sort((a, b) => a - b);
  const index = Math.max(0, Math.min(yValues.length - 1, Math.floor((yValues.length - 1) * waterlineQuantile)));
  return yValues[index];
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

function projectedPoint(point, camera) {
  const ndc = point.clone().project(camera);
  const view = point.clone().applyMatrix4(camera.matrixWorldInverse);
  return {
    x: (ndc.x * 0.5 + 0.5) * renderSize,
    y: (-ndc.y * 0.5 + 0.5) * renderSize,
    z: view.z,
    wx: point.x,
    wy: point.y,
    wz: point.z
  };
}

function renderHeading(baseTriangles, headingIndex, camera, renderOptions) {
  const canvas = createCanvas(renderSize, renderSize);
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, renderSize, renderSize);
  const image = ctx.createImageData(renderSize, renderSize);
  const depth = new Float32Array(renderSize * renderSize);
  const normals = new Float32Array(renderSize * renderSize * 3);
  const positions = new Float32Array(renderSize * renderSize * 3);
  const casters = [];
  depth.fill(-Infinity);

  const rotation = new THREE.Matrix4().makeRotationY((headingIndex / headings) * Math.PI * 2 + Math.PI * 0.5);

  for (const tri of baseTriangles) {
    const points = tri.points.map((point) => point.clone().applyMatrix4(rotation));
    casters.push(makeCasterTriangle(points));
    const normal = new THREE.Vector3()
      .subVectors(points[1], points[0])
      .cross(new THREE.Vector3().subVectors(points[2], points[0]))
      .normalize();
    const screen = points.map((point) => projectedPoint(point, camera));
    if (screen.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y))) continue;

    const screenNormal = normal.clone().transformDirection(camera.matrixWorldInverse);
    rasterizeTriangle(image.data, depth, normals, positions, screen, {
      color: tri.color,
      normal,
      uvs: tri.uvs,
      textureSampler: renderOptions?.textureSampler,
      recolorSails: renderOptions?.recolorSails,
      waterlineY: renderOptions?.waterlineY
    }, {
      x: screenNormal.x,
      y: -screenNormal.y,
      z: screenNormal.z
    });
  }

  ctx.putImageData(image, 0, 0);
  return { canvas, normals, positions, casters };
}

function makeCasterTriangle(points) {
  const [a, b, c] = points;
  return {
    a,
    b,
    c
  };
}

function rasterizeTriangle(data, depth, normals, positions, points, surface, normal) {
  const [a, b, c] = points;
  const minX = Math.max(0, Math.floor(Math.min(a.x, b.x, c.x)));
  const minY = Math.max(0, Math.floor(Math.min(a.y, b.y, c.y)));
  const maxX = Math.min(renderSize - 1, Math.ceil(Math.max(a.x, b.x, c.x)));
  const maxY = Math.min(renderSize - 1, Math.ceil(Math.max(a.y, b.y, c.y)));
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
      const index = x + y * renderSize;
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
  if (surface.recolorSails && isLikelySailPixel(color, surface.normal, point, surface.waterlineY)) {
    color = neutralSailColor(color);
  }
  return baseColor(color, surface.normal);
}

function isLikelySailPixel(color, normal, point, waterlineY) {
  const height = Number.isFinite(waterlineY) ? point.y - waterlineY : point.y;
  if (height < 0.08) return false;
  if (Math.abs(normal.y) > 0.9) return false;
  const stats = colorStats(color);
  if (stats.value < 0.34) return false;
  if (stats.saturation < 0.12 && stats.value < 0.78) return false;
  return true;
}

function colorStats(color) {
  const r = color.r / 255;
  const g = color.g / 255;
  const b = color.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const chroma = max - min;
  let hue = 0;
  if (chroma > 1e-6) {
    if (max === r) hue = ((g - b) / chroma) % 6;
    else if (max === g) hue = (b - r) / chroma + 2;
    else hue = (r - g) / chroma + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }
  return {
    hue,
    saturation: max <= 0 ? 0 : chroma / max,
    value: max,
    luminance: r * 0.2126 + g * 0.7152 + b * 0.0722
  };
}

function neutralSailColor(color) {
  const stats = colorStats(color);
  const shade = clamp255(178 + stats.luminance * 72);
  return {
    r: clamp255(shade + 8),
    g: clamp255(shade + 5),
    b: clamp255(shade - 6)
  };
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
  const source = sourceCtx.getImageData(0, 0, renderSize, renderSize);
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

  for (let dy = 0; dy < drawH; dy++) {
    const sy = bounds.minY + Math.min(bounds.height - 1, Math.floor(((dy + 0.5) / drawH) * bounds.height));
    for (let dx = 0; dx < drawW; dx++) {
      const sx = bounds.minX + Math.min(bounds.width - 1, Math.floor(((dx + 0.5) / drawW) * bounds.width));
      const sourceIndex = sx + sy * renderSize;
      const sourceOffset = sourceIndex * 4;
      if (source.data[sourceOffset + 3] < 128) continue;

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
  sheetCtx.putImageData(frame.image, cell.x, cell.y);
}

function sheetCell(frameIndex, size) {
  return {
    x: (frameIndex % sheetCols) * size,
    y: Math.floor(frameIndex / sheetCols) * size
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
  const model = collectTriangles(scene, {
    targetMaxDim: config.targetModelMaxDim ?? defaultTargetModelMaxDim
  });
  const triangles = model.triangles;
  const waterlineY = estimateWaterlineY(triangles);
  const camera = makeCamera();
  const sheet = createCanvas(frameSize * sheetCols, frameSize * Math.ceil(headings / sheetCols));
  const sheetCtx = sheet.getContext("2d");
  sheetCtx.clearRect(0, 0, sheet.width, sheet.height);
  sheetCtx.imageSmoothingEnabled = false;

  const renderOptions = {
    textureSampler,
    recolorSails: Boolean(config.recolorSails),
    waterlineY
  };
  const renderedHeadings = Array.from({ length: headings }, (_, i) => renderHeading(triangles, i, camera, renderOptions));
  const boundsByHeading = renderedHeadings.map((rendered) => alphaBounds(rendered.canvas));
  const frameScale = config.frameScale ?? fixedFrameScale(boundsByHeading);
  const frames = renderedHeadings.map((rendered, i) => makeFrame(rendered, boundsByHeading[i], frameScale));
  for (let i = 0; i < headings; i++) {
    copyFrameToSheet(frames[i], sheetCtx, i);
  }

  const lightDirections = makeLightingDirections();
  const selfShadowMaps = makeSelfShadowMaps(frames, lightDirections, camera);
  const lightMask = makeLightingMaskSheet(frames, lightDirections, "light", selfShadowMaps);
  const shadeMask = makeLightingMaskSheet(frames, lightDirections, "shade", selfShadowMaps);
  const shadowMask = makeShadowMaskSheet(frames, lightDirections, camera, waterlineY);
  const preview = makePreview(sheet);
  const lightingPreview = makeLightingPreview(sheet, lightMask, shadeMask, shadowMask);
  const sheetPath = join(config.outputDir, `${config.outputPrefix}.png`);
  const lightPath = join(config.outputDir, `${config.outputPrefix}-light.png`);
  const shadePath = join(config.outputDir, `${config.outputPrefix}-shade.png`);
  const shadowPath = join(config.outputDir, `${config.outputPrefix}-shadow.png`);
  const previewPath = join(config.outputDir, `${config.outputPrefix}-preview.png`);
  const lightingPreviewPath = join(config.outputDir, `${config.outputPrefix}-lighting-preview.png`);
  writeFileSync(sheetPath, sheet.toBuffer("image/png"));
  writeFileSync(lightPath, lightMask.toBuffer("image/png"));
  writeFileSync(shadePath, shadeMask.toBuffer("image/png"));
  writeFileSync(shadowPath, shadowMask.toBuffer("image/png"));
  writeFileSync(previewPath, preview.toBuffer("image/png"));
  writeFileSync(lightingPreviewPath, lightingPreview.toBuffer("image/png"));
  return {
    slug: config.slug || config.outputPrefix.replace(/-16-headings$/, ""),
    label: config.label || config.outputPrefix,
    category: config.category || "default",
    assetLabel: config.assetLabel || config.label || config.outputPrefix,
    identifiedType: config.identifiedType || config.label || config.outputPrefix,
    identificationConfidence: config.identificationConfidence || "unknown",
    identificationNotes: config.identificationNotes || "",
    sourceModel: portablePath(config.modelPath),
    sourceTexture: config.texturePath ? portablePath(config.texturePath) : null,
    sailRecolor: Boolean(config.recolorSails),
    sourceMaxDim: Number(model.sourceMaxDim.toFixed(4)),
    targetModelMaxDim: Number(model.targetMaxDim.toFixed(4)),
    frameScale: Number(frameScale.toFixed(4)),
    scaleMode: config.scaleMode || "fit-model",
    waterlineY,
    frameSize,
    shadowFrameSize,
    headings,
    sheetCols,
    lightAzimuthBins,
    lightElevationBins,
    ...(config.stats ? { stats: config.stats } : {}),
    files: {
      sheet: portablePath(sheetPath),
      light: portablePath(lightPath),
      shade: portablePath(shadePath),
      shadow: portablePath(shadowPath),
      preview: portablePath(previewPath),
      lightingPreview: portablePath(lightingPreviewPath)
    },
    sheet
  };
}

function portablePath(path) {
  return relative(repoRoot, path).split("/").join("/");
}

function unityShipModels() {
  const files = [];
  walkFiles(unityShipModelRoot, (path) => {
    if (extname(path).toLowerCase() !== ".fbx") return;
    const rel = relative(unityShipModelRoot, path).split("/").join("/");
    if (rel.startsWith("viking ships/")) return;
    if (basename(path).toLowerCase() === "water.fbx") return;
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
    stats: shipStatsForSlug(rosterEntry.slug),
    modelPath,
    texturePath: unityShipTexturePath,
    recolorSails: true,
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
  return Array.from({ length: headings }, (_, i) => (
    alphaBounds(renderHeading(model.triangles, i, camera, {
      textureSampler: null,
      recolorSails: false,
      waterlineY: estimateWaterlineY(model.triangles)
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
  const model = collectTriangles(scene, {
    targetMaxDim: config.targetModelMaxDim ?? defaultTargetModelMaxDim
  });
  const triangles = model.triangles;
  const waterlineY = estimateWaterlineY(triangles);
  const camera = makeCamera();
  const sheet = createCanvas(frameSize * sheetCols, frameSize * Math.ceil(headings / sheetCols));
  const sheetCtx = sheet.getContext("2d");
  sheetCtx.clearRect(0, 0, sheet.width, sheet.height);
  sheetCtx.imageSmoothingEnabled = false;

  const renderOptions = {
    textureSampler,
    recolorSails: Boolean(config.recolorSails),
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
    sailRecolor: Boolean(config.recolorSails),
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
  const largestSourceMaxDim = Math.max(...measuredConfigs.map((config) => config.sourceMaxDim));
  for (const config of measuredConfigs) {
    config.targetModelMaxDim = fleetTargetModelMaxDim(config.sourceMaxDim, largestSourceMaxDim);
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

  const manifestForDisk = manifest.map(({ sheet, ...entry }) => entry);
  const manifestPath = join(unityFleetOutputRoot, "manifest.json");
  writeFileSync(manifestPath, `${JSON.stringify({
    generatedBy: "tools/render-sail-ship-sprites.mjs --unity-fleet",
    sourceRoot: portablePath(unityShipSourceRoot),
    scaleMode: "source-relative-fleet",
    scaleNotes: "Imported FBX source sizes are preserved through a compressed readability curve so boats stay smaller without becoming illegible at 36px.",
    targetMaxDimForLargestShip: defaultTargetModelMaxDim,
    fleetScaleExponent: unityFleetScaleExponent,
    sharedFrameScale: Number(sharedFrameScale.toFixed(4)),
    skipped: ["Models/viking ships/*.fbx", "Models/water.fbx"],
    ships: manifestForDisk
  }, null, 2)}\n`);

  const contactSheet = makeFleetContactSheet(manifest);
  const contactSheetPath = join(unityFleetOutputRoot, "unity-ships-contact-sheet.png");
  writeFileSync(contactSheetPath, contactSheet.toBuffer("image/png"));
  console.log(manifestPath);
  console.log(contactSheetPath);
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
  const largestSourceMaxDim = Math.max(...measuredConfigs.map((config) => config.sourceMaxDim));
  for (const config of measuredConfigs) {
    config.targetModelMaxDim = fleetTargetModelMaxDim(config.sourceMaxDim, largestSourceMaxDim);
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
    skipped: ["Models/viking ships/*.fbx", "Models/water.fbx"],
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
  if (args.has("--unity-fleet")) {
    await renderUnityFleet();
    return;
  }
  if (args.has("--unity-fleet-reference")) {
    await renderUnityFleetReferences();
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
    recolorSails: args.has("--sail-recolor"),
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
