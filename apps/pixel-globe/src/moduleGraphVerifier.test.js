import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  assertExactModuleGraph,
  moduleDependencySpecifiers,
  verifyLocalModuleGraph,
  verifyRemoteModuleGraph
} from "../tools/moduleGraphVerifier.mjs";

test("module graph scanning includes static, dynamic, and worker dependencies", () => {
  const dependencies = moduleDependencySpecifiers(`
    import { value } from "./static.js";
    export { other } from "./exported.js";
    const lazy = import("./dynamic.js");
    const worker = new Worker(new URL("./worker.js", import.meta.url), { type: "module" });
    const delegatedWorkerUrl = new URL("./delegated-worker.js", import.meta.url);
  `);

  assert.deepEqual([...dependencies].sort(), [
    "./delegated-worker.js",
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
    assert.deepEqual(result.moduleIds, ["src/bootstrap.js", "vendor/dependency.js"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("exact module graph rejects an unbundled runtime dependency", () => {
  assert.throws(
    () => assertExactModuleGraph({
      modulesChecked: 3,
      moduleIds: ["src/bootstrap.js", "src/main.js", "src/chartReframeCover.js"]
    }, ["src/bootstrap.js", "src/main.js"]),
    /not atomic.*Unexpected modules: src\/chartReframeCover\.js/s
  );
});

test("remote verification rejects a revision-marked entry with an expanded module graph", async (t) => {
  const revision = "atomic-test-revision";
  let bootstrapSource = [
    `const BUILD_REVISION = ${JSON.stringify(revision)};`,
    'import "./chartReframeCover.js";'
  ].join("\n");
  const server = createServer((request, response) => {
    response.setHeader("content-type", "application/javascript");
    if (request.url === "/src/buildEdition.js") {
      response.end(`export const BUILD_REVISION = ${JSON.stringify(revision)};\n`);
      return;
    }
    if (request.url === "/src/bootstrap.js") {
      response.end(bootstrapSource);
      return;
    }
    if (request.url === "/src/chartReframeCover.js") {
      response.end("export {};\n");
      return;
    }
    response.statusCode = 404;
    response.end("missing");
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const address = server.address();
  assert(address && typeof address === "object");
  const verification = {
    baseUrl: `http://127.0.0.1:${address.port}/`,
    entryPaths: ["src/bootstrap.js"],
    expectedRevision: revision,
    exactModuleIds: ["src/bootstrap.js"]
  };

  await assert.rejects(
    verifyRemoteModuleGraph(verification),
    /not atomic.*Unexpected modules: src\/chartReframeCover\.js/s
  );

  bootstrapSource = `const BUILD_REVISION = ${JSON.stringify(revision)};\n`;
  const result = await verifyRemoteModuleGraph(verification);
  assert.deepEqual(result.moduleIds, ["src/bootstrap.js"]);
});
