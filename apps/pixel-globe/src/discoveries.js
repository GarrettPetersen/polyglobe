import { findNearestTileId } from "./geodesic.js";

export const GREAT_PYRAMID_DISCOVERY_ID = "landmark-great-pyramid";
export const LAKE_VICTORIA_DISCOVERY_ID = "landmark-lake-victoria";
export const LAKE_VICTORIA_DISCOVERY_RADIUS_PX = 60;
export const GRAND_CANAL_DISCOVERY_ID = "landmark-grand-canal";
export const EL_DORADO_DISCOVERY_ID = "legend-el-dorado";
export const CIRCUMNAVIGATION_DISCOVERY_ID = "achievement-circumnavigation";
export const MOUNTAIN_DISCOVERY_MENU_SPRITE_KEY = "mountain_snowy_01";
export const WATER_DISCOVERY_MENU_SPRITE_KEY = "water_shallow_01";

const GRAND_CANAL_ROUTE_COORDINATES = Object.freeze([
  Object.freeze({ lat: 39.92, lon: 116.21 }),
  Object.freeze({ lat: 39.09, lon: 116.82 }),
  Object.freeze({ lat: 37.32, lon: 115.87 }),
  Object.freeze({ lat: 35.30, lon: 116.54 }),
  Object.freeze({ lat: 34.18, lon: 117.64 }),
  Object.freeze({ lat: 33.39, lon: 119.19 }),
  Object.freeze({ lat: 32.00, lon: 119.73 }),
  Object.freeze({ lat: 30.31, lon: 119.76 })
]);

export const WORLD_DISCOVERY_SPECS = Object.freeze([
  {
    id: GREAT_PYRAMID_DISCOVERY_ID,
    kind: "landmark",
    displayName: "The Great Pyramid",
    notice: "You have discovered the Great Pyramid",
    detail: "Giza",
    lat: 29.9792,
    lon: 31.1342,
    radiusPx: 96,
    spriteKey: "egyptian_pyramid",
    placementLongitudeSide: "west",
    historicity: "historical",
    region: "ottoman",
    captainDialogue: "The Great Pyramid! No tale prepared me for the scale of it."
  },
  waterFeature(
    "lake-victoria",
    "Lake Victoria",
    "Africa's great lake",
    -1.0,
    33.0,
    LAKE_VICTORIA_DISCOVERY_RADIUS_PX,
    {
      region: "africa",
      captainDialogue: "We've found it! The legendary source of the Nile!"
    }
  ),
  landmark("stonehenge", "Stonehenge", "Salisbury Plain", 51.1789, -1.8262, 165, {
    region: "europe",
    captainDialogue: "Stonehenge! Who raised these stones, and what did they see in the sky?"
  }),
  landmark("pyramids-of-meroe", "The Pyramids of Meroe", "Nubian royal necropolis", 16.9370, 33.7500, 170, {
    region: "africa",
    captainDialogue: "Pyramids in Nubia! How many kingdoms has the Nile carried?"
  }),
  landmark("great-zimbabwe", "Great Zimbabwe", "The stone city of the plateau", -20.2674, 30.9338, 165, {
    region: "africa",
    captainDialogue: "A stone city on the plateau. What hands raised these walls?"
  }),
  landmark("petra", "Petra", "The rose-red city", 30.3285, 35.4444, 210, {
    region: "ottoman",
    captainDialogue: "A whole city carved from rose-red stone. I scarcely believe my eyes."
  }),
  landmark("mohenjo-daro", "Mohenjo-daro", "City of the Indus Valley", 27.3242, 68.1386, 190, {
    region: "india",
    captainDialogue: "An ancient city laid out in brick, older than any chart aboard."
  }),
  landmark("sigiriya", "Sigiriya", "The Lion Rock fortress", 7.9570, 80.7603, 165, {
    region: "india",
    captainDialogue: "A fortress atop the Lion Rock! It seems to float above the forest."
  }),
  landmark("angkor-wat", "Angkor Wat", "Temple of the Khmer", 13.4125, 103.8670, 200, {
    region: "southeast-asia",
    captainDialogue: "Those towers rise like a stone mountain above the forest."
  }),
  landmark("great-wall", "The Great Wall", "The northern walls of China", 40.4319, 116.5704, 175, {
    region: "east-asia",
    captainDialogue: "The Great Wall runs beyond the horizon. No map could capture its scale."
  }),
  waterFeature("grand-canal", "The Grand Canal", "Beijing-Hangzhou waterway", 35.30, 116.54, 120, {
    routeCoordinates: GRAND_CANAL_ROUTE_COORDINATES,
    region: "east-asia",
    captainDialogue: "A river shaped by human hands, joining north and south."
  }),
  landmark("borobudur", "Borobudur", "The mountain of a thousand Buddhas", -7.6079, 110.2038, 205, {
    region: "southeast-asia",
    captainDialogue: "A mountain of carved stone, crowned with a thousand Buddhas."
  }),
  landmark("chichen-itza", "Chichen Itza", "The city at the edge of the well", 20.6843, -88.5678, 155, {
    region: "americas",
    captainDialogue: "A great stone city stands here, beyond every map we carried."
  }),
  landmark("nazca-lines", "The Nazca Lines", "Figures drawn across the desert", -14.7390, -75.1300, 140, {
    region: "americas",
    captainDialogue: "Great figures scored into the desert. Who were they meant to see?"
  }),
  landmark("machu-picchu", "Machu Picchu", "The Inca citadel in the clouds", -13.1631, -72.5450, 190, {
    region: "americas",
    captainDialogue: "A citadel among the clouds. How did they raise stone so high?"
  }),
  waterFeature("niagara-falls", "Niagara Falls", "The thunder of the waters", 43.0828, -79.0742, 260, {
    region: "americas",
    captainDialogue: "The river falls away in thunder. I can feel it through the deck."
  }),
  waterFeature("victoria-falls", "Victoria Falls", "The smoke that thunders", -17.9243, 25.8572, 380, {
    region: "africa",
    captainDialogue: "Smoke that thunders indeed! The whole river vanishes into mist."
  }),
  waterFeature("lake-titicaca", "Lake Titicaca", "The sacred lake of the Andes", -15.8000, -69.4000, 180, {
    region: "americas",
    captainDialogue: "A vast lake beneath the Andes, higher than any sea I know."
  }),
  {
    id: EL_DORADO_DISCOVERY_ID,
    kind: "legend",
    displayName: "El Dorado",
    notice: "You have discovered El Dorado",
    detail: "The legend of the golden city",
    lat: 4.9770,
    lon: -73.7740,
    radiusPx: 280,
    spriteKey: "landmark_el_dorado",
    historicity: "legendary",
    region: "americas",
    captainDialogue: "El Dorado! The legendary city of gold is real.",
    cargoReward: Object.freeze({
      goodId: "gold",
      fillRemainingHold: true
    })
  }
].map((spec) => Object.freeze(spec)));

