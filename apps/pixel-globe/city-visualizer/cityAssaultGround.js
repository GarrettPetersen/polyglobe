// Coordinates are local to the authored beach alpha mask. The same depth
// applies in either travel direction and to either army, with no landing timer.
export function cityAssaultWaterDepthPx(x, y, opaqueRows) {
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Array.isArray(opaqueRows)) {
    throw new Error("Invalid assault shoreline observation");
  }
  const runs = opaqueRows[Math.round(y)];
  if (!runs?.length) return 6;
  // The first opaque pixel is the shoreline. Inland the road and city layers
  // replace parts of the beach; the end of its paint is not another sea.
  const shoreX = runs[0][0];
  return x >= shoreX ? 0 : Math.min(6, Math.max(1, Math.ceil((shoreX - x) / 6)));
}
