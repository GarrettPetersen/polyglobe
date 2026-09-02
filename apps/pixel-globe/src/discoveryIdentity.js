const TILE_DERIVED_MOUNTAIN_DISCOVERY_ID = /^mountain-\d+-(.+)$/;

export function tileDerivedMountainDiscoverySlug(discoveryId) {
  if (typeof discoveryId !== "string") return null;
  const match = TILE_DERIVED_MOUNTAIN_DISCOVERY_ID.exec(discoveryId);
  return match ? match[1] : null;
}

export function requireCanonicalDiscoveryId(discoveryId, label = "Discovery") {
  if (typeof discoveryId !== "string" || discoveryId.trim() === "") {
    throw new Error(`${label} must have a non-empty canonical id`);
  }
  if (tileDerivedMountainDiscoverySlug(discoveryId) !== null) {
    throw new Error(
      `${label} must use a canonical discovery id, not tile-derived legacy id: ${discoveryId}`
    );
  }
  return discoveryId;
}
