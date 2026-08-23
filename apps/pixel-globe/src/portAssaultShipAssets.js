export const PORT_ASSAULT_SHIP_ASSETS = Object.freeze({
  galleon: Object.freeze({
    src: "/assets/vehicles/unity-ships/port-assault/galleon-dockside.png",
    foregroundSrc: "/assets/vehicles/unity-ships/port-assault/galleon-dockside-foreground.png",
    depthSrc: "/assets/vehicles/unity-ships/port-assault/galleon-dockside-depth.png",
    width: 320,
    height: 160,
    deckPolygon: Object.freeze([
      Object.freeze({ x: 123, y: 113 }),
      Object.freeze({ x: 217, y: 123 }),
      Object.freeze({ x: 204, y: 129 }),
      Object.freeze({ x: 110, y: 118 })
    ]),
    deckEntryAnchor: Object.freeze({ x: 187, y: 126 }),
    sailorSpawnAnchor: Object.freeze({ x: 203, y: 139 }),
    bowScreenDirection: "up-left",
    dockFacingSide: "starboard"
  })
});

export function portAssaultShipAsset(shipSlug) {
  const asset = PORT_ASSAULT_SHIP_ASSETS[shipSlug];
  if (!asset) throw new Error(`No port-assault ship asset for hull: ${shipSlug}`);
  return asset;
}
