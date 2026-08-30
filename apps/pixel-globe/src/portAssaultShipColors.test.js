import assert from "node:assert/strict";
import test from "node:test";

import {
  PORT_ASSAULT_COLOR_CLEANUP,
  borobudurOutriggerPortAssaultSurfaceColor,
  joseonPortAssaultSurfaceColor,
  mesoamericanDugoutPortAssaultSurfaceColor,
  oceanDhowPortAssaultSurfaceColor,
  ottomanTraderPortAssaultSurfaceColor
} from "./portAssaultShipColors.js";

test("Ocean Dhow dockside colors are flat by meaningful material, not triangle", () => {
  const hull = { sourceMaterialName: "badan_dhow", waterlineY: -0.7 };
  const point = { y: -0.6 };
  assert.deepEqual(
    oceanDhowPortAssaultSurfaceColor({ r: 2, g: 4, b: 8 }, hull, point),
    oceanDhowPortAssaultSurfaceColor({ r: 250, g: 220, b: 190 }, hull, point)
  );
  assert.deepEqual(
    oceanDhowPortAssaultSurfaceColor({ r: 0, g: 0, b: 0 }, hull, point),
    { r: 98, g: 85, b: 101, bakeLighting: false }
  );
  assert.notDeepEqual(
    oceanDhowPortAssaultSurfaceColor({ r: 0, g: 0, b: 0 }, hull, point),
    oceanDhowPortAssaultSurfaceColor(
      { r: 0, g: 0, b: 0 },
      { sourceMaterialName: "lantai_dhow", waterlineY: -0.7 },
      { ...point, modelX: 0.03, modelZ: 0.2 }
    )
  );
});

test("Ocean Dhow hull uses broad water-relative bands rather than mesh facets", () => {
  const surface = { sourceMaterialName: "badan_dhow", waterlineY: -0.7 };
  const colors = [-0.02, 0.03, 0.1, 0.2].map((height) => (
    oceanDhowPortAssaultSurfaceColor({}, surface, { y: surface.waterlineY + height })
  ));
  assert.deepEqual(colors, [
    { r: 46, g: 34, b: 47, bakeLighting: false },
    { r: 76, g: 62, b: 36, bakeLighting: false },
    { r: 98, g: 85, b: 101, bakeLighting: false },
    { r: 150, g: 108, b: 108, bakeLighting: false }
  ]);
});

test("Ocean Dhow deck uses broad fore-aft working regions rather than one flat fill", () => {
  const surface = { sourceMaterialName: "lantai_dhow", waterlineY: -0.84 };
  const colors = [-0.02, 0.25, 0.65].map((modelZ) => (
    oceanDhowPortAssaultSurfaceColor(
      { r: 54, g: 54, b: 54 },
      surface,
      { y: -0.69, modelX: 0.03, modelZ }
    )
  ));
  assert.deepEqual(colors, [
    { r: 98, g: 85, b: 101, bakeLighting: false },
    { r: 150, g: 108, b: 108, bakeLighting: false },
    { r: 171, g: 148, b: 122, bakeLighting: false }
  ]);
});

test("Ocean Dhow deck uses clean model-space plank seams instead of texture speckle", () => {
  const surface = { sourceMaterialName: "lantai_dhow", waterlineY: -0.84 };
  const seam = oceanDhowPortAssaultSurfaceColor(
    {},
    surface,
    { y: -0.69, modelX: 0, modelZ: 0.25 }
  );
  const plank = oceanDhowPortAssaultSurfaceColor(
    {},
    surface,
    { y: -0.69, modelX: 0.03, modelZ: 0.25 }
  );
  assert.deepEqual(seam, { r: 76, g: 62, b: 36, bakeLighting: false });
  assert.deepEqual(plank, { r: 150, g: 108, b: 108, bakeLighting: false });
});

test("Ocean Dhow raised afterdeck receives the same clean deck treatment", () => {
  const surface = {
    sourceMaterialName: "badan_dhow",
    waterlineY: -0.84,
    normal: { y: 1 }
  };
  assert.deepEqual(
    oceanDhowPortAssaultSurfaceColor(
      {},
      surface,
      { y: -0.55, modelX: 0.03, modelZ: -0.3 }
    ),
    { r: 98, g: 85, b: 101, bakeLighting: false }
  );
  assert.deepEqual(
    oceanDhowPortAssaultSurfaceColor(
      {},
      surface,
      { y: -0.55, modelX: 0, modelZ: -0.3 }
    ),
    { r: 76, g: 62, b: 36, bakeLighting: false }
  );
});

