import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildGeodesicGraph, createDirectionIndex, findNearestTileId } from "./geodesic.js";
import {
  FACTION_CAPITALS_1522,
  NEUTRAL_FACTION_ID,
  factionCapitalCityRecords1522,
  factionCapitalForCity,
  factionIdForCity1522
} from "./factions.js";
import {
  MANUAL_BLOCKED_RIVER_HEX_EDGES_BY_SUBDIVISIONS,
  MANUAL_CITY_RIVER_HEX_CHAINS_BY_SUBDIVISIONS,
  MANUAL_RIVER_HEX_CHAINS_BY_SUBDIVISIONS,
  MANUAL_RIVER_MOUTH_EDGES_BY_SUBDIVISIONS,
  removeBlockedRiverEdgesFromMasks
} from "./manualRiverHexChains.js";
import { applyManualTerrainOverrides } from "./manualTerrainOverrides.js";
import {
  CITY_COASTAL_REPLACEMENT_RADIUS_KM,
  CITY_OBSERVATION_RELEVANCE_YEARS,
  MANUAL_CITY_RECORDS_1522,
  cityCatalogSelectionScore,
  cityDatasetRecordAllowedIn1522,
  cityPopulationObservationAtYear,
  cityRequiresPortAccess,
  selectCityCatalogRecords
} from "./cityCatalogSelection.js";
import { cityHasPortAccess, cityPortAccessRingDistance } from "./cityPortAccess.js";
import {
  COLONIAL_FOUNDING_CONQUERED,
  COLONIAL_FOUNDING_NEGOTIATED,
  COLONIAL_FOUNDING_SETTLER,
  COLONIAL_CITY_FOUNDINGS,
  COLONIZATION_TARGETS,
  colonialFoundingForCity,
  colonizationTargetForCity,
  withColonialFounding
} from "./colonialCities.js";

const SUBDIVISIONS = 7;
const CITY_CATALOG_MAX_COUNT = 480;
const repoRoot = new URL("../../../", import.meta.url);

test("water-access intent gives small gameplay ports selection weight", () => {
  const inland = { city: "Large Inland", population: 40000 };
  const port = { city: "Small Port", population: 5000, coastalIntent: true };

  assert.ok(cityCatalogSelectionScore(port) > cityCatalogSelectionScore(inland));
  assert.deepEqual(
    selectCityCatalogRecords([inland, port], 1).map((city) => city.city),
    ["Small Port"]
  );
});

test("a nearby larger coastal city replaces a minor inland city", () => {
  const nara = { city: "Nara City", country: "Japan", lat: 34.685333, lon: 135.832742, population: 10000 };
  const sakai = {
    city: "Sakai",
    country: "Japan",
    lat: 34.573333,
    lon: 135.483056,
    population: 30000,
    coastalIntent: true
  };
  const kyoto = { city: "Kyoto", country: "Japan", lat: 35.02107, lon: 135.75385, population: 66400 };

  assert.equal(CITY_COASTAL_REPLACEMENT_RADIUS_KM, 50);
  assert.deepEqual(
    selectCityCatalogRecords([nara, sakai, kyoto], 3).map((city) => city.city),
    ["Sakai", "Kyoto"]
  );
});

test("city observations cannot be extrapolated indefinitely", () => {
  const recent = cityPopulationObservationAtYear([
    { year: 1500, population: 12000 }
  ], 1522);
  const stale = cityPopulationObservationAtYear([
    { year: 1522 - CITY_OBSERVATION_RELEVANCE_YEARS - 1, population: 12000 }
  ], 1522);

  assert.equal(recent.population, 12000);
  assert.equal(recent.sourceYear, 1500);
  assert.equal(stale, null);
  assert.equal(cityPopulationObservationAtYear([
    { year: -1300, population: 10000 }
  ], 1522, { allowStaleObservation: true }).population, 10000);
});

test("later observations provide continuity and interpolate the 1522 population", () => {
  const estimate = cityPopulationObservationAtYear([
    { year: 1500, population: 10000 },
    { year: 1600, population: 20000 }
  ], 1522);

  assert.equal(estimate.population, 12200);
  assert.equal(estimate.sourceYear, 1500);
  assert.equal(estimate.nextSourceYear, 1600);
});

