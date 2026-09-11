import { assertFactionId } from "./factions.js";
import { cityPopulationProfile, cityPopulationProfileId, cityCombatProfileForAppearance, cityCrewTypeForAppearance } from "../city-visualizer/cityPeople.js";
import { portAssaultUnitProfile, portAssaultGarrisonCount, PORT_ASSAULT_MAX_GARRISON } from "./portAssaultBattle.js";

// Use the authored local garrison pool, never the recruitable crew pool. Elite
// cavalry can serve the sovereign without becoming ordinary inn recruits.
export function strongestCommissionAppearance(city) {
  const pool = cityPopulationProfile(city.populationProfileId || cityPopulationProfileId(city)).garrison;
  const score = ({ appearanceId }) => {
    const stats = portAssaultUnitProfile(cityCombatProfileForAppearance(appearanceId));
    return stats.attack * stats.hitPoints * (1 + stats.defense / 10) / stats.cooldownMs;
  };
  if (!pool.length) throw new Error(`Commission origin has no soldiers: ${city.cityId}`);
  return [...pool].sort((a, b) => score(b) - score(a) || a.appearanceId.localeCompare(b.appearanceId))[0].appearanceId;
}

export function createCaptureCommissionTroops(quest, origin, target, roll) {
  if (quest.petitioned) return null;
  if (!Number.isFinite(roll) || roll < 0 || roll >= 1) throw new Error("Invalid commission troop roll");
  const strength = portAssaultGarrisonCount(target) / PORT_ASSAULT_MAX_GARRISON;
  const chance = 0.15 + 0.65 * strength;
  if (roll >= chance) return null;
  const count = 3 + Math.min(3, Math.floor(strength * 4));
  const appearanceId = strongestCommissionAppearance(origin);
  return Array.from({ length: count }, (_, index) => ({
    id: `${quest.id}:soldier:${index + 1}`,
    appearanceId,
    crewTypeId: cityCrewTypeForAppearance(appearanceId),
    alive: true
  }));
}

export function validateCaptureCommissionTroops(quest) {
  if (quest?.commissionTroops === undefined || quest.commissionTroops === null) return;
  const troops = quest.commissionTroops;
  if (!['capture-port', 'capture-capital'].includes(quest.kind) || quest.petitioned ||
      !Array.isArray(troops) || troops.length < 3 || troops.length > 6) {
    throw new Error(`Invalid commissioned company: ${quest.id}`);
  }
  const ids = new Set();
  for (const troop of troops) {
    if (typeof troop.id !== 'string' || !troop.id.startsWith(`${quest.id}:soldier:`) || ids.has(troop.id) ||
        typeof troop.alive !== 'boolean' || cityCrewTypeForAppearance(troop.appearanceId) !== troop.crewTypeId) {
      throw new Error(`Invalid commissioned soldier: ${troop.id}`);
    }
    cityCombatProfileForAppearance(troop.appearanceId);
    ids.add(troop.id);
  }
}

export function captureCommissionTroopsAboard(quest) {
  validateCaptureCommissionTroops(quest);
  return quest?.stage === 'capture' ? (quest.commissionTroops || []).filter(troop => troop.alive) : [];
}

export function captureCommissionTroopsForAssault(quest, cityId) {
  return quest?.targetCityId === cityId ? captureCommissionTroopsAboard(quest) : [];
}

// Accept the complete auxiliary loss list, but touch only this company's IDs.
// Keeping the original roster makes repeated application idempotent.
export function recordCaptureCommissionTroopLosses(quest, casualtyIds) {
  validateCaptureCommissionTroops(quest);
  const dead = new Set(casualtyIds);
  for (const troop of quest?.commissionTroops || []) if (dead.has(troop.id)) troop.alive = false;
}

export function captureCommissionTroopOfferText(quest) {
  const count = captureCommissionTroopsAboard(quest).length;
  return count ? `The crown places ${count} of its finest soldiers under your command. They will sail as passengers and fight at ${quest.targetName} alone; after the victory they will remain as its garrison.` : '';
}

export function stationCaptureCommissionTroops(quests, cityId, factionId) {
  const quest = quests.captureActive;
  const troops = captureCommissionTroopsForAssault(quest, cityId);
  if (troops.length) {
    quests.commissionGarrisons[cityId] = { factionId, troops };
  }
  // Transfer ownership of the roster; there is no second copy aboard the ship.
  if (quest?.targetCityId === cityId) quest.commissionTroops = null;
}

export function commissionGarrisonTroops(quests, city) {
  const garrison = quests.commissionGarrisons[city.cityId];
  return garrison?.factionId === city.factionId ? garrison.troops : [];
}

export function recordCommissionGarrisonLosses(quests, city, casualtyIds) {
  const troops = commissionGarrisonTroops(quests, city);
  if (!troops.length) return;
  const dead = new Set(casualtyIds);
  quests.commissionGarrisons[city.cityId].troops = troops.filter(troop => !dead.has(troop.id));
  if (!quests.commissionGarrisons[city.cityId].troops.length) delete quests.commissionGarrisons[city.cityId];
}

export function validateCommissionGarrisons(quests) {
  const garrisons = quests.commissionGarrisons;
  if (!garrisons || typeof garrisons !== 'object' || Array.isArray(garrisons)) {
    throw new Error('Commission garrisons require a city index');
  }
  const ids = new Set();
  for (const [cityId, garrison] of Object.entries(garrisons)) {
    if (!cityId || typeof garrison.factionId !== 'string' || !Array.isArray(garrison.troops)) {
      throw new Error(`Invalid commissioned garrison: ${cityId}`);
    }
    assertFactionId(garrison.factionId);
    for (const troop of garrison.troops) {
      if (typeof troop.id !== 'string' || !troop.id || ids.has(troop.id) || troop.alive !== true ||
          cityCrewTypeForAppearance(troop.appearanceId) !== troop.crewTypeId) {
        throw new Error(`Invalid garrison soldier: ${cityId}/${troop.id}`);
      }
      ids.add(troop.id);
    }
  }
}

export function reconcileCommissionGarrisons(quests, cities) {
  if (!Object.keys(quests.commissionGarrisons).length) return;
  const byId = new Map(cities.map(city => [city.cityId, city]));
  for (const [cityId, garrison] of Object.entries(quests.commissionGarrisons)) {
    const city = byId.get(cityId);
    if (!city) throw new Error(`Commission garrison city does not resolve: ${cityId}`);
    if (city.factionId !== garrison.factionId) delete quests.commissionGarrisons[cityId];
  }
}
