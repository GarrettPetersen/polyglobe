export const WHALE_SPECIES_RIGHT = "north-atlantic-right-whale";
export const WHALE_SPECIES_BLUE = "blue-whale";
export const WHALE_SPECIES_HUMPBACK = "humpback-whale";
export const WHALE_SPECIES_MINKE = "southern-minke-whale";
export const WHALE_SPECIES_SPERM = "sperm-whale";
export const WHITE_WHALE_ID = "white-whale";

export const WHALE_LIFE_STAGE_CALF = "calf";
export const WHALE_LIFE_STAGE_ADOLESCENT = "adolescent";
export const WHALE_LIFE_STAGE_ADULT = "adult";

const DAYS_PER_YEAR = 365.25;
export const WHALE_CRUISE_SPEED_SCALE = 0.45;

export const WHALE_SPECIES = Object.freeze([
  species({
    id: WHALE_SPECIES_RIGHT,
    label: "North Atlantic right whale",
    assetSlug: WHALE_SPECIES_RIGHT,
    population: 44,
    cruiseSpeedRad: 0.0085,
    towingSpeedRad: 0.014,
    turnRateRad: 0.1,
    harpoonBreakMultiplier: 0.95,
    exhaustionMultiplier: 1.05,
    blubberYield: 28,
    adolescentScale: 0.76,
    calfScale: 0.48,
    maturityDays: 10 * DAYS_PER_YEAR,
    weaningDays: 365,
    gestationDays: 390,
    calvingIntervalDays: 3 * DAYS_PER_YEAR,
    range: northAtlanticRange
  }),
  species({
    id: WHALE_SPECIES_BLUE,
    label: "Blue whale",
    assetSlug: WHALE_SPECIES_BLUE,
    population: 54,
    cruiseSpeedRad: 0.0105,
    towingSpeedRad: 0.019,
    turnRateRad: 0.08,
    harpoonBreakMultiplier: 1.45,
    exhaustionMultiplier: 1.65,
    blubberYield: 42,
    adolescentScale: 0.77,
    calfScale: 0.46,
    maturityDays: 9 * DAYS_PER_YEAR,
    weaningDays: 210,
    gestationDays: 335,
    calvingIntervalDays: 2.5 * DAYS_PER_YEAR,
    range: globalRange(-67, 72)
  }),
  species({
    id: WHALE_SPECIES_HUMPBACK,
    label: "Humpback whale",
    assetSlug: WHALE_SPECIES_HUMPBACK,
    population: 72,
    cruiseSpeedRad: 0.0108,
    towingSpeedRad: 0.018,
    turnRateRad: 0.14,
    harpoonBreakMultiplier: 1.2,
    exhaustionMultiplier: 1.25,
    blubberYield: 24,
    adolescentScale: 0.75,
    calfScale: 0.47,
    maturityDays: 7 * DAYS_PER_YEAR,
    weaningDays: 365,
    gestationDays: 335,
    calvingIntervalDays: 2.5 * DAYS_PER_YEAR,
    range: globalRange(-68, 68)
  }),
  species({
    id: WHALE_SPECIES_MINKE,
    label: "Southern minke whale",
    assetSlug: WHALE_SPECIES_MINKE,
    population: 84,
    cruiseSpeedRad: 0.0145,
    towingSpeedRad: 0.021,
    turnRateRad: 0.18,
    harpoonBreakMultiplier: 0.78,
    exhaustionMultiplier: 0.72,
    blubberYield: 10,
    adolescentScale: 0.78,
    calfScale: 0.5,
    maturityDays: 7.5 * DAYS_PER_YEAR,
    weaningDays: 180,
    gestationDays: 305,
    calvingIntervalDays: 365,
    range: southernMinkeRange
  }),
  species({
    id: WHALE_SPECIES_SPERM,
    label: "Sperm whale",
    assetSlug: WHALE_SPECIES_SPERM,
    population: 65,
    cruiseSpeedRad: 0.0115,
    towingSpeedRad: 0.0195,
    turnRateRad: 0.1,
    harpoonBreakMultiplier: 1.35,
    exhaustionMultiplier: 1.45,
    blubberYield: 32,
    adolescentScale: 0.72,
    calfScale: 0.43,
    maturityDays: 12 * DAYS_PER_YEAR,
    weaningDays: 2 * DAYS_PER_YEAR,
    gestationDays: 480,
    calvingIntervalDays: 4 * DAYS_PER_YEAR,
    range: globalRange(-63, 70)
  })
]);

export const WHALE_POPULATION_TARGET = WHALE_SPECIES.reduce(
  (total, entry) => total + entry.population,
  1
);

