import assert from "node:assert/strict";
import test from "node:test";

import { createGameState } from "./gameState.js";
import { shipStatsForSlug } from "./shipStats.js";
import {
  VIKING_LONGSHIP_FETCH_STAGES,
  VIKING_LONGSHIP_PORT_CITY,
  VIKING_LONGSHIP_REWARD_ACCEPTED,
  VIKING_LONGSHIP_REWARD_DECLINED,
  VIKING_LONGSHIP_REWARD_PENDING,
  VIKING_LONGSHIP_REWARD_PURCHASED,
  acceptVikingLongshipReward,
  declineVikingLongshipReward,
  deliverVikingLongshipQuestCargo,
  isVikingLongshipQuestPort,
  markVikingLongshipPurchased,
  vikingLongshipQuestState,
  vikingLongshipRewardDisposition,
  vikingLongshipUnlocked
} from "./vikingLongshipQuest.js";

const HAFNARFJORDUR = Object.freeze({
  city: VIKING_LONGSHIP_PORT_CITY,
  country: "Iceland",
  tileId: 64,
  portId: "city-64"
});

test("the longship unlock requires three ordered historical material deliveries", () => {
  const stats = shipStatsForSlug("brigantine");
  const state = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  state.cargo = { wool: 9, timber: 6, iron: 3 };
  state.accounts.cargoCostBasis = { wool: 90, timber: 60, iron: 45 };

  assert.equal(isVikingLongshipQuestPort(HAFNARFJORDUR), true);
  assert.equal(vikingLongshipQuestState(state, HAFNARFJORDUR).stage.id, "wool-sail");
  assert.equal(vikingLongshipUnlocked(state), false);
  assert.throws(
    () => deliverVikingLongshipQuestCargo(state, HAFNARFJORDUR, "iron-rivets"),
    /Unexpected Viking longship material stage/
  );

  for (const stage of VIKING_LONGSHIP_FETCH_STAGES) {
    const result = deliverVikingLongshipQuestCargo(state, HAFNARFJORDUR, stage.id, { simMinute: 1522 });
    assert.equal(result.completedStage.id, stage.id);
  }

  assert.equal(state.cargo.wool, 1);
  assert.equal(state.cargo.timber, undefined);
  assert.equal(state.cargo.iron, undefined);
  assert.equal(state.accounts.cargoCostBasis.wool, 10);
  assert.equal(vikingLongshipQuestState(state, HAFNARFJORDUR).unlocked, true);
  assert.equal(vikingLongshipUnlocked(state), true);
  assert.equal(vikingLongshipRewardDisposition(state), VIKING_LONGSHIP_REWARD_PENDING);
  assert.deepEqual(
    state.accounts.ledger.slice(-3).map((entry) => entry.goodId),
    ["wool", "timber", "iron"]
  );
});

test("the completed longship reward records one durable choice", () => {
  const stats = shipStatsForSlug("brigantine");
  const accepted = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  accepted.cargo = { wool: 8, timber: 6, iron: 3 };
  accepted.accounts.cargoCostBasis = { wool: 80, timber: 60, iron: 30 };
  for (const stage of VIKING_LONGSHIP_FETCH_STAGES) {
    deliverVikingLongshipQuestCargo(accepted, HAFNARFJORDUR, stage.id);
  }
  assert.equal(acceptVikingLongshipReward(accepted), VIKING_LONGSHIP_REWARD_ACCEPTED);
  assert.equal(vikingLongshipRewardDisposition(accepted), VIKING_LONGSHIP_REWARD_ACCEPTED);
  assert.throws(() => declineVikingLongshipReward(accepted), /is accepted; expected pending/);

  const declined = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  declined.cargo = { wool: 8, timber: 6, iron: 3 };
  declined.accounts.cargoCostBasis = { wool: 80, timber: 60, iron: 30 };
  for (const stage of VIKING_LONGSHIP_FETCH_STAGES) {
    deliverVikingLongshipQuestCargo(declined, HAFNARFJORDUR, stage.id);
  }
  assert.equal(declineVikingLongshipReward(declined), VIKING_LONGSHIP_REWARD_DECLINED);
  assert.equal(vikingLongshipRewardDisposition(declined), VIKING_LONGSHIP_REWARD_DECLINED);
  assert.throws(() => acceptVikingLongshipReward(declined), /is declined; expected pending/);
  assert.equal(markVikingLongshipPurchased(declined), VIKING_LONGSHIP_REWARD_PURCHASED);
  assert.equal(vikingLongshipRewardDisposition(declined), VIKING_LONGSHIP_REWARD_PURCHASED);
  assert.throws(() => markVikingLongshipPurchased(declined), /is purchased; expected declined/);
});

test("longship materials cannot be delivered at another port", () => {
  const stats = shipStatsForSlug("brigantine");
  const state = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  state.cargo.wool = 8;

  assert.equal(vikingLongshipQuestState(state, { city: "Bergen", country: "Norway" }), null);
  assert.throws(
    () => deliverVikingLongshipQuestCargo(state, { city: "Bergen", country: "Norway" }, "wool-sail"),
    /only be delivered in Hafnarfjordur/
  );
});
