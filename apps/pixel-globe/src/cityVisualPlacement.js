const DIRECTIONS = Object.freeze([
  Object.freeze({ x: 1, y: 0 }),
  Object.freeze({ x: Math.SQRT1_2, y: Math.SQRT1_2 }),
  Object.freeze({ x: 0, y: 1 }),
  Object.freeze({ x: -Math.SQRT1_2, y: Math.SQRT1_2 }),
  Object.freeze({ x: -1, y: 0 }),
  Object.freeze({ x: -Math.SQRT1_2, y: -Math.SQRT1_2 }),
  Object.freeze({ x: 0, y: -1 }),
  Object.freeze({ x: Math.SQRT1_2, y: -Math.SQRT1_2 })
]);

export const CITY_VISUAL_MAX_OFFSET_PX = 9;
export const CITY_BANK_PREFERENCES = Object.freeze({
  "Cairo|Egypt": "east"
});

const BANK_VECTORS = Object.freeze({
  east: Object.freeze({ x: 1, y: 0 }),
  south: Object.freeze({ x: 0, y: 1 }),
  west: Object.freeze({ x: -1, y: 0 }),
  north: Object.freeze({ x: 0, y: -1 })
});

export function cityVisualPlacementCandidates() {
  const candidates = [{ x: 0, y: 0 }];
  const seen = new Set(["0,0"]);
  for (const distance of [4, 7, CITY_VISUAL_MAX_OFFSET_PX]) {
    for (const direction of DIRECTIONS) {
      const candidate = {
        x: Math.round(direction.x * distance),
        y: Math.round(direction.y * distance)
      };
      const key = `${candidate.x},${candidate.y}`;
      if (seen.has(key)) continue;
      seen.add(key);
      candidates.push(candidate);
    }
  }
  return candidates;
}

export function cityBankPreferenceVector(city) {
  if (!city || typeof city.city !== "string" || typeof city.country !== "string") return null;
  const preference = CITY_BANK_PREFERENCES[`${city.city}|${city.country}`];
  if (!preference) return null;
  const vector = BANK_VECTORS[preference];
  if (!vector) throw new Error(`Unknown city bank preference: ${preference}`);
  return vector;
}

export function cityVisualPlacementLoss({
  offset,
  riverOverlapPixels,
  centerOnOpenWater,
  preferredDirection = null
}) {
  if (!offset || !Number.isInteger(offset.x) || !Number.isInteger(offset.y)) {
    throw new Error("City visual placement requires an integer offset");
  }
  if (!Number.isInteger(riverOverlapPixels) || riverOverlapPixels < 0) {
    throw new Error(`Invalid city river overlap: ${riverOverlapPixels}`);
  }
  if (typeof centerOnOpenWater !== "boolean") throw new Error("City water support must be boolean");
  const distanceSquared = offset.x * offset.x + offset.y * offset.y;
  let preferencePenalty = 0;
  if (preferredDirection) {
    const progress = offset.x * preferredDirection.x + offset.y * preferredDirection.y;
    preferencePenalty = (CITY_VISUAL_MAX_OFFSET_PX - progress) * 5;
  }
  return riverOverlapPixels * 100 + (centerOnOpenWater ? 1000 : 0) + distanceSquared + preferencePenalty;
}

export function selectCityVisualOffset(evaluate, preferredDirection = null) {
  if (typeof evaluate !== "function") throw new Error("City visual placement requires an evaluator");
  let best = null;
  let bestLoss = Infinity;
  for (const offset of cityVisualPlacementCandidates()) {
    const result = evaluate(offset);
    const loss = cityVisualPlacementLoss({ offset, preferredDirection, ...result });
    if (loss >= bestLoss) continue;
    best = Object.freeze({ ...offset });
    bestLoss = loss;
  }
  if (!best) throw new Error("City visual placement produced no candidate");
  return best;
}
