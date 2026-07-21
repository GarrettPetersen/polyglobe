# Achievements

Achievements are persistent profile data, separate from voyage saves and discoveries. The browser build stores the profile under `marque-and-reprisal.achievements`; starting or ending a voyage does not clear it.

Each catalog entry in `src/achievements.js` has a stable game ID and a platform ID. Voyage-only progress is kept in `gameState.memory.achievements`, while lifetime progress lives in the profile.

## Platform bridge

A desktop host can install this object on `window` before the game starts:

```js
window.marqueAchievementPlatform = {
  platformId: "steam",
  async unlockAchievement(platformAchievementId) {
    await steamApi.unlockAchievement(platformAchievementId);
  }
};
```

The game calls `unlockAchievement` once for every locally unlocked achievement not yet acknowledged by that platform. A successful call is recorded in `profile.platformUnlocks`; a rejected call is logged and retried on a later synchronization. The web build requires no adapter and continues to track local achievements normally.

Steam achievement identifiers are the uppercase values in each catalog entry, such as `GREAT_EXPLORER` and `CAPTAIN_AHAB`. Those same identifiers must be configured in Steamworks.

Catalog entries with `hidden: true` conceal their title, description, icon, and
progress in the in-game list until they unlock. Configure those same entries as
hidden in Steamworks so the platform UI does not reveal quest spoilers.
