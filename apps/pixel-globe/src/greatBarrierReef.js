export const GREAT_BARRIER_REEF_SPRITE_KEYS = Object.freeze([
  "coral_01",
  "coral_02",
  "coral_03",
  "coral_04"
]);

export const GREAT_BARRIER_REEF_ALPHA = 0.44;
export const GREAT_BARRIER_REEF_MAX_DISTANCE_KM = 105;

const REEF_ROUTE = Object.freeze([
  Object.freeze({ lat: -10.6, lon: 143.4 }),
  Object.freeze({ lat: -12.2, lon: 144.0 }),
  Object.freeze({ lat: -13.8, lon: 144.7 }),
  Object.freeze({ lat: -15.4, lon: 145.4 }),
  Object.freeze({ lat: -17.0, lon: 146.1 }),
  Object.freeze({ lat: -18.4, lon: 147.2 }),
  Object.freeze({ lat: -19.8, lon: 148.3 }),
  Object.freeze({ lat: -21.2, lon: 149.7 }),
  Object.freeze({ lat: -22.7, lon: 151.1 }),
  Object.freeze({ lat: -24.3, lon: 152.6 })
]);

const REEF_ROUTE_SAMPLES = Object.freeze(sampleRoute(REEF_ROUTE, 0.32));
const REEF_SELECTION_PERCENT = 72;
const REEF_SEED_SALT = 0x52454546;

export function buildGreatBarrierReef({ graph, navigationMask, discoveryTileId }) {
  validateInputs(graph, navigationMask, discoveryTileId);
  const corals = [];
  for (let tileId = 0; tileId < graph.tileCount; tileId++) {
    if (!navigationMask[tileId]) continue;
    const lat = graph.latDeg[tileId];
    const lon = graph.lonDeg[tileId];
    if (lat < -25.4 || lat > -9.6 || lon < 142.3 || lon > 154.0) continue;
    if (distanceToReefRouteKm(lat, lon) > GREAT_BARRIER_REEF_MAX_DISTANCE_KM) continue;

    const seed = hashInt(tileId ^ REEF_SEED_SALT);
    if (tileId !== discoveryTileId && seed % 100 >= REEF_SELECTION_PERCENT) continue;
    corals.push(Object.freeze({
      tileId,
      spriteKey: tileId === discoveryTileId
        ? GREAT_BARRIER_REEF_SPRITE_KEYS[0]
        : GREAT_BARRIER_REEF_SPRITE_KEYS[(seed >>> 8) % GREAT_BARRIER_REEF_SPRITE_KEYS.length],
      seed,
      discoveryAnchor: tileId === discoveryTileId
    }));
  }

  if (!corals.some((coral) => coral.discoveryAnchor)) {
    throw new Error("Great Barrier Reef discovery tile is outside the reef corridor");
  }
  const representedSprites = new Set(corals.map((coral) => coral.spriteKey));
  if (representedSprites.size !== GREAT_BARRIER_REEF_SPRITE_KEYS.length) {
    throw new Error("Great Barrier Reef placement did not include every coral sprite");
  }
  return Object.freeze(corals);
}

export function distanceToReefRouteKm(lat, lon) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new Error(`Great Barrier Reef distance requires finite coordinates: ${lat}, ${lon}`);
  }
  let nearest = Infinity;
  for (const sample of REEF_ROUTE_SAMPLES) {
    const meanLatRad = (lat + sample.lat) * 0.5 * Math.PI / 180;
    const northKm = (lat - sample.lat) * 111.32;
    const eastKm = (lon - sample.lon) * 111.32 * Math.cos(meanLatRad);
    nearest = Math.min(nearest, Math.hypot(northKm, eastKm));
  }
  return nearest;
}

function sampleRoute(route, intervalDegrees) {
  const samples = [];
  for (let index = 0; index < route.length - 1; index++) {
    const from = route[index];
    const to = route[index + 1];
    const span = Math.max(Math.abs(to.lat - from.lat), Math.abs(to.lon - from.lon));
    const steps = Math.max(1, Math.ceil(span / intervalDegrees));
    for (let step = 0; step < steps; step++) {
      const t = step / steps;
      samples.push(Object.freeze({
        lat: from.lat + (to.lat - from.lat) * t,
        lon: from.lon + (to.lon - from.lon) * t
      }));
    }
  }
  samples.push(route.at(-1));
  return samples;
}

function validateInputs(graph, navigationMask, discoveryTileId) {
  if (!graph || !Number.isInteger(graph.tileCount) || graph.tileCount <= 0) {
    throw new Error("Great Barrier Reef requires a geodesic graph");
  }
  if (!navigationMask || navigationMask.length !== graph.tileCount) {
    throw new Error("Great Barrier Reef requires a complete navigation mask");
  }
  if (!Number.isInteger(discoveryTileId) || discoveryTileId < 0 || discoveryTileId >= graph.tileCount) {
    throw new Error(`Great Barrier Reef has an invalid discovery tile: ${discoveryTileId}`);
  }
  if (!navigationMask[discoveryTileId]) {
    throw new Error("Great Barrier Reef discovery tile must be navigable water");
  }
}

function hashInt(value) {
  let hash = value | 0;
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x7feb352d);
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 0x846ca68b);
  hash ^= hash >>> 16;
  return hash >>> 0;
}
