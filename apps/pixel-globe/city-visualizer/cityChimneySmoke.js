const DARK_SMOKE = Object.freeze(["#3e3546", "#625565", "#7f708a"]);
const LIGHT_SMOKE = Object.freeze(["#625565", "#7f708a", "#9babb2"]);
const DISTANT_SMOKE = Object.freeze(["#625565", "#7f708a"]);

export const CITY_CHIMNEY_SMOKE_EMITTERS = Object.freeze([
  chimneyEmitter({
    id: "smith",
    layerName: "Smith",
    x: 1147,
    y: 428,
    mouthPixels: Object.freeze([{ x: 1147, y: 429 }]),
    emissionIntervalMs: 165,
    lifetimeMs: 3200,
    rise: 34,
    drift: 10,
    spread: 4,
    maximumSize: 3,
    opacity: 0.78,
    colors: DARK_SMOKE
  }),
  chimneyEmitter({
    id: "home-2",
    layerName: "Home 2",
    x: 1039,
    y: 420,
    mouthPixels: Object.freeze([{ x: 1039, y: 421 }]),
    emissionIntervalMs: 980,
    lifetimeMs: 2600,
    rise: 21,
    drift: 6,
    spread: 2,
    maximumSize: 2,
    opacity: 0.42,
    colors: LIGHT_SMOKE
  }),
  chimneyEmitter({
    id: "home",
    layerName: "Home",
    x: 1167,
    y: 413,
    mouthPixels: Object.freeze([{ x: 1167, y: 414 }]),
    emissionIntervalMs: 860,
    lifetimeMs: 2700,
    rise: 22,
    drift: 7,
    spread: 2,
    maximumSize: 2,
    opacity: 0.44,
    colors: LIGHT_SMOKE
  }),
  chimneyEmitter({
    id: "inn",
    layerName: "Inn",
    x: 1092.5,
    y: 472,
    mouthPixels: Object.freeze([{ x: 1092, y: 473 }, { x: 1093, y: 473 }]),
    emissionIntervalMs: 680,
    lifetimeMs: 2850,
    rise: 24,
    drift: 7,
    spread: 3,
    maximumSize: 2,
    opacity: 0.48,
    colors: LIGHT_SMOKE
  })
]);

const CITY_CHIMNEY_SMOKE_EMITTER_BY_LAYER = new Map(
  CITY_CHIMNEY_SMOKE_EMITTERS.map((emitter) => [emitter.layerName, emitter])
);

export function placedCityBuildingChimneySmokeEmitter(placement) {
  requireBackgroundBuilding(placement);
  const source = CITY_CHIMNEY_SMOKE_EMITTER_BY_LAYER.get(placement.frame.layer);
  if (!source) return null;
  const scaleX = placement.width / placement.frame.frame.w;
  const scaleY = placement.height / placement.frame.frame.h;
  return Object.freeze({
    ...source,
    id: `city-building-slot|${placement.id}`,
    x: placement.x + (source.x - placement.frame.spriteSourceSize.x) * scaleX,
    y: placement.y + (source.y - placement.frame.spriteSourceSize.y) * scaleY
  });
}

export function backgroundCityChimneySmokeEmitters({ cityId, side, rows }) {
  if (typeof cityId !== "string" || cityId === "") {
    throw new Error("Background city chimney smoke requires a city id");
  }
  if (!["left", "right"].includes(side) || !Array.isArray(rows)) {
    throw new Error("Invalid background city chimney smoke layout");
  }
  const candidates = [];
  for (const row of rows) {
    if (!Number.isInteger(row?.distanceFromFront) || !Array.isArray(row?.buildings)) {
      throw new Error("Invalid background city chimney smoke row");
    }
    for (const building of row.buildings) {
      const source = CITY_CHIMNEY_SMOKE_EMITTER_BY_LAYER.get(building?.frame?.layer);
      if (!source) continue;
      requireBackgroundBuilding(building);
      const key = [
        cityId,
        side,
        row.distanceFromFront,
        building.frame.layer,
        building.x,
        building.y
      ].join("|");
      candidates.push({
        building,
        distanceFromFront: row.distanceFromFront,
        key,
        score: hashString(key),
        source
      });
    }
  }
  const selectedKeys = new Set(candidates
    .slice()
    .sort((left, right) => left.score - right.score || left.key.localeCompare(right.key))
    .slice(0, Math.round(candidates.length / 2))
    .map((candidate) => candidate.key));
  return Object.freeze(candidates
    .filter((candidate) => selectedKeys.has(candidate.key))
    .map((candidate) => Object.freeze({
      building: candidate.building,
      emitter: backgroundBuildingEmitter(candidate)
    })));
}

