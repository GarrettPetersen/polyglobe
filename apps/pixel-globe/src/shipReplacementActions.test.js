import assert from "node:assert/strict";
import test from "node:test";
import { SHIP_STATS } from "./shipStats.js";
import { awardPlayerShip, cargoUsed, playerShipReplacementEligibility, validateGameState } from "./gameState.js";
import { createPlayerTestGameState } from "./test-fixtures/createTestGameState.js";
import { initializeTestProvisionalShipLoadout, setTestCrewCount, TEST_CREW_HOME_PORT } from "./test-fixtures/crewTestFixtures.js";

// Catalog-driven contract: a replacement offered as possible must actually
// preserve the roster and produce a valid hold, for every pair of hulls.
for (const current of SHIP_STATS) {
  test(`[ship action contract] replacements from ${current.slug}`, () => {
    let permitted = 0;
    for (const crewCount of new Set([1, current.crewCapacity])) {
      const initial = createPlayerTestGameState({ shipStats: current, cargoCapacity: current.cargoCapacity });
      initializeTestProvisionalShipLoadout(initial, current);
      setTestCrewCount(initial, crewCount);
      initial.cargo = {};
      initial.accounts.cargoCostBasis = {};
      initial.survival.freshWater = 0;
      initial.ship.cannons = 0;
      for (const hold of ["empty", "full"]) {
        const state = structuredClone(initial);
        if (hold === "full") {
          const quantity = state.cargoCapacity - cargoUsed(state);
          state.cargo.amber = quantity;
          state.accounts.cargoCostBasis.amber = quantity;
        }
        validateGameState(state);
        for (const target of SHIP_STATS) {
          const before = structuredClone(state);
          const next = structuredClone(state);
          const eligibility = playerShipReplacementEligibility(next, target);
          assert.deepEqual(next, before, "Eligibility must not change player state");
          const label = `${current.slug} -> ${target.slug}, crew=${crewCount}, hold=${hold}`;
          if (!eligibility.eligible) {
            assert.throws(() => awardPlayerShip(next, TEST_CREW_HOME_PORT, target, "Contract test"), label);
            assert.deepEqual(next, before, `Rejected replacement mutated state: ${label}`);
            continue;
          }
          permitted += 1;
          awardPlayerShip(next, TEST_CREW_HOME_PORT, target, "Contract test");
          validateGameState(next);
          assert.equal(next.ship.crew, crewCount, `Replacement lost people: ${label}`);
          assert.equal(cargoUsed(next), eligibility.transferredCargoUsed, `Preview disagreed with actual hold: ${label}`);
        }
      }
    }
    assert.ok(permitted > 0, `No valid replacements were exercised from ${current.slug}`);
  });
}
