export const TREASURE_MAP_PIECE_COUNT = 12;
export const TREASURE_PIRATE_HINT_LIMIT = 3;
export const TREASURE_PIRATE_ENCOUNTER_KIND = "treasure-map-pirate";
export const TREASURE_PIRATE_STAGE_HUNT = "map-hunt";
export const TREASURE_PIRATE_STAGE_AMBUSH = "home-ambush";

const MIN_TREASURE_DISTANCE_KM = 2400;
const EARTH_RADIUS_KM = 6371;
const TREASURE_CAPTAIN_GIVEN_NAMES = Object.freeze([
  "Abel", "Bartholomew", "Calico", "Elias", "Flint", "Israel",
  "Jabez", "Job", "Ned", "Obadiah", "Silas", "Tom"
]);
const TREASURE_CAPTAIN_SURNAMES = Object.freeze([
  "Bones", "Black", "Flint", "Gunn", "Hands", "Pew",
  "Rackham", "Redruth", "Silver", "Smollett", "Sparrow", "Vane"
]);

export function createTreasureCampaignFields(identityKey) {
  assertNonEmptyString(identityKey, "Treasure campaign identity");
  return {
    treasureCaptainName: generatedTreasureCaptainName(identityKey),
    treasureTileId: null,
    mapPirates: [],
    acquiredMapPiecePirateIds: [],
    pirateHints: [],
    checkedTreasureInteractionIds: [],
    treasureRecovered: false,
    treasureRecoveredMinute: null,
    ambushStarted: false,
    ambushDefeatedPirateIds: []
  };
}

export function initializeTreasureCampaign(goal, {
  graph,
  earthRows,
  navigationMask,
  occupiedTileIds,
  pirateHideouts,
  pirateShipSlugs,
  identityKey
}) {
  validateTreasureCampaignFields(goal);
  if (goal.treasureTileId !== null || goal.mapPirates.length > 0) return goal;
  validateWorldInputs(graph, earthRows, navigationMask);
  assertNonEmptyString(identityKey, "Treasure campaign world identity");
  if (!Array.isArray(pirateHideouts) || pirateHideouts.length < TREASURE_MAP_PIECE_COUNT) {
    throw new Error(
      `Treasure campaign requires ${TREASURE_MAP_PIECE_COUNT} pirate hideouts, got ${pirateHideouts?.length ?? 0}`
    );
  }
  if (!Array.isArray(pirateShipSlugs) || pirateShipSlugs.length === 0 ||
      pirateShipSlugs.some((slug) => typeof slug !== "string" || slug === "")) {
    throw new Error("Treasure campaign requires pirate ship types");
  }
  const occupied = new Set(occupiedTileIds || []);
  const candidates = oneHexIslandCandidates({
    graph,
    earthRows,
    navigationMask,
    occupiedTileIds: occupied,
    homePortTileId: goal.homePortTileId
  });
  if (candidates.length === 0) {
    throw new Error("Treasure campaign could not find a distant, water-accessible one-hex island");
  }
  goal.treasureTileId = candidates[
    hashString32(`${identityKey}|treasure-island`) % candidates.length
  ];

  const hideouts = globallyDistributedHideouts(pirateHideouts, identityKey);
  goal.mapPirates = Array.from({ length: TREASURE_MAP_PIECE_COUNT }, (_, index) => {
    const hideout = hideouts[index];
    if (!Number.isInteger(hideout.tileId) || hideout.tileId < 0) {
      throw new Error(`Treasure pirate hideout has invalid tile id: ${hideout.tileId}`);
    }
    return {
      id: `treasure-pirate-${String(index + 1).padStart(2, "0")}`,
      shipId: `treasure-map-pirate-${String(index + 1).padStart(2, "0")}`,
      hideoutTileId: hideout.tileId,
      shipSlug: pirateShipSlugs[
        hashString32(`${identityKey}|treasure-pirate-ship|${index}`) % pirateShipSlugs.length
      ],
      captainName: null
    };
  });
  validateTreasureCampaignFields(goal);
  return goal;
}

