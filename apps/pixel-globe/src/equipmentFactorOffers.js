import { CANNON_EQUIPMENT, cannonEquipmentById } from "./cannonEquipment.js";
import { FISHING_NETS, fishingNetById } from "./fishingNets.js";
import { perkItemSummary } from "./perkItems.js";
import {
  EQUIPMENT_STOCK_CANNON,
  EQUIPMENT_STOCK_FISHING_NET,
  EQUIPMENT_STOCK_WHALE_HARPOON,
  equipmentStockAtPort
} from "./portEquipment.js";
import {
  ensureSpecialEquipmentOffer,
  presentSpecialEquipmentOffer
} from "./specialEquipmentOffers.js";
import { WHALE_HARPOONS, whaleHarpoonById } from "./whaleHarpoons.js";

export const EQUIPMENT_FACTOR_PITCH_COOLDOWN_MINUTES = 30 * 24 * 60;
export const EQUIPMENT_FACTOR_DECLINE_COOLDOWN_MINUTES = 60 * 24 * 60;
export const EQUIPMENT_FACTOR_KIND_FISHING_NET = "fishing-net";
export const EQUIPMENT_FACTOR_KIND_CANNON = "cannon";
export const EQUIPMENT_FACTOR_KIND_WHALE_HARPOON = "whale-harpoon";
export const EQUIPMENT_FACTOR_KIND_PERK_ITEM = "perk-item";

const EQUIPMENT_FACTOR_KINDS = new Set([
  EQUIPMENT_FACTOR_KIND_FISHING_NET,
  EQUIPMENT_FACTOR_KIND_CANNON,
  EQUIPMENT_FACTOR_KIND_WHALE_HARPOON,
  EQUIPMENT_FACTOR_KIND_PERK_ITEM
]);

export function prepareEquipmentFactorPitch({
  memory,
  economy,
  city,
  simMinute,
  doubloons,
  voyageSeed,
  ship,
  inventory
}) {
  assertPitchInputs({ memory, city, simMinute, doubloons, voyageSeed, inventory });
  const candidates = equipmentFactorCandidates({
    memory,
    economy,
    city,
    doubloons,
    voyageSeed,
    ship,
    inventory
  }).filter((candidate) => !equipmentFactorPitchOnCooldown(
    memory.decisions,
    city,
    candidate.kind,
    candidate.itemId,
    simMinute
  ));
  if (candidates.length === 0) return null;

  candidates.sort(compareCandidates);
  const selected = candidates[0];
  let reconsidered = false;
  if (selected.kind === EQUIPMENT_FACTOR_KIND_PERK_ITEM) {
    reconsidered = presentSpecialEquipmentOffer(
      memory.specialEquipmentOffers,
      city,
      selected.itemId
    ).reconsidered;
  }
  memory.decisions[equipmentFactorPitchKey(city, selected.kind, selected.itemId)] = simMinute + 1;
  return Object.freeze({ ...selected, reconsidered });
}

export function validateEquipmentFactorPitch(pitch) {
  if (!pitch || typeof pitch !== "object" || Array.isArray(pitch)) {
    throw new Error("Equipment factor pitch must be an object");
  }
  if (!EQUIPMENT_FACTOR_KINDS.has(pitch.kind)) {
    throw new Error(`Unknown equipment factor pitch kind: ${pitch.kind}`);
  }
  for (const key of ["itemId", "label", "salesPitch", "effectDetail"]) {
    if (typeof pitch[key] !== "string" || pitch[key].trim() === "") {
      throw new Error(`Equipment factor pitch requires ${key}`);
    }
  }
  if (!Number.isInteger(pitch.price) || pitch.price <= 0) {
    throw new Error(`Invalid equipment factor pitch price: ${pitch.price}`);
  }
  if (!Number.isInteger(pitch.tier) || pitch.tier < 1) {
    throw new Error(`Invalid equipment factor pitch tier: ${pitch.tier}`);
  }
  if (!Number.isInteger(pitch.tierGain) || pitch.tierGain < 1) {
    throw new Error(`Invalid equipment factor pitch improvement: ${pitch.tierGain}`);
  }
  if (typeof pitch.reconsidered !== "boolean") {
    throw new Error("Equipment factor pitch requires a reconsidered flag");
  }
  return pitch;
}

