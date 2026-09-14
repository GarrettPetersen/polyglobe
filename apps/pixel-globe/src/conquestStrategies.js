import { assertFactionId } from "./factions.js";
import { requireCityId } from "./entityIds.js";

// These are tunable gameplay interpretations, not claims that historical courts
// used numeric objectives. Evidence and limits: docs/conquest-strategies.md.
const FRONTIER = Object.freeze({ frontierImportance: 0.8, capitalImportance: 0.45, populationPower: 1 });
const MARITIME = Object.freeze({ frontierImportance: 0.35, capitalImportance: 0.1, populationPower: 0.5 });
const TERRITORIAL = Object.freeze({ frontierImportance: 0.85, capitalImportance: 0.55, populationPower: 1.3 });
const MIXED = Object.freeze({ frontierImportance: 0.65, capitalImportance: 0.3, populationPower: 1 });
const ARCHIPELAGIC = Object.freeze({ frontierImportance: 0.65, capitalImportance: 0.2, populationPower: 0.5 });
const STRATEGIES = Object.freeze({
  portugal: MARITIME,
  venice: MIXED,
  ottoman: MIXED,
  mughal: TERRITORIAL,
  muscovy: TERRITORIAL,
  tidore: ARCHIPELAGIC,
  ternate: ARCHIPELAGIC
});

// Canonical IDs deliberately separate strategic sites from their current ruler.
// Interests stay useful after conquest, renaming, or counterfactual loss.
export const CONQUEST_STRATEGIC_INTERESTS = Object.freeze({
  portugal: Object.freeze({
    "malacca|malaysia": 8, "hormuz|iran": 8, "goa|india": 6,
    "aden|yemen": 5, "diu|india": 4, "muscat|oman": 3,
    "banda village|indonesia": 4, "ternate|indonesia": 3
  }),
  ottoman: Object.freeze({
    "rhodes|greece": 4, "aden|yemen": 3, "hormuz|iran": 2,
    "baghdad|iraq": 3, "budapest|hungary": 3, "tunis|tunisia": 3
  }),
  venice: Object.freeze({ "kerkira|greece": 4, "iraklion|greece": 4, "nicosia|cyprus": 4 }),
  tidore: Object.freeze({ "ternate|indonesia": 3 }),
  ternate: Object.freeze({ "tidore|indonesia": 3 })
});
for (const [factionId, interests] of Object.entries(CONQUEST_STRATEGIC_INTERESTS)) {
  assertFactionId(factionId);
  for (const [cityId, weight] of Object.entries(interests)) {
    if (!cityId || !Number.isFinite(weight) || weight <= 0) throw new Error(`Invalid conquest interest: ${factionId}/${cityId}`);
  }
}

export function conquestStrategicWeight(issuerFactionId, port, { frontierDistanceKm, capitalDistanceKm }) {
  const id = assertFactionId(issuerFactionId);
  const cityId = requireCityId(port, "Conquest strategy target");
  assertDistance(frontierDistanceKm);
  if (capitalDistanceKm !== null) assertDistance(capitalDistanceKm);
  // Unresearched countries use an explicit general gameplay policy, not an
  // invented historical personality or a restriction on their ambitions.
  const strategy = STRATEGIES[id] || FRONTIER;
  const population = Number(port.population ?? 1);
  if (!Number.isFinite(population) || population < 0) throw new Error(`Invalid conquest population: ${cityId}`);
  const frontier = distancePreference(frontierDistanceKm, strategy.frontierImportance, 2200);
  const capital = capitalDistanceKm === null ? 1
    : distancePreference(capitalDistanceKm, strategy.capitalImportance, 4000);
  const populationValue = (1 + Math.log10(1 + population / 2500)) ** strategy.populationPower;
  const interest = CONQUEST_STRATEGIC_INTERESTS[id]?.[cityId] || 1;
  return frontier * capital * populationValue * interest;
}

function distancePreference(distanceKm, importance, scaleKm) {
  // The positive floor makes distance a preference, never a worldwide veto.
  return 1 - importance + importance / (1 + distanceKm / scaleKm);
}

function assertDistance(distanceKm) {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) throw new Error(`Invalid conquest distance in km: ${distanceKm}`);
}
