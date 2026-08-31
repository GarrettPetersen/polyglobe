import assert from "node:assert/strict";
import test from "node:test";
import { RESURRECT_64_HEX } from "../src/waterLatitudePalette.js";
import {
  BACKGROUND_CITY_BUILDING_LAYERS,
  BACKGROUND_CITY_CHURCH_FOUNDATION_SOURCE_HEIGHT,
  BACKGROUND_CITY_CHURCH_LAYER,
  BACKGROUND_CITY_CHURCH_SCALE_MULTIPLIER,
  BACKGROUND_CITY_MOSQUE_FOUNDATION_SOURCE_HEIGHT,
  BACKGROUND_CITY_MOSQUE_LAYER,
  BACKGROUND_CITY_MOSQUE_SCALE_MULTIPLIER,
  BACKGROUND_CITY_FAR_SCALE,
  BACKGROUND_CITY_FOUNDATION_RISE_PER_PIXEL,
  BACKGROUND_CITY_FOUNDATION_SOURCE_HEIGHT,
  BACKGROUND_CITY_FOUNDATION_TOLERANCE,
  BACKGROUND_CITY_FRONT_DEPTH,
  BACKGROUND_CITY_MAX_ROWS,
  BACKGROUND_CITY_NEAR_SCALE,
  BACKGROUND_CITY_POINT_SPACING_X,
  BACKGROUND_CITY_POINT_SPACING_Y,
  BACKGROUND_CITY_QUAY_CLEARANCE,
  BACKGROUND_CITY_STREET_COLOR,
  cityBackgroundAtmosphereLevelForPerspective,
  cityBackgroundAtmosphereRgb,
  cityBackgroundBaseTopProfile,
  cityBackgroundChurchPlans,
  cityBackgroundMosquePlans,
  cityBackgroundDepthForPerspective,
  cityBackgroundEnabled,
  cityBackgroundFoundationEnvelope,
  cityBackgroundFoundationPerspective,
  cityBackgroundFoundationPoints,
  cityBackgroundFoundationTargetY,
  cityBackgroundFlyingBuildings,
  cityBackgroundLayout,
  cityBackgroundPainterOrder,
  cityBackgroundScaleForPerspective,
  cityBackgroundVisualPerspective,
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
const CHURCH_FRAME = frame(BACKGROUND_CITY_CHURCH_LAYER, 195, 367, 142, 16);
const MOSQUE_FRAME = frame(BACKGROUND_CITY_MOSQUE_LAYER, 165, 137, 161, 119);
const FRAMES_WITH_CHURCH = Object.freeze([...FRAMES, CHURCH_FRAME]);
const FRAMES_WITH_MOSQUE = Object.freeze([...FRAMES, MOSQUE_FRAME]);
const MEDITERRANEAN_FRAMES = Object.freeze([
  ...FRAMES,
  frame("Med Inn", 129, 101, 0, 0, { cityType: "mediterranean", regionalOf: "Inn" }),
  frame("Med Smith", 110, 71, 0, 0, { cityType: "mediterranean", regionalOf: "Smith" }),
  frame("Med Home", 95, 71, 0, 0, { cityType: "mediterranean", regionalOf: "Home" }),
  frame("Med Home 2", 85, 69, 0, 10, { cityType: "mediterranean", regionalOf: "Home 2" })
]);
const MIDDLE_EASTERN_FRAMES = Object.freeze([
  ...FRAMES,
  frame("Middle East Inn", 127, 101, 0, 0, { cityType: "islamic-desert", regionalOf: "Inn" }),
  frame("Middle East Smith", 108, 67, 2, 4, { cityType: "islamic-desert", regionalOf: "Smith" }),
  frame("Middle East Home", 99, 56, -2, 15, { cityType: "islamic-desert", regionalOf: "Home" })
]);
const BASE_FRAME = frame("Background City Base", 541, 55, 824, 469);
const BASE_LEFT = BASE_FRAME.spriteSourceSize.x;
const BASE_RIGHT = BASE_LEFT + BASE_FRAME.frame.w;
const CITY_LEFT = BASE_LEFT + BACKGROUND_CITY_QUAY_CLEARANCE;
const FLAT_BASE_TOP = new Int16Array(BASE_FRAME.frame.w).fill(BASE_FRAME.spriteSourceSize.y);
const FALLING_BASE_TOP = Int16Array.from(
  { length: BASE_FRAME.frame.w },
  (_, x) => BASE_FRAME.spriteSourceSize.y + Math.min(34, Math.floor(x / 6))
);
const LONDON = Object.freeze({
  id: "london|united kingdom",
  population: 58_250,
  settlementType: "city",
  capital: true
});

test("all non-village cities use the full background area while villages receive none", () => {
  assert.equal(BACKGROUND_CITY_MAX_ROWS, 8);
  assert.equal(cityBackgroundEnabled(LONDON), true);
  assert.equal(cityBackgroundEnabled({ ...LONDON, population: 12_000, capital: false }), true);
  assert.equal(cityBackgroundEnabled({ ...LONDON, population: 31_486, capital: false }), true);
  assert.equal(cityBackgroundEnabled({ ...LONDON, population: 45_000, capital: false }), true);
  assert.equal(cityBackgroundEnabled({ ...LONDON, population: 1_000, settlementType: "village" }), false);
});

test("foundation anchors scatter deterministically through the ribbon-to-slope area without rows", () => {
  const input = {
    cityId: LONDON.id,
    density: "moderate",
    baseFrame: BASE_FRAME,
    baseTopYByX: FALLING_BASE_TOP,
    seedPoints: []
  };
  const first = cityBackgroundFoundationPoints(input);
  assert.deepEqual(first, cityBackgroundFoundationPoints(input));
  assert.ok(first.length > 20);
  assert.ok(new Set(first.map(({ foundationY }) => foundationY)).size > 12);
  assert.ok(Math.max(...frequencyCounts(first.map(({ foundationY }) => foundationY))) < first.length / 3);
  for (const point of first) {
    const shorelineY = FALLING_BASE_TOP[Math.floor(point.x - BASE_LEFT)];
    const slopeY = cityBackgroundFoundationTargetY(BASE_LEFT, FALLING_BASE_TOP[0], point.x);
    assert.ok(point.x >= CITY_LEFT && point.x < BASE_RIGHT);
    assert.ok(point.foundationY >= slopeY && point.foundationY <= shorelineY);
    assert.equal(point.perspective, cityBackgroundFoundationPerspective({
      foundationY: point.foundationY,
      shorelineY,
      slopeY
    }));
  }
  assert.equal(BACKGROUND_CITY_POINT_SPACING_X, 30);
  assert.equal(BACKGROUND_CITY_POINT_SPACING_Y, 7);
});

test("buildings use bottom-left anchors, grow rightward, and seed the ribbon edge", () => {
  const rows = layout({ baseTopYByX: FALLING_BASE_TOP });
  assert.deepEqual(rows, layout({ baseTopYByX: FALLING_BASE_TOP }));
  const buildings = allBuildings(rows);
  const grounded = buildings.filter((building) => building.groundedOnRibbon);
  assert.equal(Math.min(...buildings.map((building) => building.x)), CITY_LEFT);
  assert.ok(buildings.every((building) => building.x >= CITY_LEFT && building.x < BASE_RIGHT));
  assert.ok(buildings.some((building) => building.x + building.width > BASE_RIGHT));
  for (const building of grounded) {
    const start = Math.floor(building.x - BASE_LEFT);
    const end = Math.min(FALLING_BASE_TOP.length, Math.ceil(start + building.width));
    assert.equal(building.wallBottomY, Math.min(...FALLING_BASE_TOP.slice(start, end)));
  }
  for (let x = CITY_LEFT; x < BASE_RIGHT; x++) {
    assert.ok(grounded.some((building) => x >= building.x && x < building.x + building.width));
  }
});

test("each anchor's Y independently controls scale, palette shift, parallax, and painter depth", () => {
  const buildings = allBuildings(layout({ baseTopYByX: FALLING_BASE_TOP }));
  const visualNearY = Math.max(...FALLING_BASE_TOP);
  const visualFarY = cityBackgroundFoundationTargetY(
    BASE_LEFT,
    FALLING_BASE_TOP[0],
    BASE_RIGHT - 1
  );
  assert.ok(buildings.some((building) => building.scale === BACKGROUND_CITY_NEAR_SCALE));
  assert.ok(Math.min(...buildings.map((building) => building.scale)) < 0.35);
  assert.ok(new Set(buildings.map((building) => building.scale)).size > 8);
  assert.ok(buildings.every((building) => (
    building.perspective === cityBackgroundVisualPerspective({
      foundationY: building.wallBottomY,
      nearY: visualNearY,
      farY: visualFarY
    }) &&
    building.scale === cityBackgroundScaleForPerspective(building.perspective) &&
    building.depth === (building.groundedOnRibbon
      ? BACKGROUND_CITY_FRONT_DEPTH
      : cityBackgroundDepthForPerspective(building.perspective)) &&
    building.atmosphereLevel ===
      cityBackgroundAtmosphereLevelForPerspective(building.perspective)
  )));
  const near = buildings.reduce((best, building) => building.perspective < best.perspective ? building : best);
  const far = buildings.reduce((best, building) => building.perspective > best.perspective ? building : best);
  assert.ok(near.scale > far.scale);
  assert.ok(near.depth > far.depth);
  assert.ok(near.atmosphereLevel < far.atmosphereLevel);
});

test("the high left ribbon house receives visual perspective but remains locked to the quay", () => {
  const buildings = allBuildings(layout({ baseTopYByX: FALLING_BASE_TOP }));
  const first = buildings.reduce((leftmost, building) => (
    building.x < leftmost.x ? building : leftmost
  ));
  assert.equal(first.x, CITY_LEFT);
  assert.ok(first.perspective > 0.5);
  assert.ok(first.scale < BACKGROUND_CITY_NEAR_SCALE);
  assert.equal(first.depth, BACKGROUND_CITY_FRONT_DEPTH);

  const visualNearY = Math.max(...FALLING_BASE_TOP);
  const visualFarY = cityBackgroundFoundationTargetY(
    BASE_LEFT,
    FALLING_BASE_TOP[0],
    BASE_RIGHT - 1
  );
  const homeWallHeight = BUILDING_SIZES.Home[1] - BACKGROUND_CITY_FOUNDATION_SOURCE_HEIGHT;
  const heightLostToPerspective = Math.round(
    homeWallHeight * (BACKGROUND_CITY_NEAR_SCALE - BACKGROUND_CITY_FAR_SCALE)
  );
  assert.ok(heightLostToPerspective < (visualNearY - visualFarY) / 2);
});

test("only the scaled foundation of ribbon-edge buildings is buried", () => {
  const buildings = allBuildings(layout({ baseTopYByX: FLAT_BASE_TOP }));
  const grounded = buildings.filter((building) => building.groundedOnRibbon);
  assert.ok(grounded.length > 0);
  assert.ok(grounded.every((building) => (
    building.scale === BACKGROUND_CITY_NEAR_SCALE &&
    building.depth === BACKGROUND_CITY_FRONT_DEPTH &&
    building.foundationHeight ===
      Math.round(BACKGROUND_CITY_FOUNDATION_SOURCE_HEIGHT * BACKGROUND_CITY_NEAR_SCALE) &&
    building.bottomY === building.wallBottomY + building.foundationHeight
  )));
});

test("Christian cities place buried churches at separate points and depths without changing mass placement", () => {
  const city = {
    ...LONDON,
    religiousLandmarks: ["church"],
    backgroundCity: {
      density: "dense",
      buildingMix: { homeA: 4, homeB: 3, inn: 2, smith: 1 },
      landmarks: { church: 2 }
    }
  };
  const rows = layout({ city, frames: FRAMES_WITH_CHURCH, baseTopYByX: FALLING_BASE_TOP });
  const churches = allBuildings(rows).filter((building) => (
    building.frame.layer === BACKGROUND_CITY_CHURCH_LAYER
  ));
  assert.equal(churches.length, 2);
  assert.equal(new Set(churches.map(({ perspective }) => perspective)).size, 2);
  assert.ok(Math.abs(churches[0].x - churches[1].x) > 80);
  for (const building of churches) {
    assert.ok(building.perspective >= 0.65);
    assert.ok(
      building.scale < cityBackgroundScaleForPerspective(building.perspective),
      "distant church should be smaller than an ordinary building at the same foundation"
    );
    assert.equal(
      building.foundationHeight,
      Math.round(BACKGROUND_CITY_CHURCH_FOUNDATION_SOURCE_HEIGHT * building.scale)
    );
    assert.equal(
      building.skylineTopY,
      building.wallBottomY - Math.round(
        (BUILDING_SIZES.Inn[1] - BACKGROUND_CITY_FOUNDATION_SOURCE_HEIGHT) * building.scale
      )
    );
    assert.ok(building.skylineTopY > building.y);
  }
  assert.deepEqual(cityBackgroundFlyingBuildings(rows), []);
});

test("church plans separate large-city landmarks by district and distance", () => {
  const plans = cityBackgroundChurchPlans({ cityId: LONDON.id, count: 3 });
  assert.equal(plans.length, 3);
  assert.equal(BACKGROUND_CITY_CHURCH_SCALE_MULTIPLIER, 0.72);
  assert.ok(plans.every(({ targetPerspective }) => (
    targetPerspective >= 0.68 && targetPerspective <= 0.92
  )));
  assert.equal(new Set(plans.map(({ targetPerspective }) => targetPerspective)).size, 3);
  assert.equal(new Set(plans.map(({ targetFraction }) => targetFraction)).size, 3);
});

test("a lone church sits behind the surrounding roof mass", () => {
  assert.deepEqual(
    cityBackgroundChurchPlans({
      cityId: "barcelona|spain",
      count: 1
    }),
    [{ targetPerspective: 0.84, targetFraction: 0.554 }]
  );
});

test("Islamic cities place buried mosques deep in the skyline without creating flying buildings", () => {
  const city = {
    ...LONDON,
    id: "cairo|egypt",
    cityType: "islamic-desert",
    religiousLandmarks: ["mosque"],
    backgroundCity: {
      density: "dense",
      buildingMix: { homeA: 4, homeB: 3, inn: 2, smith: 1 },
      landmarks: { church: 0, mosque: 3 }
    }
  };
  const rows = layout({ city, frames: FRAMES_WITH_MOSQUE, baseTopYByX: FALLING_BASE_TOP });
  const mosques = allBuildings(rows).filter((building) => (
    building.frame.layer === BACKGROUND_CITY_MOSQUE_LAYER
  ));
  assert.equal(mosques.length, 3);
  assert.equal(new Set(mosques.map(({ perspective }) => perspective)).size, 3);
  assert.equal(BACKGROUND_CITY_MOSQUE_FOUNDATION_SOURCE_HEIGHT, 12);
  assert.equal(BACKGROUND_CITY_MOSQUE_SCALE_MULTIPLIER, 1);
  for (const building of mosques) {
    assert.ok(building.perspective >= 0.65);
    assert.equal(
      building.foundationHeight,
      Math.round(BACKGROUND_CITY_MOSQUE_FOUNDATION_SOURCE_HEIGHT * building.scale)
    );
    assert.ok(building.skylineTopY > building.y, "minarets do not inflate the city mass target");
  }
  assert.deepEqual(cityBackgroundFlyingBuildings(rows), []);
});

test("mosque plans use separate districts and distances from church plans", () => {
  const mosques = cityBackgroundMosquePlans({ cityId: "cairo|egypt", count: 3 });
  const churches = cityBackgroundChurchPlans({ cityId: "cairo|egypt", count: 3 });
  assert.equal(mosques.length, 3);
  assert.equal(new Set(mosques.map(({ targetPerspective }) => targetPerspective)).size, 3);
  assert.equal(new Set(mosques.map(({ targetFraction }) => targetFraction)).size, 3);
  assert.notDeepEqual(mosques, churches);
});

test("city profiles vary point density and weighted building mix", () => {
  const profile = (density, buildingMix) => layout({
    city: { ...LONDON, backgroundCity: { density, buildingMix, landmarks: { church: 0 } } },
    baseTopYByX: FALLING_BASE_TOP
  });
  const sparse = profile("sparse", { homeA: 1, homeB: 0, inn: 0, smith: 0 });
  const dense = profile("dense", { homeA: 4, homeB: 4, inn: 2, smith: 1 });
  assert.ok(allBuildings(sparse).every(({ frame: source }) => source.layer === "Home"));
  assert.ok(allBuildings(dense).length > allBuildings(sparse).length);
  assert.ok(new Set(allBuildings(dense).map(({ frame: source }) => source.layer)).size > 1);
  assert.ok(Math.max(...allBuildings(sparse).map(({ perspective }) => perspective)) > 0.9);
  assert.ok(Math.max(...allBuildings(dense).map(({ perspective }) => perspective)) > 0.9);
});

test("Mediterranean skyline generation uses the complete regional building set", () => {
  const city = {
    ...LONDON,
    cityType: "mediterranean",
    backgroundCity: {
      density: "dense",
      buildingMix: { homeA: 4, homeB: 4, inn: 2, smith: 2 },
      landmarks: { church: 0 }
    }
  };
  const buildings = allBuildings(layout({
    city,
    frames: MEDITERRANEAN_FRAMES,
    baseTopYByX: FALLING_BASE_TOP
  }));
  assert.deepEqual(
    [...new Set(buildings.map(({ frame: source }) => source.layer))].sort(),
    ["Med Home", "Med Home 2", "Med Inn", "Med Smith"].sort()
  );
  assert.ok(buildings.every(({ frame: source }) => source.cityType === "mediterranean"));
  assert.deepEqual(cityBackgroundFlyingBuildings(layout({
    city,
    frames: MEDITERRANEAN_FRAMES,
    baseTopYByX: FALLING_BASE_TOP
  })), []);
});

test("Middle Eastern skyline generation uses the three completed regional buildings", () => {
  const city = {
    ...LONDON,
    cityType: "islamic-desert",
    backgroundCity: {
      density: "dense",
      buildingMix: { homeA: 4, homeB: 4, inn: 2, smith: 2 },
      landmarks: { church: 0 }
    }
  };
  const rows = layout({
    city,
    frames: MIDDLE_EASTERN_FRAMES,
    baseTopYByX: FALLING_BASE_TOP
  });
  const layers = [...new Set(allBuildings(rows).map(({ frame: source }) => source.layer))];
  assert.ok(layers.includes("Middle East Home"));
  assert.ok(layers.includes("Middle East Inn"));
  assert.ok(layers.includes("Middle East Smith"));
  assert.ok(!layers.includes("Home 2"), "unfinished Home B reuses regional Home A instead of northern art");
  assert.ok(!layers.includes("Home"));
  assert.ok(!layers.includes("Inn"));
  assert.ok(!layers.includes("Smith"));
  assert.deepEqual(cityBackgroundFlyingBuildings(rows), []);
});

test("the filled foundation envelope follows the rising target smoothly with no flying buildings", () => {
  const rows = layout({ baseTopYByX: FALLING_BASE_TOP });
  const envelope = cityBackgroundFoundationEnvelope(rows).filter(({ x }) => x < BASE_RIGHT);
  const slopeEnvelope = envelope.filter(({ x }) => (
    x < BASE_RIGHT - BACKGROUND_CITY_QUAY_CLEARANCE
  ));
  assert.equal(envelope[0].x, CITY_LEFT);
  assert.equal(envelope.at(-1).x, BASE_RIGHT - 1);
  assert.equal(envelope.length, BASE_RIGHT - CITY_LEFT);
  assert.equal(BACKGROUND_CITY_FOUNDATION_RISE_PER_PIXEL, 1 / 24);
  for (const point of slopeEnvelope) {
    const targetY = cityBackgroundFoundationTargetY(BASE_LEFT, FALLING_BASE_TOP[0], point.x);
    const shorelineY = FALLING_BASE_TOP[point.x - BASE_LEFT];
    if (shorelineY <= targetY) continue;
    assert.ok(
      point.foundationY <= targetY + BACKGROUND_CITY_FOUNDATION_TOLERANCE,
      `foundation at ${point.x} sinks below ${targetY} to ${point.foundationY}`
    );
  }
  for (let index = 1; index < envelope.length; index++) {
    assert.ok(
      Math.abs(envelope[index].foundationY - envelope[index - 1].foundationY) <=
        BACKGROUND_CITY_FOUNDATION_TOLERANCE + 1
    );
  }
  assert.deepEqual(cityBackgroundFlyingBuildings(rows), []);
});

test("building walls never fall below a curved ribbon across their visible width", () => {
  const rows = layout({ baseTopYByX: FALLING_BASE_TOP });
  for (const building of allBuildings(rows)) {
    const start = Math.floor(building.x - BASE_LEFT);
    const end = Math.min(FALLING_BASE_TOP.length, Math.ceil(start + building.width));
    const ribbonTop = Math.min(...FALLING_BASE_TOP.slice(start, end));
    assert.ok(building.wallBottomY <= ribbonTop);
    assert.ok(building.bottomY <= ribbonTop + building.foundationHeight);
  }
});

test("flying-building detection checks every foundation column, not only its anchor", () => {
  const frontBuilding = {
    x: 10,
    y: 30,
    wallBottomY: 70,
    bottomY: 75,
    width: 20
  };
  const partlySupportedRearBuilding = {
    x: 5,
    y: 20,
    wallBottomY: 50,
    bottomY: 55,
    width: 20
  };
  const rows = [
    { distanceFromFront: 1, buildings: [partlySupportedRearBuilding] },
    { distanceFromFront: 0, buildings: [frontBuilding] }
  ];
  assert.deepEqual(cityBackgroundFlyingBuildings(rows), [partlySupportedRearBuilding]);
});

test("the ribbon reserves a bare fifteen-pixel quay before the first anchor", () => {
  assert.equal(BACKGROUND_CITY_QUAY_CLEARANCE, 15);
  assert.equal(CITY_LEFT, BASE_LEFT + 15);
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

test("opposite-bank buildings mirror complete right-growing placements into left-growing placements", () => {
  const generatedRows = layout({
    city: { ...LONDON, id: `${LONDON.id}|opposite-bank` },
    baseTopYByX: FALLING_BASE_TOP
  });
  const oppositeRows = oppositeBankCityBackgroundLayout({
    city: LONDON,
    frames: FRAMES,
    baseFrame: BASE_FRAME,
    baseTopYByX: FALLING_BASE_TOP,
    sceneWidth: 1365,
    parallaxAnchor: -0.12
  });
  assert.deepEqual(cityBackgroundFlyingBuildings(oppositeRows), []);
  for (const [rowIndex, row] of oppositeRows.entries()) {
    assert.equal(row.parallaxAnchor, -0.12);
    const source = generatedRows[rowIndex].buildings.map((building) => (
      `${building.frame.layer}:${1365 - building.x - building.width}:${building.y}:${building.width}`
    )).sort();
    const mirrored = row.buildings.map((building) => (
      `${building.frame.layer}:${building.x}:${building.y}:${building.width}`
    )).sort();
    assert.deepEqual(mirrored, source);
  }
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
});

test("atmospheric perspective stays on the Resurrect 64 palette", () => {
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

test("the ribbon top profile interpolates transparent gaps", () => {
  const alpha = new Uint8Array(5 * 5);
  for (const [x, top] of [[0, 0], [1, 1], [3, 3], [4, 4]]) {
    for (let y = top; y < 5; y++) alpha[y * 5 + x] = 255;
  }
  assert.deepEqual(
    Array.from(cityBackgroundBaseTopProfile({ alpha, width: 5, height: 5, sourceY: 100 })),
    [100, 101, 102, 103, 104]
  );
});

function layout({
  city = LONDON,
  frames = FRAMES,
  baseTopYByX = FLAT_BASE_TOP
} = {}) {
  return cityBackgroundLayout({
    city,
    frames,
    baseFrame: BASE_FRAME,
    baseTopYByX
  });
}

function allBuildings(rows) {
  return rows.flatMap((row) => row.buildings);
}

function frequencyCounts(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
  return [...counts.values()];
}

function frame(layer, width, height, x = 0, y = 0, extra = {}) {
  return Object.freeze({
    id: layer,
    layer,
    frame: Object.freeze({ x: 0, y: 0, w: width, h: height }),
    spriteSourceSize: Object.freeze({ x, y, w: width, h: height }),
    ...extra
  });
}

function rgbHex({ red, green, blue }) {
  return [red, green, blue].map((channel) => channel.toString(16).padStart(2, "0")).join("");
}