test("distant future rows cannot revive an ancient city or backfill a new one", () => {
  assert.equal(cityPopulationObservationAtYear([
    { year: -300, population: 100000 },
    { year: 1975, population: 846000 }
  ], 1522), null);
  assert.equal(cityPopulationObservationAtYear([
    { year: 1590, population: 10000 }
  ], 1522), null);
  assert.equal(cityPopulationObservationAtYear([
    { year: 100, population: 65000 },
    { year: 1594, population: 10000 }
  ], 1522).sourceYear, 1594);
});

test("modern Cincinnati is not substituted for its pre-contact archaeological record", () => {
  assert.equal(cityDatasetRecordAllowedIn1522("Cincinnati", "United States of America"), false);
  assert.equal(cityDatasetRecordAllowedIn1522("Chillicothe", "United States of America"), true);
  assert.equal(cityDatasetRecordAllowedIn1522("Syracuse", "Greece"), false);
  assert.equal(cityDatasetRecordAllowedIn1522("Syracuse", "Italy"), true);
});

test("1522 city selection keeps enough British Isles ports and Inca access", async () => {
  const [earth, csv] = await Promise.all([
    readJson(new URL("examples/globe-demo/public/earth-globe-cache-7.json", repoRoot)),
    readFile(
      new URL("examples/globe-demo/public/datasets/urbanization-dominance-pruned/urbanization-dominance-pruned.csv", repoRoot),
      "utf8"
    )
  ]);
  const graph = buildGeodesicGraph(SUBDIVISIONS);
  const directionIndex = createDirectionIndex(graph);
  earth.tiles = applyManualTerrainOverrides(earth.tiles, SUBDIVISIONS);
  const { masks, toWaterMasks } = buildRiverMasks(graph, earth);
  const reachable = buildOceanReachableNavigationMask(graph, earth.tiles, masks, toWaterMasks);
  const cityRecords = buildCityRecords1522(csv);
  for (const [city, country] of [
    ["Troy", "Turkey"],
    ["Hattusa", "Turkey"],
    ["Mycenae", "Greece"],
    ["Teotihuacan", "Mexico"],
    ["Cincinnati", "United States of America"]
  ]) {
    assert.equal(cityRecords.has(cityKey(city, country)), false, `${city} should not survive into 1522`);
  }
  for (const [city, country] of [
    ["Athens", "Greece"],
    ["Rome", "Italy"],
    ["Exeter", "United Kingdom"]
  ]) {
    assert.equal(cityRecords.has(cityKey(city, country)), true, `${city} should remain active in 1522`);
  }
  const selected = ensureRequiredCities(
    selectCityCatalogRecords(cityRecords.values(), CITY_CATALOG_MAX_COUNT),
    cityRecords
  );
  const placed = placeCityRecords(graph, directionIndex, earth.tiles, reachable, masks, selected);
  const ports = placed.filter((city) => city.dockable);
  const manualCityRiverChains = MANUAL_CITY_RIVER_HEX_CHAINS_BY_SUBDIVISIONS[SUBDIVISIONS];
  const missingManualRiverPorts = Object.entries(manualCityRiverChains)
    .filter(([cityName, chain]) => !ports.some((city) => city.city === cityName && city.tileId === chain[0]))
    .map(([cityName]) => cityName);
  const britishIslesPorts = ports.filter((city) =>
    city.country === "United Kingdom" || city.country === "Ireland"
  );
  const glasgow = ports.find((city) => city.city === "Glasgow" && city.country === "United Kingdom");
  const incaPorts = ports.filter((city) => city.factionId === "inca");
  const cambay = ports.find((city) => city.city === "Cambay" && city.country === "India");
  const edo = ports.find((city) => city.city === "Edo" && city.country === "Japan");
  const sakai = ports.find((city) => city.city === "Sakai" && city.country === "Japan");
  const kilwa = ports.find((city) => city.city === "Kilwa" && city.country === "Tanzania");
  const portByCity = new Map(ports.map((city) => [city.city, city]));
  const pacificVillages = ports.filter((city) => city.manualRegion === "pacific-islands");
  const encounterVillages = ports.filter((city) => city.manualRegion === "explorer-encounters");
  const islandVillages = ports.filter((city) => city.islandSettlement);
  const spiceIslandVillages = ports.filter((city) =>
    city.manualRegion === "spice-islands" && city.settlementType === "village"
  );
  const northwestCoastVillages = ports.filter((city) => city.manualRegion === "northwest-coast");
  const greatLakesVillages = ports.filter((city) => city.manualRegion === "great-lakes");
  const mesoamericanVillages = ports.filter((city) => city.manualRegion === "mesoamerican-villages");
  const manualPortFailures = MANUAL_CITY_RECORDS_1522
    .filter((manualSpec) => !ports.some((city) =>
      city.city === manualSpec.city &&
      city.country === manualSpec.country &&
      city.manualRegion === manualSpec.manualRegion
    ))
    .map((manualSpec) => `${manualSpec.city}, ${manualSpec.country}`);

  assert.ok(
    britishIslesPorts.length >= 5,
    `expected at least five British Isles ports, got ${britishIslesPorts.map(cityLabel).join(", ")}`
  );
  assert.ok(
    incaPorts.length >= 1,
    `expected at least one Inca port, got ${incaPorts.map(cityLabel).join(", ")}`
  );
  assert.deepEqual(
    missingManualRiverPorts,
    [],
    "expected every named manual river city to remain a dockable port on its mapped tile"
  );
  assert.ok(britishIslesPorts.some((city) => city.city === "Exeter"));
  assert.ok(glasgow, "Glasgow should reach the Irish Sea through the Clyde");
  assert.equal(glasgow.factionId, "scotland");
  assert.ok(incaPorts.some((city) => city.city === "Chanchan" || city.city === "Pachacamac"));
  assert.ok(cambay, "Cambay should be a dockable Gujarat capital");
  assert.ok(sakai, "Sakai should replace nearby landlocked Nara as the Osaka Bay port");
  assert.equal(
    selected.some((city) => city.city === "Nara City" && city.country === "Japan"),
    false,
    "minor inland Nara should not displace more populous coastal Sakai"
  );
  assert.ok(edo, "Edo should be a dockable village in Tokyo Bay");
  assert.equal(edo.settlementType, "village");
  assert.equal(edo.factionId, "japan");
  assert.deepEqual(edo.marketGoods, ["fish", "grain", "timber"]);
  assert.equal(greatLakesVillages.length, 1, "the Great Lakes should have one dockable Wendat village");
  assert.equal(greatLakesVillages[0].city, "Wendat Village");
  assert.equal(greatLakesVillages[0].settlementType, "village");
  assert.deepEqual(greatLakesVillages[0].marketGoods, ["beaver-pelts", "fish", "grain"]);
  assert.ok(
    graph.neighbors[greatLakesVillages[0].tileId].some((tileId) => earth.tiles[tileId].t === "lake"),
    "the Wendat village should sit directly beside Great Lakes freshwater"
  );
  assert.ok(kilwa, "Kilwa should be a dockable Swahili-coast island port");
  assert.equal(kilwa.lon, 39.51);
  assert.ok(
    cityPortAccessRingDistance({
      graph,
      earthRows: earth.tiles,
      reachableNavigationMask: reachable,
      riverMasks: masks,
      tileId: kilwa.tileId
    }) <= 1,
    "Kilwa should be visibly adjacent to ocean-reachable water"
  );
  const hafnarfjordur = ports.find((city) => city.city === "Hafnarfjordur" && city.country === "Iceland");
  assert.ok(hafnarfjordur, "Hafnarfjordur should be a dockable Icelandic port");
  assert.equal(hafnarfjordur.cityType, "northern-european");
  assert.equal(cambay.factionId, "gujarat");
  assert.equal(earth.tiles[38891].t, "beach", "Cambay's historical bay should be shallow water");
  assert.ok(graph.neighbors[cambay.tileId].includes(38891), "Cambay should sit beside its corrected harbor");
  assert.ok(
    cityPortAccessRingDistance({
      graph,
      earthRows: earth.tiles,
      reachableNavigationMask: reachable,
      riverMasks: masks,
      tileId: cambay.tileId
    }) <= 1,
    "Cambay should be visibly adjacent to navigable water"
  );
  assert.deepEqual(
    pacificVillages.map((city) => city.city).sort(),
    [
      "Bay of Islands Village",
      "Fiji Village",
      "Hawaii Village",
      "Niue Village",
      "Rangiroa Village",
      "Rapa Nui Village",
      "Rarotonga Village",
      "Samoa Village",
      "Tahiti Village",
      "Tarawa Village",
      "Tonga Village"
    ]
  );
  assert.ok(pacificVillages.every((city) => city.cityType === "polynesian"));
  assert.ok(pacificVillages.every((city) => city.settlementType === "village"));
  assert.equal(
    islandVillages.length,
    MANUAL_CITY_RECORDS_1522.filter((city) => city.islandSettlement).length
  );
  for (const city of islandVillages) {
    const intendedTileId = findNearestTileId(
      graph,
      directionIndex,
      latLonToDirection(city.lat, city.lon)
    );
    assert.equal(
      city.tileId,
      intendedTileId,
      `${city.city} must remain on the island at its real coordinates`
    );
    assert.equal(
      isCityDrawableTile(earth.tiles, city.tileId),
      true,
      `${city.city} must be drawn on land`
    );
    assert.equal(
      cityHasPortAccess({
        graph,
        earthRows: earth.tiles,
        reachableNavigationMask: reachable,
        riverMasks: masks,
        tileId: city.tileId
      }),
      true,
      `${city.city} must remain dockable`
    );
  }
  for (const cityName of [
    "Bastia",
    "Cagliari",
    "Ceuta",
    "Algiers",
    "Tripoli",
    "Birgu",
    "Syracuse",
    "Ragusa",
    "Kerkira",
    "Funchal",
    "Angra",
    "Las Palmas",
    "Ribeira Grande",
    "Sao Tome",
    "Suez",
    "Male",
    "Maynila",
    "San Juan",
    "Zanzibar",
    "Suq"
  ]) {
    assert.ok(portByCity.has(cityName), `${cityName} should be restored as a 1522 port`);
  }
  assert.equal(portByCity.get("Bastia").factionId, "genoa");
  assert.equal(portByCity.get("Cagliari").factionId, "spain");
  assert.equal(portByCity.get("Ceuta").factionId, "portugal");
  assert.equal(portByCity.get("Algiers").factionId, "ottoman");
  assert.equal(portByCity.get("Tripoli").factionId, "spain");
  assert.equal(portByCity.get("Birgu").factionId, "spain");
  assert.equal(portByCity.get("Kerkira").factionId, "venice");
  assert.deepEqual(
    encounterVillages.map((city) => city.city).sort(),
    [
      "Coroa Vermelha Village",
      "Guanahani Village",
      "Mactan Village",
      "Mossel Bay Village",
      "Umatac Village",
      "Vaitahu Village"
    ]
  );
  assert.ok(encounterVillages.every((city) => city.settlementType === "village"));
  assert.deepEqual(
    spiceIslandVillages.map((city) => city.city).sort(),
    ["Banda Village", "Buru Village", "Gane Village", "Hitu Village", "Makian Village"]
  );
  assert.deepEqual(
    Object.fromEntries(spiceIslandVillages.map((city) => [city.city, city.marketGoods[0]])),
    {
      "Banda Village": "nutmeg",
      "Buru Village": "fish",
      "Gane Village": "fish",
      "Hitu Village": "sugar",
      "Makian Village": "cloves"
    }
  );
  for (const factionId of ["ternate", "tidore"]) {
    assert.ok(
      ports.filter((city) => city.factionId === factionId).length >= 3,
      `${factionId} should begin 1522 with at least three accessible ports`
    );
  }
  assert.deepEqual(
    northwestCoastVillages.map((city) => city.city).sort(),
    ["Ozette Village", "Yuquot Village"]
  );
  assert.ok(northwestCoastVillages.every((city) => city.marketGoods.includes("beaver-pelts")));
  assert.deepEqual(
    mesoamericanVillages.map((city) => city.city).sort(),
    ["Chakan Putum", "Cuzamil", "Xicalango"]
  );
  assert.ok(mesoamericanVillages.every((city) => city.cityType === "mesoamerican"));
  assert.ok(mesoamericanVillages.every((city) => city.settlementType === "village"));
  assert.ok(mesoamericanVillages.every((city) => city.factionId === NEUTRAL_FACTION_ID));
  assert.ok(mesoamericanVillages.every((city) => city.marketGoods.includes("fish")));
  assert.ok([
    ...pacificVillages,
    ...encounterVillages,
    ...spiceIslandVillages,
    ...northwestCoastVillages,
    ...mesoamericanVillages
  ].every((city) =>
    city.marketGoods.length === 3 && city.marketGoods.every((goodId) => typeof goodId === "string")
  ));
  assert.deepEqual(manualPortFailures, [], "expected every manual 1522 trade port to survive selection as dockable");
});

