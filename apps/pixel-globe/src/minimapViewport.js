export const MINIMAP_LONGITUDE_BIN_COUNT = 720;

export function minimapLandWeight(row, containsRiver = false) {
  if (typeof containsRiver !== "boolean") {
    throw new Error(`Invalid minimap river flag: ${containsRiver}`);
  }
  if (containsRiver) return 0;
  const terrain = row?.t || "";
  if (terrain === "water" || terrain === "lake" || terrain === "beach") return 0;
  if (terrain === "ice" && row.m == null) return 0.15;
  return 1;
}

export function minimapProjectLongitude(lonDeg, worldWidth) {
  assertFinitePositive("minimap world width", worldWidth);
  if (!Number.isFinite(lonDeg)) throw new Error(`Invalid minimap longitude: ${lonDeg}`);
  const normalized = (((lonDeg + 180) % 360) + 360) % 360;
  return normalized / 360 * worldWidth;
}

export function minimapProjectLatitude(latDeg, maximumLatitudeDeg, worldHeight) {
  assertFinitePositive("minimap world height", worldHeight);
  if (!Number.isFinite(latDeg)) throw new Error(`Invalid minimap latitude: ${latDeg}`);
  if (!Number.isFinite(maximumLatitudeDeg) || maximumLatitudeDeg <= 0 || maximumLatitudeDeg >= 90) {
    throw new Error(`Invalid minimap maximum latitude: ${maximumLatitudeDeg}`);
  }
  const clampedLatitude = clamp(latDeg, -maximumLatitudeDeg, maximumLatitudeDeg);
  const maximumMercator = mercatorY(maximumLatitudeDeg);
  const projected = mercatorY(clampedLatitude);
  return (maximumMercator - projected) / (maximumMercator * 2) * worldHeight;
}

export function minimapUnprojectLongitude(projectedX, worldWidth) {
  assertFinitePositive("minimap world width", worldWidth);
  if (!Number.isFinite(projectedX)) throw new Error(`Invalid minimap projected longitude: ${projectedX}`);
  return wrap(projectedX, worldWidth) / worldWidth * 360 - 180;
}

export function minimapUnprojectLatitude(projectedY, maximumLatitudeDeg, worldHeight) {
  assertFinitePositive("minimap world height", worldHeight);
  if (!Number.isFinite(projectedY)) throw new Error(`Invalid minimap projected latitude: ${projectedY}`);
  if (!Number.isFinite(maximumLatitudeDeg) || maximumLatitudeDeg <= 0 || maximumLatitudeDeg >= 90) {
    throw new Error(`Invalid minimap maximum latitude: ${maximumLatitudeDeg}`);
  }
  const maximumMercator = mercatorY(maximumLatitudeDeg);
  const projected = maximumMercator - clamp(projectedY, 0, worldHeight) / worldHeight * maximumMercator * 2;
  return (2 * Math.atan(Math.exp(projected)) - Math.PI / 2) * 180 / Math.PI;
}

export function minimapViewportSample({
  viewport,
  pixelX,
  pixelY,
  sampleX,
  sampleY,
  worldWidth,
  pixelWidth,
  pixelHeight
}) {
  validateViewport(viewport, worldWidth);
  if (!Number.isInteger(pixelWidth) || pixelWidth <= 0 || !Number.isInteger(pixelHeight) || pixelHeight <= 0) {
    throw new Error(`Invalid minimap pixel dimensions: ${pixelWidth}x${pixelHeight}`);
  }
  if (!Number.isInteger(pixelX) || pixelX < 0 || pixelX >= pixelWidth ||
      !Number.isInteger(pixelY) || pixelY < 0 || pixelY >= pixelHeight) {
    throw new Error(`Invalid minimap sample pixel: ${pixelX},${pixelY}`);
  }
  if (!Number.isFinite(sampleX) || sampleX <= 0 || sampleX >= 1 ||
      !Number.isFinite(sampleY) || sampleY <= 0 || sampleY >= 1) {
    throw new Error(`Invalid minimap sample offset: ${sampleX},${sampleY}`);
  }
  return Object.freeze({
    x: wrap(viewport.startX + (pixelX + sampleX) / pixelWidth * viewport.spanX, worldWidth),
    y: viewport.startY + (pixelY + sampleY) / pixelHeight * viewport.spanY
  });
}

export function minimapLongitudeBin(projectedX, worldWidth, binCount = MINIMAP_LONGITUDE_BIN_COUNT) {
  assertFinitePositive("minimap world width", worldWidth);
  if (!Number.isFinite(projectedX)) throw new Error(`Invalid minimap projected longitude: ${projectedX}`);
  if (!Number.isInteger(binCount) || binCount <= 0) {
    throw new Error(`Invalid minimap longitude bin count: ${binCount}`);
  }
  const wrapped = wrap(projectedX, worldWidth);
  return Math.min(binCount - 1, Math.floor(wrapped / worldWidth * binCount));
}

