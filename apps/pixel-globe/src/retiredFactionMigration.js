import { RETIRED_FACTION_SUCCESSORS_1522 } from "./factions.js";

export function isRetiredFactionId(factionId) {
  return Object.hasOwn(RETIRED_FACTION_SUCCESSORS_1522, factionId);
}

export function withoutRetiredFactionKeys(table) {
  if (!table || typeof table !== "object" || Array.isArray(table)) return table;
  return Object.fromEntries(Object.entries(table).filter(([id]) => !isRetiredFactionId(id)));
}

export function migrateRetiredFactionReferences(value) {
  if (typeof value === "string" && isRetiredFactionId(value)) return RETIRED_FACTION_SUCCESSORS_1522[value];
  if (Array.isArray(value)) return value.map(migrateRetiredFactionReferences);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, migrateRetiredFactionReferences(entry)]));
}

// Version 102 removes the fictional maritime Kazan state. Ownership and people
// become independent; unrelated conquests, money, culture and voyage history
// survive. Sovereign offices cannot be transferred to the neutral collective.
export function migrateRetiredSovereignState(state) {
  const migrated = migrateRetiredFactionReferences(state);
  if (state.relations.diplomacy) {
    // Its migrator removes retired pair keys and their events together.
    migrated.relations.diplomacy = state.relations.diplomacy;
  }
  const authority = state.relations.authority;
  if (authority) migrated.relations.authority.history = authority.history
    .filter((event) => !isRetiredFactionId(event.subjectId));
  const courts = state.relations.courts;
  if (courts?.pendingMatter && [courts.pendingMatter.authorityFactionId,
    courts.pendingMatter.targetFactionId, courts.pendingMatter.secondaryFactionId].some(isRetiredFactionId)) {
    migrated.relations.courts.pendingMatter = null;
  }
  const embargoes = migrated.relations.tradeEmbargoes;
  if (embargoes) {
    const retiredOrderIds = new Set();
    embargoes.orders = embargoes.orders.filter((order, index) => {
      const original = state.relations.tradeEmbargoes.orders[index];
      // An abolished sovereign has no successor office in the neutral collective.
      if (isRetiredFactionId(original.issuerFactionId) || order.issuerFactionId === order.targetFactionId) {
        retiredOrderIds.add(order.id);
        return false;
      }
      order.followerFactionIds = original.followerFactionIds.filter((id) => !isRetiredFactionId(id));
      if (isRetiredFactionId(original.targetFactionId) && order.liftedMinute === null) {
        order.liftedMinute = Math.max(order.imposedMinute, embargoes.lastUpdateMinute);
      }
      return true;
    });
    embargoes.history = embargoes.history.flatMap((event, index) => {
      const original = state.relations.tradeEmbargoes.history[index];
      if (isRetiredFactionId(original.issuerFactionId) || retiredOrderIds.has(event.orderId)) return [];
      return [{ ...event, followerFactionIds: original.followerFactionIds.filter((id) => !isRetiredFactionId(id)) }];
    });
    const enforcement = migrated.memory?.tradeEmbargoEnforcement;
    if (enforcement) enforcement.incidents = enforcement.incidents.filter((incident, index) => (
      !retiredOrderIds.has(incident.orderId) &&
      !isRetiredFactionId(state.memory.tradeEmbargoEnforcement.incidents[index].enforcingFactionId)
    ));
  }
  // Let conquest migration see original sovereign IDs so it can remove offices
  // while preserving ownership and capture records under their successors.
  if (state.memory?.conquest) migrated.memory.conquest = state.memory.conquest;
  return migrated;
}
