const DEFAULT_SLICE_COUNT = 128;
const DEFAULT_IMMERSION_RATIO = 0.36;
const MIN_DOMINANT_LENGTH_RATIO = 0.68;
const MIN_SECONDARY_HULL_RATIO = 0.24;
const MIN_HULL_LENGTH_RATIO = 0.62;
const MIN_HULL_BEAM_RATIO = 0.32;

export function estimateShipWaterlineY(triangles, options = {}) {
  const expectedHullCount = options.expectedHullCount ?? 1;
  const sliceCount = options.sliceCount ?? DEFAULT_SLICE_COUNT;
  const immersionRatio = options.immersionRatio ?? DEFAULT_IMMERSION_RATIO;
  const label = options.label || "ship";
  validateEstimatorInputs(triangles, expectedHullCount, sliceCount, immersionRatio);

  const bounds = triangleBounds(triangles);
  const tolerance = Math.max(bounds.sizeX, bounds.sizeZ) * 0.003;
  const slices = [];
  for (let index = 0; index < sliceCount; index++) {
    const y = bounds.minY + (bounds.sizeY * (index + 0.5)) / sliceCount;
    const analysis = analyzeWaterlineSlice(triangles, y, { expectedHullCount, tolerance });
    if (analysis) slices.push({ ...analysis, index });
  }
  if (slices.length === 0) throw new Error(`${label} has no usable horizontal waterline slices`);

  const structurallyValid = slices.filter((slice) => slice.structureValid);
  if (structurallyValid.length === 0) {
    throw new Error(`${label} has no ${expectedHullCount}-hull waterline slice with a dominant connected shape`);
  }
  const maxLength = Math.max(...structurallyValid.map((slice) => slice.length));
  const longSlices = structurallyValid.filter((slice) => slice.length >= maxLength * MIN_HULL_LENGTH_RATIO);
  const maxBeam = Math.max(...longSlices.map((slice) => slice.beam));
  const hullSlices = longSlices.filter((slice) => slice.beam >= maxBeam * MIN_HULL_BEAM_RATIO);
  const runs = contiguousRuns(hullSlices);
  if (runs.length === 0) throw new Error(`${label} has no contiguous hull-shaped waterline interval`);

  const run = runs.sort(compareHullRuns)[0];
  const targetIndex = run[0].index + (run.at(-1).index - run[0].index) * immersionRatio;
  const chosen = run.reduce((best, slice) => (
    Math.abs(slice.index - targetIndex) < Math.abs(best.index - targetIndex) ? slice : best
  ));
  if (!chosen.structureValid) throw new Error(`${label} selected an invalid fragmented waterline slice`);

  return Object.freeze({
    y: chosen.y,
    expectedHullCount,
    componentCount: chosen.componentCount,
    dominantLengthRatio: chosen.dominantLengthRatio,
    beam: chosen.beam,
    length: chosen.length,
    hullIntervalMinY: run[0].y,
    hullIntervalMaxY: run.at(-1).y
  });
}

export function analyzeWaterlineSlice(triangles, y, options = {}) {
  const expectedHullCount = options.expectedHullCount ?? 1;
  const tolerance = options.tolerance ?? 1e-4;
  if (!Number.isFinite(y)) throw new Error(`Waterline slice has invalid height: ${y}`);
  if (!Number.isInteger(expectedHullCount) || expectedHullCount < 1) {
    throw new Error(`Waterline slice has invalid hull count: ${expectedHullCount}`);
  }
  if (!Number.isFinite(tolerance) || tolerance <= 0) {
    throw new Error(`Waterline slice has invalid tolerance: ${tolerance}`);
  }

  const segments = triangles.flatMap((triangle) => trianglePlaneSegments(triangle, y, tolerance));
  if (segments.length === 0) return null;
  const components = connectedSegmentComponents(segments, tolerance)
    .map(componentMetrics)
    .filter((component) => component.totalLength > tolerance)
    .sort((a, b) => b.totalLength - a.totalLength);
  if (components.length < expectedHullCount) {
    return sliceResult(y, components, expectedHullCount, false);
  }

  const selected = components.slice(0, expectedHullCount);
  const totalLength = components.reduce((sum, component) => sum + component.totalLength, 0);
  const selectedLength = selected.reduce((sum, component) => sum + component.totalLength, 0);
  const dominantLengthRatio = selectedLength / totalLength;
  const secondaryIsSubstantial = expectedHullCount === 1 ||
    selected.at(-1).totalLength >= selected[0].totalLength * MIN_SECONDARY_HULL_RATIO;
  return sliceResult(
    y,
    components,
    expectedHullCount,
    dominantLengthRatio >= MIN_DOMINANT_LENGTH_RATIO && secondaryIsSubstantial
  );
}

function sliceResult(y, components, expectedHullCount, structureValid) {
  const selected = components.slice(0, expectedHullCount);
  const totalLength = components.reduce((sum, component) => sum + component.totalLength, 0);
  const selectedLength = selected.reduce((sum, component) => sum + component.totalLength, 0);
  const minX = Math.min(...selected.map((component) => component.minX));
  const maxX = Math.max(...selected.map((component) => component.maxX));
  const minZ = Math.min(...selected.map((component) => component.minZ));
  const maxZ = Math.max(...selected.map((component) => component.maxZ));
  return {
    y,
    componentCount: components.length,
    dominantLengthRatio: totalLength > 0 ? selectedLength / totalLength : 0,
    beam: selected.length ? maxX - minX : 0,
    length: selected.length ? maxZ - minZ : 0,
    structureValid
  };
}

