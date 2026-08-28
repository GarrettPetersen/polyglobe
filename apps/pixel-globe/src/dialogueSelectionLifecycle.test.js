import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  DIALOGUE_SELECTION_ACTIVE,
  DIALOGUE_SELECTION_ALREADY_CLOSED,
  DIALOGUE_SELECTION_HANDED_OFF,
  dialogueSelectionCompletion,
  dialogueSelectionHandoff
} from "./dialogueSelectionLifecycle.js";

const MAIN_SOURCE = readFileSync(new URL("./main.js", import.meta.url), "utf8");

test("a dialogue close may finish after its session has already been cleared", () => {
  const selected = { kind: "ship" };
  assert.equal(
    dialogueSelectionCompletion(selected, null, { closed: true }),
    DIALOGUE_SELECTION_ALREADY_CLOSED
  );
});

test("an active dialogue selection must retain the exact session it selected", () => {
  const selected = { kind: "ship" };
  assert.equal(
    dialogueSelectionCompletion(selected, selected, { closed: false }),
    DIALOGUE_SELECTION_ACTIVE
  );
  assert.throws(
    () => dialogueSelectionCompletion(selected, null, { closed: false }),
    /closed before its option completed/
  );
  assert.throws(
    () => dialogueSelectionCompletion(selected, { kind: "port" }, { closed: true }),
    /replaced before its option completed/
  );
});

test("a deliberate dialogue handoff requires a replacement session or modal overlay", () => {
  const selected = { kind: "ship" };
  assert.equal(
    dialogueSelectionHandoff(selected, { kind: "rescued-traveler" }),
    DIALOGUE_SELECTION_HANDED_OFF
  );
  assert.equal(
    dialogueSelectionHandoff(selected, selected, { overlayOpened: true }),
    DIALOGUE_SELECTION_HANDED_OFF
  );
  assert.equal(
    dialogueSelectionHandoff(selected, selected, { inPlaceSessionAdvanced: true }),
    DIALOGUE_SELECTION_HANDED_OFF
  );
  assert.throws(
    () => dialogueSelectionHandoff(selected, selected),
    /without a replacement session, advanced state, or overlay/
  );
  assert.throws(
    () => dialogueSelectionHandoff(selected, selected, { inPlaceSessionAdvanced: "yes" }),
    /in-place state must be boolean/
  );
});

test("accepting a damaged surrender recognizes an in-place prize transition", () => {
  assert.match(
    MAIN_SOURCE,
    /inPlaceSessionAdvanced:\s*dialogueState === selectedDialogueState &&\s*dialogueState\.nodeId !== "surrender-resolving"/
  );
});
