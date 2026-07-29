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
npm run render:steam-config
```

The achievement catalog lives at `steam/achievements/catalog.json`. The stat
definitions and achievement progress bindings live at
`steam/stats/catalog.json`. Steam App 4516500 is the full game.

## Steamworks configuration

The full game's Steamworks achievement page contains all entries generated in
`steam/achievements/catalog.json`, including matching hidden flags. Before
publishing the configuration, upload each entry's `achievedIcon` and
`unachievedIcon` files from that directory. The generated files are 256x256 JPGs
with colorful achieved art and grayscale locked art, matching Steam's current
recommendation.

Create every entry in `steam/stats/catalog.json` as an `INT` stat with the
listed API name, display name, minimum, maximum, default, and aggregation
settings. Set `Set By` to `Client` and enable `Increment Only`. The desktop host
reads each current Steam value and only writes a larger value.

For every entry under `achievementProgress`, edit the matching Steam
achievement and set:

- `Progress Stat` to the entry's `progressStat`.
- `Progress Stat Unlock Value` to the entry's `progressUnlockValue`.

These bindings let Steam display progress and unlock the achievement at its
threshold. The game also sends an explicit, idempotent achievement unlock, so
previous browser saves and profiles earned while offline still reconcile.
`Great Explorer`, `Well Rounded`, and `Great Bestiary` deliberately remain
explicit-only: their totals grow whenever the discovery, ship, or animal
catalog grows, so they should not have a fixed Steam progress threshold.

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

Steam demo App `5029880` is linked to full-game App `4516500`. Once the full
game is released, configure the demo's Shared Cloud App ID as `4516500` so its
versioned save/profile files can transfer to the full game. Do not set a shared
App ID on the full game.

The demo should not maintain a second, duplicate achievement catalog. It tracks
progress in the shared local profile, and the full game reports any already
earned achievements to Steam when it first loads that profile. This avoids two
independent platform achievements for the same accomplishment.

Steam Stats back the fixed achievement progress counters in
`steam/stats/catalog.json`. Steam Leaderboards remain disabled until the game
has a versioned, cheat-resistant seeded challenge mode.
