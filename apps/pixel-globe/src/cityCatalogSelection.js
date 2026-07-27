import { withColonialFounding } from "./colonialCities.js";
import { greatCircleDistanceKm } from "./worldDistance.js";

export const CITY_WATER_ACCESS_SCORE_BONUS = 45000;
export const CITY_OBSERVATION_RELEVANCE_YEARS = 100;
export const CITY_COASTAL_REPLACEMENT_RADIUS_KM = 50;

const EXCLUDED_DATASET_CITIES_1522 = new Set([
  // Chandler uses a modern city label for evidence of a pre-contact Ohio
  // settlement. Cincinnati itself was not founded or named until 1788.
  "cincinnati|united states of america"
]);

export function cityDatasetRecordAllowedIn1522(city, country) {
  if (typeof city !== "string" || city.trim() === "") {
    throw new Error("City dataset eligibility requires a city name");
  }
  if (typeof country !== "string" || country.trim() === "") {
    throw new Error("City dataset eligibility requires a country");
  }
  return !EXCLUDED_DATASET_CITIES_1522.has(
    `${city.trim().toLowerCase()}|${country.trim().toLowerCase()}`
  );
}

export function cityPopulationObservationAtYear(observations, targetYear, options = {}) {
  if (!Array.isArray(observations)) throw new Error("City population observations must be an array");
  if (!Number.isInteger(targetYear)) throw new Error(`Invalid city catalog year: ${targetYear}`);

  const bestByYear = new Map();
  for (const observation of observations) {
    if (
      !Number.isInteger(observation?.year) ||
      !Number.isFinite(observation?.population) ||
      observation.population <= 0
    ) {
      throw new Error("Invalid city population observation");
    }
    const previous = bestByYear.get(observation.year);
    if (!previous || observation.population > previous.population) {
      bestByYear.set(observation.year, observation);
    }
  }
  const ordered = [...bestByYear.values()].sort((a, b) => a.year - b.year);

  let previous = null;
  let next = null;
  for (const observation of ordered) {
    if (observation.year <= targetYear) previous = observation;
    else {
      next = observation;
      break;
    }
  }
  if (!previous) return null;
  // Sparse snapshots may bracket 1522, but distant same-name rows are not continuity evidence.
  const previousIsRelevant = targetYear - previous.year <= CITY_OBSERVATION_RELEVANCE_YEARS;
  const nextIsRelevant = Boolean(next && next.year - targetYear <= CITY_OBSERVATION_RELEVANCE_YEARS);
  if (!previousIsRelevant && !nextIsRelevant && options.allowStaleObservation !== true) return null;

  let population = previous.population;
  let sourceYear = previous.year;
  if (previousIsRelevant && nextIsRelevant) {
    population = previous.population + (next.population - previous.population) *
      ((targetYear - previous.year) / (next.year - previous.year));
  } else if (nextIsRelevant) {
    population = next.population;
    sourceYear = next.year;
  }
  return {
    ...previous,
    year: targetYear,
    population: Math.max(1, Math.round(population)),
    sourceYear,
    nextSourceYear: nextIsRelevant ? next.year : null
  };
}

