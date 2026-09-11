const assert = require("node:assert/strict");
const test = require("node:test");
const { mkdtemp, rm, writeFile } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { join } = require("node:path");

const { startStaticServer } = require("./staticServer.cjs");

test("desktop assets are immutable and browser-cached for the app session", async () => {
  const root = await mkdtemp(join(tmpdir(), "marque-static-server-"));
  const server = await startStaticServer(root);
  try {
    await writeFile(join(root, "index.html"), "desktop game");
    const response = await fetch(server.url);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "public, max-age=31536000, immutable");
    assert.equal(await response.text(), "desktop game");
    await writeFile(join(root, "steam.svg"), '<svg xmlns="http://www.w3.org/2000/svg"/>');
    const logo = await fetch(`${server.url}steam.svg`);
    assert.equal(logo.status, 200);
    assert.equal(logo.headers.get("content-type"), "image/svg+xml");
  } finally {
    await server.close();
    await rm(root, { recursive: true, force: true });
  }
});
