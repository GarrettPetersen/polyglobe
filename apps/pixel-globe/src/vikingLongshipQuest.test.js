import assert from "node:assert/strict";
import test from "node:test";

import { createGameState } from "./gameState.js";
import { shipStatsForSlug } from "./shipStats.js";
import { NAMED_CREW_ROLE_HISTORIAN, addNamedCrewMember } from "./namedCrew.js";
import {
  VIKING_LONGSHIP_FETCH_STAGES,
  VIKING_LONGSHIP_PORT_CITY,
  VIKING_LONGSHIP_ROLL_PERIOD_MINUTES,
  VIKING_LONGSHIP_REWARD_ACCEPTED,
  VIKING_LONGSHIP_REWARD_DECLINED,
  VIKING_LONGSHIP_REWARD_PENDING,
  VIKING_LONGSHIP_REWARD_PURCHASED,
  acceptVikingLongshipReward,
  declineVikingLongshipReward,
  deliverVikingLongshipQuestCargo,
  isVikingLongshipQuestPort,
  markVikingLongshipPurchased,
  markVikingLongshipReturnedToIceland,
  markVikingLongshipOfferSeen,
  maybeSpawnVikingLongshipQuest,
  vikingLongshipEnthusiastAtPort,
  vikingLongshipOfferShouldApproach,
  vikingLongshipQuestState,
  vikingLongshipRewardDisposition,
  vikingLongshipTradeInFarewell,
  vikingLongshipTradeInPlan,
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
  assert.equal(vikingLongshipQuestState(state, HAFNARFJORDUR), null);
  maybeSpawnVikingLongshipQuest(state, HAFNARFJORDUR, { spawnChance: 1, simMinute: 0 });
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
  maybeSpawnVikingLongshipQuest(accepted, HAFNARFJORDUR, { spawnChance: 1, simMinute: 0 });
  accepted.cargo = { wool: 8, timber: 6, iron: 3 };
  accepted.accounts.cargoCostBasis = { wool: 80, timber: 60, iron: 30 };
  for (const stage of VIKING_LONGSHIP_FETCH_STAGES) {
    deliverVikingLongshipQuestCargo(accepted, HAFNARFJORDUR, stage.id);
  }
  assert.equal(vikingLongshipEnthusiastAtPort(accepted, HAFNARFJORDUR), true);
  assert.equal(acceptVikingLongshipReward(accepted), VIKING_LONGSHIP_REWARD_ACCEPTED);
  assert.equal(vikingLongshipRewardDisposition(accepted), VIKING_LONGSHIP_REWARD_ACCEPTED);
  assert.equal(vikingLongshipEnthusiastAtPort(accepted, HAFNARFJORDUR), false);
  assert.throws(() => declineVikingLongshipReward(accepted), /is accepted; expected pending/);

  const declined = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  maybeSpawnVikingLongshipQuest(declined, HAFNARFJORDUR, { spawnChance: 1, simMinute: 0 });
  declined.cargo = { wool: 8, timber: 6, iron: 3 };
  declined.accounts.cargoCostBasis = { wool: 80, timber: 60, iron: 30 };
  for (const stage of VIKING_LONGSHIP_FETCH_STAGES) {
    deliverVikingLongshipQuestCargo(declined, HAFNARFJORDUR, stage.id);
  }
  assert.equal(declineVikingLongshipReward(declined), VIKING_LONGSHIP_REWARD_DECLINED);
  assert.equal(vikingLongshipRewardDisposition(declined), VIKING_LONGSHIP_REWARD_DECLINED);
  assert.equal(vikingLongshipEnthusiastAtPort(declined, HAFNARFJORDUR), true);
  assert.throws(() => acceptVikingLongshipReward(declined), /is declined; expected pending/);
  assert.equal(markVikingLongshipPurchased(declined), VIKING_LONGSHIP_REWARD_PURCHASED);
  assert.equal(vikingLongshipRewardDisposition(declined), VIKING_LONGSHIP_REWARD_PURCHASED);
  assert.equal(vikingLongshipEnthusiastAtPort(declined, HAFNARFJORDUR), false);
  assert.throws(() => markVikingLongshipPurchased(declined), /is purchased; expected declined/);
});

