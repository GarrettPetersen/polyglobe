const assert = require("node:assert/strict");
const test = require("node:test");

const { updateHighWaterStats } = require("./steamStats.cjs");

function statsApi(initial = {}, { storeResult = true } = {}) {
  const values = new Map(Object.entries(initial));
  const writes = [];
  let stores = 0;
  return {
    getInt: (name) => values.has(name) ? values.get(name) : null,
    setInt: (name, value) => {
      writes.push([name, value]);
      values.set(name, value);
      return true;
    },
    store: () => {
      stores += 1;
      return storeResult;
    },
    writes,
    stores: () => stores
  };
}

test("Steam stats increase monotonically and store once per batch", () => {
  const api = statsApi({ FISH_CAUGHT: 8, PORTS_VISITED: 4 });
  const result = updateHighWaterStats(api, {
    FISH_CAUGHT: 12,
    PORTS_VISITED: 7
  });
  assert.equal(result.changed, true);
  assert.deepEqual(result.updatedNames, ["FISH_CAUGHT", "PORTS_VISITED"]);
  assert.deepEqual(api.writes, [["FISH_CAUGHT", 12], ["PORTS_VISITED", 7]]);
  assert.equal(api.stores(), 1);
});

test("Steam stats never decrease or store unchanged batches", () => {
  const api = statsApi({ FISH_CAUGHT: 12, PORTS_VISITED: 7 });
  const result = updateHighWaterStats(api, {
    FISH_CAUGHT: 8,
    PORTS_VISITED: 7
  });
  assert.equal(result.changed, false);
  assert.deepEqual(api.writes, []);
  assert.equal(api.stores(), 0);
});

test("missing Steamworks stat definitions fail loudly", () => {
  const api = statsApi({ FISH_CAUGHT: 1 });
  assert.throws(
    () => updateHighWaterStats(api, { FISH_CAUGHT: 2, NOT_PUBLISHED: 2 }),
    /Steam stat is unavailable: NOT_PUBLISHED/
  );
  assert.deepEqual(api.writes, []);
});

test("invalid values and failed stores are rejected", () => {
  assert.throws(
    () => updateHighWaterStats(statsApi({ FISH_CAUGHT: 1 }), { FISH_CAUGHT: 1.5 }),
    /Invalid Steam stat value/
  );
  assert.throws(
    () => updateHighWaterStats(
      statsApi({ FISH_CAUGHT: 1 }, { storeResult: false }),
      { FISH_CAUGHT: 2 }
    ),
    /could not store/
  );
});
