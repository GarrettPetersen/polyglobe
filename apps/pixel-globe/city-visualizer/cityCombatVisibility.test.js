import assert from "node:assert/strict";
import test from "node:test";
import { cityCombatEntryOpacity, cityAssaultFacadeFoundationHeight } from "./cityCombatVisibility.js";
import { cityRuinsDamage } from "./cityColonyRuins.js";

test("authored foreground services leave low foundations while fortress pieces stay intact", () => {
  for (const layerName of ["Inn", "Smith", "Home", "Home 2", "Market Stall",
    "Market Stall Copy", "Market Stall Copy Copy", "Shipyard"]) {
    const height = 80;
    const foundationHeight = cityAssaultFacadeFoundationHeight(layerName, height);
    const mask = cityRuinsDamage({ alpha: new Uint8Array(20 * height).fill(255),
      width: 20, height, foundationHeight, seed: 7 });
    assert.ok(mask.hole.filter(value => value === 1).length > 20 * height * .65, layerName);
  }
  for (const layer of ["Gate", "Near Castle", "Far Castle", "Dock", "Sky"]) {
    assert.equal(cityAssaultFacadeFoundationHeight(layer, 80), null);
  }
  assert.throws(() => cityAssaultFacadeFoundationHeight("Inn", NaN), /Invalid assault facade/);
});
test("assault cutaways expose all lanes behind foreground facades without reordering scenery", () => {
  for (const layerName of ["Inn", "Smith", "Home", "Market Stall", "Near Castle"]) {
    const entry = { kind: "static", layerName, z: 70 };
    assert.equal(cityCombatEntryOpacity(entry, true), 1);
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
