import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { staticReferenceDiagnostics } from "../tools/check-static-references.mjs";

test("static reference analysis rejects undeclared names and invalid named imports", (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "pixel-globe-static-references-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const helperPath = path.join(directory, "helper.js");
  const subjectPath = path.join(directory, "subject.js");
  fs.writeFileSync(helperPath, "export const existingName = 1;\n");
  fs.writeFileSync(subjectPath, [
    'import { missingExport } from "./helper.js";',
    "export const first = missingExport;",
    "export const second = neverDeclared;",
    ""
  ].join("\n"));

  const diagnostics = staticReferenceDiagnostics([helperPath, subjectPath]);
  assert.ok(diagnostics.some((diagnostic) => diagnostic.code === 2305));
  assert.ok(diagnostics.some((diagnostic) => (
    [2304, 2552].includes(diagnostic.code) &&
    String(diagnostic.messageText).includes("neverDeclared")
  )));
});
