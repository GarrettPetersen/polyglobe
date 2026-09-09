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

test("capture warrants block retirement until settled, including the return journey", () => {
  for (const kind of ["capture-port", "capture-capital"]) for (const stage of ["capture", "return"]) {
    assert.deepEqual(campaignRetirementObligation([], [], { id: "warrant", kind, stage, targetName: "Lisbon" }),
      { commissionTargetName: "Lisbon" });
  }
  assert.equal(campaignRetirementObligation([], [], null), null);
  assert.throws(() => campaignRetirementObligation([], [], { id: "broken", kind: "capture-port", stage: "capture" }), /Invalid retirement capture commission/);
});

test("the live retirement check sees a capture commission even with no passengers", async () => {
  const { readFileSync } = await import("node:fs");
  const { runInNewContext } = await import("node:vm");
  const { activeQuests } = await import("./activeQuests.js");
  const { isCaptureCommissionQuest } = await import("./gameState.js");
  const main = readFileSync(new URL("./main.js", import.meta.url), "utf8");
  const start = main.indexOf("function currentCampaignRetirementObligation(");
  const code = main.slice(start, main.indexOf("\nfunction ", start + 1));
  const quests = { captureActive: { id: "warrant", kind: "capture-port", stage: "capture", targetName: "Lisbon" } };
  const check = runInNewContext(`${code}\ncurrentCampaignRetirementObligation`, {
    gameState: { memory: { quests } }, shipTravelerManifest: () => [], currentAboardRoster: () => ({ named: [] }),
    activeQuests, isCaptureCommissionQuest, campaignRetirementObligation
  });
  assert.deepEqual(check(), { commissionTargetName: "Lisbon" });
  quests.captureActive.stage = "return";
  assert.deepEqual(check(), { commissionTargetName: "Lisbon" });
  quests.captureActive = null;
  assert.equal(check(), null);
});
