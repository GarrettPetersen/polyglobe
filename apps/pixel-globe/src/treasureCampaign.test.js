import assert from "node:assert/strict";
import test from "node:test";

import {
  TREASURE_MAP_PIECE_COUNT,
  TREASURE_PIRATE_HINT_LIMIT,
  acquireTreasureMapPiece,
  bindTreasurePirateCaptainName,
  createTreasureCampaignFields,
  initializeTreasureCampaign,
  recordTreasureAmbushDefeat,
  recordTreasurePirateRumor,
  recoverTreasure,
  settleTreasureHomecoming,
  treasureAmbushComplete,
  treasureCampaignPhase,
  treasurePirateHints,
  validateTreasureCampaignFields
} from "./treasureCampaign.js";

test("treasure campaign selects a distant one-hex island and twelve globally spread pirates", () => {
  const goal = initializedGoal();

  assert.equal(goal.treasureTileId, 1);
  assert.equal(goal.mapPirates.length, TREASURE_MAP_PIECE_COUNT);
  assert.equal(new Set(goal.mapPirates.map((pirate) => pirate.shipId)).size, TREASURE_MAP_PIECE_COUNT);
  assert.equal(new Set(goal.mapPirates.map((pirate) => pirate.hideoutTileId)).size, TREASURE_MAP_PIECE_COUNT);
  assert.equal(treasureCampaignPhase(goal), "map-hunt");
  validateTreasureCampaignFields(goal);
});

test("rumors are capped at three and acquired pieces clear their waypoint", () => {
  const goal = initializedGoal();
  bindCaptains(goal);

  for (let index = 0; index < TREASURE_PIRATE_HINT_LIMIT; index++) {
    const pirate = goal.mapPirates[index];
    const rumor = recordTreasurePirateRumor(goal, {
      interactionKey: `port:${index}`,
      pirateId: pirate.id,
      pirateLatitudeDeg: 5 + index,
      pirateLongitudeDeg: 30 + index,
      reportedLatitudeDeg: 6 + index,
      reportedLongitudeDeg: 31 + index,
      referenceCityName: "Port Test",
      referenceCityLatitudeDeg: 0,
      referenceCityLongitudeDeg: 0,
      force: true
    });
    assert.match(rumor.text, new RegExp(pirate.captainName));
  }
  assert.equal(treasurePirateHints(goal).length, TREASURE_PIRATE_HINT_LIMIT);

  const hintedPirate = goal.mapPirates[0];
  const piece = acquireTreasureMapPiece(goal, hintedPirate.id, 100);
  assert.equal(piece.acquired, true);
  assert.equal(goal.pirateHints.some((hint) => hint.pirateId === hintedPirate.id), false);
});

test("all twelve map pieces unlock the treasure and all twelve ambushers gate homecoming", () => {
  const goal = initializedGoal();
  bindCaptains(goal);

  for (const [index, pirate] of goal.mapPirates.entries()) {
    const piece = acquireTreasureMapPiece(goal, pirate.id, 100 + index);
    assert.equal(piece.count, index + 1);
  }
  assert.equal(treasureCampaignPhase(goal), "find-treasure");

  recoverTreasure(goal, 500);
  assert.equal(treasureCampaignPhase(goal), "return-home");
  assert.equal(treasureAmbushComplete(goal), false);
  assert.throws(() => settleTreasureHomecoming(goal), /old crew remains/i);

  for (const pirate of goal.mapPirates) {
    assert.equal(recordTreasureAmbushDefeat(goal, pirate.id), true);
    assert.equal(recordTreasureAmbushDefeat(goal, pirate.id), false);
  }
  assert.equal(treasureAmbushComplete(goal), true);
  assert.deepEqual(settleTreasureHomecoming(goal), {
    type: "pirate-treasure",
    completed: true
  });
  assert.equal(goal.status, "complete");
});

function initializedGoal() {
  const graph = testGraph();
  const goal = {
    ...createTreasureCampaignFields("voyage-test"),
    type: "pirate-treasure",
    homePortTileId: 0
  };
  initializeTreasureCampaign(goal, {
    graph,
    earthRows: Array.from({ length: graph.tileCount }, (_, id) => ({ id })),
    navigationMask: Uint8Array.from([1, 0, ...Array(12).fill(1)]),
    occupiedTileIds: [0],
    pirateHideouts: Array.from({ length: 12 }, (_, index) => ({
      tileId: index + 2,
      lat: -45 + index * 8,
      lon: -165 + index * 30
    })),
    pirateShipSlugs: ["pirate-brig", "xebec"],
    identityKey: "voyage-test"
  });
  return goal;
}

function bindCaptains(goal) {
  for (const [index, pirate] of goal.mapPirates.entries()) {
    bindTreasurePirateCaptainName(goal, pirate.id, `Rogue ${index + 1}`);
  }
}

function testGraph() {
  const tileCount = 14;
  const neighbors = Array.from({ length: tileCount }, () => []);
  neighbors[1] = [2, 3, 4, 5, 6, 7];
  const latDeg = new Float32Array(tileCount);
  const lonDeg = new Float32Array(tileCount);
  lonDeg[1] = 60;
  for (let index = 2; index < tileCount; index++) {
    latDeg[index] = -45 + index * 7;
    lonDeg[index] = -170 + index * 26;
  }
  return { tileCount, neighbors, latDeg, lonDeg };
}
