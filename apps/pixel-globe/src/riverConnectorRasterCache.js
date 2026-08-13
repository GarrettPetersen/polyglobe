export function riverConnectorRasterKey(call) {
  if (!Number.isInteger(call?.a) || !Number.isInteger(call?.b) || call.a === call.b) {
    throw new Error("River connector raster key requires two distinct tile ids");
  }
  const low = Math.min(call.a, call.b);
  const high = Math.max(call.a, call.b);
  return `${low}:${high}`;
}

export function riverConnectorWaterRasterCacheKey(call, geometry) {
  const { path, a, b } = geometry;
  return [
    call.a,
    call.b,
    Number(Boolean(call.aMouth)),
    Number(Boolean(call.bMouth)),
    Number(Boolean(call.aWater)),
    Number(Boolean(call.bWater)),
    path.x0,
    path.y0,
    path.cx,
    path.cy,
    path.x1,
    path.y1,
    a.x,
    a.y,
    b.x,
    b.y
  ].join(":");
}