function trianglePlaneSegments(triangle, y, tolerance) {
  const points = triangle?.points;
  if (!Array.isArray(points) || points.length !== 3) throw new Error("Waterline analysis requires triangle points");
  const intersections = [];
  for (let index = 0; index < 3; index++) {
    const a = points[index];
    const b = points[(index + 1) % 3];
    validatePoint(a);
    validatePoint(b);
    const da = a.y - y;
    const db = b.y - y;
    if (Math.abs(da) <= tolerance && Math.abs(db) <= tolerance) continue;
    if (da * db > 0) continue;
    const denominator = da - db;
    if (Math.abs(denominator) <= tolerance) continue;
    const t = da / denominator;
    if (t < -tolerance || t > 1 + tolerance) continue;
    addUniquePoint(intersections, {
      x: a.x + (b.x - a.x) * t,
      z: a.z + (b.z - a.z) * t
    }, tolerance);
  }
  if (intersections.length < 2) return [];
  let best = null;
  for (let a = 0; a < intersections.length; a++) {
    for (let b = a + 1; b < intersections.length; b++) {
      const length = distance2(intersections[a], intersections[b]);
      if (!best || length > best.length) best = { a: intersections[a], b: intersections[b], length };
    }
  }
  return best && best.length > tolerance ? [{ a: best.a, b: best.b, length: best.length }] : [];
}

function connectedSegmentComponents(segments, tolerance) {
  const parents = segments.map((_, index) => index);
  const find = (index) => {
    while (parents[index] !== index) {
      parents[index] = parents[parents[index]];
      index = parents[index];
    }
    return index;
  };
  const union = (a, b) => {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) parents[rootB] = rootA;
  };
  const cells = new Map();
  const cellSize = tolerance * 2;
  for (let index = 0; index < segments.length; index++) {
    for (const point of [segments[index].a, segments[index].b]) {
      const cellX = Math.floor(point.x / cellSize);
      const cellZ = Math.floor(point.z / cellSize);
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          for (const candidate of cells.get(`${cellX + dx},${cellZ + dz}`) || []) {
            if (pointsTouch(point, candidate.point, tolerance)) union(index, candidate.segmentIndex);
          }
        }
      }
      const key = `${cellX},${cellZ}`;
      if (!cells.has(key)) cells.set(key, []);
      cells.get(key).push({ point, segmentIndex: index });
    }
  }
  const grouped = new Map();
  for (let index = 0; index < segments.length; index++) {
    const root = find(index);
    if (!grouped.has(root)) grouped.set(root, []);
    grouped.get(root).push(segments[index]);
  }
  return [...grouped.values()];
}

function componentMetrics(segments) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  let totalLength = 0;
  for (const segment of segments) {
    totalLength += segment.length;
    for (const point of [segment.a, segment.b]) {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minZ = Math.min(minZ, point.z);
      maxZ = Math.max(maxZ, point.z);
    }
  }
  return {
    totalLength,
    minX,
    maxX,
    minZ,
    maxZ
  };
}

function contiguousRuns(slices) {
  const sorted = [...slices].sort((a, b) => a.index - b.index);
  const runs = [];
  for (const slice of sorted) {
    const run = runs.at(-1);
    if (!run || slice.index !== run.at(-1).index + 1) runs.push([slice]);
    else run.push(slice);
  }
  return runs;
}

function compareHullRuns(a, b) {
  const spanA = a.at(-1).y - a[0].y;
  const spanB = b.at(-1).y - b[0].y;
  if (Math.abs(spanA - spanB) > 1e-9) return spanB - spanA;
  return a[0].y - b[0].y;
}

function triangleBounds(triangles) {
  let pointCount = 0;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const triangle of triangles) {
    for (const point of triangle?.points || []) {
      validatePoint(point);
      pointCount++;
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
      minZ = Math.min(minZ, point.z);
      maxZ = Math.max(maxZ, point.z);
    }
  }
  if (pointCount === 0) throw new Error("Cannot estimate ship waterline without model points");
  const sizeY = maxY - minY;
  if (sizeY <= 0) throw new Error("Ship waterline model has no vertical extent");
  return { minX, maxX, minY, maxY, minZ, maxZ, sizeX: maxX - minX, sizeY, sizeZ: maxZ - minZ };
}

function validateEstimatorInputs(triangles, expectedHullCount, sliceCount, immersionRatio) {
  if (!Array.isArray(triangles) || triangles.length === 0) throw new Error("Ship waterline requires triangles");
  if (!Number.isInteger(expectedHullCount) || expectedHullCount < 1) {
    throw new Error(`Ship waterline has invalid hull count: ${expectedHullCount}`);
  }
  if (!Number.isInteger(sliceCount) || sliceCount < 16) {
    throw new Error(`Ship waterline has invalid slice count: ${sliceCount}`);
  }
  if (!Number.isFinite(immersionRatio) || immersionRatio <= 0 || immersionRatio >= 1) {
    throw new Error(`Ship waterline has invalid immersion ratio: ${immersionRatio}`);
  }
}

function validatePoint(point) {
  if (![point?.x, point?.y, point?.z].every(Number.isFinite)) {
    throw new Error("Ship waterline triangle contains an invalid point");
  }
}

function addUniquePoint(points, point, tolerance) {
  if (!points.some((existing) => pointsTouch(existing, point, tolerance))) points.push(point);
}

function pointsTouch(a, b, tolerance) {
  return distance2(a, b) <= tolerance;
}

function distance2(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}