export const WORLD_DISCOVERY_SPRITE_KEYS = Object.freeze([
  ...new Set(WORLD_DISCOVERY_SPECS.map((spec) => spec.spriteKey).filter(Boolean))
]);

export const CIRCUMNAVIGATION_DISCOVERY = Object.freeze({
  id: CIRCUMNAVIGATION_DISCOVERY_ID,
  kind: "achievement",
  displayName: "Circumnavigated the Globe",
  notice: "You have circumnavigated the globe",
  detail: "A full voyage around the world",
  portArrivalDialogue: "The harbor clerk's calendar and our log disagree by a whole day. We sailed around the world and carried our old reckoning all the way with us!",
  portArrivalExpressionId: "surprised"
});

export function captainDialogueForDiscovery(discovery, playerCharacter) {
  if (!discovery?.captainDialogue || !playerCharacter) return null;
  if (!isDiscoveryNovelToCharacter(discovery, playerCharacter)) return null;
  return discovery.captainDialogue;
}

export function isDiscoveryNovelToCharacter(discovery, playerCharacter) {
  if (!discovery?.region || !playerCharacter?.startRegion) return true;
  return discovery.region !== playerCharacter.startRegion;
}

export function buildWorldDiscoveries(graph, directionIndex, placement) {
  if (!graph || !directionIndex) throw new Error("Cannot place world discoveries without a geodesic graph");
  const navigationDistances = WORLD_DISCOVERY_SPECS.map((spec) => {
    const direction = latLonToDirection(spec.lat, spec.lon);
    const routeDirections = routeDirectionsForSpec(spec);
    const discoveryDirections = routeDirections.length > 0 ? routeDirections : [direction];
    const navigationDistancePx = Math.min(
      ...discoveryDirections.map((discoveryDirection) =>
        nearestNavigableDistancePx(discoveryDirection, graph, placement)
      )
    );
    return { spec, direction, routeDirections, navigationDistancePx };
  });
  const unreachable = navigationDistances.filter(({ spec, navigationDistancePx }) =>
    navigationDistancePx > spec.radiusPx
  );
  if (unreachable.length > 0) {
    const details = unreachable.map(({ spec, navigationDistancePx }) =>
      `${spec.displayName}: ${navigationDistancePx.toFixed(1)}px from water, ${spec.radiusPx}px radius`
    ).join("; ");
    throw new Error(`World discoveries are unreachable from navigable water: ${details}`);
  }

  return navigationDistances.map(({ spec, direction, routeDirections, navigationDistancePx }) => {
    const tileId = findNearestTileId(graph, directionIndex, direction);
    const spriteTileId = spec.spriteKey
      ? findDedicatedLandmarkTile(spec, tileId, graph, placement)
      : null;
    return Object.freeze({
      ...spec,
      direction,
      routeDirections: routeDirections.length > 0 ? Object.freeze(routeDirections) : undefined,
      tileId,
      spriteTileId,
      navigationDistancePx
    });
  });
}

