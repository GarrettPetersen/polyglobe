import assert from "node:assert/strict";
import test from "node:test";
import { RESURRECT_64_HEX } from "../src/waterLatitudePalette.js";
import {
  BACKGROUND_CITY_BUILDING_LAYERS,
  BACKGROUND_CITY_FOUNDATION_SOURCE_HEIGHT,
  BACKGROUND_CITY_FRONT_DEPTH,
  BACKGROUND_CITY_MAX_ROWS,
  BACKGROUND_CITY_QUAY_CLEARANCE,
  BACKGROUND_CITY_SKYLINE_TOLERANCE,
  BACKGROUND_CITY_STREET_COLOR,
  cityBackgroundAtmosphereLevel,
  cityBackgroundAtmosphereRgb,
  cityBackgroundBaseTopProfile,
  cityBackgroundLayout,
  cityBackgroundColumnSkyline,
  cityBackgroundPainterOrder,
  cityBackgroundRowCount,
  cityBackgroundSkylineTargetY,
  cityBackgroundStreetRows,
  mirrorCityBackgroundStreetRows,
  oppositeBankCityBackgroundLayout
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
  assert.equal(BACKGROUND_CITY_MAX_ROWS, 8);
  assert.equal(cityBackgroundRowCount(LONDON), 8);
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
    const expectedVariety = Math.min(2, row.buildings.length);
    assert.ok(
      new Set(row.buildings.slice(0, 5).map((building) => building.frame.layer)).size >=
        expectedVariety
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
  assert.ok(rows.at(-1).depth - rows[0].depth <= 0.070_001);
  assert.ok(rows.every((row) => row.buildings.every((building) => building.rightRise === 0)));
  for (let index = 1; index < rows.length; index++) {
    const fartherStart = rows[index - 1].buildings[0].x;
    const nearerStart = rows[index].buildings[0].x;
    assert.ok(fartherStart >= nearerStart);
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

test("a falling ribbon adds grounded rear layers at the dip instead of lifting buildings", () => {
  const fallingRibbon = Int16Array.from(
    { length: BASE_FRAME.frame.w },
    (_, x) => BASE_FRAME.spriteSourceSize.y + Math.min(30, Math.floor(x / 3))
  );
  const flatRows = cityBackgroundLayout({
    city: LONDON,
    rowCount: BACKGROUND_CITY_MAX_ROWS,
    frames: FRAMES,
    baseFrame: BASE_FRAME,
    baseTopYByX: FLAT_BASE_TOP
  });
  const fallingRows = cityBackgroundLayout({
    city: LONDON,
    rowCount: BACKGROUND_CITY_MAX_ROWS,
    frames: FRAMES,
    baseFrame: BASE_FRAME,
    baseTopYByX: fallingRibbon
  });
  const frontStart = fallingRows.at(-1).buildings[0].x;
  assert.equal(frontStart, flatRows.at(-1).buildings[0].x);
  assert.ok(fallingRows.length > flatRows.length);
  assert.ok(
    fallingRows.find((row) => row.distanceFromFront === 3).buildings[0].x <
      flatRows.find((row) => row.distanceFromFront === 3).buildings[0].x
  );
  for (const row of fallingRows) {
    for (const building of row.buildings) {
      assert.equal(building.rowGroundTopY, building.shorelineTopY);
    }
    if (row.distanceFromFront === 0) continue;
    const first = row.buildings[0];
    const centerX = first.x + first.width / 2;
    assert.ok(fallingRows.some((nearerRow) => (
      nearerRow.distanceFromFront < row.distanceFromFront &&
      nearerRow.buildings.some((nearer) => (
        centerX >= nearer.x &&
        centerX < nearer.x + nearer.width &&
        nearer.y <= first.bottomY
      ))
    )), `rear row ${row.distanceFromFront} starts without foreground occlusion`);
  }
});

test("the city adds layers until its skyline reaches a gently rising target", () => {
  const rows = cityBackgroundLayout({
    city: LONDON,
    rowCount: BACKGROUND_CITY_MAX_ROWS,
    frames: FRAMES,
    baseFrame: BASE_FRAME,
    baseTopYByX: FLAT_BASE_TOP
  });
  const anchor = rows.at(-1).buildings[0];
  const skyline = cityBackgroundColumnSkyline(rows);
  for (const column of skyline) {
    const targetY = cityBackgroundSkylineTargetY(anchor.x, anchor.y, column.x);
    assert.ok(
      column.topY <= targetY + BACKGROUND_CITY_SKYLINE_TOLERANCE,
      `skyline at ${column.x} sinks below its ${targetY} target to ${column.topY}`
    );
  }
  const frontOnly = rows.filter((row) => row.distanceFromFront === 0);
  const sunkenSkyline = cityBackgroundColumnSkyline(frontOnly);
  assert.ok(
    sunkenSkyline.some((column) => (
      column.topY >
        cityBackgroundSkylineTargetY(anchor.x, anchor.y, column.x) +
          BACKGROUND_CITY_SKYLINE_TOLERANCE
    )),
    "removing the adaptive rear layers should expose a sunken skyline"
  );
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

test("every row stays on its local ribbon-relative grade instead of flying", () => {
  const fallingRibbon = Int16Array.from(
    { length: BASE_FRAME.frame.w },
    (_, x) => BASE_FRAME.spriteSourceSize.y + Math.floor(x / 12)
  );
  const rows = cityBackgroundLayout({
    city: LONDON,
    rowCount: 5,
    frames: FRAMES,
    baseFrame: BASE_FRAME,
    baseTopYByX: fallingRibbon
  });
  assert.ok(rows.some((row) => row.buildings.some(
    (building) => building.rowGroundTopY > fallingRibbon[0]
  )));
  for (const row of rows) {
    assert.ok(row.buildings.every((building) => (
      building.rowGroundTopY === building.shorelineTopY
    )));
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

test("opposite-bank streets mirror the authored ribbon edge", () => {
  assert.deepEqual(mirrorCityBackgroundStreetRows({
    rows: [
      { y: 469, leftX: 825, rightX: 1365 },
      { y: 470, leftX: 826, rightX: 1365 }
    ],
    sceneWidth: 1365
  }), [
    { y: 469, leftX: 0, rightX: 540 },
    { y: 470, leftX: 0, rightX: 539 }
  ]);
});

test("opposite-bank buildings are independently generated, position-mirrored, and never sprite-mirrored", () => {
  const generatedCity = { ...LONDON, id: `${LONDON.id}|opposite-bank` };
  const generatedRows = cityBackgroundLayout({
    city: generatedCity,
    rowCount: 5,
    frames: FRAMES,
    baseFrame: BASE_FRAME,
    baseTopYByX: FLAT_BASE_TOP
  });
  const oppositeRows = oppositeBankCityBackgroundLayout({
    city: LONDON,
    rowCount: 5,
    frames: FRAMES,
    baseFrame: BASE_FRAME,
    baseTopYByX: FLAT_BASE_TOP,
    sceneWidth: 1365,
    parallaxAnchor: -0.12
  });
  for (const [rowIndex, row] of oppositeRows.entries()) {
    assert.equal(row.parallaxAnchor, -0.12);
    assert.ok(row.buildings.every((building, index, buildings) => (
      index === 0 || buildings[index - 1].x <= building.x
    )));
    const sourceKeys = generatedRows[rowIndex].buildings.map((source) => (
      `${source.frame.layer}:${1365 - source.x - source.width}:${source.y}:${source.width}`
    )).sort();
    const mirroredKeys = row.buildings.map((building) => (
      `${building.frame.layer}:${building.x}:${building.y}:${building.width}`
    )).sort();
    assert.deepEqual(mirroredKeys, sourceKeys);
  }
  const ordinaryRows = cityBackgroundLayout({
    city: LONDON,
    rowCount: 5,
    frames: FRAMES,
    baseFrame: BASE_FRAME,
    baseTopYByX: FLAT_BASE_TOP
  });
  assert.notDeepEqual(
    oppositeRows.flatMap((row) => row.buildings.map((building) => building.frame.layer)),
    ordinaryRows.flatMap((row) => row.buildings.map((building) => building.frame.layer))
  );
});

test("buildings with lower bases paint in front of buildings with higher bases", () => {
  const highBase = { id: "high", bottomY: 470 };
  const tiedFar = { id: "tied-far", bottomY: 480 };
  const tiedNear = { id: "tied-near", bottomY: 480 };
  const lowBase = { id: "low", bottomY: 495 };
  const order = cityBackgroundPainterOrder([
    { depth: 0.82, parallaxAnchor: 1, distanceFromFront: 1, buildings: [lowBase, tiedFar] },
    { depth: 0.86, parallaxAnchor: 1, distanceFromFront: 0, buildings: [tiedNear, highBase] }
  ]);
  assert.deepEqual(order.map((entry) => entry.building.id), [
    "high",
    "tied-far",
    "tied-near",
    "low"
  ]);
  assert.equal(order.at(-1).building, lowBase);
});

test("atmospheric perspective keeps the front row exact and cools only deeper rows", () => {
  assert.equal(cityBackgroundAtmosphereLevel(0, 5), 0);
  assert.equal(cityBackgroundAtmosphereLevel(1, 5), 1);
  assert.equal(cityBackgroundAtmosphereLevel(2, 5), 1);
  assert.equal(cityBackgroundAtmosphereLevel(3, 5), 2);
  assert.equal(cityBackgroundAtmosphereLevel(4, 5), 2);
  assert.equal(cityBackgroundAtmosphereLevel(1, 2), 1);
  const palette = new Set(RESURRECT_64_HEX);
  const warmRoof = [0xb3, 0x38, 0x31];
  const front = cityBackgroundAtmosphereRgb(...warmRoof, 0);
  const middle = cityBackgroundAtmosphereRgb(...warmRoof, 1);
  const rear = cityBackgroundAtmosphereRgb(...warmRoof, 2);
  assert.deepEqual(front, { red: 0xb3, green: 0x38, blue: 0x31 });
  assert.equal(palette.has(rgbHex(middle)), true);
  assert.equal(palette.has(rgbHex(rear)), true);
  assert.notDeepEqual(middle, front);
  assert.notDeepEqual(rear, middle);
});

test("adjacent skyline rows avoid stacking identical building sprites directly behind one another", () => {
  const rows = cityBackgroundLayout({
    city: LONDON,
    rowCount: 5,
    frames: FRAMES,
    baseFrame: BASE_FRAME,
    baseTopYByX: FLAT_BASE_TOP
  });
  for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    for (const [buildingIndex, building] of row.buildings.entries()) {
      const centerX = building.x + building.width / 2;
      const previousLayer = row.buildings[buildingIndex - 1]?.frame.layer;
      const fittingFrames = FRAMES.filter((candidate) => (
        building.x + Math.max(1, Math.round(candidate.frame.w * row.scale)) <=
          BASE_FRAME.spriteSourceSize.x + BASE_FRAME.spriteSourceSize.w
      ));
      const nonRepeatingFrames = fittingFrames.filter((candidate) => candidate.layer !== previousLayer);
      const candidates = nonRepeatingFrames.length > 0 ? nonRepeatingFrames : fittingFrames;
      const duplicateCount = (candidate) => {
        const candidateWidth = Math.max(1, Math.round(candidate.frame.w * row.scale));
        const candidateCenterX = building.x + candidateWidth / 2;
        return rows.slice(rowIndex + 1).reduce((count, nearerRow) => (
          count + nearerRow.buildings.filter((nearer) => (
            nearer.frame.layer === candidate.layer &&
            Math.abs(candidateCenterX - (nearer.x + nearer.width / 2)) <=
              Math.min(candidateWidth, nearer.width) * 0.35
          )).length
        ), 0);
      };
      const chosenCount = duplicateCount(building.frame);
      const minimumCount = Math.min(...candidates.map(duplicateCount));
      assert.equal(chosenCount, minimumCount, `${building.frame.layer} at ${centerX}`);
    }
  }
});

function frame(layer, width, height, x = 0, y = 0) {
  return Object.freeze({
    id: layer,
    layer,
    frame: Object.freeze({ x: 0, y: 0, w: width, h: height }),
    spriteSourceSize: Object.freeze({ x, y, w: width, h: height })
  });
}

function rgbHex({ red, green, blue }) {
  return [red, green, blue].map((channel) => channel.toString(16).padStart(2, "0")).join("");
}
