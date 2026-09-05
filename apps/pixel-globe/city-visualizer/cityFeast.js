import { cityCivilianAppearanceIds } from "./cityPeople.js";
import { cityGroundPainterZ } from "./cityPainterOrder.js";
import { layerSceneZ } from "./citySceneRules.js";

export const CITY_FEAST_GATHER_DURATION_MS = 6500;
// The rear stalls end at Y 505; the front stalls stand at Y 569–570.
// This street band leaves room for a table and a walking lane on either side.
export const CITY_FEAST_TABLE = Object.freeze({ x: 971, y: 505, feetY: 531, width: 164 });
export const CITY_FEAST_FOOD_FILES = Object.freeze({
  hardtack: "food", fish: "fish", meat: "meat", grain: "grain", rice: "rice"
});
export const CITY_FEAST_LAYERS = Object.freeze(["Table shadow", "Table", "Plate", "Serving Platter"]);
export const CITY_FEAST_SHADOW_Z = layerSceneZ("Castle Shadow") + 0.1;
export const CITY_FEAST_TABLE_Z = cityGroundPainterZ(CITY_FEAST_TABLE.feetY);

export function cityFeastFrames(manifest) {
  return Object.fromEntries(CITY_FEAST_LAYERS.map((layer) => {
    const matches = manifest.staticFrames.filter((frame) => frame.layer === layer);
    if (matches.length !== 1) throw new Error(`City feast requires exactly one ${layer} layer`);
    return [layer, matches[0]];
  }));
}

export function createCityFeastGuests(city) {
  const appearances = cityCivilianAppearanceIds(city,
    Array.from({ length: 12 }, (_, index) => index % 2 ? "female" : "male"), "chef-feast");
  return Object.freeze(appearances.map((appearanceId, index) => Object.freeze({
    // Temporary scene actors have deterministic IDs for this city's feast.
    id: `${city.id}:feast:${index}`, appearanceId, index,
    targetX: CITY_FEAST_TABLE.x + 9 + (index % 6) * 26,
    feetY: index < 6 ? 513 : 537,
    startX: index < 6 ? 885 + index * 12 : 860 + (index - 6) * 16
  })));
}

export function cityFeastGuestPose(guest, phase, elapsedMs) {
  if (!guest || ![guest.targetX, guest.feetY, guest.startX, guest.index, elapsedMs].every(Number.isFinite) || elapsedMs < 0) {
    throw new Error("Invalid city feast guest or elapsed time");
  }
  if (phase !== "served" && phase !== "afterwards") throw new Error(`Unknown city feast phase: ${phase}`);
  const progress = Math.max(0, Math.min(1, (elapsedMs - guest.index * 100) / 5000));
  const wanderingCycle = (elapsedMs / 5000 + guest.index / 3) % 2;
  const wanderingProgress = wanderingCycle <= 1 ? wanderingCycle : 2 - wanderingCycle;
  const x = phase === "served"
    ? guest.startX + (guest.targetX - guest.startX) * progress
    : guest.targetX - 15 + wanderingProgress * 30;
  return {
    ...guest, startX: x, motion: "stationary",
    animationId: phase === "afterwards" || progress < 1 ? "walk" : "idle",
    facingRight: phase === "afterwards" ? wanderingCycle <= 1 : guest.targetX > guest.startX,
    phase: guest.index / 12,
    painterZ: cityGroundPainterZ(guest.feetY)
  };
}

export function cityFeastDishes(phase) {
  if (phase !== "served" && phase !== "afterwards") throw new Error(`Unknown city feast dishes phase: ${phase}`);
  const foods = Object.keys(CITY_FEAST_FOOD_FILES);
  const dishes = Array.from({ length: 12 }, (_, index) => ({
    layer: "Plate", x: CITY_FEAST_TABLE.x + 12 + index % 6 * 26,
    y: CITY_FEAST_TABLE.y + (index < 6 ? 1 : 14),
    foods: phase === "served" ? [{ id: foods[index % foods.length], x: 2, y: -1 }] : []
  }));
  for (let index = 0; index < 3; index++) {
    dishes.push({ layer: "Serving Platter", x: CITY_FEAST_TABLE.x + 26 + index * 47,
      y: CITY_FEAST_TABLE.y + 7,
      foods: phase === "served" ? Array.from({ length: 3 }, (_, portion) => ({
        id: foods[(index + portion) % foods.length], x: 3 + portion * 5, y: -1
      })) : [] });
  }
  return dishes;
}