export const MANUAL_CITY_RECORDS_1522 = Object.freeze([
  manualCity1522("Hafnarfjordur", "Iceland", 64.0671, -21.9547, 1500, {
    cityType: "northern-european",
    manualRegion: "iceland",
    marketGoods: ["fish", "salt", "cheese"]
  }),
  manualCity1522("Exeter", "United Kingdom", 50.7236, -3.52751, 6000, {
    cityType: "northern-european",
    manualRegion: "british-isles"
  }),
  manualCity1522("Gavle", "Sweden", 60.6749, 17.1413, 2500, {
    displayCity: "Gävle",
    cityType: "northern-european",
    manualRegion: "baltic",
    marketGoods: ["fish", "timber", "naval-stores"]
  }),
  manualCity1522("Nykoping", "Sweden", 58.753, 17.009, 3500, {
    displayCity: "Nyköping",
    cityType: "northern-european",
    manualRegion: "baltic",
    marketGoods: ["iron", "timber", "naval-stores"]
  }),
  manualCity1522("Soderkoping", "Sweden", 58.4806, 16.3222, 4000, {
    displayCity: "Söderköping",
    cityType: "northern-european",
    manualRegion: "baltic",
    marketGoods: ["iron", "copper", "naval-stores"]
  }),
  manualCity1522("Kalmar", "Sweden", 56.6634, 16.3568, 6000, {
    cityType: "northern-european",
    manualRegion: "baltic",
    marketGoods: ["grain", "fish", "naval-stores"]
  }),
  manualCity1522("Visby", "Sweden", 57.6348, 18.2948, 4500, {
    cityType: "northern-european",
    manualRegion: "baltic",
    marketGoods: ["grain", "wool", "fish"]
  }),
  manualCity1522("Turku", "Finland", 60.4518, 22.2666, 4000, {
    cityType: "northern-european",
    manualRegion: "baltic",
    marketGoods: ["fish", "timber", "furs"]
  }),
  manualCity1522("Malacca", "Malaysia", 2.1896, 102.2501, 90000, {
    manualRegion: "strait-of-malacca"
  }),
  manualCity1522("Aceh", "Indonesia", 5.5483, 95.3238, 25000, {
    manualRegion: "strait-of-malacca"
  }),
  manualCity1522("Patani", "Thailand", 6.8695, 101.2505, 20000, {
    manualRegion: "south-china-sea"
  }),
  manualCity1522("Ternate", "Indonesia", 0.7893, 127.3844, 12000, {
    cityType: "southeast-asian",
    manualRegion: "spice-islands"
  }),
  manualCity1522("Tidore", "Indonesia", 0.6739, 127.4502, 10000, {
    cityType: "southeast-asian",
    manualRegion: "spice-islands",
    marketGoods: ["cloves", "fish", "timber"]
  }),
  manualCity1522("Colombo", "Sri Lanka", 6.9344, 79.8428, 12000, {
    cityType: "south-asian",
    manualRegion: "ceylon"
  }),
  manualCity1522("Rhodes", "Greece", 36.434, 28.217, 12000, {
    cityType: "mediterranean",
    manualRegion: "eastern-mediterranean",
    marketGoods: ["wine", "olive-oil", "naval-stores"]
  }),
  manualVillage1522("Edo", "Japan", 35.6896, 139.692, 1500, {
    cityType: "east-asian",
    manualRegion: "edo-bay",
    marketGoods: ["fish", "grain", "timber"]
  }),
  manualVillage1522("Banda Village", "Indonesia", -4.5234, 129.9002, 3500, {
    cityType: "southeast-asian",
    manualRegion: "spice-islands",
    marketGoods: ["nutmeg", "fish", "timber"]
  }),
  manualVillage1522("Hitu Village", "Indonesia", -3.5833, 128.1833, 3000, {
    cityType: "southeast-asian",
    manualRegion: "spice-islands",
    marketGoods: ["sugar", "fish", "timber"]
  }),
  manualVillage1522("Makian Village", "Indonesia", 0.3204, 127.3695, 2200, {
    cityType: "southeast-asian",
    manualRegion: "spice-islands",
    marketGoods: ["cloves", "fish", "timber"]
  }),
  manualVillage1522("Gane Village", "Indonesia", -0.1213, 127.9028, 2000, {
    cityType: "southeast-asian",
    manualRegion: "spice-islands",
    marketGoods: ["fish", "timber", "naval-stores"]
  }),
  manualVillage1522("Buru Village", "Indonesia", -3.2619, 127.0929, 2500, {
    cityType: "southeast-asian",
    manualRegion: "spice-islands",
    marketGoods: ["fish", "timber", "beeswax"]
  }),
  manualCity1522("Aden", "Yemen", 12.7855, 45.0187, 35000, {
    manualRegion: "red-sea"
  }),
  manualCity1522("Jeddah", "Saudi Arabia", 21.5433, 39.1728, 25000, {
    manualRegion: "red-sea"
  }),
  manualCity1522("Muscat", "Oman", 23.588, 58.3829, 20000, {
    manualRegion: "arabian-sea"
  }),
  manualCity1522("Diu", "India", 20.7144, 70.9874, 25000, {
    manualRegion: "gujarat"
  }),
  manualCity1522("Surat", "India", 21.1702, 72.8311, 35000, {
    manualRegion: "gujarat"
  }),
  manualCity1522("Sofala", "Mozambique", -20.1653, 34.7153, 12000, {
    manualRegion: "swahili-coast"
  }),
  manualCity1522("Mozambique Island", "Mozambique", -15.0342, 40.7358, 10000, {
    manualRegion: "swahili-coast"
  }),
  manualCity1522("Mombasa", "Kenya", -4.0435, 39.6682, 20000, {
    manualRegion: "swahili-coast"
  }),
  manualCity1522("Kilwa", "Tanzania", -8.957, 39.51, 30000, {
    manualRegion: "swahili-coast"
  }),
  manualCity1522("Mogadishu", "Somalia", 2.0469, 45.3182, 30000, {
    manualRegion: "swahili-coast"
  }),
  manualCity1522("Santo Domingo", "Dominican Republic", 18.4861, -69.9312, 20000, {
    cityType: "mediterranean",
    manualRegion: "spanish-main",
    playerHomeExcluded: true
  }),
  manualCity1522("Havana", "Cuba", 23.1136, -82.3666, 8000, {
    cityType: "mediterranean",
    manualRegion: "spanish-main",
    playerHomeExcluded: true
  }),
  manualCity1522("Veracruz", "Mexico", 19.1738, -96.1342, 5000, {
    cityType: "mediterranean",
    manualRegion: "spanish-main",
    playerHomeExcluded: true
  }),
  manualVillage1522("Xicalango", "Mexico", 18.65, -91.82, 2800, {
    cityType: "mesoamerican",
    manualRegion: "mesoamerican-villages",
    marketGoods: ["fish", "cacao", "cotton"]
  }),
  manualVillage1522("Chakan Putum", "Mexico", 19.35, -90.72, 2400, {
    cityType: "mesoamerican",
    manualRegion: "mesoamerican-villages",
    marketGoods: ["fish", "cotton", "salt"]
  }),
  manualVillage1522("Cuzamil", "Mexico", 20.43, -86.92, 1800, {
    cityType: "mesoamerican",
    manualRegion: "mesoamerican-villages",
    marketGoods: ["fish", "salt", "cotton"]
  }),
  manualCity1522("Nombre de Dios", "Panama", 9.5833, -79.4667, 5000, {
    cityType: "mediterranean",
    manualRegion: "spanish-main",
    playerHomeExcluded: true
  }),
  manualCity1522("Panama City", "Panama", 8.9824, -79.5199, 7000, {
    cityType: "mediterranean",
    manualRegion: "spanish-main",
    playerHomeExcluded: true
  }),
  manualCity1522("Chanchan", "Peru", -8.106, -79.074536, 25000, {
    cityType: "andean",
    economyRegion: "andean-coast",
    manualRegion: "inca-coast"
  }),
  manualVillage1522("Fiji Village", "Fiji", -18.1416, 178.4419, 3500, {
    cityType: "polynesian",
    manualRegion: "pacific-islands",
    marketGoods: ["fish", "timber", "sugar"]
  }),
  manualVillage1522("Tonga Village", "Tonga", -21.1394, -175.2049, 3000, {
    cityType: "polynesian",
    manualRegion: "pacific-islands",
    marketGoods: ["fish", "timber", "sugar"]
  }),
  manualVillage1522("Samoa Village", "Samoa", -13.8333, -171.75, 3000, {
    cityType: "polynesian",
    manualRegion: "pacific-islands",
    marketGoods: ["fish", "timber", "sugar"]
  }),
  manualVillage1522("Tahiti Village", "French Polynesia", -17.5516, -149.5585, 3000, {
    cityType: "polynesian",
    manualRegion: "pacific-islands",
    marketGoods: ["fish", "timber", "artwork"]
  }),
  manualVillage1522("Hawaii Village", "Hawaii", 19.4756, -155.9225, 3500, {
    cityType: "polynesian",
    manualRegion: "pacific-islands",
    marketGoods: ["fish", "sugar", "artwork"]
  }),
  manualVillage1522("Rarotonga Village", "Cook Islands", -21.2367, -159.7777, 2200, {
    cityType: "polynesian",
    manualRegion: "pacific-islands",
    marketGoods: ["fish", "timber", "artwork"]
  }),
  manualVillage1522("Niue Village", "Niue", -19.0544, -169.8672, 1100, {
    cityType: "polynesian",
    manualRegion: "pacific-islands",
    marketGoods: ["fish", "timber", "sugar"]
  }),
  manualVillage1522("Rangiroa Village", "French Polynesia", -14.9667, -147.6333, 1000, {
    cityType: "polynesian",
    manualRegion: "pacific-islands",
    marketGoods: ["fish", "salt", "artwork"]
  }),
  manualVillage1522("Tarawa Village", "Kiribati", 1.4518, 173.0312, 1800, {
    cityType: "polynesian",
    manualRegion: "pacific-islands",
    marketGoods: ["fish", "salt", "artwork"]
  }),
  manualVillage1522("Rapa Nui Village", "Rapa Nui", -27.1212, -109.3664, 1800, {
    cityType: "polynesian",
    manualRegion: "pacific-islands",
    marketGoods: ["fish", "dyes", "artwork"]
  }),
  manualVillage1522("Bay of Islands Village", "Aotearoa", -35.2285, 174.0915, 2400, {
    cityType: "polynesian",
    manualRegion: "pacific-islands",
    marketGoods: ["fish", "timber", "artwork"]
  }),
  manualVillage1522("Yuquot Village", "Nuu-chah-nulth", 49.5926, -126.6174, 1500, {
    cityType: "mesoamerican",
    manualRegion: "northwest-coast",
    npcInterregionalTradeExcluded: true,
    marketGoods: ["beaver-pelts", "fish", "timber"]
  }),
  manualVillage1522("Ozette Village", "Makah", 48.1533, -124.7331, 1000, {
    cityType: "mesoamerican",
    manualRegion: "northwest-coast",
    npcInterregionalTradeExcluded: true,
    marketGoods: ["beaver-pelts", "fish", "timber"]
  }),
  manualVillage1522("Wendat Village", "Canada", 44.75, -79.88, 1800, {
    cityType: "mesoamerican",
    manualRegion: "great-lakes",
    coastalIntent: false,
    lakeIntent: true,
    npcInterregionalTradeExcluded: true,
    marketGoods: ["beaver-pelts", "fish", "grain"]
  }),
  manualVillage1522("Guanahani Village", "Bahamas", 24.059, -74.474, 1200, {
    cityType: "mesoamerican",
    manualRegion: "explorer-encounters",
    marketGoods: ["fish", "cotton", "salt"]
  }),
  manualVillage1522("Coroa Vermelha Village", "Brazil", -16.3338, -39.0117, 1600, {
    cityType: "mesoamerican",
    manualRegion: "explorer-encounters",
    marketGoods: ["fish", "timber", "dyes"]
  }),
  manualVillage1522("Mossel Bay Village", "South Africa", -34.1831, 22.1461, 1400, {
    cityType: "sub-saharan",
    manualRegion: "explorer-encounters",
    marketGoods: ["fish", "salt", "wool"]
  }),
  manualVillage1522("Umatac Village", "Guam", 13.298, 144.659, 1400, {
    cityType: "polynesian",
    manualRegion: "explorer-encounters",
    marketGoods: ["fish", "timber", "sugar"]
  }),
  manualVillage1522("Mactan Village", "Philippines", 10.3075, 123.9794, 2500, {
    cityType: "southeast-asian",
    manualRegion: "explorer-encounters",
    marketGoods: ["fish", "cotton", "sugar"]
  }),
  manualVillage1522("Vaitahu Village", "French Polynesia", -9.9372, -139.111, 900, {
    cityType: "polynesian",
    manualRegion: "explorer-encounters",
    marketGoods: ["fish", "timber", "artwork"]
  })
]);

