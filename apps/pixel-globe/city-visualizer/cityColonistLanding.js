import { cityCivilianAppearanceIds } from "./cityPeople.js";
import { cityAssaultJumpPoint } from "./cityAssaultMotion.js";
import { portAssaultLandingDurationMs } from "../src/portAssaultBattle.js";

export const CITY_COLONIST_COUNT = 9;
export const CITY_COLONIST_LANE_FEET_Y = Object.freeze([530, 544, 558]);
const DEPARTURE_INTERVAL_MS = 170;
const JUMP_DURATION_MS = portAssaultLandingDurationMs("none");
const WADE_DURATION_MS = 2400;
const WALK_DURATION_MS = 1400;
export const CITY_COLONIST_LANDING_DURATION_MS =
  (CITY_COLONIST_COUNT - 1) * DEPARTURE_INTERVAL_MS + JUMP_DURATION_MS +
  WADE_DURATION_MS + WALK_DURATION_MS + 600;

export function createCityColonistRoster(city) {
  const appearances = cityCivilianAppearanceIds(
    city,
    Array.from({ length: CITY_COLONIST_COUNT }, (_, index) => index % 2 ? "female" : "male"),
    "colonist-landing"
  );
  return Object.freeze(appearances.map((appearanceId, index) => Object.freeze({
    // These IDs identify temporary scene actors, not durable settlers.
    id: `${city.id}:landing:${index}`,
    appearanceId,
    lane: index % CITY_COLONIST_LANE_FEET_Y.length,
    column: Math.floor(index / CITY_COLONIST_LANE_FEET_Y.length),
    departureMs: index * DEPARTURE_INTERVAL_MS
  })));
}

export function cityColonistLandingFrame(roster, elapsedMs) {
  if (!Array.isArray(roster) || roster.length !== CITY_COLONIST_COUNT) {
    throw new Error("Colonist landing requires a complete civilian roster");
  }
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) throw new Error("Invalid colonist landing time");
  const units = roster.map((actor) => {
    if (!actor || typeof actor.id !== "string" || !actor.id ||
        typeof actor.appearanceId !== "string" || !actor.appearanceId ||
        !Number.isInteger(actor.lane) || actor.lane < 0 || actor.lane >= CITY_COLONIST_LANE_FEET_Y.length ||
        !Number.isInteger(actor.column) || actor.column < 0 ||
        actor.column >= CITY_COLONIST_COUNT / CITY_COLONIST_LANE_FEET_Y.length ||
        !Number.isFinite(actor.departureMs) || actor.departureMs < 0) {
      throw new Error(`Invalid colonist landing actor: ${actor?.id}`);
    }
    const jumpEndMs = actor.departureMs + JUMP_DURATION_MS;
    const wadeEndMs = jumpEndMs + WADE_DURATION_MS;
    const walkEndMs = wadeEndMs + WALK_DURATION_MS;
    const phase = elapsedMs < actor.departureMs ? "aboard" :
      elapsedMs < jumpEndMs ? "jump" : elapsedMs < wadeEndMs ? "wade" :
        elapsedMs < walkEndMs ? "walk" : "ashore";
    const animationStartedAtMs = phase === "jump" ? actor.departureMs :
      phase === "wade" ? jumpEndMs : phase === "walk" ? wadeEndMs :
        phase === "ashore" ? walkEndMs : 0;
    return Object.freeze({
      ...actor, phase, animationStartedAtMs,
      animationId: phase === "jump" ? "jump" : ["wade", "walk"].includes(phase) ? "walk" : "idle",
      facingRight: true,
      inWater: phase === "wade",
      splashAgeMs: elapsedMs >= jumpEndMs && elapsedMs < jumpEndMs + 500
        ? elapsedMs - jumpEndMs : null,
      progress: phase === "jump" ? (elapsedMs - actor.departureMs) / JUMP_DURATION_MS :
        phase === "wade" ? (elapsedMs - jumpEndMs) / WADE_DURATION_MS :
          phase === "walk" ? (elapsedMs - wadeEndMs) / WALK_DURATION_MS : 0
    });
  });
  return Object.freeze({
    elapsedMs,
    complete: elapsedMs >= CITY_COLONIST_LANDING_DURATION_MS,
    units: Object.freeze(units)
  });
}

export function cityColonistScreenPoint(unit, { deck, water, beach, assembly }) {
  if (!unit || !Number.isFinite(unit.progress) || unit.progress < 0 || unit.progress > 1) {
    throw new Error("Invalid colonist landing progress");
  }
  for (const point of [deck, water, beach, assembly]) {
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
      throw new Error("Colonist landing requires finite screen coordinates");
    }
  }
  if (unit.phase === "aboard") return deck;
  if (unit.phase === "ashore") return assembly;
  if (unit.phase === "jump") {
    return cityAssaultJumpPoint({
      start: deck, end: water, elapsedMs: unit.progress * JUMP_DURATION_MS,
      durationMs: JUMP_DURATION_MS
    });
  }
  if (unit.phase !== "wade" && unit.phase !== "walk") {
    throw new Error(`Unknown colonist landing phase: ${unit.phase}`);
  }
  const [start, end] = unit.phase === "wade" ? [water, beach] : [beach, assembly];
  return Object.freeze({
    x: Math.round(start.x + (end.x - start.x) * unit.progress),
    y: Math.round(start.y + (end.y - start.y) * unit.progress)
  });
}
