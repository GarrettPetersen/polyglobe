import { PIRATE_FACTION_ID } from "./factions.js";

const PIRATE_HIDEOUT_NAMES = Object.freeze([
  "Black Gull Cove",
  "Lanternless Quay",
  "Crooked Mast Haven",
  "Dead Reckoning Anchorage",
  "Smuggler's Rest",
  "Cutlass Cove",
  "Noosewater",
  "Red Lantern Haven",
  "Broken Compass Quay",
  "Whispering Shoal",
  "Powder Key",
  "False Flag Anchorage",
  "Gallows Nest",
  "The King's Misfortune"
]);

export function buildPlayerPirateHideoutPorts(hideouts) {
  if (!Array.isArray(hideouts)) throw new Error("Pirate hideout ports require a hideout list");
  return [...hideouts]
    .sort((a, b) => a.tileId - b.tileId)
    .map((port, index) => playerPirateHideoutPort(port, PIRATE_HIDEOUT_NAMES[index % PIRATE_HIDEOUT_NAMES.length]));
}

function playerPirateHideoutPort(port, portAlias) {
  if (!port || !Number.isInteger(port.tileId)) throw new Error("Pirate hideout requires a valid port tile");
  return Object.freeze({
    ...port,
    portId: `pirate-hideout-${port.tileId}`,
    portAlias,
    originalFactionId: port.factionId,
    factionId: PIRATE_FACTION_ID,
    isPirateHideout: true,
    settlementType: "village",
    population: 1200,
    isFactionCapital: false,
    capitalOfFactionId: null,
    playerHomeExcluded: true
  });
}
