import { realSecondsPerGameDay } from "./gamePacing.js";
import { SHIP_PROPULSION_OAR, shipStatsForSlug } from "./shipStats.js";

const EARTH_RADIUS_KM = 6371;
const NPC_CRUISING_SPEED_FRACTION = 0.85;

export function npcCruisingKmPerGameDay(stats) {
  if (!Number.isFinite(stats?.topSpeedRad) || stats.topSpeedRad <= 0) {
    throw new Error("NPC route pacing requires a positive ship speed in radians per second");
  }
  return stats.topSpeedRad * EARTH_RADIUS_KM * realSecondsPerGameDay() * NPC_CRUISING_SPEED_FRACTION;
}

// Snapshot v10 and earlier converted angular speeds with a historical km/day
// heuristic. Preserve position and departure delays when updating those plans;
// do not teleport fleets or retroactively change recorded arrivals.
export function migrateNpcRoutePacing(ship, clockMinute) {
  const plan = ship.plan;
  if (!plan || !plan.segments.some(segment => segment.kind === "sail")) return;
  if (!Number.isFinite(clockMinute)) throw new Error(`Invalid route migration clock: ${ship.id}`);
  const effectiveMinute = clockMinute + ship.clockOffsetMinutes;
  if (effectiveMinute >= plan.endMinute) return;
  const stats = shipStatsForSlug(ship.slug);
  const oldKmPerDay = Math.max(stats.propulsion === SHIP_PROPULSION_OAR ? 60 : 115,
    Math.min(360, stats.topSpeedRad * 7200));
  const ratio = oldKmPerDay / npcCruisingKmPerGameDay(stats);
  let offset = 0;
  let anchor = effectiveMinute < plan.startMinute ? effectiveMinute - plan.startMinute : null;
  const segments = plan.segments.map(segment => {
    const duration = segment.endMinute - segment.startMinute;
    if (!Number.isFinite(duration) || duration <= 0) throw new Error(`Invalid saved route duration: ${ship.id}`);
    const nextDuration = segment.kind === "sail" ? duration * ratio : duration;
    if (effectiveMinute >= segment.startMinute && effectiveMinute < segment.endMinute) {
      anchor = offset + nextDuration * (effectiveMinute - segment.startMinute) / duration;
    }
    const result = { ...segment, startMinute: offset, endMinute: offset + nextDuration };
    offset += nextDuration;
    return result;
  });
  if (anchor === null) throw new Error(`Saved route has a clock gap: ${ship.id}`);
  const startMinute = clockMinute - anchor;
  plan.segments = segments.map(segment => ({ ...segment,
    startMinute: segment.startMinute + startMinute, endMinute: segment.endMinute + startMinute }));
  plan.startMinute = startMinute;
  plan.endMinute = startMinute + offset;
  ship.clockOffsetMinutes = 0;
}
