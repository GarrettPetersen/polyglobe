import assert from "node:assert/strict";
import test from "node:test";

import { cityKey } from "./gameState.js";
import { buildPlayerPirateHideoutPorts } from "./piratePorts.js";

test("revealed pirate hideouts use village art and pirate allegiance without changing their market key", () => {
  const ports = [
    { cityId: "dover|united kingdom", tileId: 9, city: "Dover", displayCity: "Dover", country: "United Kingdom", factionId: "england" },
    { cityId: "calais|france", tileId: 3, city: "Calais", displayCity: "Calais", country: "France", factionId: "france" }
  ];
  const hideouts = buildPlayerPirateHideoutPorts(ports);

  assert.deepEqual(hideouts.map((port) => port.tileId), [3, 9]);
  assert.equal(hideouts[0].settlementType, "village");
  assert.equal(hideouts[0].factionId, "pirate");
  assert.equal(hideouts[0].isPirateHideout, true);
  assert.match(hideouts[0].portAlias, /Cove|Quay|Haven|Anchorage|Rest|water|Shoal|Key|Nest|Misfortune/);
  assert.equal(cityKey(hideouts[0]), cityKey(ports[1]));
});
