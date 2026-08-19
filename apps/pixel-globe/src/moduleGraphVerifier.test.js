import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  moduleDependencySpecifiers,
  verifyLocalModuleGraph
} from "../tools/moduleGraphVerifier.mjs";

test("module graph scanning includes static, dynamic, and worker dependencies", () => {
  const dependencies = moduleDependencySpecifiers(`
    import { value } from "./static.js";
    export { other } from "./exported.js";
    const lazy = import("./dynamic.js");
    const worker = new Worker(new URL("./worker.js", import.meta.url), { type: "module" });
  `);

  assert.deepEqual([...dependencies].sort(), [
    "./dynamic.js",
    "./exported.js",
    "./static.js",
    "./worker.js"
  ]);
});

test("local module graph rejects deployment-excluded node_modules imports", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "pixel-globe-module-graph-"));
  try {
    await mkdir(path.join(root, "src"));
    await mkdir(path.join(root, "node_modules", "dependency"), { recursive: true });
    await writeFile(
      path.join(root, "src", "bootstrap.js"),
      'import "../node_modules/dependency/browser.js";\n'
    );
    await writeFile(path.join(root, "node_modules", "dependency", "browser.js"), "export {};\n");

    await assert.rejects(
      verifyLocalModuleGraph({ rootDirectory: root, entryPaths: ["src/bootstrap.js"] }),
      /deployment-excluded path/
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("local module graph accepts an explicit deployable vendor module", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "pixel-globe-module-graph-"));
  try {
    await mkdir(path.join(root, "src"));
    await mkdir(path.join(root, "vendor"));
    await writeFile(
      path.join(root, "src", "bootstrap.js"),
      'import "../vendor/dependency.js";\n'
    );
    await writeFile(path.join(root, "vendor", "dependency.js"), "export {};\n");

    const result = await verifyLocalModuleGraph({
      rootDirectory: root,
      entryPaths: ["src/bootstrap.js"]
    });
    assert.equal(result.modulesChecked, 2);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
