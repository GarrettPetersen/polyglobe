import {
  darkerResurrect64Hex,
  nearestResurrect64Hex
} from "../src/waterLatitudePalette.js";

export const CITY_TREE_SHADOW_Z = 42.1;

const TREE_SLOTS = Object.freeze([
  Object.freeze({ id: "near", centerX: 1018, baseY: 498, scale: 0.5, depth: 0.94, z: 39.7 }),
  Object.freeze({ id: "middle", centerX: 1138, baseY: 486, scale: 0.45, depth: 0.88, z: 39.6 }),
  Object.freeze({ id: "far", centerX: 1258, baseY: 478, scale: 0.4, depth: 0.82, z: 39.5 })
]);

const REGION_TREE_POOLS = Object.freeze({
  "northern-european": Object.freeze([
    "yew", "scots-pine", "larch", "spruce", "fir", "black-pine"
  ]),
  mediterranean: Object.freeze(["cypress", "juniper", "cedar", "black-pine", "palm"]),
  "islamic-desert": Object.freeze(["palm", "cypress", "juniper", "cedar"]),
  "east-asian": Object.freeze(["black-pine", "cedar", "cypress", "juniper"]),
  "south-asian": Object.freeze(["palm", "cedar", "yew"]),
  "southeast-asian": Object.freeze(["palm", "cedar", "yew"]),
  mesoamerican: Object.freeze(["palm", "cedar", "yew"]),
  andean: Object.freeze(["cedar", "juniper", "yew"]),
  "sub-saharan": Object.freeze(["palm", "cedar", "yew"]),
  polynesian: Object.freeze(["palm"])
});

export function cityTreePlacements({ city, features, trees }) {
  requireTreeInputs(city, features, trees);
  const availableById = new Map(trees.map((tree) => [tree.id, tree]));
  const pool = (REGION_TREE_POOLS[city.cityType] || ["cedar", "yew"])
    .filter((id) => id !== "palm" || Math.abs(city.lat) <= 42)
    .filter((id) => availableById.has(id));
  if (pool.length === 0) return Object.freeze([]);
  const count = cityTreeCount(city, features.rightTerrain, pool.includes("palm"));
  if (count === 0) return Object.freeze([]);
  const slotOffset = stableHash(`${city.id}:tree-slots`) % TREE_SLOTS.length;
  const slots = [...TREE_SLOTS.slice(slotOffset), ...TREE_SLOTS.slice(0, slotOffset)].slice(0, count);
  let previousTreeId = null;
  const placements = slots.map((slot, index) => {
    let poolIndex = stableHash(`${city.id}:tree-species:${index}`) % pool.length;
    if (pool.length > 1 && pool[poolIndex] === previousTreeId) {
      poolIndex = (poolIndex + 1) % pool.length;
    }
    const tree = availableById.get(pool[poolIndex]);
    previousTreeId = tree.id;
    const sourceWidth = tree.frame.sourceSize.w;
    const sourceHeight = tree.frame.sourceSize.h;
    if (sourceWidth !== tree.shadow.sourceSize.w || sourceHeight !== tree.shadow.sourceSize.h) {
      throw new Error(`City tree and shadow source size mismatch: ${tree.id}`);
    }
    return Object.freeze({
      id: `${city.id}:${slot.id}`,
      tree,
      originX: Math.round(slot.centerX - sourceWidth * slot.scale / 2),
      originY: Math.round(slot.baseY - sourceHeight * slot.scale),
      baseY: slot.baseY,
      scale: slot.scale,
      depth: slot.depth,
      z: slot.z,
      parallaxAnchor: 1,
      flipX: stableHash(`${city.id}:tree-flip:${index}`) % 2 === 1
    });
  });
  return Object.freeze(placements);
}

export function cityTreeCount(city, terrain, palmAvailable = false) {
  requireCity(city);
  if (!["grass", "forest", "desert", "rocky"].includes(terrain)) {
    throw new Error(`Invalid city tree terrain: ${terrain}`);
  }
  const seed = stableHash(`${city.id}:tree-count`);
  if (terrain === "forest") {
    const villageBonus = city.settlementType === "village" ? 1 : 0;
    return Math.min(TREE_SLOTS.length, 2 + seed % 2 + villageBonus);
  }
  if (terrain === "grass") {
    const base = seed % 3 === 0 ? 0 : 1;
    return Math.min(2, base + (city.settlementType === "village" ? 1 : 0));
  }
  if (terrain === "rocky") return seed % 2;
  return palmAvailable && seed % 3 === 0 ? 1 : 0;
}

export function cityTreeShadowRgb(red, green, blue) {
  const sourceHex = nearestResurrect64Hex(red, green, blue);
  const shadowHex = darkerResurrect64Hex(sourceHex, 2);
  return Object.freeze({
    red: Number.parseInt(shadowHex.slice(0, 2), 16),
    green: Number.parseInt(shadowHex.slice(2, 4), 16),
    blue: Number.parseInt(shadowHex.slice(4, 6), 16)
  });
}

function requireTreeInputs(city, features, trees) {
  requireCity(city);
  if (!features || typeof features !== "object") {
    throw new Error("City tree placement requires resolved scene features");
  }
  if (!Array.isArray(trees) || trees.length === 0) {
    throw new Error("City tree placement requires an exported tree atlas");
  }
  for (const tree of trees) {
    if (
      typeof tree?.id !== "string" ||
      !tree.frame?.frame ||
      !tree.frame?.spriteSourceSize ||
      !tree.frame?.sourceSize ||
      !tree.shadow?.frame ||
      !tree.shadow?.spriteSourceSize ||
      !tree.shadow?.sourceSize
    ) {
      throw new Error("Invalid city tree atlas entry");
    }
  }
}

function requireCity(city) {
  if (
    !city ||
    typeof city.id !== "string" ||
    typeof city.cityType !== "string" ||
    !Number.isFinite(city.lat)
  ) {
    throw new Error("City tree placement requires city identity, type, and latitude");
  }
}

function stableHash(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