export function cityChimneySmokeParticles(emitter, timeMs) {
  requireEmitter(emitter);
  if (!Number.isFinite(timeMs) || timeMs < 0) {
    throw new Error(`Invalid city chimney smoke time: ${timeMs}`);
  }
  const latestEmission = Math.floor(timeMs / emitter.emissionIntervalMs);
  const oldestEmission = Math.max(
    0,
    latestEmission - Math.ceil(emitter.lifetimeMs / emitter.emissionIntervalMs)
  );
  const particles = [];
  for (let emission = oldestEmission; emission <= latestEmission; emission++) {
    const ageMs = timeMs - emission * emitter.emissionIntervalMs;
    if (ageMs < 0 || ageMs >= emitter.lifetimeMs) continue;
    const life = ageMs / emitter.lifetimeMs;
    const seed = hashString(`${emitter.id}|${emission}`);
    const startOffset = signedRandom(seed, 0) * emitter.spread * 0.35;
    const wobble = Math.sin(life * Math.PI * 3 + random(seed, 1) * Math.PI * 2) *
      emitter.spread * life;
    const expansion = Math.floor(life * (emitter.maximumSize + 0.6));
    const size = Math.max(1, Math.min(emitter.maximumSize, 1 + expansion));
    const centerX = emitter.x + startOffset + emitter.drift * life + wobble;
    particles.push(Object.freeze({
      x: Math.round(centerX - (size - 1) / 2),
      y: Math.round(emitter.y - emitter.rise * life - (size - 1) / 2),
      size,
      color: emitter.colors[Math.floor(random(seed, 2) * emitter.colors.length)],
      alpha: emitter.opacity * smokeFade(life)
    }));
  }
  return Object.freeze(particles);
}

function chimneyEmitter(emitter) {
  requireEmitter(emitter);
  return Object.freeze(emitter);
}

function backgroundBuildingEmitter({ building, distanceFromFront, key, source }) {
  const frame = building.frame;
  const scaleX = building.width / frame.frame.w;
  const scaleY = building.height / frame.frame.h;
  const depthOpacity = Math.max(0.55, 0.9 - distanceFromFront * 0.05);
  return Object.freeze({
    id: `background-city|${key}`,
    layerName: source.layerName,
    x: building.x + (source.x - frame.spriteSourceSize.x) * scaleX,
    y: building.y + (source.y - frame.spriteSourceSize.y) * scaleY,
    emissionIntervalMs: Math.round(
      source.emissionIntervalMs / Math.max(0.4, Math.sqrt(scaleX))
    ),
    lifetimeMs: Math.round(source.lifetimeMs * 0.9),
    rise: Math.max(3, Math.round(source.rise * scaleY)),
    drift: Math.max(1, Math.round(source.drift * scaleX)),
    spread: Math.max(1, source.spread * scaleX),
    maximumSize: 1,
    opacity: source.opacity * depthOpacity,
    colors: distanceFromFront >= 2 ? DISTANT_SMOKE : source.colors
  });
}

function requireBackgroundBuilding(building) {
  if (
    !Number.isFinite(building?.x) ||
    !Number.isFinite(building?.y) ||
    !Number.isInteger(building?.width) ||
    building.width <= 0 ||
    !Number.isInteger(building?.height) ||
    building.height <= 0 ||
    !Number.isInteger(building?.frame?.frame?.w) ||
    !Number.isInteger(building?.frame?.frame?.h) ||
    !Number.isInteger(building?.frame?.spriteSourceSize?.x) ||
    !Number.isInteger(building?.frame?.spriteSourceSize?.y)
  ) {
    throw new Error("Invalid background city chimney building");
  }
}

function requireEmitter(emitter) {
  if (!emitter || typeof emitter.id !== "string" || typeof emitter.layerName !== "string") {
    throw new Error("Invalid city chimney smoke emitter");
  }
  for (const key of [
    "x",
    "y",
    "emissionIntervalMs",
    "lifetimeMs",
    "rise",
    "drift",
    "spread",
    "maximumSize",
    "opacity"
  ]) {
    if (!Number.isFinite(emitter[key])) {
      throw new Error(`Invalid city chimney smoke emitter ${key}: ${emitter[key]}`);
    }
  }
  if (!Array.isArray(emitter.colors) || emitter.colors.length === 0) {
    throw new Error("City chimney smoke emitter requires colors");
  }
}

function smokeFade(life) {
  const fadeIn = Math.min(1, life / 0.08);
  const fadeOut = Math.min(1, (1 - life) / 0.34);
  return Math.max(0, fadeIn * fadeOut);
}

function signedRandom(seed, salt) {
  return random(seed, salt) * 2 - 1;
}

function random(seed, salt) {
  return (hashInt(seed ^ Math.imul(salt + 1, 0x9e3779b1)) >>> 0) / 0x100000000;
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function hashInt(value) {
  let hash = value >>> 0;
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x7feb352d);
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 0x846ca68b);
  hash ^= hash >>> 16;
  return hash >>> 0;
}
