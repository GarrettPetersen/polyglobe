export const TRAVELER_KIND_PASSENGER = "passenger";
export const TRAVELER_KIND_ENVOY = "envoy";
export const TRAVELER_KIND_SETTLER = "settler";
export const TRAVELER_KIND_SOLDIER = "soldier";
export const TRAVELER_KIND_CAPTIVE = "captive";

export const TRAVELER_KINDS = Object.freeze(/** @type {const} */ ([
  TRAVELER_KIND_PASSENGER,
  TRAVELER_KIND_ENVOY,
  TRAVELER_KIND_SETTLER,
  TRAVELER_KIND_SOLDIER,
  TRAVELER_KIND_CAPTIVE
]));

export const NAMED_TRAVELER_KINDS = Object.freeze(/** @type {const} */ ([
  TRAVELER_KIND_PASSENGER,
  TRAVELER_KIND_ENVOY,
  TRAVELER_KIND_CAPTIVE
]));

/** @typedef {(typeof TRAVELER_KINDS)[number]} TravelerKind */
/** @typedef {(typeof NAMED_TRAVELER_KINDS)[number]} NamedTravelerKind */
/** @typedef {{ kind: TravelerKind, count: number }} TravelerGroup */

const TRAVELER_KIND_SET = new Set(TRAVELER_KINDS);
const NAMED_TRAVELER_KIND_SET = new Set(NAMED_TRAVELER_KINDS);

/** @param {unknown} value */
export function isTravelerKind(value) {
  return typeof value === "string" && TRAVELER_KIND_SET.has(/** @type {TravelerKind} */ (value));
}

/**
 * @param {unknown} value
 * @param {string} [label]
 * @returns {TravelerKind}
 */
export function assertTravelerKind(value, label = "Traveler") {
  if (!isTravelerKind(value)) throw new Error(`${label} has invalid kind: ${value}`);
  return /** @type {TravelerKind} */ (value);
}

/**
 * @param {unknown} value
 * @param {string} [label]
 * @returns {NamedTravelerKind}
 */
export function assertNamedTravelerKind(value, label = "Named traveler") {
  if (typeof value !== "string" ||
      !NAMED_TRAVELER_KIND_SET.has(/** @type {NamedTravelerKind} */ (value))) {
    throw new Error(`${label} has invalid kind: ${value}`);
  }
  return /** @type {NamedTravelerKind} */ (value);
}

/**
 * @param {TravelerKind} kind
 * @param {number} count
 * @returns {Readonly<TravelerGroup>}
 */
export function createTravelerGroup(kind, count) {
  assertTravelerKind(kind);
  if (!Number.isInteger(count) || count < 0) {
    throw new Error(`Invalid ${kind} traveler count: ${count}`);
  }
  return Object.freeze({ kind, count });
}

/**
 * @param {unknown} group
 * @param {string} [label]
 * @returns {Readonly<TravelerGroup>}
 */
export function assertTravelerGroup(group, label = "Traveler group") {
  if (!group || typeof group !== "object") throw new Error(`${label} must be an object`);
  const candidate = /** @type {{ kind?: unknown, count?: unknown }} */ (group);
  const kind = assertTravelerKind(candidate.kind, label);
  if (!Number.isInteger(candidate.count) || /** @type {number} */ (candidate.count) < 0) {
    throw new Error(`Invalid ${kind} traveler count: ${candidate.count}`);
  }
  return /** @type {Readonly<TravelerGroup>} */ (group);
}

/**
 * An exhaustive record is deliberately checked both by TypeScript and at runtime.
 * Adding a traveler kind must update every role, color, or behavior map that calls this.
 *
 * @template T
 * @param {Record<TravelerKind, T>} record
 * @param {string} label
 * @returns {Readonly<Record<TravelerKind, T>>}
 */
export function completeTravelerKindRecord(record, label) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    throw new Error(`${label} must be an object`);
  }
  const keys = Object.keys(record);
  const missing = TRAVELER_KINDS.filter((kind) => !Object.hasOwn(record, kind));
  const unknown = keys.filter((kind) => !TRAVELER_KIND_SET.has(/** @type {TravelerKind} */ (kind)));
  if (missing.length > 0 || unknown.length > 0) {
    throw new Error(
      `${label} must cover exactly ${TRAVELER_KINDS.join(", ")}; ` +
      `missing ${missing.join(", ") || "none"}; unknown ${unknown.join(", ") || "none"}`
    );
  }
  return Object.freeze({ ...record });
}
