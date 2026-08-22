import assert from "node:assert/strict";
import test from "node:test";

import { adoptDietResolution } from "./imperialConstitution.js";
import { captureCapitalPoliticalContext } from "./captureCommissionDialogue.js";
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

test("Imperial war-secretary dialogue speaks from the present constitutional order", () => {
  const freeCity = captureCapitalPoliticalContext("france", "augsburg");
  const princeBishopric = captureCapitalPoliticalContext("france", "mainz");
  const principality = captureCapitalPoliticalContext("france", "bohemia");

  assert.match(freeCity, /council.*city keys.*speaks for itself before Emperor and Diet/i);
  assert.match(princeBishopric, /prince and cathedral chapter.*seals.*Emperor and Diet/i);
  assert.match(principality, /ruler.*Estate's levy.*answers for its quarrels/i);
  for (const line of [freeCity, princeBishopric, principality]) {
    assert.doesNotMatch(line, /modern|nation-state|will become|in later years|foreign policy/i);
  }
});
