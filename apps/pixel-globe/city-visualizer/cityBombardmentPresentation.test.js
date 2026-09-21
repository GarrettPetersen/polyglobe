import assert from "node:assert/strict";
import test from "node:test";
import {
  burningCityBombardmentSpecs,
  cityBombardmentEffectGeometry
} from "./cityBombardmentEffects.js";

test("assault foundations never enter burning-building fire or smoke geometry", () => {
  const burning = { burning: true, damage: { edge: "top", holeBounds: { x: 2, y: 2, width: 5, height: 5 } },
    frame: { frame: { w: 20, h: 20 } }, seed: 1 };
  const foundation = { burning: false, damage: { hole: new Uint8Array(400), rim: new Uint8Array(400) },
    frame: { frame: { w: 20, h: 20 } }, seed: 2 };
  const destination = { x: 0, y: 0, width: 20, height: 20 };
  let effects = 0;
  const specs = [burning, burning, burning, foundation].map((presentation) => ({
    presentation,
    ...destination,
    depth: 0.5,
    parallaxAnchor: 0
  }));
  for (const { presentation, ...destination } of burningCityBombardmentSpecs(specs)) {
    cityBombardmentEffectGeometry({ damage: presentation.damage, destination,
      sourceWidth: presentation.frame.frame.w, sourceHeight: presentation.frame.frame.h,
      seed: presentation.seed });
    effects++;
  }
  assert.equal(effects, 3, "authored and both background banks still burn");
  assert.throws(
    () => burningCityBombardmentSpecs([{ presentation: {} }]),
    /presentation spec/
  );
});
