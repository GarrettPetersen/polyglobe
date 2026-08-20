export const CREW_STATUS_ICON_WIDTH = 3;
export const CREW_STATUS_ICON_HEIGHT = 6;

const CREW_STATUS_NORMAL_PITCH = CREW_STATUS_ICON_WIDTH + 1;
const TRAVELER_KINDS = new Set(["passenger", "envoy", "settler", "captive"]);

export function crewStatusCount({ crewCount, travelerGroups = [] }) {
  assertCount(crewCount, "crew");
  if (!Array.isArray(travelerGroups)) throw new Error("Crew status travelers must be an array");
  for (const group of travelerGroups) validateTravelerGroup(group);
  return crewCount + travelerGroups.reduce((sum, group) => sum + group.count, 0);
}

export function crewStatusLayout({ crewCount, travelerGroups = [], x, y, width }) {
  const total = crewStatusCount({ crewCount, travelerGroups });
  for (const [label, value] of Object.entries({ x, y, width })) {
    if (!Number.isInteger(value)) throw new Error(`Crew status ${label} must be an integer: ${value}`);
  }
  if (width < CREW_STATUS_ICON_WIDTH) throw new Error(`Crew status row is too narrow: ${width}`);

  if (total === 0) {
    return Object.freeze({ count: 0, entries: Object.freeze([]), pitch: CREW_STATUS_NORMAL_PITCH });
  }
  const availablePitch = total === 1
    ? CREW_STATUS_NORMAL_PITCH
    : Math.min(CREW_STATUS_NORMAL_PITCH, (width - CREW_STATUS_ICON_WIDTH) / (total - 1));
  const pitch = availablePitch >= 1 ? Math.floor(availablePitch) : availablePitch;

  const compressed = pitch < CREW_STATUS_NORMAL_PITCH;
  const entries = [];
  for (let index = 0; index < crewCount; index++) {
    entries.push(personEntry("crew", index, entries.length, x, y, pitch, compressed ? index % 2 : 0));
  }
  for (const group of travelerGroups) {
    for (let index = 0; index < group.count; index++) {
      entries.push(personEntry(group.kind, index, entries.length, x, y, pitch, 0));
    }
  }
  return Object.freeze({ count: total, entries: Object.freeze(entries), pitch });
}

function personEntry(kind, kindIndex, rowIndex, x, y, pitch, variant) {
  return Object.freeze({
    kind,
    kindIndex,
    rowIndex,
    variant,
    x: x + Math.round(rowIndex * pitch),
    y
  });
}

function validateTravelerGroup(group) {
  if (!group || typeof group !== "object" || !TRAVELER_KINDS.has(group.kind)) {
    throw new Error(`Invalid crew status traveler kind: ${group?.kind}`);
  }
  assertCount(group.count, `${group.kind} traveler`);
}

function assertCount(value, label) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`Invalid ${label} count: ${value}`);
  }
}