test("colonial city metadata separates conquest, negotiated ports, and settler colonies", () => {
  const mexicoCity = colonialFoundingForCity({ city: "Mexico City", country: "Mexico" });
  const nagasaki = colonialFoundingForCity({ city: "Nagasaki", country: "Japan" });
  const havana = colonialFoundingForCity({ city: "Havana", country: "Cuba" });

  assert.equal(mexicoCity.type, COLONIAL_FOUNDING_CONQUERED);
  assert.equal(mexicoCity.precolonialName, "Tenochtitlan");
  assert.equal(nagasaki.type, COLONIAL_FOUNDING_NEGOTIATED);
  assert.equal(havana.type, COLONIAL_FOUNDING_SETTLER);
  assert.ok(COLONIAL_CITY_FOUNDINGS.some((entry) => entry.city === "Potosi" && entry.type === COLONIAL_FOUNDING_SETTLER));
});

test("colonization targets are creatable sites absent from the 1522 city list", async () => {
  const csv = await readFile(
    new URL("examples/globe-demo/public/datasets/urbanization-dominance-pruned/urbanization-dominance-pruned.csv", repoRoot),
    "utf8"
  );
  const cityRecords = buildCityRecords1522(csv);
  const currentCityKeys = new Set(cityRecords.keys());
  const failures = [];

  for (const target of COLONIZATION_TARGETS) {
    const keys = new Set([
      cityKey(target.city, target.country),
      cityKey(target.datasetCity, target.datasetCountry)
    ]);
    for (const key of keys) {
      if (currentCityKeys.has(key)) failures.push(`${target.city} via ${key}`);
    }
  }

  assert.equal(failures.join(", "), "");
  assert.ok(COLONIZATION_TARGETS.every((target) => target.canFoundFromYear === 1522));
  assert.ok(COLONIZATION_TARGETS.every((target) => typeof target.cityType === "string" && target.cityType.length > 0));
});

