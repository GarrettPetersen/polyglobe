import assert from "node:assert/strict";
import test from "node:test";

import { adoptDietResolution } from "./imperialConstitution.js";
import { createGameState, privateeringAuthorityIssuerIdsAgainst } from "./gameState.js";
import { createPoliticsView } from "./politics.js";

const SUPPORTERS = ["mainz", "cologne-electorate", "trier", "palatinate", "bohemia", "electoral-saxony"];

test("a Habsburg marque does not authorize attacks on an Imperial Estate without public law", () => {
  const state = createGameState({ cargoCapacity: 20 });
  state.relations.lettersOfMarque.habsburg = {
    factionId: "habsburg",
    simMinute: 0
  };
  assert.deepEqual(privateeringAuthorityIssuerIdsAgainst(state, "augsburg"), []);

  adoptDietResolution(state.relations.imperial, {
    kind: "imperial-ban",
    sponsorFactionId: "habsburg",
    targetFactionId: "augsburg",
    supportingFactionIds: SUPPORTERS,
    simMinute: 1
  });
  state.survival.lastMinute = 1;
  assert.deepEqual(privateeringAuthorityIssuerIdsAgainst(state, "augsburg"), ["habsburg"]);
});

test("politics exposes the Emperor, electors, balance, resolutions, and Estate badges", () => {
  const state = createGameState({ cargoCapacity: 20 });
  const view = createPoliticsView(state);
  assert.equal(view.imperial.emperorFactionId, "habsburg");
  assert.equal(view.imperial.emperorRuler.imperialDisplayName, "Emperor Charles V");
  assert.equal(view.imperial.electors.length, 7);
  assert.equal(view.imperial.activeBans.length, 0);
  assert.equal(view.cards.find((card) => card.faction.id === "mainz").imperialMembership.badge, "E");
  assert.equal(view.cards.find((card) => card.faction.id === "augsburg").imperialMembership.badge, "I");
  assert.equal(view.cards.find((card) => card.faction.id === "france").imperialMembership, null);
});
