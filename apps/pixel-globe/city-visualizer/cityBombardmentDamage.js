const OPAQUE_ALPHA_THRESHOLD = 16;
const MIN_DAMAGE_DIMENSION = 12;
const MIN_INWARD_RUN = 4;
const RIM_RADIUS_PX = 2;

export const CITY_BOMBARDMENT_DAMAGEABLE_LAYERS = Object.freeze([
  "Shipyard",
  "Home",
  "Home 2",
  "Smith",
  "Market Stall",
  "Market Stall Copy",
  "Market Stall Copy Copy",
  "Inn",
  "Far Castle",
  "Gate",
  "Near Castle"
]);

const DAMAGEABLE_LAYER_SET = new Set(CITY_BOMBARDMENT_DAMAGEABLE_LAYERS);

export function cityBombardmentLayerIsDamageable(layerName) {
  if (typeof layerName !== "string" || layerName === "") {
    throw new Error("City bombardment damage requires a building layer");
  }
  return DAMAGEABLE_LAYER_SET.has(layerName);
}

export function cityBombardmentSeed({ cityId, buildingId, eventId }) {
  for (const [label, value] of Object.entries({ cityId, buildingId, eventId })) {
    if (typeof value !== "string" || value === "") {
      throw new Error(`City bombardment seed requires ${label}`);
    }
  }
  return hashString(`${cityId}|${buildingId}|${eventId}`);
}

export function cityBombardmentBuildingIsAffected(seed, density = 1) {
  if (!Number.isInteger(seed)) throw new Error(`Invalid city bombardment seed: ${seed}`);
  if (!Number.isFinite(density) || density <= 0 || density > 1) {
    throw new Error(`Invalid city bombardment damage density: ${density}`);
  }
  return hashInt(seed ^ 0x41464645) / 0x1_0000_0000 < density;
}

export function cityBombardmentDamage({ alpha, width, height, seed }) {
  validateDamageInput(alpha, width, height, seed);
  const edge = (hashInt(seed ^ 0x45444745) & 1) === 0 ? "left" : "top";
  const candidates = edgeCandidates(alpha, width, height, edge);
  const alternateEdge = edge === "left" ? "top" : "left";
  const usableEdge = candidates.length > 0 ? edge : alternateEdge;
  const usableCandidates = candidates.length > 0
    ? candidates
    : edgeCandidates(alpha, width, height, alternateEdge);
  if (usableCandidates.length === 0) {
    throw new Error(`Bombardment found no substantial opaque edge in ${width}x${height} sprite`);
  }

  const impact = usableCandidates[hashInt(seed ^ 0x494d5041) % usableCandidates.length];
  const hole = new Uint8Array(width * height);
  carveEdgeConnectedHole({
    alpha,
    hole,
    width,
    height,
    seed,
    edge: usableEdge,
    impact
  });
  const holeBounds = maskBounds(hole, width, height);
  if (!holeBounds) throw new Error("Bombardment damage did not remove an opaque pixel");
  const rim = bombardmentRimMask({ alpha, hole, width, height });
  return Object.freeze({ edge: usableEdge, hole, rim, holeBounds });
}

function edgeCandidates(alpha, width, height, edge) {
  const candidates = [];
  if (edge === "left") {
    const minimumY = Math.max(2, Math.floor(height * 0.12));
    const maximumY = Math.min(height - 3, Math.floor(height * 0.72));
    for (let y = minimumY; y <= maximumY; y += 1) {
      const boundary = firstOpaqueX(alpha, width, y);
      if (boundary < 0) continue;
      if (opaqueRunX(alpha, width, y, boundary) < MIN_INWARD_RUN) continue;
      if (substantialOpaqueNeighborhood(alpha, width, height, boundary + 2, y)) {
        candidates.push(Object.freeze({ x: boundary, y }));
      }
    }
  } else {
    const minimumX = Math.max(2, Math.floor(width * 0.1));
    const maximumX = Math.min(width - 3, Math.floor(width * 0.88));
    for (let x = minimumX; x <= maximumX; x += 1) {
      const boundary = firstOpaqueY(alpha, width, height, x);
      if (boundary < 0) continue;
      if (opaqueRunY(alpha, width, height, x, boundary) < MIN_INWARD_RUN) continue;
      if (substantialOpaqueNeighborhood(alpha, width, height, x, boundary + 2)) {
        candidates.push(Object.freeze({ x, y: boundary }));
      }
    }
  }
  return candidates;
}

