import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas } from "../../../examples/globe-demo/node_modules/canvas/index.js";
import * as THREE from "../../../examples/globe-demo/node_modules/three/build/three.module.js";
import { GLTFLoader } from "../../../examples/globe-demo/node_modules/three/examples/jsm/loaders/GLTFLoader.js";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(appRoot, "../..");
const modelPath = join(repoRoot, "examples/globe-demo/public/assets/vehicles/Sail Ship.glb");
const outputRoot = join(appRoot, "public/assets/vehicles");

const frameSize = 36;
const headings = 16;
const sheetCols = 4;
const renderSize = 72;
const previewScale = 4;
const cameraExtent = 1.62;

async function loadGltf(path) {
  const bytes = readFileSync(path);
  const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return new Promise((resolveLoad, rejectLoad) => {
    new GLTFLoader().parse(arrayBuffer, "", resolveLoad, rejectLoad);
  });
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

function collectTriangles(scene) {
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

      for (const point of points) allPoints.push(point);
      triangles.push({
        points,
        color: triangleMaterial(node, geometry, offset)
      });
    }
  });

  if (triangles.length === 0) throw new Error("No mesh triangles found in ship model");
  normalizeTriangles(triangles, allPoints);
  return triangles;
}

function normalizeTriangles(triangles, points) {
  const box = new THREE.Box3();
  for (const point of points) box.expandByPoint(point);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  if (!Number.isFinite(maxDim) || maxDim <= 0) throw new Error("Ship model has invalid bounds");

  const scale = 2.3 / maxDim;
  for (const tri of triangles) {
    for (const point of tri.points) {
      point.sub(center).multiplyScalar(scale);
    }
  }
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

function shadeColor(color, normal) {
  const key = new THREE.Vector3(0.45, 0.9, 0.7).normalize();
  const rim = new THREE.Vector3(-0.7, 0.45, -0.25).normalize();
  const light = 0.38 +
    Math.max(0, normal.dot(key)) * 0.48 +
    Math.max(0, normal.dot(rim)) * 0.18;
  const clamp255 = (v) => Math.max(0, Math.min(255, Math.round(v)));
  return {
    r: clamp255(color.r * light),
    g: clamp255(color.g * light),
    b: clamp255(color.b * light),
    a: 255
  };
}

function projectedPoint(point, camera) {
  const ndc = point.clone().project(camera);
  const view = point.clone().applyMatrix4(camera.matrixWorldInverse);
  return {
    x: (ndc.x * 0.5 + 0.5) * renderSize,
    y: (-ndc.y * 0.5 + 0.5) * renderSize,
    z: view.z
  };
}

function renderHeading(baseTriangles, headingIndex, camera) {
  const canvas = createCanvas(renderSize, renderSize);
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, renderSize, renderSize);
  const image = ctx.createImageData(renderSize, renderSize);
  const depth = new Float32Array(renderSize * renderSize);
  depth.fill(-Infinity);

  const rotation = new THREE.Matrix4().makeRotationY((headingIndex / headings) * Math.PI * 2 + Math.PI * 0.5);

  for (const tri of baseTriangles) {
    const points = tri.points.map((point) => point.clone().applyMatrix4(rotation));
    const normal = new THREE.Vector3()
      .subVectors(points[1], points[0])
      .cross(new THREE.Vector3().subVectors(points[2], points[0]))
      .normalize();
    const screen = points.map((point) => projectedPoint(point, camera));
    if (screen.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y))) continue;

    rasterizeTriangle(image.data, depth, screen, shadeColor(tri.color, normal));
  }

  ctx.putImageData(image, 0, 0);
  return canvas;
}

function rasterizeTriangle(data, depth, points, color) {
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
      const offset = index * 4;
      data[offset] = color.r;
      data[offset + 1] = color.g;
      data[offset + 2] = color.b;
      data[offset + 3] = color.a;
    }
  }
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

function copyFrame(sourceCanvas, sheetCtx, frameIndex, bounds, scale) {
  const col = frameIndex % sheetCols;
  const row = Math.floor(frameIndex / sheetCols);
  const cellX = col * frameSize;
  const cellY = row * frameSize;
  const drawW = Math.max(1, Math.round(bounds.width * scale));
  const drawH = Math.max(1, Math.round(bounds.height * scale));
  const drawX = cellX + Math.floor((frameSize - drawW) / 2);
  const drawY = cellY + Math.floor((frameSize - drawH) / 2);

  sheetCtx.imageSmoothingEnabled = false;
  sheetCtx.drawImage(
    sourceCanvas,
    bounds.minX,
    bounds.minY,
    bounds.width,
    bounds.height,
    drawX,
    drawY,
    drawW,
    drawH
  );
  snapAlpha(sheetCtx, cellX, cellY);
}

function fixedFrameScale(boundsByHeading) {
  const maxDraw = frameSize - 4;
  const maxWidth = Math.max(...boundsByHeading.map((bounds) => bounds.width));
  const maxHeight = Math.max(...boundsByHeading.map((bounds) => bounds.height));
  return Math.min(maxDraw / maxWidth, maxDraw / maxHeight);
}

function snapAlpha(ctx, cellX, cellY) {
  const image = ctx.getImageData(cellX, cellY, frameSize, frameSize);
  const data = image.data;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) {
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 0;
      continue;
    }
    data[i + 3] = 255;
  }

  ctx.putImageData(image, cellX, cellY);
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

async function main() {
  mkdirSync(outputRoot, { recursive: true });
  const gltf = await loadGltf(modelPath);
  const triangles = collectTriangles(gltf.scene);
  const camera = makeCamera();
  const sheet = createCanvas(frameSize * sheetCols, frameSize * Math.ceil(headings / sheetCols));
  const sheetCtx = sheet.getContext("2d");
  sheetCtx.clearRect(0, 0, sheet.width, sheet.height);
  sheetCtx.imageSmoothingEnabled = false;

  const renderedHeadings = Array.from({ length: headings }, (_, i) => renderHeading(triangles, i, camera));
  const boundsByHeading = renderedHeadings.map((canvas) => alphaBounds(canvas));
  const frameScale = fixedFrameScale(boundsByHeading);
  for (let i = 0; i < headings; i++) {
    copyFrame(renderedHeadings[i], sheetCtx, i, boundsByHeading[i], frameScale);
  }

  const preview = makePreview(sheet);
  const sheetPath = join(outputRoot, "sail-ship-16-headings.png");
  const previewPath = join(outputRoot, "sail-ship-16-headings-preview.png");
  writeFileSync(sheetPath, sheet.toBuffer("image/png"));
  writeFileSync(previewPath, preview.toBuffer("image/png"));
  console.log(sheetPath);
  console.log(previewPath);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