export function bindTreasurePirateCaptainName(goal, pirateId, captainName) {
  validateTreasureCampaignFields(goal);
  const pirate = requiredMapPirate(goal, pirateId);
  assertNonEmptyString(captainName, "Treasure pirate captain name");
  if (pirate.captainName !== null && pirate.captainName !== captainName) {
    throw new Error(
      `Treasure pirate ${pirateId} changed captains: ${pirate.captainName} != ${captainName}`
    );
  }
  pirate.captainName = captainName;
  return pirate;
}

export function treasureCampaignPirateForShip(goal, shipId) {
  validateTreasureCampaignFields(goal);
  if (typeof shipId !== "string" || shipId === "") return null;
  return goal.mapPirates.find((pirate) => pirate.shipId === shipId) || null;
}

export function treasureCampaignPirate(goal, pirateId) {
  validateTreasureCampaignFields(goal);
  return goal.mapPirates.find((pirate) => pirate.id === pirateId) || null;
}

export function treasureCampaignPhase(goal) {
  validateTreasureCampaignFields(goal);
  if (goal.treasureRecovered) return "return-home";
  if (goal.acquiredMapPiecePirateIds.length === TREASURE_MAP_PIECE_COUNT) return "find-treasure";
  return "map-hunt";
}

export function treasureCampaignObjective(goal) {
  const phase = treasureCampaignPhase(goal);
  if (phase === "map-hunt") {
    return `Recover the ${TREASURE_MAP_PIECE_COUNT} pieces of Captain ${goal.treasureCaptainName}'s treasure map ` +
      `(${goal.acquiredMapPiecePirateIds.length}/${TREASURE_MAP_PIECE_COUNT})`;
  }
  if (phase === "find-treasure") return `Follow Captain ${goal.treasureCaptainName}'s completed map`;
  if (!treasureAmbushComplete(goal)) {
    return `Defeat Captain ${goal.treasureCaptainName}'s former crew and carry the treasure home ` +
      `(${goal.ambushDefeatedPirateIds.length}/${TREASURE_MAP_PIECE_COUNT})`;
  }
  return "Return home with the treasure";
}

