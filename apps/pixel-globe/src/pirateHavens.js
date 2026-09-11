import { questOfferPolicy, questOfferRoll } from "./questOfferPolicies.js";
import { PIRATE_HAVEN_SPECS } from "./pirateHavenCatalog.js";

export const PIRATE_COMMISSION_MAX_DISTANCE_KM = 1500;
export const PIRATE_OFFER_PERIOD_MINUTES = questOfferPolicy("pirate-contract").rollPeriodMinutes;
const QUEST_KINDS = ["revenge", "suppression", "smuggling"];

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
  return { version: 2, ruinedUntil: {}, revenge: null, suppression: null, smuggling: null, nextOfferMinuteByKind: {}, nextQuestId: 1 };
}
export function validatePirateHavenMemory(memory) {
  if (!memory || memory.version !== 2 || !memory.ruinedUntil || Array.isArray(memory.ruinedUntil) ||
      !Number.isSafeInteger(memory.nextQuestId) || memory.nextQuestId < 1) throw new Error("Invalid pirate haven memory");
  if (!memory.nextOfferMinuteByKind || Array.isArray(memory.nextOfferMinuteByKind)) throw new Error("Missing pirate offer cooldowns");
  for (const [kind, until] of Object.entries(memory.nextOfferMinuteByKind)) {
    if (!QUEST_KINDS.includes(kind)) throw new Error(`Unknown pirate offer cooldown: ${kind}`);
    minute(until);
  }
  if (memory.revenge && memory.smuggling) throw new Error("Only one pirate captain contract may be active");
  for (const [id, until] of Object.entries(memory.ruinedUntil)) { havenId(id); minute(until); }
  for (const kind of QUEST_KINDS) {
    const quest = memory[kind];
    if (quest === null) continue;
    if (!quest || quest.kind !== kind || typeof quest.id !== "string" || !quest.id ||
        typeof quest.originCityId !== "string" || !quest.originCityId ||
        !Number.isSafeInteger(quest.reward) || quest.reward <= 0 ||
        typeof quest.ready !== "boolean") throw new Error(`Invalid pirate ${kind} quest`);
    havenId(quest.havenCityId);
    minute(quest.offeredMinute);
    const textFields = ["originName", "havenName", ...(kind === "revenge" ? ["targetShipId", "targetShipName", "targetCaptainName", "targetPortName", "itemId", "itemName"] : kind === "smuggling" ? ["pickupCityId", "pickupName", "pickupContactId", "pickupContactName", "itemId", "itemName"] : [])];
    for (const field of textFields) {
      if (typeof quest[field] !== "string" || quest[field].trim() === "") throw new Error(`Pirate ${kind} quest lacks ${field}: ${quest.id}`);
    }
    if (!Number.isSafeInteger(quest.distanceKm) || quest.distanceKm < 0) throw new Error(`Invalid pirate quest distance: ${quest.id}`);
    if (kind === "revenge" && (!Number.isSafeInteger(quest.targetShipSeed) || quest.targetShipSeed < 0)) throw new Error(`Pirate quest lacks its original hull generation: ${quest.id}`);
    if (["revenge", "smuggling"].includes(kind) && quest.originCityId !== quest.havenCityId) throw new Error(`Pirate revenge issuer is not its haven: ${quest.id}`);
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
export function pirateQuestInventory(memory) {
  return [memory.revenge, memory.smuggling].filter(quest => quest?.ready).map(quest => ({
    id: quest.itemId, label: quest.itemName, detail: `Return to ${quest.havenName}`,
    quantity: 1, questItem: true, discardable: false, iconId: quest.kind === "smuggling" ? "item:stolen-chest" : null,
    issuer: quest.kind === "revenge" ? quest.targetCaptainName : quest.havenName, route: quest.havenName
  }));
}
export function pirateQuestAtIssuer(memory, city) {
  return city.isPirateHideout ? memory.revenge || memory.smuggling : memory.suppression;
}
function offerHash(text) {
  let hash = 2166136261;
  for (const character of text) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return hash >>> 0;
}
export function pirateHavenQuestOffer(memory, city, {
  havens, merchants, ports = [], sailingDistanceKm, simMinute, voyageSeed = "pirate-business",
  offerRoll, contractKind, contactForPort
}) {
  minute(simMinute);
  if (pirateQuestAtIssuer(memory, city)) return null;
  if (city.isPirateHideout && pirateHavenIsRuined(memory, city.cityId, simMinute)) return null;
  const period = Math.floor(simMinute / PIRATE_OFFER_PERIOD_MINUTES);
  const seed = `${voyageSeed}|${city.cityId}|${period}`;
  const policyKind = city.isPirateHideout ? "pirate-contract" : "pirate-suppression";
  const roll = offerRoll ?? questOfferRoll(voyageSeed, city.cityId, simMinute, policyKind);
  if (!Number.isFinite(roll) || roll < 0 || roll >= 1) throw new Error("Invalid pirate offer roll");
  if (roll >= questOfferPolicy(policyKind).spawnChance) return null;
  const kind = city.isPirateHideout
    ? contractKind ?? (offerHash(`${seed}|kind`) % 2 === 0 ? "revenge" : "smuggling") : "suppression";
  if (!QUEST_KINDS.includes(kind) || (city.isPirateHideout === true) === (kind === "suppression")) {
    throw new Error(`Invalid pirate contract kind: ${kind}`);
  }
  if (simMinute < (memory.nextOfferMinuteByKind[kind] ?? 0)) return null;
  const candidates = kind === "revenge"
    ? merchants.filter(ship => ship.role === "merchant" && !ship.encounter && !ship.commissioned && ship.hitPoints > 0 && ship.captainName &&
      !(ship.graceUntilPortVisit > ship.portVisits) && ship.currentPort?.cityId && !ship.currentPort.isPirateHideout)
      .map(ship => ({ ship, port: ship.currentPort }))
    : kind === "smuggling"
      ? ports.filter(port => !port.isPirateHideout && port.cityId !== city.cityId).map(port => ({ port }))
      : havens.filter(port => !pirateHavenIsRuined(memory, port.cityId, simMinute)).map(port => ({ port }));
  const reachable = candidates.map(candidate => ({ ...candidate, distanceKm: sailingDistanceKm(city, candidate.port) }))
    .filter(candidate => Number.isFinite(candidate.distanceKm) && candidate.distanceKm >= 0 && candidate.distanceKm <= PIRATE_COMMISSION_MAX_DISTANCE_KM)
    .sort((a, b) => a.distanceKm - b.distanceKm || (a.ship?.id || a.port.cityId).localeCompare(b.ship?.id || b.port.cityId));
  if (!reachable.length) return null;
  const target = reachable[0];
  const haven = kind === "suppression" ? target.port : city;
  const id = `pirate-${kind}-${memory.nextQuestId}`;
  if (kind === "smuggling" && typeof contactForPort !== "function") throw new Error("Pirate pickup requires a port contact resolver");
  const contact = kind === "smuggling" ? contactForPort(target.port) : null;
  if (kind === "smuggling" && (!contact?.id || !contact?.name)) throw new Error("Pirate pickup requires its named port merchant");
  return { id, kind, offeredMinute: simMinute, originCityId: city.cityId, originName: city.displayCity || city.city,
    havenCityId: haven.cityId, havenName: haven.displayCity || haven.city,
    distanceKm: Math.round(target.distanceKm), reward: kind === "suppression" ? 5000 : kind === "revenge" ? 2500 : 1800,
    ready: false, ...(kind === "revenge" ? {
      targetShipId: target.ship.id, targetShipSeed: target.ship.seed, targetShipName: target.ship.name || `${target.ship.captainName}’s ${(target.ship.slug || "merchant ship").replaceAll("-", " ")}`,
      targetCaptainName: target.ship.captainName, targetPortName: target.port.displayCity || target.port.city,
      itemId: `${id}-silver-cup`, itemName: "Engraved silver cup"
    } : kind === "smuggling" ? {
      pickupContactId: contact.id, pickupContactName: contact.name,
      pickupCityId: target.port.cityId, pickupName: target.port.displayCity || target.port.city,
      itemId: `${id}-stolen-goods`, itemName: "Chest of stolen goods"
    } : {}) };
}
export function pirateGoodsPickupStatus(memory, cityId, localHour) {
  const quest = memory.smuggling;
  if (!quest || quest.ready || quest.pickupCityId !== cityId) return { present: false, eligible: false };
  if (!Number.isFinite(localHour) || localHour < 0 || localHour >= 24) throw new Error("Pirate goods pickup requires the local hour");
  return { present: true, eligible: localHour >= 20 || localHour < 5 };
}
export function collectPirateGoods(memory, cityId, localHour) {
  if (!pirateGoodsPickupStatus(memory, cityId, localHour).eligible) throw new Error("Stolen goods require a nighttime meeting at the assigned port");
  memory.smuggling.ready = true;
  return memory.smuggling;
}
export function migratePirateHavenMemory(memory) {
  if (memory === undefined) return createPirateHavenMemory();
  const migrated = memory.version === 1 ? { ...structuredClone(memory), version: 2, smuggling: null, nextOfferMinuteByKind: {} } : structuredClone(memory);
  if (memory.version === 1) {
    for (const kind of ["revenge", "suppression"]) if (migrated[kind]) migrated[kind].offeredMinute = 0;
  }
  validatePirateHavenMemory(migrated);
  return migrated;
}
export function acceptPirateHavenQuest(memory, offer) {
  if (!offer || !QUEST_KINDS.includes(offer.kind) || memory[offer.kind] ||
      offer.id !== `pirate-${offer.kind}-${memory.nextQuestId}`) throw new Error("Pirate commission offer is stale");
  const next = { ...memory, [offer.kind]: { ...offer }, nextQuestId: memory.nextQuestId + 1 };
  validatePirateHavenMemory(next);
  memory[offer.kind] = next[offer.kind]; memory.nextQuestId = next.nextQuestId;
  memory.nextOfferMinuteByKind[offer.kind] = offer.offeredMinute + questOfferPolicy("pirate-contract").cooldownMinutes;
}
export function completePirateHavenQuest(state, cityId, kind, simMinute) {
  const memory = state.memory.pirateHavens;
  const quest = memory[kind];
  if (!quest || !quest.ready || quest.originCityId !== cityId ||
      (kind !== "suppression" && pirateHavenIsRuined(memory, cityId, simMinute))) {
    throw new Error(`Pirate ${kind} commission cannot be delivered at ${cityId}`);
  }
  state.doubloons += quest.reward;
  memory[kind] = null;
  return quest;
}
