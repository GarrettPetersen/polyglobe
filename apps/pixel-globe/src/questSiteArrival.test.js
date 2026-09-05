import assert from "node:assert/strict";
import test from "node:test";

import {
  COLONIZATION_SITE_ARRIVAL_RADIUS_PX,
  QUEST_SITE_OVERLAY_CHARACTER_ALERT,
  QUEST_SITE_OVERLAY_DIALOGUE,
  colonizationSiteCallIsInArrivalRange,
  questSiteArrivalOverlayKind,
  questSiteArrivalCandidate,
  resolveAutomaticQuestSiteAnchorClosure
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
    assert.equal(arrival.actionType, kind === "found-colony" ? "land-colonists" : null);
    assert.equal(arrival.releaseAnchorOnOverlayClose, true);
  }
});

test("an unfounded colony triggers from geography without requiring nonexistent port staff", () => {
  const site = { ...SITE, cityId: "port royal|canada", character: null };
  const arrival = questSiteArrivalCandidate({
    colonizationObjective: { kind: "found-colony", tileId: site.tileId },
    cityCalls: [site], playerInteractionPoint: PLAYER_AT_SITE
  });
  assert.equal(arrival.call, site);
  assert.equal(arrival.actionType, "land-colonists");
  assert.throws(() => colonizationSiteCallIsInArrivalRange(null, PLAYER_AT_SITE), /site call/);
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

test("automatic quest-site arrivals accept every supported overlay family", () => {
  assert.equal(questSiteArrivalOverlayKind({
    dialogueOpen: true,
    characterAlertOpen: false
  }), QUEST_SITE_OVERLAY_DIALOGUE);
  assert.equal(questSiteArrivalOverlayKind({
    dialogueOpen: false,
    characterAlertOpen: true
  }), QUEST_SITE_OVERLAY_CHARACTER_ALERT);
  assert.equal(questSiteArrivalOverlayKind({
    dialogueOpen: true,
    characterAlertOpen: true
  }), QUEST_SITE_OVERLAY_DIALOGUE);
  assert.throws(() => questSiteArrivalOverlayKind({
    dialogueOpen: false,
    characterAlertOpen: false
  }), /did not open a supported overlay/);
});

test("closing an automatically anchored quest-site overlay raises only its own anchor", () => {
  for (const overlayKind of [QUEST_SITE_OVERLAY_DIALOGUE, QUEST_SITE_OVERLAY_CHARACTER_ALERT]) {
    assert.deepEqual(resolveAutomaticQuestSiteAnchorClosure({
      anchored: true,
      trackedOverlayKind: overlayKind,
      closingOverlayKind: overlayKind
    }), { anchored: false, released: true });
  }
  assert.deepEqual(resolveAutomaticQuestSiteAnchorClosure({
    anchored: true,
    trackedOverlayKind: QUEST_SITE_OVERLAY_DIALOGUE,
    closingOverlayKind: QUEST_SITE_OVERLAY_CHARACTER_ALERT
  }), { anchored: true, released: false });
  assert.throws(() => resolveAutomaticQuestSiteAnchorClosure({
    anchored: false,
    trackedOverlayKind: QUEST_SITE_OVERLAY_CHARACTER_ALERT,
    closingOverlayKind: QUEST_SITE_OVERLAY_CHARACTER_ALERT
  }), /without its anchor down/);
});
