import {
  TRAVELER_KIND_CAPTIVE,
  TRAVELER_KIND_ENVOY,
  TRAVELER_KIND_PASSENGER,
  TRAVELER_KIND_SETTLER,
  completeTravelerKindRecord
} from "./travelerKinds.js";

const STATUS_TRAVELER_PERSON_COLORS = completeTravelerKindRecord({
  [TRAVELER_KIND_PASSENGER]: Object.freeze(["#3b5dc9"]),
  [TRAVELER_KIND_ENVOY]: Object.freeze(["#f9c22b"]),
  [TRAVELER_KIND_SETTLER]: Object.freeze(["#38b764"]),
  [TRAVELER_KIND_CAPTIVE]: Object.freeze(["#9e3e36"])
}, "Crew status traveler colors");

export const STATUS_PERSON_COLORS = Object.freeze({
  crew: Object.freeze(["#2e222f", "#3e3546"]),
  ...STATUS_TRAVELER_PERSON_COLORS
});