export function exploredMinimapViewport({
  longitudeBinCounts,
  minimumY,
  maximumY,
  worldWidth,
  worldHeight,
  paddingFraction = 0.08,
  minimumSpanFraction = 0.08,
  forceFullMap = false
}) {
  assertFinitePositive("minimap world width", worldWidth);
  assertFinitePositive("minimap world height", worldHeight);
  if (!(longitudeBinCounts instanceof Uint16Array) || longitudeBinCounts.length === 0) {
    throw new Error("Minimap exploration requires Uint16 longitude-bin counts");
  }
  if (!Number.isFinite(paddingFraction) || paddingFraction < 0 || paddingFraction >= 0.5) {
    throw new Error(`Invalid minimap padding fraction: ${paddingFraction}`);
  }
  if (!Number.isFinite(minimumSpanFraction) || minimumSpanFraction <= 0 || minimumSpanFraction > 1) {
    throw new Error(`Invalid minimap minimum span fraction: ${minimumSpanFraction}`);
  }
  if (typeof forceFullMap !== "boolean") {
    throw new Error(`Invalid minimap full-map flag: ${forceFullMap}`);
  }
  if (forceFullMap) return fullWorldViewport(worldWidth, worldHeight);

  const longitudeArc = occupiedLongitudeArc(longitudeBinCounts, worldWidth);
  if (longitudeArc === null) {
    if (minimumY !== Infinity || maximumY !== -Infinity) {
      throw new Error("Minimap latitude bounds exist without explored longitudes");
    }
    return null;
  }
  if (!Number.isFinite(minimumY) || !Number.isFinite(maximumY) || minimumY > maximumY) {
    throw new Error(`Invalid minimap explored latitude bounds: ${minimumY}..${maximumY}`);
  }

  const yMin = clamp(minimumY, 0, worldHeight);
  const yMax = clamp(maximumY, 0, worldHeight);
  const paddedLongitudeSpan = Math.max(
    worldWidth * minimumSpanFraction,
    longitudeArc.span * (1 + paddingFraction * 2)
  );
  const paddedLatitudeSpan = Math.max(
    worldHeight * minimumSpanFraction,
    (yMax - yMin) * (1 + paddingFraction * 2)
  );
  const aspectRatio = worldWidth / worldHeight;
  let spanX = paddedLongitudeSpan;
  let spanY = paddedLatitudeSpan;
  if (spanX / spanY > aspectRatio) spanY = spanX / aspectRatio;
  else spanX = spanY * aspectRatio;

  if (spanX >= worldWidth || spanY >= worldHeight) {
    return fullWorldViewport(worldWidth, worldHeight);
  }

  const centerX = wrap(longitudeArc.start + longitudeArc.span / 2, worldWidth);
  const centerY = (yMin + yMax) / 2;
  return Object.freeze({
    startX: wrap(centerX - spanX / 2, worldWidth),
    startY: clamp(centerY - spanY / 2, 0, worldHeight - spanY),
    spanX,
    spanY
  });
}

function fullWorldViewport(worldWidth, worldHeight) {
  return Object.freeze({ startX: 0, startY: 0, spanX: worldWidth, spanY: worldHeight });
}

export function minimapViewportContainsPoint(viewport, projectedX, projectedY, worldWidth) {
  validateViewport(viewport, worldWidth);
  if (!Number.isFinite(projectedX) || !Number.isFinite(projectedY)) {
    throw new Error("Minimap viewport point must be finite");
  }
  const xOffset = wrap(projectedX - viewport.startX, worldWidth);
  const epsilon = 1e-6;
  return xOffset <= viewport.spanX + epsilon &&
    projectedY >= viewport.startY - epsilon &&
    projectedY <= viewport.startY + viewport.spanY + epsilon;
}

export function minimapViewportPixel({
  viewport,
  projectedX,
  projectedY,
  worldWidth,
  pixelWidth,
  pixelHeight
}) {
  validateViewport(viewport, worldWidth);
  if (!Number.isInteger(pixelWidth) || pixelWidth <= 0 || !Number.isInteger(pixelHeight) || pixelHeight <= 0) {
    throw new Error(`Invalid minimap pixel dimensions: ${pixelWidth}x${pixelHeight}`);
  }
  if (!minimapViewportContainsPoint(viewport, projectedX, projectedY, worldWidth)) return null;
  const xOffset = wrap(projectedX - viewport.startX, worldWidth);
  const x = clamp(Math.floor(xOffset / viewport.spanX * pixelWidth), 0, pixelWidth - 1);
  const y = clamp(Math.floor((projectedY - viewport.startY) / viewport.spanY * pixelHeight), 0, pixelHeight - 1);
  return Object.freeze({ x, y, pixel: x + y * pixelWidth });
}

function occupiedLongitudeArc(binCounts, worldWidth) {
  const occupied = [];
  for (let index = 0; index < binCounts.length; index++) {
    if (binCounts[index] > 0) occupied.push(index);
  }
  if (occupied.length === 0) return null;
  const binWidth = worldWidth / binCounts.length;
  if (occupied.length === binCounts.length) return { start: 0, span: worldWidth };

  let longestEmptyRun = -1;
  let arcStartBin = occupied[0];
  for (let index = 0; index < occupied.length; index++) {
    const current = occupied[index];
    const next = index + 1 < occupied.length ? occupied[index + 1] : occupied[0] + binCounts.length;
    const emptyRun = next - current - 1;
    if (emptyRun > longestEmptyRun) {
      longestEmptyRun = emptyRun;
      arcStartBin = next % binCounts.length;
    }
  }
  return {
    start: arcStartBin * binWidth,
    span: (binCounts.length - longestEmptyRun) * binWidth
  };
}

function validateViewport(viewport, worldWidth) {
  if (!viewport || typeof viewport !== "object") throw new Error("Minimap viewport is missing");
  for (const key of ["startX", "startY", "spanX", "spanY"]) {
    if (!Number.isFinite(viewport[key])) throw new Error(`Invalid minimap viewport ${key}`);
  }
  if (viewport.startY < 0 || viewport.spanX <= 0 || viewport.spanY <= 0 || viewport.spanX > worldWidth) {
    throw new Error("Minimap viewport has invalid bounds");
  }
}

function mercatorY(latDeg) {
  const latitude = latDeg * Math.PI / 180;
  return Math.log(Math.tan(Math.PI / 4 + latitude / 2));
}

function assertFinitePositive(label, value) {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`Invalid ${label}: ${value}`);
}

function wrap(value, range) {
  return ((value % range) + range) % range;
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}
