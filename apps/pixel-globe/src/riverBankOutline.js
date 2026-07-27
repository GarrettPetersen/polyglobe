import { pixelMaskKey } from "./pixelWaterMask.js";

const CARDINAL_NEIGHBOR_OFFSETS = Object.freeze([
  Object.freeze([0, -1]),
  Object.freeze([-1, 0]),
  Object.freeze([1, 0]),
  Object.freeze([0, 1])
]);

export function visibleRiverBankPixelSet(waterPixelGroups) {
  if (!Array.isArray(waterPixelGroups)) {
    throw new Error("Visible riverbanks require an array of water pixel groups");
  }

  const waterPixels = new Set();
  for (const group of waterPixelGroups) {
    if (!(group instanceof Set)) {
      throw new Error("Each visible river water pixel group must be a Set");
    }
    for (const key of group) {
      pixelCoordinates(key);
      waterPixels.add(key);
    }
  }

  const bankPixels = new Set();
  for (const key of waterPixels) {
    const { x, y } = pixelCoordinates(key);
    for (const [dx, dy] of CARDINAL_NEIGHBOR_OFFSETS) {
      const candidate = pixelMaskKey(x + dx, y + dy);
      if (!waterPixels.has(candidate)) bankPixels.add(candidate);
    }
  }
  return bankPixels;
}

function pixelCoordinates(key) {
  if (typeof key !== "string" || !/^-?\d+,-?\d+$/.test(key)) {
    throw new Error(`Invalid river water pixel key: ${key}`);
  }
  const comma = key.indexOf(",");
  return {
    x: Number(key.slice(0, comma)),
    y: Number(key.slice(comma + 1))
  };
}
