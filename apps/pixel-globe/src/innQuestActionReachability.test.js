import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { auditInnQuestDialogueReachability } from "../tools/reachability/port-dialogue-reachability.mjs";

const catalog = JSON.parse(readFileSync(new URL("../city-visualizer/data/cities.json", import.meta.url), "utf8"));

test("optional inn quest actions stay renderable through deliveries and reward decisions", () => {
  const results = auditInnQuestDialogueReachability(catalog.cities);
  assert.equal(results.length, 7);
  const viking = results.find(({ nodeId, supplied }) => nodeId === "viking-longship" && supplied);
  for (const kind of ["deliver-viking-material", "accept-viking-longship-reward", "decline-viking-longship-reward", "purchase-viking-longship"]) {
    assert.ok(viking.actionKinds.includes(kind), `Viking quest did not reach ${kind}`);
  }
  const chef = results.find(({ nodeId, supplied }) => nodeId === "chef-quest" && supplied);
  assert.ok(chef.actionKinds.includes("deliver-chef-ingredients"));
  assert.ok(chef.actionKinds.includes("recruit-chef"));
  const fullCrew = results.find(({ nodeId, supplied, freeBerth }) => (
    nodeId === "chef-quest" && supplied && !freeBerth
  ));
  assert.ok(!fullCrew.actionKinds.includes("recruit-chef"));
  const ginger = results.find(({ nodeId, supplied }) => nodeId === "caribbean-ginger" && supplied);
  assert.ok(ginger.actionKinds.includes("deliver-caribbean-ginger"));
  for (const result of results.filter(({ supplied }) => !supplied)) {
    assert.ok(result.actionKinds.every((kind) => !kind.startsWith("deliver-")),
      `${result.nodeId} enabled a delivery from an empty hold`);
  }
});
