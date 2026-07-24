import {
  NEUTRAL_FACTION_ID,
  PIRATE_FACTION_ID,
  assertFactionId,
  migrateFactionIdTo1522
} from "./factions.js";
import { gameMinuteForDate } from "./rulers.js";

export const MING_TRADE_POLICY_ID = "ming-maritime-prohibition";
export const JOSEON_TRADE_POLICY_ID = "joseon-licensed-trade";
export const SPANISH_INDIES_TRADE_POLICY_ID = "spanish-indies-monopoly";
export const MING_TRADE_RESTRICTION_END_MINUTE = gameMinuteForDate(1567, 2, 4);

const SPANISH_INDIES_COUNTRIES = Object.freeze([
  "Cuba",
  "Dominican Republic",
  "Mexico",
  "Panama",
  "Puerto Rico"
]);

export const SOVEREIGN_TRADE_ACCESS_POLICIES = Object.freeze([
  tradeAccessPolicy({
    id: MING_TRADE_POLICY_ID,
    label: "Ming maritime prohibition",
    hostFactionId: "ming",
    appliesTo: "Ming ports",
    endMinute: MING_TRADE_RESTRICTION_END_MINUTE,
    defaultGrantedFactionIds: ["joseon"],
    illicitMarketSuccessChance: 0.55,
    illicitMarketReputationPenalty: 8,
    closedMarketText: "The Ming maritime prohibition closes this market to unauthorized foreign cargo.",
    permitLabel: "Ming trade seal",
    permitAuthority: "the Board of Rites",
    permitPetition: "The Board of Rites will consider a memorial for a named foreign captain only when the court's officers know that captain to be trustworthy.",
    permitGrant: "The Board of Rites has entered your name and issued an imperial trade seal. Present it to the maritime customs officers when entering a Ming market.",
    permitPaperDetail: "Named foreign merchant under imperial seal",
    envoyPurpose: "lawful trade with the Ming Empire",
    envoyMemorial: "open Ming markets to our merchants",
    envoyRequest: "leave for our merchants to enter Ming ports under lawful seal, customs, and the emperor's peace",
    envoyGrant: "Ming ports are now open to your nation's lawful trade"
  }),
  tradeAccessPolicy({
    id: JOSEON_TRADE_POLICY_ID,
    label: "Joseon licensed trade",
    hostFactionId: "joseon",
    appliesTo: "Joseon ports",
    defaultGrantedFactionIds: ["japan", "ming"],
    illicitMarketSuccessChance: 0.4,
    illicitMarketReputationPenalty: 9,
    closedMarketText: "Joseon's licensed-port rules close this market to unauthorized foreign cargo.",
    permitLabel: "Joseon trading license",
    permitAuthority: "the royal court",
    permitPetition: "The royal court admits foreign merchants only through appointed ports and licensed registers. A captain of trusted standing may petition to be entered by name.",
    permitGrant: "The royal court has entered your name on the licensed-port register. Joseon's customs officers may now admit your lawful cargo.",
    permitPaperDetail: "Named merchant on the licensed-port register",
    envoyPurpose: "licensed trade with Joseon",
    envoyMemorial: "admit our merchants under Joseon's licensed-port rules",
    envoyRequest: "a fixed allotment of lawful merchant calls under the court's customs officers",
    envoyGrant: "Joseon's licensed ports are now open to your nation's merchants"
  }),
  tradeAccessPolicy({
    id: SPANISH_INDIES_TRADE_POLICY_ID,
    label: "Spanish Indies monopoly",
    hostFactionId: "spain",
    appliesTo: "Spanish American ports",
    portCountries: SPANISH_INDIES_COUNTRIES,
    includeNewWorldAcquisitions: true,
    defaultGrantedFactionIds: [],
    illicitMarketSuccessChance: 0.45,
    illicitMarketReputationPenalty: 8,
    closedMarketText: "The Crown's Indies monopoly closes this colonial market to unlicensed foreign cargo.",
    permitLabel: "Indies trade licencia",
    permitAuthority: "the Casa de Contratación",
    permitPetition: "The Casa de Contratación may petition the Crown for a royal licencia naming a trusted captain as an authorized trader in the Indies.",
    permitGrant: "The Crown has granted you a royal licencia through the Casa de Contratación. Its seal authorizes your cargo at Spanish ports in the Indies.",
    permitPaperDetail: "Royal license for trade in the Spanish Indies",
    envoyPurpose: "a license to trade in the Spanish Indies",
    envoyMemorial: "secure lawful access to Spain's American markets",
    envoyRequest: "a royal license for our merchants to trade at the Crown's ports in the Indies",
    envoyGrant: "the Crown's American ports are now open to your nation's licensed merchants"
  })
]);

