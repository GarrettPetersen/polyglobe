export const CORAL_REEF_SPRITE_KEYS = Object.freeze([
  "coral_01",
  "coral_02",
  "coral_03",
  "coral_04"
]);

export const CORAL_REEF_ALPHA = 0.44;
export const GREAT_BARRIER_REEF_FIELD_ID = "great-barrier-reef";
const CORAL_REEF_MIN_FIELD_SIZE = 8;
export const COSMETIC_CORAL_REEF_FIELD_IDS = Object.freeze([
  "red-sea-reef-belt",
  "mesoamerican-reef",
  "maldives-lakshadweep-reef-chain",
  "new-caledonian-barrier-reef",
  "florida-reef-tract",
  "great-sea-reef-fiji"
]);

const CORAL_REEF_FIELD_SPECS = Object.freeze([
  reefField({
    id: GREAT_BARRIER_REEF_FIELD_ID,
    bounds: { minLat: -25.4, maxLat: -9.6, minLon: 142.3, maxLon: 154.0 },
    maxDistanceKm: 105,
    selectionPercent: 72,
    seedSalt: 0x52454546,
    requiresDiscoveryAnchor: true,
    routes: [[
      { lat: -10.6, lon: 143.4 },
      { lat: -12.2, lon: 144.0 },
      { lat: -13.8, lon: 144.7 },
      { lat: -15.4, lon: 145.4 },
      { lat: -17.0, lon: 146.1 },
      { lat: -18.4, lon: 147.2 },
      { lat: -19.8, lon: 148.3 },
      { lat: -21.2, lon: 149.7 },
      { lat: -22.7, lon: 151.1 },
      { lat: -24.3, lon: 152.6 }
    ]]
  }),
  reefField({
    id: "red-sea-reef-belt",
    bounds: { minLat: 11.5, maxLat: 29.7, minLon: 33.5, maxLon: 44.2 },
    maxDistanceKm: 58,
    selectionPercent: 68,
    seedSalt: 0x52454453,
    routes: [
      [
        { lat: 28.0, lon: 34.4 },
        { lat: 25.2, lon: 35.4 },
        { lat: 22.3, lon: 37.0 },
        { lat: 19.0, lon: 38.4 },
        { lat: 16.0, lon: 40.3 },
        { lat: 13.0, lon: 42.5 }
      ],
      [
        { lat: 29.1, lon: 34.9 },
        { lat: 26.0, lon: 36.2 },
        { lat: 23.0, lon: 38.0 },
        { lat: 20.0, lon: 39.6 },
        { lat: 17.0, lon: 41.3 },
        { lat: 13.3, lon: 43.0 }
      ]
    ]
  }),
  reefField({
    id: "mesoamerican-reef",
    bounds: { minLat: 14.8, maxLat: 22.2, minLon: -89.0, maxLon: -85.7 },
    maxDistanceKm: 72,
    selectionPercent: 82,
    seedSalt: 0x4d45534f,
    routes: [[
      { lat: 21.5, lon: -86.7 },
      { lat: 20.0, lon: -87.0 },
      { lat: 18.3, lon: -87.7 },
      { lat: 16.4, lon: -88.1 },
      { lat: 15.8, lon: -87.6 }
    ]]
  }),
  reefField({
    id: "maldives-lakshadweep-reef-chain",
    bounds: { minLat: -1.8, maxLat: 13.2, minLon: 71.5, maxLon: 74.8 },
    maxDistanceKm: 68,
    selectionPercent: 76,
    seedSalt: 0x4d414c44,
    routes: [[
      { lat: 12.0, lon: 72.6 },
      { lat: 10.4, lon: 72.7 },
      { lat: 8.3, lon: 73.0 },
      { lat: 6.2, lon: 73.2 },
      { lat: 4.2, lon: 73.4 },
      { lat: 2.0, lon: 73.3 },
      { lat: -0.7, lon: 73.2 }
    ]]
  }),
  reefField({
    id: "new-caledonian-barrier-reef",
    bounds: { minLat: -24.0, maxLat: -18.3, minLon: 162.8, maxLon: 168.2 },
    maxDistanceKm: 62,
    selectionPercent: 86,
    seedSalt: 0x4e434252,
    routes: [[
      { lat: -19.2, lon: 163.8 },
      { lat: -20.5, lon: 163.6 },
      { lat: -22.0, lon: 164.5 },
      { lat: -23.1, lon: 166.0 },
      { lat: -22.0, lon: 167.2 },
      { lat: -20.2, lon: 166.6 },
      { lat: -19.2, lon: 164.8 },
      { lat: -19.2, lon: 163.8 }
    ]]
  }),
  reefField({
    id: "florida-reef-tract",
    bounds: { minLat: 23.7, maxLat: 28.2, minLon: -83.8, maxLon: -79.1 },
    maxDistanceKm: 58,
    selectionPercent: 84,
    seedSalt: 0x464c4f52,
    routes: [[
      { lat: 24.5, lon: -82.9 },
      { lat: 24.5, lon: -81.7 },
      { lat: 24.9, lon: -80.7 },
      { lat: 25.8, lon: -80.1 },
      { lat: 27.3, lon: -79.9 }
    ]]
  }),
  reefField({
    id: "great-sea-reef-fiji",
    bounds: { minLat: -17.0, maxLat: -15.1, minLon: 176.4, maxLon: 180.0 },
    maxDistanceKm: 62,
    selectionPercent: 100,
    seedSalt: 0x46494a49,
    routes: [[
      { lat: -16.4, lon: 179.9 },
      { lat: -16.1, lon: 178.8 },
      { lat: -15.9, lon: 177.6 },
      { lat: -16.1, lon: 176.9 }
    ]]
  })
]);

