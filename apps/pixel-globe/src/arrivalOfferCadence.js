import { questOfferPolicy } from "./questOfferPolicies.js";
const DAY_MINUTES = 1440;
const POLICIES = Object.freeze({ pirate: "pirate-contract", "war-loan": "war-loan", shipyard: "shipyard",
  exeter: "exeter", naturalist: "naturalist", hospitaller: "hospitaller", conquistador: "conquistador" });
const SHARED_KINDS = new Set(["pirate", "war-loan", "shipyard"]);
const SHARED_COOLDOWN_MINUTES = 14 * DAY_MINUTES;
const GLOBAL_KEY = "arrival-offer.last-minute";
function keyFor(kind) {
  if (!Object.hasOwn(POLICIES, kind)) throw new Error(`Unknown arrival offer kind: ${kind}`);
  return `arrival-offer.${kind}.last-minute`;
}
export function arrivalOfferEligible(decisions, kind, simMinute) {
  const key = keyFor(kind);
  if (!Number.isFinite(simMinute) || simMinute < 0) throw new Error("Invalid arrival offer clock");
  for (const field of [key, GLOBAL_KEY]) {
    if (decisions[field] !== undefined && (!Number.isFinite(decisions[field]) || decisions[field] < 1)) {
      throw new Error(`Invalid arrival offer history: ${field}`);
    }
  }
  // Store minute + 1 so an offer at the start of a voyage remains distinguishable
  // from an absent journal entry. These bounded keys bound the persistent history.
  return (!SHARED_KINDS.has(kind) || decisions[GLOBAL_KEY] === undefined || simMinute >= decisions[GLOBAL_KEY] - 1 + SHARED_COOLDOWN_MINUTES) &&
    (decisions[key] === undefined || simMinute >= decisions[key] - 1 + questOfferPolicy(POLICIES[kind]).cooldownMinutes);
}
export function recordArrivalOffer(decisions, kind, simMinute) {
  if (!arrivalOfferEligible(decisions, kind, simMinute)) throw new Error(`Arrival offer repeated too soon: ${kind}`);
  decisions[keyFor(kind)] = simMinute + 1;
  if (SHARED_KINDS.has(kind)) decisions[GLOBAL_KEY] = simMinute + 1;
}