const POLICY_BY_ID = new Map(SOVEREIGN_TRADE_ACCESS_POLICIES.map((policy) => [policy.id, policy]));

export function sovereignTradePolicyById(policyId) {
  if (typeof policyId !== "string" || policyId === "") {
    throw new Error(`Invalid sovereign trade policy id: ${policyId}`);
  }
  const policy = POLICY_BY_ID.get(policyId);
  if (!policy) throw new Error(`Unknown sovereign trade policy: ${policyId}`);
  return policy;
}

export function sovereignTradePoliciesForHostFaction(factionId, simMinute = 0) {
  const id = assertFactionId(factionId);
  assertSimulationMinute(simMinute);
  return SOVEREIGN_TRADE_ACCESS_POLICIES.filter((policy) => (
    policy.hostFactionId === id &&
    (policy.endMinute === null || simMinute < policy.endMinute)
  ));
}

export function sovereignTradePolicyForPort(port, simMinute = 0) {
  assertTradePort(port);
  assertSimulationMinute(simMinute);
  const policies = SOVEREIGN_TRADE_ACCESS_POLICIES.filter((policy) => (
    policy.hostFactionId === (port.factionId || NEUTRAL_FACTION_ID) &&
    (policy.endMinute === null || simMinute < policy.endMinute) &&
    policyAppliesToPort(policy, port)
  ));
  if (policies.length > 1) {
    throw new Error(`Port matches multiple sovereign trade policies: ${port.city || port.displayCity}`);
  }
  return policies[0] || null;
}

export function createSovereignTradeGrantMemory() {
  return Object.fromEntries(SOVEREIGN_TRADE_ACCESS_POLICIES.map((policy) => [
    policy.id,
    [...policy.defaultGrantedFactionIds]
  ]));
}

export function createPersonalTradePassMemory() {
  return {};
}

export function migratePersonalTradePassMemory(memory) {
  if (memory === null || memory === undefined) return createPersonalTradePassMemory();
  if (!memory || typeof memory !== "object" || Array.isArray(memory)) {
    throw new Error("Personal trade pass memory must be an object");
  }
  const migrated = {};
  for (const [policyId, pass] of Object.entries(memory)) {
    const policy = sovereignTradePolicyById(policyId);
    if (!pass || typeof pass !== "object" || Array.isArray(pass)) {
      throw new Error(`Invalid personal trade pass: ${policyId}`);
    }
    migrated[policyId] = {
      policyId,
      issuerFactionId: policy.hostFactionId,
      simMinute: pass.simMinute
    };
  }
  validatePersonalTradePassMemory(migrated);
  return migrated;
}

export function validatePersonalTradePassMemory(memory) {
  if (!memory || typeof memory !== "object" || Array.isArray(memory)) {
    throw new Error("Personal trade pass memory must be an object");
  }
  for (const [policyId, pass] of Object.entries(memory)) {
    const policy = sovereignTradePolicyById(policyId);
    if (!pass || typeof pass !== "object" || Array.isArray(pass)) {
      throw new Error(`Invalid personal trade pass: ${policyId}`);
    }
    if (pass.policyId !== policyId) {
      throw new Error(`Personal trade pass policy mismatch: ${policyId}`);
    }
    if (pass.issuerFactionId !== policy.hostFactionId) {
      throw new Error(`Personal trade pass issuer mismatch: ${policyId}`);
    }
    assertSimulationMinute(pass.simMinute);
  }
}

export function personalTradePassGranted(memory, policyId) {
  validatePersonalTradePassMemory(memory);
  sovereignTradePolicyById(policyId);
  return Boolean(memory[policyId]);
}

export function grantPersonalTradePass(memory, policyId, simMinute) {
  validatePersonalTradePassMemory(memory);
  const policy = sovereignTradePolicyById(policyId);
  assertSimulationMinute(simMinute);
  if (memory[policyId]) return false;
  memory[policyId] = {
    policyId,
    issuerFactionId: policy.hostFactionId,
    simMinute
  };
  return true;
}

