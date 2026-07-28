const perimeterSamplesByFrame = new WeakMap();

export function validateShipFootprintBake(bake, expectedFrameSize, expectedHeadings, requiredSlugs) {
  if (!bake || bake.frameSize !== expectedFrameSize || bake.headings !== expectedHeadings) {
    throw new Error("Ship hull footprint bake has incompatible dimensions");
  }
  if (!bake.ships || typeof bake.ships !== "object" || Array.isArray(bake.ships)) {
    throw new Error("Ship hull footprint bake is missing its ships object");
  }
  const bySlug = new Map();
  for (const [slug, frames] of Object.entries(bake.ships)) {
    bySlug.set(slug, validateShipFootprintFrames(slug, frames, expectedHeadings));
  }
  for (const slug of requiredSlugs) {
    if (!bySlug.has(slug)) throw new Error(`Ship hull footprint bake is missing: ${slug}`);
  }
  return bySlug;
}

export function validateShipFootprintFrames(slug, frames, expectedHeadings) {
  if (!Array.isArray(frames) || frames.length !== expectedHeadings) {
    throw new Error(`Ship ${slug} must have ${expectedHeadings} hull footprint frames`);
  }
  return Object.freeze(frames.map((frame, index) => validateShipFootprintFrame(slug, index, frame)));
}

export function shipFootprintFrame(frames, heading) {
  if (!Array.isArray(frames) || frames.length === 0) throw new Error("Ship hull footprints are required");
  validateVector(heading, "ship footprint heading");
  const angle = Math.atan2(heading.y, heading.x);
  const raw = Math.round(angle / (Math.PI * 2) * frames.length);
  return frames[((raw % frames.length) + frames.length) % frames.length];
}

export function translatedShipFootprint(frame, x, y) {
  validateFrame(frame);
  if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error("Ship footprint translation must be finite");
  return frame.polygon.map((point) => ({ x: x + point.x, y: y + point.y }));
}

export function shipFootprintPerimeterSamples(frame, maximumStep = 2) {
  validateFrame(frame);
  if (!Number.isFinite(maximumStep) || maximumStep <= 0) {
    throw new Error(`Invalid ship footprint perimeter step: ${maximumStep}`);
  }
  let samplesByStep = perimeterSamplesByFrame.get(frame);
  if (!samplesByStep) {
    samplesByStep = new Map();
    perimeterSamplesByFrame.set(frame, samplesByStep);
  }
  const cached = samplesByStep.get(maximumStep);
  if (cached) return cached;
  const samples = [];
  for (let index = 0; index < frame.polygon.length; index++) {
    const start = frame.polygon[index];
    const end = frame.polygon[(index + 1) % frame.polygon.length];
    const steps = Math.max(1, Math.ceil(Math.hypot(end.x - start.x, end.y - start.y) / maximumStep));
    for (let step = 0; step < steps; step++) {
      const t = step / steps;
      samples.push({
        x: start.x + (end.x - start.x) * t,
        y: start.y + (end.y - start.y) * t
      });
    }
  }
  const result = Object.freeze(uniquePoints(samples));
  samplesByStep.set(maximumStep, result);
  return result;
}

export function shipFootprintCollision(a, b, padding = 0) {
  validatePolygon(a, "first ship footprint");
  validatePolygon(b, "second ship footprint");
  if (!Number.isFinite(padding) || padding < 0) throw new Error(`Invalid ship footprint padding: ${padding}`);
  const centerA = polygonCenter(a);
  const centerB = polygonCenter(b);
  let best = null;
  for (const axis of [...polygonAxes(a), ...polygonAxes(b)]) {
    const projectionA = projectPolygon(a, axis);
    const projectionB = projectPolygon(b, axis);
    const overlap = Math.min(projectionA.max, projectionB.max) - Math.max(projectionA.min, projectionB.min) + padding;
    if (overlap <= 0) return null;
    if (!best || overlap < best.penetration) best = { normal: axis, penetration: overlap };
  }
  if (!best) throw new Error("Ship footprint collision found no separating axes");
  const centerDelta = { x: centerB.x - centerA.x, y: centerB.y - centerA.y };
  if (centerDelta.x * best.normal.x + centerDelta.y * best.normal.y < 0) {
    best.normal = { x: -best.normal.x, y: -best.normal.y };
  }
  return best;
}

