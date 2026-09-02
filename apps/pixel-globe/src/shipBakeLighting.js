const SHIP_BAKE_AMBIENT_LIGHT = 0.62;
const SHIP_BAKE_DIRECT_LIGHT = 0.38;

// World +x is screen-right for every ship bake camera, while +z points back
// toward the viewer. This unit vector places the sun high over the viewer's
// right shoulder, matching the hand-authored pixel-art lighting convention.
export const SHIP_BAKE_LIGHT_DIRECTION = Object.freeze({ x: 0.5, y: 0.8, z: 0.33 });

// Dockside shadows share the authored screen-left direction but use a much
// higher sun so their water footprint stays beside the hull instead of
// reaching into the distant parallax water.
export const CITY_DOCKSIDE_SHADOW_LIGHT_DIRECTION = Object.freeze({
  x: 0.5,
  y: 3.2,
  z: 0.33
});

export function shipBakeLightScale(normal) {
  if (!normal || ![normal.x, normal.y, normal.z].every(Number.isFinite)) {
    throw new Error("Ship bake lighting requires a finite surface normal");
  }
  const direct = Math.max(0, Math.min(1,
    normal.x * SHIP_BAKE_LIGHT_DIRECTION.x +
    normal.y * SHIP_BAKE_LIGHT_DIRECTION.y +
    normal.z * SHIP_BAKE_LIGHT_DIRECTION.z
  ));
  return SHIP_BAKE_AMBIENT_LIGHT + direct * SHIP_BAKE_DIRECT_LIGHT;
}
