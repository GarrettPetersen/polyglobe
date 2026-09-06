import assert from "node:assert/strict";
import test from "node:test";
import { landmassChannelNavigationAnchor } from "./landmassChannels.js";

function channelWorld() {
  return {
    graph: { tileCount: 4, neighbors: [[1, 2], [0, 3], [0], [1]],
      centers: new Float32Array([1, 0, 0, 0.98, 0.1, 0, 0.98, -0.1, 0, 0.95, 0.2, 0]) },
    earthRows: [{ t: "temperate", m: 1 }, { t: "temperate", m: 2 }, { t: "beach" }, { t: "temperate", m: 2 }],
    riverMasks: new Uint8Array(4), a: 0, b: 1
  };
}

test("landmass channels select real adjacent water independently of screen layout", () => {
  const world = channelWorld();
  assert.deepEqual(landmassChannelNavigationAnchor(world), { tileId: 2, kind: "surface" });
  assert.deepEqual(landmassChannelNavigationAnchor({ ...world, a: 1, b: 0 }), { tileId: 2, kind: "surface" });
});

test("inland river islands need river anchors, and accidental inland landmass seams fail", () => {
  const world = channelWorld();
  world.earthRows[2] = { t: "temperate", m: 1 };
  assert.throws(() => landmassChannelNavigationAnchor(world), /no adjacent surface water or river/);
  world.riverMasks[1] = 1;
  assert.deepEqual(landmassChannelNavigationAnchor(world), { tileId: 1, kind: "river" });
  assert.throws(() => landmassChannelNavigationAnchor({ ...world, b: 3 }), /Invalid landmass channel endpoints/);
  assert.throws(() => landmassChannelNavigationAnchor({ ...world, riverMasks: null }), /complete river masks/);
});
