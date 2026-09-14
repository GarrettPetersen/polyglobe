import { deserializeLocalSave } from "./localSave.js";
import { DEMO_VOYAGE_SCOPE_MEDITERRANEAN, DEMO_VOYAGE_SCOPE_WORLDWIDE,
  LAST_WORLDWIDE_DEMO_GAME_STATE_VERSION } from "./demoVoyage.js";

export const FULL_VOYAGE_STORAGE_KEY = "marque-and-reprisal.save";
export const DEMO_VOYAGE_STORAGE_KEY = "marque-and-reprisal.demo-save";

// The original shared slot remains the full game's slot. Never relocate a full
// voyage into demo waters or let playing a demo overwrite that voyage.
export function prepareDesktopVoyageStorage(storage, edition) {
  if (edition !== "full" && edition !== "demo") throw new Error(`Invalid desktop save edition: ${edition}`);
  const destination = edition === "demo" ? DEMO_VOYAGE_STORAGE_KEY : FULL_VOYAGE_STORAGE_KEY;
  if (storage.getItem(destination) !== null) return false;
  const source = storage.getItem(edition === "demo" ? FULL_VOYAGE_STORAGE_KEY : DEMO_VOYAGE_STORAGE_KEY);
  if (source === null) return false;
  const { payload } = deserializeLocalSave(source);
  if (edition === "demo") {
    const scope = payload.demoVoyageScope;
    const legacyWorldwideDemo = scope === undefined &&
      payload.gameState.version <= LAST_WORLDWIDE_DEMO_GAME_STATE_VERSION;
    if (scope !== DEMO_VOYAGE_SCOPE_MEDITERRANEAN && scope !== DEMO_VOYAGE_SCOPE_WORLDWIDE &&
        !legacyWorldwideDemo) return false;
  }
  storage.setItem(destination, source);
  return true;
}