export function selectCityCatalogRecords(records, maxCount) {
  if (!Number.isInteger(maxCount) || maxCount <= 0) {
    throw new Error(`Invalid city catalog max count: ${maxCount}`);
  }
  const candidates = [...records];
  const coastalCities = candidates.filter((city) => city?.coastalIntent);
  return candidates
    .filter((city) => !nearbyCoastalCitySupersedes(city, coastalCities))
    .sort(compareCityCatalogSelection)
    .slice(0, maxCount);
}

function nearbyCoastalCitySupersedes(city, coastalCities) {
  if (cityHasWaterAccessIntent(city)) return false;
  return coastalCities.some((coastal) => (
    coastal.country === city.country &&
    coastal.population >= city.population &&
    greatCircleDistanceKm(city, coastal) <= CITY_COASTAL_REPLACEMENT_RADIUS_KM
  ));
}

export function compareCityCatalogSelection(a, b) {
  return cityCatalogSelectionScore(b) - cityCatalogSelectionScore(a) ||
    b.population - a.population ||
    cityLabelText(a).localeCompare(cityLabelText(b));
}

export function cityCatalogSelectionScore(city) {
  return city.population + (cityHasWaterAccessIntent(city) ? CITY_WATER_ACCESS_SCORE_BONUS : 0);
}

export function cityHasWaterAccessIntent(city) {
  return Boolean(city?.coastalIntent || city?.lakeIntent);
}

export function cityRequiresPortAccess(city) {
  return Boolean(
    city?.declaredCapitalFactionId ||
    city?.requiredTradePort ||
    cityHasWaterAccessIntent(city)
  );
}

function cityLabelText(city) {
  return city.displayCity || city.city || "";
}

function manualCity1522(city, country, lat, lon, population, details = {}) {
  return Object.freeze(withColonialFounding({
    city,
    displayCity: city,
    country,
    lat,
    lon,
    year: 1522,
    population,
    coastalIntent: true,
    lakeIntent: false,
    requiredTradePort: true,
    cityType: details.cityType || null,
    ...details
  }));
}

function manualVillage1522(city, country, lat, lon, population, details = {}) {
  return manualCity1522(city, country, lat, lon, population, {
    ...details,
    settlementType: "village"
  });
}
