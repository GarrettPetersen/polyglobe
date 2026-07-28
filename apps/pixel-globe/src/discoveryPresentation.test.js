import assert from "node:assert/strict";
import test from "node:test";

import {
  discoveryEntryPlaceholderColor,
  discoveryKindColor
} from "./discoveryPresentation.js";

test("streaming animal portraits use an animal placeholder without a wonder kind", () => {
  assert.equal(discoveryEntryPlaceholderColor("animals", undefined), "#6aa6a1");
});

test("wonder placeholders retain their discovery-specific colors", () => {
  assert.equal(discoveryEntryPlaceholderColor("wonders", "mountain"), "#aaa3b8");
  assert.equal(discoveryEntryPlaceholderColor("wonders", "landmark"), "#d6a84f");
  assert.equal(discoveryEntryPlaceholderColor("wonders", "legend"), "#f04f78");
  assert.equal(discoveryEntryPlaceholderColor("wonders", "achievement"), "#6aa6a1");
});

test("invalid wonder kinds and discoveries tabs still fail loudly", () => {
  assert.throws(() => discoveryKindColor(undefined), /Unknown discovery kind/);
  assert.throws(() => discoveryEntryPlaceholderColor("wonders", undefined), /Unknown discovery kind/);
  assert.throws(() => discoveryEntryPlaceholderColor("rumors", "landmark"), /Unknown discoveries tab/);
});
