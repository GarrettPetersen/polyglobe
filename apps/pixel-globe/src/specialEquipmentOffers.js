import {
  perkItemById,
  perkItemIsMerchantUpgrade,
  perkItemOfferAtPort
} from "./perkItems.js";

const SPECIAL_EQUIPMENT_OFFER_MEMORY_VERSION = 1;

export function createSpecialEquipmentOfferMemory() {
  return {
    version: SPECIAL_EQUIPMENT_OFFER_MEMORY_VERSION,
    byPort: {}
  };
}

export function openSpecialEquipmentOffer(
  memory,
  economy,
  city,
  { ownedItemIds = [], seedKey = null } = {}
) {
  const item = ensureSpecialEquipmentOffer(memory, economy, city, {
    ownedItemIds,
    seedKey
  });
  if (!item) return null;
  return presentSpecialEquipmentOffer(memory, city, item.id);
}

export function ensureSpecialEquipmentOffer(
  memory,
  economy,
  city,
  { ownedItemIds = [], seedKey = null } = {}
) {
  validateSpecialEquipmentOfferMemory(memory);
  if (!Array.isArray(ownedItemIds) || ownedItemIds.some((id) => typeof id !== "string")) {
    throw new Error("Special equipment offer requires owned item ids");
  }
  const key = portKey(city);
  let entry = memory.byPort[key] || null;
  if (entry && !entry.purchased && !perkItemIsMerchantUpgrade(entry.itemId, ownedItemIds)) {
    delete memory.byPort[key];
    entry = null;
  }
  if (!entry) {
    const item = perkItemOfferAtPort(economy, city, { ownedItemIds, seedKey });
    if (!item) return null;
    entry = {
      itemId: item.id,
      timesOffered: 0,
      purchased: false
    };
    memory.byPort[key] = entry;
  }
  if (entry.purchased || ownedItemIds.includes(entry.itemId)) {
    entry.purchased = true;
    return null;
  }
  return perkItemById(entry.itemId);
}

export function presentSpecialEquipmentOffer(memory, city, itemId) {
  validateSpecialEquipmentOfferMemory(memory);
  const entry = memory.byPort[portKey(city)];
  if (!entry || entry.itemId !== itemId || entry.purchased) {
    throw new Error(`No active special equipment offer for ${itemId}`);
  }
  const offer = Object.freeze({
    item: perkItemById(entry.itemId),
    reconsidered: entry.timesOffered > 0
  });
  entry.timesOffered += 1;
  return offer;
}

export function specialEquipmentOfferEntry(memory, city) {
  validateSpecialEquipmentOfferMemory(memory);
  return memory.byPort[portKey(city)] || null;
}

export function completeSpecialEquipmentOfferPurchase(memory, city, itemId) {
  validateSpecialEquipmentOfferMemory(memory);
  const entry = memory.byPort[portKey(city)];
  if (!entry || entry.itemId !== itemId || entry.purchased || entry.timesOffered < 1) {
    throw new Error(`No active special equipment offer for ${itemId}`);
  }
  entry.purchased = true;
  return perkItemById(itemId);
}

export function validateSpecialEquipmentOfferMemory(memory) {
  if (!memory || typeof memory !== "object" || Array.isArray(memory)) {
    throw new Error("Special equipment offer memory must be an object");
  }
  if (memory.version !== SPECIAL_EQUIPMENT_OFFER_MEMORY_VERSION) {
    throw new Error(`Unsupported special equipment offer memory version: ${memory.version}`);
  }
  if (!memory.byPort || typeof memory.byPort !== "object" || Array.isArray(memory.byPort)) {
    throw new Error("Special equipment offer memory requires port records");
  }
  for (const [key, entry] of Object.entries(memory.byPort)) {
    if (key.trim() === "" || !entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error(`Invalid special equipment offer record: ${key}`);
    }
    perkItemById(entry.itemId);
    if (!Number.isInteger(entry.timesOffered) || entry.timesOffered < 0) {
      throw new Error(`Invalid special equipment offer count at ${key}: ${entry.timesOffered}`);
    }
    if (typeof entry.purchased !== "boolean") {
      throw new Error(`Invalid special equipment purchase state at ${key}`);
    }
  }
  return memory;
}

function portKey(city) {
  if (!Number.isInteger(city?.tileId)) throw new Error("Special equipment offer requires a city tile");
  return String(city.tileId);
}
