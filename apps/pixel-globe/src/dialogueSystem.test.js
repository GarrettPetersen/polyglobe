import assert from "node:assert/strict";
import test from "node:test";

import {
  createShipDialogueSession,
  selectShipDialogueOption,
  shipDialogueView
} from "./dialogueSystem.js";

test("hailing an NPC ship opens a minimal captain dialogue", () => {
  const ship = { id: "mediterranean-4", label: "Xebec" };
  const session = createShipDialogueSession(ship);
  const view = shipDialogueView(session, ship);

  assert.equal(session.kind, "ship");
  assert.equal(view.speaker, "Xebec captain");
  assert.equal(view.text, "Ahoy matey.");
  assert.deepEqual(view.options.map((option) => option.label), ["Leave"]);
  assert.deepEqual(selectShipDialogueOption(session, ship, 0), { closed: true });
});

test("ship dialogue rejects a different NPC ship", () => {
  const session = createShipDialogueSession({ id: "ship-a" });
  assert.throws(
    () => shipDialogueView(session, { id: "ship-b", label: "Caravel" }),
    /does not match/
  );
});
