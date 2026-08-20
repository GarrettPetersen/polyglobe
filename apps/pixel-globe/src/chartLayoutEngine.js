import { planChartSettlementTowardTargets } from "./chartReframe.js";

const CHART_REBUILD_REASON_KEYS = Object.freeze([
  "missingChart",
  "concealedRepair",
  "viewportCoverage",
  "missingCenter",
  "projectionTravel"
]);

export function planChartLayoutTransaction({
  positions,
  tileIds,
  appliedTileIds = tileIds,
  neighborsById,
  surfaceMaskById,
  referencePositionsForIds,
  topologyIncludesId = (id) => positions.has(id),
  targetPositionsById = null,
  excludedTargetIds = null,
  maximumStepPx = 1,
  maximumStepPxById = null,
  landSlackPx = 3,
  waterSlackPx = 6,
  incrementalRepair = false
}) {
  if (!(positions instanceof Map) || !(tileIds instanceof Set) ||
      !(appliedTileIds instanceof Set)) {
    throw new Error("Chart layout transaction requires positions and tile ids");
  }
  if (!Array.isArray(neighborsById) || !(surfaceMaskById instanceof Uint8Array)) {
    throw new Error("Chart layout transaction requires topology and surface classes");
  }
  if (typeof referencePositionsForIds !== "function") {
    throw new Error("Chart layout transaction requires a reference-position provider");
  }
  if (typeof topologyIncludesId !== "function") {
    throw new Error("Chart layout transaction requires a topology inclusion predicate");
  }
  if (targetPositionsById !== null && !(targetPositionsById instanceof Map)) {
    throw new Error("Chart layout transaction targets must be a map");
  }
  if (excludedTargetIds !== null && !(excludedTargetIds instanceof Set)) {
    throw new Error("Chart layout transaction excluded targets must be a set");
  }

  const topologyIds = new Set(tileIds);
  for (const id of tileIds) {
    const neighbors = neighborsById[id];
    if (!Array.isArray(neighbors)) {
      throw new Error(`Chart layout transaction is missing neighbors for tile ${id}`);
    }
    for (const neighborId of neighbors) {
      if (positions.has(neighborId) && topologyIncludesId(neighborId)) {
        topologyIds.add(neighborId);
      }
    }
  }
  const referencePositions = referencePositionsForIds(topologyIds);
  if (!(referencePositions instanceof Map)) {
    throw new Error("Chart layout reference-position provider must return a map");
  }
  assertFiniteChartPositions(
    referencePositions,
    new Set(referencePositions.keys()),
    "reference"
  );

  const suppliedTargets = targetPositionsById ?? referencePositions;
  const targetsById = new Map();
  for (const id of tileIds) {
    if (excludedTargetIds?.has(id)) continue;
    const target = suppliedTargets.get(id);
    if (!target) continue;
    assertFiniteChartPoint(target, `Chart layout target for tile ${id}`);
    targetsById.set(id, target);
  }
  const settlement = planChartSettlementTowardTargets({
    positions,
    targetsById,
    tileIds,
    appliedTileIds,
    maximumStepPx,
    maximumStepPxById,
    referencePositions,
    neighborsById,
    surfaceMaskById,
    landSlackPx,
    waterSlackPx,
    incrementalRepair
  });
  return Object.freeze({ ...settlement, targetsById, referencePositions });
}

export function createCoveredChartRepairQueue() {
  const pending = new Map();
  return Object.freeze({
    get size() {
      return pending.size;
    },
    clear() {
      pending.clear();
    },
    has(tileId) {
      return pending.has(tileId);
    },
    stage(positions, reason) {
      if (!(positions instanceof Map)) {
        throw new Error("Covered chart repair staging requires positions as a map");
      }
      if (typeof reason !== "string" || reason.length === 0) {
        throw new Error("Covered chart repair staging requires a reason");
      }
      for (const [id, position] of positions) {
        if (pending.has(id)) {
          throw new Error(`Covered chart repair tile ${id} is already staged`);
        }
        assertFiniteChartPoint(position, `Covered chart repair tile ${id}`);
        pending.set(id, Object.freeze({
          position: Object.freeze({ x: position.x, y: position.y }),
          reason
        }));
      }
      return positions.size;
    },
    collectApplicable({ positions, remainsCovered, overlapsViewport }) {
      if (!(positions instanceof Map)) {
        throw new Error("Covered chart repair collection requires current positions");
      }
      if (typeof remainsCovered !== "function" || typeof overlapsViewport !== "function") {
        throw new Error("Covered chart repair collection requires visibility predicates");
      }
      const applicable = new Map();
      for (const [id, repair] of pending) {
        const current = positions.get(id);
        if (!current) {
          pending.delete(id);
          continue;
        }
        if (remainsCovered(current, repair.reason) || !overlapsViewport(current)) {
          applicable.set(id, repair);
        } else {
          pending.delete(id);
        }
      }
      return applicable;
    },
    apply(positions, applicable) {
      if (!(positions instanceof Map) || !(applicable instanceof Map)) {
        throw new Error("Covered chart repair application requires position maps");
      }
      for (const [id, repair] of applicable) {
        const pendingRepair = pending.get(id);
        if (pendingRepair !== repair) {
          throw new Error(`Covered chart repair tile ${id} is not the staged transaction`);
        }
        positions.set(id, {
          x: repair.position.x,
          y: repair.position.y
        });
        pending.delete(id);
      }
      return applicable.size;
    }
  });
}

export function chartRebuildRequest(flags) {
  if (!flags || typeof flags !== "object") {
    throw new Error("Chart rebuild request requires reason flags");
  }
  const reasons = {};
  let required = false;
  for (const key of CHART_REBUILD_REASON_KEYS) {
    if (typeof flags[key] !== "boolean") {
      throw new Error(`Chart rebuild reason ${key} must be boolean`);
    }
    reasons[key] = flags[key];
    required ||= flags[key];
  }
  return Object.freeze({ required, reasons: Object.freeze(reasons) });
}

export function createChartRebuildTracker() {
  const counts = Object.fromEntries(CHART_REBUILD_REASON_KEYS.map((key) => [key, 0]));
  return Object.freeze({
    record(request) {
      if (!request?.required || !request.reasons) {
        throw new Error("Chart rebuild tracker requires an active request");
      }
      for (const key of CHART_REBUILD_REASON_KEYS) {
        if (request.reasons[key]) counts[key]++;
      }
    },
    snapshot() {
      return Object.freeze({ ...counts });
    }
  });
}

function assertFiniteChartPositions(positions, requiredIds, label) {
  for (const id of requiredIds) {
    const position = positions.get(id);
    if (!position) throw new Error(`Chart layout ${label} is missing tile ${id}`);
    assertFiniteChartPoint(position, `Chart layout ${label} for tile ${id}`);
  }
}

function assertFiniteChartPoint(point, label) {
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new Error(`${label} requires finite x/y coordinates`);
  }
}
