import { withColonialFounding } from "./colonialCities.js";
import {
  MANUAL_CITY_RECORDS_1522,
  cityDatasetRecordAllowedIn1522,
  cityPopulationObservationAtYear,
  selectCityCatalogRecords
} from "./cityCatalogSelection.js";
import {
  FACTION_CAPITALS_1522,
  factionCapitalCityRecords1522,
  factionCapitalForCity,
  factionIdForCity1522
} from "./factions.js";
import { withForeignSettlements1522 } from "./foreignSettlements.js";
import { economyRegionForCity } from "./economyRegions.js";

export const CITY_DATA_YEAR = 1522;
export const CITY_MAX_COUNT = 480;
export const CITY_DATA_URL = "shared/datasets/urbanization-dominance-pruned/urbanization-dominance-pruned.csv";

const CITY_DISPLAY_NAME_OVERRIDES = new Map([
  ["augsberg|germany", [{ throughYear: Number.POSITIVE_INFINITY, displayCity: "Augsburg" }]],
  ["fukuoka|japan", [{ throughYear: Number.POSITIVE_INFINITY, displayCity: "Hakata" }]],
  ["texcoco|mexico", [{ throughYear: 1522, displayCity: "Tezcoco" }]],
  ["merida|mexico", [{ throughYear: 1541, displayCity: "Tiho" }]],
  ["zempoala|mexico", [{ throughYear: 1522, displayCity: "Cempoala" }]]
]);

const CITY_PLACEMENT_OVERRIDES_1522 = new Map([
  // The source coordinates and stable identity remain Fukuoka/Hakata. At this
  // map resolution the eastern neighboring coastal hex keeps Hakata Bay and
  // the later Nagasaki settlement visually distinct.
  ["fukuoka|japan", Object.freeze({ placementLat: 33.58, placementLon: 130.81 })]
]);

export const CITY_TYPE_KEYS = Object.freeze([
  "northern-european",
  "mediterranean",
  "islamic-desert",
  "east-asian",
  "south-asian",
  "southeast-asian",
  "polynesian",
  "mesoamerican",
  "andean",
  "sub-saharan"
]);
export const CITY_TYPE_ART_KEYS = Object.freeze({ polynesian: "village" });
export const CITY_IMAGE_KEYS = Object.freeze([...new Set([
  ...CITY_TYPE_KEYS.map((cityType) => CITY_TYPE_ART_KEYS[cityType] || cityType),
  "native-american",
  "village"
])]);

const NATIVE_AMERICAN_CITY_ART_COUNTRIES = new Set([
  "Canada",
  "United States of America"
]);

const EAST_ASIAN = new Set(["China", "Dem. People's Republic of Korea", "Japan", "Republic of Korea"]);
const SOUTH_ASIAN = new Set(["India", "Nepal", "Pakistan", "Sri Lanka"]);
const SOUTHEAST_ASIAN = new Set([
  "Brunei", "Cambodia", "Indonesia", "Lao People's Democratic Republic", "Malaysia", "Myanmar", "Thailand", "Vietnam"
]);
const POLYNESIAN = new Set([
  "Aotearoa", "Cook Islands", "Fiji", "French Polynesia", "Hawaii", "Kiribati", "Niue", "Rapa Nui", "Samoa", "Tonga"
]);
const ANDEAN = new Set(["Bolivia", "Columbia", "Ecuador", "Peru"]);
const MESOAMERICAN = new Set(["Guatemala", "Mexico", "United States of America"]);
const MEDITERRANEAN = new Set([
  "Albania", "Bulgaria", "Cyprus", "Greece", "Italy", "Portugal", "Romania", "Serbia", "Spain"
]);
const NORTHERN_EUROPEAN = new Set([
  "Austria", "Belgium", "Denmark", "France", "Germany", "Hungary", "Iceland", "Ireland", "Lithuania", "Netherlands",
  "Norway", "Poland", "Russian Federation", "Sweden", "Ukraine", "United Kingdom"
]);
const ISLAMIC_DESERT = new Set([
  "Afghanistan", "Algeria", "Armenia", "Egypt", "Georgia", "Iran", "Iraq", "Israel", "Kyrgyzstan", "Lebanon", "Libya",
  "Mauritania", "Morocco", "Oman", "Saudi Arabia", "Sudan", "Sumer", "Syria", "Syria/Turkey", "Tunisia", "Turkey",
  "Turkey/Syria", "Turkmenistan", "Uzbekistan", "Yemen"
]);
const SUB_SAHARAN = new Set([
  "Angola", "Ethiopia", "Guinea", "Kenya", "Mali", "Mozambique", "Nigeria", "Senegal", "Somalia", "Tanzania", "Zimbabwe"
]);