const CORAL_REEF_FIELD_BY_ID = new Map(
  CORAL_REEF_FIELD_SPECS.map((field) => [field.id, field])
);

export function buildCoralReefFields({
  graph,
  navigationMask,
  discoveryAnchorsByFieldId = new Map()
}) {
  validateInputs(graph, navigationMask, discoveryAnchorsByFieldId);
  const corals = [];
  const countsByFieldId = new Map(CORAL_REEF_FIELD_SPECS.map((field) => [field.id, 0]));

  for (let tileId = 0; tileId < graph.tileCount; tileId++) {
    if (!navigationMask[tileId]) continue;
    const lat = graph.latDeg[tileId];
    const lon = graph.lonDeg[tileId];
    for (const field of CORAL_REEF_FIELD_SPECS) {
      if (!pointInBounds(lat, lon, field.bounds)) continue;
      if (distanceToFieldKm(field, lat, lon) > field.maxDistanceKm) continue;

      const seed = hashInt(tileId ^ field.seedSalt);
      const discoveryTileId = discoveryAnchorsByFieldId.get(field.id);
      const discoveryAnchor = tileId === discoveryTileId;
      if (!discoveryAnchor && seed % 100 >= field.selectionPercent) continue;
      corals.push(Object.freeze({
        reefId: field.id,
        tileId,
        spriteKey: discoveryAnchor
          ? CORAL_REEF_SPRITE_KEYS[0]
          : CORAL_REEF_SPRITE_KEYS[(seed >>> 8) % CORAL_REEF_SPRITE_KEYS.length],
        seed,
        discoveryAnchor
      }));
      countsByFieldId.set(field.id, countsByFieldId.get(field.id) + 1);
    }
  }

  validatePlacements(corals, countsByFieldId, discoveryAnchorsByFieldId);
  return Object.freeze(corals);
}

export function distanceToCoralReefFieldKm(fieldId, lat, lon) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new Error(`Coral reef distance requires finite coordinates: ${lat}, ${lon}`);
  }
  const field = CORAL_REEF_FIELD_BY_ID.get(fieldId);
  if (!field) throw new Error(`Unknown coral reef field: ${fieldId}`);
  return distanceToFieldKm(field, lat, normalizeLongitude(lon));
}

export function coralReefWaterMaskSpans({
  originX,
  originY,
  width,
  height,
  isWater,
  isBeach
}) {
  if (!Number.isInteger(originX) || !Number.isInteger(originY)) {
    throw new Error(`Coral reef water mask requires an integer origin: ${originX},${originY}`);
  }
  if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
    throw new Error(`Coral reef water mask requires positive integer dimensions: ${width}x${height}`);
  }
  if (typeof isWater !== "function" || typeof isBeach !== "function") {
    throw new Error("Coral reef water mask requires water and beach predicates");
  }

  const spans = [];
  for (let py = 0; py < height; py++) {
    let runStart = -1;
    for (let px = 0; px <= width; px++) {
      const mapX = originX + px;
      const mapY = originY + py;
      const visible = px < width && isWater(mapX, mapY) && !isBeach(mapX, mapY);
      if (visible && runStart < 0) {
        runStart = px;
      } else if (!visible && runStart >= 0) {
        spans.push({ x: runStart, y: py, width: px - runStart });
        runStart = -1;
      }
    }
  }
  return spans;
}

function reefField({
  id,
  bounds,
  maxDistanceKm,
  selectionPercent,
  seedSalt,
  routes,
  requiresDiscoveryAnchor = false
}) {
  const sampledRoutes = routes.map((route) => Object.freeze(sampleRoute(route, 0.32)));
  return Object.freeze({
    id,
    bounds: Object.freeze(bounds),
    maxDistanceKm,
    selectionPercent,
    seedSalt,
    requiresDiscoveryAnchor,
    samples: Object.freeze(sampledRoutes.flat())
  });
}

