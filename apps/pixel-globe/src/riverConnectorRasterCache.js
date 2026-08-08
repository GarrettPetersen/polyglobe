export function riverConnectorRasterKey(call) {
  if (!Number.isInteger(call?.a) || !Number.isInteger(call?.b) || call.a === call.b) {
    throw new Error("River connector raster key requires two distinct tile ids");
  }
  const low = Math.min(call.a, call.b);
  const high = Math.max(call.a, call.b);
  return `${low}:${high}`;
}
