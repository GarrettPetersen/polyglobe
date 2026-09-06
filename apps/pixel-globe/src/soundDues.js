export const SOUND_DUES_FACTION_ID = "denmark-norway";
export const SOUND_DUES_COLLECTOR_CITY_ID = "copenhagen|denmark";

// Whole-hex sailing corridors, deliberately broader than the historical
// narrows. One receipt covers all three routes until the ship reaches open
// Kattegat, Baltic or North Sea waters. Crossing a local toll radius again,
// changing belts, visiting port or waiting never starts a second passage.
export const DANISH_STRAITS = Object.freeze([
  Object.freeze({ id: "oresund", bounds: Object.freeze([55.35, 56.2, 12.25, 13.15]) }),
  Object.freeze({ id: "great-belt", bounds: Object.freeze([54.85, 55.9, 10.6, 11.4]) }),
  Object.freeze({ id: "little-belt", bounds: Object.freeze([54.95, 55.85, 9.45, 10.2]) })
]);
const PASSAGE_CLEARANCE_BOUNDS = Object.freeze([54.3, 56.65, 8.8, 13.7]);

export function createSoundDuesMemory() {
  return { nextPassageNumber: 1, active: null };
}

export function validateSoundDuesMemory(memory) {
  if (!memory || !Number.isSafeInteger(memory.nextPassageNumber) || memory.nextPassageNumber < 1 ||
      !("active" in memory)) throw new Error("Invalid Sound Dues passage memory");
  const active = memory.active;
  if (active === null) return;
  if (!active || memory.nextPassageNumber < 2 || active.id !== `danish-straits:${memory.nextPassageNumber - 1}` ||
      !DANISH_STRAITS.some(({ id }) => id === active.straitId) ||
      !["awaiting-payment", "paid", "refused"].includes(active.status) ||
      !Number.isSafeInteger(active.tollDoubloons) || active.tollDoubloons <= 0) {
    throw new Error(`Invalid Sound Dues passage: ${active?.id}`);
  }
}

// Shared ship-based game price, rather than a purported historical currency
// conversion. Sound Dues have no flag, friendship or warship exemption.
export function shipPassageTollDoubloons(state) {
  if (!Number.isFinite(state?.cargoCapacity) || state.cargoCapacity < 0 ||
      !Number.isInteger(state?.ship?.cannons) || state.ship.cannons < 0) {
    throw new Error("Passage toll requires valid cargo capacity and ship cannons");
  }
  return Math.ceil((20 + state.cargoCapacity / 4 + state.ship.cannons * 2) / 5) * 5;
}

export function soundDuesStraitAt({ lat, lon }) {
  validatePosition(lat, lon);
  return DANISH_STRAITS.find(({ bounds }) => withinBounds(lat, lon, bounds))?.id ?? null;
}

// Mutates only passage memory; returns whether a durable transition occurred.
export function advanceSoundDuesPassage(state, { lat, lon }) {
  validatePosition(lat, lon);
  const memory = state.memory.soundDues;
  validateSoundDuesMemory(memory);
  if (memory.active) {
    if (withinBounds(lat, lon, PASSAGE_CLEARANCE_BOUNDS)) return false;
    memory.active = null;
    return true;
  }
  const straitId = soundDuesStraitAt({ lat, lon });
  if (!straitId) return false;
  const tollDoubloons = shipPassageTollDoubloons(state);
  if (memory.nextPassageNumber >= Number.MAX_SAFE_INTEGER) throw new Error("Sound Dues passage IDs exhausted");
  memory.active = { id: `danish-straits:${memory.nextPassageNumber++}`, straitId,
    status: "awaiting-payment", tollDoubloons };
  return true;
}

export function soundDuesPaymentEligibility(state, passageId) {
  validateSoundDuesMemory(state.memory.soundDues);
  if (!Number.isSafeInteger(state.doubloons) || state.doubloons < 0) throw new Error("Invalid Sound Dues payer balance");
  const active = state.memory.soundDues.active;
  const offered = active !== null && active.id === passageId && active.status === "awaiting-payment";
  return { offered, canPay: offered && state.doubloons >= active.tollDoubloons,
    tollDoubloons: offered ? active.tollDoubloons : null };
}

export function resolveSoundDuesPassage(state, passageId, decision) {
  const eligibility = soundDuesPaymentEligibility(state, passageId);
  if (!eligibility.offered) throw new Error(`Sound Dues passage is not awaiting payment: ${passageId}`);
  if (decision !== "pay" && decision !== "refuse") throw new Error(`Unknown Sound Dues decision: ${decision}`);
  if (decision === "pay" && !eligibility.canPay) throw new Error(`Cannot afford Sound Dues: ${passageId}`);
  const tollDoubloons = decision === "pay" ? eligibility.tollDoubloons : 0;
  state.doubloons -= tollDoubloons;
  state.memory.soundDues.active.status = decision === "pay" ? "paid" : "refused";
  return { passageId, tollDoubloons };
}

export function soundDuesEnforcementApplies(memory, factionId) {
  return factionId === SOUND_DUES_FACTION_ID && memory.active?.status === "refused";
}

function withinBounds(lat, lon, [south, north, west, east]) {
  return lat >= south && lat <= north && lon >= west && lon <= east;
}
function validatePosition(lat, lon) {
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) {
    throw new Error(`Invalid Sound Dues position: ${lat}/${lon}`);
  }
}
