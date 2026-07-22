const { existsSync } = require("node:fs");
const { dirname, join } = require("node:path");
const koffi = require("koffi");

const TIMELINE_GAME_MODE = Object.freeze({
  playing: 1,
  staging: 2,
  menus: 3,
  loading: 4
});
const TIMELINE_CLIP_PRIORITY = Object.freeze({
  none: 1,
  standard: 2,
  featured: 3
});

function createSteamNativeApi() {
  const libraryPath = steamLibraryPath();
  const library = koffi.load(libraryPath);

  const getScreenshots = library.func("SteamAPI_SteamScreenshots_v003", "void *", []);
  const triggerScreenshot = library.func(
    "SteamAPI_ISteamScreenshots_TriggerScreenshot",
    "void",
    ["void *"]
  );
  const getTimeline = library.func("SteamAPI_SteamTimeline_v001", "void *", []);
  const setTimelineDescription = library.func(
    "SteamAPI_ISteamTimeline_SetTimelineStateDescription",
    "void",
    ["void *", "str", "float"]
  );
  const addTimelineEvent = library.func(
    "SteamAPI_ISteamTimeline_AddTimelineEvent",
    "void",
    ["void *", "str", "str", "str", "uint32", "float", "float", "int"]
  );
  const setTimelineGameMode = library.func(
    "SteamAPI_ISteamTimeline_SetTimelineGameMode",
    "void",
    ["void *", "int"]
  );
  const getInput = library.func("SteamAPI_SteamInput_v006", "void *", []);
  const setInputManifest = library.func(
    "SteamAPI_ISteamInput_SetInputActionManifestFilePath",
    "bool",
    ["void *", "str"]
  );

  const screenshots = requiredPointer(getScreenshots(), "ISteamScreenshots");
  const timeline = requiredPointer(getTimeline(), "ISteamTimeline");
  const input = requiredPointer(getInput(), "ISteamInput");

  return Object.freeze({
    triggerScreenshot() {
      triggerScreenshot(screenshots);
    },

    setTimelineState({ description, mode }) {
      const gameMode = TIMELINE_GAME_MODE[mode];
      if (!gameMode || typeof description !== "string" || description.trim() === "") {
        throw new Error(`Invalid Steam Timeline state: ${mode}`);
      }
      setTimelineGameMode(timeline, gameMode);
      setTimelineDescription(timeline, description, 0);
    },

    addTimelineEvent(event) {
      const clipPriority = TIMELINE_CLIP_PRIORITY[event.clipPriority];
      if (!clipPriority) throw new Error(`Invalid Steam Timeline clip priority: ${event.clipPriority}`);
      addTimelineEvent(
        timeline,
        event.icon,
        event.title,
        event.description,
        event.priority,
        0,
        event.durationSeconds,
        clipPriority
      );
    },

    setInputActionManifest(manifestPath) {
      if (typeof manifestPath !== "string" || manifestPath.trim() === "" || !existsSync(manifestPath)) {
        throw new Error(`Steam Input manifest is missing: ${manifestPath}`);
      }
      if (!setInputManifest(input, manifestPath)) {
        throw new Error(`Steam rejected the Input action manifest: ${manifestPath}`);
      }
    }
  });
}

function steamLibraryPath() {
  const packageRoot = dirname(require.resolve("steamworks.js/package.json"));
  const platformPath = process.platform === "win32"
    ? "dist/win64/steam_api64.dll"
    : process.platform === "darwin"
      ? "dist/osx/libsteam_api.dylib"
      : process.platform === "linux"
        ? "dist/linux64/libsteam_api.so"
        : null;
  if (!platformPath) throw new Error(`Steam host does not support ${process.platform}`);
  const libraryPath = join(packageRoot, platformPath);
  if (!existsSync(libraryPath)) throw new Error(`Steam API library is missing: ${libraryPath}`);
  return libraryPath;
}

function requiredPointer(pointer, label) {
  if (!pointer) throw new Error(`Steam returned no ${label} interface`);
  return pointer;
}

module.exports = {
  TIMELINE_CLIP_PRIORITY,
  TIMELINE_GAME_MODE,
  createSteamNativeApi,
  steamLibraryPath
};
