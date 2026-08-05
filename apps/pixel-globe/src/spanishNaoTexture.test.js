import assert from "node:assert/strict";
import test from "node:test";

import {
  isSpanishNaoSailMesh,
  simplifySpanishNaoTextureColor
} from "./spanishNaoTexture.js";

test("every Spanish Nao sail name family is classified as sailcloth", () => {
  for (const sourceMeshName of [
    "Vela cuadra.001_Material_0",
    "Vela cebadera_Material_0",
    "VelaLatina_Material_0",
    "Gavia.003_Material_0"
  ]) {
    assert.equal(isSpanishNaoSailMesh(sourceMeshName), true);
    assert.deepEqual(
      simplifySpanishNaoTextureColor(
        { r: 71, g: 47, b: 31 },
        { sourceMeshName }
      ),
      { r: 226, g: 215, b: 177 }
    );
  }
});

test("Spanish Nao timber remains in the hull palette", () => {
  assert.equal(isSpanishNaoSailMesh("Palo mayor_Material_0"), false);
  assert.deepEqual(
    simplifySpanishNaoTextureColor(
      { r: 24, g: 15, b: 10 },
      { sourceMeshName: "Palo mayor_Material_0" }
    ),
    { r: 52, g: 34, b: 24 }
  );
});

test("Spanish Nao material classification fails without source identity", () => {
  assert.throws(
    () => simplifySpanishNaoTextureColor({ r: 71, g: 47, b: 31 }, {}),
    /requires a source mesh name/
  );
});