test("colonization targets cover accelerated history hooks", () => {
  const jamestown = colonizationTargetForCity({ city: "Jamestown", country: "United States of America" });
  const quebec = colonizationTargetForCity({ city: "Quebec", country: "Canada" });
  const newAmsterdam = colonizationTargetForCity({ city: "New York", country: "United States of America" });
  const manila = colonizationTargetForCity({ city: "Manila", country: "Philippines" });
  const nagasaki = colonizationTargetForCity({ city: "Nagasaki", country: "Japan" });

  assert.equal(jamestown.type, COLONIAL_FOUNDING_SETTLER);
  assert.equal(jamestown.datasetFirstYear, null);
  assert.equal(quebec.factionId, "france");
  assert.equal(quebec.datasetFirstYear, 1720);
  assert.equal(newAmsterdam.city, "New Amsterdam");
  assert.equal(newAmsterdam.datasetCity, "New York");
  assert.equal(manila.type, COLONIAL_FOUNDING_CONQUERED);
  assert.equal(nagasaki.type, COLONIAL_FOUNDING_NEGOTIATED);
});

test("1522 catalog records apply completed conquests to current allegiance", async () => {
  const csv = await readFile(
    new URL("examples/globe-demo/public/datasets/urbanization-dominance-pruned/urbanization-dominance-pruned.csv", repoRoot),
    "utf8"
  );
  const cityRecords = buildCityRecords1522(csv);
  const mexicoCity = cityRecords.get(cityKey("Mexico City", "Mexico"));
  const havana = cityRecords.get(cityKey("Havana", "Cuba"));

  assert.equal(mexicoCity.displayCity, "Mexico City");
  assert.equal(mexicoCity.factionId, "spain");
  assert.equal(mexicoCity.colonialFounding.type, COLONIAL_FOUNDING_CONQUERED);
  assert.equal(mexicoCity.colonialFounding.factionId, "spain");
  assert.equal(havana.factionId, "spain");
  assert.equal(havana.colonialFounding.type, COLONIAL_FOUNDING_SETTLER);
});

