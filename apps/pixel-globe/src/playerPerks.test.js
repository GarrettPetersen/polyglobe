import assert from "node:assert/strict";
import test from "node:test";

import {
  createGameState,
  maybeGrantDefeatedShipPerkItem,
  maybeGrantMissionPerkItem,
  refreshPlayerPerkCargoCapacity
} from "./gameState.js";
import { gameStatePerkTotals } from "./playerPerks.js";
import {
  NAMED_CREW_ROLE_CHEF,
  NAMED_CREW_ROLE_HISTORIAN,
  addNamedCrewMember
} from "./namedCrew.js";
import { shipStatsForSlug } from "./shipStats.js";
import { setTestCrewCount } from "./test-fixtures/crewTestFixtures.js";

function perkState() {
  const stats = shipStatsForSlug("brigantine");
  return createGameState({
    cargoCapacity: stats.cargoCapacity,
    shipStats: stats,
    playerCharacter: {
      id: "perk-test-captain",
      name: "Perk Test Captain",
      nationalityId: "england",
      homePortCityId: "london|united kingdom",
      homePortTileId: 1,
      homePortName: "London",
      homePortCountry: "United Kingdom",
      expressions: [{ id: "neutral" }],
      skillIds: ["skilled-chef"]
    }
  });
}

test("carried items and captain skills share one stacking perk total", () => {
  const state = perkState();
  state.inventory.items["sturdy-barrels"] = 1;
  state.inventory.items["bronze-fish-hooks"] = 1;
  refreshPlayerPerkCargoCapacity(state);
  const totals = gameStatePerkTotals(state);
  assert.equal(state.cargoCapacity, state.ship.baseCargoCapacity + 3);
  assert.equal(totals.foodDurationMultiplier, 1.2);
  assert.equal(totals.fishingChanceMultiplier, 1.08);
});

test("permanent named crew contribute their skills to ship work", () => {
  const state = perkState();
  setTestCrewCount(state, 2);
  addNamedCrewMember(state, {
    id: "master-chef",
    name: "Lucia Ferraro",
    expressions: [{ id: "neutral" }],
    skillIds: ["master-chef"]
  }, NAMED_CREW_ROLE_CHEF);
  assert.equal(gameStatePerkTotals(state).foodDurationMultiplier, 1.92);
});

test("a detained captive never contributes their character skill", () => {
  const state = perkState();
  const captive = {
    id: "detained-captive",
    name: "Nils Andersen",
    skillIds: ["master-chef"]
  };
  state.memory.quests.pirateCaptive.active = {
    character: captive,
    deception: { state: "detained" }
  };

  assert.equal(gameStatePerkTotals(state, {
    additionalCharacters: [captive]
  }).foodDurationMultiplier, 1.2);
});

test("hull sheathing and a named shipwright share the resistance perk total", () => {
  const state = perkState();
  setTestCrewCount(state, 2);
  state.inventory.items["lead-sheathing"] = 1;
  addNamedCrewMember(state, {
    id: "crew-shipwright",
    name: "Mateo Ruiz",
    expressions: [{ id: "neutral" }],
    skillIds: ["shipwright"]
  }, NAMED_CREW_ROLE_HISTORIAN);

  assert.equal(gameStatePerkTotals(state).damageResistanceChance, 0.2);
  assert.equal(gameStatePerkTotals(state).hullRepairHitPointsPerDay, 10);
});

test("portable matchlocks improve a marine assault without trade cargo", () => {
  const state = perkState();
  state.inventory.items["matchlock-arquebuses"] = 1;
  state.cargo.matchlocks = 5;
  state.cargo.gunpowder = 3;
  assert.equal(gameStatePerkTotals(state).portAssaultFirearmDamageMultiplier, 1.22);
});

test("harder missions can award a persistent unowned item", () => {
  const state = perkState();
  const gift = maybeGrantMissionPerkItem(state, {
    tileId: 12,
    portId: "test-port",
    city: "Test Port",
    factionId: "neutral",
    cityType: "mediterranean"
  }, {
    missionId: "long-hard-mission",
    distanceKm: 12000,
    reward: 5000,
    random: () => 0
  });
  assert.ok(gift?.item);
  assert.equal(state.inventory.items[gift.item.id], 1);
});

test("defeated ships can yield one persistent piece of regional equipment", () => {
  const state = perkState();
  const ship = {
    id: "defeated-merchant-1",
    slug: "brigantine",
    currentPort: {
      tileId: 12,
      portId: "test-port",
      city: "Test Port",
      factionId: "neutral",
      cityType: "mediterranean"
    }
  };
  const prize = maybeGrantDefeatedShipPerkItem(state, ship, { random: () => 0 });

  assert.ok(prize?.item);
  assert.equal(prize.chance, 0.08);
  assert.equal(state.inventory.items[prize.item.id], 1);
  assert.equal(maybeGrantDefeatedShipPerkItem(state, ship, { random: () => 0.5 }), null);
});