export function recordTreasurePirateRumor(goal, {
  interactionKey,
  pirateId,
  pirateLatitudeDeg,
  pirateLongitudeDeg,
  reportedLatitudeDeg,
  reportedLongitudeDeg,
  referenceCityName,
  referenceCityLatitudeDeg,
  referenceCityLongitudeDeg,
  force = false
}) {
  validateTreasureCampaignFields(goal);
  if (treasureCampaignPhase(goal) !== "map-hunt") return null;
  assertNonEmptyString(interactionKey, "Treasure pirate rumor interaction");
  const pirate = requiredMapPirate(goal, pirateId);
  if (!pirate.captainName) throw new Error(`Treasure pirate ${pirate.id} has no captain name`);
  if (goal.acquiredMapPiecePirateIds.includes(pirate.id)) return null;
  if (goal.pirateHints.some((hint) => hint.pirateId === pirate.id)) return null;
  if (goal.pirateHints.length >= TREASURE_PIRATE_HINT_LIMIT) return null;
  if (goal.checkedTreasureInteractionIds.includes(interactionKey)) return null;
  goal.checkedTreasureInteractionIds.push(interactionKey);
  if (goal.checkedTreasureInteractionIds.length > 192) goal.checkedTreasureInteractionIds.shift();
  if (!force && hashString32(`${interactionKey}|treasure-pirate-rumor`) % 20 !== 0) return null;
  assertCoordinates("pirate", pirateLatitudeDeg, pirateLongitudeDeg);
  assertCoordinates("reported pirate", reportedLatitudeDeg, reportedLongitudeDeg);
  assertCoordinates("reference city", referenceCityLatitudeDeg, referenceCityLongitudeDeg);
  assertNonEmptyString(referenceCityName, "Treasure pirate rumor reference city");
  const direction = compassDirection(
    referenceCityLatitudeDeg,
    referenceCityLongitudeDeg,
    pirateLatitudeDeg,
    pirateLongitudeDeg
  );
  const hint = {
    pirateId: pirate.id,
    latitudeDeg: reportedLatitudeDeg,
    longitudeDeg: reportedLongitudeDeg,
    referenceCityName: referenceCityName.trim(),
    direction,
    interactionKey
  };
  goal.pirateHints.push(hint);
  const variants = [
    `They say Captain ${pirate.captainName} was last seen ${direction} of ${hint.referenceCityName}. ` +
      "There is talk of a torn chart aboard, guarded closer than any purse.",
    `A black sail answering to Captain ${pirate.captainName} has been working ${direction} of ` +
      `${hint.referenceCityName}. The old crew still quarrels over Captain ${goal.treasureCaptainName}'s map.`,
    `Captain ${pirate.captainName} was sighted ${direction} of ${hint.referenceCityName}. ` +
      "Dead men tell no tales, but frightened deckhands tell plenty.",
    `Put your bow ${direction} of ${hint.referenceCityName} and watch for Captain ${pirate.captainName}. ` +
      "That rogue carries one scrap of a map worth twelve men's lives."
  ];
  return {
    text: variants[hashString32(`${interactionKey}|treasure-rumor-prose`) % variants.length],
    pirate: { ...pirate },
    hint: { ...hint }
  };
}

export function acquireTreasureMapPiece(goal, pirateId, currentMinute) {
  validateTreasureCampaignFields(goal);
  assertSimulationMinute(currentMinute);
  if (treasureCampaignPhase(goal) !== "map-hunt") {
    return { acquired: false, duplicate: true, count: goal.acquiredMapPiecePirateIds.length };
  }
  const pirate = requiredMapPirate(goal, pirateId);
  if (goal.acquiredMapPiecePirateIds.includes(pirate.id)) {
    return { acquired: false, duplicate: true, count: goal.acquiredMapPiecePirateIds.length };
  }
  goal.acquiredMapPiecePirateIds.push(pirate.id);
  goal.pirateHints = goal.pirateHints.filter((hint) => hint.pirateId !== pirate.id);
  const count = goal.acquiredMapPiecePirateIds.length;
  return {
    acquired: true,
    duplicate: false,
    count,
    complete: count === TREASURE_MAP_PIECE_COUNT,
    pirate: { ...pirate },
    currentMinute
  };
}

export function unrevealedTreasurePirates(goal) {
  validateTreasureCampaignFields(goal);
  const acquired = new Set(goal.acquiredMapPiecePirateIds);
  const hinted = new Set(goal.pirateHints.map((hint) => hint.pirateId));
  return goal.mapPirates.filter((pirate) => !acquired.has(pirate.id) && !hinted.has(pirate.id));
}

export function treasurePirateHints(goal) {
  validateTreasureCampaignFields(goal);
  return goal.pirateHints.map((hint) => {
    const pirate = requiredMapPirate(goal, hint.pirateId);
    if (!pirate.captainName) throw new Error(`Treasure pirate ${pirate.id} has no captain name`);
    return { ...hint, pirateName: pirate.captainName };
  });
}

export function recoverTreasure(goal, currentMinute) {
  validateTreasureCampaignFields(goal);
  assertSimulationMinute(currentMinute);
  if (goal.acquiredMapPiecePirateIds.length !== TREASURE_MAP_PIECE_COUNT) {
    throw new Error(
      `Cannot recover treasure with ${goal.acquiredMapPiecePirateIds.length}/${TREASURE_MAP_PIECE_COUNT} map pieces`
    );
  }
  if (goal.treasureRecovered) throw new Error("Captain's treasure was already recovered");
  goal.treasureRecovered = true;
  goal.treasureRecoveredMinute = currentMinute;
  goal.ambushStarted = true;
  goal.pirateHints = [];
  return goal;
}