export function firstSegmentShipFootprintHit(start, end, polygon) {
  validatePoint(start, "segment start");
  validatePoint(end, "segment end");
  validatePolygon(polygon, "projectile ship footprint");
  if (pointInShipFootprint(start, polygon)) return { fraction: 0, x: start.x, y: start.y };
  let bestFraction = null;
  for (let i = 0; i < polygon.length; i++) {
    const fraction = segmentIntersectionFraction(start, end, polygon[i], polygon[(i + 1) % polygon.length]);
    if (fraction === null || (bestFraction !== null && fraction >= bestFraction)) continue;
    bestFraction = fraction;
  }
  return bestFraction === null ? null : {
    fraction: bestFraction,
    x: start.x + (end.x - start.x) * bestFraction,
    y: start.y + (end.y - start.y) * bestFraction
  };
}

export function pointInShipFootprint(point, polygon) {
  validatePoint(point, "ship footprint point");
  validatePolygon(polygon, "ship footprint polygon");
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    if (pointOnSegment(point, a, b)) return true;
    if ((a.y > point.y) === (b.y > point.y)) continue;
    const crossingX = (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x;
    if (point.x < crossingX) inside = !inside;
  }
  return inside;
}

export function shipFootprintRadius(frame) {
  validateFrame(frame);
  return Math.max(...frame.polygon.map((point) => Math.hypot(point.x, point.y)));
}

export function shipFootprintCenter(frame) {
  validateFrame(frame);
  return polygonCenter(frame.polygon);
}

export function shipFootprintPolygonCenter(polygon) {
  validatePolygon(polygon, "ship footprint polygon");
  return polygonCenter(polygon);
}

function validateShipFootprintFrame(slug, index, frame) {
  try {
    validateFrame(frame);
  } catch (error) {
    throw new Error(`Invalid hull footprint for ${slug} frame ${index}: ${error.message}`);
  }
  return Object.freeze({
    polygon: Object.freeze(frame.polygon.map(freezePoint)),
    samples: Object.freeze(frame.samples.map(freezePoint))
  });
}

function validateFrame(frame) {
  if (!frame || typeof frame !== "object") throw new Error("frame is missing");
  validatePolygon(frame.polygon, "polygon");
  if (!Array.isArray(frame.samples) || frame.samples.length < 3) throw new Error("samples are missing");
  for (const point of frame.samples) validatePoint(point, "sample");
}

function validatePolygon(polygon, label) {
  if (!Array.isArray(polygon) || polygon.length < 3) throw new Error(`${label} requires at least three points`);
  for (const point of polygon) validatePoint(point, label);
}

function validatePoint(point, label) {
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) throw new Error(`Invalid ${label}`);
}

function validateVector(vector, label) {
  validatePoint(vector, label);
  if (Math.hypot(vector.x, vector.y) <= 1e-6) throw new Error(`Invalid ${label}`);
}

function uniquePoints(points) {
  return [...new Map(points.map((point) => [`${point.x},${point.y}`, point])).values()].map(freezePoint);
}

function polygonAxes(polygon) {
  const axes = [];
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = Math.hypot(dx, dy);
    if (length <= 1e-6) continue;
    axes.push({ x: -dy / length, y: dx / length });
  }
  return axes;
}

function projectPolygon(polygon, axis) {
  const values = polygon.map((point) => point.x * axis.x + point.y * axis.y);
  return { min: Math.min(...values), max: Math.max(...values) };
}

function polygonCenter(polygon) {
  return polygon.reduce((center, point) => ({ x: center.x + point.x / polygon.length, y: center.y + point.y / polygon.length }), { x: 0, y: 0 });
}

function segmentIntersectionFraction(a, b, c, d) {
  const rx = b.x - a.x;
  const ry = b.y - a.y;
  const sx = d.x - c.x;
  const sy = d.y - c.y;
  const denominator = rx * sy - ry * sx;
  if (Math.abs(denominator) <= 1e-9) return null;
  const qx = c.x - a.x;
  const qy = c.y - a.y;
  const t = (qx * sy - qy * sx) / denominator;
  const u = (qx * ry - qy * rx) / denominator;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? t : null;
}

function pointOnSegment(point, a, b) {
  const cross = (point.x - a.x) * (b.y - a.y) - (point.y - a.y) * (b.x - a.x);
  if (Math.abs(cross) > 1e-6) return false;
  return point.x >= Math.min(a.x, b.x) - 1e-6 && point.x <= Math.max(a.x, b.x) + 1e-6 &&
    point.y >= Math.min(a.y, b.y) - 1e-6 && point.y <= Math.max(a.y, b.y) + 1e-6;
}

function freezePoint(point) {
  return Object.freeze({ x: point.x, y: point.y });
}
