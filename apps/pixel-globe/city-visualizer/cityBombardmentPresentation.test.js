import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { cityBombardmentEffectGeometry } from "./cityBombardmentEffects.js";

test("assault foundations never enter burning-building fire or smoke geometry", () => {
  const source = readFileSync(new URL("./main.js", import.meta.url), "utf8");
  const start = source.indexOf("function forEachBombardmentPresentation(");
  const end = source.indexOf("\nfunction ", start + 1);
  assert.ok(start >= 0 && end > start);
  const burning = { burning: true, damage: { edge: "top", holeBounds: { x: 2, y: 2, width: 5, height: 5 } },
    frame: { frame: { w: 20, h: 20 } }, seed: 1 };
  const foundation = { burning: false, damage: { hole: new Uint8Array(400), rim: new Uint8Array(400) },
    frame: { frame: { w: 20, h: 20 } }, seed: 2 };
  const destination = { x: 0, y: 0, width: 20, height: 20 };
  const context = vm.createContext({
    state: { features: { leftBankCity: true }, staticAtlas: {}, streetBuildings: [{ id: "inn", frame: {},
      layerName: "Inn", x: 0, y: 0, width: 20, height: 20 }] },
    visitAuthoredBombardmentPresentations: (visit) => { visit(burning, destination); visit(null, destination); },
    visitBackgroundCityBombardmentPresentations: (_side, visit) => visit(burning, destination),
    cityStreetBombardmentPresentation: () => foundation,
    regionalStaticFrame: () => null,
    sceneWindow: () => ({ x: 0, y: 0 })
  });
  vm.runInContext(source.slice(start, end), context);
  let effects = 0;
  context.forEachBombardmentPresentation((presentation, destination) => {
    cityBombardmentEffectGeometry({ damage: presentation.damage, destination,
      sourceWidth: presentation.frame.frame.w, sourceHeight: presentation.frame.frame.h, seed: presentation.seed });
    effects++;
  });
  assert.equal(effects, 3, "authored and both background banks still burn");
});
