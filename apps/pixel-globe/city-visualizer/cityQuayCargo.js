import { cityGroundPainterZ } from "./cityPainterOrder.js";

export const CITY_QUAY_CARGO_DOCK_Z = cityGroundPainterZ(538);
export const CITY_QUAY_CARGO_ROAD_Z = cityGroundPainterZ(505);
export const CITY_QUAY_CARGO_FOREGROUND_Z = cityGroundPainterZ(568);

const DOCK_GROUPS = Object.freeze([
  cargoGroup("dock-waterline", "dock", 700, 538, 1, "stack"),
  cargoGroup("dock-waterline-east", "dock", 720, 538, 1, "loose")
]);

// Business groups sit immediately beside the authored storage users. Every base is
// landward of the dock span, so these remain grounded when the dock layer is absent.
const MARKET_GROUPS = Object.freeze([
  cargoGroup("market-stack-near", "market", 932, 568, 1, "stack"),
  cargoGroup("market-stack-far", "market", 920, 568, 1, "stack")
]);
const INN_GROUPS = Object.freeze([
  cargoGroup("inn", "inn", 1202, 578, 1, "loose")
]);
const SMITH_GROUPS = Object.freeze([
  cargoGroup("smith", "smith", 1224, 505, 0.98, "stack")
]);
const SHIPYARD_GROUPS = Object.freeze([
  cargoGroup("shipyard", "shipyard", 940, 502, 0.98, "loose")
]);

export function cityQuayCargoCount(city, port = {}) {
  requireCity(city, false);
  const dock = port.dock ?? city.dock ?? "none";
  if (!["none", "wood", "stone"].includes(dock)) {
    throw new Error(`Invalid city quay cargo dock: ${dock}`);
  }
  const population = Number.isFinite(city.population) && city.population > 0
    ? city.population
    : city.settlementType === "village" ? 1200 : 20000;
  let count = population <= 1500 ? 2
    : population <= 5000 ? 3
      : population <= 15000 ? 6
        : population <= 40000 ? 9
          : population <= 100000 ? 13
            : population <= 250000 ? 16
              : 18;
  if (port.market) count += 1;
  if (port.shipyard) count += 1;
  if (!port.market && !port.shipyard) count -= 2;
  if (dock === "none") count = Math.ceil(count * 0.7);
  if (city.settlementType === "village") count = Math.min(count, 5);
  return Math.max(0, Math.min(18, count));
}

export function cityQuayCargoPlacements({ city, features, frames }) {
  requireCity(city, true);
  if (!features || typeof features !== "object") {
    throw new Error("City quay cargo placement requires resolved scene features");
  }
  if (!Array.isArray(frames)) throw new Error("City quay cargo placement requires atlas frames");
  const cargoFrames = Object.freeze({
    barrel: requireFrame(frames, "Barrel"),
    crate: requireFrame(frames, "Crate")
  });
  const requestedCount = Number.isInteger(features.props)
    ? features.props
    : cityQuayCargoCount(city, features);
  if (requestedCount < 0) throw new Error(`Invalid city quay cargo count: ${requestedCount}`);
  const groupFamilies = [
    ...((features.dock === "wood" || features.dock === "stone") ? [DOCK_GROUPS] : []),
    ...(features.market ? [MARKET_GROUPS] : []),
    ...(features.inn ? [INN_GROUPS] : []),
    ...(features.store ? [SMITH_GROUPS] : []),
    ...(features.shipyard ? [SHIPYARD_GROUPS] : [])
  ];
  if (groupFamilies.length === 0) return Object.freeze([]);
  const primaryGroups = groupFamilies.map((groups, familyIndex) => (
    stableShuffle(groups, `${city.id}:cargo:primary:${familyIndex}`)[0]
  ));
  const primaryIds = new Set(primaryGroups.map(({ id }) => id));
  const remainingGroups = stableShuffle(
    groupFamilies.flat().filter(({ id }) => !primaryIds.has(id)),
    `${city.id}:cargo:remaining`
  );
  const groups = [...primaryGroups, ...remainingGroups];
  const itemPlans = [];
  for (let level = 0; level < 3 && itemPlans.length < requestedCount; level++) {
    for (const group of groups) {
      if (itemPlans.length >= requestedCount) break;
      itemPlans.push({ group, level });
    }
  }
  return Object.freeze(itemPlans.map(({ group, level }, index) => {
    const item = cargoGroupItem(group.style, level);
    const kind = item.kind;
    const frame = cargoFrames[kind];
    const width = frame.frame.w;
    const height = frame.frame.h;
    const direction = stableHash(`${city.id}:cargo:direction:${group.id}`) % 2 === 0 ? -1 : 1;
    const centerX = group.centerX + item.offsetX * direction;
    const baseY = group.baseY - item.stackLevel * cargoFrames.crate.frame.h;
    return Object.freeze({
      id: `${city.id}:cargo:${group.id}:${level}`,
      groupId: group.id,
      kind,
      frame,
      zone: group.zone,
      stackLevel: item.stackLevel,
      x: Math.round(centerX - width / 2),
      y: baseY - height,
      baseY,
      groundY: group.baseY,
      width,
      height,
      depth: group.depth,
      parallaxAnchor: 1,
      z: cityGroundPainterZ(group.baseY) + index / 100000
    });
  }));
}

function cargoGroup(id, zone, centerX, baseY, depth, style) {
  return Object.freeze({ id, zone, centerX, baseY, depth, style });
}

function cargoGroupItem(style, level) {
  if (style === "stack") {
    return level === 0
      ? Object.freeze({ kind: "crate", offsetX: 0, stackLevel: 0 })
      : level === 1
        ? Object.freeze({ kind: "crate", offsetX: 0, stackLevel: 1 })
        : Object.freeze({ kind: "barrel", offsetX: 10, stackLevel: 0 });
  }
  if (style === "loose") {
    return level === 0
      ? Object.freeze({ kind: "barrel", offsetX: 0, stackLevel: 0 })
      : level === 1
        ? Object.freeze({ kind: "crate", offsetX: 10, stackLevel: 0 })
        : Object.freeze({ kind: "crate", offsetX: 10, stackLevel: 1 });
  }
  throw new Error(`Unknown city quay cargo group style: ${style}`);
}

function stableShuffle(values, seed) {
  return [...values]
    .map((value) => ({ value, order: stableHash(`${seed}:${value.id}`) }))
    .sort((left, right) => left.order - right.order || left.value.id.localeCompare(right.value.id))
    .map(({ value }) => value);
}

function requireFrame(frames, layerName) {
  const frame = frames.find((candidate) => candidate.layer === layerName);
  if (!frame?.frame || !frame?.spriteSourceSize) {
    throw new Error(`Missing city quay cargo frame: ${layerName}`);
  }
  return frame;
}

function requireCity(city, requireIdentity) {
  if (
    !city ||
    typeof city.settlementType !== "string" ||
    (requireIdentity && typeof city.id !== "string")
  ) {
    throw new Error(requireIdentity
      ? "City quay cargo requires city identity and settlement type"
      : "City quay cargo requires a settlement type");
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