export function loadCityCatalogFromCsv(csv, targetYear = CITY_DATA_YEAR) {
  if (targetYear !== CITY_DATA_YEAR) {
    throw new Error(`No city faction map is defined for ${targetYear}; expected ${CITY_DATA_YEAR}`);
  }
  if (typeof csv !== "string") throw new Error("City catalog source must be CSV text");
  const rows = parseCsvRows(csv);
  if (rows.length < 2) throw new Error(`City dataset has no city rows: ${CITY_DATA_URL}`);

  const header = rows[0];
  const cityIndex = requiredCsvIndex(header, "city");
  const countryIndex = requiredCsvIndex(header, "country");
  const latIndex = requiredCsvIndex(header, "latitude");
  const lonIndex = requiredCsvIndex(header, "longitude");
  const yearIndex = requiredCsvIndex(header, "year");
  const populationIndex = requiredCsvIndex(header, "population");
  const coastalIntentIndex = optionalCsvIndex(header, "coastal_intent");
  const lakeIntentIndex = optionalCsvIndex(header, "lake_intent");
  const observationsByCity = new Map();

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    if (row.length === 1 && row[0] === "") continue;
    const city = requiredCsvCell(row, cityIndex, rowIndex, "city").trim();
    const country = requiredCsvCell(row, countryIndex, rowIndex, "country").trim();
    const lat = requiredCsvNumber(row, latIndex, rowIndex, "latitude");
    const lon = requiredCsvNumber(row, lonIndex, rowIndex, "longitude");
    const year = requiredCsvInteger(row, yearIndex, rowIndex, "year");
    const population = requiredCsvNumber(row, populationIndex, rowIndex, "population");
    const coastalIntent = optionalCsvBoolean(row, coastalIntentIndex);
    const lakeIntent = optionalCsvBoolean(row, lakeIntentIndex);
    if (population <= 0) continue;
    if (!cityDatasetRecordAllowedIn1522(city, country)) continue;

    const cityId = normalizeCityKey(city, country);
    const observations = observationsByCity.get(cityId) || [];
    observations.push({ cityId, city, country, lat, lon, year, population, coastalIntent, lakeIntent });
    observationsByCity.set(cityId, observations);
  }

  const bestByCity = new Map();
  for (const [cityId, observations] of observationsByCity) {
    const capitalSpec = factionCapitalForCity(observations[0]);
    const observation = cityPopulationObservationAtYear(observations, targetYear, {
      allowStaleObservation: Boolean(capitalSpec)
    });
    if (!observation) continue;
    const baseCityRecord = {
      ...observation,
      displayCity: cityDisplayName(observation.city, observation.country, targetYear),
      ...cityPlacementOverride(observation.city, observation.country),
      cityType: cityTypeForCity(observation.country, observation.lat, observation.lon)
    };
    const cityRecord = withColonialFounding({
      ...baseCityRecord,
      economyRegion: economyRegionForCity(baseCityRecord)
    });
    bestByCity.set(cityId, withForeignSettlements1522({
      ...cityRecord,
      factionId: factionIdForCity1522(cityRecord),
      declaredCapitalFactionId: capitalSpec?.factionId || null
    }));
  }

  ensureManualCityRecords(bestByCity, targetYear);
  ensureFactionCapitalCityRecords(bestByCity, targetYear);
  const cities = selectCityCatalogRecords(bestByCity.values(), CITY_MAX_COUNT);
  ensureFactionCapitalsInCityCatalog(cities, bestByCity);
  ensureManualCitiesInCityCatalog(cities, bestByCity);
  if (cities.length === 0) throw new Error(`City dataset produced no cities for year ${targetYear}`);
  return cities;
}

