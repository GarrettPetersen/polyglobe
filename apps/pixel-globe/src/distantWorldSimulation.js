import {
  advanceWorldEconomy,
  nextWorldEconomyEventMinute,
  snapshotWorldEconomy
} from "./economy.js";
import {
  landTradeEventSchedule,
  snapshotLandTradeSystem,
  updateLandTradeEvents
} from "./landTradeSystem.js";
import {
  npcSeaRouteEventSchedule,
  snapshotNpcSeaRouteStrategicSystem,
  updateNpcPirateHideoutPlayerThreat,
  updateNpcSeaRouteEvents
} from "./npcSeaRoutes.js";
import { validateTradeEmbargoMemory } from "./tradeEmbargoes.js";

export function createDistantWorldSimulation({
  systems,
  maintenanceIntervalMinutes
}) {
  validatePortableSystems(systems);
  if (!Number.isFinite(maintenanceIntervalMinutes) || maintenanceIntervalMinutes <= 0) {
    throw new Error(`Invalid distant-world maintenance interval: ${maintenanceIntervalMinutes}`);
  }
  const economy = systems.economy;
  const landTrade = systems.landTrade;
  const npcRoutes = systems.npcRoutes;
  landTrade.economy = economy;
  npcRoutes.economy = economy;
  npcRoutes.fishingGroundIsNavigable = () => true;
  let relations = new Map();
  let sovereignAccess = new Map();
  let foreignPortCalls = [];
  const relationBetween = (a, b) => {
    const value = relations.get(relationKey(a, b));
    if (value === undefined) throw new Error(`Distant diplomacy is missing ${a}/${b}`);
    return value;
  };
  const tradeOpen = (policyId, factionId) => {
    const value = sovereignAccess.get(`${policyId}|${factionId}`);
    if (value === undefined) {
      throw new Error(`Distant sovereign trade access is missing ${policyId}/${factionId}`);
    }
    return value;
  };
  landTrade.relationBetween = relationBetween;
  landTrade.sovereignTradeOpenToFaction = tradeOpen;
  npcRoutes.relationBetween = relationBetween;
  npcRoutes.sovereignTradeOpenToFaction = tradeOpen;
  npcRoutes.onForeignPortCall = (visitorFactionId, hostFactionId, minute) => {
    foreignPortCalls.push({ visitorFactionId, hostFactionId, minute });
  };

  function advance(due, clockMinute, runtime) {
    validateDueEvent(due);
    applyRuntime(runtime);
    const before = snapshots();
    foreignPortCalls = [];
    const protectedNpcShipIds = new Set(runtime.protectedNpcShipIds);
    const strategicShipIds = due.shipIds.filter((id) => (
      id.startsWith("replacement:") || !protectedNpcShipIds.has(id)
    ));
    let changed = false;
    if (due.economy) changed = advanceWorldEconomy(economy, clockMinute) || changed;
    if (due.cartIds.length > 0) {
      changed = updateLandTradeEvents(landTrade, clockMinute, due.cartIds) || changed;
    }
    if (due.maintenance) {
      changed = updateNpcPirateHideoutPlayerThreat(npcRoutes, {
        lat: runtime.player.lat,
        lon: runtime.player.lon,
        clockMinutes: clockMinute
      }) || changed;
      changed = updateNpcSeaRouteEvents(
        npcRoutes,
        clockMinute,
        [],
        { maintenance: true }
      ) || changed;
    }
    if (strategicShipIds.length > 0) {
      changed = updateNpcSeaRouteEvents(
        npcRoutes,
        clockMinute,
        strategicShipIds,
        { maintenance: false }
      ) || changed;
    }
    const after = snapshots();
    const changedParts = distantWorldChangedSnapshotParts(before, after);
    return Object.freeze({
      changed: changed || changedParts.length > 0,
      changedParts,
      before: snapshotsForParts(before, changedParts),
      after: snapshotsForParts(after, changedParts),
      protectedNpcShipIds: Object.freeze([...protectedNpcShipIds]),
      foreignPortCalls: Object.freeze(foreignPortCalls.map((entry) => Object.freeze(entry))),
      schedule: schedule(clockMinute, protectedNpcShipIds)
    });
  }

  function applyRuntime(runtime) {
    validateRuntime(runtime);
    relations = new Map(runtime.relations);
    sovereignAccess = new Map(runtime.sovereignAccess);
    landTrade.foreignSettlementExpulsions = runtime.foreignSettlementExpulsions;
    landTrade.suzeraintyMemory = runtime.suzeraintyMemory;
    npcRoutes.foreignSettlementExpulsions = runtime.foreignSettlementExpulsions;
    npcRoutes.suzeraintyMemory = runtime.suzeraintyMemory;
    npcRoutes.tradeEmbargoes = runtime.tradeEmbargoes;
  }

  function snapshots() {
    return Object.freeze({
      economy: snapshotWorldEconomy(economy),
      landTrade: snapshotLandTradeSystem(landTrade),
      npcRoutes: snapshotNpcSeaRouteStrategicSystem(npcRoutes)
    });
  }

  function schedule(clockMinute, protectedNpcShipIds = new Set()) {
    return Object.freeze({
      economyMinute: nextWorldEconomyEventMinute(economy),
      maintenanceMinute: nextMaintenanceMinute(clockMinute, maintenanceIntervalMinutes),
      ships: npcSeaRouteEventSchedule(npcRoutes).map((event) => (
        protectedNpcShipIds.has(event.id) && event.minute <= clockMinute
          ? Object.freeze({ ...event, minute: clockMinute + 30 })
          : event
      )),
      carts: landTradeEventSchedule(landTrade)
    });
  }

  return Object.freeze({ advance, schedule });
}

