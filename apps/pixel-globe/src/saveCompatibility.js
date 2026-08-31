import { factionById, migrateFactionIdTo1522 } from "./factions.js";
import { migrateGameState } from "./gameState.js";
import { shipStatsForSlug } from "./shipStats.js";
import { CAMPAIGN_GOAL_FAMILY_DEBT } from "./campaignGoals.js";

export function migrateSavedVoyageCore(payload, {
  legacyCityIdForPortReference = null
} = {}) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Saved voyage payload is missing");
  }
  if (!payload.playerShip || typeof payload.playerShip !== "object") {
    throw new Error("Saved voyage player ship is missing");
  }

  const savedShip = {
    ...structuredClone(payload.playerShip),
    factionId: migrateFactionIdTo1522(payload.playerShip.factionId)
  };
  const shipStats = shipStatsForSlug(savedShip.typeSlug);
  const gameState = migrateGameState(structuredClone(payload.gameState), shipStats, {
    legacyCityIdForPortReference
  });

  factionById(savedShip.factionId);
  if (gameState.ship?.slug !== savedShip.typeSlug) {
    throw new Error(
      `Saved vessel ${savedShip.typeSlug} does not match game-state hull ${gameState.ship?.slug || "missing"}`
    );
  }
  if (gameState.ship.baseCargoCapacity !== shipStats.cargoCapacity) {
    throw new Error("Saved ship capacity does not match its hull");
  }
  if (!Number.isInteger(savedShip.tileId) || savedShip.tileId < 0) {
    throw new Error(`Saved ship tile is invalid: ${savedShip.tileId}`);
  }
  if (!Number.isFinite(savedShip.hitPoints) || savedShip.hitPoints <= 0 ||
      !Number.isFinite(savedShip.maxHitPoints) || savedShip.maxHitPoints < savedShip.hitPoints) {
    throw new Error("Saved player hull is invalid");
  }
  if (Math.hypot(...savedShip.position) < 0.5 || Math.hypot(...savedShip.heading) < 0.5) {
    throw new Error("Saved player navigation vectors are invalid");
  }

  return { savedShip, shipStats, gameState };
}

export function savedVoyageWorldTopology(payload, currentSubdivisions) {
  if (!payload || typeof payload !== "object") throw new Error("Saved voyage payload is missing");
  if (!Number.isInteger(currentSubdivisions) || currentSubdivisions < 0) {
    throw new Error(`Current world subdivision is invalid: ${currentSubdivisions}`);
  }
  const savedSubdivisions = payload.worldSubdivisions === undefined
    ? 7
    : payload.worldSubdivisions;
  if (!Number.isInteger(savedSubdivisions) || savedSubdivisions < 0 ||
      savedSubdivisions > currentSubdivisions) {
    throw new Error(
      `Saved voyage world subdivision ${savedSubdivisions} cannot load into ${currentSubdivisions}`
    );
  }
  return Object.freeze({
    savedSubdivisions,
    currentSubdivisions,
    changed: savedSubdivisions !== currentSubdivisions
  });
}

export function recoverSavedVoyageWorldClock(payload, gameState) {
  if (!payload?.worldClock || !Number.isFinite(payload.worldClock.currentMinute) ||
      !Number.isFinite(payload.worldClock.voyageStartMinute)) {
    throw new Error("Saved voyage world clock is invalid");
  }
  if (payload.worldClock.currentMinute < payload.worldClock.voyageStartMinute) {
    throw new Error(
      `Saved voyage clock predates its start: ` +
      `${payload.worldClock.currentMinute} < ${payload.worldClock.voyageStartMinute}`
    );
  }

  const goal = gameState?.memory?.campaignGoal;
  const debtCheckpointMinute = goal?.type === CAMPAIGN_GOAL_FAMILY_DEBT
    ? goal.lastAccruedMinute
    : null;
  if (debtCheckpointMinute !== null && !Number.isFinite(debtCheckpointMinute)) {
    throw new Error(`Saved family debt checkpoint is invalid: ${debtCheckpointMinute}`);
  }
  const currentMinute = debtCheckpointMinute !== null
    ? Math.max(payload.worldClock.currentMinute, debtCheckpointMinute)
    : payload.worldClock.currentMinute;
  return Object.freeze({
    currentMinute,
    voyageStartMinute: payload.worldClock.voyageStartMinute,
    recoveredDebtClockMinutes: currentMinute - payload.worldClock.currentMinute
  });
}
