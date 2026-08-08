const CARDINAL_OFFSETS = Object.freeze([
  Object.freeze([0, -1]),
  Object.freeze([-1, 0]),
  Object.freeze([1, 0]),
  Object.freeze([0, 1])
]);

export function createRiverWaterRaster(bounds, pointGroups) {
  validateBounds(bounds);
  if (!Array.isArray(pointGroups)) {
    throw new Error("River water raster requires point groups");
  }
  const x = bounds.x - 1;
  const y = bounds.y - 1;
  const width = bounds.width + 2;
  const height = bounds.height + 2;
  const mask = new Uint8Array(width * height);
  const waterIndices = [];
  for (const points of pointGroups) {
    if (!ArrayBuffer.isView(points) && !Array.isArray(points)) {
      throw new Error("River water point groups must be arrays or typed arrays");
    }
    if (points.length % 2 !== 0) {
      throw new Error("River water point groups require x/y pairs");
    }
    for (let index = 0; index < points.length; index += 2) {
      const pointX = points[index];
      const pointY = points[index + 1];
      if (!Number.isInteger(pointX) || !Number.isInteger(pointY)) {
        throw new Error(`River water raster point must be integral: ${pointX},${pointY}`);
      }
      const localX = pointX - x;
      const localY = pointY - y;
      if (localX < 0 || localY < 0 || localX >= width || localY >= height) continue;
      const rasterIndex = localX + localY * width;
      if (mask[rasterIndex] !== 0) continue;
      mask[rasterIndex] = 1;
      waterIndices.push(rasterIndex);
    }
  }
  return Object.freeze({
    x,
    y,
    width,
    height,
    contentBounds: Object.freeze({ ...bounds }),
    mask,
    waterIndices: Int32Array.from(waterIndices)
  });
}

export function riverBankPointsFromRaster(raster) {
  validateRaster(raster);
  const bankMask = new Uint8Array(raster.mask.length);
  const points = [];
  const content = raster.contentBounds;
  for (const waterIndex of raster.waterIndices) {
    const localX = waterIndex % raster.width;
    const localY = Math.floor(waterIndex / raster.width);
    for (const [dx, dy] of CARDINAL_OFFSETS) {
      const bankX = localX + dx;
      const bankY = localY + dy;
      if (bankX < 0 || bankY < 0 || bankX >= raster.width || bankY >= raster.height) continue;
      const bankIndex = bankX + bankY * raster.width;
      if (raster.mask[bankIndex] !== 0 || bankMask[bankIndex] !== 0) continue;
      const worldX = raster.x + bankX;
      const worldY = raster.y + bankY;
      if (
        worldX < content.x || worldY < content.y ||
        worldX >= content.x + content.width || worldY >= content.y + content.height
      ) continue;
      bankMask[bankIndex] = 1;
      points.push(worldX, worldY);
    }
  }
  return Int32Array.from(points);
}

function validateBounds(bounds) {
  if (
    !bounds || !Number.isInteger(bounds.x) || !Number.isInteger(bounds.y) ||
    !Number.isInteger(bounds.width) || !Number.isInteger(bounds.height) ||
    bounds.width <= 0 || bounds.height <= 0
  ) {
    throw new Error("River water raster bounds are invalid");
  }
}

function validateRaster(raster) {
  if (
    !raster || !Number.isInteger(raster.x) || !Number.isInteger(raster.y) ||
    !Number.isInteger(raster.width) || !Number.isInteger(raster.height) ||
    !(raster.mask instanceof Uint8Array) || !(raster.waterIndices instanceof Int32Array) ||
    raster.mask.length !== raster.width * raster.height
  ) {
    throw new Error("River bank raster is invalid");
  }
  validateBounds(raster.contentBounds);
}
