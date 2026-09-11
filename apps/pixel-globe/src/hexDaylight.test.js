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
