import assert from "node:assert/strict";
import test from "node:test";
import {
  BACKGROUND_CITY_BUILDING_LAYERS,
  BACKGROUND_CITY_FOUNDATION_SOURCE_HEIGHT,
  BACKGROUND_CITY_FRONT_DEPTH,
  BACKGROUND_CITY_QUAY_CLEARANCE,
  BACKGROUND_CITY_STREET_COLOR,
  cityBackgroundBaseTopProfile,
  cityBackgroundStreetRows,
  cityBackgroundLayout,
  cityBackgroundRowCount
} from "./cityBackground.js";

const BUILDING_SIZES = Object.freeze({
  Inn: [129, 101],
  Smith: [110, 71],
  Home: [95, 71],
  "Home 2": [85, 79]
});
const FRAMES = Object.freeze(BACKGROUND_CITY_BUILDING_LAYERS.map((layer) => frame(
  layer,
  ...BUILDING_SIZES[layer]
)));
const BASE_FRAME = frame("Background City Base", 541, 55, 824, 469);
const FLAT_BASE_TOP = new Int16Array(BASE_FRAME.frame.w).fill(BASE_FRAME.spriteSourceSize.y);
const LONDON = Object.freeze({
  id: "london|united kingdom",
  population: 58_250,
  settlementType: "city",
  capital: true
});

test("major cities receive more skyline rows while villages receive none", () => {
  assert.equal(cityBackgroundRowCount(LONDON), 5);
  assert.equal(cityBackgroundRowCount({ ...LONDON, population: 12_000, capital: false }), 3);
  assert.equal(cityBackgroundRowCount({ ...LONDON, population: 1_000, settlementType: "village" }), 0);
});

test("city skyline generation is deterministic and admits only whole buildings after the quay", () => {
  const input = {
    city: LONDON,
    rowCount: 5,
    frames: FRAMES,
    baseFrame: BASE_FRAME,
    baseTopYByX: FLAT_BASE_TOP
  };
  const first = cityBackgroundLayout(input);
  const second = cityBackgroundLayout(input);
  assert.deepEqual(first, second);
  for (const row of first) {
    assert.ok(row.buildings[0].x >= BASE_FRAME.spriteSourceSize.x + BACKGROUND_CITY_QUAY_CLEARANCE);
    const last = row.buildings.at(-1);
    assert.equal(last.x + last.width, BASE_FRAME.spriteSourceSize.x + BASE_FRAME.spriteSourceSize.w);
    assert.deepEqual(
      new Set(row.buildings.slice(0, 4).map((building) => building.frame.layer)),
      new Set(BACKGROUND_CITY_BUILDING_LAYERS)
    );
  }
});

test("rear rows are smaller, heavily overlapped, and use restrained parallax", () => {
  const rows = cityBackgroundLayout({
    city: LONDON,
    rowCount: 5,
    frames: FRAMES,
    baseFrame: BASE_FRAME,
    baseTopYByX: FLAT_BASE_TOP
  });
  assert.equal(rows.at(-1).scale, 0.5);
  assert.equal(rows.at(-1).depth, BACKGROUND_CITY_FRONT_DEPTH);
  assert.ok(rows[0].scale < rows[1].scale);
  assert.ok(rows[0].depth < rows[1].depth);
  assert.ok(rows.at(-1).depth - rows[0].depth <= 0.040_001);
  assert.ok(rows[0].buildings.at(-1).rightRise > rows[0].buildings[0].rightRise);
  assert.ok(rows.at(-1).buildings.every((building) => building.rightRise === 0));
  for (let index = 1; index < rows.length; index++) {
    assert.ok(rows[index - 1].buildings[0].x > rows[index].buildings[0].x);
  }
  for (const row of rows) {
    assert.ok(row.buildings.every((building) => (
      building.wallBottomY === building.admittedWallBottomY &&
      building.bottomY - building.wallBottomY === building.foundationHeight
    )));
  }
  for (let index = 1; index < rows.length; index++) {
    assert.equal(rows[index].verticalOffset - rows[index - 1].verticalOffset, 12);
    const shortestNearBuilding = Math.min(...rows[index].buildings.map((building) => building.height));
    assert.ok(shortestNearBuilding >= 2 * (rows[index].verticalOffset - rows[index - 1].verticalOffset));
  }
});

