import { PIRATE_HAVEN_SPECS } from "./pirateHavenCatalog.js";

export const PIRATE_HAVEN_REBUILD_MINUTES = 180 * 24 * 60;
const havenIds = new Set(PIRATE_HAVEN_SPECS.map(({ id }) => id));
function havenId(id) {
  if (!havenIds.has(id)) throw new Error(`Unknown pirate haven: ${id}`);
  return id;
}
function minute(value) {
  if (!Number.isFinite(value) || value < 0) throw new Error(`Invalid pirate haven clock: ${value}`);
}
export function createPirateHavenMemory() {
  return { version: 1, ruinedUntil: {}, revenge: null, suppression: null, nextQuestId: 1 };
}
export function validatePirateHavenMemory(memory) {
  if (!memory || memory.version !== 1 || !memory.ruinedUntil || Array.isArray(memory.ruinedUntil) ||
      !Number.isSafeInteger(memory.nextQuestId) || memory.nextQuestId < 1) throw new Error("Invalid pirate haven memory");
  for (const [id, until] of Object.entries(memory.ruinedUntil)) { havenId(id); minute(until); }
  for (const kind of ["revenge", "suppression"]) {
    const quest = memory[kind];
    if (quest === null) continue;
    if (!quest || quest.kind !== kind || typeof quest.id !== "string" || !quest.id ||
        typeof quest.originCityId !== "string" || !quest.originCityId ||
        !Number.isSafeInteger(quest.reward) || quest.reward <= 0 ||
        typeof quest.ready !== "boolean") throw new Error(`Invalid pirate ${kind} quest`);
    havenId(quest.havenCityId);
    const textFields = ["originName", "havenName", ...(kind === "revenge" ? ["targetShipId", "targetShipName", "targetCaptainName", "targetPortName", "itemId", "itemName"] : [])];
    for (const field of textFields) {
      if (typeof quest[field] !== "string" || quest[field].trim() === "") throw new Error(`Pirate ${kind} quest lacks ${field}: ${quest.id}`);
    }
    if (!Number.isSafeInteger(quest.distanceKm) || quest.distanceKm < 0) throw new Error(`Invalid pirate quest distance: ${quest.id}`);
    if (kind === "revenge" && (!Number.isSafeInteger(quest.targetShipSeed) || quest.targetShipSeed < 0)) throw new Error(`Pirate quest lacks its original hull generation: ${quest.id}`);
    if (kind === "revenge" && quest.originCityId !== quest.havenCityId) throw new Error(`Pirate revenge issuer is not its haven: ${quest.id}`);
  }
}
export function pirateHavenIsRuined(memory, cityId, simMinute) {
  minute(simMinute);
  const until = memory.ruinedUntil[cityId] ?? 0;
  return until > simMinute && simMinute >= until - PIRATE_HAVEN_REBUILD_MINUTES;
}
export function pirateHavenIsVisible(memory, cityId, simMinute, piratesReveal) {
  havenId(cityId);
  return piratesReveal || pirateHavenIsRuined(memory, cityId, simMinute) ||
    (memory.suppression?.havenCityId === cityId && !memory.suppression.ready);
}
export function ruinPirateHaven(memory, cityId, simMinute) {
  havenId(cityId); minute(simMinute);
  if (pirateHavenIsRuined(memory, cityId, simMinute)) throw new Error(`Pirate haven is already ruined: ${cityId}`);
  memory.ruinedUntil[cityId] = simMinute + PIRATE_HAVEN_REBUILD_MINUTES;
  if (memory.suppression?.havenCityId === cityId) memory.suppression.ready = true;
  return memory.ruinedUntil[cityId];
}

// The named item is owned by exactly one persistent quest: aboard its target
// ship until seized, then aboard the player until delivered. It is not trade cargo.
export function pirateRevengeTargetPresent(memory, shipsById) {
  const quest = memory.revenge;
  if (!quest || quest.ready) return false;
  const ship = shipsById.get(quest.targetShipId);
  return Boolean(ship && ship.seed === quest.targetShipSeed && ship.hitPoints > 0);
}

