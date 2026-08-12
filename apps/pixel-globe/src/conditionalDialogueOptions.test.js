import assert from "node:assert/strict";
import test from "node:test";

import {
  availableDialogueOptions,
  conditionalDialogueOption,
  dialogueOption
} from "./conditionalDialogueOptions.js";

const action = () => {};

test("conditional dialogue options include available equipment choices with icons", () => {
  const options = availableDialogueOptions([
    dialogueOption({ label: "Do nothing", onSelect: action }),
    dialogueOption({ label: "Confront", onSelect: action }),
    conditionalDialogueOption(true, {
      label: "Confront with katana",
      iconId: "item:katana",
      onSelect: action
    })
  ]);
  assert.equal(options.length, 3);
  assert.equal(options[2].iconId, "item:katana");
});

test("conditional dialogue options omit unavailable branches", () => {
  const options = availableDialogueOptions([
    dialogueOption({ label: "Do nothing", onSelect: action }),
    dialogueOption({ label: "Confront", onSelect: action }),
    conditionalDialogueOption(false, {
      label: "Confront with katana",
      iconId: "item:katana",
      onSelect: action
    })
  ]);
  assert.deepEqual(options.map((entry) => entry.label), ["Do nothing", "Confront"]);
});