export function recordTreasureAmbushDefeat(goal, pirateId) {
  validateTreasureCampaignFields(goal);
  if (!goal.treasureRecovered || !goal.ambushStarted) {
    throw new Error("Treasure pirate ambush defeat requires recovered treasure");
  }
  requiredMapPirate(goal, pirateId);
  if (goal.ambushDefeatedPirateIds.includes(pirateId)) return false;
  goal.ambushDefeatedPirateIds.push(pirateId);
  return true;
}

export function treasureAmbushComplete(goal) {
  validateTreasureCampaignFields(goal);
  return goal.treasureRecovered &&
    goal.ambushDefeatedPirateIds.length === TREASURE_MAP_PIECE_COUNT;
}

export function settleTreasureHomecoming(goal) {
  validateTreasureCampaignFields(goal);
  if (!treasureAmbushComplete(goal)) {
    throw new Error("Captain's treasure cannot be brought home while the old crew remains");
  }
  goal.status = "complete";
  return { type: goal.type, completed: true };
}

export function validateTreasureCampaignFields(goal) {
  assertNonEmptyString(goal.treasureCaptainName, "Treasure captain name");
  if (goal.treasureTileId !== null &&
      (!Number.isInteger(goal.treasureTileId) || goal.treasureTileId < 0)) {
    throw new Error(`Invalid treasure island tile: ${goal.treasureTileId}`);
  }
  if (!Array.isArray(goal.mapPirates)) throw new Error("Treasure campaign has no pirate roster");
  if (![0, TREASURE_MAP_PIECE_COUNT].includes(goal.mapPirates.length)) {
    throw new Error(`Treasure campaign has ${goal.mapPirates.length} map pirates`);
  }
  const pirateIds = new Set();
  const shipIds = new Set();
  for (const pirate of goal.mapPirates) {
    assertNonEmptyString(pirate?.id, "Treasure pirate id");
    assertNonEmptyString(pirate.shipId, "Treasure pirate ship id");
    assertNonEmptyString(pirate.shipSlug, "Treasure pirate ship type");
    if (!Number.isInteger(pirate.hideoutTileId) || pirate.hideoutTileId < 0) {
      throw new Error(`Invalid treasure pirate hideout: ${pirate.hideoutTileId}`);
    }
    if (pirate.captainName !== null) {
      assertNonEmptyString(pirate.captainName, "Treasure pirate captain name");
    }
    if (pirateIds.has(pirate.id) || shipIds.has(pirate.shipId)) {
      throw new Error(`Duplicate treasure pirate identity: ${pirate.id}/${pirate.shipId}`);
    }
    pirateIds.add(pirate.id);
    shipIds.add(pirate.shipId);
  }
  validateUniquePirateIds(goal.acquiredMapPiecePirateIds, pirateIds, "acquired map pieces");
  validateUniquePirateIds(goal.ambushDefeatedPirateIds, pirateIds, "defeated ambushers");
  if (!Array.isArray(goal.pirateHints) || goal.pirateHints.length > TREASURE_PIRATE_HINT_LIMIT) {
    throw new Error(`Treasure campaign has too many pirate hints: ${goal.pirateHints?.length}`);
  }
  const hintedIds = new Set();
  for (const hint of goal.pirateHints) {
    if (!pirateIds.has(hint.pirateId) || hintedIds.has(hint.pirateId)) {
      throw new Error(`Invalid treasure pirate hint: ${hint.pirateId}`);
    }
    assertCoordinates("treasure pirate hint", hint.latitudeDeg, hint.longitudeDeg);
    assertNonEmptyString(hint.referenceCityName, "Treasure pirate hint city");
    assertNonEmptyString(hint.direction, "Treasure pirate hint direction");
    assertNonEmptyString(hint.interactionKey, "Treasure pirate hint interaction");
    hintedIds.add(hint.pirateId);
  }
  if (!Array.isArray(goal.checkedTreasureInteractionIds) ||
      new Set(goal.checkedTreasureInteractionIds).size !== goal.checkedTreasureInteractionIds.length ||
      goal.checkedTreasureInteractionIds.some((value) => typeof value !== "string" || value === "")) {
    throw new Error("Treasure campaign has invalid checked interactions");
  }
  if (typeof goal.treasureRecovered !== "boolean" || typeof goal.ambushStarted !== "boolean") {
    throw new Error("Treasure campaign has invalid recovery state");
  }
  if (goal.treasureRecoveredMinute !== null) assertSimulationMinute(goal.treasureRecoveredMinute);
  if (goal.treasureRecovered !== (goal.treasureRecoveredMinute !== null)) {
    throw new Error("Treasure recovery state and time disagree");
  }
  if (goal.ambushStarted && !goal.treasureRecovered) {
    throw new Error("Treasure pirate ambush began before the treasure was recovered");
  }
  if (goal.treasureRecovered && goal.acquiredMapPiecePirateIds.length !== TREASURE_MAP_PIECE_COUNT) {
    throw new Error("Treasure was recovered before the map was completed");
  }
  if (goal.ambushDefeatedPirateIds.length > 0 && !goal.ambushStarted) {
    throw new Error("Treasure ambushers were defeated before the ambush began");
  }
  return goal;
}

