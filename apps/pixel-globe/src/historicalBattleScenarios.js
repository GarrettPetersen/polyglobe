export const LEPANTO_SCENARIO_ID = "lepanto-1571";
export const HOLY_LEAGUE_SIDE_ID = "holy-league";
export const OTTOMAN_SIDE_ID = "ottoman-empire";

const GALLEY_SLUG = "mediterranean-galley";
const GALLEASS_SLUG = "galleass";
const GALLEON_SLUG = "galleon";
const CARRACK_SLUG = "carrack";
const FUSTA_SLUG = "fusta";
const LEPANTO_PORTRAIT_ROOT = "assets/characters/historical-battles/lepanto";

const LEPANTO_SCENARIO = scenario({
  id: LEPANTO_SCENARIO_ID,
  title: "Battle of Lepanto",
  titleKey: "historical.scenario.lepanto-1571.title",
  mapLabelKey: "historical.scenario.lepanto-1571.mapLabel",
  date: "7 October 1571",
  location: "Gulf of Patras",
  selection: {
    marker: {
      longitudeDeg: 21.25,
      latitudeDeg: 38.2,
      shipSlug: GALLEASS_SLUG
    },
    commanders: [
      commander(
        "john-of-austria",
        HOLY_LEAGUE_SIDE_ID,
        "league-center",
        GALLEY_SLUG,
        `${LEPANTO_PORTRAIT_ROOT}/john-of-austria.png`
      ),
      commander(
        "agostino-barbarigo",
        HOLY_LEAGUE_SIDE_ID,
        "league-left",
        GALLEY_SLUG,
        `${LEPANTO_PORTRAIT_ROOT}/agostino-barbarigo.png`
      ),
      commander(
        "giovanni-andrea-doria",
        HOLY_LEAGUE_SIDE_ID,
        "league-right",
        GALLEY_SLUG,
        `${LEPANTO_PORTRAIT_ROOT}/giovanni-andrea-doria.png`
      ),
      commander(
        "ali-pasha",
        OTTOMAN_SIDE_ID,
        "ottoman-center",
        GALLEY_SLUG,
        `${LEPANTO_PORTRAIT_ROOT}/ali-pasha.png`
      ),
      commander(
        "mahomet-sirocco",
        OTTOMAN_SIDE_ID,
        "ottoman-right",
        GALLEY_SLUG,
        `${LEPANTO_PORTRAIT_ROOT}/mahomet-sirocco.png`
      ),
      commander(
        "uluc-ali",
        OTTOMAN_SIDE_ID,
        "ottoman-left",
        GALLEY_SLUG,
        `${LEPANTO_PORTRAIT_ROOT}/uluc-ali.png`
      )
    ],
    supportingCharacters: [
      supportingCharacter(
        "christian-oarsman",
        OTTOMAN_SIDE_ID,
        "historical.character.christian-oarsman",
        "historical.dialogue.oarsmanRole",
        `${LEPANTO_PORTRAIT_ROOT}/christian-oarsman.png`,
        "left"
      )
    ]
  },
  map: {
    id: "lepanto-gulf-of-patras",
    width: 48000,
    height: 43200,
    latitudeDeg: 38.2,
    wind: {
      // An east wind aided the westbound Ottomans, then lulled and reversed
      // shortly before contact so a light west wind favoured the Holy League.
      directionRad: 0,
      strength: 0.32,
      shift: {
        beginsAtSeconds: 80,
        reversesAtSeconds: 110,
        completesAtSeconds: 140,
        directionRad: Math.PI,
        strength: 0.3,
        lullStrength: 0.04
      }
    },
    escape: {
      sideId: OTTOMAN_SIDE_ID,
      edge: "east",
      longitudeDeg: 21.52,
      victoryCount: 82
    }
  },
  strategy: {
    counterparts: {
      "league-galleasses": "ottoman-center",
      "league-left": "ottoman-right",
      "league-center": "ottoman-center",
      "league-right": "ottoman-left",
      "league-reserve": "ottoman-center",
      "league-sailing": "ottoman-left",
      "league-auxiliaries": "ottoman-left",
      "ottoman-right": "league-left",
      "ottoman-center": "league-center",
      "ottoman-left": "league-right",
      "ottoman-reserve": "league-center"
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
        squadron("league-galleasses", "Galleass Vanguard", "Francesco Duodo", 21.00, 38.25, 6, [
          shipGroup(GALLEASS_SLUG, 6, "galleass", "venice", 36, ["matchlock-arquebuses"])
        ], 3, {
          role: "vanguard",
          rowSpacingPx: 116,
          columnSpacingPx: 104,
          tacticalSize: 6,
          tacticalFrontage: 1
        }),
        squadron("league-left", "Left Wing", "Agostino Barbarigo", 20.94, 38.32, 53, [
          shipGroup(GALLEY_SLUG, 53, "galley", "venice", 8, ["matchlock-arquebuses"])
        ], 4, {
          rowSpacingPx: 42,
          columnSpacingPx: 64,
          tacticalSize: 12,
          tacticalFrontage: 3,
          tacticalRowSpacingPx: 220,
          tacticalColumnSpacingPx: 270
        }),
        squadron("league-center", "Center", "Don John of Austria", 20.94, 38.25, 62, [
          shipGroup(GALLEY_SLUG, 38, "galley", "spain", 8, ["matchlock-arquebuses"]),
          shipGroup(GALLEY_SLUG, 12, "galley", "venice", 8, ["matchlock-arquebuses"]),
          shipGroup(GALLEY_SLUG, 7, "galley", "papal-states", 8, ["matchlock-arquebuses"]),
          shipGroup(GALLEY_SLUG, 5, "galley", "habsburg", 8, ["matchlock-arquebuses"])
        ], 4, {
          rowSpacingPx: 42,
          columnSpacingPx: 64,
          tacticalSize: 12,
          tacticalFrontage: 3,
          tacticalRowSpacingPx: 220,
          tacticalColumnSpacingPx: 270
        }),
        squadron("league-right", "Right Wing", "Giovanni Andrea Doria", 20.94, 38.18, 53, [
          shipGroup(GALLEY_SLUG, 27, "galley", "genoa", 8, ["matchlock-arquebuses"]),
          shipGroup(GALLEY_SLUG, 20, "galley", "venice", 8, ["matchlock-arquebuses"]),
          shipGroup(GALLEY_SLUG, 6, "galley", "spain", 8, ["matchlock-arquebuses"])
        ], 4, {
          rowSpacingPx: 42,
          columnSpacingPx: 64,
          tacticalSize: 12,
          tacticalFrontage: 3,
          tacticalRowSpacingPx: 220,
          tacticalColumnSpacingPx: 270
        }),
        squadron("league-reserve", "Reserve", "Alvaro de Bazan", 20.90, 38.25, 38, [
          shipGroup(GALLEY_SLUG, 18, "galley", "venice", 8, ["matchlock-arquebuses"]),
          shipGroup(GALLEY_SLUG, 5, "galley", "spain", 8, ["matchlock-arquebuses"]),
          shipGroup(GALLEY_SLUG, 5, "galley", "papal-states", 8, ["matchlock-arquebuses"]),
          shipGroup(GALLEY_SLUG, 7, "galley", "habsburg", 8, ["matchlock-arquebuses"]),
          shipGroup(GALLEY_SLUG, 3, "galley", "hospitallers", 8, ["matchlock-arquebuses"])
        ], 4, {
          role: "reserve",
          rowSpacingPx: 42,
          columnSpacingPx: 64,
          tacticalSize: 10,
          tacticalFrontage: 4,
          tacticalRowSpacingPx: 210,
          tacticalColumnSpacingPx: 260
        }),
        squadron("league-sailing", "Sailing Squadron", "Cesare d'Avalos", 21.00, 38.18, 26, [
          shipGroup(GALLEON_SLUG, 24, "sailing-warship", "spain", 24, ["matchlock-arquebuses"]),
          shipGroup(CARRACK_SLUG, 2, "sailing-warship", "venice", 20, ["matchlock-arquebuses"])
        ], 3, {
          rowSpacingPx: 48,
          columnSpacingPx: 76,
          tacticalSize: 8,
          tacticalFrontage: 4,
          tacticalRowSpacingPx: 230,
          tacticalColumnSpacingPx: 290
        }),
        squadron("league-auxiliaries", "Auxiliary Squadron", "Juan de Cardona", 20.90, 38.10, 76, [
          shipGroup(FUSTA_SLUG, 50, "auxiliary", "spain", 2, ["matchlock-arquebuses"]),
          shipGroup(FUSTA_SLUG, 20, "auxiliary", "venice", 2, ["matchlock-arquebuses"]),
          shipGroup(FUSTA_SLUG, 6, "auxiliary", "papal-states", 2, ["matchlock-arquebuses"])
        ], 4, {
          rowSpacingPx: 32,
          columnSpacingPx: 46,
          tacticalSize: 16,
          tacticalFrontage: 4,
          tacticalRowSpacingPx: 180,
          tacticalColumnSpacingPx: 230
        })
      ]
    }),
    side({
      id: OTTOMAN_SIDE_ID,
      name: "Ottoman Empire",
      shortName: "Ottomans",
      color: "#c04b56",
      headingRad: Math.PI,
      squadrons: [
        squadron("ottoman-right", "Right Wing", "Mehmed Siroco", 21.08, 38.32, 71, [
          shipGroup(GALLEY_SLUG, 55, "galley", "ottoman", 4, ["composite-recurve-bows"]),
          shipGroup(FUSTA_SLUG, 16, "galliot", "ottoman", 2, ["composite-recurve-bows"])
        ], 4, {
          rowSpacingPx: 38,
          columnSpacingPx: 60,
          tacticalSize: 12,
          tacticalFrontage: 3,
          tacticalRowSpacingPx: 190,
          tacticalColumnSpacingPx: 260
        }),
        squadron("ottoman-center", "Center", "Muezzinzade Ali Pasha", 21.10, 38.25, 107, [
          shipGroup(GALLEY_SLUG, 87, "galley", "ottoman", 4, ["composite-recurve-bows"]),
          shipGroup(FUSTA_SLUG, 20, "galliot", "ottoman", 2, ["composite-recurve-bows"])
        ], 4, {
          rowSpacingPx: 38,
          columnSpacingPx: 60,
          tacticalSize: 12,
          tacticalFrontage: 5,
          tacticalRowSpacingPx: 190,
          tacticalColumnSpacingPx: 260
        }),
        squadron("ottoman-left", "Left Wing", "Uluc Ali", 21.08, 38.18, 77, [
          shipGroup(GALLEY_SLUG, 61, "galley", "ottoman", 4, ["composite-recurve-bows"]),
          shipGroup(FUSTA_SLUG, 16, "galliot", "ottoman", 2, ["composite-recurve-bows"])
        ], 4, {
          rowSpacingPx: 38,
          columnSpacingPx: 60,
          tacticalSize: 12,
          tacticalFrontage: 4,
          tacticalRowSpacingPx: 210,
          tacticalColumnSpacingPx: 260
        }),
        squadron("ottoman-reserve", "Reserve", "Murat Dragut", 21.14, 38.25, 17, [
          shipGroup(GALLEY_SLUG, 13, "galley", "ottoman", 4, ["composite-recurve-bows"]),
          shipGroup(FUSTA_SLUG, 4, "galliot", "ottoman", 2, ["composite-recurve-bows"])
        ], 4, {
          role: "reserve",
          rowSpacingPx: 38,
          columnSpacingPx: 60,
          tacticalSize: 9,
          tacticalFrontage: 2,
          tacticalRowSpacingPx: 210,
          tacticalColumnSpacingPx: 250
        })
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
  if (!value.id || !value.title || !value.titleKey || !value.mapLabelKey ||
      !value.date || !value.location) {
    throw new Error("Historical battle scenario metadata is incomplete");
  }
  if (!Number.isInteger(value.map?.width) || !Number.isInteger(value.map?.height)) {
    throw new Error(`Historical battle map dimensions are invalid: ${value.id}`);
  }
  assertHistoricalWind(value.map.wind, value.id);
  if (!value.map.escape?.sideId || value.map.escape.edge !== "east" ||
      !Number.isFinite(value.map.escape.longitudeDeg) ||
      !Number.isInteger(value.map.escape.victoryCount) || value.map.escape.victoryCount <= 0) {
    throw new Error(`Historical battle escape objective is invalid: ${value.id}`);
  }
  if (!Array.isArray(value.sides) || value.sides.length !== 2) {
    throw new Error(`Historical battle must have exactly two sides: ${value.id}`);
  }
  const ids = new Set();
  for (const sideValue of value.sides) {
    if (ids.has(sideValue.id)) throw new Error(`Duplicate historical battle side: ${sideValue.id}`);
    ids.add(sideValue.id);
  }
  assertHistoricalBattleStrategy(value);
  assertHistoricalBattleSelection(value);
  return deepFreeze(value);
}

function assertHistoricalBattleStrategy(value) {
  const divisions = new Map(value.sides.flatMap((sideValue) => (
    sideValue.squadrons.map((squadronValue) => [squadronValue.id, sideValue.id])
  )));
  const counterparts = value.strategy?.counterparts;
  if (!counterparts || typeof counterparts !== "object" || Array.isArray(counterparts)) {
    throw new Error(`Historical battle strategy is missing: ${value.id}`);
  }
  for (const [divisionId, sideId] of divisions) {
    const counterpartId = counterparts[divisionId];
    const counterpartSideId = divisions.get(counterpartId);
    if (!counterpartSideId) {
      throw new Error(`Historical division has no valid counterpart: ${divisionId}`);
    }
    if (counterpartSideId === sideId) {
      throw new Error(`Historical division targets its own side: ${divisionId}/${counterpartId}`);
    }
  }
  for (const divisionId of Object.keys(counterparts)) {
    if (!divisions.has(divisionId)) {
      throw new Error(`Historical strategy references an unknown division: ${divisionId}`);
    }
  }
}

function assertHistoricalBattleSelection(value) {
  const marker = value.selection?.marker;
  if (!Number.isFinite(marker?.longitudeDeg) || marker.longitudeDeg < -180 || marker.longitudeDeg > 180 ||
      !Number.isFinite(marker?.latitudeDeg) || marker.latitudeDeg < -90 || marker.latitudeDeg > 90 ||
      typeof marker?.shipSlug !== "string" || marker.shipSlug.length === 0) {
    throw new Error(`Historical battle selection marker is invalid: ${value.id}`);
  }
  const commanders = value.selection?.commanders;
  if (!Array.isArray(commanders) || commanders.length === 0 || commanders.length % 2 !== 0) {
    throw new Error(`Historical battle needs an even commander roster: ${value.id}`);
  }
  const ids = new Set();
  const portraitSources = new Set();
  for (const entry of commanders) {
    if (ids.has(entry.id)) throw new Error(`Duplicate historical commander: ${entry.id}`);
    if (portraitSources.has(entry.portraitSrc)) {
      throw new Error(`Duplicate historical commander portrait: ${entry.portraitSrc}`);
    }
    ids.add(entry.id);
    portraitSources.add(entry.portraitSrc);
    const sideValue = value.sides.find((candidate) => candidate.id === entry.sideId);
    const squadronValue = sideValue?.squadrons.find((candidate) => candidate.id === entry.squadronId);
    if (!squadronValue) {
      throw new Error(`Historical commander squadron is missing: ${entry.id}`);
    }
    if (!squadronValue.shipGroups.some((group) => group.shipSlug === entry.shipSlug)) {
      throw new Error(`Historical commander ship is absent from their squadron: ${entry.id}`);
    }
  }
}

function assertHistoricalWind(wind, scenarioId) {
  if (!Number.isFinite(wind?.directionRad) || !Number.isFinite(wind?.strength) ||
      wind.strength < 0 || wind.strength > 1) {
    throw new Error(`Historical battle wind is invalid: ${scenarioId}`);
  }
  if (wind.shift === undefined) return;
  const shift = wind.shift;
  if (!Number.isFinite(shift.beginsAtSeconds) || shift.beginsAtSeconds < 0 ||
      !Number.isFinite(shift.reversesAtSeconds) ||
      shift.reversesAtSeconds <= shift.beginsAtSeconds ||
      !Number.isFinite(shift.completesAtSeconds) ||
      shift.completesAtSeconds <= shift.reversesAtSeconds ||
      !Number.isFinite(shift.directionRad) ||
      !Number.isFinite(shift.strength) || shift.strength < 0 || shift.strength > 1 ||
      !Number.isFinite(shift.lullStrength) || shift.lullStrength < 0 ||
      shift.lullStrength > Math.min(wind.strength, shift.strength)) {
    throw new Error(`Historical battle wind shift is invalid: ${scenarioId}`);
  }
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
  const role = formation.role || "line";
  if (!["line", "reserve", "vanguard"].includes(role)) {
    throw new Error(`Invalid historical squadron role: ${id} ${role}`);
  }
  if (formation.rowSpacingPx !== undefined &&
      (!Number.isFinite(formation.rowSpacingPx) || formation.rowSpacingPx <= 0)) {
    throw new Error(`Invalid squadron row spacing: ${id}`);
  }
  if (formation.columnSpacingPx !== undefined &&
      (!Number.isFinite(formation.columnSpacingPx) || formation.columnSpacingPx <= 0)) {
    throw new Error(`Invalid squadron column spacing: ${id}`);
  }
  if (!Number.isInteger(formation.tacticalSize) || formation.tacticalSize <= 0) {
    throw new Error(`Invalid tactical squadron size: ${id}`);
  }
  if (!Number.isInteger(formation.tacticalFrontage) || formation.tacticalFrontage <= 0) {
    throw new Error(`Invalid tactical squadron frontage: ${id}`);
  }
  for (const spacingKey of ["tacticalRowSpacingPx", "tacticalColumnSpacingPx"]) {
    if (formation[spacingKey] !== undefined &&
        (!Number.isFinite(formation[spacingKey]) || formation[spacingKey] <= 0)) {
      throw new Error(`Invalid ${spacingKey}: ${id}`);
    }
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
    ...formation,
    role
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

function commander(id, sideId, squadronId, shipSlug, portraitSrc) {
  if (!id || !sideId || !squadronId || !shipSlug ||
      typeof portraitSrc !== "string" ||
      !portraitSrc.startsWith("assets/characters/") || !portraitSrc.endsWith(".png")) {
    throw new Error(`Historical commander metadata is invalid: ${id}`);
  }
  return { id, sideId, squadronId, shipSlug, portraitSrc, portraitFacing: "right" };
}

function supportingCharacter(id, sideId, nameKey, roleKey, portraitSrc, portraitFacing) {
  if (!id || !sideId || !nameKey || !roleKey ||
      typeof portraitSrc !== "string" ||
      !portraitSrc.startsWith("assets/characters/") || !portraitSrc.endsWith(".png") ||
      !["left", "right"].includes(portraitFacing)) {
    throw new Error(`Historical supporting character metadata is invalid: ${id}`);
  }
  return { id, sideId, nameKey, roleKey, portraitSrc, portraitFacing };
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
