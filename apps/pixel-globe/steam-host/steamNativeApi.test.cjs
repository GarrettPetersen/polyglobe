const assert = require("node:assert/strict");
const test = require("node:test");

const {
  TIMELINE_CLIP_PRIORITY,
  TIMELINE_GAME_MODE,
  steamLibraryPath
} = require("./steamNativeApi.cjs");

test("Steam Timeline enum values match the V001 Steamworks interface", () => {
  assert.deepEqual(TIMELINE_GAME_MODE, {
    playing: 1,
    staging: 2,
    menus: 3,
    loading: 4
  });
  assert.deepEqual(TIMELINE_CLIP_PRIORITY, {
    none: 1,
    standard: 2,
    featured: 3
  });
});

test("the Steam host resolves its packaged redistributable", () => {
  assert.match(steamLibraryPath(), /(?:steam_api64\.dll|libsteam_api\.(?:dylib|so))$/);
});
