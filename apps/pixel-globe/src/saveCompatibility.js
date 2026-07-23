import { factionById, migrateFactionIdTo1522 } from "./factions.js";
import { migrateGameState } from "./gameState.js";
import { shipStatsForSlug } from "./shipStats.js";

export function migrateSavedVoyageCore(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Saved voyage payload is missing");
  }
  if (!payload.playerShip || typeof payload.playerShip !== "object") {
    throw new Error("Saved voyage player ship is missing");
  }

  const savedShip = {
    ...payload.playerShip,
    factionId: migrateFactionIdTo1522(payload.playerShip.factionId)
  };
  const shipStats = shipStatsForSlug(savedShip.typeSlug);
  const gameState = migrateGameState(payload.gameState, shipStats);

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
