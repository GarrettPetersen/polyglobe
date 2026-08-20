import assert from "node:assert/strict";
import test from "node:test";

import {
  ABOARD_ROLE_COLONY_LEADER,
  ABOARD_ROLE_PASSENGER
} from "./aboardRoster.js";
import { campaignRetirementObligation } from "./campaignRetirement.js";

function namedEntry(role, name, destinationName) {
  return {
    role,
    character: { id: name.toLowerCase().replaceAll(" ", "-"), name },
    goal: { id: `travel:${destinationName}`, text: `Reach ${destinationName}`, destinationName }
  };
}

test("retirement names the actual traveler and destination aboard", () => {
  assert.deepEqual(
    campaignRetirementObligation(
      [{ kind: "passenger", count: 1 }],
      [namedEntry(ABOARD_ROLE_PASSENGER, "Thomas Hale", "Algiers")]
    ),
    {
      travelerName: "Thomas Hale",
      destinationName: "Algiers",
      additionalTravelerCount: 0
    }
  );
});

test("a named colony leader represents the complete settler company", () => {
  assert.deepEqual(
    campaignRetirementObligation(
      [{ kind: "settler", count: 12 }],
      [namedEntry(ABOARD_ROLE_COLONY_LEADER, "Maria Torres", "Lima")]
    ),
    {
      travelerName: "Maria Torres",
      destinationName: "Lima",
      additionalTravelerCount: 11
    }
  );
});

test("an empty traveler manifest permits retirement", () => {
  assert.equal(campaignRetirementObligation([], []), null);
});

test("a retirement-blocking traveler cannot lose their named obligation", () => {
  assert.throws(
    () => campaignRetirementObligation([{ kind: "passenger", count: 1 }], []),
    /no named representative/
  );
});
