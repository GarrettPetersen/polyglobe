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
  return node;
}

test("capture assaults run on the same uninterrupted timeline as ordinary gameplay", () => {
  const updateSource = declaration("updateCapturePillage").getText(source);
  assert.match(updateSource, /attemptPlayerPortConquest\(cityCall/);
  assert.match(updateSource, /naturalTimeline: true/);
  assert.match(updateSource, /battleDurationMs: portAssaultState\.battle\.durationMs/);
  assert.doesNotMatch(updateSource, /startedAtMs\s*=/);
  assert.doesNotMatch(updateSource, /setAssaultPresentation/);
  assert.doesNotMatch(updateSource, /stageCapturePortAssaultPhase/);
});

test("ordinary port-assault presentation uses real elapsed time", () => {
  const updateSource = declaration("updatePortAssault").getText(source);
  assert.match(updateSource, /const elapsedMs = portAssaultElapsedMs\(nowMs\);/);
  assert.doesNotMatch(updateSource, /capturePortAssaultElapsedMs/);
  assert.equal(
    source.statements.some((statement) => (
      ts.isFunctionDeclaration(statement) &&
      statement.name?.text === "stageCapturePortAssaultPhase"
    )),
    false
  );
});
