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
  reachTreasurePirateHint,
  settleTreasureHomecoming,
  treasureAmbushComplete,
  treasureCampaignPhase,
  treasureRecoveryCaptainMessage,
  treasurePirateHints,
  validateTreasureCampaignFields
} from "./treasureCampaign.js";
import { campaignGoalDestination } from "./campaignGoals.js";
import { shipLabelForProse } from "./shipStats.js";

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
      currentMinute: 20_000,
      force: true
    });
    assert.match(rumor.text, new RegExp(pirate.captainName));
    assert.match(rumor.text, new RegExp(shipLabelForProse(pirate.shipSlug), "i"));
    assert.match(rumor.text, /black flag/i);
  }
  assert.equal(treasurePirateHints(goal).length, TREASURE_PIRATE_HINT_LIMIT);

  const hintedPirate = goal.mapPirates[0];
  const piece = acquireTreasureMapPiece(goal, hintedPirate.id, 100);
  assert.equal(piece.acquired, true);
  assert.equal(goal.pirateHints.some((hint) => hint.pirateId === hintedPirate.id), false);
});

test("reaching a pirate's last reported position identifies the ship and permits a fresh rumor", () => {
  const goal = initializedGoal();
  bindCaptains(goal);
  const pirate = goal.mapPirates[0];
  const firstRumor = recordTreasurePirateRumor(goal, {
    interactionKey: "port:first-report",
    pirateId: pirate.id,
    pirateLatitudeDeg: 5,
    pirateLongitudeDeg: 30,
    reportedLatitudeDeg: 6,
    reportedLongitudeDeg: 31,
    referenceCityName: "Port Test",
    referenceCityLatitudeDeg: 0,
    referenceCityLongitudeDeg: 0,
    currentMinute: 20_000,
    force: true
  });
  assert.ok(firstRumor);
  assert.deepEqual(treasurePirateHints(goal)[0], {
    ...firstRumor.hint,
    pirateName: pirate.captainName,
    pirateShipSlug: pirate.shipSlug,
    pirateShipLabel: shipLabelForProse(pirate.shipSlug)
  });

  const arrival = reachTreasurePirateHint(goal, pirate.id, 20_000 + 3 * 24 * 60);
  assert.match(arrival.text, /was seen/i);
  assert.match(arrival.text, new RegExp(shipLabelForProse(pirate.shipSlug), "i"));
  assert.match(arrival.text, /black flag/i);
  assert.equal(arrival.sightingAgeDays, firstRumor.hint.sightingAgeDays + 3);
  assert.match(arrival.text, new RegExp(`${arrival.sightingAgeDays} days ago`, "i"));
  assert.equal(treasurePirateHints(goal).length, 0);
  assert.equal(reachTreasurePirateHint(goal, pirate.id, 25_000), null);

  const freshRumor = recordTreasurePirateRumor(goal, {
    interactionKey: "port:fresh-report",
    pirateId: pirate.id,
    pirateLatitudeDeg: 10,
    pirateLongitudeDeg: 35,
    reportedLatitudeDeg: 11,
    reportedLongitudeDeg: 36,
    referenceCityName: "Another Port",
    referenceCityLatitudeDeg: 1,
    referenceCityLongitudeDeg: 1,
    currentMinute: 25_000,
    force: true
  });
  assert.ok(freshRumor);
  assert.equal(freshRumor.hint.pirateId, pirate.id);
});

test("an undated pirate hint from an older save remains searchable without inventing an age", () => {
  const goal = initializedGoal();
  bindCaptains(goal);
  const pirate = goal.mapPirates[0];
  goal.pirateHints.push({
    pirateId: pirate.id,
    latitudeDeg: 6,
    longitudeDeg: 31,
    referenceCityName: "Port Test",
    direction: "east",
    interactionKey: "legacy:port-report"
  });

  validateTreasureCampaignFields(goal);
  const arrival = reachTreasurePirateHint(goal, pirate.id, 25_000);
  assert.equal(arrival.sightingAgeDays, null);
  assert.match(arrival.text, /no man can say how old the word is/i);
  assert.equal(goal.pirateHints.length, 0);
});

test("a dated pirate report fails loudly if the restored voyage clock moves backward", () => {
  const goal = initializedGoal();
  bindCaptains(goal);
  const pirate = goal.mapPirates[0];
  recordTreasurePirateRumor(goal, {
    interactionKey: "port:future-report",
    pirateId: pirate.id,
    pirateLatitudeDeg: 5,
    pirateLongitudeDeg: 30,
    reportedLatitudeDeg: 6,
    reportedLongitudeDeg: 31,
    referenceCityName: "Port Test",
    referenceCityLatitudeDeg: 0,
    referenceCityLongitudeDeg: 0,
    currentMinute: 20_000,
    force: true
  });

  assert.throws(
    () => reachTreasurePirateHint(goal, pirate.id, 19_999),
    /report is in the future/i
  );
  assert.equal(goal.pirateHints.length, 1);
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
  assert.deepEqual(campaignGoalDestination(goal), {
    kind: "home",
    homePortTileId: 0,
    reason: "return-with-treasure"
  });
  assert.deepEqual(settleTreasureHomecoming(goal), {
    type: "pirate-treasure",
    completed: true
  });
  assert.equal(goal.status, "complete");
});

test("recovering the treasure names home and marks the return course before the blockade", () => {
  const goal = initializedGoal();
  bindCaptains(goal);
  for (const pirate of goal.mapPirates) acquireTreasureMapPiece(goal, pirate.id, 100);
  recoverTreasure(goal, 500);

  const ladenMessage = treasureRecoveryCaptainMessage(goal, {
    homePortName: "Nanjing",
    goldQuantity: 17
  });
  assert.match(ladenMessage, /17 units of gold/i);
  assert.match(ladenMessage, /set course for Nanjing/i);
  assert.match(ladenMessage, /marked it on the chart/i);
  assert.match(ladenMessage, /old crew bars the way/i);
  assert.deepEqual(campaignGoalDestination(goal), {
    kind: "home",
    homePortTileId: 0,
    reason: "treasure-home-ambush"
  });

  const fullHoldMessage = treasureRecoveryCaptainMessage(goal, {
    homePortName: "Nanjing",
    goldQuantity: 0
  });
  assert.match(fullHoldMessage, /hold cannot take another coin/i);
  assert.match(fullHoldMessage, /set course for Nanjing/i);
});

function initializedGoal() {
  const graph = testGraph();
  const goal = {
    ...createTreasureCampaignFields("voyage-test"),
    version: 1,
    type: "pirate-treasure",
    status: "active",
    homePortTileId: 0,
    introSeen: true,
    endingVariant: 0
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
