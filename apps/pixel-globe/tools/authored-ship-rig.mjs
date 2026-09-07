import assert from "node:assert/strict";

const axes = ["x", "y", "z"];
export function authoredRigAlignment(source, target) {
  assert.ok(source.length >= 3 && source.length === target.length, "Authored rig hull anchor topology changed");
  for (const point of [...source, ...target]) {
    assert.ok(axes.every(axis => Number.isFinite(point[axis])), "Authored rig anchor needs finite coordinates");
  }
  const bounds = points => Object.fromEntries(axes.map(axis => {
    let min = Infinity, max = -Infinity;
    for (const point of points) { min = Math.min(min, point[axis]); max = Math.max(max, point[axis]); }
    return [axis, { center: (min + max) / 2, size: max - min }];
  }));
  const from = bounds(source), to = bounds(target);
  const scale = to.z.size / from.z.size;
  assert.ok(Number.isFinite(scale) && scale > 0, "Authored rig needs a positive hull scale");
  const transform = point => Object.fromEntries(axes.map(axis =>
    [axis, (point[axis] - from[axis].center) * scale + to[axis].center]));
  // Check every paired hull vertex, not just bounding boxes: a mirrored or
  // differently oriented source must never pass registration.
  for (let i = 0; i < source.length; i++) {
    const aligned = transform(source[i]);
    assert.ok(axes.every(axis => Math.abs(aligned[axis] - target[i][axis]) < 1e-5),
      "Authored rig hull orientation or geometry differs from the sailing model");
  }
  return { transform, hullWidth: to.x.size };
}

function segmentDistance(point, { start, end }) {
  const delta = axes.map(axis => end[axis] - start[axis]);
  const length2 = delta.reduce((sum, value) => sum + value * value, 0);
  assert.ok(Number.isFinite(length2) && length2 > 0, "Authored rig requires a finite yard segment");
  const t = Math.max(0, Math.min(1, axes.reduce((sum, axis, index) =>
    sum + (point[axis] - start[axis]) * delta[index], 0) / length2));
  return Math.sqrt(axes.reduce((sum, axis, index) =>
    sum + (point[axis] - start[axis] - t * delta[index]) ** 2, 0));
}

export function selectAuthoredRigComponents(centers, supports, { maxDistance, expectedCount }) {
  assert.ok(supports.length > 0 && Number.isFinite(maxDistance) && maxDistance > 0,
    "Authored rig requires retained yards and a positive matching distance");
  assert.ok(Number.isInteger(expectedCount) && expectedCount > 0, "Authored rig needs an expected component count");
  const covered = new Set();
  const selected = [];
  for (let index = 0; index < centers.length; index++) {
    assert.ok(axes.every(axis => Number.isFinite(centers[index][axis])), "Authored cloth center must be finite");
    const distances = supports.map(support => segmentDistance(centers[index], support));
    const nearest = Math.min(...distances);
    if (nearest > maxDistance) continue; // Cloth belonging to deliberately removed masts.
    assert.equal(distances.filter(distance => Math.abs(distance - nearest) < 1e-8).length, 1,
      "Authored cloth matches multiple yards ambiguously");
    covered.add(distances.indexOf(nearest));
    selected.push(index);
  }
  assert.equal(selected.length, expectedCount, "Authored rig retained the wrong number of tied cloth sections");
  assert.equal(covered.size, supports.length, "A retained yard has no authored furled sail");
  return selected;
}