export function portableDistantWorldSystems({ economy, landTrade, npcRoutes, fishState }) {
  if (!economy || !landTrade || !npcRoutes || !fishState?.memory?.fish ||
      !fishState?.memory?.whales) {
    throw new Error("Distant-world systems are incomplete");
  }
  return {
    economy,
    landTrade: {
      ...landTrade,
      economy: null,
      relationBetween: null,
      sovereignTradeOpenToFaction: null
    },
    npcRoutes: {
      ...npcRoutes,
      economy: null,
      relationBetween: null,
      sovereignTradeOpenToFaction: null,
      tradeEmbargoes: null,
      onForeignPortCall: null,
      fishingGroundIsNavigable: null,
      fishState: {
        voyageSeed: fishState.voyageSeed,
        memory: { fish: fishState.memory.fish }
      },
      whaleMemory: fishState.memory.whales
    }
  };
}

export function distantWorldSnapshotsEqual(a, b) {
  validateSnapshots(a);
  validateSnapshots(b);
  return distantWorldValuesEqual(a, b);
}

export function distantWorldChangedSnapshotParts(before, after) {
  validateSnapshots(before);
  validateSnapshots(after);
  return Object.freeze(["economy", "landTrade", "npcRoutes"].filter((key) => (
    !distantWorldValuesEqual(before[key], after[key])
  )));
}

export function distantWorldValuesEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

const DISTANT_WORLD_PART_ARRAY_KEYS = Object.freeze({
  economy: "ports",
  landTrade: "carts",
  npcRoutes: "ships"
});

export function createDistantWorldPartComparisonPlan(
  key,
  current,
  baseline,
  { ignoredNpcShipIds = [] } = {}
) {
  const arrayKey = DISTANT_WORLD_PART_ARRAY_KEYS[key];
  if (!arrayKey || !current || !baseline ||
      !Array.isArray(current[arrayKey]) || !Array.isArray(baseline[arrayKey])) {
    throw new Error(`Cannot compare malformed distant-world part: ${key}`);
  }
  if (!Array.isArray(ignoredNpcShipIds) ||
      ignoredNpcShipIds.some((id) => typeof id !== "string" || id === "")) {
    throw new Error("Distant-world comparison requires valid ignored NPC ship ids");
  }
  if (key !== "npcRoutes" && ignoredNpcShipIds.length > 0) {
    throw new Error(`Cannot ignore NPC ships while comparing ${key}`);
  }
  const ignoredIds = new Set(ignoredNpcShipIds);
  const filterEntries = (entries) => key === "npcRoutes"
    ? entries.filter((entry) => !ignoredIds.has(entry.id))
    : entries;
  const currentEntries = filterEntries(current[arrayKey]);
  const baselineEntries = filterEntries(baseline[arrayKey]);
  const currentHeader = { ...current, [arrayKey]: [] };
  const baselineHeader = { ...baseline, [arrayKey]: [] };
  return {
    version: 1,
    key,
    currentEntries,
    baselineEntries,
    entryIndex: 0,
    equal: currentEntries.length === baselineEntries.length &&
      distantWorldValuesEqual(currentHeader, baselineHeader),
    complete: false
  };
}

