export const CITY_WATER_ACCESS_SCORE_BONUS = 45000;

export const MANUAL_CITY_RECORDS_1522 = Object.freeze([
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
  return Object.freeze({
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
  });
}
