export const LEPANTO_SCENARIO_ID = "lepanto-1571";
export const HOLY_LEAGUE_SIDE_ID = "holy-league";
export const OTTOMAN_SIDE_ID = "ottoman-empire";

const GALLEY_SLUG = "mediterranean-galley";
const GALLEASS_SLUG = "galleass";
const GALLEON_SLUG = "galleon";
const CARRACK_SLUG = "carrack";
const FUSTA_SLUG = "fusta";

const LEPANTO_SCENARIO = scenario({
  id: LEPANTO_SCENARIO_ID,
  title: "Battle of Lepanto",
  date: "7 October 1571",
  location: "Gulf of Patras",
  map: {
    id: "lepanto-gulf-of-patras",
    width: 7680,
    height: 5920,
    latitudeDeg: 38.2,
    wind: {
      // The morning breeze initially favoured the westbound Ottoman fleet.
      directionRad: 0,
      strength: 0.44
    },
    escape: {
      sideId: OTTOMAN_SIDE_ID,
      edge: "east",
      victoryCount: 82
    }
  },
  sides: [
    side({
      id: HOLY_LEAGUE_SIDE_ID,
      name: "Holy League",
      shortName: "League",
      color: "#3978a8",
      headingRad: 0,
      squadrons: [
        squadron("league-galleasses", "Galleass Vanguard", "Francesco Duodo", 20.32, 38.18, 6, [
          shipGroup(GALLEASS_SLUG, 6, "galleass", "venice", 36, ["matchlock-arquebuses"])
        ], 3, { rowSpacingPx: 230, columnSpacingPx: 104 }),
        squadron("league-left", "Left Wing", "Agostino Barbarigo", 19.95, 38.43, 53, [
          shipGroup(GALLEY_SLUG, 53, "galley", "venice", 8, ["matchlock-arquebuses"])
        ], 9, { rowSpacingPx: 42, columnSpacingPx: 64 }),
        squadron("league-center", "Center", "Don John of Austria", 19.92, 38.22, 62, [
          shipGroup(GALLEY_SLUG, 38, "galley", "spain", 8, ["matchlock-arquebuses"]),
          shipGroup(GALLEY_SLUG, 12, "galley", "venice", 8, ["matchlock-arquebuses"]),
          shipGroup(GALLEY_SLUG, 7, "galley", "papal-states", 8, ["matchlock-arquebuses"]),
          shipGroup(GALLEY_SLUG, 5, "galley", "habsburg", 8, ["matchlock-arquebuses"])
        ], 10, { rowSpacingPx: 42, columnSpacingPx: 64 }),
        squadron("league-right", "Right Wing", "Giovanni Andrea Doria", 19.95, 38.01, 53, [
          shipGroup(GALLEY_SLUG, 27, "galley", "genoa", 8, ["matchlock-arquebuses"]),
          shipGroup(GALLEY_SLUG, 20, "galley", "venice", 8, ["matchlock-arquebuses"]),
          shipGroup(GALLEY_SLUG, 6, "galley", "spain", 8, ["matchlock-arquebuses"])
        ], 9, { rowSpacingPx: 42, columnSpacingPx: 64 }),
        squadron("league-reserve", "Reserve", "Alvaro de Bazan", 19.68, 38.22, 38, [
          shipGroup(GALLEY_SLUG, 18, "galley", "venice", 8, ["matchlock-arquebuses"]),
          shipGroup(GALLEY_SLUG, 5, "galley", "spain", 8, ["matchlock-arquebuses"]),
          shipGroup(GALLEY_SLUG, 5, "galley", "papal-states", 8, ["matchlock-arquebuses"]),
          shipGroup(GALLEY_SLUG, 7, "galley", "habsburg", 8, ["matchlock-arquebuses"]),
          shipGroup(GALLEY_SLUG, 3, "galley", "hospitallers", 8, ["matchlock-arquebuses"])
        ], 8, { rowSpacingPx: 42, columnSpacingPx: 64 }),
        squadron("league-sailing", "Sailing Squadron", "Cesare d'Avalos", 19.78, 37.72, 26, [
          shipGroup(GALLEON_SLUG, 24, "sailing-warship", "spain", 24, ["matchlock-arquebuses"]),
          shipGroup(CARRACK_SLUG, 2, "sailing-warship", "venice", 20, ["matchlock-arquebuses"])
        ], 6, { rowSpacingPx: 48, columnSpacingPx: 76 }),
        squadron("league-auxiliaries", "Auxiliary Squadron", "Juan de Cardona", 19.74, 37.93, 76, [
          shipGroup(FUSTA_SLUG, 50, "auxiliary", "spain", 2, ["matchlock-arquebuses"]),
          shipGroup(FUSTA_SLUG, 20, "auxiliary", "venice", 2, ["matchlock-arquebuses"]),
          shipGroup(FUSTA_SLUG, 6, "auxiliary", "papal-states", 2, ["matchlock-arquebuses"])
        ], 10, { rowSpacingPx: 32, columnSpacingPx: 46 })
      ]
    }),
    side({
      id: OTTOMAN_SIDE_ID,
      name: "Ottoman Empire",
      shortName: "Ottomans",
      color: "#c04b56",
      headingRad: Math.PI,
      squadrons: [
        squadron("ottoman-right", "Right Wing", "Mehmed Siroco", 20.88, 38.38, 71, [
          shipGroup(GALLEY_SLUG, 55, "galley", "ottoman", 4, ["composite-recurve-bows"]),
          shipGroup(FUSTA_SLUG, 16, "galliot", "ottoman", 2, ["composite-recurve-bows"])
        ], 10, { rowSpacingPx: 38, columnSpacingPx: 60 }),
        squadron("ottoman-center", "Center", "Muezzinzade Ali Pasha", 20.90, 38.17, 107, [
          shipGroup(GALLEY_SLUG, 87, "galley", "ottoman", 4, ["composite-recurve-bows"]),
          shipGroup(FUSTA_SLUG, 20, "galliot", "ottoman", 2, ["composite-recurve-bows"])
        ], 12, { rowSpacingPx: 38, columnSpacingPx: 60 }),
        squadron("ottoman-left", "Left Wing", "Uluc Ali", 20.88, 37.94, 77, [
          shipGroup(GALLEY_SLUG, 61, "galley", "ottoman", 4, ["composite-recurve-bows"]),
          shipGroup(FUSTA_SLUG, 16, "galliot", "ottoman", 2, ["composite-recurve-bows"])
        ], 10, { rowSpacingPx: 38, columnSpacingPx: 60 }),
        squadron("ottoman-reserve", "Reserve", "Murat Dragut", 21.08, 38.17, 17, [
          shipGroup(GALLEY_SLUG, 13, "galley", "ottoman", 4, ["composite-recurve-bows"]),
          shipGroup(FUSTA_SLUG, 4, "galliot", "ottoman", 2, ["composite-recurve-bows"])
        ], 7, { rowSpacingPx: 38, columnSpacingPx: 60 })
      ]
    })
  ]
});

