// Travel policies may decline an unreachable destination (null), but a missing
// bake/resolver or a malformed distance is a programming error, never a shortcut.
export function travelSailingDistanceKm(origin, destination, { sailingDistanceKm } = {}) {
  if (typeof sailingDistanceKm !== "function") throw new Error("Port travel requires a sailing-distance resolver");
  const distanceKm = sailingDistanceKm(origin, destination);
  if (distanceKm !== null && (!Number.isFinite(distanceKm) || distanceKm < 0)) {
    throw new Error(`Invalid port sailing distance: ${origin.cityId}/${destination.cityId}: ${distanceKm}`);
  }
  return distanceKm;
}
