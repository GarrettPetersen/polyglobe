export const CITY_FORTIFICATION_LAYERS = Object.freeze([
  "Far Castle",
  "Gate",
  "Near Castle"
]);

const CITY_FORTIFICATION_LAYER_SET = new Set(CITY_FORTIFICATION_LAYERS);

const MEDITERRANEAN_LIMESTONE_PALETTE = new Map([
  ["3e3546", "625565"],
  ["625565", "966c6c"],
  // Far Castle contains this near-duplicate of Resurrect 64's #625565; normalize it to the same step.
  ["655565", "966c6c"],
  ["7f708a", "ab947a"],
  ["9babb2", "c7dcd0"]
]);

const MEDITERRANEAN_CHURCH_ROOF_PALETTE = new Map([
  ["6e2727", "9e4539"],
  ["b33831", "cd683d"]
]);

export function cityFortificationPaletteApplies(cityType, layerName) {
  return cityType === "mediterranean" && CITY_FORTIFICATION_LAYER_SET.has(layerName);
}

export function cityFortificationPaletteRgb(cityType, layerName, red, green, blue) {
  if (!cityFortificationPaletteApplies(cityType, layerName)) return { red, green, blue };
  const sourceHex = rgbHex(red, green, blue);
  const targetHex = MEDITERRANEAN_LIMESTONE_PALETTE.get(sourceHex);
  if (!targetHex) return { red, green, blue };
  return {
    red: Number.parseInt(targetHex.slice(0, 2), 16),
    green: Number.parseInt(targetHex.slice(2, 4), 16),
    blue: Number.parseInt(targetHex.slice(4, 6), 16)
  };
}

export function cityRegionalPaletteApplies(cityType, layerName) {
  return cityFortificationPaletteApplies(cityType, layerName) || (
    cityType === "mediterranean" && layerName === "Church"
  );
}

export function cityRegionalPaletteRgb(cityType, layerName, red, green, blue) {
  if (cityFortificationPaletteApplies(cityType, layerName)) {
    return cityFortificationPaletteRgb(cityType, layerName, red, green, blue);
  }
  if (cityType !== "mediterranean" || layerName !== "Church") return { red, green, blue };
  const targetHex = MEDITERRANEAN_CHURCH_ROOF_PALETTE.get(rgbHex(red, green, blue));
  if (!targetHex) return { red, green, blue };
  return {
    red: Number.parseInt(targetHex.slice(0, 2), 16),
    green: Number.parseInt(targetHex.slice(2, 4), 16),
    blue: Number.parseInt(targetHex.slice(4, 6), 16)
  };
}

function rgbHex(red, green, blue) {
  return [red, green, blue]
    .map((component) => component.toString(16).padStart(2, "0"))
    .join("");
}
