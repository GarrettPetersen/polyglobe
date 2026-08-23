export const PORT_ASSAULT_SHIP_ASSETS = Object.freeze({
  galleon: Object.freeze({
    src: "/assets/vehicles/unity-ships/port-assault/galleon-dockside.png",
    foregroundSrc: "/assets/vehicles/unity-ships/port-assault/galleon-dockside-foreground.png",
    depthSrc: "/assets/vehicles/unity-ships/port-assault/galleon-dockside-depth.png",
    width: 320,
    height: 160,
    broadsideOffsetDegrees: 72.5,
    cameraElevationDegrees: 30,
    deckPolygon: Object.freeze([
      Object.freeze({ x: 170, y: 75 }),
      Object.freeze({ x: 141, y: 120 }),
      Object.freeze({ x: 165, y: 124 }),
      Object.freeze({ x: 194, y: 78 })
    ]),
    deckEntryAnchor: Object.freeze({ x: 189, y: 80 }),
    sailorSpawnAnchor: Object.freeze({ x: 209, y: 76 }),
    bowScreenDirection: "up-right",
    dockFacingSide: "port"
  })
});

export function portAssaultShipAsset(shipSlug) {
  const asset = PORT_ASSAULT_SHIP_ASSETS[shipSlug];
  if (!asset) throw new Error(`No port-assault ship asset for hull: ${shipSlug}`);
  return asset;
}