export function seizePirateRevengeItem(memory, ship) {
  const quest = memory.revenge;
  if (!quest || quest.targetShipId !== ship.id || quest.targetShipSeed !== ship.seed || quest.ready) return null;
  quest.ready = true;
  return quest;
}
export function pirateRevengeInventory(memory) {
  const quest = memory.revenge;
  return quest?.ready ? [{ id: quest.itemId, label: quest.itemName,
    detail: `Return to ${quest.havenName}`, quantity: 1, questItem: true,
    discardable: false, issuer: quest.targetCaptainName, route: quest.havenName }] : [];
}
export function pirateHavenQuestOffer(memory, city, { havens, merchants, sailingDistanceKm, simMinute }) {
  minute(simMinute);
  const kind = city.isPirateHideout ? "revenge" : "suppression";
  if (memory[kind]) return null;
  if (city.isPirateHideout && pirateHavenIsRuined(memory, city.cityId, simMinute)) return null;
  const candidates = kind === "revenge"
    ? merchants.filter(ship => ship.role === "merchant" && !ship.encounter && !ship.commissioned && ship.hitPoints > 0 && ship.captainName &&
      !(ship.graceUntilPortVisit > ship.portVisits) &&
      ship.currentPort?.cityId && !ship.currentPort.isPirateHideout)
      .map(ship => ({ ship, port: ship.currentPort }))
    : havens.filter(port => !pirateHavenIsRuined(memory, port.cityId, simMinute)).map(port => ({ port }));
  const reachable = candidates.map(candidate => ({ ...candidate,
    distanceKm: sailingDistanceKm(city, candidate.port) }))
    .filter(candidate => Number.isFinite(candidate.distanceKm) && candidate.distanceKm >= 0)
    .sort((a, b) => a.distanceKm - b.distanceKm ||
      (a.ship?.id || a.port.cityId).localeCompare(b.ship?.id || b.port.cityId));
  if (!reachable.length) return null;
  const target = reachable[0];
  const haven = kind === "revenge" ? city : target.port;
  const id = `pirate-${kind}-${memory.nextQuestId}`;
  return { id, kind, originCityId: city.cityId, originName: city.displayCity || city.city,
    havenCityId: haven.cityId, havenName: haven.displayCity || haven.city,
    distanceKm: Math.round(target.distanceKm), reward: kind === "revenge" ? 2500 : 5000,
    ready: false, ...(kind === "revenge" ? {
      targetShipId: target.ship.id, targetShipSeed: target.ship.seed, targetShipName: target.ship.name || `${target.ship.captainName}’s ${(target.ship.slug || "merchant ship").replaceAll("-", " ")}`,
      targetCaptainName: target.ship.captainName,
      targetPortName: target.port.displayCity || target.port.city,
      itemId: `${id}-silver-cup`, itemName: "Engraved silver cup"
    } : {}) };
}
export function acceptPirateHavenQuest(memory, offer) {
  if (!offer || !["revenge", "suppression"].includes(offer.kind) || memory[offer.kind] ||
      offer.id !== `pirate-${offer.kind}-${memory.nextQuestId}`) throw new Error("Pirate commission offer is stale");
  const next = { ...memory, [offer.kind]: { ...offer }, nextQuestId: memory.nextQuestId + 1 };
  validatePirateHavenMemory(next);
  memory[offer.kind] = next[offer.kind]; memory.nextQuestId = next.nextQuestId;
}
export function completePirateHavenQuest(state, cityId, kind, simMinute) {
  const memory = state.memory.pirateHavens;
  const quest = memory[kind];
  if (!quest || !quest.ready || quest.originCityId !== cityId ||
      (kind === "revenge" && pirateHavenIsRuined(memory, cityId, simMinute))) {
    throw new Error(`Pirate ${kind} commission cannot be delivered at ${cityId}`);
  }
  state.doubloons += quest.reward;
  memory[kind] = null;
  return quest;
}
