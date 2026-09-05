import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { auditPortDialogueReachability } from "./port-dialogue-reachability.mjs";

const catalog = JSON.parse(await readFile(new URL(
  "../../city-visualizer/data/cities.json",
  import.meta.url
), "utf8"));

test("every port exposes a reachable ordinary city journey", () => {
  const result = auditPortDialogueReachability(catalog.cities, { profile: "fast" });

  assert.equal(result.cityCount, catalog.cityCount);
  assert.ok(result.stateCount >= result.cityCount * 2, result);
  assert.ok(result.transitionCount >= result.cityCount * 2, result);
  assert.deepEqual(result.locationIds, [
    "authority",
    "equipment",
    "illicit-merchant",
    "inn",
    "market",
    "set-sail",
    "ship",
    "shipyard"
  ]);
  for (const nodeId of ["cargo", "equipment", "garrison", "inn-drink", "loadout", "market", "shipyard"]) {
    assert.ok(result.nodeIds.includes(nodeId), `fast reachability missed ${nodeId}`);
  }
  for (const actionType of ["buy", "buy-max", "open-crew-recruitment", "confirm-ship-purchase"]) {
    assert.ok(result.actionTypes.includes(actionType), `enabled action was not exercised: ${actionType}`);
  }
  for (const nodeId of ["chef-quest", "caribbean-ginger", "viking-longship", "crew-recruitment"]) {
    assert.ok(result.nodeIds.includes(nodeId), `NPC was not visited: ${nodeId}`);
  }
});
