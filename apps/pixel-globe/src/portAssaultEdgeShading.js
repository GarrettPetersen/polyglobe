export function portAssaultDeckCreaseMask({
  alpha,
  normals,
  width,
  height,
  nativeScale = 1,
  deckNormalY = 0.62,
  sideNormalY = 0.48,
  maxNormalDot = 0.82
}) {
  validateRaster(alpha, normals, width, height, nativeScale);
  for (const [label, value] of Object.entries({ deckNormalY, sideNormalY, maxNormalDot })) {
    if (!Number.isFinite(value) || value < -1 || value > 1) {
      throw new Error(`Invalid port-assault deck crease ${label}: ${value}`);
    }
  }
  if (sideNormalY >= deckNormalY) {
    throw new Error("Port-assault deck crease side normal must be below its deck normal");
  }

  const mask = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixel = x + y * width;
      if (!alpha[pixel]) continue;
      const normalOffset = pixel * 3;
      const normalY = normals[normalOffset + 1];
      if (normalY > sideNormalY) continue;

      let touchesDeck = false;
      for (let dy = -nativeScale; dy <= nativeScale && !touchesDeck; dy++) {
        for (let dx = -nativeScale; dx <= nativeScale; dx++) {
          if (dx === 0 && dy === 0) continue;
          const neighborX = x + dx;
          const neighborY = y + dy;
          if (neighborX < 0 || neighborX >= width || neighborY < 0 || neighborY >= height) {
            continue;
          }
          const neighbor = neighborX + neighborY * width;
          if (!alpha[neighbor]) continue;
          const neighborOffset = neighbor * 3;
          if (normals[neighborOffset + 1] < deckNormalY) continue;
          const dot =
            normals[normalOffset] * normals[neighborOffset] +
            normals[normalOffset + 1] * normals[neighborOffset + 1] +
            normals[normalOffset + 2] * normals[neighborOffset + 2];
          if (dot <= maxNormalDot) {
            touchesDeck = true;
            break;
          }
        }
      }
      if (touchesDeck) mask[pixel] = 1;
    }
  }
  return mask;
}

function validateRaster(alpha, normals, width, height, nativeScale) {
  if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
    throw new Error(`Invalid port-assault crease raster dimensions: ${width}x${height}`);
  }
  if (!Number.isInteger(nativeScale) || nativeScale <= 0) {
    throw new Error(`Invalid port-assault crease native scale: ${nativeScale}`);
  }
  if (!(alpha instanceof Uint8Array) || alpha.length !== width * height) {
    throw new Error("Port-assault crease mask requires one alpha value per pixel");
  }
  if (!(normals instanceof Float32Array) || normals.length !== width * height * 3) {
    throw new Error("Port-assault crease mask requires one normal per pixel");
  }
}
