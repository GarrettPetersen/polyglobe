import assert from "node:assert/strict";
import test from "node:test";

import {
  COLONIZATION_SITE_ARRIVAL_RADIUS_PX,
  colonizationSiteCallIsInArrivalRange,
  questSiteArrivalCandidate,
  resolveQuestSiteAnchorOnDialogueClose
} from "./questSiteArrival.js";

const SITE = Object.freeze({
  tileId: 41,
  requiredTradePort: false,
  character: Object.freeze({ id: "colonial-organizer" }),
  interactionX: 100,
  interactionY: 80
});
const PLAYER_AT_SITE = Object.freeze({ x: SITE.interactionX, y: SITE.interactionY });

test("colony and lost-colony shore objectives automatically arrive inside interaction range", () => {
  for (const kind of ["found-colony", "investigate-lost-colony"]) {
    const arrival = questSiteArrivalCandidate({
      colonizationObjective: { kind, tileId: SITE.tileId },
      cityCalls: [SITE],
      playerInteractionPoint: PLAYER_AT_SITE
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
    playerInteractionPoint: PLAYER_AT_SITE
  }), null);
  assert.equal(questSiteArrivalCandidate({
    colonizationObjective: { kind: "found-colony", tileId: SITE.tileId },
    cityCalls: [SITE],
    playerInteractionPoint: {
      x: SITE.interactionX + COLONIZATION_SITE_ARRIVAL_RADIUS_PX + 1,
      y: SITE.interactionY
    }
  }), null);
  assert.equal(questSiteArrivalCandidate({
    colonizationObjective: { kind: "resupply-colony", tileId: SITE.tileId },
    cityCalls: [SITE],
    playerInteractionPoint: PLAYER_AT_SITE
  }), null);
});

test("a colony landing accepts the full widened circle but rejects its outer edge", () => {
  assert.equal(COLONIZATION_SITE_ARRIVAL_RADIUS_PX, 48);
  assert.equal(colonizationSiteCallIsInArrivalRange(SITE, {
    x: SITE.interactionX + COLONIZATION_SITE_ARRIVAL_RADIUS_PX,
    y: SITE.interactionY
  }), true);
  assert.equal(colonizationSiteCallIsInArrivalRange(SITE, {
    x: SITE.interactionX + COLONIZATION_SITE_ARRIVAL_RADIUS_PX,
    y: SITE.interactionY + 1
  }), false);
  assert.equal(colonizationSiteCallIsInArrivalRange(SITE, {
    x: SITE.interactionX + 34,
    y: SITE.interactionY + 24
  }), true);
});

test("a completed pirate map automatically arrives only at its exact shore tile", () => {
  assert.deepEqual(questSiteArrivalCandidate({
    cityCalls: [],
    treasureTileId: 73,
    nearestShoreTileId: 73
  }), { kind: "treasure", tileId: 73 });
  assert.equal(questSiteArrivalCandidate({
    cityCalls: [],
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