function oneHexIslandCandidates({
  graph,
  earthRows,
  navigationMask,
  occupiedTileIds,
  homePortTileId
}) {
  if (!Number.isInteger(homePortTileId) || homePortTileId < 0 || homePortTileId >= graph.tileCount) {
    throw new Error(`Invalid treasure campaign home port: ${homePortTileId}`);
  }
  const home = { lat: graph.latDeg[homePortTileId], lon: graph.lonDeg[homePortTileId] };
  return earthRows
    .filter((row) => (
      navigationMask[row.id] !== 1 &&
      !occupiedTileIds.has(row.id) &&
      Math.abs(graph.latDeg[row.id]) < 72 &&
      graph.neighbors[row.id].length >= 5 &&
      graph.neighbors[row.id].every((neighborId) => navigationMask[neighborId] === 1) &&
      greatCircleDistanceKm(
        home.lat,
        home.lon,
        graph.latDeg[row.id],
        graph.lonDeg[row.id]
      ) >= MIN_TREASURE_DISTANCE_KM
    ))
    .map((row) => row.id)
    .sort((a, b) => a - b);
}

function globallyDistributedHideouts(hideouts, identityKey) {
  const unique = [...new Map(hideouts.map((hideout) => [hideout.tileId, hideout])).values()];
  if (unique.length < TREASURE_MAP_PIECE_COUNT) {
    throw new Error("Treasure campaign pirate hideouts are not unique");
  }
  unique.sort((a, b) => normalizedLongitude(a.lon) - normalizedLongitude(b.lon) || a.tileId - b.tileId);
  const rotation = hashString32(`${identityKey}|treasure-hideout-rotation`) % unique.length;
  const rotated = [...unique.slice(rotation), ...unique.slice(0, rotation)];
  const chosen = [];
  const used = new Set();
  for (let index = 0; index < TREASURE_MAP_PIECE_COUNT; index++) {
    const target = Math.floor(index * rotated.length / TREASURE_MAP_PIECE_COUNT);
    let cursor = target;
    while (used.has(rotated[cursor].tileId)) cursor = (cursor + 1) % rotated.length;
    chosen.push(rotated[cursor]);
    used.add(rotated[cursor].tileId);
  }
  return chosen;
}

