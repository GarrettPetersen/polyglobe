import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { auditPortDialogueReachability } from "./port-dialogue-reachability.mjs";

const catalog = JSON.parse(await readFile(new URL(
  "../../city-visualizer/data/cities.json",
  import.meta.url
), "utf8"));

test("[release reachability] every port survives deeper offered dialogue navigation", () => {
  const result = auditPortDialogueReachability(catalog.cities, { profile: "release" });

  assert.equal(result.cityCount, catalog.cityCount);
  assert.ok(result.stateCount >= result.cityCount * 6, result);
  assert.ok(result.transitionCount >= result.cityCount * 8, result);
  for (const nodeId of [
    "cargo",
    "custom-loadout",
    "equipment",
    "equipment-cannons",
    "equipment-harpoons",
    "equipment-nets",
    "garrison",
    "inn-drink",
    "loadout",
    "market",
    "quest",
    "root",
    "shipyard"
  ]) {
    assert.ok(result.nodeIds.includes(nodeId), `release reachability missed ${nodeId}`);
  }
});
