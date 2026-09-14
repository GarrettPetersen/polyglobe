import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { prepareDesktopVoyageStorage, FULL_VOYAGE_STORAGE_KEY as FULL, DEMO_VOYAGE_STORAGE_KEY as DEMO } from "./desktopVoyageStorage.js";
import { gameStorage, profileStorage, setVoyageStorageKey, setGameStorageMutationHandler } from "./gameStorage.js";
import { deserializeLocalSave } from "./localSave.js";
import { hydratePlatformCloudStorage, serializeCloudEnvelope } from "./platformServices.js";

const frozen = JSON.parse(readFileSync(new URL("./test-fixtures/saves/dense-local-save-v2-game-state-v113.json", import.meta.url), "utf8"));
function voyage(scope) {
  const save = deserializeLocalSave(JSON.stringify(frozen));
  delete save.payload.demoVoyageScope;
  if (scope) save.payload.demoVoyageScope = scope;
  return JSON.stringify({ ...save, encoding: "json" });
}
function storage(entries = {}) {
  const values = new Map(Object.entries(entries));
  return { getItem: k => values.get(k) ?? null, setItem: (k,v) => values.set(k,String(v)), removeItem: k => values.delete(k) };
}

test("a full voyage anywhere in the world is never imported into the demo", () => {
  const full = voyage();
  const store = storage({ [FULL]: full });
  assert.equal(prepareDesktopVoyageStorage(store, "demo"), false);
  assert.equal(store.getItem(DEMO), null);
  assert.equal(store.getItem(FULL), full);
});

test("legacy demo voyages migrate once and full-game continuation preserves both histories", () => {
  for (const scope of ["mediterranean", "worldwide-grandfathered"]) {
    const demo = voyage(scope);
    const store = storage({ [FULL]: demo });
    assert.equal(prepareDesktopVoyageStorage(store, "demo"), true);
    assert.equal(store.getItem(DEMO), demo);
    const full = voyage();
    store.setItem(FULL, full);
    assert.equal(prepareDesktopVoyageStorage(store, "demo"), false);
    assert.equal(store.getItem(DEMO), demo);
    assert.equal(prepareDesktopVoyageStorage(store, "full"), false);
    assert.equal(store.getItem(FULL), full);
  }
});

test("first full-game launch copies demo progress only if no full voyage exists", () => {
  const demo = voyage("mediterranean");
  const store = storage({ [DEMO]: demo });
  assert.equal(prepareDesktopVoyageStorage(store, "full"), true);
  assert.equal(store.getItem(FULL), demo);
  assert.equal(store.getItem(DEMO), demo);
  assert.equal(prepareDesktopVoyageStorage(store, "full"), false);
});

test("both voyage slots survive cloud round trips and demo writes/deletions cannot touch full saves", async () => {
  const full = voyage();
  const demo = voyage("mediterranean");
  const originalLocalStorage = globalThis.localStorage;
  globalThis.localStorage = storage({ [FULL]: full, [DEMO]: demo });
  const mutations = [];
  try {
    setGameStorageMutationHandler(key => mutations.push(key));
    setVoyageStorageKey(DEMO);
    assert.equal(gameStorage.getItem(FULL), demo);
    gameStorage.setItem(FULL, demo);
    assert.equal(profileStorage.getItem(FULL), full);
    const destination = storage();
    await hydratePlatformCloudStorage(destination, { readCloudFile: async () => serializeCloudEnvelope(profileStorage, 1234) });
    assert.equal(destination.getItem(FULL), full);
    assert.equal(destination.getItem(DEMO), demo);
    gameStorage.removeItem(FULL);
    assert.equal(profileStorage.getItem(FULL), full);
    assert.equal(profileStorage.getItem(DEMO), null);
    assert.deepEqual(mutations, [DEMO, DEMO]);
  } finally {
    setVoyageStorageKey(FULL);
    setGameStorageMutationHandler(null);
    if (originalLocalStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = originalLocalStorage;
  }
});

test("invalid legacy data fails before copying or modifying either voyage", () => {
  const store = storage({ [FULL]: "broken" });
  assert.throws(() => prepareDesktopVoyageStorage(store, "demo"));
  assert.equal(store.getItem(FULL), "broken");
  assert.equal(store.getItem(DEMO), null);
});