const WHALE_SPECIES_BY_ID = new Map(WHALE_SPECIES.map((entry) => [entry.id, entry]));
if (WHALE_SPECIES_BY_ID.size !== WHALE_SPECIES.length) {
  throw new Error("Whale species registry contains duplicate ids");
}

export function whaleSpeciesById(speciesId) {
  const entry = WHALE_SPECIES_BY_ID.get(speciesId);
  if (!entry) throw new Error(`Unknown whale species: ${speciesId}`);
  return entry;
}

export function whaleSpeciesForIndividual(whale) {
  if (!whale || typeof whale.speciesId !== "string") throw new Error("Whale has no species id");
  return whaleSpeciesById(whale.speciesId);
}

export function whaleDisplayLabel(whale) {
  if (whale?.id === WHITE_WHALE_ID) return "White whale";
  const speciesLabel = whaleSpeciesForIndividual(whale).label;
  if (whale.lifeStage === WHALE_LIFE_STAGE_CALF) return `${speciesLabel} calf`;
  if (whale.lifeStage === WHALE_LIFE_STAGE_ADOLESCENT) return `${speciesLabel} (adolescent)`;
  if (whale.lifeStage === WHALE_LIFE_STAGE_ADULT) return speciesLabel;
  throw new Error(`Unknown whale life stage: ${whale?.lifeStage ?? "missing"}`);
}

export function whaleAssetSlug(whale) {
  return whale?.id === WHITE_WHALE_ID
    ? "white-sperm-whale"
    : whaleSpeciesForIndividual(whale).assetSlug;
}

export function whaleLifeStageScale(whale) {
  const entry = whaleSpeciesForIndividual(whale);
  if (whale.lifeStage === WHALE_LIFE_STAGE_CALF) return entry.calfScale;
  if (whale.lifeStage === WHALE_LIFE_STAGE_ADOLESCENT) return entry.adolescentScale;
  if (whale.lifeStage === WHALE_LIFE_STAGE_ADULT) return 1;
  throw new Error(`Unknown whale life stage: ${whale?.lifeStage ?? "missing"}`);
}

export function whaleRangeContains(speciesId, position) {
  const { latitudeDeg, longitudeDeg } = vectorLatLon(position);
  return whaleSpeciesById(speciesId).range(latitudeDeg, longitudeDeg);
}

export function whaleRangeContainsCandidate(speciesId, candidate) {
  if (!Number.isFinite(candidate?.latitudeDeg) || !Number.isFinite(candidate?.longitudeDeg)) {
    throw new Error(`Whale range candidate has invalid coordinates: ${candidate?.tileId ?? "missing"}`);
  }
  return whaleSpeciesById(speciesId).range(candidate.latitudeDeg, candidate.longitudeDeg);
}

export function vectorLatLon(position) {
  if (!Array.isArray(position) || position.length !== 3 || !position.every(Number.isFinite)) {
    throw new Error("Whale position must be a finite globe vector");
  }
  const latitudeDeg = Math.asin(clamp(position[1], -1, 1)) * 180 / Math.PI;
  const longitudeDeg = Math.atan2(-position[2], position[0]) * 180 / Math.PI;
  return { latitudeDeg, longitudeDeg };
}

function species(config) {
  for (const key of ["id", "label", "assetSlug"]) {
    if (typeof config[key] !== "string" || config[key] === "") {
      throw new Error(`Whale species has invalid ${key}`);
    }
  }
  for (const key of [
    "population", "cruiseSpeedRad", "towingSpeedRad", "turnRateRad",
    "harpoonBreakMultiplier", "exhaustionMultiplier", "blubberYield",
    "adolescentScale", "calfScale", "maturityDays", "weaningDays",
    "gestationDays", "calvingIntervalDays"
  ]) {
    if (!Number.isFinite(config[key]) || config[key] <= 0) {
      throw new Error(`Whale species ${config.id} has invalid ${key}`);
    }
  }
  if (!Number.isInteger(config.population) || !Number.isInteger(config.blubberYield)) {
    throw new Error(`Whale species ${config.id} population and yield must be integers`);
  }
  if (typeof config.range !== "function") throw new Error(`Whale species ${config.id} has no range`);
  return Object.freeze({
    ...config,
    cruiseSpeedRad: config.cruiseSpeedRad * WHALE_CRUISE_SPEED_SCALE
  });
}

function globalRange(minLatitude, maxLatitude) {
  return (latitudeDeg) => latitudeDeg >= minLatitude && latitudeDeg <= maxLatitude;
}

function northAtlanticRange(latitudeDeg, longitudeDeg) {
  return latitudeDeg >= 20 && latitudeDeg <= 72 && longitudeDeg >= -100 && longitudeDeg <= 35;
}

function southernMinkeRange(latitudeDeg) {
  return latitudeDeg >= -78 && latitudeDeg <= -12;
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}
