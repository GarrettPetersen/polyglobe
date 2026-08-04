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

export function visibleRiverBankPixelsFromRows(waterPixelRows) {
  if (!(waterPixelRows instanceof Map)) {
    throw new Error("Visible riverbanks require water pixels grouped by row");
  }

  const bankPixelRows = new Map();
  const addBankPixel = (x, y) => {
    let row = bankPixelRows.get(y);
    if (!row) {
      row = new Set();
      bankPixelRows.set(y, row);
    }
    row.add(x);
  };

  for (const [y, waterXs] of waterPixelRows) {
    if (!Number.isInteger(y) || !(waterXs instanceof Set)) {
      throw new Error("River water rows require integer coordinates and Set values");
    }
    const north = waterPixelRows.get(y - 1);
    const south = waterPixelRows.get(y + 1);
    for (const x of waterXs) {
      if (!Number.isInteger(x)) throw new Error(`Invalid river water pixel x coordinate: ${x}`);
      if (!waterXs.has(x - 1)) addBankPixel(x - 1, y);
      if (!waterXs.has(x + 1)) addBankPixel(x + 1, y);
      if (!north?.has(x)) addBankPixel(x, y - 1);
      if (!south?.has(x)) addBankPixel(x, y + 1);
    }
  }

  const bankPixels = [];
  for (const [y, bankXs] of bankPixelRows) {
    for (const x of bankXs) bankPixels.push(Object.freeze({ x, y }));
  }
  return Object.freeze(bankPixels);
}

export function riverBankTerrainCalls(tileCalls, isWaterSurface) {
  if (!Array.isArray(tileCalls)) {
    throw new Error("Riverbank terrain calls require an array");
  }
  if (typeof isWaterSurface !== "function") {
    throw new Error("Riverbank terrain calls require a water-surface predicate");
  }
  return tileCalls.filter((call) => !isWaterSurface(call.row));
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
