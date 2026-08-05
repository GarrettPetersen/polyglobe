function finitePoint(point, label) {
  if (
    !point ||
    !Number.isFinite(point.x) ||
    !Number.isFinite(point.y) ||
    !Number.isFinite(point.z)
  ) {
    throw new Error(`${label} must contain finite x, y, and z coordinates`);
  }
  return point;
}

export function selectShipFlagAnchorPoint(triangles) {
  if (!Array.isArray(triangles) || triangles.length === 0) {
    throw new Error("Ship flag anchor selection requires model triangles");
  }
  const points = [];
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let triangleIndex = 0; triangleIndex < triangles.length; triangleIndex++) {
    const triangle = triangles[triangleIndex];
    if (!triangle || !Array.isArray(triangle.points) || triangle.points.length !== 3) {
      throw new Error(`Ship flag anchor triangle ${triangleIndex} must have three points`);
    }
    for (let pointIndex = 0; pointIndex < triangle.points.length; pointIndex++) {
      const point = finitePoint(
        triangle.points[pointIndex],
        `Ship flag anchor triangle ${triangleIndex} point ${pointIndex}`
      );
      points.push(point);
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    }
  }
  const lateralSpan = maxX - minX;
  const heightSpan = maxY - minY;
  const epsilon = Math.max(1e-9, Math.max(lateralSpan, heightSpan) * 1e-7);
  const centerX = (minX + maxX) / 2;
  const upperFloor = minY + heightSpan * 0.55;
  let nearestUpperDistance = Infinity;
  for (const point of points) {
    if (point.y < upperFloor - epsilon) continue;
    nearestUpperDistance = Math.min(nearestUpperDistance, Math.abs(point.x - centerX));
  }
  if (!Number.isFinite(nearestUpperDistance)) {
    throw new Error("Ship flag anchor selection found no upper model points");
  }
  const centerlineHalfWidth = Math.max(lateralSpan * 0.12, nearestUpperDistance + epsilon);
  let highestCenterlineY = -Infinity;
  for (const point of points) {
    if (
      point.y >= upperFloor - epsilon &&
      Math.abs(point.x - centerX) <= centerlineHalfWidth + epsilon
    ) {
      highestCenterlineY = Math.max(highestCenterlineY, point.y);
    }
  }
  if (!Number.isFinite(highestCenterlineY)) {
    throw new Error("Ship flag anchor selection found no upper centerline point");
  }
  let selected = null;
  for (const point of points) {
    if (Math.abs(point.x - centerX) > centerlineHalfWidth + epsilon) continue;
    if (highestCenterlineY - point.y > epsilon) continue;
    if (
      !selected ||
      point.z < selected.z - epsilon ||
      (
        Math.abs(point.z - selected.z) <= epsilon &&
        (Math.abs(point.x - centerX) < Math.abs(selected.x - centerX) || (
          Math.abs(point.x - centerX) === Math.abs(selected.x - centerX) && point.x < selected.x
        ))
      )
    ) {
      selected = point;
    }
  }
  if (!selected) throw new Error("Ship flag anchor selection lost its upper centerline point");
  return Object.freeze({ x: selected.x, y: selected.y, z: selected.z });
}

export function validateShipFlagAnchorBake(bake, frameSize, headings, requiredRowingFramesBySlug) {
  if (!Number.isInteger(frameSize) || frameSize <= 0) {
    throw new Error(`Ship flag anchor validation received invalid frame size: ${frameSize}`);
  }
  if (!Number.isInteger(headings) || headings <= 0) {
    throw new Error(`Ship flag anchor validation received invalid heading count: ${headings}`);
  }
  if (!bake || bake.frameSize !== frameSize || bake.headings !== headings) {
    throw new Error("Ship flag anchor bake has incompatible dimensions");
  }
  if (!bake.ships || typeof bake.ships !== "object" || Array.isArray(bake.ships)) {
    throw new Error("Ship flag anchor bake is missing its ships object");
  }

  if (!(requiredRowingFramesBySlug instanceof Map) || requiredRowingFramesBySlug.size === 0) {
    throw new Error("Ship flag anchor validation requires ship rowing-frame specifications");
  }
  const anchorsBySlug = new Map();
  for (const [slug, anchorSet] of Object.entries(bake.ships)) {
    if (!requiredRowingFramesBySlug.has(slug)) {
      throw new Error(`Ship flag anchor bake contains unknown ship: ${slug}`);
    }
    const rowingFrameCount = requiredRowingFramesBySlug.get(slug);
    if (!Number.isInteger(rowingFrameCount) || rowingFrameCount < 0) {
      throw new Error(`Ship ${slug} has an invalid required rowing-frame count: ${rowingFrameCount}`);
    }
    if (!anchorSet || typeof anchorSet !== "object" || Array.isArray(anchorSet)) {
      throw new Error(`Ship ${slug} flag anchor set must be an object`);
    }
    const base = validateShipFlagAnchors(slug, anchorSet.base, frameSize, headings);
    const rowing = validateRowingFlagAnchors(
      slug,
      anchorSet.rowing,
      rowingFrameCount,
      frameSize,
      headings
    );
    anchorsBySlug.set(slug, Object.freeze({ base, rowing }));
  }
  for (const slug of requiredRowingFramesBySlug.keys()) {
    if (!anchorsBySlug.has(slug)) throw new Error(`Ship flag anchor bake is missing ship: ${slug}`);
  }
  return anchorsBySlug;
}

function validateRowingFlagAnchors(slug, rowing, frameCount, frameSize, headings) {
  if (frameCount === 0) {
    if (rowing !== undefined) throw new Error(`Non-rowing ship ${slug} has rowing flag anchors`);
    return Object.freeze([]);
  }
  if (!Array.isArray(rowing) || rowing.length !== frameCount) {
    throw new Error(`Ship ${slug} must have ${frameCount} rowing flag anchor sets`);
  }
  return Object.freeze(rowing.map((anchors, frameIndex) => (
    validateShipFlagAnchors(`${slug} rowing frame ${frameIndex}`, anchors, frameSize, headings)
  )));
}

export function validateShipFlagAnchors(slug, anchors, frameSize, headings) {
  if (!Array.isArray(anchors) || anchors.length !== headings) {
    throw new Error(`Ship ${slug} must have ${headings} flag anchor frames`);
  }
  return Object.freeze(anchors.map((anchor, frame) => {
    if (!anchor || !Number.isInteger(anchor.x) || !Number.isInteger(anchor.y)) {
      throw new Error(`Ship ${slug} has an invalid flag anchor at frame ${frame}`);
    }
    if (anchor.x < 0 || anchor.x >= frameSize || anchor.y < 0 || anchor.y >= frameSize) {
      throw new Error(
        `Ship ${slug} frame ${frame} flag anchor is outside the sprite: ${anchor.x},${anchor.y}`
      );
    }
    return Object.freeze({ x: anchor.x, y: anchor.y });
  }));
}
