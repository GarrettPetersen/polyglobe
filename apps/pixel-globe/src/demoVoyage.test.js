import assert from "node:assert/strict";
import test from "node:test";

import {
  BUILD_EDITION_ID
} from "./buildEdition.js";
import {
  DEMO_SHIP_LOCK_ICON_ID,
  DEMO_SHIP_LOCK_MESSAGE,
  assertShipAcquisitionAvailable,
  demoShipAcquisitionRestriction,
  startMenuEditionLabel
} from "./demoVoyage.js";

test("the checked-in source remains the full edition", () => {
  assert.equal(BUILD_EDITION_ID, "full");
  assert.equal(startMenuEditionLabel(BUILD_EDITION_ID), null);
});

test("only the demo build labels itself on the start menu", () => {
  assert.equal(startMenuEditionLabel("demo"), "DEMO");
  assert.throws(() => startMenuEditionLabel("preview"), /Unknown build edition/);
});

test("the demo locks replacement ships while the full game does not", () => {
  assert.equal(demoShipAcquisitionRestriction("full"), null);
  assert.deepEqual(demoShipAcquisitionRestriction("demo"), {
    detail: DEMO_SHIP_LOCK_MESSAGE,
    disabled: true,
    disabledReason: DEMO_SHIP_LOCK_MESSAGE,
    iconId: DEMO_SHIP_LOCK_ICON_ID
  });
  assert.throws(
    () => assertShipAcquisitionAvailable("demo"),
    new RegExp(DEMO_SHIP_LOCK_MESSAGE, "i")
  );
  assert.doesNotThrow(() => assertShipAcquisitionAvailable("full"));
});

test("demo ship restrictions reject malformed edition data", () => {
  assert.throws(() => demoShipAcquisitionRestriction("preview"), /Unknown build edition/);
  assert.throws(() => demoShipAcquisitionRestriction("demo", ""), /requires a message/);
});
