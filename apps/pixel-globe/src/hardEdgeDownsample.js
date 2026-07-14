const DEFAULT_COVERAGE_THRESHOLD = 0.3;
const NEIGHBOR_OFFSETS = [
  [-1, -1], [0, -1], [1, -1],
  [-1, 0],           [1, 0],
  [-1, 1],  [0, 1],  [1, 1]
];

export function hardEdgeSampleMap({
  rgba,
  sourceWidth,
  sourceHeight,
  sourceFeatures = null,
  bounds,
  targetWidth,
  targetHeight,
  coverageThreshold = DEFAULT_COVERAGE_THRESHOLD
}) {
  validateDimensions(rgba, sourceWidth, sourceHeight, bounds, targetWidth, targetHeight);
  if (sourceFeatures && sourceFeatures.length !== sourceWidth * sourceHeight) {
    throw new Error("Hard-edge feature buffer does not match its source dimensions");
  }
  if (!(coverageThreshold > 0 && coverageThreshold <= 1)) {
    throw new Error(`Hard-edge coverage threshold must be in (0, 1], got ${coverageThreshold}`);
  }

  const { labels: componentLabels, preservedComponents } = labelOpaqueComponents(
    rgba,
    sourceFeatures,
    sourceWidth,
    sourceHeight
  );
  const samples = new Int32Array(targetWidth * targetHeight);
  const sampleComponents = new Int32Array(targetWidth * targetHeight);
  const cells = new Array(targetWidth * targetHeight);
  samples.fill(-1);
  sampleComponents.fill(-1);

  for (let targetY = 0; targetY < targetHeight; targetY++) {
    const sourceY0 = bounds.minY + targetY / targetHeight * bounds.height;
    const sourceY1 = bounds.minY + (targetY + 1) / targetHeight * bounds.height;
    for (let targetX = 0; targetX < targetWidth; targetX++) {
      const sourceX0 = bounds.minX + targetX / targetWidth * bounds.width;
      const sourceX1 = bounds.minX + (targetX + 1) / targetWidth * bounds.width;
      const targetIndex = targetX + targetY * targetWidth;
      const cell = collectCoveredSourcePixels({
        rgba,
        componentLabels,
        sourceWidth,
        sourceHeight,
        sourceX0,
        sourceY0,
        sourceX1,
        sourceY1
      });
      cells[targetIndex] = cell;
      if (cell.opaqueArea / cell.targetArea < coverageThreshold) continue;
      const dominantComponent = dominantComponentForCell(cell);
      samples[targetIndex] = representativeSourcePixel(
        cell.components.get(dominantComponent),
        cell,
        rgba
      );
      sampleComponents[targetIndex] = dominantComponent;
    }
  }

  seedPreservedFeatureEndpoints({
    rgba,
    samples,
    sampleComponents,
    cells,
    preservedComponents,
    targetWidth
  });
  repairComponentConnectivity({
    rgba,
    samples,
    sampleComponents,
    cells,
    preservedComponents,
    targetWidth,
    targetHeight
  });
  return samples;
}

function seedPreservedFeatureEndpoints({
  rgba,
  samples,
  sampleComponents,
  cells,
  preservedComponents,
  targetWidth
}) {
  for (const component of preservedComponents) {
    const candidates = [];
    for (let index = 0; index < cells.length; index++) {
      if (!cells[index].components.has(component)) continue;
      if (
        sampleComponents[index] >= 0 &&
        sampleComponents[index] !== component &&
        !preservedComponents.has(sampleComponents[index])
      ) {
        continue;
      }
      candidates.push(index);
    }
    if (candidates.length === 0) continue;
    let endpoints = [candidates[0]];
    let greatestDistance = -1;
    for (let first = 0; first < candidates.length; first++) {
      for (let second = first + 1; second < candidates.length; second++) {
        const firstX = candidates[first] % targetWidth;
        const firstY = Math.floor(candidates[first] / targetWidth);
        const secondX = candidates[second] % targetWidth;
        const secondY = Math.floor(candidates[second] / targetWidth);
        const distance = (secondX - firstX) ** 2 + (secondY - firstY) ** 2;
        if (distance > greatestDistance) {
          greatestDistance = distance;
          endpoints = [candidates[first], candidates[second]];
        }
      }
    }
    for (const index of endpoints) {
      if (preservedComponents.has(sampleComponents[index])) continue;
      const entry = cells[index].components.get(component);
      samples[index] = representativeSourcePixel(entry, cells[index], rgba);
      sampleComponents[index] = component;
    }
  }
}

