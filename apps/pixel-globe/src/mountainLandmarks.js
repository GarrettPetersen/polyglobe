import { findNearestTileId } from "./geodesic.js";
import { requireCanonicalDiscoveryId } from "./discoveryIdentity.js";
import { fetchStaticAsset } from "./staticAssetFetch.js";

export const NAMED_MOUNTAINS_URL = "shared/mountains.json";

const ICONIC_MOUNTAIN_NAMES = new Set([
  "aconcagua",
  "ben nevis",
  "chimborazo",
  "cotopaxi",
  "denali",
  "fuji",
  "grand teton",
  "kailash",
  "mauna kea",
  "mauna loa",
  "matterhorn",
  "mont blanc",
  "monte etna",
  "mount ararat",
  "mount cook",
  "mount hood",
  "mount kenya",
  "mount kinabalu",
  "mount blanc",
  "mount olympus",
  "mount rainier",
  "mount shasta",
  "mount st helens",
  "mount vesuvius",
  "mount washington",
  "nanga parbat",
  "pico de orizaba",
  "pikes peak",
  "popocatepetl",
  "puncak jaya",
  "table mountain"
]);

const DISPLAY_NAME_OVERRIDES = new Map([
  ["aconcagua", "Aconcagua"],
  ["fuji", "Mount Fuji"],
  ["gora elbrus", "Mount Elbrus"],
  ["monte etna", "Mount Etna"],
  ["mount blanc", "Mont Blanc"]
]);

export async function loadNamedMountains() {
  const response = await fetchStaticAsset(NAMED_MOUNTAINS_URL, {
    label: "named mountains"
  });
  if (!response.ok) throw new Error(`Failed to load named mountains: HTTP ${response.status}`);
  const mountains = await response.json();
  validateNamedMountains(mountains);
  return mountains;
}

export function validateNamedMountains(mountains) {
  if (!Array.isArray(mountains) || mountains.length === 0) {
    throw new Error("Named mountain dataset must be a non-empty array");
  }
  const ids = new Set();
  const legacyIds = new Set();
  for (let index = 0; index < mountains.length; index++) {
    const mountain = mountains[index];
    if (!mountain || typeof mountain !== "object") throw new Error(`Invalid mountain at index ${index}`);
    if (typeof mountain.id !== "string" || mountain.id.trim() === "") {
      throw new Error(`Mountain ${index} has no canonical id`);
    }
    requireCanonicalDiscoveryId(mountain.id, `Mountain ${index}`);
    if (ids.has(mountain.id)) throw new Error(`Duplicate mountain id: ${mountain.id}`);
    ids.add(mountain.id);
    if (!Array.isArray(mountain.legacyDiscoveryIds) || mountain.legacyDiscoveryIds.length === 0) {
      throw new Error(`Mountain ${mountain.id} has no explicit legacy discovery ids`);
    }
    for (const legacyId of mountain.legacyDiscoveryIds) {
      if (typeof legacyId !== "string" || legacyId.trim() === "") {
        throw new Error(`Mountain ${mountain.id} has an invalid legacy discovery id`);
      }
      if (legacyIds.has(legacyId)) throw new Error(`Duplicate legacy mountain discovery id: ${legacyId}`);
      legacyIds.add(legacyId);
    }
    if (typeof mountain.name !== "string" || mountain.name.trim() === "") {
      throw new Error(`Mountain ${index} has no name`);
    }
    for (const key of ["lat", "lon", "elevationM", "scalerank"]) {
      if (!Number.isFinite(mountain[key])) throw new Error(`Mountain ${mountain.name} has invalid ${key}`);
    }
  }
}