async function readJson(url) {
  return JSON.parse(await readFile(url, "utf8"));
}

function buildCityRecords1522(csv) {
  const rows = parseCsvRows(csv);
  const header = rows[0];
  const indexes = Object.fromEntries(header.map((name, index) => [name, index]));
  const observationsByCity = new Map();
  for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    if (row.length === 1 && row[0] === "") continue;
    const city = row[indexes.city]?.trim();
    const country = row[indexes.country]?.trim();
    const lat = Number(row[indexes.latitude]);
    const lon = Number(row[indexes.longitude]);
    const year = Number.parseInt(row[indexes.year], 10);
    const population = Number(row[indexes.population]);
    if (!city || !country || population <= 0) continue;
    if (!cityDatasetRecordAllowedIn1522(city, country)) continue;

    const cityId = cityKey(city, country);
    const observations = observationsByCity.get(cityId) || [];
    observations.push({
      cityId,
      city,
      country,
      lat,
      lon,
      year,
      population,
      coastalIntent: truthyCsv(row[indexes.coastal_intent]),
      lakeIntent: truthyCsv(row[indexes.lake_intent])
    });
    observationsByCity.set(cityId, observations);
  }

  const bestByCity = new Map();
  for (const [cityId, observations] of observationsByCity) {
    const capitalSpec = factionCapitalForCity(observations[0]);
    const observation = cityPopulationObservationAtYear(observations, 1522, {
      allowStaleObservation: Boolean(capitalSpec)
    });
    if (!observation) continue;
    const cityRecord = withColonialFounding({
      ...observation,
      displayCity: displayName(observation.city, observation.country)
    });
    bestByCity.set(cityId, {
      ...cityRecord,
      factionId: factionIdForCity1522(cityRecord),
      declaredCapitalFactionId: capitalSpec?.factionId || null
    });
  }

  for (const manualSpec of MANUAL_CITY_RECORDS_1522) {
    const cityId = cityKey(manualSpec.city, manualSpec.country);
    const cityRecord = withColonialFounding({
      cityId,
      city: manualSpec.city,
      displayCity: manualSpec.displayCity || displayName(manualSpec.city, manualSpec.country),
      country: manualSpec.country,
      lat: manualSpec.lat,
      lon: manualSpec.lon,
      cityType: manualSpec.cityType || null,
      year: manualSpec.year,
      population: manualSpec.population,
      coastalIntent: manualSpec.coastalIntent,
      lakeIntent: manualSpec.lakeIntent,
      requiredTradePort: Boolean(manualSpec.requiredTradePort),
      manualRegion: manualSpec.manualRegion || null,
      settlementType: manualSpec.settlementType || "city",
      islandSettlement: Boolean(manualSpec.islandSettlement),
      marketGoods: manualSpec.marketGoods || null,
      playerHomeExcluded: Boolean(manualSpec.playerHomeExcluded)
    });
    const capitalSpec = factionCapitalForCity(cityRecord);
    bestByCity.set(cityId, {
      ...cityRecord,
      factionId: factionIdForCity1522(cityRecord),
      declaredCapitalFactionId: capitalSpec?.factionId || null
    });
  }

  for (const capitalSpec of factionCapitalCityRecords1522()) {
    const cityId = cityKey(capitalSpec.city, capitalSpec.country);
    if (bestByCity.has(cityId)) continue;
    const cityRecord = withColonialFounding({
      cityId,
      city: capitalSpec.city,
      displayCity: displayName(capitalSpec.city, capitalSpec.country),
      country: capitalSpec.country,
      lat: capitalSpec.lat,
      lon: capitalSpec.lon,
      year: 1522,
      population: capitalSpec.population,
      coastalIntent: true,
      lakeIntent: false
    });
    bestByCity.set(cityId, {
      ...cityRecord,
      factionId: factionIdForCity1522(cityRecord),
      declaredCapitalFactionId: capitalSpec.factionId
    });
  }
  return bestByCity;
}

