import assert from "node:assert/strict";
import test from "node:test";
import {
  distantWorldSnapshotsEqual,
  portableDistantWorldSystems,
  relationKey
} from "./distantWorldSimulation.js";

test("distant diplomacy keys are symmetric", () => {
  assert.equal(relationKey("ming", "japan"), relationKey("japan", "ming"));
});

test("distant system transfer removes browser callbacks without mutating originals", () => {
  const callback = () => true;
  const economy = { portStates: new Map() };
  const landTrade = {
    carts: [],
    economy,
    relationBetween: callback,
    sovereignTradeOpenToFaction: callback
  };
  const npcRoutes = {
    ships: [],
    shipById: new Map(),
    economy,
    relationBetween: callback,
    sovereignTradeOpenToFaction: callback,
    onForeignPortCall: callback,
    fishingGroundIsNavigable: callback
  };
  const portable = portableDistantWorldSystems({
    economy,
    landTrade,
    npcRoutes,
    fishState: {
      voyageSeed: "voyage",
      memory: { fish: { fisheries: {} }, whales: { individuals: [] } }
    }
  });
  assert.equal(portable.landTrade.relationBetween, null);
  assert.equal(portable.npcRoutes.onForeignPortCall, null);
  assert.equal(landTrade.relationBetween, callback);
  assert.doesNotThrow(() => structuredClone(portable));
});

test("distant snapshot equality notices live state conflicts", () => {
  const a = {
    economy: { lastMinute: 1 },
    landTrade: { carts: [{ id: "a" }] },
    npcRoutes: { ships: [{ id: "b", hitPoints: 2 }] }
  };
  assert.equal(distantWorldSnapshotsEqual(a, structuredClone(a)), true);
  const changed = structuredClone(a);
  changed.npcRoutes.ships[0].hitPoints = 1;
  assert.equal(distantWorldSnapshotsEqual(a, changed), false);
});
