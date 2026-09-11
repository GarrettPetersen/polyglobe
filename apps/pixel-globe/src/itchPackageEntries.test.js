import assert from "node:assert/strict";
import test from "node:test";
import { combinedItchCredits, itchArchiveEntryCount } from "../tools/itchPackageEntries.mjs";

test("itch counts unique parent directories as well as files reconstructed by Butler", () => {
  assert.equal(itchArchiveEntryCount([]), 0);
  assert.equal(itchArchiveEntryCount(["index.html"]), 1);
  assert.equal(itchArchiveEntryCount(["assets/a.png", "assets/b.png", "assets/fonts/a.ttf"]), 5);
  const paths = Array.from({ length: 962 }, (_, index) => `dir${index % 42}/file${index}.js`);
  assert.equal(itchArchiveEntryCount(paths), 1004);
});

test("consolidated itch credits preserve every attribution notice verbatim", () => {
  const notices = [
    { relativePath: "assets/licenses/first.txt", source: "First attribution\nLicense terms." },
    { relativePath: "assets/licenses/second.txt", source: "Second attribution\nAll rights reserved." }
  ];
  const result = combinedItchCredits("Original credits", notices);
  assert.ok(result.startsWith("Original credits"));
  for (const notice of notices) {
    assert.ok(result.includes(notice.relativePath));
    assert.ok(result.includes(notice.source));
  }
});
