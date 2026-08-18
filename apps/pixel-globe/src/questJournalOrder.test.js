import assert from "node:assert/strict";
import test from "node:test";

import { orderQuestJournalEntries } from "./questJournalOrder.js";

const CAMPAIGN = Object.freeze({ id: "campaign" });
const SHIPYARD = Object.freeze({ id: "shipyard-investment" });
const PASSENGER = Object.freeze({ id: "passenger" });

test("active main voyage stays above every optional quest", () => {
  assert.deepEqual(
    orderQuestJournalEntries([SHIPYARD, CAMPAIGN, PASSENGER]),
    [CAMPAIGN, SHIPYARD, PASSENGER]
  );
});

test("completed main voyage moves below ongoing optional quests", () => {
  assert.deepEqual(
    orderQuestJournalEntries([SHIPYARD, CAMPAIGN, PASSENGER], { campaignComplete: true }),
    [SHIPYARD, PASSENGER, CAMPAIGN]
  );
});

test("quest journal rejects duplicate main voyage entries", () => {
  assert.throws(
    () => orderQuestJournalEntries([CAMPAIGN, CAMPAIGN]),
    /duplicate campaign entries/
  );
});
