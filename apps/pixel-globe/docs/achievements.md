# Achievements

Achievements are persistent profile data, separate from voyage saves and discoveries. The browser build stores the profile under `marque-and-reprisal.achievements`; starting or ending a voyage does not clear it.

Each catalog entry in `src/achievements.js` has a stable game ID and a platform ID. Voyage-only progress is kept in `gameState.memory.achievements`, while lifetime progress lives in the profile.

## Platform bridge

A desktop host installs this object on `window` before the game starts:

```js
window.marqueAchievementPlatform = {
  platformId: "steam",
  async unlockAchievement(platformAchievementId) {
    await steamApi.unlockAchievement(platformAchievementId);
  }
};
```

The shipping implementation lives in `steam-host/preload.cjs`. The game calls
`unlockAchievement` once for every locally unlocked achievement not yet
acknowledged by that platform. A successful call is recorded in
`profile.platformUnlocks`; a rejected call is logged and retried on a later
synchronization. The web build requires no adapter and continues to track local
achievements normally.

Steam achievement identifiers are the uppercase values in each catalog entry, such as `GREAT_EXPLORER` and `CAPTAIN_AHAB`. Those same identifiers must be configured in Steamworks.

Catalog entries with `hidden: true` conceal their title, description, icon, and
progress in the in-game list until they unlock. Configure those same entries as
hidden in Steamworks so the platform UI does not reveal quest spoilers.

Generate the Steamworks catalog and its 256px achieved/locked icon pairs with:

```sh
npm run render:steam-achievements
```

The generated catalog lives at `steam/achievements/catalog.json`. Steam App
4516500 is the full game.

## Steamworks configuration

The full game's Steamworks achievement page contains all entries generated in
`steam/achievements/catalog.json`, including matching hidden flags. Before
publishing the configuration, upload each entry's `achievedIcon` and
`unachievedIcon` files from that directory. The generated files are 256x256 JPGs
with colorful achieved art and grayscale locked art, matching Steam's current
recommendation.

Steam Cloud for App 4516500 is configured for:

- 100 MB per user
- 20 files per user
- Developer-only support while the desktop host is under development
- Dynamic Cloud Sync disabled
- No Shared Cloud App ID on the full game

Do not Auto-Cloud the browser's LevelDB or local-storage directory. The desktop
host serializes the voyage save, persistent achievement profile, history, and
settings into `marque-profile-v1.json` through Steam Remote Storage. Enable
Cloud support for all users only after the desktop bridge has completed a
save-on-one-machine/load-on-another test.

## Demo application

The Steam demo will have a separate App ID. Once Valve assigns it, configure
the demo's Shared Cloud App ID as 4516500 so its versioned save/profile files
can transfer to the full game. Do not set a shared App ID on the full game.

The demo should not maintain a second, duplicate achievement catalog. It tracks
progress in the shared local profile, and the full game reports any already
earned achievements to Steam when it first loads that profile. This avoids two
independent platform achievements for the same accomplishment.

Steam Stats and Leaderboards stay disabled until the game has a concrete,
player-facing use for them. The achievement system does not need Steam Stats.