export const HISTORICAL_BATTLE_SCENARIOS = Object.freeze([LEPANTO_SCENARIO]);

export function historicalBattleScenarioById(id) {
  const found = HISTORICAL_BATTLE_SCENARIOS.find((entry) => entry.id === id);
  if (!found) throw new Error(`Unknown historical battle scenario: ${id}`);
  return found;
}

export function historicalBattleSideById(scenarioValue, sideId) {
  assertScenario(scenarioValue);
  const found = scenarioValue.sides.find((entry) => entry.id === sideId);
  if (!found) throw new Error(`Unknown ${scenarioValue.id} side: ${sideId}`);
  return found;
}

export function historicalBattleSquadronById(sideValue, squadronId) {
  assertSide(sideValue);
  const found = sideValue.squadrons.find((entry) => entry.id === squadronId);
  if (!found) throw new Error(`Unknown ${sideValue.id} squadron: ${squadronId}`);
  return found;
}

export function historicalBattleScenarioShipCount(scenarioValue, sideId = null) {
  assertScenario(scenarioValue);
  const sides = sideId === null
    ? scenarioValue.sides
    : [historicalBattleSideById(scenarioValue, sideId)];
  return sides.reduce((sideTotal, sideValue) => sideTotal + sideValue.squadrons.reduce(
    (squadronTotal, squadronValue) => squadronTotal + squadronValue.count,
    0
  ), 0);
}