function ensureRequiredCities(cities, cityRecords) {
  const included = new Set(cities.map((city) => city.cityId));
  const out = [...cities];
  for (const capitalSpec of FACTION_CAPITALS_1522) {
    const cityId = cityKey(capitalSpec.city, capitalSpec.country);
    if (included.has(cityId)) continue;
    const city = cityRecords.get(cityId);
    assert.ok(city, `missing capital record: ${capitalSpec.city}, ${capitalSpec.country}`);
    out.push(city);
    included.add(cityId);
  }
  for (const manualSpec of MANUAL_CITY_RECORDS_1522) {
    const cityId = cityKey(manualSpec.city, manualSpec.country);
    if (included.has(cityId)) continue;
    const city = cityRecords.get(cityId);
    assert.ok(city, `missing manual city record: ${manualSpec.city}, ${manualSpec.country}`);
    out.push(city);
    included.add(cityId);
  }
  return out;
}

function placeCityRecords(graph, directionIndex, earthRows, reachable, riverMasks, cities) {
  const placed = [];
  const byTile = new Map();
  const portAccessContext = {
    graph,
    earthRows,
    reachableNavigationMask: reachable,
    riverMasks
  };
  for (const city of cities) {
    const startId = findNearestTileId(graph, directionIndex, latLonToDirection(city.lat, city.lon));
    const predicate = cityRequiresPortAccess(city)
      ? (tileId) => isCityDrawableTile(earthRows, tileId) &&
        cityHasPortAccess({ ...portAccessContext, tileId })
      : (tileId) => isCityDrawableTile(earthRows, tileId);
    let tileId = predicate(startId) ? startId : nearestTileMatching(graph, startId, predicate);
    if (tileId === undefined) continue;
    if (byTile.has(tileId)) {
      if (!cityRequiresPortAccess(city)) continue;
      const alternateTileId = nearestTileMatching(graph, tileId, (id) => predicate(id) && !byTile.has(id));
      assert.notEqual(alternateTileId, undefined, `required port cannot be placed: ${cityLabel(city)}`);
      tileId = alternateTileId;
    }
    const placedCity = {
      ...city,
      tileId,
      dockable: cityHasPortAccess({ ...portAccessContext, tileId })
    };
    byTile.set(tileId, placedCity);
    placed.push(placedCity);
  }
  return placed;
}