function routeDirectionsForSpec(spec) {
  if (!Array.isArray(spec.routeCoordinates)) return [];
  return spec.routeCoordinates.map(({ lat, lon }) => latLonToDirection(lat, lon));
}

function findDedicatedLandmarkTile(spec, originTileId, graph, placement) {
  validateLandmarkPlacement(graph, placement);
  const cityTileIds = new Set(placement.cityTileIds);
  const riverTileIds = new Set();
  for (let tileId = 0; tileId < graph.tileCount; tileId++) {
    if (placement.riverMasks[tileId] || placement.riverToWaterMasks[tileId]) riverTileIds.add(tileId);
  }

  const seen = new Set([originTileId]);
  let frontier = [originTileId];
  while (frontier.length > 0) {
    const eligible = frontier.filter((tileId) =>
      placement.landMask[tileId] &&
      landmarkPlacementSideMatches(tileId, spec, graph) &&
      !tileOrNeighborsIntersect(tileId, graph, cityTileIds) &&
      !tileOrNeighborsIntersect(tileId, graph, riverTileIds)
    );
    if (eligible.length > 0) {
      eligible.sort((a, b) => landmarkTileScore(a, spec, graph) - landmarkTileScore(b, spec, graph) || a - b);
      return eligible[0];
    }

    const next = [];
    for (const tileId of frontier) {
      for (const neighborId of graph.neighbors[tileId]) {
        if (seen.has(neighborId)) continue;
        seen.add(neighborId);
        next.push(neighborId);
      }
    }
    frontier = next;
  }
  throw new Error(`Could not find a dedicated land hex for ${spec.displayName}`);
}

function landmarkPlacementSideMatches(tileId, spec, graph) {
  if (!spec.placementLongitudeSide) return true;
  const delta = longitudeDelta(graph.lonDeg[tileId], spec.lon);
  if (spec.placementLongitudeSide === "west") return delta < 0;
  if (spec.placementLongitudeSide === "east") return delta > 0;
  throw new Error(`Unknown landmark placement side for ${spec.id}: ${spec.placementLongitudeSide}`);
}

function validateLandmarkPlacement(graph, placement) {
  if (!placement) throw new Error("World discovery sprites require dedicated-hex placement data");
  for (const key of ["landMask", "riverMasks", "riverToWaterMasks"]) {
    if (!placement[key] || placement[key].length !== graph.tileCount) {
      throw new Error(`World discovery placement requires a complete ${key}`);
    }
  }
  if (!placement.cityTileIds || typeof placement.cityTileIds[Symbol.iterator] !== "function") {
    throw new Error("World discovery placement requires city tile ids");
  }
  if (!placement.navigationMask || placement.navigationMask.length !== graph.tileCount) {
    throw new Error("World discovery placement requires a complete navigation mask");
  }
  if (!Number.isFinite(placement.pixelsPerRadian) || placement.pixelsPerRadian <= 0) {
    throw new Error(`World discovery placement has invalid pixels-per-radian: ${placement.pixelsPerRadian}`);
  }
}

function nearestNavigableDistancePx(direction, graph, placement) {
  validateLandmarkPlacement(graph, placement);
  let bestDot = -1;
  for (let tileId = 0; tileId < graph.tileCount; tileId++) {
    if (!placement.navigationMask[tileId]) continue;
    const offset = tileId * 3;
    const dot = direction[0] * graph.centers[offset] +
      direction[1] * graph.centers[offset + 1] +
      direction[2] * graph.centers[offset + 2];
    if (dot > bestDot) bestDot = dot;
  }
  if (bestDot < -0.5) throw new Error("World discoveries require at least one navigable globe tile");
  return Math.acos(Math.max(-1, Math.min(1, bestDot))) * placement.pixelsPerRadian;
}

