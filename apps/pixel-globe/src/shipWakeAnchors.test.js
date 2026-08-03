import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  SHIP_SPRITE_FRAME_SIZE,
  SHIP_SPRITE_HEADINGS
} from "./shipSpriteLayout.js";
import {
  alignHorizontalShipWakeShoulders,
  shipWakeAnchorMaxOffset,
  validateShipWakeAnchors
} from "./shipWakeAnchors.js";

const wakeBakeUrl = new URL(
  "../public/assets/vehicles/unity-ships/wake-anchors.json",
  import.meta.url
);

test("horizontal wake alignment stays inside the sprite frame", () => {
  const aligned = alignHorizontalShipWakeShoulders({
    stern: { x: -14, y: 13 },
    positiveShoulder: { x: 5, y: 14 },
    negativeShoulder: { x: 5, y: -14 }
  }, { x: 1, y: 0 }, SHIP_SPRITE_FRAME_SIZE);

  assert.deepEqual(aligned, {
    stern: { x: -14, y: 13 },
    positiveShoulder: { x: 5, y: 25 },
    negativeShoulder: { x: 5, y: -3 }
  });
});

test("wake validation rejects points beyond the usable frame", () => {
  const anchors = Array.from({ length: SHIP_SPRITE_HEADINGS }, () => ({
    stern: { x: 0, y: 0 },
    positiveShoulder: { x: 0, y: 0 },
    negativeShoulder: { x: 0, y: 0 }
  }));
  anchors[0].positiveShoulder.y = shipWakeAnchorMaxOffset(SHIP_SPRITE_FRAME_SIZE) + 1;

  assert.throws(
    () => validateShipWakeAnchors(
      "test-ship",
      anchors,
      SHIP_SPRITE_HEADINGS,
      SHIP_SPRITE_FRAME_SIZE
    ),
    /positive shoulder wake point is outside the sprite/
  );
});

test("every production wake bake is valid before startup", async () => {
  const bake = JSON.parse(await readFile(wakeBakeUrl, "utf8"));
  for (const [slug, anchors] of Object.entries(bake.ships)) {
    assert.equal(
      validateShipWakeAnchors(slug, anchors, bake.headings, bake.frameSize).length,
      SHIP_SPRITE_HEADINGS,
      slug
    );
  }
});
