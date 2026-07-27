import { pixelMaskKey } from "./pixelWaterMask.js";

const NEIGHBOR_OFFSETS = Object.freeze([
  Object.freeze([-1, -1]),
  Object.freeze([0, -1]),
  Object.freeze([1, -1]),
  Object.freeze([-1, 0]),
  Object.freeze([1, 0]),
  Object.freeze([-1, 1]),
  Object.freeze([0, 1]),
  Object.freeze([1, 1])
]);

export function riverBankOutlineMask(waterAlpha, width, height) {
  if (!(waterAlpha instanceof Uint8Array) && !(waterAlpha instanceof Uint8ClampedArray)) {
    throw new Error("Riverbank outline requires an alpha byte array");
  }
  if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
    throw new Error(`Invalid riverbank outline dimensions: ${width}x${height}`);
  }
  if (waterAlpha.length !== width * height) {
    throw new Error(
      `Riverbank alpha length does not match dimensions: ${waterAlpha.length}/${width * height}`
    );
  }

  const outline = new Uint8Array(waterAlpha.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = x + y * width;
      if (waterAlpha[index] > 0) continue;
      for (const [dx, dy] of NEIGHBOR_OFFSETS) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        if (waterAlpha[nx + ny * width] === 0) continue;
        outline[index] = 1;
        break;
      }
    }
  }
  return outline;
}

export function riverBankNeighborOffsets() {
  return NEIGHBOR_OFFSETS;
}

export function riverBankOutlinePixelSet(waterPixels) {
  if (!(waterPixels instanceof Set)) {
    throw new Error("Riverbank pixel outline requires a water pixel set");
  }
  const outline = new Set();
  for (const key of waterPixels) {
    const { x, y } = pixelCoordinates(key);
    for (const [dx, dy] of NEIGHBOR_OFFSETS) {
      const candidate = pixelMaskKey(x + dx, y + dy);
      if (!waterPixels.has(candidate)) outline.add(candidate);
    }
  }
  return outline;
}

function pixelCoordinates(key) {
  if (typeof key !== "string" || !/^-?\d+,-?\d+$/.test(key)) {
    throw new Error(`Invalid riverbank pixel key: ${key}`);
  }
  const comma = key.indexOf(",");
  return {
    x: Number(key.slice(0, comma)),
    y: Number(key.slice(comma + 1))
  };
}