export function advanceDistantWorldPartComparisonPlan(plan, { maxEntries = 24 } = {}) {
  assertDistantWorldPartComparisonPlan(plan);
  if (!Number.isInteger(maxEntries) || maxEntries <= 0) {
    throw new Error(`Invalid distant-world comparison batch size: ${maxEntries}`);
  }
  if (plan.complete) return Object.freeze({ complete: true, equal: plan.equal });
  if (!plan.equal) {
    plan.complete = true;
    return Object.freeze({ complete: true, equal: false });
  }
  const end = Math.min(plan.currentEntries.length, plan.entryIndex + maxEntries);
  for (; plan.entryIndex < end; plan.entryIndex++) {
    if (!distantWorldValuesEqual(
      plan.currentEntries[plan.entryIndex],
      plan.baselineEntries[plan.entryIndex]
    )) {
      plan.equal = false;
      plan.complete = true;
      return Object.freeze({ complete: true, equal: false });
    }
  }
  plan.complete = plan.entryIndex === plan.currentEntries.length;
  return Object.freeze({ complete: plan.complete, equal: plan.equal });
}

function assertDistantWorldPartComparisonPlan(plan) {
  if (!plan || plan.version !== 1 || !DISTANT_WORLD_PART_ARRAY_KEYS[plan.key] ||
      !Array.isArray(plan.currentEntries) || !Array.isArray(plan.baselineEntries) ||
      !Number.isInteger(plan.entryIndex) || plan.entryIndex < 0 ||
      typeof plan.equal !== "boolean" || typeof plan.complete !== "boolean") {
    throw new Error("Invalid distant-world comparison plan");
  }
}

export function relationKey(a, b) {
  if (typeof a !== "string" || a.length === 0 || typeof b !== "string" || b.length === 0) {
    throw new Error("Distant diplomacy requires two faction ids");
  }
  return a <= b ? `${a}|${b}` : `${b}|${a}`;
}

function nextMaintenanceMinute(clockMinute, interval) {
  if (!Number.isFinite(clockMinute) || clockMinute < 0) {
    throw new Error(`Invalid distant-world clock: ${clockMinute}`);
  }
  return (Math.floor(clockMinute / interval) + 1) * interval;
}

function validatePortableSystems(systems) {
  if (!systems?.economy?.portStates || !(systems.economy.portStates instanceof Map) ||
      !Array.isArray(systems?.landTrade?.carts) ||
      !(systems?.landTrade?.cityByTileId instanceof Map) ||
      !Array.isArray(systems?.npcRoutes?.ships) ||
      !(systems?.npcRoutes?.shipById instanceof Map)) {
    throw new Error("Distant-world worker received malformed systems");
  }
}

function validateRuntime(runtime) {
  if (!runtime || !Array.isArray(runtime.relations) ||
      !Array.isArray(runtime.sovereignAccess) ||
      !Array.isArray(runtime.protectedNpcShipIds) ||
      !runtime.player || !Number.isFinite(runtime.player.lat) ||
      !Number.isFinite(runtime.player.lon) ||
      !runtime.foreignSettlementExpulsions || !runtime.suzeraintyMemory ||
      !runtime.tradeEmbargoes) {
    throw new Error("Distant-world worker received malformed runtime policy state");
  }
  validateTradeEmbargoMemory(runtime.tradeEmbargoes);
}

function validateDueEvent(due) {
  if (!due || typeof due.economy !== "boolean" || typeof due.maintenance !== "boolean" ||
      !Array.isArray(due.shipIds) || !Array.isArray(due.cartIds)) {
    throw new Error("Distant-world simulation requires a due event");
  }
}

function validateSnapshots(value) {
  if (!value?.economy || !value?.landTrade || !value?.npcRoutes) {
    throw new Error("Distant-world comparison requires complete snapshots");
  }
}

function snapshotsForParts(snapshots, parts) {
  return Object.freeze(Object.fromEntries(parts.map((key) => [key, snapshots[key]])));
}