export function recordEquipmentFactorPitchDecline({ memory, pitch, simMinute }) {
  assertDecisionMemory(memory);
  validateEquipmentFactorPitch(pitch);
  assertPitchMinute(simMinute);
  memory.decisions[equipmentFactorPitchDeclineKey(pitch.kind, pitch.itemId)] = simMinute + 1;
}

export function equipmentFactorPitchItem(pitch) {
  validateEquipmentFactorPitch(pitch);
  if (pitch.kind === EQUIPMENT_FACTOR_KIND_FISHING_NET) return fishingNetById(pitch.itemId);
  if (pitch.kind === EQUIPMENT_FACTOR_KIND_CANNON) return cannonEquipmentById(pitch.itemId);
  if (pitch.kind === EQUIPMENT_FACTOR_KIND_WHALE_HARPOON) return whaleHarpoonById(pitch.itemId);
  if (pitch.kind === EQUIPMENT_FACTOR_KIND_PERK_ITEM) return perkItemSummary(pitch.itemId);
  throw new Error(`Unknown equipment factor pitch kind: ${pitch.kind}`);
}

export function equipmentFactorPitchKey(city, kind, itemId) {
  if (!EQUIPMENT_FACTOR_KINDS.has(kind)) throw new Error(`Unknown equipment factor kind: ${kind}`);
  if (typeof itemId !== "string" || itemId.trim() === "") {
    throw new Error("Equipment factor pitch key requires an item id");
  }
  return `equipment.factor-pitch.${portKey(city)}.${kind}.${itemId}`;
}

function equipmentFactorCandidates({
  memory,
  economy,
  city,
  doubloons,
  voyageSeed,
  ship,
  inventory
}) {
  const ownedItemIds = Object.keys(inventory.items).filter((itemId) => inventory.items[itemId] === 1);
  const candidates = [];
  const specialItem = ensureSpecialEquipmentOffer(memory.specialEquipmentOffers, economy, city, {
    ownedItemIds,
    seedKey: voyageSeed
  });
  if (specialItem && specialItem.price <= doubloons) {
    const summary = perkItemSummary(specialItem.id);
    candidates.push(candidate({
      kind: EQUIPMENT_FACTOR_KIND_PERK_ITEM,
      item: summary,
      currentTier: 0,
      priority: 1,
      salesPitch: `${summary.detail} Rare gear like this earns its berth on a working ship.`,
      effectDetail: summary.effectLabels.join(" / ")
    }));
  }

  const currentNet = fishingNetById(inventory.fishingNetId);
  for (const net of affordableUpgrades(
    equipmentStockAtPort(economy, city, EQUIPMENT_STOCK_FISHING_NET, FISHING_NETS),
    currentNet.tier,
    doubloons
  )) {
    candidates.push(candidate({
      kind: EQUIPMENT_FACTOR_KIND_FISHING_NET,
      item: net,
      currentTier: currentNet.tier,
      salesPitch: "It should pay for itself after a few fishing trips, while bringing larger hauls over the rail.",
      effectDetail: `Fishing odds x${net.catchRateMultiplier.toFixed(2)} / Max haul ${net.maxCatch}`
    }));
  }

  if (ship && ship.cannonCapacity > 0) {
    const currentCannon = cannonEquipmentById(inventory.cannonEquipmentId);
    for (const equipment of affordableUpgrades(
      equipmentStockAtPort(economy, city, EQUIPMENT_STOCK_CANNON, CANNON_EQUIPMENT),
      currentCannon.tier,
      doubloons
    )) {
      candidates.push(candidate({
        kind: EQUIPMENT_FACTOR_KIND_CANNON,
        item: equipment,
        currentTier: currentCannon.tier,
        salesPitch: "A quicker, harder-hitting battery can settle a broadside before the enemy has reloaded.",
        effectDetail: `Reload ${equipment.reloadSeconds.toFixed(2)}s / ` +
          `Damage x${equipment.damageMultiplier.toFixed(2)} / Range x${equipment.rangeMultiplier.toFixed(2)}`
      }));
    }
  }

  const currentHarpoon = inventory.whaleHarpoonId === null
    ? null
    : whaleHarpoonById(inventory.whaleHarpoonId);
  for (const harpoon of affordableUpgrades(
    equipmentStockAtPort(economy, city, EQUIPMENT_STOCK_WHALE_HARPOON, WHALE_HARPOONS),
    currentHarpoon?.tier || 0,
    doubloons
  )) {
    candidates.push(candidate({
      kind: EQUIPMENT_FACTOR_KIND_WHALE_HARPOON,
      item: harpoon,
      currentTier: currentHarpoon?.tier || 0,
      salesPitch: "Its truer shaft and stronger line mean fewer whales lost once the chase begins.",
      effectDetail: `Accuracy ${Math.round(harpoon.accuracy * 100)}% / ` +
        `Line break ${Math.round(harpoon.breakChance * 100)}% / Range ${harpoon.rangePx}`
    }));
  }
  return candidates;
}

