const DEFAULT_ALPHA_THRESHOLD = 127;
const COLOR_EDGE_THRESHOLD = 0.12;

export function scoreShipRasterNoise({
  data,
  width,
  height,
  frameSize,
  headingCount,
  sheetColumns,
  alphaThreshold = DEFAULT_ALPHA_THRESHOLD
}) {
  validateRasterInput({
    data,
    width,
    height,
    frameSize,
    headingCount,
    sheetColumns,
    alphaThreshold
  });

  const totals = emptyNoiseTotals();
  const frames = [];
  for (let heading = 0; heading < headingCount; heading++) {
    const frame = scoreFrame({
      data,
      width,
      frameSize,
      frameColumn: heading % sheetColumns,
      frameRow: Math.floor(heading / sheetColumns),
      alphaThreshold
    });
    frames.push(frame);
    addNoiseTotals(totals, frame);
  }

  return Object.freeze({
    score: noiseScore(totals),
    transitionRatio: ratio(totals.noisyPairs, totals.interiorPairs),
    isolatedFleckRatio: ratio(totals.isolatedFlecks, totals.interiorPixels),
    microReversalRatio: ratio(totals.microReversals, totals.microAxes),
    checkerboardRatio: ratio(totals.checkerboards, totals.checkerboardSamples),
    localColorDiversity: ratio(totals.localDiversity, totals.interiorPixels),
    interiorPixels: totals.interiorPixels,
    frames: Object.freeze(frames)
  });
}

function scoreFrame({ data, width, frameSize, frameColumn, frameRow, alphaThreshold }) {
  const originX = frameColumn * frameSize;
  const originY = frameRow * frameSize;
  const interior = new Uint8Array(frameSize * frameSize);
  const totals = emptyNoiseTotals();

  for (let y = 1; y < frameSize - 1; y++) {
    for (let x = 1; x < frameSize - 1; x++) {
      if (!opaqueAt(data, width, originX + x, originY + y, alphaThreshold)) continue;
      let surrounded = true;
      for (let dy = -1; dy <= 1 && surrounded; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          if (!opaqueAt(data, width, originX + x + dx, originY + y + dy, alphaThreshold)) {
            surrounded = false;
            break;
          }
        }
      }
      if (surrounded) interior[x + y * frameSize] = 1;
    }
  }

  for (let y = 1; y < frameSize - 1; y++) {
    for (let x = 1; x < frameSize - 1; x++) {
      if (!interior[x + y * frameSize]) continue;
      totals.interiorPixels += 1;
      const center = rgbAt(data, width, originX + x, originY + y);
      const neighboringColors = new Set();
      let contrastingNeighbors = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const neighbor = rgbAt(data, width, originX + x + dx, originY + y + dy);
          neighboringColors.add(rgbKey(neighbor));
          if ((dx !== 0 || dy !== 0) && colorDistance(center, neighbor) >= COLOR_EDGE_THRESHOLD) {
            contrastingNeighbors += 1;
          }
        }
      }
      totals.localDiversity += Math.min(1, (neighboringColors.size - 1) / 5);
      if (contrastingNeighbors >= 7) totals.isolatedFlecks += 1;

      for (const [[ax, ay], [bx, by]] of [
        [[-1, 0], [1, 0]],
        [[0, -1], [0, 1]],
        [[-1, -1], [1, 1]],
        [[1, -1], [-1, 1]]
      ]) {
        const a = rgbAt(data, width, originX + x + ax, originY + y + ay);
        const b = rgbAt(data, width, originX + x + bx, originY + y + by);
        totals.microAxes += 1;
        if (
          colorDistance(center, a) >= COLOR_EDGE_THRESHOLD &&
          colorDistance(center, b) >= COLOR_EDGE_THRESHOLD &&
          colorDistance(a, b) < COLOR_EDGE_THRESHOLD * 0.55
        ) {
          totals.microReversals += 1;
        }
      }

      if (
        interior[x + 1 + y * frameSize] &&
        interior[x + (y + 1) * frameSize] &&
        interior[x + 1 + (y + 1) * frameSize]
      ) {
        const right = rgbAt(data, width, originX + x + 1, originY + y);
        const down = rgbAt(data, width, originX + x, originY + y + 1);
        const diagonal = rgbAt(data, width, originX + x + 1, originY + y + 1);
        totals.checkerboardSamples += 1;
        if (
          colorDistance(center, diagonal) < COLOR_EDGE_THRESHOLD * 0.55 &&
          colorDistance(right, down) < COLOR_EDGE_THRESHOLD * 0.55 &&
          colorDistance(center, right) >= COLOR_EDGE_THRESHOLD
        ) {
          totals.checkerboards += 1;
        }
      }

      for (const [dx, dy] of [[1, 0], [0, 1]]) {
        if (!interior[x + dx + (y + dy) * frameSize]) continue;
        totals.interiorPairs += 1;
        if (
          colorDistance(center, rgbAt(data, width, originX + x + dx, originY + y + dy)) >=
          COLOR_EDGE_THRESHOLD
        ) {
          totals.noisyPairs += 1;
        }
      }
    }
  }

  return Object.freeze({
    score: noiseScore(totals),
    transitionRatio: ratio(totals.noisyPairs, totals.interiorPairs),
    isolatedFleckRatio: ratio(totals.isolatedFlecks, totals.interiorPixels),
    microReversalRatio: ratio(totals.microReversals, totals.microAxes),
    checkerboardRatio: ratio(totals.checkerboards, totals.checkerboardSamples),
    localColorDiversity: ratio(totals.localDiversity, totals.interiorPixels),
    interiorPixels: totals.interiorPixels,
    interiorPairs: totals.interiorPairs,
    noisyPairs: totals.noisyPairs,
    isolatedFlecks: totals.isolatedFlecks,
    microAxes: totals.microAxes,
    microReversals: totals.microReversals,
    checkerboardSamples: totals.checkerboardSamples,
    checkerboards: totals.checkerboards,
    localDiversity: totals.localDiversity
  });
}