test("Ocean Dhow dockside palette covers its rig and fails on source drift", () => {
  for (const sourceMaterialName of [
    "worn_wood_dhow",
    "rope.002",
    "layar_dhow",
    "procedural-furled-sail-cloth"
  ]) {
    assert.equal(
      oceanDhowPortAssaultSurfaceColor(
        { r: 1, g: 2, b: 3 },
        { sourceMaterialName, waterlineY: -0.7 },
        { y: -0.6 }
      )
        .bakeLighting,
      false
    );
  }
  assert.throws(
    () => oceanDhowPortAssaultSurfaceColor(
      {},
      { sourceMaterialName: "new-material", waterlineY: -0.7 },
      { y: -0.6 }
    ),
    /Unmapped Ocean Dhow/
  );
});

test("dockside fleet cleanup uses one shared art-direction threshold", () => {
  assert.deepEqual(PORT_ASSAULT_COLOR_CLEANUP, {
    minimumRegionPixelsAtCityScale: 12,
    passes: 2
  });
});

test("Nusantaran Outrigger dockside colors replace texture mottling with named surfaces", () => {
  const surface = { sourceMaterialName: "cabin_cadik", waterlineY: -0.58 };
  assert.deepEqual(
    borobudurOutriggerPortAssaultSurfaceColor(
      { r: 20, g: 30, b: 40 },
      surface,
      { y: -0.43 }
    ),
    borobudurOutriggerPortAssaultSurfaceColor(
      { r: 230, g: 170, b: 80 },
      surface,
      { y: -0.43 }
    )
  );
  const materials = new Map([
    ["lantai_cadik", { y: -0.3 }],
    ["bamboo_wall", { y: 0 }],
    ["worn_wood_cadik", { y: 0 }],
    ["Kayu_gantung_Layar_cadik", { y: 0 }],
    ["rope.003", { y: 0 }],
    ["Layar_cadik", { y: 0 }],
    ["procedural-furled-sail-cloth", { y: 0 }]
  ]);
  for (const [sourceMaterialName, point] of materials) {
    assert.equal(
      borobudurOutriggerPortAssaultSurfaceColor(
        {},
        { sourceMaterialName, waterlineY: -0.58 },
        point
      ).bakeLighting,
      false
    );
  }
});

test("Nusantaran Outrigger hull uses a restrained wood ramp instead of the Dhow orange ramp", () => {
  const surface = { sourceMaterialName: "cabin_cadik", waterlineY: -0.58 };
  const colors = [-0.02, 0.04, 0.12, 0.24].map((height) => (
    borobudurOutriggerPortAssaultSurfaceColor(
      {},
      surface,
      { y: surface.waterlineY + height }
    )
  ));
  assert.deepEqual(colors, [
    { r: 46, g: 34, b: 47, bakeLighting: false },
    { r: 76, g: 62, b: 36, bakeLighting: false },
    { r: 98, g: 85, b: 101, bakeLighting: false },
    { r: 150, g: 108, b: 108, bakeLighting: false }
  ]);
});

