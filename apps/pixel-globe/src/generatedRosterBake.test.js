import assert from "node:assert/strict";
import test from "node:test";
import {
  mergeGeneratedRosterEntries,
  mergeGeneratedRosterMap
} from "./generatedRosterBake.js";

test("partial fleet stages preserve untouched roster manifest entries", () => {
  const existing = {
    ships: [
      { slug: "cog", version: "old" },
      { slug: "galleon", version: "old" },
      { slug: "retired", version: "stale" }
    ]
  };
  assert.deepEqual(
    mergeGeneratedRosterEntries(
      existing,
      [{ slug: "cog", version: "new" }],
      ["cog", "galleon"],
      "Fleet manifest"
    ),
    [
      { slug: "cog", version: "new" },
      { slug: "galleon", version: "old" }
    ]
  );
});

test("partial fleet stages preserve untouched keyed bakes and prune retired ships", () => {
  const existing = { ships: { cog: "old-cog", galleon: "old-galleon", retired: "stale" } };
  assert.deepEqual(
    mergeGeneratedRosterMap(
      existing,
      [["cog", "new-cog"]],
      ["cog", "galleon"],
      "Wake anchors"
    ),
    { cog: "new-cog", galleon: "old-galleon" }
  );
});

test("generated roster merges reject malformed manifests instead of hiding them", () => {
  assert.throws(
    () => mergeGeneratedRosterEntries(
      { ships: [{ slug: "cog" }, { slug: "cog" }] },
      [],
      ["cog"],
      "Fleet manifest"
    ),
    /duplicate ship cog/
  );
  assert.throws(
    () => mergeGeneratedRosterMap({ ships: [] }, [], ["cog"], "Wake anchors"),
    /ships object/
  );
});
