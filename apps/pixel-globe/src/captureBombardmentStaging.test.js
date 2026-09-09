import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = ts.createSourceFile(
  "main.js",
  readFileSync(new URL("./main.js", import.meta.url), "utf8"),
  ts.ScriptTarget.Latest,
  true
);

function declaration(name) {
  const node = source.statements.find((statement) => (
    ts.isFunctionDeclaration(statement) && statement.name?.text === name
  ));
  assert.ok(node, `Missing function ${name}`);
  return node.getText(source);
}

test("bombardment capture begins at its declared battery health", () => {
  const stageSource = declaration("stageCapturePillage");
  assert.match(stageSource, /battery\.hitPoints = sequence\.batteryStartingHitPoints/);
  assert.match(stageSource, /batteryStartingHitPoints > battery\.maxHitPoints/);
});

test("bombardment capture requires the real volley to disable the battery", () => {
  const updateSource = declaration("updateCapturePillage");
  assert.match(updateSource, /shoreBatteryIsDisabled\(battery/);
  assert.match(updateSource, /battery-disabled-by-player-volley/);
  assert.doesNotMatch(updateSource, /damageShoreBattery\(/);
});
