import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./main.js", import.meta.url), "utf8");

function functionSource(name, nextName) {
  const start = source.indexOf(`function ${name}(`);
  const end = source.indexOf(`function ${nextName}(`, start + 1);
  assert.ok(start >= 0, `${name} is missing`);
  assert.ok(end > start, `${name} has no ${nextName} boundary`);
  return source.slice(start, end);
}

test("NPC visual mutations always invalidate the spatial index", () => {
  assert.equal(source.match(/npcVisualShips\.set\(/g)?.length, 1);
  assert.equal(source.match(/npcVisualShips\.delete\(/g)?.length, 1);
  assert.equal(source.match(/npcVisualShips\.clear\(/g)?.length, 1);
  assert.match(functionSource("setNpcVisualShipState", "deleteNpcVisualShipState"), /worldSpatialFastEntriesDirty = true/);
  assert.match(functionSource("deleteNpcVisualShipState", "clearNpcVisualShipStates"), /worldSpatialFastEntriesDirty = true/);
  assert.match(functionSource("clearNpcVisualShipStates", "refreshWorldSpatialStaticEntries"), /worldSpatialFastEntriesDirty = true/);
});

test("cannon collision queries refresh invalidated NPC spatial entries", () => {
  for (const [name, nextName] of [
    ["resolvePlayerCannonPathHit", "resolvePlayerNavalImpact"],
    ["resolveNpcCannonPathHit", "resolveNpcCombatImpact"]
  ]) {
    assert.match(
      functionSource(name, nextName),
      /worldSpatialChart !== chart \|\| worldSpatialFastEntriesDirty/
    );
  }
});