function tileOrNeighborsIntersect(tileId, graph, blockedTileIds) {
  if (blockedTileIds.has(tileId)) return true;
  return graph.neighbors[tileId].some((neighborId) => blockedTileIds.has(neighborId));
}

function landmarkTileScore(tileId, spec, graph) {
  const latDifference = Math.abs(graph.latDeg[tileId] - spec.lat);
  const lonDifference = Math.abs(longitudeDelta(graph.lonDeg[tileId], spec.lon));
  return latDifference + lonDifference;
}

function longitudeDelta(lon, originLon) {
  return ((lon - originLon + 540) % 360) - 180;
}

function landmark(slug, displayName, detail, lat, lon, radiusPx, options = {}) {
  return {
    id: `landmark-${slug}`,
    kind: "landmark",
    displayName,
    notice: `You have discovered ${displayName}`,
    detail,
    lat,
    lon,
    radiusPx,
    spriteKey: `landmark_${slug.replaceAll("-", "_")}`,
    historicity: "historical",
    ...options
  };
}

function waterFeature(slug, displayName, detail, lat, lon, radiusPx, options = {}) {
  return {
    ...landmark(slug, displayName, detail, lat, lon, radiusPx, options),
    spriteKey: null,
    menuTerrainSpriteKey: WATER_DISCOVERY_MENU_SPRITE_KEY
  };
}

export function restrictMountainsToNavigableView(registry, graph, navigableMask, maxDistanceRad) {
  if (!registry || !Array.isArray(registry.famous)) throw new Error("Missing mountain landmark registry");
  if (!graph || !navigableMask || navigableMask.length !== graph.tileCount) {
    throw new Error("Mountain navigation filter requires a complete navigation mask");
  }
  if (!Number.isFinite(maxDistanceRad) || maxDistanceRad <= 0) {
    throw new Error(`Invalid mountain viewing distance: ${maxDistanceRad}`);
  }

  const accessible = registry.famous.filter((mountain) =>
    mountainIsAccessibleFromNavigation(mountain.tileId, graph, navigableMask, maxDistanceRad)
  );
  const famousByTileId = new Map(accessible.map((mountain) => [mountain.tileId, mountain]));
  return {
    ...registry,
    famous: accessible,
    famousByTileId,
    inaccessibleFamous: registry.famous.filter((mountain) => !famousByTileId.has(mountain.tileId))
  };
}

export function mountainIsAccessibleFromNavigation(tileId, graph, navigableMask, maxDistanceRad) {
  if (!Number.isInteger(tileId) || tileId < 0 || tileId >= graph.tileCount) {
    throw new Error(`Invalid mountain tile: ${tileId}`);
  }
  const approximateTileSpacing = Math.sqrt(4 * Math.PI / graph.tileCount);
  const maxSteps = Math.ceil(maxDistanceRad / approximateTileSpacing) + 3;
  const minimumDot = Math.cos(maxDistanceRad);
  const startOffset = tileId * 3;
  const startX = graph.centers[startOffset];
  const startY = graph.centers[startOffset + 1];
  const startZ = graph.centers[startOffset + 2];
  const seen = new Set([tileId]);
  const queue = [{ tileId, depth: 0 }];

  for (let index = 0; index < queue.length; index++) {
    const current = queue[index];
    const offset = current.tileId * 3;
    const dot = startX * graph.centers[offset] +
      startY * graph.centers[offset + 1] +
      startZ * graph.centers[offset + 2];
    if (navigableMask[current.tileId] && dot >= minimumDot) return true;
    if (current.depth >= maxSteps) continue;
    for (const neighborId of graph.neighbors[current.tileId]) {
      if (seen.has(neighborId)) continue;
      seen.add(neighborId);
      queue.push({ tileId: neighborId, depth: current.depth + 1 });
    }
  }
  return false;
}

export function mountainDiscovery(mountain) {
  return {
    id: mountain.id,
    kind: "mountain",
    displayName: mountain.displayName,
    notice: `You have discovered ${mountain.displayName}`,
    detail: `${Math.round(mountain.elevationM).toLocaleString("en-US")} m`,
    lat: mountain.lat,
    lon: mountain.lon,
    tileId: mountain.tileId,
    radiusPx: 120,
    menuTerrainSpriteKey: MOUNTAIN_DISCOVERY_MENU_SPRITE_KEY
  };
}

function latLonToDirection(latDeg, lonDeg) {
  const lat = latDeg * Math.PI / 180;
  const lon = lonDeg * Math.PI / 180;
  const cosLat = Math.cos(lat);
  return [cosLat * Math.cos(lon), Math.sin(lat), -cosLat * Math.sin(lon)];
}
