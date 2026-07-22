# Steam platform integration

The Steam edition runs the same browser game inside the isolated Electron host
in `steam-host/`. Steam code is never bundled into the web prototype or Itch
demo. Those editions have no `window.marqueSteamPlatform` bridge and continue
to use browser storage, the Gamepad API, and PNG downloads exactly as before.

## Development

Install the desktop-only dependencies once:

```sh
npm run steam:install
```

Build the full game and launch it through the host:

```sh
npm run steam:start
```

The host defaults to full-game App ID `4516500`. Override it for the future
Steam demo or Spacewar testing with `MARQUE_STEAM_APP_ID`. Shipping launchers
should set `MARQUE_STEAM_REQUIRE_RELAUNCH=1`; local development deliberately
does not force a relaunch through Steam.

## Implemented services

- **Achievements:** `marqueAchievementPlatform` activates the stable API names
  from `src/achievements.js` and immediately stores Steam user stats.
- **Cloud:** `src/bootstrap.js` hydrates a single versioned
  `marque-profile-v1.json` before importing the game. Saves, achievement
  progress, voyage history, key bindings, language, controller glyphs, and
  audio settings are synchronized after every persistent mutation.
- **Steam Input / Deck:** the host initializes Steam Input, installs
  `steam-input/game_actions.vdf`, polls the native Sailing and Menus action
  sets, and feeds their state into the same controller path used by the web
  game. It also reports physical controller types to the prompt system. Web and
  Itch editions continue to use ordinary Gamepad input.
- **Rich Presence:** main menu, port, combat, anchoring, sailing, lake battle,
  and completed-voyage states publish localized display tokens. Upload
  `steam/presence/steam_presence.vdf` in Steamworks Rich Presence localization.
- **Screenshots:** the Electron Steam Overlay enables Steam's normal screenshot
  key. The game's remappable screenshot action also calls
  `ISteamScreenshots::TriggerScreenshot`; browser and Itch builds retain their
  nearest-neighbor PNG export.
- **Timeline / Game Recording:** the game publishes current activity plus event
  markers for discoveries, achievements, battles, victories, whale hunts,
  lightning strikes, conquests, and voyage endings. The host calls the V001
  Steam Timeline flat API with Valve's built-in icon names.

`steam-host/steamNativeApi.cjs` uses the Steam redistributable bundled by
`steamworks.js` for Screenshot, Timeline, and Steam Input manifest calls. It
does not commit Valve SDK files or expose Node APIs to the renderer.

## Steamworks checklist

1. Publish the achievement definitions and upload the generated icon pairs in
   `steam/achievements/`.
2. Publish the Cloud quota and enable it for all users after testing a save on
   one machine and restore on another.
3. Upload `steam/presence/steam_presence.vdf` and publish the official Steam
   Input configuration based on `steam-input/game_actions.vdf`.
4. Enable the Steam Overlay for the application so screenshots and Game
   Recording are available.
5. Test Xbox, PlayStation, Nintendo/Switch Pro, and Steam Deck hardware in the
   packaged build before selecting Full Controller Support on the store page.

The Steam demo should use its own App ID at launch while sharing Cloud App ID
`4516500` in Steamworks. It should not expose a duplicate achievement catalog;
the full game will report achievements already present in the shared profile.
