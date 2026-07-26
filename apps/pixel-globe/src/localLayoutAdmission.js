function assertFinitePoint(point, label) {
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new Error(`${label} must have finite x/y coordinates`);
  }
}

const MAX_ELASTIC_FRAME_CORRECTION_PX = 2.5;

function registeredProjectionFrame(positions, projectedById, anchorId) {
  const anchorPosition = positions.get(anchorId);
  const anchorProjected = projectedById.get(anchorId);
  assertFinitePoint(anchorPosition, `Local layout anchor position for tile ${anchorId}`);
  assertFinitePoint(anchorProjected, `Projected anchor position for tile ${anchorId}`);

  let dotSum = 0;
  let crossSum = 0;
  let support = 0;
  for (const [id, position] of positions.entries()) {
    if (id === anchorId) continue;
    const projected = projectedById.get(id);
    if (!projected) continue;
    assertFinitePoint(position, `Local layout position for tile ${id}`);
    assertFinitePoint(projected, `Projected position for retained tile ${id}`);

    const projectedX = projected.x - anchorProjected.x;
    const projectedY = projected.y - anchorProjected.y;
    const layoutX = position.x - anchorPosition.x;
    const layoutY = position.y - anchorPosition.y;
    const projectedLength = Math.hypot(projectedX, projectedY);
    const layoutLength = Math.hypot(layoutX, layoutY);
    if (projectedLength < 1 || layoutLength < 1) continue;

    // A chart rebuilt farther east or west has a differently rotated tangent
    // frame, especially near the poles. Fit that rotation without allowing the
    // retained map to scale or shear.
    const weight = 1 / Math.max(16, projectedLength);
    dotSum += (projectedX * layoutX + projectedY * layoutY) * weight;
    crossSum += (projectedX * layoutY - projectedY * layoutX) * weight;
    support++;
  }

  const rotationMagnitude = Math.hypot(dotSum, crossSum);
  return {
    anchorPosition,
    anchorProjected,
    cos: support > 0 && rotationMagnitude > 1e-9 ? dotSum / rotationMagnitude : 1,
    sin: support > 0 && rotationMagnitude > 1e-9 ? crossSum / rotationMagnitude : 0
  };
}

function registeredPoint(projected, frame) {
  const x = projected.x - frame.anchorProjected.x;
  const y = projected.y - frame.anchorProjected.y;
  return {
    x: roundPixel(frame.anchorPosition.x + x * frame.cos - y * frame.sin),
    y: roundPixel(frame.anchorPosition.y + x * frame.sin + y * frame.cos)
  };
}

function roundPixel(value) {
  const rounded = Math.round(value);
  return Object.is(rounded, -0) ? 0 : rounded;
}

function boundaryFittedFrame({
  positions,
  projectedById,
  pending,
  neighborsById,
  protectionById,
  rotation,
  fallbackFrame
}) {
  const pendingSet = new Set(pending);
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  let translationX = 0;
  let translationY = 0;
  let totalWeight = 0;
  for (const id of pending) {
    for (const neighborId of neighborsById[id]) {
      const neighborPosition = positions.get(neighborId);
      const neighborProjected = projectedById.get(neighborId);
      if (pendingSet.has(neighborId) || !neighborPosition || !neighborProjected) continue;
      const protection = Math.max(protectionById[id], protectionById[neighborId]) / 255;
      const weight = 1 + protection * 63;
      const rotatedX = neighborProjected.x * cos - neighborProjected.y * sin;
      const rotatedY = neighborProjected.x * sin + neighborProjected.y * cos;
      translationX += (neighborPosition.x - rotatedX) * weight;
      translationY += (neighborPosition.y - rotatedY) * weight;
      totalWeight += weight;
    }
  }
  if (totalWeight === 0) return fallbackFrame;
  return {
    anchorPosition: {
      x: translationX / totalWeight,
      y: translationY / totalWeight
    },
    anchorProjected: { x: 0, y: 0 },
    cos,
    sin
  };
}

function admissionPointBetweenFrames(projected, registeredFrame, translatedFrame, protection) {
  const registered = registeredPoint(projected, registeredFrame);
  const translated = registeredPoint(projected, translatedFrame);
  const correctionX = translated.x - registered.x;
  const correctionY = translated.y - registered.y;
  const correctionLength = Math.hypot(correctionX, correctionY);
  const correctionLimit = MAX_ELASTIC_FRAME_CORRECTION_PX * (1 - protection / 255);
  if (correctionLength <= correctionLimit) return translated;
  if (correctionLimit <= 0 || correctionLength <= 1e-9) return registered;
  const scale = correctionLimit / correctionLength;
  return {
    x: roundPixel(registered.x + correctionX * scale),
    y: roundPixel(registered.y + correctionY * scale)
  };
}

export function admitProjectedTiles({
  positions,
  projectedById,
  pendingIds,
  anchorId,
  neighborsById,
  protectionById
}) {
  if (!(positions instanceof Map)) throw new Error("Local layout admission requires a positions map");
  if (!(projectedById instanceof Map)) throw new Error("Local layout admission requires a projected-position map");
  if (!Array.isArray(neighborsById) || neighborsById.length === 0) {
    throw new Error("Local layout admission requires tile neighbors");
  }
  if (!(protectionById instanceof Uint8Array) || protectionById.length !== neighborsById.length) {
    throw new Error("Local layout admission requires complete chart protection");
  }
  const pending = [...pendingIds];
  if (new Set(pending).size !== pending.length) {
    throw new Error("Local layout admission received duplicate pending tiles");
  }
  const retainedFrame = registeredProjectionFrame(positions, projectedById, anchorId);
  const boundaryArgs = {
    positions,
    projectedById,
    pending,
    neighborsById,
    protectionById
  };
  const registeredRotation = Math.atan2(retainedFrame.sin, retainedFrame.cos);
  const registeredFrame = boundaryFittedFrame({
    ...boundaryArgs,
    rotation: registeredRotation,
    fallbackFrame: retainedFrame
  });
  const translatedFrame = boundaryFittedFrame({
    ...boundaryArgs,
    rotation: 0,
    fallbackFrame: retainedFrame
  });
  let admitted = 0;
  for (const id of pending) {
    if (positions.has(id)) throw new Error(`Pending local layout tile ${id} already has a position`);
    if (!Array.isArray(neighborsById[id])) {
      throw new Error(`Local layout admission is missing neighbors for tile ${id}`);
    }
    const projected = projectedById.get(id);
    assertFinitePoint(projected, `Projected position for pending tile ${id}`);
    positions.set(
      id,
      admissionPointBetweenFrames(
        projected,
        registeredFrame,
        translatedFrame,
        protectionById[id]
      )
    );
    admitted++;
  }

  return admitted;
}
