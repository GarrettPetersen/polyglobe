import assert from "node:assert/strict";
import test from "node:test";

import { buildDocumentTitle } from "./buildTitle.js";

test("document titles distinguish hosted and executable builds", () => {
  assert.equal(
    buildDocumentTitle({ edition: "full", platformId: "browser" }),
    "Marque & Reprisal | Online Prototype"
  );
  assert.equal(
    buildDocumentTitle({ edition: "demo", platformId: "browser" }),
    "Marque & Reprisal | Demo"
  );
  assert.equal(
    buildDocumentTitle({ edition: "full", platformId: "steam" }),
    "Marque & Reprisal"
  );
  assert.equal(
    buildDocumentTitle({ edition: "demo", platformId: "steam" }),
    "Marque & Reprisal Demo"
  );
});

test("document titles reject unknown build metadata", () => {
  assert.throws(
    () => buildDocumentTitle({ edition: "preview", platformId: "browser" }),
    /Unknown document title edition/
  );
  assert.throws(
    () => buildDocumentTitle({ edition: "full", platformId: "console" }),
    /Unknown document title platform/
  );
});
