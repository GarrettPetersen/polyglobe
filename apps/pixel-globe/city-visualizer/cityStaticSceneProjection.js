const STATIC_PROJECTION_INSTRUCTION_BY_ENTRY_KIND = Object.freeze({
  "background-city-static": backgroundCityProjection,
  "city-building": placementProjection,
  "dock-shadow-extension": () => layerProjection("Sand Beach Dock Shadow"),
  "gate-front": () => layerProjection("Gate"),
  "left-bank-background-city-base": riverLayerProjection,
  "left-bank-background-city-underlay": riverLayerProjection,
  "quay-cargo": placementProjection,
  "shipyard-construction": placementProjection,
  "shipyard-front": () => layerProjection("Shipyard"),
  "static": authoredLayerProjection,
  "tree": placementProjection,
  "tree-shadow": placementProjection
});

export const CITY_STATIC_SCENE_ENTRY_KINDS = Object.freeze(
  Object.keys(STATIC_PROJECTION_INSTRUCTION_BY_ENTRY_KIND)
);

export function cityStaticSceneProjectionInstruction(entry) {
  if (!entry || typeof entry.kind !== "string" || entry.kind === "") {
    throw new Error("City static scene projection requires an entry kind");
  }
  if (!Object.hasOwn(STATIC_PROJECTION_INSTRUCTION_BY_ENTRY_KIND, entry.kind)) {
    throw new Error(`City scene entry is not cacheable: ${entry.kind}`);
  }
  const resolveInstruction = STATIC_PROJECTION_INSTRUCTION_BY_ENTRY_KIND[entry.kind];
  return resolveInstruction(entry);
}

function authoredLayerProjection(entry) {
  return layerProjection(requireLayerName(entry.layerName, entry.kind), entry.occurrence);
}

function riverLayerProjection(entry) {
  return Object.freeze({
    ...layerProjection(requireLayerName(entry.frame?.layer, entry.kind)),
    parallax: "river-default"
  });
}

function backgroundCityProjection(entry) {
  if (entry.side !== "left" && entry.side !== "right") {
    throw new Error(`Invalid background city projection side: ${entry.side}`);
  }
  return Object.freeze({ kind: "background-city", side: entry.side });
}

function placementProjection(entry) {
  const depth = entry.placement?.depth;
  const parallaxAnchor = entry.placement?.parallaxAnchor ?? 0;
  if (!Number.isFinite(depth) || !Number.isFinite(parallaxAnchor)) {
    throw new Error(`Invalid ${entry.kind} projection: ${depth}, ${parallaxAnchor}`);
  }
  return Object.freeze({ kind: "explicit", depth, parallaxAnchor });
}

function layerProjection(layerName, occurrence) {
  return Object.freeze({ kind: "layer", layerName, occurrence });
}

function requireLayerName(layerName, entryKind) {
  if (typeof layerName !== "string" || layerName === "") {
    throw new Error(`City static scene entry ${entryKind} requires a layer`);
  }
  return layerName;
}
