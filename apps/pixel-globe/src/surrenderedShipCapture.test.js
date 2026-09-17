import assert from "node:assert/strict";
import test from "node:test";
import {
  RecoverableSurrenderedShipCaptureError,
  assertSurrenderedNpcPrizeReadyForCapture,
  assertSurrenderedPrizeCaptureEligible,
  dialogueEscapeReturnsToPortCity,
  playerFacingSurrenderedShipCaptureFailure,
  restoreFailedSurrenderedShipCapture,
  surrenderedPrizeCaptureDisabledReason
} from "./surrenderedShipCapture.js";
import { cargoUsed } from "./gameState.js";
import { createPlayerTestGameState as createGameState } from "./test-fixtures/createTestGameState.js";
import {
  initializeTestProvisionalShipLoadout as initializeProvisionalShipLoadout,
  setTestCrewCount
} from "./test-fixtures/crewTestFixtures.js";
import { shipStatsForSlug } from "./shipStats.js";

test("escape from ship dialogue at sea does not require a port city view", () => {
  assert.equal(
    dialogueEscapeReturnsToPortCity({ kind: "ship", nodeId: "prize-choice" }, null),
    false
  );
  assert.equal(
    dialogueEscapeReturnsToPortCity({ kind: "port", nodeId: "market" }, null),
    false
  );
  assert.equal(
    dialogueEscapeReturnsToPortCity({ kind: "port", nodeId: "root" }, { active: false }),
    false
  );
  assert.equal(
    dialogueEscapeReturnsToPortCity({ kind: "port", nodeId: "root" }, { active: true }),
    true
  );
});

test("prize capture uses shipyard eligibility for crew and hold limits", () => {
  const galleon = shipStatsForSlug("galleon");
  const crowded = createGameState({ shipStats: galleon, cargoCapacity: galleon.cargoCapacity });
  initializeProvisionalShipLoadout(crowded, galleon);
  setTestCrewCount(crowded, 40);
  crowded.cargo = {};
  crowded.accounts.cargoCostBasis = {};
  crowded.survival.freshWater = 0;
  crowded.ship.cannons = 0;
  assert.match(
    surrenderedPrizeCaptureDisabledReason(crowded, "fishing-lugger"),
    /Dismiss .* crew|berths/i
  );

  const cog = shipStatsForSlug("small-cog");
  const laden = createGameState({ shipStats: cog, cargoCapacity: cog.cargoCapacity });
  initializeProvisionalShipLoadout(laden, cog);
  setTestCrewCount(laden, 1);
  laden.cargo = {};
  laden.accounts.cargoCostBasis = {};
  laden.survival.freshWater = 0;
  laden.ship.cannons = 0;
  const freeUnits = cog.cargoCapacity - cargoUsed(laden);
  laden.cargo.amber = freeUnits;
  laden.accounts.cargoCostBasis.amber = freeUnits;
  assert.match(
    surrenderedPrizeCaptureDisabledReason(laden, "dhow"),
    /will not fit its \d+-unit hold/
  );

  const light = createGameState({
    shipStats: shipStatsForSlug("fishing-lugger"),
    cargoCapacity: shipStatsForSlug("fishing-lugger").cargoCapacity
  });
  initializeProvisionalShipLoadout(light, shipStatsForSlug("fishing-lugger"));
  setTestCrewCount(light, 1);
  light.cargo = {};
  light.accounts.cargoCostBasis = {};
  light.survival.freshWater = 0;
  light.ship.cannons = 0;
  assert.equal(surrenderedPrizeCaptureDisabledReason(light, "small-cog"), null);
});

test("capture readiness failures are recoverable and restore confirmation", () => {
  assert.throws(
    () => assertSurrenderedNpcPrizeReadyForCapture(null, "small-cog", "atlantic-coast-26"),
    (error) => {
      assert.ok(error instanceof RecoverableSurrenderedShipCaptureError);
      assert.match(error.playerFacingMessage, /no longer alongside/);
      return true;
    }
  );

  const prize = {
    slug: "small-cog",
    specie: 0,
    cargo: { cinnamon: 2 },
    graceUntilPortVisit: Number.MAX_SAFE_INTEGER,
    portVisits: 0
  };
  assert.throws(
    () => assertSurrenderedNpcPrizeReadyForCapture(prize, "small-cog", "atlantic-coast-26"),
    /not ready for transfer/
  );

  const galleon = shipStatsForSlug("galleon");
  const crowded = createGameState({ shipStats: galleon, cargoCapacity: galleon.cargoCapacity });
  initializeProvisionalShipLoadout(crowded, galleon);
  setTestCrewCount(crowded, 40);
  crowded.cargo = {};
  crowded.accounts.cargoCostBasis = {};
  crowded.survival.freshWater = 0;
  crowded.ship.cannons = 0;
  assert.throws(
    () => assertSurrenderedPrizeCaptureEligible(crowded, "fishing-lugger"),
    (error) => error instanceof RecoverableSurrenderedShipCaptureError
  );

  const session = {
    kind: "ship",
    nodeId: "capture-loading",
    selectedIndex: 0,
    feedback: "Your prize crew are transferring command.",
    prize: { candidateShipSlug: "small-cog" }
  };
  const error = new RecoverableSurrenderedShipCaptureError(
    "Surrendered prize is no longer available: atlantic-coast-26",
    "The prize is no longer alongside for transfer."
  );
  assert.equal(restoreFailedSurrenderedShipCapture(session, error), true);
  assert.equal(session.nodeId, "capture-confirm");
  assert.equal(session.feedback, "The prize is no longer alongside for transfer.");
  assert.equal(
    playerFacingSurrenderedShipCaptureFailure(new Error("Failed to fetch ship assets")),
    "Could not ready the prize vessel. Try again when the hold is prepared."
  );
});
