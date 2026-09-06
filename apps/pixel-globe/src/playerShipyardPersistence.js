// Retain the existing versioned shipyard format, including construction state,
// rather than reconstructing a player's business from its investment flag.
import { restoreWorldShipyards, snapshotWorldShipyards } from "./shipyards.js";

export function snapshotPlayerShipyards(system) {
  // Serialize only the portfolio, not a second copy of every NPC yard.
  const yards = new Map([...system.yards].filter(([, yard]) => yard.playerBacking));
  return snapshotWorldShipyards({ ...system, yards, npcSales: [] });
}

export function playerShipyardSnapshot(snapshot) {
  if (!snapshot || !Number.isInteger(snapshot.version) || !Array.isArray(snapshot.yards)) {
    throw new Error("Player shipyard persistence requires a versioned shipyard snapshot");
  }
  return {
    ...snapshot,
    npcSales: [],
    yards: snapshot.yards.filter((yard) => yard.playerBacking)
  };
}

export function restorePlayerShipyardSnapshot(system, snapshot, {
  seedKey, legacyCityIdForPortReference, expectedCityIds
}) {
  if (!snapshot || !Number.isInteger(snapshot.version) || !Array.isArray(snapshot.yards)) {
    throw new Error("Invalid saved player shipyard snapshot");
  }
  const ids = new Set();
  const resolve = (portId) => {
    if (typeof portId === "string" && portId) return portId;
    if (snapshot.version > 10 || !Number.isInteger(portId) || portId < 0 ||
        typeof legacyCityIdForPortReference !== "function") {
      throw new Error(`Saved player shipyard requires a legacy city resolver: ${portId}`);
    }
    return legacyCityIdForPortReference({ tileId: portId });
  };
  const yards = snapshot.yards.map((yard) => {
    const portId = resolve(yard.portId);
    if (typeof portId !== "string" || !portId || !yard.playerBacking || ids.has(portId)) {
      throw new Error(`Invalid or duplicate saved player shipyard: ${portId}`);
    }
    ids.add(portId);
    return { ...yard, portId, ...(yard.usedListings ? {
      usedListings: yard.usedListings.map((listing) => ({ ...listing, portId: resolve(listing.portId) }))
    } : {}) };
  });
  if (expectedCityIds && (expectedCityIds.length !== ids.size || expectedCityIds.some((id) => !ids.has(id)))) {
    throw new Error("Saved player shipyard books do not match the investment portfolio");
  }
  // Restoring durable books must not replace the separately restored NPC queue.
  // NPC records already use canonical IDs, even when the player books are legacy.
  const npcSales = system.npcSales;
  restoreWorldShipyards(system, { ...snapshot, yards, npcSales: [] }, { seedKey });
  system.npcSales = npcSales;
}