function carveEdgeConnectedHole({ alpha, hole, width, height, seed, edge, impact }) {
  const transverseLimit = edge === "left" ? height : width;
  const inwardLimit = edge === "left" ? width : height;
  const radius = clamp(
    Math.round(Math.min(width, height) * 0.105),
    4,
    Math.min(13, Math.floor(transverseLimit / 4))
  );
  const maximumDepth = clamp(
    Math.round(Math.min(width, height) * 0.16),
    5,
    Math.min(18, Math.floor(inwardLimit / 3))
  );
  const impactTransverse = edge === "left" ? impact.y : impact.x;
  const knotJitter = Array.from({ length: 5 }, (_, index) => (
    signedJitter(hashInt(seed ^ Math.imul(index + 1, 0x4b4e4f54)), 2)
  ));

  for (let delta = -radius; delta <= radius; delta += 1) {
    const transverse = impactTransverse + delta;
    if (transverse < 0 || transverse >= transverseLimit) continue;
    const normalized = Math.abs(delta) / radius;
    const shoulder = 1 - normalized * normalized;
    const knotPosition = (delta + radius) / (radius * 2) * (knotJitter.length - 1);
    const knotIndex = Math.min(knotJitter.length - 2, Math.floor(knotPosition));
    const knotMix = knotPosition - knotIndex;
    const roughness = Math.round(
      knotJitter[knotIndex] * (1 - knotMix) + knotJitter[knotIndex + 1] * knotMix
    );
    const depth = clamp(Math.round(2 + shoulder * maximumDepth) + roughness, 1, maximumDepth + 2);
    const boundary = edge === "left"
      ? firstOpaqueX(alpha, width, transverse)
      : firstOpaqueY(alpha, width, height, transverse);
    if (boundary < 0) continue;
    for (let inward = 0; inward <= depth; inward += 1) {
      const x = edge === "left" ? boundary + inward : transverse;
      const y = edge === "left" ? transverse : boundary + inward;
      if (x < 0 || y < 0 || x >= width || y >= height) continue;
      const index = y * width + x;
      if (alpha[index] > OPAQUE_ALPHA_THRESHOLD) hole[index] = 1;
    }
  }
}

function bombardmentRimMask({ alpha, hole, width, height }) {
  const rim = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (alpha[index] <= OPAQUE_ALPHA_THRESHOLD || hole[index] !== 0) continue;
      let nearHole = false;
      for (let dy = -RIM_RADIUS_PX; dy <= RIM_RADIUS_PX && !nearHole; dy += 1) {
        for (let dx = -RIM_RADIUS_PX; dx <= RIM_RADIUS_PX; dx += 1) {
          if (Math.abs(dx) + Math.abs(dy) > RIM_RADIUS_PX) continue;
          const sampleX = x + dx;
          const sampleY = y + dy;
          if (sampleX < 0 || sampleY < 0 || sampleX >= width || sampleY >= height) continue;
          if (hole[sampleY * width + sampleX] !== 0) {
            nearHole = true;
            break;
          }
        }
      }
      if (nearHole) rim[index] = 1;
    }
  }
  return rim;
}

function maskBounds(mask, width, height) {
  let minimumX = width;
  let minimumY = height;
  let maximumX = -1;
  let maximumY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (mask[y * width + x] === 0) continue;
      minimumX = Math.min(minimumX, x);
      minimumY = Math.min(minimumY, y);
      maximumX = Math.max(maximumX, x);
      maximumY = Math.max(maximumY, y);
    }
  }
  return maximumX < 0
    ? null
    : Object.freeze({
        x: minimumX,
        y: minimumY,
        width: maximumX - minimumX + 1,
        height: maximumY - minimumY + 1
      });
}

function substantialOpaqueNeighborhood(alpha, width, height, centerX, centerY) {
  let opaque = 0;
  let sampled = 0;
  for (let dy = -2; dy <= 2; dy += 1) {
    for (let dx = -1; dx <= 3; dx += 1) {
      const x = centerX + dx;
      const y = centerY + dy;
      if (x < 0 || y < 0 || x >= width || y >= height) continue;
      sampled += 1;
      if (alpha[y * width + x] > OPAQUE_ALPHA_THRESHOLD) opaque += 1;
    }
  }
  return sampled > 0 && opaque / sampled >= 0.68;
}

function firstOpaqueX(alpha, width, y) {
  for (let x = 0; x < width; x += 1) {
    if (alpha[y * width + x] > OPAQUE_ALPHA_THRESHOLD) return x;
  }
  return -1;
}

function firstOpaqueY(alpha, width, height, x) {
  for (let y = 0; y < height; y += 1) {
    if (alpha[y * width + x] > OPAQUE_ALPHA_THRESHOLD) return y;
  }
  return -1;
}

function opaqueRunX(alpha, width, y, startX) {
  let length = 0;
  for (let x = startX; x < width && alpha[y * width + x] > OPAQUE_ALPHA_THRESHOLD; x += 1) {
    length += 1;
  }
  return length;
}

function opaqueRunY(alpha, width, height, x, startY) {
  let length = 0;
  for (let y = startY; y < height && alpha[y * width + x] > OPAQUE_ALPHA_THRESHOLD; y += 1) {
    length += 1;
  }
  return length;
}

function validateDamageInput(alpha, width, height, seed) {
  if (!ArrayBuffer.isView(alpha) && !Array.isArray(alpha)) {
    throw new Error("City bombardment damage requires an alpha mask");
  }
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < MIN_DAMAGE_DIMENSION ||
    height < MIN_DAMAGE_DIMENSION ||
    alpha.length !== width * height
  ) {
    throw new Error(`Invalid city bombardment sprite: ${width}x${height}`);
  }
  if (!Number.isInteger(seed)) throw new Error(`Invalid city bombardment seed: ${seed}`);
}

function signedJitter(value, radius) {
  return value % (radius * 2 + 1) - radius;
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0 || 1;
}

function hashInt(value) {
  let x = value | 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b);
  x ^= x >>> 16;
  return x >>> 0;
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}
