const DISCOVERY_KIND_COLORS = Object.freeze({
  mountain: "#aaa3b8",
  landmark: "#d6a84f",
  legend: "#f04f78",
  achievement: "#6aa6a1"
});

const ANIMAL_PLACEHOLDER_COLOR = "#6aa6a1";

export function discoveryKindColor(kind) {
  const color = DISCOVERY_KIND_COLORS[kind];
  if (color) return color;
  throw new Error(`Unknown discovery kind: ${kind}`);
}

export function discoveryEntryPlaceholderColor(tab, kind) {
  if (tab === "animals") return ANIMAL_PLACEHOLDER_COLOR;
  if (tab === "wonders") return discoveryKindColor(kind);
  throw new Error(`Unknown discoveries tab: ${tab}`);
}
