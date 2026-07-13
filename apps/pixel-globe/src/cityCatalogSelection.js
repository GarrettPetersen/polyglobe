import { withColonialFounding } from "./colonialCities.js";

export const CITY_WATER_ACCESS_SCORE_BONUS = 45000;
export const CITY_OBSERVATION_RELEVANCE_YEARS = 100;

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
  manualCity1522("Exeter", "United Kingdom", 50.7236, -3.52751, 6000, {
    cityType: "northern-european",
    manualRegion: "british-isles"
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
    manualRegion: "spice-islands"
  }),
  manualVillage1522("Banda Village", "Indonesia", -4.5234, 129.9002, 3500, {
    cityType: "southeast-asian",
    manualRegion: "spice-islands",
    marketGoods: ["spices", "fish", "timber"]
  }),
  manualVillage1522("Hitu Village", "Indonesia", -3.5833, 128.1833, 3000, {
    cityType: "southeast-asian",
    manualRegion: "spice-islands",
    marketGoods: ["spices", "fish", "timber"]
  }),
  manualVillage1522("Makian Village", "Indonesia", 0.3204, 127.3695, 2200, {
    cityType: "southeast-asian",
    manualRegion: "spice-islands",
    marketGoods: ["spices", "fish", "timber"]
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
  return [...records]
    .sort(compareCityCatalogSelection)
    .slice(0, maxCount);
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