test("the front row permits only its scaled foundation band to intersect the ribbon", () => {
  const rows = cityBackgroundLayout({
    city: LONDON,
    rowCount: 5,
    frames: FRAMES,
    baseFrame: BASE_FRAME,
    baseTopYByX: FLAT_BASE_TOP
  });
  const front = rows.at(-1);
  assert.equal(front.depth, BACKGROUND_CITY_FRONT_DEPTH);
  assert.equal(front.parallaxAnchor, 1);
  assert.ok(front.buildings.every(({ wallBottomY, bottomY, foundationHeight }) => (
    wallBottomY === BASE_FRAME.spriteSourceSize.y &&
    bottomY === BASE_FRAME.spriteSourceSize.y + foundationHeight &&
    foundationHeight === Math.round(BACKGROUND_CITY_FOUNDATION_SOURCE_HEIGHT * 0.5)
  )));
  assert.ok(front.buildings.every(({ frame: source, width, height }) => (
    width === Math.round(source.frame.w * 0.5) &&
    height === Math.round(source.frame.h * 0.5)
  )));
});

test("building baselines follow the opaque top edge of a curved stone ribbon", () => {
  const alpha = new Uint8Array(5 * 5);
  for (const [x, top] of [0, 0, 1, 1, 3, 3, 4, 4].reduce((pairs, value, index, values) => (
    index % 2 === 0 ? [...pairs, [value, values[index + 1]]] : pairs
  ), [])) {
    for (let y = top; y < 5; y++) alpha[y * 5 + x] = 255;
  }
  assert.deepEqual(
    Array.from(cityBackgroundBaseTopProfile({ alpha, width: 5, height: 5, sourceY: 100 })),
    [100, 101, 102, 103, 104]
  );
});

test("no wall pixel falls below a curved ribbon across a building's full width", () => {
  const curvedTop = Int16Array.from({ length: BASE_FRAME.frame.w }, (_, x) => 469 + Math.round(x / 18));
  const rows = cityBackgroundLayout({
    city: LONDON,
    rowCount: 5,
    frames: FRAMES,
    baseFrame: BASE_FRAME,
    baseTopYByX: curvedTop
  });
  for (const row of rows) {
    for (const building of row.buildings) {
      const start = Math.floor(building.x - BASE_FRAME.spriteSourceSize.x);
      const end = Math.ceil(start + building.width);
      const ribbonTop = Math.min(...curvedTop.slice(start, end));
      assert.ok(building.wallBottomY <= ribbonTop);
      assert.ok(building.bottomY <= ribbonTop + building.foundationHeight);
    }
  }
});

test("the ribbon reserves a bare fifteen-pixel quay before the background city", () => {
  assert.equal(BACKGROUND_CITY_QUAY_CLEARANCE, 15);
});

test("background-city gaps expose an authored gray street rather than blue water", () => {
  assert.equal(BACKGROUND_CITY_STREET_COLOR, "#9babb2");
  const alpha = new Uint8Array([
    0, 255, 255, 0,
    0, 0, 255, 255,
    0, 0, 0, 0
  ]);
  assert.deepEqual(cityBackgroundStreetRows({
    alpha,
    width: 4,
    height: 3,
    sourceX: 824,
    sourceY: 469,
    rightX: 1365
  }), [
    { y: 469, leftX: 825, rightX: 1365 },
    { y: 470, leftX: 826, rightX: 1365 }
  ]);
});

function frame(layer, width, height, x = 0, y = 0) {
  return Object.freeze({
    id: layer,
    layer,
    frame: Object.freeze({ x: 0, y: 0, w: width, h: height }),
    spriteSourceSize: Object.freeze({ x, y, w: width, h: height })
  });
}