function collectCoveredSourcePixels({
  rgba,
  componentLabels,
  sourceWidth,
  sourceHeight,
  sourceX0,
  sourceY0,
  sourceX1,
  sourceY1
}) {
  const minX = Math.max(0, Math.floor(sourceX0));
  const maxX = Math.min(sourceWidth - 1, Math.ceil(sourceX1) - 1);
  const minY = Math.max(0, Math.floor(sourceY0));
  const maxY = Math.min(sourceHeight - 1, Math.ceil(sourceY1) - 1);
  const cell = {
    centerX: (sourceX0 + sourceX1) / 2,
    centerY: (sourceY0 + sourceY1) / 2,
    targetArea: (sourceX1 - sourceX0) * (sourceY1 - sourceY0),
    opaqueArea: 0,
    components: new Map()
  };

  for (let sourceY = minY; sourceY <= maxY; sourceY++) {
    const overlapY = overlap(sourceY0, sourceY1, sourceY, sourceY + 1);
    if (overlapY <= 0) continue;
    for (let sourceX = minX; sourceX <= maxX; sourceX++) {
      const overlapArea = overlap(sourceX0, sourceX1, sourceX, sourceX + 1) * overlapY;
      if (overlapArea <= 0) continue;
      const sourceIndex = sourceX + sourceY * sourceWidth;
      const sourceOffset = sourceIndex * 4;
      if (rgba[sourceOffset + 3] < 128) continue;
      const component = componentLabels[sourceIndex];
      if (component < 0) throw new Error("Opaque source pixel was not assigned a component");
      const entry = cell.components.get(component) ?? { area: 0, candidates: [] };
      entry.area += overlapArea;
      entry.candidates.push({ sourceIndex, sourceX, sourceY, overlapArea });
      cell.components.set(component, entry);
      cell.opaqueArea += overlapArea;
    }
  }
  return cell;
}

function dominantComponentForCell(cell) {
  let dominantComponent = -1;
  let dominantArea = -1;
  for (const [component, entry] of cell.components) {
    if (entry.area > dominantArea) {
      dominantArea = entry.area;
      dominantComponent = component;
    }
  }
  if (dominantComponent < 0) throw new Error("Opaque hard-edge coverage had no source component");
  return dominantComponent;
}

function representativeSourcePixel(entry, cell, rgba) {
  let weightedRed = 0;
  let weightedGreen = 0;
  let weightedBlue = 0;
  for (const candidate of entry.candidates) {
    const sourceOffset = candidate.sourceIndex * 4;
    weightedRed += rgba[sourceOffset] * candidate.overlapArea;
    weightedGreen += rgba[sourceOffset + 1] * candidate.overlapArea;
    weightedBlue += rgba[sourceOffset + 2] * candidate.overlapArea;
  }
  const averageRed = weightedRed / entry.area;
  const averageGreen = weightedGreen / entry.area;
  const averageBlue = weightedBlue / entry.area;
  let bestIndex = -1;
  let bestScore = Infinity;

  for (const candidate of entry.candidates) {
    const sourceOffset = candidate.sourceIndex * 4;
    const redDelta = rgba[sourceOffset] - averageRed;
    const greenDelta = rgba[sourceOffset + 1] - averageGreen;
    const blueDelta = rgba[sourceOffset + 2] - averageBlue;
    const colorDistance = redDelta * redDelta + greenDelta * greenDelta + blueDelta * blueDelta;
    const xDelta = candidate.sourceX + 0.5 - cell.centerX;
    const yDelta = candidate.sourceY + 0.5 - cell.centerY;
    const centerDistance = xDelta * xDelta + yDelta * yDelta;
    const score = colorDistance + centerDistance * 4 - candidate.overlapArea;
    if (score < bestScore) {
      bestScore = score;
      bestIndex = candidate.sourceIndex;
    }
  }
  if (bestIndex < 0) throw new Error("Covered component had no representative source pixel");
  return bestIndex;
}

function repairComponentConnectivity({
  rgba,
  samples,
  sampleComponents,
  cells,
  preservedComponents,
  targetWidth,
  targetHeight
}) {
  const components = new Set([...sampleComponents, ...preservedComponents]);
  components.delete(-1);
  for (const component of components) {
    const retained = new Set();
    for (let index = 0; index < sampleComponents.length; index++) {
      if (
        sampleComponents[index] === component ||
        (
          preservedComponents.has(component) &&
          preservedComponents.has(sampleComponents[index]) &&
          cells[index].components.has(component)
        )
      ) {
        retained.add(index);
      }
    }
    if (retained.size < 2) continue;

    const connected = floodRetained(retained.values().next().value, retained, targetWidth, targetHeight);
    while (connected.size < retained.size) {
      const path = shortestCoveredPath({
        component,
        connected,
        retained,
        sampleComponents,
        cells,
        preservedComponents,
        targetWidth,
        targetHeight
      });
      if (!path) {
        if (preservedComponents.has(component)) break;
        throw new Error(`Hard-edge reducer could not preserve source component ${component}`);
      }
      for (const index of path) {
        if (
          sampleComponents[index] === component ||
          preservedComponents.has(sampleComponents[index])
        ) {
          retained.add(index);
          continue;
        }
        const entry = cells[index].components.get(component);
        samples[index] = representativeSourcePixel(entry, cells[index], rgba);
        sampleComponents[index] = component;
        retained.add(index);
      }
      const expanded = floodRetained(path.at(-1), retained, targetWidth, targetHeight);
      for (const index of expanded) connected.add(index);
    }
  }
}