function buildRiverMasks(graph, earth) {
  const masks = new Uint8Array(graph.tileCount);
  const toWaterMasks = new Uint8Array(graph.tileCount);
  for (const [rawId, edges] of Object.entries(earth.riverEdges)) {
    for (const edge of edges) addRiverEdgeMask(graph, masks, Number(rawId), edge);
  }
  for (const [rawId, edges] of Object.entries(earth.riverEdgeToWater || {})) {
    for (const edge of edges) addRiverEdgeMask(graph, toWaterMasks, Number(rawId), edge);
  }
  removeBlockedRiverEdgesFromMasks(
    graph,
    masks,
    MANUAL_BLOCKED_RIVER_HEX_EDGES_BY_SUBDIVISIONS[SUBDIVISIONS] || []
  );
  for (const chain of MANUAL_RIVER_HEX_CHAINS_BY_SUBDIVISIONS[SUBDIVISIONS] || []) {
    for (let i = 0; i < chain.length - 1; i++) addRiverEdgeBetween(graph, masks, chain[i], chain[i + 1]);
  }
  for (const { tile, edge } of MANUAL_RIVER_MOUTH_EDGES_BY_SUBDIVISIONS[SUBDIVISIONS] || []) {
    addRiverEdgeMask(graph, masks, tile, edge);
    addRiverEdgeMask(graph, toWaterMasks, tile, edge);
  }
  markRiverEdgesOpeningToWater(graph, earth.tiles, masks, toWaterMasks);
  return { masks, toWaterMasks };
}

function buildOceanReachableNavigationMask(graph, earthRows, riverMasks, riverToWaterMasks) {
  const reachable = new Uint8Array(graph.tileCount);
  const queue = [];
  for (let tileId = 0; tileId < graph.tileCount; tileId++) {
    if (!isOceanNavigationSeedTile(earthRows[tileId])) continue;
    reachable[tileId] = 1;
    queue.push(tileId);
  }

  for (let head = 0; head < queue.length; head++) {
    const tileId = queue[head];
    for (const neighborId of graph.neighbors[tileId]) {
      if (reachable[neighborId]) continue;
      if (!canTraverseOceanReachability(graph, earthRows, riverMasks, riverToWaterMasks, tileId, neighborId)) continue;
      reachable[neighborId] = 1;
      queue.push(neighborId);
    }
  }
  return reachable;
}