function emptyNoiseTotals() {
  return {
    interiorPixels: 0,
    interiorPairs: 0,
    noisyPairs: 0,
    isolatedFlecks: 0,
    microAxes: 0,
    microReversals: 0,
    checkerboardSamples: 0,
    checkerboards: 0,
    localDiversity: 0
  };
}

function addNoiseTotals(target, source) {
  for (const key of Object.keys(target)) target[key] += source[key];
}

function noiseScore(totals) {
  if (totals.interiorPixels === 0) return 0;
  const score = 100 * (
    ratio(totals.microReversals, totals.microAxes) * 0.45 +
    ratio(totals.checkerboards, totals.checkerboardSamples) * 0.25 +
    ratio(totals.isolatedFlecks, totals.interiorPixels) * 0.2 +
    ratio(totals.localDiversity, totals.interiorPixels) * 0.1
  );
  return rounded(score);
}

function colorDistance(a, b) {
  const dr = (a.r - b.r) / 255;
  const dg = (a.g - b.g) / 255;
  const db = (a.b - b.b) / 255;
  return Math.sqrt((dr * dr * 2 + dg * dg * 4 + db * db * 3) / 9);
}

function opaqueAt(data, width, x, y, alphaThreshold) {
  return data[(x + y * width) * 4 + 3] >= alphaThreshold;
}

function rgbAt(data, width, x, y) {
  const offset = (x + y * width) * 4;
  return { r: data[offset], g: data[offset + 1], b: data[offset + 2] };
}

function rgbKey(color) {
  return color.r * 65536 + color.g * 256 + color.b;
}

function ratio(numerator, denominator) {
  return denominator > 0 ? rounded(numerator / denominator) : 0;
}

function rounded(value) {
  return Number(value.toFixed(4));
}

function validateRasterInput({
  data,
  width,
  height,
  frameSize,
  headingCount,
  sheetColumns,
  alphaThreshold
}) {
  if (!(data instanceof Uint8Array || data instanceof Uint8ClampedArray)) {
    throw new Error("Ship raster noise scoring requires RGBA byte data");
  }
  for (const [label, value] of Object.entries({
    width,
    height,
    frameSize,
    headingCount,
    sheetColumns
  })) {
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error(`Ship raster noise scoring requires a positive integer ${label}`);
    }
  }
  if (data.length !== width * height * 4) {
    throw new Error("Ship raster noise RGBA data has incompatible dimensions");
  }
  if (width < frameSize * sheetColumns) {
    throw new Error("Ship raster noise sheet is narrower than its declared columns");
  }
  if (height < frameSize * Math.ceil(headingCount / sheetColumns)) {
    throw new Error("Ship raster noise sheet is shorter than its declared headings");
  }
  if (!Number.isFinite(alphaThreshold) || alphaThreshold < 0 || alphaThreshold > 255) {
    throw new Error("Ship raster noise alpha threshold must be between 0 and 255");
  }
}