function requiredMapPirate(goal, pirateId) {
  assertNonEmptyString(pirateId, "Treasure pirate lookup");
  const pirate = goal.mapPirates.find((entry) => entry.id === pirateId);
  if (!pirate) throw new Error(`Unknown treasure pirate: ${pirateId}`);
  return pirate;
}

function generatedTreasureCaptainName(identityKey) {
  const given = TREASURE_CAPTAIN_GIVEN_NAMES[
    hashString32(`${identityKey}|treasure-captain-given`) % TREASURE_CAPTAIN_GIVEN_NAMES.length
  ];
  const surname = TREASURE_CAPTAIN_SURNAMES[
    hashString32(`${identityKey}|treasure-captain-surname`) % TREASURE_CAPTAIN_SURNAMES.length
  ];
  return given === surname ? surname : `${given} ${surname}`;
}

function validateUniquePirateIds(values, rosterIds, label) {
  if (!Array.isArray(values) || new Set(values).size !== values.length) {
    throw new Error(`Treasure campaign has invalid ${label}`);
  }
  for (const value of values) {
    if (!rosterIds.has(value)) throw new Error(`Treasure campaign ${label} references ${value}`);
  }
}

function validateWorldInputs(graph, earthRows, navigationMask) {
  if (!Number.isInteger(graph?.tileCount) || !Array.isArray(graph.neighbors) ||
      graph.latDeg?.length !== graph.tileCount || graph.lonDeg?.length !== graph.tileCount) {
    throw new Error("Treasure campaign requires a geodesic graph");
  }
  if (!Array.isArray(earthRows) || earthRows.length !== graph.tileCount ||
      navigationMask?.length !== graph.tileCount) {
    throw new Error("Treasure campaign world arrays do not match the graph");
  }
}

function assertCoordinates(label, latitudeDeg, longitudeDeg) {
  if (!Number.isFinite(latitudeDeg) || latitudeDeg < -90 || latitudeDeg > 90 ||
      !Number.isFinite(longitudeDeg) || longitudeDeg < -180 || longitudeDeg > 180) {
    throw new Error(`Invalid ${label} coordinates: ${latitudeDeg},${longitudeDeg}`);
  }
}

function assertNonEmptyString(value, label) {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${label} must be a non-empty string`);
}

function assertSimulationMinute(value) {
  if (!Number.isFinite(value) || value < 0) throw new Error(`Invalid simulation minute: ${value}`);
}

function greatCircleDistanceKm(fromLat, fromLon, toLat, toLon) {
  const fromLatitude = fromLat * Math.PI / 180;
  const toLatitude = toLat * Math.PI / 180;
  const deltaLat = (toLat - fromLat) * Math.PI / 180;
  const deltaLon = (toLon - fromLon) * Math.PI / 180;
  const a = Math.sin(deltaLat / 2) ** 2 +
    Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(deltaLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function compassDirection(fromLatDeg, fromLonDeg, toLatDeg, toLonDeg) {
  const fromLat = fromLatDeg * Math.PI / 180;
  const toLat = toLatDeg * Math.PI / 180;
  const deltaLon = (toLonDeg - fromLonDeg) * Math.PI / 180;
  const y = Math.sin(deltaLon) * Math.cos(toLat);
  const x = Math.cos(fromLat) * Math.sin(toLat) -
    Math.sin(fromLat) * Math.cos(toLat) * Math.cos(deltaLon);
  const bearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  const directions = ["north", "northeast", "east", "southeast", "south", "southwest", "west", "northwest"];
  return directions[Math.round(bearing / 45) % directions.length];
}

function normalizedLongitude(value) {
  const lon = Number(value);
  if (!Number.isFinite(lon)) throw new Error(`Pirate hideout has invalid longitude: ${value}`);
  return ((lon + 180) % 360 + 360) % 360 - 180;
}

function hashString32(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);
  hash ^= hash >>> 16;
  return hash >>> 0;
}