function affordableUpgrades(stock, currentTier, doubloons) {
  return stock.filter((item) => item.tier > currentTier && item.price <= doubloons);
}

function candidate({
  kind,
  item,
  currentTier,
  priority = 0,
  salesPitch,
  effectDetail
}) {
  return Object.freeze({
    kind,
    itemId: item.id,
    label: item.label,
    price: item.price,
    tier: item.tier,
    tierGain: item.tier - currentTier,
    priority,
    salesPitch,
    effectDetail
  });
}

function compareCandidates(a, b) {
  return b.priority - a.priority ||
    b.tierGain - a.tierGain ||
    b.tier - a.tier ||
    b.price - a.price ||
    a.itemId.localeCompare(b.itemId);
}

function equipmentFactorPitchOnCooldown(decisions, city, kind, itemId, simMinute) {
  return decisionMinuteOnCooldown(
    decisions,
    equipmentFactorPitchKey(city, kind, itemId),
    simMinute,
    EQUIPMENT_FACTOR_PITCH_COOLDOWN_MINUTES
  ) || decisionMinuteOnCooldown(
    decisions,
    equipmentFactorPitchDeclineKey(kind, itemId),
    simMinute,
    EQUIPMENT_FACTOR_DECLINE_COOLDOWN_MINUTES
  );
}

function decisionMinuteOnCooldown(decisions, key, simMinute, cooldownMinutes) {
  const value = decisions[key];
  if (value === undefined) return false;
  if (!Number.isFinite(value) || value < 1) {
    throw new Error(`Invalid equipment factor pitch minute: ${value}`);
  }
  const lastPitchMinute = value - 1;
  return simMinute - lastPitchMinute < cooldownMinutes;
}

function equipmentFactorPitchDeclineKey(kind, itemId) {
  if (!EQUIPMENT_FACTOR_KINDS.has(kind)) throw new Error(`Unknown equipment factor kind: ${kind}`);
  if (typeof itemId !== "string" || itemId.trim() === "") {
    throw new Error("Equipment factor decline key requires an item id");
  }
  return `equipment.factor-pitch-declined.${kind}.${itemId}`;
}

function assertPitchInputs({ memory, city, simMinute, doubloons, voyageSeed, inventory }) {
  assertDecisionMemory(memory);
  if (!memory.specialEquipmentOffers) {
    throw new Error("Equipment factor pitch requires special-offer memory");
  }
  portKey(city);
  assertPitchMinute(simMinute);
  if (!Number.isInteger(doubloons) || doubloons < 0) {
    throw new Error(`Invalid equipment factor purse: ${doubloons}`);
  }
  if (typeof voyageSeed !== "string" || voyageSeed.trim() === "") {
    throw new Error("Equipment factor pitch requires a voyage seed");
  }
  if (!inventory || typeof inventory !== "object" || Array.isArray(inventory) ||
      !inventory.items || typeof inventory.items !== "object" || Array.isArray(inventory.items)) {
    throw new Error("Equipment factor pitch requires ship inventory");
  }
  fishingNetById(inventory.fishingNetId);
  cannonEquipmentById(inventory.cannonEquipmentId);
  if (inventory.whaleHarpoonId !== null) whaleHarpoonById(inventory.whaleHarpoonId);
}

function assertDecisionMemory(memory) {
  if (!memory || typeof memory !== "object" || Array.isArray(memory)) {
    throw new Error("Equipment factor pitch requires game memory");
  }
  if (!memory.decisions || typeof memory.decisions !== "object" || Array.isArray(memory.decisions)) {
    throw new Error("Equipment factor pitch requires decision memory");
  }
}

function assertPitchMinute(simMinute) {
  if (!Number.isFinite(simMinute) || simMinute < 0) {
    throw new Error(`Invalid equipment factor pitch minute: ${simMinute}`);
  }
}

function portKey(city) {
  const key = city?.portId || (Number.isInteger(city?.tileId) ? `city-${city.tileId}` : null);
  if (!key) throw new Error("Equipment factor pitch requires a port id");
  return key;
}
