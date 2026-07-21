import assert from "node:assert/strict";
import test from "node:test";

import { shipFlagLayout } from "./shipFlagLayout.js";

test("ship flag anchor is the pole base rather than the flag top-left", () => {
  const layout = shipFlagLayout({
    anchorX: 23,
    anchorY: 17,
    poleHeight: 10,
    flagWidth: 10,
    flagHeight: 6
  });
  assert.deepEqual(layout, {
    pole: { x: 23, y: 8, w: 1, h: 10 },
    flag: { x: 24, y: 8, w: 10, h: 6 }
  });
  assert.equal(layout.pole.y + layout.pole.h - 1, 17);
});

test("ship flag layout rejects fractional or non-positive geometry", () => {
  assert.throws(
    () => shipFlagLayout({ anchorX: 2.5, anchorY: 4, poleHeight: 10, flagWidth: 10, flagHeight: 6 }),
    /anchorX must be an integer/
  );
  assert.throws(
    () => shipFlagLayout({ anchorX: 2, anchorY: 4, poleHeight: 0, flagWidth: 10, flagHeight: 6 }),
    /poleHeight must be a positive integer/
  );
});
