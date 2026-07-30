# Steam platform integration

The Steam edition runs the same browser game inside the isolated Electron host
in `steam-host/`. Steam code is never bundled into the web prototype or Itch
demo. Those editions have no `window.marqueSteamPlatform` bridge and continue
to use browser storage, the Gamepad API, and PNG downloads exactly as before.
Opted-in anonymous telemetry remains enabled in both Steam editions. Reports
use separate `steam-full` and `steam-demo` channels, retain the build edition
and revision, and do not include a Steam account ID.

## Development

Install the desktop-only dependencies once:

```sh
npm run steam:install
```

Build the full game and launch it through the host:

```sh
npm run steam:start
```

The host defaults to full-game App ID `4516500`; the packaged demo uses App ID
`5029880`. Override either with `MARQUE_STEAM_APP_ID` for Spacewar or diagnostic
testing. Shipping launchers should set `MARQUE_STEAM_REQUIRE_RELAUNCH=1`; local
development deliberately does not force a relaunch through Steam.

Create verified, unpacked SteamPipe-ready application folders for both the
full game and demo:

```sh
npm run steam:package
```

Packages are written to `build/steam/<edition>/<platform>-<arch>/`. The demo
embeds its assigned App ID `5029880`; `MARQUE_STEAM_DEMO_APP_ID` remains
available as a packaging override. `npm run steam:package:windows` and
`npm run steam:package:mac`, and `npm run steam:package:linux` create the
current release targets. Cross-packaging does not replace a smoke test on the
target OS.

### macOS signing and notarization

Release packages must be built on macOS with a `Developer ID Application`
certificate installed in the login keychain. The unsigned `steam:package:mac`
command remains useful for development. After installing the certificate,
confirm that macOS can see it:

```sh
security find-identity -v -p codesigning
```

Store notarization credentials in Keychain rather than in the repository or a
shell history:

```sh
xcrun notarytool store-credentials "marque-notary"
```

Then create signed and notarized full-game and demo packages:

```sh
MARQUE_MAC_NOTARY_PROFILE=marque-notary npm run steam:package:mac:release
```

`@electron/packager` signs the complete Electron bundle with hardened runtime
and its maintained default Electron entitlements, submits it with
`notarytool`, and staples the accepted ticket. Set
`MARQUE_MAC_SIGN_IDENTITY` to the exact `Developer ID Application: ...` identity
only when Keychain contains more than one valid signing identity. The packager
verifies the signature and stapled ticket before accepting either package.

### SteamPipe depots

Windows, macOS, and Linux are delivered in separate, OS-restricted depots.
Stable IDs live in `steam/depots.json`; a `null` value means Steamworks still
needs to create that depot. Prepare both applications after all six IDs exist:

```sh
npm run steam:prepare-upload
```

For a Windows-only diagnostic upload while macOS depot IDs are still pending:

```sh
npm run steam:prepare-upload -- --platform=windows
```

The app build files reference all three platform depots together so a single
Steam Build ID represents the matching Windows, macOS, and Linux release.
SteamPipe leaves `SetLive` empty; assign an uploaded build to a protected beta
branch manually after upload and verification.

## Implemented services

- **Achievements (full game only):** `marqueAchievementPlatform` activates the
  stable API names from `src/achievements.js` and immediately stores Steam user
  stats. The demo does not expose this bridge or accept unlock requests.
- **Stats (full game only):** thirteen client-owned, increment-only integer stats report
  best-in-voyage and lifetime progress for 29 fixed-threshold achievements.
  The host only raises values and stores changed batches. Generate the exact
  definitions and achievement bindings with `npm run render:steam-config`. The
  demo advertises Stats as unavailable and rejects stat writes.
- **Cloud (both editions):** `src/bootstrap.js` hydrates a single versioned
  `marque-profile-v1.json` before importing the game. Saves, achievement
  progress, voyage history, key bindings, language, controller glyphs, and
  audio settings are synchronized after every persistent mutation. Steamworks
  shares the demo's Cloud storage with full-game App `4516500`.
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

1. Under SteamPipe > Depots, configure full-game Depots `4516501`, `4516502`,
   and `4516503` for Windows, macOS, and Linux/SteamOS respectively. Configure
   demo Depots `5029881`, `5029882`, and `5029883` the same way. All depots are
   64-bit, recorded in `steam/depots.json`, and included in the public store,
   beta, and developer packages.
2. On full-game App `4516500`, publish the 13 Stats definitions from
   `steam/stats/catalog.json` and the 51 achievement definitions, icon pairs,
   hidden flags, and progress bindings from `steam/achievements/catalog.json`.
3. On full-game App `4516500`, set Steam Cloud to 100 MB and 20 files per user.
   Keep Auto-Cloud rules empty because the game uses the Remote Storage API.
   Enable developer-only Cloud during testing, save and publish the settings,
   then enable Cloud for all users after a cross-machine restore test.
4. On demo App `5029880`, set the application type to `Demo`, associate base
   game App `4516500`, and set `Shared Cloud App ID` to `4516500`. Do not create
   Stats or achievement definitions for the demo.
5. Upload `steam/presence/steam_presence.vdf` and publish the official Steam
   Input configuration based on `steam-input/game_actions.vdf`.
6. Enable the Steam Overlay for the application so screenshots and Game
   Recording are available.
7. Test Xbox, PlayStation, Nintendo/Switch Pro, and Steam Deck hardware in the
   packaged build before selecting Full Controller Support on the store page.

The Steam demo uses its own App ID at launch while sharing Cloud App ID
`4516500` in Steamworks. Its host capabilities explicitly disable Steam Stats
and achievements. The full game reports achievements already present in the
shared profile the first time it loads that profile.
