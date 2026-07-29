const assert = require("node:assert/strict");
const { mkdtempSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");
const { test } = require("node:test");

const { FULL_GAME_APP_ID, resolveDesktopConfig } = require("./desktopConfig.cjs");

test("development defaults to the full game", () => {
  const appRoot = join(tmpdir(), "marque-development");
  const hostRoot = join(appRoot, "steam-host");
  const config = resolveDesktopConfig({ env: {}, hostRoot });

  assert.equal(config.appId, FULL_GAME_APP_ID);
  assert.equal(config.edition, "full");
  assert.equal(config.gameRoot, join(appRoot, "dist"));
  assert.equal(config.inputManifest, join(appRoot, "steam-input/game_actions.vdf"));
});

test("packaged demo uses Steam's launch App ID", (context) => {
  const resourcesPath = temporaryResources(context);
  writeFileSync(
    join(resourcesPath, "steam-build.json"),
    JSON.stringify({ edition: "demo", gameDirectory: "dist-demo" })
  );

  const config = resolveDesktopConfig({
    env: { SteamAppId: "123456" },
    isPackaged: true,
    resourcesPath
  });

  assert.equal(config.appId, 123456);
  assert.equal(config.edition, "demo");
  assert.equal(config.gameRoot, join(resourcesPath, "dist-demo"));
  assert.equal(config.inputManifest, join(resourcesPath, "steam-input/game_actions.vdf"));
});

test("demo fails clearly when it has no App ID", (context) => {
  const resourcesPath = temporaryResources(context);
  writeFileSync(
    join(resourcesPath, "steam-build.json"),
    JSON.stringify({ edition: "demo", gameDirectory: "dist-demo" })
  );

  assert.throws(
    () => resolveDesktopConfig({ env: {}, isPackaged: true, resourcesPath }),
    /Launch through Steam or set MARQUE_STEAM_APP_ID/
  );
});

function temporaryResources(context) {
  const path = mkdtempSync(join(tmpdir(), "marque-steam-config-"));
  context.after(() => rmSync(path, { recursive: true, force: true }));
  return path;
}
