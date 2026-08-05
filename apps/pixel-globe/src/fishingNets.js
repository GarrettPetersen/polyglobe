import { GRAMMATICAL_NUMBER_SINGULAR } from "./grammaticalNumber.js";

export const BASIC_FISHING_NET_ID = "basic-cast-net";

export const FISHING_NETS = Object.freeze([
  fishingNet(BASIC_FISHING_NET_ID, "Basic cast net", 0, 0, 0.8, 3),
  fishingNet("weighted-cast-net", "Weighted cast net", 1, 900, 1, 5),
  fishingNet("drift-net", "Drift net", 2, 4000, 1.2, 8),
  fishingNet("masterwork-seine", "Masterwork seine", 3, 15000, 1.4, 12)
]);

const FISHING_NETS_BY_ID = new Map(FISHING_NETS.map((net) => [net.id, net]));

export function fishingNetById(netId) {
  const net = FISHING_NETS_BY_ID.get(netId);
  if (!net) throw new Error(`Unknown fishing net: ${netId}`);
  return net;
}

export function npcFishingNetForSeed(seed, cargoCapacity) {
  if (!Number.isInteger(seed)) throw new Error(`Invalid NPC fishing net seed: ${seed}`);
  if (!Number.isInteger(cargoCapacity) || cargoCapacity <= 0) {
    throw new Error(`Invalid NPC fishing net cargo capacity: ${cargoCapacity}`);
  }
  const capacityBonus = clamp((cargoCapacity - 20) / 500, 0, 0.12);
  const quality = Math.min(0.999999, hashUnit(`${seed}|fishing-net`) + capacityBonus);
  if (quality < 0.58) return FISHING_NETS[0];
  if (quality < 0.84) return FISHING_NETS[1];
  if (quality < 0.97) return FISHING_NETS[2];
  return FISHING_NETS[3];
}

export function npcFishingNetExpectedHaul(netId) {
  const net = fishingNetById(netId);
  return Math.max(1, Math.min(net.maxCatch, Math.floor(net.maxCatch * net.catchRateMultiplier)));
}

function fishingNet(id, label, tier, price, catchRateMultiplier, maxCatch) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) throw new Error(`Invalid fishing net id: ${id}`);
  if (!Number.isInteger(tier) || tier < 0) throw new Error(`Invalid fishing net tier: ${id}`);
  if (!Number.isInteger(price) || price < 0) throw new Error(`Invalid fishing net price: ${id}`);
  if (!Number.isFinite(catchRateMultiplier) || catchRateMultiplier <= 0) {
    throw new Error(`Invalid fishing net catch rate: ${id}`);
  }
  if (!Number.isInteger(maxCatch) || maxCatch <= 0) throw new Error(`Invalid fishing net haul: ${id}`);
  return Object.freeze({
    id,
    label,
    grammaticalNumber: GRAMMATICAL_NUMBER_SINGULAR,
    tier,
    price,
    catchRateMultiplier,
    maxCatch
  });
}

function hashUnit(value) {
  let h = 0x811c9dc5;
  const text = String(value);
  for (let index = 0; index < text.length; index++) {
    h ^= text.charCodeAt(index);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) / 0x100000000;
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}