export function migrateSovereignTradeGrantMemory(memory, legacyMingFactionIds = null) {
  const migrated = createSovereignTradeGrantMemory();
  if (memory !== null && memory !== undefined) {
    if (!memory || typeof memory !== "object" || Array.isArray(memory)) {
      throw new Error("Sovereign trade grant memory must be an object");
    }
    for (const policy of SOVEREIGN_TRADE_ACCESS_POLICIES) {
      if (memory[policy.id] !== undefined) {
        migrated[policy.id] = normalizeForeignGrantFactionIds(policy, memory[policy.id]);
      }
    }
  } else if (legacyMingFactionIds !== null && legacyMingFactionIds !== undefined) {
    migrated[MING_TRADE_POLICY_ID] = normalizeForeignGrantFactionIds(
      sovereignTradePolicyById(MING_TRADE_POLICY_ID),
      legacyMingFactionIds
    );
  }
  validateSovereignTradeGrantMemory(migrated);
  return migrated;
}

export function validateSovereignTradeGrantMemory(memory) {
  if (!memory || typeof memory !== "object" || Array.isArray(memory)) {
    throw new Error("Sovereign trade grant memory must be an object");
  }
  const expectedIds = new Set(SOVEREIGN_TRADE_ACCESS_POLICIES.map((policy) => policy.id));
  for (const policyId of Object.keys(memory)) {
    if (!expectedIds.has(policyId)) throw new Error(`Unknown saved sovereign trade policy: ${policyId}`);
  }
  for (const policy of SOVEREIGN_TRADE_ACCESS_POLICIES) {
    if (!Object.prototype.hasOwnProperty.call(memory, policy.id)) {
      throw new Error(`Missing sovereign trade grant list: ${policy.id}`);
    }
    const normalized = normalizeForeignGrantFactionIds(policy, memory[policy.id]);
    if (normalized.length !== memory[policy.id].length ||
        normalized.some((factionId, index) => factionId !== memory[policy.id][index])) {
      throw new Error(`Sovereign trade grants are not canonical: ${policy.id}`);
    }
  }
}

export function sovereignTradeGrantedToFaction(memory, policyId, factionId) {
  validateSovereignTradeGrantMemory(memory);
  const policy = sovereignTradePolicyById(policyId);
  const id = assertFactionId(factionId);
  return id === policy.hostFactionId || memory[policy.id].includes(id);
}

export function grantSovereignTradeToFaction(memory, policyId, factionId) {
  validateSovereignTradeGrantMemory(memory);
  const policy = sovereignTradePolicyById(policyId);
  const id = assertFactionId(factionId);
  if (id === policy.hostFactionId || id === NEUTRAL_FACTION_ID || id === PIRATE_FACTION_ID) {
    throw new Error(`${policy.label} cannot be granted to faction: ${id}`);
  }
  if (memory[policy.id].includes(id)) return false;
  memory[policy.id].push(id);
  memory[policy.id].sort();
  return true;
}

export function defaultSovereignTradeGrantedToFaction(policyId, factionId) {
  const memory = createSovereignTradeGrantMemory();
  return sovereignTradeGrantedToFaction(memory, policyId, factionId);
}

export function evaluateSovereignTradeAccess({
  port,
  traderFactionId,
  simMinute = 0,
  granted = false,
  illicitAccessPolicyId = null,
  disguisedEntry = false
}) {
  assertTradePort(port);
  const traderId = assertFactionId(traderFactionId || NEUTRAL_FACTION_ID);
  assertSimulationMinute(simMinute);
  if (typeof granted !== "boolean" || typeof disguisedEntry !== "boolean") {
    throw new Error("Sovereign trade access flags must be boolean");
  }
  if (illicitAccessPolicyId !== null && typeof illicitAccessPolicyId !== "string") {
    throw new Error(`Invalid illicit sovereign trade policy: ${illicitAccessPolicyId}`);
  }
  const policy = sovereignTradePolicyForPort(port, simMinute);
  if (!policy) {
    return Object.freeze({
      allowed: true,
      provisioningAllowed: true,
      restricted: false,
      lawful: true,
      illicit: false,
      domesticAccess: false,
      lawfulExemption: false,
      policyId: null,
      policy: null,
      portFactionId: port.factionId || NEUTRAL_FACTION_ID,
      traderFactionId: traderId
    });
  }
  const domesticAccess = traderId === policy.hostFactionId;
  const lawfulExemption = domesticAccess || granted;
  const illicit = !lawfulExemption && (
    illicitAccessPolicyId === policy.id || disguisedEntry
  );
  const allowed = lawfulExemption || illicit;
  return Object.freeze({
    allowed,
    provisioningAllowed: true,
    restricted: true,
    lawful: allowed && !illicit,
    illicit,
    domesticAccess,
    lawfulExemption,
    policyId: policy.id,
    policy,
    portFactionId: port.factionId || NEUTRAL_FACTION_ID,
    traderFactionId: traderId
  });
}