test("trading in the longship sends its enthusiast and vessel back to Iceland", () => {
  const stats = shipStatsForSlug("viking-longship");
  const state = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });
  maybeSpawnVikingLongshipQuest(state, HAFNARFJORDUR, { spawnChance: 1, simMinute: 0 });
  state.cargo = { wool: 8, timber: 6, iron: 3 };
  state.accounts.cargoCostBasis = { wool: 80, timber: 60, iron: 30 };
  for (const stage of VIKING_LONGSHIP_FETCH_STAGES) {
    deliverVikingLongshipQuestCargo(state, HAFNARFJORDUR, stage.id);
  }
  acceptVikingLongshipReward(state);
  state.ship.crew = 1;
  const historian = addNamedCrewMember(state, {
    id: "icelandic-historian",
    name: "Leif Eriksen",
    homePortName: VIKING_LONGSHIP_PORT_CITY,
    homePortCountry: "Iceland",
    expressions: [{ id: "neutral", src: "test.png", width: 64, height: 64 }],
    skillIds: ["able-seaman"]
  }, NAMED_CREW_ROLE_HISTORIAN, { replaceGenericWhenFull: true });

  assert.deepEqual(vikingLongshipTradeInPlan(state), {
    historian,
    departingNamedCrewIds: [historian.id]
  });
  assert.equal(
    markVikingLongshipReturnedToIceland(state, historian),
    VIKING_LONGSHIP_REWARD_DECLINED
  );
  assert.equal(vikingLongshipRewardDisposition(state), VIKING_LONGSHIP_REWARD_DECLINED);
  assert.equal(vikingLongshipEnthusiastAtPort(state, HAFNARFJORDUR), true);
  assert.match(vikingLongshipTradeInFarewell(), /take the longship off your hands/i);
  assert.match(vikingLongshipTradeInFarewell(), /home to Iceland/i);
  assert.match(vikingLongshipTradeInFarewell(), /Hafnarfjordur/i);
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

test("the historical enthusiast appears only after a persistent random spawn", () => {
  const stats = shipStatsForSlug("brigantine");
  const state = createGameState({ cargoCapacity: stats.cargoCapacity, shipStats: stats });

  assert.equal(maybeSpawnVikingLongshipQuest(state, HAFNARFJORDUR, {
    spawnChance: 0,
    simMinute: 0
  }), null);
  assert.equal(maybeSpawnVikingLongshipQuest(state, HAFNARFJORDUR, {
    spawnChance: 1,
    simMinute: 1
  }), null);
  const offer = maybeSpawnVikingLongshipQuest(state, HAFNARFJORDUR, {
    spawnChance: 1,
    simMinute: VIKING_LONGSHIP_ROLL_PERIOD_MINUTES
  });

  assert.equal(offer.stage.id, "wool-sail");
  assert.equal(vikingLongshipOfferShouldApproach(state, HAFNARFJORDUR), true);
  markVikingLongshipOfferSeen(state);
  assert.equal(vikingLongshipOfferShouldApproach(state, HAFNARFJORDUR), false);
  assert.equal(maybeSpawnVikingLongshipQuest(state, HAFNARFJORDUR, {
    spawnChance: 0,
    simMinute: VIKING_LONGSHIP_ROLL_PERIOD_MINUTES * 2
  }).stage.id, "wool-sail");
});

test("the longship mission waits for a named crew berth but never cancels an active quest", () => {
  const oneBerthStats = {
    slug: "one-berth-test",
    cargoCapacity: 10,
    crewCapacity: 1,
    cannons: 0,
    mass: 5,
    navalWeaponKind: null
  };
  const fullState = createGameState({ cargoCapacity: oneBerthStats.cargoCapacity, shipStats: oneBerthStats });
  assert.equal(maybeSpawnVikingLongshipQuest(fullState, HAFNARFJORDUR, {
    spawnChance: 1,
    simMinute: 0
  }), null);

  const twoBerthStats = { ...oneBerthStats, slug: "two-berth-test", crewCapacity: 2 };
  const activeState = createGameState({ cargoCapacity: twoBerthStats.cargoCapacity, shipStats: twoBerthStats });
  const activeQuest = maybeSpawnVikingLongshipQuest(activeState, HAFNARFJORDUR, {
    spawnChance: 1,
    simMinute: 0
  });
  activeState.ship.crew = activeState.ship.crewCapacity;
  addNamedCrewMember(activeState, {
    id: "existing-crew",
    name: "Existing Crew",
    expressions: [{ id: "neutral", src: "test.png", width: 64, height: 64 }],
    skillIds: ["able-seaman"]
  }, NAMED_CREW_ROLE_HISTORIAN, { replaceGenericWhenFull: true });
  assert.deepEqual(maybeSpawnVikingLongshipQuest(activeState, HAFNARFJORDUR, {
    spawnChance: 0,
    simMinute: 1
  }), activeQuest);
});
