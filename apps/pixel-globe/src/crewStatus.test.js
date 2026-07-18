import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { crewStatusLayout } from "./crewStatus.js";

test("crew status leaves one pixel between people when room permits", () => {
  const layout = crewStatusLayout({ crewCount: 3, x: 10, y: 20, width: 20 });

  assert.equal(layout.pitch, 4);
  assert.deepEqual(layout.entries.map((entry) => [entry.x, entry.y, entry.variant]), [
    [10, 20, 0],
    [14, 20, 0],
    [18, 20, 0]
  ]);
});

test("large crews overlap by whole pixels and alternate shades", () => {
  const layout = crewStatusLayout({ crewCount: 89, x: 5, y: 44, width: 110 });

  assert.equal(layout.pitch, 1);
  assert.equal(layout.entries.at(-1).x, 93);
  assert.deepEqual(layout.entries.slice(0, 4).map((entry) => entry.variant), [0, 1, 0, 1]);
});

test("travelers follow the crew with their semantic kind", () => {
  const layout = crewStatusLayout({
    crewCount: 2,
    travelerGroups: [
      { kind: "envoy", count: 1 },
      { kind: "settler", count: 2 }
    ],
    x: 0,
    y: 0,
    width: 30
  });

  assert.deepEqual(layout.entries.map((entry) => entry.kind), [
    "crew", "crew", "envoy", "settler", "settler"
  ]);
});

test("very large crews share integer columns without leaving the row", () => {
  const layout = crewStatusLayout({ crewCount: 120, x: 10, y: 20, width: 90 });

  assert.ok(layout.pitch < 1);
  assert.equal(layout.entries.length, 120);
  assert.equal(layout.entries[0].x, 10);
  assert.equal(layout.entries.at(-1).x, 97);
  assert.ok(layout.entries.every((entry) => Number.isInteger(entry.x)));
});

test("crew deaths use the normalized credited sound effect", async () => {
  const bytes = await readFile(
    new URL("../public/assets/sfx/universfield-dramatic-death-collapse-352720.ogg", import.meta.url)
  );
  assert.equal(bytes.subarray(0, 4).toString("ascii"), "OggS");
  assert.ok(bytes.length > 1000);

  const credits = await readFile(new URL("../public/assets/CREDITS.md", import.meta.url), "utf8");
  assert.match(credits, /Universfield - "Dramatic Death Collapse" \(Pixabay 352720/i);
});
