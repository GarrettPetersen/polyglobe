export const BASIC_WHALE_HARPOON_ID = "ash-shaft-harpoon";

export const WHALE_HARPOONS = Object.freeze([
  whaleHarpoon(BASIC_WHALE_HARPOON_ID, "Ash-shaft harpoon", 1, 450, 0.54, 0.34, 46, 18),
  whaleHarpoon("barbed-whale-harpoon", "Barbed whale harpoon", 2, 2200, 0.7, 0.22, 58, 14),
  whaleHarpoon("masterwork-harpoon", "Masterwork harpoon", 3, 8500, 0.84, 0.12, 72, 10)
]);

const WHALE_HARPOONS_BY_ID = new Map(WHALE_HARPOONS.map((harpoon) => [harpoon.id, harpoon]));

export function whaleHarpoonById(harpoonId) {
  const harpoon = WHALE_HARPOONS_BY_ID.get(harpoonId);
  if (!harpoon) throw new Error(`Unknown whale harpoon: ${harpoonId}`);
  return harpoon;
}

export function whaleHarpoonHitChance(harpoon, distancePx) {
  assertHarpoon(harpoon);
  if (!Number.isFinite(distancePx) || distancePx < 0) {
    throw new Error(`Invalid whale harpoon distance: ${distancePx}`);
  }
  if (distancePx > harpoon.rangePx) return 0;
  const rangeFraction = distancePx / harpoon.rangePx;
  return clamp(harpoon.accuracy * (1 - rangeFraction * 0.32), 0.12, 0.95);
}

export function resolveWhaleHarpoon(harpoon, distancePx, {
  hitRoll,
  breakRoll,
  resistanceMultiplier = 1
}) {
  const hitChance = whaleHarpoonHitChance(harpoon, distancePx);
  for (const [label, value] of Object.entries({ hitRoll, breakRoll })) {
    if (!Number.isFinite(value) || value < 0 || value >= 1) {
      throw new Error(`Invalid whale harpoon ${label}: ${value}`);
    }
  }
  if (!Number.isFinite(resistanceMultiplier) || resistanceMultiplier <= 0) {
    throw new Error(`Invalid whale resistance multiplier: ${resistanceMultiplier}`);
  }
  const breakChance = clamp(harpoon.breakChance * resistanceMultiplier, 0.02, 0.95);
  if (hitRoll >= hitChance) return Object.freeze({ outcome: "missed", hitChance });
  if (breakRoll < breakChance) return Object.freeze({ outcome: "broke", hitChance, breakChance });
  return Object.freeze({ outcome: "tethered", hitChance, breakChance });
}

function whaleHarpoon(id, label, tier, price, accuracy, breakChance, rangePx, exhaustionSeconds) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) throw new Error(`Invalid whale harpoon id: ${id}`);
  if (typeof label !== "string" || label.length === 0) throw new Error(`Invalid whale harpoon label: ${id}`);
  if (!Number.isInteger(tier) || tier < 1 || tier > 3) throw new Error(`Invalid whale harpoon tier: ${id}`);
  if (!Number.isInteger(price) || price <= 0) throw new Error(`Invalid whale harpoon price: ${id}`);
  for (const [name, value] of Object.entries({ accuracy, breakChance })) {
    if (!Number.isFinite(value) || value <= 0 || value >= 1) {
      throw new Error(`Invalid whale harpoon ${name}: ${id}`);
    }
  }
  if (!Number.isInteger(rangePx) || rangePx <= 0) throw new Error(`Invalid whale harpoon range: ${id}`);
  if (!Number.isFinite(exhaustionSeconds) || exhaustionSeconds <= 0) {
    throw new Error(`Invalid whale exhaustion time: ${id}`);
  }
  return Object.freeze({
    id,
    label,
    tier,
    price,
    accuracy,
    breakChance,
    rangePx,
    exhaustionSeconds
  });
}

function assertHarpoon(harpoon) {
  if (!harpoon || WHALE_HARPOONS_BY_ID.get(harpoon.id) !== harpoon) {
    throw new Error("Whale hunting requires a canonical harpoon");
  }
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}
