import { factionById, migrateFactionIdTo1522 } from "./factions.js";
import { migrateGameState } from "./gameState.js";
import { shipStatsForSlug } from "./shipStats.js";
import { CAMPAIGN_GOAL_FAMILY_DEBT } from "./campaignGoals.js";
import { repairSavedWhaleClock } from "./whaleSystem.js";
import { indexEntitiesById } from "./entityIds.js";

export function createLegacyCityReferenceResolver(cities, tileMigration = null) {
  if (!Array.isArray(cities)) throw new Error("Legacy home-port catalog must be an array");
  const byId = indexEntitiesById(cities, { idField: "cityId" });
  if (tileMigration !== null && !(tileMigration instanceof Map)) throw new Error("Legacy home-port migration requires a tile map");
  const normalize = value => typeof value === "string" ? value.normalize("NFC").trim().toLowerCase() : "";
  return ({ tileId, name, country }) => {
    if (!Number.isInteger(tileId) || tileId < 0 ||
        (name != null && typeof name !== "string") ||
        (country != null && typeof country !== "string")) {
      throw new Error("Legacy city reference requires a tile ID and optional name and country strings");
    }
    const currentTileId = tileMigration?.get(tileId) ?? tileId;
    const tileMatches = cities.filter(city => city.tileId === currentTileId);
    // Authored redirections (for example old Exeter to Topsham) take precedence.
    if (tileMigration?.has(tileId) && tileMatches.length === 1) return tileMatches[0].cityId;
    const oldName = normalize(name);
    const oldCountry = normalize(country);
    if (oldName) {
      // Names were identity in these released saves. Resolve them once at the
      // load boundary; never infer a different hometown from a nearby tile.
      const oldId = `${oldName}|${oldCountry}`;
      if (oldCountry && byId.has(oldId)) return oldId;
      const named = cities.filter(city => (!oldCountry || normalize(city.country) === oldCountry) &&
        [city.city, city.displayCity, city.portAlias].some(label => normalize(label) === oldName));
      if (named.length === 1) return named[0].cityId;
      if (named.length > 1) throw new Error(`Ambiguous saved home port: ${name}, ${country}: ${named.map(city => city.cityId).join(", ")}`);
    }
    if (tileMatches.length !== 1) throw new Error(`Saved home-port tile ${tileId} resolves to ${tileMatches.length} canonical cities; name=${name}; country=${country}`);
    return tileMatches[0].cityId;
  };
}

export function migrateSavedVoyageCore(payload, {
  legacyCityIdForPortReference = null,
  crewMigrationContextForHomePort = null
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
    legacyCityIdForPortReference,
    crewMigrationContextForHomePort
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

  // One candidate owns both its domain state and calendar. Callers must not
  // prepare restored systems against the outgoing voyage or a raw stale clock.
  const worldClock = recoverSavedVoyageWorldClock(payload, gameState);
  const recoveredWhaleClockMinutes = repairSavedWhaleClock(gameState.memory.whales, worldClock.currentMinute);
  return Object.freeze({ savedShip, shipStats, gameState, worldClock, recoveredWhaleClockMinutes });
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
      !Number.isFinite(payload.worldClock.voyageStartMinute) ||
      payload.worldClock.currentMinute < 0 || payload.worldClock.voyageStartMinute < 0) {
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
