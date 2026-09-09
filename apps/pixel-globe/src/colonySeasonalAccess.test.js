import test from "node:test";
import assert from "node:assert/strict";
import { bakeSeasonalColonyAccess } from "../tools/seasonal-colony-access.mjs";
import { COLONIZATION_TARGETS } from "./colonialCities.js";
import { COLONY_SEASONAL_ACCESS } from "./colonySeasonalAccessData.js";
import { colonySeasonalAccessWarning } from "./colonySeasonalAccess.js";

function cycle({ seasonal = [], freeze = [], thaw = [], always = [] } = {}) {
  return { tileCount: 4, northAlwaysTileIds: always, southAlwaysTileIds: [],
    northSeasonalTileIds: seasonal, northFreezeDayOfYear: freeze, northThawDayOfYear: thaw,
    southSeasonalTileIds: [], southFreezeDayOfYear: [], southThawDayOfYear: [] };
}
function bake({ sea = cycle(), fresh = cycle(), bypass = false, disconnected = false } = {}) {
  const neighbors = [[1], [0, 2], [1, 3], [2]];
  if (bypass) { neighbors[0].push(3); neighbors[3].push(0); }
  if (disconnected) { neighbors[1] = [0]; neighbors[2] = [3]; }
  return bakeSeasonalColonyAccess({ graph: { tileCount: 4, neighbors },
    earthRows: Array.from({ length: 4 }, () => ({ t: "water" })),
    navigation: { reachableNavigationMask: [1, 1, 1, 1], riverMasks: [0, 0, 0, 0], riverToWaterMasks: [0, 0, 0, 0] },
    seaIceCycle: sea, freshwaterIceCycle: fresh, fineToCoarseTileId: [0, 1, 2, 3], oceanSeedTileId: 0,
    colonies: [{ cityId: "test-colony", accessTileIds: [3] }] })["test-colony"].blockedDays;
}

test("seasonal access detects downstream ice despite a clear harbor, including year wrap", () => {
  const sea = cycle({ seasonal: [1], freeze: [350], thaw: [60] });
  const blocked = bake({ sea });
  assert.equal(blocked.length, 75);
  assert.ok(blocked.includes(0) && blocked.includes(359));
  assert.ok(!blocked.includes(60) && !blocked.includes(349));
  assert.equal(bake({ sea, bypass: true }).length, 0, "an open alternative approach prevents a closure");
});
test("freshwater ice and sea ice both close the route", () => {
  const blocked = bake({ sea: cycle({ seasonal: [1], freeze: [0], thaw: [10] }),
    fresh: cycle({ seasonal: [2], freeze: [20], thaw: [30] }) });
  assert.equal(blocked.length, 20);
  assert.ok(blocked.includes(20) && !blocked.includes(10));
});
test("permanent map disconnection and permanent ice fail the bake instead of becoming seasonal warnings", () => {
  assert.throws(() => bake({ disconnected: true }), /even without ice/);
  assert.throws(() => bake({ sea: cycle({ always: [1] }) }), /icebound all year/);
});
test("every colony has a canonical seasonal record and only blocked approaches receive the warning", () => {
  assert.deepEqual(Object.keys(COLONY_SEASONAL_ACCESS).sort(), COLONIZATION_TARGETS.filter(target => target.waterAccess !== "inland").map(target => target.cityId).sort());
  for (const [cityId, entry] of Object.entries(COLONY_SEASONAL_ACCESS)) {
    assert.ok(entry.blockedDays.every((day, i, days) => Number.isInteger(day) && day >= 0 && day < 365 && (i === 0 || day > days[i - 1])));
    assert.equal(Boolean(colonySeasonalAccessWarning(cityId)), entry.blockedDays.length > 0);
  }
  assert.match(colonySeasonalAccessWarning("quebec|canada"), /before the freeze/);
  assert.equal(colonySeasonalAccessWarning("roanoke|united states of america"), "");
  assert.throws(() => colonySeasonalAccessWarning("new-unbaked-colony"), /missing its seasonal sailing access bake/);
});
