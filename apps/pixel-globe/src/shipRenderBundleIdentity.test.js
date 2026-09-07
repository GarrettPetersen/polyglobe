import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
test("published ship-layer bundle URLs identify their exact contents across deployments", async () => {
  const root = new URL("../public/assets/vehicles/ship-render-layers/", import.meta.url);
  const manifest = JSON.parse(await readFile(new URL("manifest.json", root), "utf8"));
  for (const [name, metadata] of Object.entries(manifest.bundles)) {
    const bytes = await readFile(new URL(name, root));
    assert.equal(name, `ship-render-layers-${createHash("sha256").update(bytes).digest("hex")}.bin`);
    assert.equal(bytes.length, metadata.byteLength);
  }
});
