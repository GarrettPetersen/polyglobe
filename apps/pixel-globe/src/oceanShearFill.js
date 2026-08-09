export const OCEAN_SHEAR_FILL_MIN_EXTRA_PX = 0.5;

export function buildOpenOceanShearFillCalls({
  faceCalls,
  tileById,
  isOpenOceanTile,
  minimumExtraPx = OCEAN_SHEAR_FILL_MIN_EXTRA_PX
}) {
  if (!Array.isArray(faceCalls)) throw new Error("Ocean shear fill requires face calls");
  if (!(tileById instanceof Map)) throw new Error("Ocean shear fill requires a tile map");
  if (typeof isOpenOceanTile !== "function") {
    throw new Error("Ocean shear fill requires an open-ocean predicate");
  }
  if (!Number.isFinite(minimumExtraPx) || minimumExtraPx < 0) {
    throw new Error(`Ocean shear fill minimum extra distance is invalid: ${minimumExtraPx}`);
  }

  return buildShearFillCalls({
    faceCalls,
    tileById,
    pairCanFill: (a, b) => isOpenOceanTile(a) && isOpenOceanTile(b),
    minimumExtraPx
  });
}

export function buildLandShearFillCalls({
  faceCalls,
  tileById,
  isLandTile,
  minimumExtraPx = OCEAN_SHEAR_FILL_MIN_EXTRA_PX
}) {
  if (typeof isLandTile !== "function") {
    throw new Error("Land shear fill requires a land predicate");
  }
  return buildShearFillCalls({
    faceCalls,
    tileById,
    pairCanFill: (a, b) => isLandTile(a) && isLandTile(b),
    minimumExtraPx
  });
}

function buildShearFillCalls({ faceCalls, tileById, pairCanFill, minimumExtraPx }) {
  if (!Array.isArray(faceCalls)) throw new Error("Terrain shear fill requires face calls");
  if (!(tileById instanceof Map)) throw new Error("Terrain shear fill requires a tile map");
  if (typeof pairCanFill !== "function") {
    throw new Error("Terrain shear fill requires a pair predicate");
  }
  if (!Number.isFinite(minimumExtraPx) || minimumExtraPx < 0) {
    throw new Error(`Terrain shear fill minimum extra distance is invalid: ${minimumExtraPx}`);
  }

  const fillers = [];
  const occupiedCenters = new Set();
  for (const face of faceCalls) {
    const a = tileById.get(face.a);
    const b = tileById.get(face.b);
    if (!a || !b) throw new Error(`Terrain shear edge is missing tile ${!a ? face.a : face.b}`);
    if (!pairCanFill(a, b)) continue;

    const actualDistance = pointDistance(a.drawSurfaceX, a.drawSurfaceY, b.drawSurfaceX, b.drawSurfaceY);
    const projectedDistance = pointDistance(a.projectedX, a.projectedY, b.projectedX, b.projectedY);
    if (projectedDistance < 1) {
      throw new Error(`Terrain shear edge ${a.id}/${b.id} has invalid projected spacing`);
    }
    if (actualDistance - projectedDistance <= minimumExtraPx) continue;

    const segmentCount = Math.max(2, Math.ceil(actualDistance / projectedDistance));
    for (let segment = 1; segment < segmentCount; segment++) {
      const t = segment / segmentCount;
      const x = Math.round(a.drawSurfaceX + (b.drawSurfaceX - a.drawSurfaceX) * t);
      const y = Math.round(a.drawSurfaceY + (b.drawSurfaceY - a.drawSurfaceY) * t);
      const centerKey = `${x},${y}`;
      if (occupiedCenters.has(centerKey)) continue;
      occupiedCenters.add(centerKey);

      const source = segment % 2 === 1 ? a : b;
      fillers.push({
        ...source,
        x,
        y,
        surface: { x, y },
        drawSurfaceX: x,
        drawSurfaceY: y,
        sortY: y,
        visualOnly: true,
        shearEdge: [a.id, b.id]
      });
    }
  }
  return fillers;
}

function pointDistance(ax, ay, bx, by) {
  for (const [label, value] of [
    ["ax", ax],
    ["ay", ay],
    ["bx", bx],
    ["by", by]
  ]) {
    if (!Number.isFinite(value)) throw new Error(`Terrain shear fill ${label} is not finite`);
  }
  return Math.hypot(bx - ax, by - ay);
}
