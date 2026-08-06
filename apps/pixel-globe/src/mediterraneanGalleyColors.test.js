import assert from "node:assert/strict";
import test from "node:test";
import {
  fustaHullColor,
  galleassHullColor,
  mediterraneanGalleyHullColor
} from "./mediterraneanGalleyColors.js";

const midTimber = Object.freeze({ r: 128, g: 96, b: 64 });

test("Mediterranean galley derivatives use distinct hull palettes", () => {
  const hull = { sourceMeshName: "Object_14" };
  assert.notDeepEqual(mediterraneanGalleyHullColor(midTimber, hull), midTimber);
  assert.notDeepEqual(fustaHullColor(midTimber, hull), midTimber);
  assert.notDeepEqual(
    mediterraneanGalleyHullColor(midTimber, hull),
    fustaHullColor(midTimber, hull)
  );
});

test("Mediterranean galley color transforms leave sails and rigging untouched", () => {
  for (const sourceMeshName of ["Object_13", "Object_17", "Object_20"]) {
    const surface = { sourceMeshName };
    assert.equal(mediterraneanGalleyHullColor(midTimber, surface), midTimber);
    assert.equal(fustaHullColor(midTimber, surface), midTimber);
    assert.equal(galleassHullColor(midTimber, surface), midTimber);
  }
  assert.equal(fustaHullColor(midTimber, {}), midTimber);
});

test("Galleass preserves its dark lower hull and colors only upper planking", () => {
  assert.equal(galleassHullColor(midTimber, { sourceMeshName: "Object_21" }), midTimber);
  assert.notDeepEqual(galleassHullColor(midTimber, { sourceMeshName: "Object_24" }), midTimber);
});