function ensureManualCityRecords(bestByCity, targetYear) {
  for (const manualSpec of MANUAL_CITY_RECORDS_1522) {
    if (manualSpec.year > targetYear) continue;
    const cityId = normalizeCityKey(manualSpec.city, manualSpec.country);
    const baseCityRecord = {
      cityId,
      city: manualSpec.city,
      displayCity: manualSpec.displayCity || cityDisplayName(manualSpec.city, manualSpec.country, targetYear),
      country: manualSpec.country,
      lat: manualSpec.lat,
      lon: manualSpec.lon,
      cityType: manualSpec.cityType || cityTypeForCity(manualSpec.country, manualSpec.lat, manualSpec.lon),
      year: manualSpec.year,
      population: manualSpec.population,
      coastalIntent: manualSpec.coastalIntent,
      lakeIntent: manualSpec.lakeIntent,
      requiredTradePort: Boolean(manualSpec.requiredTradePort),
      manualRegion: manualSpec.manualRegion || null,
      npcInterregionalTradeExcluded: Boolean(manualSpec.npcInterregionalTradeExcluded),
      settlementType: manualSpec.settlementType || "city",
      islandSettlement: Boolean(manualSpec.islandSettlement),
      marketGoods: manualSpec.marketGoods || null,
      playerHomeExcluded: Boolean(manualSpec.playerHomeExcluded)
    };
    const cityRecord = withColonialFounding({
      ...baseCityRecord,
      economyRegion: economyRegionForCity({
        ...baseCityRecord,
        economyRegion: manualSpec.economyRegion || null
      })
    });
    const capitalSpec = factionCapitalForCity(cityRecord);
    bestByCity.set(cityId, withForeignSettlements1522({
      ...cityRecord,
      factionId: factionIdForCity1522(cityRecord),
      declaredCapitalFactionId: capitalSpec?.factionId || null
    }));
  }
}

function ensureFactionCapitalCityRecords(bestByCity, targetYear) {
  for (const capitalSpec of factionCapitalCityRecords1522()) {
    const cityId = normalizeCityKey(capitalSpec.city, capitalSpec.country);
    if (bestByCity.has(cityId)) continue;
    const baseCityRecord = {
      cityId,
      city: capitalSpec.city,
      displayCity: cityDisplayName(capitalSpec.city, capitalSpec.country, targetYear),
      country: capitalSpec.country,
      lat: capitalSpec.lat,
      lon: capitalSpec.lon,
      cityType: cityTypeForCity(capitalSpec.country, capitalSpec.lat, capitalSpec.lon),
      year: targetYear,
      population: capitalSpec.population,
      coastalIntent: true,
      lakeIntent: false
    };
    const cityRecord = withColonialFounding({
      ...baseCityRecord,
      economyRegion: economyRegionForCity(baseCityRecord)
    });
    bestByCity.set(cityId, withForeignSettlements1522({
      ...cityRecord,
      factionId: factionIdForCity1522(cityRecord),
      declaredCapitalFactionId: capitalSpec.factionId,
      requiredFactionCapital: true
    }));
  }
}

function ensureFactionCapitalsInCityCatalog(cities, bestByCity) {
  const included = new Set(cities.map((city) => city.cityId));
  for (const capitalSpec of FACTION_CAPITALS_1522) {
    const cityId = normalizeCityKey(capitalSpec.city, capitalSpec.country);
    if (included.has(cityId)) continue;
    const city = bestByCity.get(cityId);
    if (!city) throw new Error(`No city catalog record for faction capital: ${capitalSpec.city}, ${capitalSpec.country}`);
    if (city.factionId !== capitalSpec.factionId) {
      throw new Error(`Faction capital ${capitalSpec.city}, ${capitalSpec.country} belongs to ${city.factionId}, not ${capitalSpec.factionId}`);
    }
    cities.push(city);
    included.add(cityId);
  }
}

function ensureManualCitiesInCityCatalog(cities, bestByCity) {
  const included = new Set(cities.map((city) => city.cityId));
  for (const manualSpec of MANUAL_CITY_RECORDS_1522) {
    const cityId = normalizeCityKey(manualSpec.city, manualSpec.country);
    if (included.has(cityId)) continue;
    const city = bestByCity.get(cityId);
    if (!city) throw new Error(`No city catalog record for manual city: ${manualSpec.city}, ${manualSpec.country}`);
    cities.push(city);
    included.add(cityId);
  }
}

