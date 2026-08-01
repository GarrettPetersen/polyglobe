import assert from "node:assert/strict";
import test from "node:test";

import { selectAccessibleFactionMissionPort } from "./missionPortSelection.js";

test("Papal missions choose a reachable Mediterranean port in the demo", () => {
  const ports = [
    { tileId: 1, city: "Paris", factionId: "france", population: 90000, capitalOfFactionId: "france" },
    { tileId: 2, city: "Marseille", factionId: "france", population: 30000 }
  ];
  assert.equal(
    selectAccessibleFactionMissionPort(ports, "france", new Set([2])).city,
    "Marseille"
  );
  assert.equal(selectAccessibleFactionMissionPort(ports, "france", new Set()), null);
});
