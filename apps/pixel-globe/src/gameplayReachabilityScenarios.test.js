import assert from "node:assert/strict";
import test from "node:test";

import { captureScenarioFromSearch } from "./captureScenarios.js";
import {
  GAMEPLAY_REACHABILITY_SCENARIOS,
  gameplayReachabilityScenarioIds
} from "./gameplayReachabilityScenarios.js";

test("gameplay reachability uses a dedicated catalog independent of promotional captures", () => {
  const fastIds = gameplayReachabilityScenarioIds("fast");
  const releaseIds = gameplayReachabilityScenarioIds("release");

  assert.ok(fastIds.length >= 3);
  assert.deepEqual(new Set(releaseIds), new Set(Object.keys(GAMEPLAY_REACHABILITY_SCENARIOS)));
  assert.ok(fastIds.every((id) => releaseIds.includes(id)));
  assert.ok(releaseIds.every((id) => id.startsWith("reachability-")));
  assert.ok(releaseIds.every((id) => !/trailer|short|screenshot/.test(id)));
  assert.deepEqual(
    new Set(releaseIds.map((id) => captureScenarioFromSearch(`?capture=${id}`).sequence.kind)),
    new Set(["sail", "fight", "pillage", "colonize", "whale", "city"])
  );
  assert.deepEqual(
    new Set(releaseIds.map((id) => {
      const { kind, variant } = captureScenarioFromSearch(`?capture=${id}`).sequence;
      return `${kind}:${variant}`;
    })),
    new Set([
      "city:chef-feast",
      "sail:beam-reach",
      "sail:row-upwind",
      "fight:broadside",
      "fight:2v2-broadside",
      "fight:small-arms",
      "pillage:bombard",
      "pillage:assault",
      "colonize:found",
      "colonize:resupply",
      "colonize:city",
      "colonize:investigate",
      "colonize:ruins",
      "whale:harpoon",
      "whale:finish"
    ])
  );
  assert.deepEqual(
    releaseIds
      .map((id) => captureScenarioFromSearch(`?capture=${id}`))
      .filter(({ sequence }) => sequence.variant === "assault")
      .map(({ sequence }) => sequence.cityId)
      .sort(),
    ["akkeshi kotan|japan", "london|united kingdom"]
  );
});

test("reachability profiles fail loudly instead of selecting an implicit default", () => {
  assert.throws(() => gameplayReachabilityScenarioIds("nightly"), /Unknown gameplay reachability profile/);
});
