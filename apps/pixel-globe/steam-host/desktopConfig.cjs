const { existsSync, readFileSync } = require("node:fs");
const { join, resolve } = require("node:path");

const FULL_GAME_APP_ID = 4516500;
const VALID_EDITIONS = new Set(["full", "demo"]);

function resolveDesktopConfig({
  env = process.env,
  hostRoot = __dirname,
  isPackaged = false,
  resourcesPath = process.resourcesPath
} = {}) {
  const manifestPath = isPackaged
    ? join(resourcesPath, "steam-build.json")
    : join(hostRoot, "steam-build.json");
  const manifest = readOptionalManifest(manifestPath);
  const edition = requiredEdition(env.MARQUE_STEAM_EDITION || manifest.edition || "full");
  const appId = requiredAppId(
    env.MARQUE_STEAM_APP_ID ||
      env.SteamAppId ||
      manifest.appId ||
      (edition === "full" ? FULL_GAME_APP_ID : null),
    edition
  );
  const gameRoot = env.MARQUE_STEAM_GAME_ROOT
    ? resolve(env.MARQUE_STEAM_GAME_ROOT)
    : isPackaged
      ? join(resourcesPath, requiredRelativeDirectory(manifest.gameDirectory, "game directory"))
      : resolve(hostRoot, edition === "demo" ? "../dist-demo" : "../dist");
  const inputManifest = env.MARQUE_STEAM_INPUT_MANIFEST
    ? resolve(env.MARQUE_STEAM_INPUT_MANIFEST)
    : isPackaged
      ? join(resourcesPath, "steam-input/game_actions.vdf")
      : resolve(hostRoot, "../steam-input/game_actions.vdf");

  return Object.freeze({
    appId,
    edition,
    gameRoot,
    inputManifest,
    manifestPath
  });
}

function readOptionalManifest(path) {
  if (!existsSync(path)) return {};
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(`Invalid Steam desktop build manifest: ${path}`, { cause: error });
  }
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    throw new Error(`Invalid Steam desktop build manifest: ${path}`);
  }
  return manifest;
}

function requiredEdition(value) {
  if (!VALID_EDITIONS.has(value)) throw new Error(`Invalid Steam edition: ${value}`);
  return value;
}

function requiredAppId(value, edition) {
  const appId = Number(value);
  if (!Number.isInteger(appId) || appId <= 0) {
    const hint = edition === "demo"
      ? " Launch through Steam or set MARQUE_STEAM_APP_ID to the demo App ID."
      : "";
    throw new Error(`Invalid Steam App ID: ${value}.${hint}`);
  }
  return appId;
}

function requiredRelativeDirectory(value, label) {
  if (
    typeof value !== "string" ||
    value.trim() === "" ||
    value.includes("..") ||
    value.startsWith("/") ||
    value.startsWith("\\")
  ) {
    throw new Error(`Invalid ${label}: ${value}`);
  }
  return value;
}

module.exports = {
  FULL_GAME_APP_ID,
  resolveDesktopConfig
};
