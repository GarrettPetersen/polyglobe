import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { productionSafetyFindings } from "../tools/check-production-safety.mjs";

test("production safety analysis rejects unsafe references, control flow, and promises", (t) => {
  const directory = temporarySourceDirectory(t);
  const helperPath = writeSource(directory, "helper.js", "export const existingName = 1;\n");
  const subjectPath = writeSource(directory, "subject.js", [
    'import { missingExport } from "./helper.js";',
    "async function unattended() { return 1; }",
    "export function incomplete(flag) { if (flag) return 1; }",
    "export function unsafe(flag, value) {",
    "  if (flag) return missingExport + neverDeclared;",
    "  switch (value) {",
    "    case 1:",
    "      value += 1;",
    "    case 1:",
    "      break;",
    "  }",
    "  value = value;",
    "  unattended();",
    "}",
    ""
  ].join("\n"));

  const codes = findingCodes(productionSafetyFindings([helperPath, subjectPath]));
  for (const code of [
    "TS2305",
    "TS2304",
    "TS7029",
    "TS7030",
    "duplicate-switch-case",
    "self-assignment",
    "floating-promise"
  ]) {
    assert.ok(codes.has(code), `expected ${code}`);
  }
});

test("production safety analysis rejects unreachable code and duplicate object keys", (t) => {
  const directory = temporarySourceDirectory(t);
  const subjectPath = writeSource(directory, "subject.js", [
    "export function broken() {",
    "  return { value: 1, value: 2 };",
    "  console.log('unreachable');",
    "}",
    ""
  ].join("\n"));

  const codes = findingCodes(productionSafetyFindings([subjectPath]));
  assert.ok(codes.has("TS1117"));
  assert.ok(codes.has("TS7027"));
});

test("production safety analysis rejects static import cycles", (t) => {
  const directory = temporarySourceDirectory(t);
  const firstPath = writeSource(directory, "first.js", [
    'import { second } from "./second.js";',
    "export const first = second + 1;",
    ""
  ].join("\n"));
  const secondPath = writeSource(directory, "second.js", [
    'import { first } from "./first.js";',
    "export const second = first + 1;",
    ""
  ].join("\n"));

  const findings = productionSafetyFindings([firstPath, secondPath]);
  assert.ok(findings.some((finding) => finding.code === "static-import-cycle"));
});

test("production safety analysis accepts handled promises and acyclic imports", (t) => {
  const directory = temporarySourceDirectory(t);
  const helperPath = writeSource(directory, "helper.js", [
    "export async function work() { return 1; }",
    ""
  ].join("\n"));
  const subjectPath = writeSource(directory, "subject.js", [
    'import { work } from "./helper.js";',
    "export async function safe() {",
    "  await work();",
    "  work().catch(() => {});",
    "  return work();",
    "}",
    ""
  ].join("\n"));

  assert.deepEqual(productionSafetyFindings([helperPath, subjectPath]), []);
});

function temporarySourceDirectory(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "pixel-globe-production-safety-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}

function writeSource(directory, name, source) {
  const filePath = path.join(directory, name);
  fs.writeFileSync(filePath, source);
  return filePath;
}

function findingCodes(findings) {
  return new Set(findings.map((finding) => finding.code));
}
