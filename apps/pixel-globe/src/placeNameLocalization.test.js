import assert from "node:assert/strict";
import test from "node:test";

import { localizePlaceName, localizePlaceNames } from "./placeNameLocalization.js";

test("navigation text uses established localized place names", () => {
  assert.equal(localizePlaceName("zh-Hans", "Wroclaw"), "弗罗茨瓦夫");
  assert.equal(localizePlaceName("zh-Hans", "Hafnarfjordur"), "哈布纳菲厄泽");
  assert.equal(
    localizePlaceNames("zh-Hans", "驶往Wroclaw；返回Hafnarfjordur"),
    "驶往弗罗茨瓦夫；返回哈布纳菲厄泽"
  );
  assert.equal(localizePlaceNames("ja", "Sail from Lisbon to Venice"), "Sail from リスボン to ヴェネツィア");
  assert.equal(localizePlaceNames("es", "Sail from London to Seville"), "Sail from Londres to Sevilla");
});

test("unknown and player-created place names retain their canonical spelling", () => {
  assert.equal(localizePlaceName("zh-Hans", "New Garrettsburg"), "New Garrettsburg");
  assert.equal(localizePlaceNames("zh-Hans", "Sail to New Garrettsburg"), "Sail to New Garrettsburg");
  assert.equal(localizePlaceNames("en", "Sail from Wroclaw to Hafnarfjordur"), "Sail from Wroclaw to Hafnarfjordur");
});

test("place replacement respects word boundaries", () => {
  assert.equal(localizePlaceNames("zh-Hans", "Londoners left for Porto"), "Londoners left for 波尔图");
  assert.throws(() => localizePlaceName("zh-Hans", ""), /non-empty string/);
});
