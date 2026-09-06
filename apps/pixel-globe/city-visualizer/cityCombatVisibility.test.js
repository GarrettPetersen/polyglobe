import assert from "node:assert/strict";
import test from "node:test";
import { cityCombatEntryOpacity } from "./cityCombatVisibility.js";
test("assault cutaways expose all lanes behind foreground facades without reordering scenery", () => {
  for (const layerName of ["Inn", "Smith", "Home", "Market Stall", "Near Castle"]) {
    const entry = { kind: "static", layerName, z: 70 };
    assert.equal(cityCombatEntryOpacity(entry, true), 0.22);
    assert.equal(cityCombatEntryOpacity(entry, false), 1);
    assert.equal(entry.z, 70);
  }
  for (const entry of [{ kind: "static", layerName: "Inn", z: 40 },
    { kind: "static", layerName: "Sand Beach", z: 90 },
    { kind: "tree-shadow", z: 90 }, { kind: "port-assault", z: 70 }]) {
    assert.equal(cityCombatEntryOpacity(entry, true), 1);
  }
  assert.throws(() => cityCombatEntryOpacity({}, true), /painter depth/);
});