function canTraverseOceanReachability(graph, earthRows, riverMasks, riverToWaterMasks, fromTileId, toTileId) {
  const fromWater = isWaterSurfaceRow(earthRows[fromTileId]);
  const toWater = isWaterSurfaceRow(earthRows[toTileId]);
  if (fromWater && toWater) return true;

  const edgeA = edgeIndexTowardNeighbor(graph, fromTileId, toTileId);
  const edgeB = edgeIndexTowardNeighbor(graph, toTileId, fromTileId);
  if (edgeA === undefined || edgeB === undefined) return false;

  const fromRiver = (riverMasks[fromTileId] || 0) !== 0;
  const toRiver = (riverMasks[toTileId] || 0) !== 0;
  if (fromWater && toRiver) return riverEdgeSet(riverMasks, toTileId, edgeB) ||
    riverEdgeSet(riverToWaterMasks, toTileId, edgeB);
  if (fromRiver && toWater) return riverEdgeSet(riverMasks, fromTileId, edgeA) ||
    riverEdgeSet(riverToWaterMasks, fromTileId, edgeA);
  if (fromRiver && toRiver) return riverEdgeSet(riverMasks, fromTileId, edgeA) &&
    riverEdgeSet(riverMasks, toTileId, edgeB);
  return false;
}

function markRiverEdgesOpeningToWater(graph, earthRows, masks, toWaterMasks) {
  for (let tileId = 0; tileId < graph.tileCount; tileId++) {
    const mask = masks[tileId];
    if (mask === 0 || isWaterSurfaceRow(earthRows[tileId])) continue;
    for (let edge = 0; edge < graph.edgeCount[tileId]; edge++) {
      if ((mask & (1 << edge)) === 0) continue;
      const neighborId = graph.edgeNeighbors[tileId]?.[edge];
      if (isWaterSurfaceRow(earthRows[neighborId])) addRiverEdgeMask(graph, toWaterMasks, tileId, edge);
    }
  }
}

function addRiverEdgeBetween(graph, masks, a, b) {
  const edgeA = edgeIndexTowardNeighbor(graph, a, b);
  const edgeB = edgeIndexTowardNeighbor(graph, b, a);
  assert.notEqual(edgeA, undefined, `manual river tiles ${a} and ${b} are not adjacent`);
  assert.notEqual(edgeB, undefined, `manual river tiles ${b} and ${a} are not adjacent`);
  addRiverEdgeMask(graph, masks, a, edgeA);
  addRiverEdgeMask(graph, masks, b, edgeB);
}

function addRiverEdgeMask(graph, masks, tileId, edge) {
  assert.ok(Number.isInteger(edge) && edge >= 0 && edge < graph.edgeCount[tileId]);
  masks[tileId] |= 1 << edge;
}

function nearestTileMatching(graph, startId, predicate) {
  const seen = new Set([startId]);
  const queue = [startId];
  for (let head = 0; head < queue.length; head++) {
    for (const neighborId of graph.neighbors[queue[head]]) {
      if (seen.has(neighborId)) continue;
      if (predicate(neighborId)) return neighborId;
      seen.add(neighborId);
      queue.push(neighborId);
    }
  }
  return undefined;
}

function parseCsvRows(csv) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];
    if (quoted) {
      if (ch === "\"" && csv[i + 1] === "\"") {
        cell += "\"";
        i++;
      } else if (ch === "\"") {
        quoted = false;
      } else {
        cell += ch;
      }
    } else if (ch === "\"") {
      quoted = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (ch !== "\r") {
      cell += ch;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function latLonToDirection(latDeg, lonDeg) {
  const lat = latDeg * Math.PI / 180;
  const lon = lonDeg * Math.PI / 180;
  const c = Math.cos(lat);
  return [c * Math.cos(lon), Math.sin(lat), -c * Math.sin(lon)];
}

function edgeIndexTowardNeighbor(graph, tileId, neighborId) {
  const edge = graph.edgeNeighbors[tileId]?.indexOf(neighborId);
  return edge >= 0 ? edge : undefined;
}

function riverEdgeSet(masks, tileId, edge) {
  return ((masks?.[tileId] || 0) & (1 << edge)) !== 0;
}

function isCityDrawableTile(earthRows, tileId) {
  return !isWaterSurfaceRow(earthRows[tileId]);
}

function isOceanNavigationSeedTile(row) {
  return row?.t === "water";
}

function isWaterSurfaceRow(row) {
  const t = row?.t || "";
  return t === "water" || t === "lake" || t === "beach";
}

function cityKey(city, country) {
  return `${city.trim().toLowerCase()}|${country.trim().toLowerCase()}`;
}

function cityLabel(city) {
  return `${city.displayCity || city.city}, ${city.country}`;
}

function displayName(city, country) {
  if (city === "Texcoco" && country === "Mexico") return "Tezcoco";
  if (city === "Zempoala" && country === "Mexico") return "Cempoala";
  return city;
}

function truthyCsv(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}
