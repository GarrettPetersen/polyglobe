import test from "node:test";
import assert from "node:assert/strict";
import { buildHexDaylightMap } from "./hexDaylight.js";

function centerAt(map, x, y) {
  const at = (y * map.width + x) * 4;
  return { x: map.pixels[at] * 256 + map.pixels[at + 1] + map.centerOrigin.x,
    y: map.pixels[at + 2] * 256 + map.pixels[at + 3] + map.centerOrigin.y };
}

test("hex daylight chooses whole spatial cells, including irregular and offscreen tiles", () => {
  const centers = [{ id: 3, x: -5, y: 15 }, { id: 1, x: 9, y: 3 },
    { id: 7, x: 21, y: 6 }, { id: 8, x: 10, y: 28 }, { id: 2, x: 33, y: 25 }];
  for (const radiusPx of [1, 12, 100]) {
    const map = buildHexDaylightMap(centers, { x: -10, y: -8, width: 44, height: 43, radiusPx });
    for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) {
      const nearest = [...centers].sort((a, b) =>
        ((x + map.x + 0.5 - a.x) ** 2 + (y + map.y + 0.5 - a.y) ** 2) -
        ((x + map.x + 0.5 - b.x) ** 2 + (y + map.y + 0.5 - b.y) ** 2) || a.id - b.id)[0];
      assert.deepEqual(centerAt(map, x, y), { x: nearest.x, y: nearest.y });
    }
    assert.deepEqual(buildHexDaylightMap([...centers].reverse(), { ...map, radiusPx }).pixels, map.pixels);
  }
});

test("hex daylight rejects invalid geometry and ambiguous tile identities", () => {
  const bounds = { x: 0, y: 0, width: 10, height: 10, radiusPx: 10 };
  assert.throws(() => buildHexDaylightMap([], bounds), /requires/);
  assert.throws(() => buildHexDaylightMap([{ id: 1, x: NaN, y: 0 }], bounds), /Invalid/);
  assert.throws(() => buildHexDaylightMap([{ id: 1, x: 0, y: 0 }, { id: 1, x: 3, y: 3 }], bounds), /Invalid/);
});

test("ragged sprites own their complete opaque silhouette and connectors follow their nearest endpoint", () => {
  const centers = [{id: 1, x: 2, y: 2}, {id: 2, x: 8, y: 2}];
  const mask = {width: 9, height: 3, alpha: Uint8Array.from([
    255,255,255,255,255,255,255,255,0,
    255,255,255,255,255,255,255,0,0,
    255,255,255,255,255,255,255,255,255])};
  const map = buildHexDaylightMap(centers, {x:0,y:0,width:12,height:6,radiusPx:12,
    sprites:[{id:1,x:0,y:1,width:9,height:3,mask}]});
  assert.deepEqual(centerAt(map,7,1),{x:2,y:2});
  assert.deepEqual(centerAt(map,7,2),{x:8,y:2},"transparent notch retains the water/connector owner");
  assert.deepEqual(centerAt(map,8,3),{x:2,y:2},"ragged peninsula extends past the geometric bisector");
  assert.deepEqual(centerAt(map,4,5),{x:2,y:2});
  assert.deepEqual(centerAt(map,6,5),{x:8,y:2});
});

test("a connector follows its attached sprites rather than a closer third tile", () => {
  const map = buildHexDaylightMap([{id:1,x:0,y:1},{id:2,x:10,y:1},{id:3,x:5,y:2}], {
    x:0,y:0,width:12,height:4,radiusPx:12,
    connectors:[{a:1,b:2,spans:[{x:0,y:1,width:11}]}]
  });
  assert.deepEqual(centerAt(map,4,1), {x:0,y:1});
  assert.deepEqual(centerAt(map,6,1), {x:10,y:1});
  assert.deepEqual(centerAt(map,5,2), {x:5,y:2});
});