function parseCsvRows(csv) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];
    if (quoted) {
      if (ch === "\"") {
        if (csv[i + 1] === "\"") {
          cell += "\"";
          i++;
        } else quoted = false;
      } else cell += ch;
      continue;
    }
    if (ch === "\"") {
      if (cell.length !== 0) throw new Error("Malformed city CSV: quote inside unquoted cell");
      quoted = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (ch !== "\r") cell += ch;
  }
  if (quoted) throw new Error("Malformed city CSV: unterminated quoted cell");
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function requiredCsvIndex(header, name) {
  const index = header.indexOf(name);
  if (index < 0) throw new Error(`City dataset is missing required column: ${name}`);
  return index;
}

function optionalCsvIndex(header, name) {
  const index = header.indexOf(name);
  return index >= 0 ? index : null;
}

function requiredCsvCell(row, index, rowIndex, name) {
  const value = row[index];
  if (value == null || value.trim() === "") throw new Error(`City dataset row ${rowIndex + 1} is missing ${name}`);
  return value;
}

function requiredCsvNumber(row, index, rowIndex, name) {
  const value = Number(requiredCsvCell(row, index, rowIndex, name));
  if (!Number.isFinite(value)) throw new Error(`City dataset row ${rowIndex + 1} has invalid ${name}`);
  return value;
}

function requiredCsvInteger(row, index, rowIndex, name) {
  const value = Number(requiredCsvCell(row, index, rowIndex, name));
  if (!Number.isInteger(value)) throw new Error(`City dataset row ${rowIndex + 1} has invalid ${name}`);
  return value;
}

function optionalCsvBoolean(row, index) {
  if (index == null) return false;
  const value = String(row[index] ?? "").trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

function normalizeCityKey(city, country) {
  return `${city.trim().toLowerCase()}|${country.trim().toLowerCase()}`;
}

function cityDisplayName(city, country, targetYear) {
  const rules = CITY_DISPLAY_NAME_OVERRIDES.get(normalizeCityKey(city, country));
  if (!rules) return city;
  const rule = rules.find((item) => targetYear <= item.throughYear);
  return rule?.displayCity || city;
}

function cityPlacementOverride(city, country) {
  return CITY_PLACEMENT_OVERRIDES_1522.get(normalizeCityKey(city, country)) || {};
}

export function cityTypeForCity(country, lat, lon) {
  if (EAST_ASIAN.has(country)) return "east-asian";
  if (SOUTH_ASIAN.has(country)) return "south-asian";
  if (SOUTHEAST_ASIAN.has(country)) return "southeast-asian";
  if (POLYNESIAN.has(country)) return "polynesian";
  if (ANDEAN.has(country)) return "andean";
  if (MESOAMERICAN.has(country)) return "mesoamerican";
  if (country === "France" && lat < 45.5 && lon > 2) return "mediterranean";
  if (country === "Mali" && lat < 14) return "sub-saharan";
  if (country === "Russian Federation" && lat < 47 && lon > 30) return "mediterranean";
  if (country === "Ukraine" && lat < 46 && lon > 30) return "mediterranean";
  if (MEDITERRANEAN.has(country)) return "mediterranean";
  if (NORTHERN_EUROPEAN.has(country)) return "northern-european";
  if (ISLAMIC_DESERT.has(country)) return "islamic-desert";
  if (SUB_SAHARAN.has(country)) return "sub-saharan";
  throw new Error(`No city type art bucket for city country: ${country}`);
}

export function cityArtKeyForCity(city) {
  if (!city || typeof city !== "object") throw new Error("City art requires a city record");
  if (!CITY_TYPE_KEYS.includes(city.cityType)) throw new Error(`Unknown city type: ${city.cityType}`);
  if (city.settlementType === "village") return "village";
  if (
    city.cityType === "mesoamerican" &&
    NATIVE_AMERICAN_CITY_ART_COUNTRIES.has(city.country)
  ) return "native-american";
  return CITY_TYPE_ART_KEYS[city.cityType] || city.cityType;
}

export function cityLabelText(city) {
  return city.portAlias || city.displayCity || city.city;
}
