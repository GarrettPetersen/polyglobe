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
const lightAzimuthBins = 16;
const lightElevationBins = 2;
const lightBinCount = lightAzimuthBins * lightElevationBins;
const shadowFrameSize = 72;
const shadowFrameInset = Math.floor((shadowFrameSize - frameSize) / 2);
const previewScale = 4;
const cameraExtent = 1.62;
const highlightDotThreshold = 0.52;
const shadeDotThreshold = 0.1;
const selfShadowMapSize = 128;
const selfShadowDepthBias = 0.035;
const selfShadowLookupRadius = 1;
const waterlineQuantile = 0.18;
const lightElevationAngles = [Math.PI / 9, Math.PI / 4.1];

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

function renderHeading(baseTriangles, headingIndex, camera) {
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
    rasterizeTriangle(image.data, depth, normals, positions, screen, baseColor(tri.color, normal), {
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

function rasterizeTriangle(data, depth, normals, positions, points, color, normal) {
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
      const normalOffset = index * 3;
      normals[normalOffset] = normal.x;
      normals[normalOffset + 1] = normal.y;
      normals[normalOffset + 2] = normal.z;
      positions[normalOffset] = w0 * a.wx + w1 * b.wx + w2 * c.wx;
      positions[normalOffset + 1] = w0 * a.wy + w1 * b.wy + w2 * c.wy;
      positions[normalOffset + 2] = w0 * a.wz + w1 * b.wz + w2 * c.wz;
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

async function main() {
  mkdirSync(outputRoot, { recursive: true });
  const gltf = await loadGltf(modelPath);
  const triangles = collectTriangles(gltf.scene);
  const waterlineY = estimateWaterlineY(triangles);
  const camera = makeCamera();
  const sheet = createCanvas(frameSize * sheetCols, frameSize * Math.ceil(headings / sheetCols));
  const sheetCtx = sheet.getContext("2d");
  sheetCtx.clearRect(0, 0, sheet.width, sheet.height);
  sheetCtx.imageSmoothingEnabled = false;

  const renderedHeadings = Array.from({ length: headings }, (_, i) => renderHeading(triangles, i, camera));
  const boundsByHeading = renderedHeadings.map((rendered) => alphaBounds(rendered.canvas));
  const frameScale = fixedFrameScale(boundsByHeading);
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
  const sheetPath = join(outputRoot, "sail-ship-16-headings.png");
  const lightPath = join(outputRoot, "sail-ship-16-headings-light.png");
  const shadePath = join(outputRoot, "sail-ship-16-headings-shade.png");
  const shadowPath = join(outputRoot, "sail-ship-16-headings-shadow.png");
  const previewPath = join(outputRoot, "sail-ship-16-headings-preview.png");
  const lightingPreviewPath = join(outputRoot, "sail-ship-16-headings-lighting-preview.png");
  writeFileSync(sheetPath, sheet.toBuffer("image/png"));
  writeFileSync(lightPath, lightMask.toBuffer("image/png"));
  writeFileSync(shadePath, shadeMask.toBuffer("image/png"));
  writeFileSync(shadowPath, shadowMask.toBuffer("image/png"));
  writeFileSync(previewPath, preview.toBuffer("image/png"));
  writeFileSync(lightingPreviewPath, lightingPreview.toBuffer("image/png"));
  console.log(`waterlineY=${waterlineY.toFixed(4)}`);
  console.log(sheetPath);
  console.log(lightPath);
  console.log(shadePath);
  console.log(shadowPath);
  console.log(previewPath);
  console.log(lightingPreviewPath);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
