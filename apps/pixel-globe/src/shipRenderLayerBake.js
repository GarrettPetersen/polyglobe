import { shipSinkDepthByte } from "./shipSinking.js";
import { floatingShipSubmergedPixelKeys } from "./shipWaterline.js";

export const SHIP_RENDER_LAYER_BAKE_VERSION = 2;

export function bakeShipRenderLayerSheet({
  colorPixels,
  depthPixels,
  width,
  height,
  frameSize,
  sheetColumns,
  headingCount,
  maxRasterDepth
}) {
  validatePixels(colorPixels, width, height, "color");
  validatePixels(depthPixels, width, height, "sink-depth");
  if (!Number.isInteger(frameSize) || frameSize <= 0 ||
      !Number.isInteger(sheetColumns) || sheetColumns <= 0 ||
      !Number.isInteger(headingCount) || headingCount <= 0) {
    throw new Error("Ship render-layer bake requires positive integer layout values");
  }
  const sheetRows = Math.ceil(headingCount / sheetColumns);
  if (width !== frameSize * sheetColumns || height !== frameSize * sheetRows) {
    throw new Error(
      `Ship render-layer sheet is ${width}x${height}; expected ` +
      `${frameSize * sheetColumns}x${frameSize * sheetRows}`
    );
  }

  const abovePixels = new Uint8ClampedArray(colorPixels.length);
  const submergedPixels = new Uint8ClampedArray(colorPixels.length);
  const frames = [];
  for (let frame = 0; frame < headingCount; frame++) {
    const frameX = (frame % sheetColumns) * frameSize;
    const frameY = Math.floor(frame / sheetColumns) * frameSize;
    const opaque = [];
    for (let y = 0; y < frameSize; y++) {
      for (let x = 0; x < frameSize; x++) {
        const offset = ((frameY + y) * width + frameX + x) * 4;
        const colorAlpha = colorPixels[offset + 3];
        const depthAlpha = depthPixels[offset + 3];
        if ((colorAlpha === 0) !== (depthAlpha === 0)) {
          throw new Error(
            `Ship render-layer alpha differs in frame ${frame} at ${x},${y}`
          );
        }
        if (colorAlpha === 0) continue;
        opaque.push({
          x,
          y,
          sinkHeight: shipSinkDepthByte(
            depthPixels[offset],
            depthPixels[offset + 1],
            depthPixels[offset + 2],
            ` in render-layer frame ${frame} at ${x},${y}`
          ) / 255
        });
      }
    }
    if (opaque.length === 0) {
      throw new Error(`Ship render-layer frame ${frame} contains no opaque pixels`);
    }
    const submerged = floatingShipSubmergedPixelKeys(
      opaque,
      frameSize,
      maxRasterDepth
    );
    let bottomOpaqueY = -1;
    let submergedMinY = frameSize;
    let submergedMaxY = -1;
    for (const pixel of opaque) {
      const offset = ((frameY + pixel.y) * width + frameX + pixel.x) * 4;
      const target = submerged.has(pixel.y * frameSize + pixel.x)
        ? submergedPixels
        : abovePixels;
      target.set(colorPixels.subarray(offset, offset + 4), offset);
      bottomOpaqueY = Math.max(bottomOpaqueY, pixel.y);
      if (target === submergedPixels) {
        submergedMinY = Math.min(submergedMinY, pixel.y);
        submergedMaxY = Math.max(submergedMaxY, pixel.y);
      }
    }
    frames.push(Object.freeze({ bottomOpaqueY, submergedMinY, submergedMaxY }));
  }
  return Object.freeze({
    abovePixels,
    submergedPixels,
    frames: Object.freeze(frames)
  });
}

export function validateShipRenderLayerManifest(manifest, expectedSlugs) {
  if (!manifest || manifest.version !== SHIP_RENDER_LAYER_BAKE_VERSION ||
      !Number.isInteger(manifest.frameSize) || manifest.frameSize <= 0 ||
      !Number.isInteger(manifest.headingCount) || manifest.headingCount <= 0 ||
      !Number.isInteger(manifest.sheetColumns) || manifest.sheetColumns <= 0 ||
      !manifest.bundles || typeof manifest.bundles !== "object" ||
      !manifest.ships || typeof manifest.ships !== "object") {
    throw new Error("Unsupported ship render-layer manifest");
  }
  for (const [bundleName, bundle] of Object.entries(manifest.bundles)) {
    if (!bundleName.endsWith(".bin") || !bundle ||
        !Number.isInteger(bundle.byteLength) || bundle.byteLength <= 0) {
      throw new Error(`Invalid ship render-layer bundle: ${bundleName}`);
    }
  }
  const expected = [...expectedSlugs].sort();
  const actual = Object.keys(manifest.ships).sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Ship render-layer manifest roster mismatch; got ${actual.join(", ")}, ` +
      `expected ${expected.join(", ")}`
    );
  }
  const sheetRows = Math.ceil(manifest.headingCount / manifest.sheetColumns);
  const sheetWidth = manifest.frameSize * manifest.sheetColumns;
  const sheetHeight = manifest.frameSize * sheetRows;
  for (const slug of actual) {
    const ship = manifest.ships[slug];
    const bundle = manifest.bundles[ship?.bundle];
    if (!ship || !bundle ||
        !Number.isInteger(ship.byteOffset) || ship.byteOffset < 0 ||
        !Number.isInteger(ship.byteLength) || ship.byteLength <= 0 ||
        ship.byteOffset + ship.byteLength > bundle.byteLength ||
        !Number.isInteger(ship.width) || ship.width !== sheetWidth * 2 ||
        !Number.isInteger(ship.height) || ship.height <= 0 ||
        !ship.sources || typeof ship.sources !== "object") {
      throw new Error(`Invalid ship render-layer atlas entry: ${slug}`);
    }
    for (const [sourceKey, source] of Object.entries(ship.sources)) {
      if (!sourceKey || !Number.isInteger(source.row) || source.row < 0 ||
          !Array.isArray(source.frames) || source.frames.length !== manifest.headingCount) {
        throw new Error(`Invalid ship render-layer source: ${slug}/${sourceKey}`);
      }
      if ((source.row + 1) * sheetHeight > ship.height) {
        throw new Error(`Ship render-layer source exceeds atlas: ${slug}/${sourceKey}`);
      }
      for (const frame of source.frames) validateFrameMetadata(frame, manifest.frameSize, slug);
    }
  }
  return manifest;
}

function validateFrameMetadata(frame, frameSize, slug) {
  if (!frame || !Number.isInteger(frame.bottomOpaqueY) || frame.bottomOpaqueY < 0 ||
      frame.bottomOpaqueY >= frameSize ||
      !Number.isInteger(frame.submergedMinY) ||
      !Number.isInteger(frame.submergedMaxY) ||
      frame.submergedMinY < 0 || frame.submergedMinY > frameSize ||
      frame.submergedMaxY < -1 || frame.submergedMaxY >= frameSize ||
      (frame.submergedMaxY >= 0 && frame.submergedMinY > frame.submergedMaxY)) {
    throw new Error(`Invalid ship render-layer frame metadata: ${slug}`);
  }
}

function validatePixels(pixels, width, height, label) {
  if (!(pixels instanceof Uint8Array || pixels instanceof Uint8ClampedArray)) {
    throw new Error(`Ship render-layer ${label} pixels must be bytes`);
  }
  if (!Number.isInteger(width) || width <= 0 ||
      !Number.isInteger(height) || height <= 0 ||
      pixels.length !== width * height * 4) {
    throw new Error(`Ship render-layer ${label} dimensions are invalid`);
  }
}