function sampleRoute(route, intervalDegrees) {
  const samples = [];
  for (let index = 0; index < route.length - 1; index++) {
    const from = route[index];
    const to = route[index + 1];
    const lonDelta = wrappedLongitudeDelta(from.lon, to.lon);
    const span = Math.max(Math.abs(to.lat - from.lat), Math.abs(lonDelta));
    const steps = Math.max(1, Math.ceil(span / intervalDegrees));
    for (let step = 0; step < steps; step++) {
      const t = step / steps;
      samples.push(Object.freeze({
        lat: from.lat + (to.lat - from.lat) * t,
        lon: normalizeLongitude(from.lon + lonDelta * t)
      }));
    }
  }
  const last = route.at(-1);
  samples.push(Object.freeze({ lat: last.lat, lon: normalizeLongitude(last.lon) }));
  return samples;
}

function distanceToFieldKm(field, lat, lon) {
  let nearest = Infinity;
  for (const sample of field.samples) {
    const meanLatRad = (lat + sample.lat) * 0.5 * Math.PI / 180;
    const northKm = (lat - sample.lat) * 111.32;
    const eastKm = wrappedLongitudeDelta(sample.lon, lon) * 111.32 * Math.cos(meanLatRad);
    nearest = Math.min(nearest, Math.hypot(northKm, eastKm));
  }
  return nearest;
}

function pointInBounds(lat, lon, bounds) {
  return lat >= bounds.minLat && lat <= bounds.maxLat &&
    lon >= bounds.minLon && lon <= bounds.maxLon;
}

function validateInputs(graph, navigationMask, discoveryAnchorsByFieldId) {
  if (!graph || !Number.isInteger(graph.tileCount) || graph.tileCount <= 0) {
    throw new Error("Coral reef fields require a geodesic graph");
  }
  if (!navigationMask || navigationMask.length !== graph.tileCount) {
    throw new Error("Coral reef fields require a complete navigation mask");
  }
  if (!(discoveryAnchorsByFieldId instanceof Map)) {
    throw new Error("Coral reef fields require a discovery-anchor map");
  }
  for (const [fieldId, tileId] of discoveryAnchorsByFieldId) {
    if (!CORAL_REEF_FIELD_BY_ID.has(fieldId)) {
      throw new Error(`Unknown coral reef discovery field: ${fieldId}`);
    }
    if (!Number.isInteger(tileId) || tileId < 0 || tileId >= graph.tileCount) {
      throw new Error(`Coral reef field ${fieldId} has an invalid discovery tile: ${tileId}`);
    }
    if (!navigationMask[tileId]) {
      throw new Error(`Coral reef field ${fieldId} discovery tile must be navigable water`);
    }
  }
  for (const field of CORAL_REEF_FIELD_SPECS) {
    if (field.requiresDiscoveryAnchor && !discoveryAnchorsByFieldId.has(field.id)) {
      throw new Error(`Coral reef field ${field.id} requires a discovery anchor`);
    }
  }
}

function validatePlacements(corals, countsByFieldId, discoveryAnchorsByFieldId) {
  for (const field of CORAL_REEF_FIELD_SPECS) {
    const fieldSize = countsByFieldId.get(field.id);
    if (fieldSize < CORAL_REEF_MIN_FIELD_SIZE) {
      throw new Error(
        `Coral reef field ${field.id} is too sparse: ${fieldSize}/${CORAL_REEF_MIN_FIELD_SIZE}`
      );
    }
    if (!field.requiresDiscoveryAnchor) continue;
    const discoveryTileId = discoveryAnchorsByFieldId.get(field.id);
    if (!corals.some((coral) => coral.reefId === field.id && coral.tileId === discoveryTileId && coral.discoveryAnchor)) {
      throw new Error(`Coral reef field ${field.id} discovery tile is outside its reef corridor`);
    }
    const representedSprites = new Set(
      corals.filter((coral) => coral.reefId === field.id).map((coral) => coral.spriteKey)
    );
    if (representedSprites.size !== CORAL_REEF_SPRITE_KEYS.length) {
      throw new Error(`Coral reef field ${field.id} did not include every coral sprite`);
    }
  }
}

function wrappedLongitudeDelta(fromLon, toLon) {
  let delta = toLon - fromLon;
  while (delta > 180) delta -= 360;
  while (delta < -180) delta += 360;
  return delta;
}

function normalizeLongitude(lon) {
  let normalized = lon;
  while (normalized > 180) normalized -= 360;
  while (normalized < -180) normalized += 360;
  return normalized;
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
