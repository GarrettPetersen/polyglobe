import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPortArrivalNavigation,
  portArrivalFlavor,
  portArrivalPresentation
} from "./portArrivalFlavor.js";

const TARAWA = Object.freeze({
  cityId: "tarawa-village|kiribati",
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

  assert.match(line, /distant islands|winds and stars|open ocean|swell|lashings/i);
  assert.doesNotMatch(line, /unlike anything/i);
});

test("return visits trade first-arrival surprise for recognition", () => {
  const line = portArrivalFlavor({
    city: TARAWA,
    playerShipSlug: "large-junk",
    playerShipLabel: "Large Junk",
    returning: true
  });

  assert.match(line, /remembered|return|known here|old anchorage|lookout/i);
});

test("Pacific greetings vary by visit while remaining deterministic", () => {
  const greetings = Array.from({ length: 24 }, (_, index) => portArrivalFlavor({
    city: TARAWA,
    playerShipSlug: "large-junk",
    playerShipLabel: "Large Junk",
    variationKey: String(index)
  }));

  assert.equal(new Set(greetings).size, 3);
  assert.equal(
    portArrivalFlavor({
      city: TARAWA,
      playerShipSlug: "large-junk",
      playerShipLabel: "Large Junk",
      variationKey: "same-arrival"
    }),
    portArrivalFlavor({
      city: TARAWA,
      playerShipSlug: "large-junk",
      playerShipLabel: "Large Junk",
      variationKey: "same-arrival"
    })
  );
});

test("ordinary regional waterfront observations vary between visits", () => {
  const city = { cityId: "istanbul|turkey", city: "Istanbul", cityType: "mediterranean", population: 180000 };
  const greetings = Array.from({ length: 12 }, (_, index) => portArrivalFlavor({
    city,
    playerShipSlug: "xebec",
    playerShipLabel: "Xebec",
    variationKey: String(index)
  }));

  assert.equal(new Set(greetings).size, 2);
});

test("major ports get region-specific waterfront observations", () => {
  const eastAsian = portArrivalFlavor({
    city: { cityId: "nanjing|china", city: "Nanjing", cityType: "east-asian", population: 160000 },
    playerShipSlug: "large-junk",
    playerShipLabel: "Large Junk"
  });
  const mediterranean = portArrivalFlavor({
    city: { cityId: "istanbul|turkey", city: "Istanbul", cityType: "mediterranean", population: 180000 },
    playerShipSlug: "xebec",
    playerShipLabel: "Xebec"
  });

  assert.match(eastAsian, /barges|river/i);
  assert.match(mediterranean, /galleys|harbor/i);
  assert.notEqual(eastAsian, mediterranean);
});

test("Northwest Coast villages react to an unfamiliar deep-water rig", () => {
  const presentation = portArrivalPresentation({
    city: {
      cityId: "yuquot-village|canada",
      city: "Yuquot Village",
      cityType: "mesoamerican",
      manualRegion: "northwest-coast",
      settlementType: "village",
      population: 1500
    },
    playerShipSlug: "large-junk",
    playerShipLabel: "Large Junk"
  });

  assert.match(presentation.text, /cedar canoes/i);
  assert.match(presentation.text, /masts and sail/i);
  assert.equal(presentation.notable, true);
});

test("Great Lakes villages recognize their freshwater isolation", () => {
  const presentation = portArrivalPresentation({
    city: {
      cityId: "wendat-village|canada",
      city: "Wendat Village",
      cityType: "mesoamerican",
      manualRegion: "great-lakes",
      settlementType: "village",
      population: 1800
    },
    playerShipSlug: "small-cog",
    playerShipLabel: "Small Cog"
  });

  assert.match(presentation.text, /freshwater country/i);
  assert.match(presentation.text, /inland/i);
});

test("Dongola and Timbuktu get specific remote African arrivals", () => {
  const dongola = portArrivalFlavor({
    city: { cityId: "dongola|sudan", city: "Dongola", cityType: "sub-saharan", population: 20000 },
    playerShipSlug: "carrack",
    playerShipLabel: "Carrack"
  });
  const timbuktu = portArrivalFlavor({
    city: { cityId: "tombouctou|mali", city: "Tombouctou", cityType: "sub-saharan", population: 25000 },
    playerShipSlug: "carrack",
    playerShipLabel: "Carrack"
  });

  assert.match(dongola, /farther up the Nile/i);
  assert.match(timbuktu, /Kabara by the Niger/i);
  assert.match(timbuktu, /salt merchants and scholars/i);
});

test("port remoteness is derived once from sailing access rather than dialogue-time guesses", () => {
  const ports = [
    { cityId: "coast|test", tileId: 1, city: "Coast", settlementType: "city" },
    { cityId: "upper-river|test", tileId: 2, city: "Upper River", settlementType: "city" },
    { cityId: "outer-island|test", tileId: 3, city: "Outer Island", settlementType: "village" }
  ];
  const distances = new Map([
    ["1:2", 1600],
    ["1:3", 1200],
    ["2:3", 2000]
  ]);
  const navigation = buildPortArrivalNavigation({
    ports,
    sailingDistanceKm: (origin, destination) => {
      if (origin.tileId === destination.tileId) return 0;
      return distances.get([origin.tileId, destination.tileId].sort((a, b) => a - b).join(":"));
    },
    approachKindForPort: (port) => port.tileId === 2 ? "river" : "ocean"
  });

  assert.deepEqual(navigation.get("coast|test"), {
    approachKind: "ocean",
    nearestPortDistanceKm: 1200,
    oceanAccessDistanceKm: 0,
    remote: false
  });
  assert.equal(navigation.get("upper-river|test").remote, true);
  assert.equal(navigation.get("upper-river|test").oceanAccessDistanceKm, 1600);
  assert.equal(navigation.get("outer-island|test").remote, true);
});
