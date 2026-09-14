import { deserializeLocalSave } from "./localSave.js";
import { DEMO_VOYAGE_SCOPE_MEDITERRANEAN, DEMO_VOYAGE_SCOPE_WORLDWIDE,
  LAST_WORLDWIDE_DEMO_GAME_STATE_VERSION } from "./demoVoyage.js";

export const FULL_VOYAGE_STORAGE_KEY = "marque-and-reprisal.save";
export const DEMO_VOYAGE_STORAGE_KEY = "marque-and-reprisal.demo-save";

// The original shared slot remains the full game's slot. Never relocate a full
// voyage into demo waters or let playing a demo overwrite that voyage.
// Returns whether the profile changed. Initialization is durable even when a
// slot is empty: New Game or death must not import the old voyage again.
export function prepareDesktopVoyageStorage(storage, edition) {
  if (edition !== "full" && edition !== "demo") throw new Error(`Invalid desktop save edition: ${edition}`);
  const destination = edition === "demo" ? DEMO_VOYAGE_STORAGE_KEY : FULL_VOYAGE_STORAGE_KEY;
  const initializedKey = `${destination}.initialized`;
  const initialized = storage.getItem(initializedKey);
  if (initialized === "1") return false;
  if (initialized !== null) throw new Error(`Invalid voyage slot initialization: ${edition}`);
  if (storage.getItem(destination) === null) {
    const source = storage.getItem(edition === "demo" ? FULL_VOYAGE_STORAGE_KEY : DEMO_VOYAGE_STORAGE_KEY);
    if (source !== null && canImportVoyage(source, edition)) storage.setItem(destination, source);
  }
  storage.setItem(initializedKey, "1");
  return true;
}

function canImportVoyage(serialized, edition) {
  const { payload } = deserializeLocalSave(serialized);
  if (edition === "full") return true;
  const scope = payload.demoVoyageScope;
  if (scope !== undefined && scope !== DEMO_VOYAGE_SCOPE_MEDITERRANEAN && scope !== DEMO_VOYAGE_SCOPE_WORLDWIDE) {
    throw new Error(`Invalid legacy demo voyage scope: ${scope}`);
  }
  return scope !== undefined || payload.gameState.version <= LAST_WORLDWIDE_DEMO_GAME_STATE_VERSION;
}