export function buildMountainLandmarks(mountains, graph, directionIndex, cachePeaks) {
  validateNamedMountains(mountains);
  if (!graph || !directionIndex) throw new Error("Cannot place mountains without a geodesic graph and direction index");
  if (!Array.isArray(cachePeaks) || cachePeaks.length === 0) {
    throw new Error("Earth cache has no named peak tiles");
  }

  const cachedPeakTileIds = validateCachePeaks(cachePeaks);
  const allCachedPeakTileIds = [...cachedPeakTileIds];
  const displayNames = mountains.map(mountainDisplayName);
  const cachePeakIdsByElevation = new Map();
  for (const [tileId, elevationM] of cachePeaks) {
    let tileIds = cachePeakIdsByElevation.get(elevationM);
    if (!tileIds) {
      tileIds = [];
      cachePeakIdsByElevation.set(elevationM, tileIds);
    }
    tileIds.push(tileId);
  }

  const all = mountains.map((mountain, index) => {
    const direction = latLonToDirection(mountain.lat, mountain.lon);
    const directTileId = findNearestTileId(graph, directionIndex, direction);
    const tileId = cachedPeakTileIds.has(directTileId)
      ? directTileId
      : nearestCachePeakTileId(graph, direction, cachePeakIdsByElevation.get(mountain.elevationM) || allCachedPeakTileIds);
    const displayName = displayNames[index];
    return {
      ...mountain,
      tileId,
      displayName,
      famous: isFamousMountain(mountain)
    };
  });

  const peakTileIds = cachedPeakTileIds;
  const byTileId = highestMountainByTile(all);
  const famousByTileId = highestMountainByTile(all.filter((mountain) => mountain.famous));
  return {
    all,
    byTileId,
    famous: [...famousByTileId.values()].sort(compareMountainProminence),
    famousByTileId,
    peakTileIds
  };
}

function validateCachePeaks(cachePeaks) {
  return new Set(cachePeaks.map((entry) => {
    if (!Array.isArray(entry) || !Number.isInteger(entry[0]) || !Number.isFinite(entry[1])) {
      throw new Error("Earth cache contains a malformed peak entry");
    }
    return entry[0];
  }));
}

function nearestCachePeakTileId(graph, direction, candidateTileIds) {
  let bestTileId = null;
  let bestDot = -Infinity;
  for (const tileId of candidateTileIds) {
    const offset = tileId * 3;
    const dot = graph.centers[offset] * direction[0] +
      graph.centers[offset + 1] * direction[1] +
      graph.centers[offset + 2] * direction[2];
    if (dot <= bestDot) continue;
    bestDot = dot;
    bestTileId = tileId;
  }
  if (bestTileId == null || bestDot < Math.cos(2.5 * Math.PI / 180)) {
    throw new Error("Could not align a named mountain with the Earth cache peak tiles");
  }
  return bestTileId;
}

export function isFamousMountain(mountain) {
  const names = [mountain.name, mountain.nameAlt].filter(Boolean).map(normalizeMountainName);
  if (names.includes("mount olympus") && mountain.region !== "Europe") return false;
  return (mountain.scalerank <= 2 && (mountain.elevationM >= 2200 || Boolean(mountain.comment))) ||
    mountain.elevationM >= 8000 ||
    names.some((name) => ICONIC_MOUNTAIN_NAMES.has(name));
}

export function mountainDisplayName(mountain) {
  const rawName = mountain.name.trim();
  const normalized = normalizeMountainName(rawName);
  const override = DISPLAY_NAME_OVERRIDES.get(normalized);
  if (override) return override;
  if (/^gora\b/i.test(rawName) && /^mount\b/i.test(mountain.nameAlt || "")) return mountain.nameAlt.trim();
  return rawName.replace(/^Mt\.?\s+/i, "Mount ");
}

function highestMountainByTile(mountains) {
  const byTileId = new Map();
  for (const mountain of mountains) {
    const previous = byTileId.get(mountain.tileId);
    if (!previous || compareMountainProminence(mountain, previous) < 0) {
      byTileId.set(mountain.tileId, mountain);
    }
  }
  return byTileId;
}

function compareMountainProminence(a, b) {
  return a.scalerank - b.scalerank || b.elevationM - a.elevationM || a.displayName.localeCompare(b.displayName);
}

function latLonToDirection(latDeg, lonDeg) {
  const lat = latDeg * Math.PI / 180;
  const lon = lonDeg * Math.PI / 180;
  const cosLat = Math.cos(lat);
  return [cosLat * Math.cos(lon), Math.sin(lat), -cosLat * Math.sin(lon)];
}

function normalizeMountainName(name) {
  return String(name)
    .toLowerCase()
    .replace(/^mt\.?\s+/, "mount ")
    .replace(/^cerro\s+/, "")
    .replace(/[.'’-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
