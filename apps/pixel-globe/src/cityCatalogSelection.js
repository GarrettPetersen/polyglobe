import { withColonialFounding } from "./colonialCities.js";
import { greatCircleDistanceKm } from "./worldDistance.js";
import { cityTerritoryId, requireEntityId } from "./entityIds.js";
import { cityMustRemainInland } from "./cityPortAccessPolicy.js";
export { cityMustRemainInland } from "./cityPortAccessPolicy.js";

export const CITY_WATER_ACCESS_SCORE_BONUS = 45000;
export const CITY_OBSERVATION_RELEVANCE_YEARS = 100;
export const CITY_COASTAL_REPLACEMENT_RADIUS_KM = 50;

const EXCLUDED_DATASET_CITIES_1522 = new Set([
  // Chandler uses a modern city label for evidence of a pre-contact Ohio
  // settlement. Cincinnati itself was not founded or named until 1788.
  "cincinnati|united states of america",
  // The source assigns the Sicilian port to modern Greece. A corrected
  // Spanish-Sicilian record is supplied in the historical port layer below.
  "syracuse|greece"
]);

export function cityDatasetRecordAllowedIn1522(cityId) {
  return !EXCLUDED_DATASET_CITIES_1522.has(requireEntityId(cityId, "City dataset eligibility"));
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
  // Senegal's UNESCO submission (tentative-list property 2081) describes
  // Rufisque as a fishing village named in the sixteenth century. Population
  // is a modest gameplay estimate, not a surviving 1522 census.
  manualVillage1522("rufisque|senegal", "Rufisque", "Senegal", 14.6842, -17.1866, 1500, {
    cityType: "sub-saharan",
    manualRegion: "senegambia",
    marketGoods: ["fish", "salt", "hides"]
  }),
  // San Sebastian controlled the sheltered roadstead at Pasaia in 1522. Its
  // merchants were already fitting out whaling and cod-fishing voyages, so it
  // closes the otherwise empty Spanish coast on the Bay of Biscay.
  manualCity1522("san sebastian|spain", "San Sebastian", "Spain", 43.3183, -1.9812, 6000, {
    displayCity: "San Sebastián",
    cityType: "northern-european",
    manualRegion: "bay-of-biscay",
    marketGoods: ["fish", "iron", "naval-stores"]
  }),
  manualCity1522("hafnarfjordur|iceland", "Hafnarfjordur", "Iceland", 64.0671, -21.9547, 1500, {
    cityType: "northern-european",
    manualRegion: "iceland",
    marketGoods: ["fish", "salt", "cheese"]
  }),
  manualCity1522("exeter|united kingdom", "Exeter", "United Kingdom", 50.7236, -3.52751, 6000, {
    cityType: "northern-european",
    manualRegion: "british-isles"
  }),
  manualCity1522("bristol|united kingdom", "Bristol", "United Kingdom", 51.4545, -2.5879, 12000, {
    cityType: "northern-european",
    manualRegion: "british-isles"
  }),
  manualCity1522("southampton|united kingdom", "Southampton", "United Kingdom", 50.9097, -1.4044, 4500, {
    cityType: "northern-european",
    manualRegion: "british-isles"
  }),
  manualCity1522("york|united kingdom", "York", "United Kingdom", 53.9599, -1.0873, 9000, {
    cityType: "northern-european",
    manualRegion: "british-isles"
  }),
  manualCity1522("hull|united kingdom", "Hull", "United Kingdom", 53.7676, -0.3274, 6000, {
    cityType: "northern-european",
    manualRegion: "british-isles"
  }),
  manualCity1522("newcastle upon tyne|united kingdom", "Newcastle upon Tyne", "United Kingdom", 54.9783, -1.6178, 10000, {
    cityType: "northern-european",
    manualRegion: "british-isles"
  }),
  manualCity1522("gavle|sweden", "Gavle", "Sweden", 60.6749, 17.1413, 2500, {
    displayCity: "Gävle",
    cityType: "northern-european",
    manualRegion: "baltic",
    marketGoods: ["fish", "timber", "naval-stores"]
  }),
  manualCity1522("nykoping|sweden", "Nykoping", "Sweden", 58.753, 17.009, 3500, {
    displayCity: "Nyköping",
    cityType: "northern-european",
    manualRegion: "baltic",
    marketGoods: ["iron", "timber", "naval-stores"]
  }),
  manualCity1522("soderkoping|sweden", "Soderkoping", "Sweden", 58.4806, 16.3222, 4000, {
    displayCity: "Söderköping",
    cityType: "northern-european",
    manualRegion: "baltic",
    marketGoods: ["iron", "copper", "naval-stores"]
  }),
  manualCity1522("kalmar|sweden", "Kalmar", "Sweden", 56.6634, 16.3568, 6000, {
    cityType: "northern-european",
    manualRegion: "baltic",
    marketGoods: ["grain", "fish", "naval-stores"]
  }),
  manualCity1522("visby|sweden", "Visby", "Sweden", 57.6348, 18.2948, 4500, {
    cityType: "northern-european",
    manualRegion: "baltic",
    marketGoods: ["grain", "wool", "fish"]
  }),
  manualCity1522("turku|finland", "Turku", "Finland", 60.4518, 22.2666, 4000, {
    cityType: "northern-european",
    manualRegion: "baltic",
    marketGoods: ["fish", "timber", "furs"]
  }),
  manualCity1522("braila|romania", "Braila", "Romania", 45.2692, 27.9575, 6000, {
    cityType: "mediterranean",
    manualRegion: "lower-danube",
    requiredTradePort: true,
    marketGoods: ["grain", "wool", "timber"]
  }),
  manualCity1522("galati|romania", "Galati", "Romania", 45.4353, 28.008, 5000, {
    cityType: "mediterranean",
    manualRegion: "lower-danube",
    requiredTradePort: true,
    marketGoods: ["grain", "fish", "timber"]
  }),
  // Bursa is an inland market. Mudanya was its Marmara roadstead and had been
  // under Ottoman rule since 1321; keep the port and the city as distinct
  // canonical places rather than dragging Bursa onto the coast.
  manualCity1522("mudanya|turkey", "Mudanya", "Turkey", 40.3764, 28.8833, 3000, {
    cityType: "islamic-desert",
    manualRegion: "eastern-mediterranean",
    marketGoods: ["silk", "olive-oil", "fish"]
  }),
  // Jaffa was a small, difficult roadstead in 1522, but it remained the
  // seaward landing for Jerusalem. Model it as a village, not as Jerusalem
  // itself or as a large later Ottoman port.
  manualVillage1522("jaffa|israel", "Jaffa", "Israel", 32.0535, 34.7503, 500, {
    cityType: "islamic-desert",
    manualRegion: "eastern-mediterranean",
    marketGoods: ["olive-oil", "wool", "fish"],
    playerHomeExcluded: true
  }),
  manualCity1522("malacca|malaysia", "Malacca", "Malaysia", 2.1896, 102.2501, 90000, {
    manualRegion: "strait-of-malacca"
  }),
  manualCity1522("aceh|indonesia", "Aceh", "Indonesia", 5.5483, 95.3238, 25000, {
    manualRegion: "strait-of-malacca"
  }),
  manualCity1522("patani|thailand", "Patani", "Thailand", 6.8695, 101.2505, 20000, {
    manualRegion: "south-china-sea"
  }),
  manualCity1522("ternate|indonesia", "Ternate", "Indonesia", 0.7893, 127.3844, 12000, {
    cityType: "southeast-asian",
    manualRegion: "spice-islands",
    // Ternate and Tidore are closer than one subdivision-eight tile. These
    // authored centers preserve both as distinct volcanic islands while the
    // historical coordinates above remain available to geography systems.
    placementLat: 0.7288705110549927,
    placementLon: 127.42523193359375
  }),
  manualCity1522("tidore|indonesia", "Tidore", "Indonesia", 0.6739, 127.4502, 10000, {
    cityType: "southeast-asian",
    manualRegion: "spice-islands",
    placementLat: 0.4373382329940796,
    placementLon: 127.42520141601562,
    marketGoods: ["cloves", "fish", "timber"]
  }),
  // South Sulawesi was not empty in 1522. Garassiq was a small, contested
  // river-mouth port passed among Gowa, Talloq, and Siang before Gowa secured
  // it later in the century; do not turn that disputed history into modern or
  // Ternatan sovereignty. Its familiar later name remains the display label.
  manualCity1522("garassiq|indonesia", "Garassiq", "Indonesia", -5.14, 119.41, 3500, {
    displayCity: "Makassar",
    cityType: "southeast-asian",
    manualRegion: "sulawesi",
    marketGoods: ["rice", "fish", "timber"]
  }),
  // Archaeology places Luwu's fifteenth- and sixteenth-century port-capital at
  // Malangke, where hinterland iron and forest produce entered maritime trade.
  // Palopo did not replace it as the royal center until the seventeenth century.
  manualCity1522("malangke|indonesia", "Malangke", "Indonesia", -2.7776, 120.4245, 15000, {
    cityType: "southeast-asian",
    manualRegion: "sulawesi",
    marketGoods: ["iron", "timber", "rice"]
  }),
  // Tomogaura was the seaward outlet used by the Iwami silver mine when its
  // ore began moving through Ouchi trade in 1526. Present the province name to
  // the player while retaining the historical harbor as the stable identity.
  manualVillage1522("tomogaura|japan", "Tomogaura", "Japan", 35.101, 132.375, 1800, {
    displayCity: "Iwami",
    cityType: "east-asian",
    manualRegion: "western-japan",
    marketGoods: ["fish", "salt", "timber"]
  }),
  manualCity1522("colombo|sri lanka", "Colombo", "Sri Lanka", 6.9344, 79.8428, 12000, {
    cityType: "south-asian",
    manualRegion: "ceylon"
  }),
  manualCity1522("agra|india", "Agra", "India", 27.18333, 78.01667, 100000, {
    portId: "agra",
    cityType: "south-asian",
    manualRegion: "north-india"
  }),
  manualCity1522("baghdad|iraq", "Baghdad", "Iraq", 33.34058, 44.40088, 60000, {
    cityType: "islamic-desert",
    manualRegion: "mesopotamia"
  }),
  manualCity1522("rhodes|greece", "Rhodes", "Greece", 36.434, 28.217, 12000, {
    cityType: "mediterranean",
    manualRegion: "eastern-mediterranean",
    marketGoods: ["wine", "olive-oil", "naval-stores"]
  }),
  // Sparse modern population observations omit many ports that were already
  // strategically important in 1522. Keep this layer selective: it restores
  // historical maritime gaps, not every recognizable modern coastal city.
  manualCity1522("bastia|italy", "Bastia", "Italy", 42.6973, 9.4509, 4000, {
    cityType: "mediterranean",
    manualRegion: "western-mediterranean",
    islandSettlement: true,
    marketGoods: ["wine", "olive-oil", "naval-stores"]
  }),
  manualCity1522("cagliari|italy", "Cagliari", "Italy", 39.2238, 9.1217, 12000, {
    cityType: "mediterranean",
    manualRegion: "western-mediterranean",
    islandSettlement: true,
    marketGoods: ["grain", "salt", "wine"]
  }),
  manualCity1522("ceuta|morocco", "Ceuta", "Morocco", 35.8894, -5.3213, 6000, {
    cityType: "mediterranean",
    manualRegion: "strait-of-gibraltar",
    marketGoods: ["fish", "salt", "naval-stores"]
  }),
  manualCity1522("algiers|algeria", "Algiers", "Algeria", 36.7538, 3.0588, 20000, {
    cityType: "islamic-desert",
    manualRegion: "barbary-coast",
    marketGoods: ["grain", "olive-oil", "wool"]
  }),
  manualCity1522("tripoli|libya", "Tripoli", "Libya", 32.8872, 13.1913, 15000, {
    cityType: "islamic-desert",
    manualRegion: "barbary-coast",
    marketGoods: ["salt", "olive-oil", "wool"]
  }),
  manualCity1522("birgu|malta", "Birgu", "Malta", 35.8881, 14.5222, 5000, {
    cityType: "mediterranean",
    manualRegion: "central-mediterranean",
    islandSettlement: true,
    marketGoods: ["fish", "salt", "naval-stores"]
  }),
  manualCity1522("syracuse|italy", "Syracuse", "Italy", 37.0755, 15.2866, 14000, {
    cityType: "mediterranean",
    manualRegion: "central-mediterranean",
    marketGoods: ["grain", "wine", "olive-oil"]
  }),
  manualCity1522("ragusa|croatia", "Ragusa", "Croatia", 42.6507, 18.0944, 12000, {
    cityType: "mediterranean",
    manualRegion: "adriatic",
    marketGoods: ["salt", "wool-cloth", "naval-stores"]
  }),
  manualCity1522("kerkira|greece", "Kerkira", "Greece", 39.6243, 19.9217, 8000, {
    cityType: "mediterranean",
    manualRegion: "adriatic",
    islandSettlement: true,
    marketGoods: ["olive-oil", "wine", "fish"]
  }),
  manualCity1522("funchal|portugal", "Funchal", "Portugal", 32.6509, -16.9097, 10000, {
    cityType: "mediterranean",
    manualRegion: "atlantic-islands",
    islandSettlement: true,
    marketGoods: ["sugar", "wine", "timber"]
  }),
  manualCity1522("angra|portugal", "Angra", "Portugal", 38.6547, -27.2208, 4000, {
    cityType: "mediterranean",
    manualRegion: "atlantic-islands",
    islandSettlement: true,
    marketGoods: ["grain", "fish", "cheese"]
  }),
  manualCity1522("las palmas|spain", "Las Palmas", "Spain", 28.1235, -15.4363, 6000, {
    cityType: "mediterranean",
    manualRegion: "atlantic-islands",
    islandSettlement: true,
    marketGoods: ["sugar", "wine", "fish"]
  }),
  manualCity1522("ribeira grande|cape verde", "Ribeira Grande", "Cape Verde", 14.9167, -23.6052, 4000, {
    cityType: "mediterranean",
    economyRegion: "sub-saharan",
    manualRegion: "atlantic-islands",
    islandSettlement: true,
    marketGoods: ["salt", "fish", "cotton"]
  }),
  manualCity1522("sao tome|sao tome and principe", "Sao Tome", "Sao Tome and Principe", 0.3365, 6.7273, 8000, {
    displayCity: "São Tomé",
    cityType: "mediterranean",
    economyRegion: "sub-saharan",
    manualRegion: "atlantic-islands",
    islandSettlement: true,
    marketGoods: ["sugar", "timber", "ivory"]
  }),
  manualCity1522("suez|egypt", "Suez", "Egypt", 29.9668, 32.5498, 5000, {
    cityType: "islamic-desert",
    manualRegion: "red-sea",
    marketGoods: ["grain", "cotton", "salt"]
  }),
  manualCity1522("male|maldives", "Male", "Maldives", 4.1755, 73.5093, 5000, {
    displayCity: "Malé",
    cityType: "south-asian",
    manualRegion: "indian-ocean-islands",
    islandSettlement: true,
    marketGoods: ["fish", "cotton", "sugar"]
  }),
  manualCity1522("maynila|philippines", "Maynila", "Philippines", 14.5995, 120.9842, 8000, {
    cityType: "southeast-asian",
    manualRegion: "south-china-sea",
    islandSettlement: true,
    marketGoods: ["rice", "cotton", "beeswax"]
  }),
  manualCity1522("san juan|puerto rico", "San Juan", "Puerto Rico", 18.4655, -66.1057, 4000, {
    cityType: "mediterranean",
    economyRegion: "caribbean",
    manualRegion: "spanish-main",
    islandSettlement: true,
    playerHomeExcluded: true,
    marketGoods: ["sugar", "gold", "fish"]
  }),
  manualCity1522("zanzibar|tanzania", "Zanzibar", "Tanzania", -6.1622, 39.1921, 10000, {
    cityType: "sub-saharan",
    manualRegion: "swahili-coast",
    islandSettlement: true,
    marketGoods: ["ivory", "beeswax", "fish"]
  }),
  manualCity1522("suq|yemen", "Suq", "Yemen", 12.65, 54.02, 3000, {
    cityType: "islamic-desert",
    manualRegion: "arabian-sea",
    islandSettlement: true,
    marketGoods: ["fish", "salt", "perfume"]
  }),
  manualVillage1522("edo|japan", "Edo", "Japan", 35.686, 139.754, 1500, {
    cityType: "east-asian",
    manualRegion: "edo-bay",
    marketGoods: ["fish", "rice", "timber"]
  }),
  manualVillage1522("nagasaki|japan", "Nagasaki", "Japan", 32.752558, 129.878192, 600, {
    cityType: "east-asian",
    manualRegion: "nagasaki-village",
    playerHomeExcluded: true,
    marketGoods: ["fish", "timber", "salt"]
  }),
  manualCity1522("ningbo|china", "Ningbo", "China", 29.8683, 121.544, 50000, {
    cityType: "east-asian",
    manualRegion: "lower-yangtze-coast",
    marketGoods: ["rice", "silk", "tea"]
  }),
  manualCity1522("tsuchizaki minato|japan", "Tsuchizaki Minato", "Japan", 39.7583, 140.0575, 3500, {
    cityType: "east-asian",
    manualRegion: "sea-of-japan",
    marketGoods: ["fish", "timber", "naval-stores"]
  }),
  manualCity1522("naoetsu|japan", "Naoetsu", "Japan", 37.184, 138.242, 4500, {
    cityType: "east-asian",
    manualRegion: "sea-of-japan",
    marketGoods: ["rice", "fish", "salt"]
  }),
  manualVillage1522("kaminokuni|japan", "Kaminokuni", "Japan", 41.802, 140.121, 1200, {
    cityType: "east-asian",
    manualRegion: "southern-ezo",
    islandSettlement: true,
    marketGoods: ["fish", "furs", "timber"]
  }),
  manualVillage1522("akkeshi kotan|japan", "Akkeshi Kotan", "Japan", 43.0356, 144.8469, 1000, {
    cityType: "east-asian",
    manualRegion: "ainu-mosir",
    islandSettlement: true,
    playerHomeExcluded: true,
    marketGoods: ["fish", "furs", "timber"]
  }),
  manualCity1522("tsushima fuchu|japan", "Tsushima Fuchu", "Japan", 34.203, 129.287, 3000, {
    displayCity: "Tsushima Fuchu",
    cityType: "east-asian",
    manualRegion: "tsushima",
    islandSettlement: true,
    marketGoods: ["fish", "salt", "timber"]
  }),
  manualCity1522("naha|japan", "Naha", "Japan", 26.2124, 127.6809, 8000, {
    cityType: "east-asian",
    manualRegion: "ryukyu-islands",
    islandSettlement: true,
    marketGoods: ["rice", "sulfur", "lacquerware"]
  }),
  manualVillage1522("banda village|indonesia", "Banda Village", "Indonesia", -4.5234, 129.9002, 3500, {
    cityType: "southeast-asian",
    manualRegion: "spice-islands",
    islandSettlement: true,
    marketGoods: ["nutmeg", "fish", "timber"]
  }),
  manualVillage1522("hitu village|indonesia", "Hitu Village", "Indonesia", -3.5833, 128.1833, 3000, {
    cityType: "southeast-asian",
    manualRegion: "spice-islands",
    islandSettlement: true,
    marketGoods: ["sugar", "fish", "timber"]
  }),
  manualVillage1522("makian village|indonesia", "Makian Village", "Indonesia", 0.3204, 127.3695, 2200, {
    cityType: "southeast-asian",
    manualRegion: "spice-islands",
    islandSettlement: true,
    placementLat: 0.14578206837177277,
    placementLon: 127.42520141601562,
    marketGoods: ["cloves", "fish", "timber"]
  }),
  manualVillage1522("gane village|indonesia", "Gane Village", "Indonesia", -0.1213, 127.9028, 2000, {
    cityType: "southeast-asian",
    manualRegion: "spice-islands",
    islandSettlement: true,
    marketGoods: ["fish", "timber", "naval-stores"]
  }),
  manualVillage1522("buru village|indonesia", "Buru Village", "Indonesia", -3.2619, 127.0929, 2500, {
    cityType: "southeast-asian",
    manualRegion: "spice-islands",
    islandSettlement: true,
    marketGoods: ["fish", "timber", "beeswax"]
  }),
  manualCity1522("aden|yemen", "Aden", "Yemen", 12.7855, 45.0187, 35000, {
    manualRegion: "red-sea"
  }),
  manualCity1522("jeddah|saudi arabia", "Jeddah", "Saudi Arabia", 21.5433, 39.1728, 25000, {
    manualRegion: "red-sea"
  }),
  manualCity1522("mecca|saudi arabia", "Mecca", "Saudi Arabia", 21.42667, 39.82611, 34000, {
    cityType: "islamic-desert",
    manualRegion: "hejaz",
    coastalIntent: false,
    requiredTradePort: false,
    marketGoods: ["grain", "cotton", "perfume"]
  }),
  manualCity1522("muscat|oman", "Muscat", "Oman", 23.588, 58.3829, 20000, {
    manualRegion: "arabian-sea"
  }),
  manualCity1522("diu|india", "Diu", "India", 20.7144, 70.9874, 25000, {
    manualRegion: "gujarat"
  }),
  manualCity1522("surat|india", "Surat", "India", 21.1702, 72.8311, 35000, {
    manualRegion: "gujarat"
  }),
  manualCity1522("sofala|mozambique", "Sofala", "Mozambique", -20.1653, 34.7153, 12000, {
    manualRegion: "swahili-coast"
  }),
  manualCity1522("mozambique|mozambique", "Mozambique", "Mozambique", -15.0342, 40.7358, 10000, {
    manualRegion: "swahili-coast"
  }),
  manualCity1522("mombasa|kenya", "Mombasa", "Kenya", -4.0435, 39.6682, 20000, {
    manualRegion: "swahili-coast"
  }),
  manualCity1522("kilwa|tanzania", "Kilwa", "Tanzania", -8.957, 39.51, 30000, {
    manualRegion: "swahili-coast"
  }),
  manualCity1522("mogadishu|somalia", "Mogadishu", "Somalia", 2.0469, 45.3182, 30000, {
    manualRegion: "swahili-coast"
  }),
  manualCity1522("santo domingo|dominican republic", "Santo Domingo", "Dominican Republic", 18.4861, -69.9312, 20000, {
    cityType: "mediterranean",
    manualRegion: "spanish-main",
    playerHomeExcluded: true
  }),
  manualCity1522("havana|cuba", "Havana", "Cuba", 23.1136, -82.3666, 8000, {
    cityType: "mediterranean",
    manualRegion: "spanish-main",
    playerHomeExcluded: true
  }),
  manualCity1522("veracruz|mexico", "Veracruz", "Mexico", 19.1738, -96.1342, 5000, {
    cityType: "mediterranean",
    manualRegion: "spanish-main",
    playerHomeExcluded: true
  }),
  manualVillage1522("xicalango|mexico", "Xicalango", "Mexico", 18.65, -91.82, 2800, {
    cityType: "mesoamerican",
    manualRegion: "mesoamerican-villages",
    marketGoods: ["fish", "cacao", "cotton"]
  }),
  manualVillage1522("chakan putum|mexico", "Chakan Putum", "Mexico", 19.35, -90.72, 2400, {
    cityType: "mesoamerican",
    manualRegion: "mesoamerican-villages",
    marketGoods: ["fish", "cotton", "salt"]
  }),
  manualVillage1522("cuzamil|mexico", "Cuzamil", "Mexico", 20.43, -86.92, 1800, {
    cityType: "mesoamerican",
    manualRegion: "mesoamerican-villages",
    islandSettlement: true,
    marketGoods: ["fish", "salt", "cotton"]
  }),
  manualCity1522("nombre de dios|panama", "Nombre de Dios", "Panama", 9.5833, -79.4667, 5000, {
    cityType: "mediterranean",
    manualRegion: "spanish-main",
    playerHomeExcluded: true
  }),
  manualCity1522("panama city|panama", "Panama City", "Panama", 8.9824, -79.5199, 7000, {
    cityType: "mediterranean",
    manualRegion: "spanish-main",
    playerHomeExcluded: true
  }),
  manualCity1522("chanchan|peru", "Chanchan", "Peru", -8.106, -79.074536, 25000, {
    cityType: "andean",
    economyRegion: "andean-coast",
    manualRegion: "inca-coast"
  }),
  manualVillage1522("fiji village|fiji", "Fiji Village", "Fiji", -18.1416, 178.4419, 3500, {
    cityType: "polynesian",
    manualRegion: "pacific-islands",
    islandSettlement: true,
    marketGoods: ["fish", "timber", "sugar"]
  }),
  manualVillage1522("tonga village|tonga", "Tonga Village", "Tonga", -21.1394, -175.2049, 3000, {
    cityType: "polynesian",
    manualRegion: "pacific-islands",
    islandSettlement: true,
    marketGoods: ["fish", "timber", "sugar"]
  }),
  manualVillage1522("samoa village|samoa", "Samoa Village", "Samoa", -13.8333, -171.75, 3000, {
    cityType: "polynesian",
    manualRegion: "pacific-islands",
    islandSettlement: true,
    marketGoods: ["fish", "timber", "sugar"]
  }),
  manualVillage1522("tahiti village|french polynesia", "Tahiti Village", "French Polynesia", -17.5516, -149.5585, 3000, {
    cityType: "polynesian",
    manualRegion: "pacific-islands",
    islandSettlement: true,
    marketGoods: ["fish", "timber", "artwork"]
  }),
  manualVillage1522("hawaii village|hawaii", "Hawaii Village", "Hawaii", 19.4756, -155.9225, 3500, {
    cityType: "polynesian",
    manualRegion: "pacific-islands",
    islandSettlement: true,
    marketGoods: ["fish", "sugar", "artwork"]
  }),
  manualVillage1522("rarotonga village|cook islands", "Rarotonga Village", "Cook Islands", -21.2367, -159.7777, 2200, {
    cityType: "polynesian",
    manualRegion: "pacific-islands",
    islandSettlement: true,
    marketGoods: ["fish", "timber", "artwork"]
  }),
  manualVillage1522("niue village|niue", "Niue Village", "Niue", -19.0544, -169.8672, 1100, {
    cityType: "polynesian",
    manualRegion: "pacific-islands",
    islandSettlement: true,
    marketGoods: ["fish", "timber", "sugar"]
  }),
  manualVillage1522("rangiroa village|french polynesia", "Rangiroa Village", "French Polynesia", -14.9667, -147.6333, 1000, {
    cityType: "polynesian",
    manualRegion: "pacific-islands",
    islandSettlement: true,
    marketGoods: ["fish", "salt", "artwork"]
  }),
  manualVillage1522("tarawa village|kiribati", "Tarawa Village", "Kiribati", 1.4518, 173.0312, 1800, {
    cityType: "polynesian",
    manualRegion: "pacific-islands",
    islandSettlement: true,
    marketGoods: ["fish", "salt", "artwork"]
  }),
  manualVillage1522("rapa nui village|rapa nui", "Rapa Nui Village", "Rapa Nui", -27.1212, -109.3664, 1800, {
    cityType: "polynesian",
    manualRegion: "pacific-islands",
    islandSettlement: true,
    marketGoods: ["fish", "dyes", "artwork"]
  }),
  manualVillage1522("bay of islands village|aotearoa", "Bay of Islands Village", "Aotearoa", -35.2285, 174.0915, 2400, {
    cityType: "polynesian",
    manualRegion: "pacific-islands",
    islandSettlement: true,
    marketGoods: ["fish", "timber", "artwork"]
  }),
  manualVillage1522("rikitea village|french polynesia", "Rikitea Village", "French Polynesia", -23.12, -134.97, 2500, {
    cityType: "polynesian",
    manualRegion: "pacific-islands",
    islandSettlement: true,
    marketGoods: ["fish", "timber", "artwork"]
  }),
  manualVillage1522("tubuai village|french polynesia", "Tubuai Village", "French Polynesia", -23.38, -149.48, 1800, {
    cityType: "polynesian",
    manualRegion: "pacific-islands",
    islandSettlement: true,
    marketGoods: ["fish", "timber", "sugar"]
  }),
  manualVillage1522("babeldaob village|palau", "Babeldaob Village", "Palau", 7.5, 134.5, 3000, {
    cityType: "polynesian",
    manualRegion: "pacific-islands",
    islandSettlement: true,
    marketGoods: ["fish", "timber", "artwork"]
  }),
  manualVillage1522("yap village|federated states of micronesia", "Yap Village", "Federated States of Micronesia", 9.52, 138.12, 2500, {
    cityType: "polynesian",
    manualRegion: "pacific-islands",
    islandSettlement: true,
    marketGoods: ["fish", "timber", "artwork"]
  }),
  manualVillage1522("chuuk village|federated states of micronesia", "Chuuk Village", "Federated States of Micronesia", 7.55, 151.76, 3000, {
    cityType: "polynesian",
    manualRegion: "pacific-islands",
    islandSettlement: true,
    marketGoods: ["fish", "timber", "sugar"]
  }),
  manualVillage1522("nan madol|federated states of micronesia", "Nan Madol", "Federated States of Micronesia", 6.85, 158.23, 3000, {
    cityType: "polynesian",
    manualRegion: "pacific-islands",
    islandSettlement: true,
    marketGoods: ["fish", "timber", "artwork"]
  }),
  manualVillage1522("kosrae village|federated states of micronesia", "Kosrae Village", "Federated States of Micronesia", 5.32, 162.98, 1800, {
    cityType: "polynesian",
    manualRegion: "pacific-islands",
    islandSettlement: true,
    marketGoods: ["fish", "timber", "sugar"]
  }),
  manualVillage1522("majuro village|marshall islands", "Majuro Village", "Marshall Islands", 7.1, 171.38, 1500, {
    cityType: "polynesian",
    manualRegion: "pacific-islands",
    islandSettlement: true,
    marketGoods: ["fish", "salt", "artwork"]
  }),
  manualVillage1522("nauru village|nauru", "Nauru Village", "Nauru", -0.52, 166.93, 1200, {
    cityType: "polynesian",
    manualRegion: "pacific-islands",
    islandSettlement: true,
    marketGoods: ["fish", "salt", "artwork"]
  }),
  manualVillage1522("banaba village|kiribati", "Banaba Village", "Kiribati", -0.86, 169.54, 900, {
    cityType: "polynesian",
    manualRegion: "pacific-islands",
    islandSettlement: true,
    marketGoods: ["fish", "salt", "artwork"]
  }),
  manualVillage1522("rotuma village|fiji", "Rotuma Village", "Fiji", -12.52, 176.99, 1800, {
    cityType: "polynesian",
    manualRegion: "pacific-islands",
    islandSettlement: true,
    marketGoods: ["fish", "timber", "sugar"]
  }),
  manualVillage1522("uvea village|wallis and futuna", "Uvea Village", "Wallis and Futuna", -13.28, -176.18, 1800, {
    cityType: "polynesian",
    manualRegion: "pacific-islands",
    islandSettlement: true,
    marketGoods: ["fish", "timber", "sugar"]
  }),
  manualVillage1522("futuna village|wallis and futuna", "Futuna Village", "Wallis and Futuna", -14.28, -178.15, 1200, {
    cityType: "polynesian",
    manualRegion: "pacific-islands",
    islandSettlement: true,
    marketGoods: ["fish", "timber", "sugar"]
  }),
  manualVillage1522("funafuti village|tuvalu", "Funafuti Village", "Tuvalu", -8.52, 179.2, 1000, {
    cityType: "polynesian",
    manualRegion: "pacific-islands",
    islandSettlement: true,
    marketGoods: ["fish", "salt", "artwork"]
  }),
  manualVillage1522("tokelau village|tokelau", "Tokelau Village", "Tokelau", -9.2, -171.85, 800, {
    cityType: "polynesian",
    manualRegion: "pacific-islands",
    islandSettlement: true,
    marketGoods: ["fish", "salt", "artwork"]
  }),
  manualVillage1522("lifou village|new caledonia", "Lifou Village", "New Caledonia", -20.9, 167.25, 2200, {
    cityType: "polynesian",
    manualRegion: "pacific-islands",
    islandSettlement: true,
    marketGoods: ["fish", "timber", "artwork"]
  }),
  manualVillage1522("yuquot village|nuu-chah-nulth", "Yuquot Village", "Nuu-chah-nulth", 49.5926, -126.6174, 1500, {
    cityType: "mesoamerican",
    manualRegion: "northwest-coast",
    npcInterregionalTradeExcluded: true,
    marketGoods: ["beaver-pelts", "fish", "timber"]
  }),
  manualVillage1522("ozette village|makah", "Ozette Village", "Makah", 48.1533, -124.7331, 1000, {
    cityType: "mesoamerican",
    manualRegion: "northwest-coast",
    npcInterregionalTradeExcluded: true,
    marketGoods: ["beaver-pelts", "fish", "timber"]
  }),
  manualVillage1522("wendat village|canada", "Wendat Village", "Canada", 44.75, -79.88, 1800, {
    cityType: "mesoamerican",
    manualRegion: "great-lakes",
    coastalIntent: false,
    lakeIntent: true,
    npcInterregionalTradeExcluded: true,
    marketGoods: ["beaver-pelts", "fish", "grain"]
  }),
  manualVillage1522("guanahani village|bahamas", "Guanahani Village", "Bahamas", 24.059, -74.474, 1200, {
    cityType: "mesoamerican",
    manualRegion: "explorer-encounters",
    islandSettlement: true,
    marketGoods: ["fish", "cotton", "salt"]
  }),
  manualVillage1522("coroa vermelha village|brazil", "Coroa Vermelha Village", "Brazil", -16.3338, -39.0117, 1600, {
    cityType: "mesoamerican",
    manualRegion: "explorer-encounters",
    marketGoods: ["fish", "timber", "dyes"]
  }),
  manualVillage1522("mossel bay village|south africa", "Mossel Bay Village", "South Africa", -34.1831, 22.1461, 1400, {
    cityType: "sub-saharan",
    manualRegion: "explorer-encounters",
    marketGoods: ["fish", "salt", "wool"]
  }),
  manualVillage1522("umatac village|guam", "Umatac Village", "Guam", 13.298, 144.659, 1400, {
    cityType: "polynesian",
    manualRegion: "explorer-encounters",
    islandSettlement: true,
    marketGoods: ["fish", "timber", "sugar"]
  }),
  manualVillage1522("mactan village|philippines", "Mactan Village", "Philippines", 10.3075, 123.9794, 2500, {
    cityType: "southeast-asian",
    manualRegion: "explorer-encounters",
    islandSettlement: true,
    marketGoods: ["fish", "rice", "cotton"]
  }),
  manualVillage1522("vaitahu village|french polynesia", "Vaitahu Village", "French Polynesia", -9.9372, -139.111, 900, {
    cityType: "polynesian",
    manualRegion: "explorer-encounters",
    islandSettlement: true,
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
    cityTerritoryId(coastal) === cityTerritoryId(city) &&
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
  if (cityMustRemainInland(city)) return false;
  return Boolean(
    city?.declaredCapitalFactionId ||
    city?.requiredTradePort ||
    cityHasWaterAccessIntent(city)
  );
}

function cityLabelText(city) {
  return city.displayCity || city.city || "";
}

function manualCity1522(cityId, city, country, lat, lon, population, details = {}) {
  return Object.freeze(withColonialFounding({
    cityId,
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

function manualVillage1522(cityId, city, country, lat, lon, population, details = {}) {
  return manualCity1522(cityId, city, country, lat, lon, population, {
    ...details,
    settlementType: "village"
  });
}
