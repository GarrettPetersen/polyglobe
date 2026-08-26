import assert from "node:assert/strict";
import test from "node:test";

import {
  assertUniqueCharacterIdentities,
  characterIdentityConflict,
  conflictingCharacterIdentity
} from "./characterIdentity.js";

const veteran = Object.freeze({
  id: "crew-brites",
  sourceId: "women-knight-006",
  name: "Brites Pereira"
});

test("character identity conflicts detect repeated ids, portraits, and full names", () => {
  assert.equal(characterIdentityConflict(veteran, {
    id: veteran.id,
    sourceId: "merchant-woman-002",
    name: "Ines Costa"
  }), "id");
  assert.equal(characterIdentityConflict(veteran, {
    id: "captive-2",
    sourceId: veteran.sourceId,
    name: "Ines Costa"
  }), "portrait");
  assert.equal(characterIdentityConflict(veteran, {
    id: "captive-2",
    sourceId: "merchant-woman-002",
    name: "  BRITES PEREIRA  "
  }), "name");
});

test("an active traveler can be checked against the permanent roster", () => {
  const conflict = conflictingCharacterIdentity({
    id: veteran.id,
    sourceId: veteran.sourceId,
    name: "Brites da Costa"
  }, [veteran]);
  assert.equal(conflict.reason, "id");
  assert.equal(conflict.character, veteran);
});

test("unique character roster validation fails loudly on visual doubles", () => {
  assert.throws(() => assertUniqueCharacterIdentities([
    veteran,
    { id: "other", sourceId: veteran.sourceId, name: "Ines Costa" }
  ], "Aboard roster"), /Aboard roster repeats portrait/);
});
