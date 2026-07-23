import assert from "node:assert/strict";
import test from "node:test";

import { restoreOrRecreateDerivedSaveState } from "./derivedSaveRecovery.js";

test("compatible derived save data restores without rebuilding", () => {
  let recreations = 0;
  const current = { ships: [] };
  const result = restoreOrRecreateDerivedSaveState({
    label: "test routes",
    current,
    recreate() {
      recreations++;
      return { ships: [] };
    },
    restore(state) {
      state.ships.push("saved-ship");
    }
  });

  assert.equal(recreations, 0);
  assert.equal(result.recovered, false);
  assert.equal(result.error, null);
  assert.equal(result.value, current);
  assert.deepEqual(result.value, { ships: ["saved-ship"] });
});

test("incompatible derived data is discarded without touching player state", () => {
  let recreations = 0;
  const playerState = { doubloons: 1234, discoveries: ["fuji"] };
  const result = restoreOrRecreateDerivedSaveState({
    label: "test routes",
    current: { generation: 1, ships: [] },
    recreate() {
      recreations++;
      return { generation: 2, ships: [] };
    },
    restore(state) {
      state.ships.push("partially-restored");
      throw new Error("old route topology");
    }
  });

  assert.equal(recreations, 1);
  assert.equal(result.recovered, true);
  assert.match(result.error.message, /old route topology/);
  assert.deepEqual(result.value, { generation: 2, ships: [] });
  assert.deepEqual(playerState, { doubloons: 1234, discoveries: ["fuji"] });
});

test("derived recovery never hides a failure to create current state", () => {
  assert.throws(() => restoreOrRecreateDerivedSaveState({
    label: "test routes",
    current: { ships: [] },
    recreate() {
      throw new Error("current route generation failed");
    },
    restore() {
      throw new Error("old route topology");
    }
  }), /current route generation failed/);
});