export function resolveSovereignIllicitMarketAttempt(policyId, roll) {
  const policy = sovereignTradePolicyById(policyId);
  if (!Number.isFinite(roll) || roll < 0 || roll >= 1) {
    throw new Error(`Invalid ${policy.label} illicit market roll: ${roll}`);
  }
  return roll < policy.illicitMarketSuccessChance;
}

function tradeAccessPolicy({
  id,
  label,
  hostFactionId,
  appliesTo,
  endMinute = null,
  portCountries = null,
  includeNewWorldAcquisitions = false,
  defaultGrantedFactionIds,
  illicitMarketSuccessChance,
  illicitMarketReputationPenalty,
  closedMarketText,
  permitLabel,
  permitAuthority,
  permitPetition,
  permitGrant,
  permitPaperDetail,
  envoyPurpose,
  envoyMemorial,
  envoyRequest,
  envoyGrant
}) {
  assertFactionId(hostFactionId);
  if (!Array.isArray(defaultGrantedFactionIds)) {
    throw new Error(`Trade access policy needs default grants: ${id}`);
  }
  if (typeof includeNewWorldAcquisitions !== "boolean") {
    throw new Error(`Invalid New World acquisition scope for ${id}`);
  }
  const normalizedDefaults = normalizeForeignGrantFactionIds(
    { id, label, hostFactionId },
    defaultGrantedFactionIds
  );
  if (!Number.isFinite(illicitMarketSuccessChance) ||
      illicitMarketSuccessChance <= 0 || illicitMarketSuccessChance >= 1) {
    throw new Error(`Invalid illicit market chance for ${id}`);
  }
  if (!Number.isInteger(illicitMarketReputationPenalty) || illicitMarketReputationPenalty <= 0) {
    throw new Error(`Invalid illicit market penalty for ${id}`);
  }
  for (const [field, value] of Object.entries({
    permitLabel,
    permitAuthority,
    permitPetition,
    permitGrant,
    permitPaperDetail
  })) {
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error(`Invalid ${field} for ${id}`);
    }
  }
  return Object.freeze({
    id,
    label,
    kind: "access",
    hostFactionId,
    appliesTo,
    endMinute,
    portCountries,
    includeNewWorldAcquisitions,
    defaultGrantedFactionIds: Object.freeze(normalizedDefaults),
    illicitMarketSuccessChance,
    illicitMarketReputationPenalty,
    closedMarketText,
    permitLabel,
    permitAuthority,
    permitPetition,
    permitGrant,
    permitPaperDetail,
    envoyPurpose,
    envoyMemorial,
    envoyRequest,
    envoyGrant
  });
}

function policyAppliesToPort(policy, port) {
  if (policy.portCountries === null) return true;
  if (policy.portCountries.includes(port.country)) return true;
  return policy.includeNewWorldAcquisitions && portIsInNewWorld(port);
}

function portIsInNewWorld(port) {
  const latitudeDeg = Number.isFinite(port.lat) ? port.lat : port.latitudeDeg;
  const longitudeDeg = Number.isFinite(port.lon) ? port.lon : port.longitudeDeg;
  return Number.isFinite(latitudeDeg) &&
    Number.isFinite(longitudeDeg) &&
    latitudeDeg >= -60 &&
    latitudeDeg <= 84 &&
    longitudeDeg >= -170 &&
    longitudeDeg <= -30;
}

function normalizeForeignGrantFactionIds(policy, factionIds) {
  if (!Array.isArray(factionIds)) {
    throw new Error(`Sovereign trade grants must be an array: ${policy.id}`);
  }
  const normalized = [...new Set(factionIds.map((factionId) => (
    migrateFactionIdTo1522(factionId)
  )))].filter((factionId) => (
    factionId !== policy.hostFactionId &&
    factionId !== NEUTRAL_FACTION_ID &&
    factionId !== PIRATE_FACTION_ID
  )).sort();
  return normalized;
}

function assertTradePort(port) {
  if (!port || typeof port !== "object") throw new Error("Sovereign trade access requires a port");
  assertFactionId(port.factionId || NEUTRAL_FACTION_ID);
  if (typeof port.country !== "string" || port.country.trim() === "") {
    throw new Error("Sovereign trade access requires a port country");
  }
}

function assertSimulationMinute(simMinute) {
  if (!Number.isFinite(simMinute) || simMinute < 0) {
    throw new Error(`Invalid sovereign trade access minute: ${simMinute}`);
  }
}
