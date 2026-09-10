import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = ts.createSourceFile("main.js", readFileSync(new URL("./main.js", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true);
const handler = source.statements.find(node => ts.isFunctionDeclaration(node) && node.name.text === "handlePointerDown");
const waypointBranch = handler.body.statements.find(node => ts.isIfStatement(node) && node.getText(source).includes("const waypoint = waypointArrowAtPoint(point)"));
assert.ok(waypointBranch, "Pointer handler must handle waypoint labels");

test("pressing a waypoint arrow shows its label and continues into sailing input", () => {
  for (const previous of [null, "quest-1"]) {
    const context = { dialogueState: null, selectedWaypointArrowId: previous, dirty: false,
      point: { x: 10, y: 10 }, waypointArrowAtPoint: () => ({ id: "quest-1" }),
      event: { preventDefault() {} }, steered: false };
    runInNewContext(`function press() { ${waypointBranch.getText(source)}; steered = true; } press();`, context);
    assert.equal(context.steered, true);
    assert.equal(context.selectedWaypointArrowId, previous === null ? "quest-1" : null);
  }
});