function shortestCoveredPath({
  component,
  connected,
  retained,
  sampleComponents,
  cells,
  preservedComponents,
  targetWidth,
  targetHeight
}) {
  const queue = [...connected];
  const visited = new Set(queue);
  const previous = new Int32Array(cells.length);
  previous.fill(-1);
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const index = queue[cursor];
    if (!connected.has(index) && retained.has(index)) {
      const path = [];
      for (let current = index; !connected.has(current); current = previous[current]) {
        if (current < 0) throw new Error("Hard-edge connectivity path was incomplete");
        path.push(current);
      }
      path.reverse();
      return path;
    }
    const neighbors = neighboringIndices(index, targetWidth, targetHeight)
      .filter((neighbor) => !visited.has(neighbor))
      .filter((neighbor) => cells[neighbor].components.has(component))
      .filter((neighbor) => (
        sampleComponents[neighbor] < 0 ||
        sampleComponents[neighbor] === component ||
        preservedComponents.has(sampleComponents[neighbor])
      ))
      .sort((a, b) => (
        cells[b].components.get(component).area - cells[a].components.get(component).area
      ));
    for (const neighbor of neighbors) {
      visited.add(neighbor);
      previous[neighbor] = index;
      queue.push(neighbor);
    }
  }
  return null;
}

function floodRetained(start, retained, width, height) {
  const connected = new Set([start]);
  const queue = [start];
  for (let cursor = 0; cursor < queue.length; cursor++) {
    for (const neighbor of neighboringIndices(queue[cursor], width, height)) {
      if (!retained.has(neighbor) || connected.has(neighbor)) continue;
      connected.add(neighbor);
      queue.push(neighbor);
    }
  }
  return connected;
}

function neighboringIndices(index, width, height) {
  const x = index % width;
  const y = Math.floor(index / width);
  const neighbors = [];
  for (const [dx, dy] of NEIGHBOR_OFFSETS) {
    const neighborX = x + dx;
    const neighborY = y + dy;
    if (neighborX < 0 || neighborX >= width || neighborY < 0 || neighborY >= height) continue;
    neighbors.push(neighborX + neighborY * width);
  }
  return neighbors;
}

function labelOpaqueComponents(rgba, sourceFeatures, width, height) {
  const labels = new Int32Array(width * height);
  labels.fill(-1);
  const preservedComponents = new Set();
  let nextComponent = 0;
  for (let start = 0; start < labels.length; start++) {
    if (rgba[start * 4 + 3] < 128 || labels[start] >= 0) continue;
    const sourceFeature = sourceFeatures?.[start] ?? -1;
    labels[start] = nextComponent;
    const queue = [start];
    for (let cursor = 0; cursor < queue.length; cursor++) {
      for (const neighbor of neighboringIndices(queue[cursor], width, height)) {
        if (labels[neighbor] >= 0 || rgba[neighbor * 4 + 3] < 128) continue;
        if ((sourceFeatures?.[neighbor] ?? -1) !== sourceFeature) continue;
        labels[neighbor] = nextComponent;
        queue.push(neighbor);
      }
    }
    if (sourceFeature >= 0) preservedComponents.add(nextComponent);
    nextComponent++;
  }
  return { labels, preservedComponents };
}

function overlap(a0, a1, b0, b1) {
  return Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
}

function validateDimensions(rgba, sourceWidth, sourceHeight, bounds, targetWidth, targetHeight) {
  for (const [label, value] of [
    ["source width", sourceWidth],
    ["source height", sourceHeight],
    ["target width", targetWidth],
    ["target height", targetHeight]
  ]) {
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error(`Hard-edge ${label} must be a positive integer, got ${value}`);
    }
  }
  if (!rgba || rgba.length !== sourceWidth * sourceHeight * 4) {
    throw new Error("Hard-edge RGBA buffer does not match its source dimensions");
  }
  if (
    !bounds ||
    !Number.isFinite(bounds.minX) ||
    !Number.isFinite(bounds.minY) ||
    !(bounds.width > 0) ||
    !(bounds.height > 0) ||
    bounds.minX < 0 ||
    bounds.minY < 0 ||
    bounds.minX + bounds.width > sourceWidth ||
    bounds.minY + bounds.height > sourceHeight
  ) {
    throw new Error("Hard-edge source bounds must be finite and remain inside the source image");
  }
}