function scenario(value) {
  if (!value || typeof value !== "object") throw new Error("Historical battle scenario is required");
  if (!value.id || !value.title || !value.date || !value.location) {
    throw new Error("Historical battle scenario metadata is incomplete");
  }
  if (!Number.isInteger(value.map?.width) || !Number.isInteger(value.map?.height)) {
    throw new Error(`Historical battle map dimensions are invalid: ${value.id}`);
  }
  if (!Array.isArray(value.sides) || value.sides.length !== 2) {
    throw new Error(`Historical battle must have exactly two sides: ${value.id}`);
  }
  const ids = new Set();
  for (const sideValue of value.sides) {
    if (ids.has(sideValue.id)) throw new Error(`Duplicate historical battle side: ${sideValue.id}`);
    ids.add(sideValue.id);
  }
  return deepFreeze(value);
}

function side(value) {
  if (!value?.id || !value.name || !value.shortName || !value.color) {
    throw new Error("Historical battle side metadata is incomplete");
  }
  if (!Number.isFinite(value.headingRad)) throw new Error(`Invalid side heading: ${value.id}`);
  if (!Array.isArray(value.squadrons) || value.squadrons.length === 0) {
    throw new Error(`Historical battle side has no squadrons: ${value.id}`);
  }
  const ids = new Set();
  for (const squadronValue of value.squadrons) {
    if (ids.has(squadronValue.id)) throw new Error(`Duplicate historical battle squadron: ${squadronValue.id}`);
    ids.add(squadronValue.id);
  }
  return value;
}

function squadron(
  id,
  name,
  commander,
  longitudeDeg,
  latitudeDeg,
  count,
  shipGroups,
  frontage,
  formation = {}
) {
  if (!id || !name || !commander) throw new Error("Historical squadron metadata is incomplete");
  if (!Number.isFinite(longitudeDeg) || !Number.isFinite(latitudeDeg)) {
    throw new Error(`Invalid squadron geographic anchor: ${id}`);
  }
  if (!Number.isInteger(count) || count <= 0) throw new Error(`Invalid squadron count: ${id}`);
  if (!Number.isInteger(frontage) || frontage <= 0) throw new Error(`Invalid squadron frontage: ${id}`);
  if (formation.rowSpacingPx !== undefined &&
      (!Number.isFinite(formation.rowSpacingPx) || formation.rowSpacingPx <= 0)) {
    throw new Error(`Invalid squadron row spacing: ${id}`);
  }
  if (formation.columnSpacingPx !== undefined &&
      (!Number.isFinite(formation.columnSpacingPx) || formation.columnSpacingPx <= 0)) {
    throw new Error(`Invalid squadron column spacing: ${id}`);
  }
  const groupCount = shipGroups.reduce((total, group) => total + group.count, 0);
  if (groupCount !== count) {
    throw new Error(`Historical squadron count mismatch: ${id} ${groupCount}/${count}`);
  }
  return {
    id,
    name,
    commander,
    longitudeDeg,
    latitudeDeg,
    count,
    shipGroups,
    frontage,
    ...formation
  };
}

function shipGroup(shipSlug, count, role, factionId, cannons, portableWeaponItemIds) {
  if (!shipSlug || !role || !factionId || !Number.isInteger(count) || count <= 0) {
    throw new Error(`Invalid historical battle ship group: ${shipSlug}/${count}/${role}`);
  }
  if (!Number.isInteger(cannons) || cannons < 0) {
    throw new Error(`Invalid historical battle cannon count: ${shipSlug}/${cannons}`);
  }
  if (!Array.isArray(portableWeaponItemIds) || portableWeaponItemIds.length === 0) {
    throw new Error(`Historical battle ship group has no small arms: ${shipSlug}/${factionId}`);
  }
  return { shipSlug, count, role, factionId, cannons, portableWeaponItemIds };
}

function assertScenario(value) {
  if (!value || !HISTORICAL_BATTLE_SCENARIOS.includes(value)) {
    throw new Error("Historical battle operation requires a catalog scenario");
  }
}

function assertSide(value) {
  if (!value || typeof value.id !== "string" || !Array.isArray(value.squadrons)) {
    throw new Error("Historical battle operation requires a valid side");
  }
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}
