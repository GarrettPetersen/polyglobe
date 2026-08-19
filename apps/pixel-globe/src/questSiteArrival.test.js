import assert from "node:assert/strict";
import test from "node:test";

import {
  questSiteArrivalCandidate,
  resolveQuestSiteAnchorOnDialogueClose
} from "./questSiteArrival.js";

const SITE = Object.freeze({ tileId: 41, requiredTradePort: false });

test("colony and lost-colony shore objectives automatically arrive inside interaction range", () => {
  for (const kind of ["found-colony", "investigate-lost-colony"]) {
    const arrival = questSiteArrivalCandidate({
      colonizationObjective: { kind, tileId: SITE.tileId },
      cityCalls: [SITE],
      portCallIsInRange: () => true
    });
    assert.equal(arrival.kind, "colonization");
    assert.equal(arrival.call, SITE);
    assert.equal(arrival.releaseAnchorOnDialogueClose, true);
  }
});

test("ordinary ports and distant quest sites retain their normal interaction", () => {
  assert.equal(questSiteArrivalCandidate({
    colonizationObjective: { kind: "found-colony", tileId: SITE.tileId },
    cityCalls: [{ ...SITE, requiredTradePort: true }],
    portCallIsInRange: () => true
  }), null);
  assert.equal(questSiteArrivalCandidate({
    colonizationObjective: { kind: "found-colony", tileId: SITE.tileId },
    cityCalls: [SITE],
    portCallIsInRange: () => false
  }), null);
  assert.equal(questSiteArrivalCandidate({
    colonizationObjective: { kind: "resupply-colony", tileId: SITE.tileId },
    cityCalls: [SITE],
    portCallIsInRange: () => true
  }), null);
});

test("a completed pirate map automatically arrives only at its exact shore tile", () => {
  assert.deepEqual(questSiteArrivalCandidate({
    cityCalls: [],
    portCallIsInRange: () => false,
    treasureTileId: 73,
    nearestShoreTileId: 73
  }), { kind: "treasure", tileId: 73 });
  assert.equal(questSiteArrivalCandidate({
    cityCalls: [],
    portCallIsInRange: () => false,
    treasureTileId: 73,
    nearestShoreTileId: 74
  }), null);
});

test("closing an automatically anchored quest-site dialogue raises only its own anchor", () => {
  assert.deepEqual(resolveQuestSiteAnchorOnDialogueClose({
    anchored: true,
    releaseAnchorOnDialogueClose: true
  }), { anchored: false, released: true });
  assert.deepEqual(resolveQuestSiteAnchorOnDialogueClose({
    anchored: true,
    releaseAnchorOnDialogueClose: false
  }), { anchored: true, released: false });
  assert.throws(() => resolveQuestSiteAnchorOnDialogueClose({
    anchored: false,
    releaseAnchorOnDialogueClose: true
  }), /without its anchor down/);
});
