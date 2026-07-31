import assert from "node:assert/strict";
import test from "node:test";

import { portArrivalFlavor } from "./portArrivalFlavor.js";

const TARAWA = Object.freeze({
  city: "Tarawa Village",
  cityType: "polynesian",
  manualRegion: "pacific-islands",
  settlementType: "village",
  islandSettlement: true,
  population: 1800
});

test("a remote Pacific village reacts to an unfamiliar junk crossing its reef", () => {
  const line = portArrivalFlavor({
    city: TARAWA,
    playerShipSlug: "large-junk",
    playerShipLabel: "Large Junk"
  });

  assert.match(line, /unlike anything|whole village/i);
  assert.match(line, /junk/i);
  assert.match(line, /reef/i);
  assert.doesNotMatch(line, /small harbors remember/i);
});

test("a remote Pacific village recognizes a locally familiar canoe silhouette", () => {
  const line = portArrivalFlavor({
    city: TARAWA,
    playerShipSlug: "polynesian-voyaging-canoe",
    playerShipLabel: "Polynesian Voyaging Canoe"
  });

  assert.match(line, /distant islands|winds and stars/i);
  assert.doesNotMatch(line, /unlike anything/i);
});

test("return visits trade first-arrival surprise for recognition", () => {
  const line = portArrivalFlavor({
    city: TARAWA,
    playerShipSlug: "large-junk",
    playerShipLabel: "Large Junk",
    returning: true
  });

  assert.match(line, /remembered|return/i);
});

test("major ports get region-specific waterfront observations", () => {
  const eastAsian = portArrivalFlavor({
    city: { city: "Nanjing", cityType: "east-asian", population: 160000 },
    playerShipSlug: "large-junk",
    playerShipLabel: "Large Junk"
  });
  const mediterranean = portArrivalFlavor({
    city: { city: "Istanbul", cityType: "mediterranean", population: 180000 },
    playerShipSlug: "xebec",
    playerShipLabel: "Xebec"
  });

  assert.match(eastAsian, /barges|river/i);
  assert.match(mediterranean, /galleys|harbor/i);
  assert.notEqual(eastAsian, mediterranean);
});