test("Joseon dockside ships retain distinct structural surfaces", () => {
  const expected = new Map([
    ["bottom", { r: 171, g: 148, b: 122, bakeLighting: false }],
    ["wood_bottom", { r: 76, g: 62, b: 36, bakeLighting: false }],
    ["wood_dark", { r: 46, g: 34, b: 47, bakeLighting: false }],
    ["wood_frame", { r: 46, g: 34, b: 47, bakeLighting: false }],
    ["wood_middle", { r: 98, g: 85, b: 101, bakeLighting: false }],
    ["wood_wall", { r: 150, g: 108, b: 108, bakeLighting: false }],
    ["shield", { r: 150, g: 108, b: 108, bakeLighting: false }],
    ["wood_light", { r: 171, g: 148, b: 122, bakeLighting: false }],
    ["wood_window", { r: 46, g: 34, b: 47, bakeLighting: false }],
    ["tent", { r: 121, g: 105, b: 141, bakeLighting: false }],
    ["door_handle", { r: 67, g: 83, b: 76, bakeLighting: false }],
    ["Material.001", { r: 67, g: 83, b: 76, bakeLighting: false }],
    ["Material.002", { r: 199, g: 178, b: 141, bakeLighting: false }],
    ["paddle", { r: 76, g: 62, b: 36, bakeLighting: false }],
    ["sail", { r: 199, g: 220, b: 208, bakeLighting: false }],
    ["procedural-furled-sail-cloth", { r: 199, g: 220, b: 208, bakeLighting: false }]
  ]);
  for (const [sourceMaterialName, color] of expected) {
    assert.deepEqual(joseonPortAssaultSurfaceColor({}, { sourceMaterialName }), color);
  }
  assert.equal(new Set([...expected.values()].map((color) => `${color.r},${color.g},${color.b}`)).size, 9);
  assert.deepEqual(
    joseonPortAssaultSurfaceColor(
      { r: 140, g: 86, b: 48 },
      { sourceMaterialName: null }
    ),
    { r: 140, g: 86, b: 48 }
  );
});

test("Mesoamerican dugout uses broad vertical timber bands instead of orange facets", () => {
  const surface = { sourceMaterialName: "Canoe", waterlineY: -0.2 };
  const colors = [-0.02, 0.03, 0.09, 0.16, 0.24].map((height) => (
    mesoamericanDugoutPortAssaultSurfaceColor({}, surface, {
      y: surface.waterlineY + height
    })
  ));
  assert.deepEqual(colors, [
    { r: 46, g: 34, b: 47, bakeLighting: false },
    { r: 76, g: 62, b: 36, bakeLighting: false },
    { r: 98, g: 85, b: 101, bakeLighting: false },
    { r: 150, g: 108, b: 108, bakeLighting: false },
    { r: 171, g: 148, b: 122, bakeLighting: false }
  ]);
  assert.deepEqual(
    mesoamericanDugoutPortAssaultSurfaceColor(
      { r: 111, g: 68, b: 44 },
      { sourceMaterialName: null },
      { y: 0 }
    ),
    { r: 111, g: 68, b: 44 }
  );
});

test("Ottoman trader separates hull bands, structural timber, rig, and hardware", () => {
  const hull = { sourceMaterialName: "Wood", sourceMeshName: "Cube_Wood_0", waterlineY: -0.9 };
  const hullColors = [-0.02, 0.04, 0.14, 0.26, 0.4].map((height) => (
    ottomanTraderPortAssaultSurfaceColor({}, hull, { y: hull.waterlineY + height })
  ));
  assert.equal(new Set(hullColors.map((color) => `${color.r},${color.g},${color.b}`)).size, 5);
  assert.deepEqual(
    ottomanTraderPortAssaultSurfaceColor(
      {},
      { sourceMaterialName: "Wood", sourceMeshName: "Cylinder_Wood_0", waterlineY: -0.9 },
      { y: 1 }
    ),
    { r: 76, g: 62, b: 36, bakeLighting: false }
  );
  for (const sourceMaterialName of ["Deadeye", "Rope.001", "Metal", "Material", "Material.002", "Sail", "procedural-furled-sail-cloth"]) {
    assert.equal(
      ottomanTraderPortAssaultSurfaceColor(
        {},
        { sourceMaterialName, waterlineY: -0.9 },
        { y: 0 }
      ).bakeLighting,
      false
    );
  }
});

test("ship-specific dockside palettes fail loudly when source materials drift", () => {
  assert.throws(
    () => joseonPortAssaultSurfaceColor({}, { sourceMaterialName: "new" }),
    /Unmapped Joseon/
  );
  assert.throws(
    () => mesoamericanDugoutPortAssaultSurfaceColor(
      {},
      { sourceMaterialName: "new", waterlineY: 0 },
      { y: 0 }
    ),
    /Unmapped Mesoamerican/
  );
  assert.throws(
    () => ottomanTraderPortAssaultSurfaceColor(
      {},
      { sourceMaterialName: "new", waterlineY: 0 },
      { y: 0 }
    ),
    /Unmapped Ottoman/
  );
});
