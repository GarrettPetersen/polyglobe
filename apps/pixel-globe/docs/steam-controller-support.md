# Steam Controller Support

Marque & Reprisal is fully navigable with the standard browser Gamepad API. The game treats inputs as semantic actions and renders controller-family-specific glyphs from the vendored Nikoichu 1-bit icon pack.

## Default layout

| Action | Xbox / Steam Deck | PlayStation | Nintendo |
| --- | --- | --- | --- |
| Confirm / interact | A | Cross | B |
| Back | B | Circle | A |
| Drop / weigh anchor | X | Square | Y |
| Secondary / scavenge / release whale | Y | Triangle | X |
| Fire port broadside | LT | L2 | ZL |
| Fire starboard broadside | RT | R2 | ZR |
| Cycle nearby target | View | Create / Select | Minus |
| Captain's chart / pause | Menu | Options | Plus |
| Steer / navigate | Left stick or D-pad | Left stick or D-pad | Left stick or D-pad |
| Scroll long panels | Right stick | Right stick | Right stick |

The standard Gamepad API exposes positional button indexes, so Nintendo confirm is the physical south button (`B`) and back is the physical east button (`A`).

## Glyph detection

Automatic mode detects Xbox, PlayStation, and Nintendo families from Steam Input controller type when a native bridge is available, then falls back to the Gamepad API device id. Players can override this under **Options > Controller Icons** because Steam Input can expose a non-Xbox controller as emulated XInput.

A Steam wrapper may expose this synchronous bridge before the game starts:

```js
window.marqueSteamInput = {
  getInputType(gamepadIndex) {
    // Return ESteamInputType as its numeric value or enum name.
  }
};
```

The shipping implementation is installed by `steam-host/preload.cjs`. The host
registers `steam-input/game_actions.vdf` before initializing Steam Input.
Action handles are resolved only once a controller is connected: Steam may not
provide an action mapping on a keyboard-only installation. Disconnecting clears
the handles so reconnecting resolves the current mapping. A connected controller
with an invalid mapping still fails validation rather than emitting fake input.

The browser build does not require the bridge.

## Steamworks setup

`steam-input/game_actions.vdf` is the action manifest source. Once the Steam App ID and native wrapper are final:

1. Copy the manifest beside the executable and set its path with `SetInputActionManifestFilePath` during development.
2. Publish an official Steam Input configuration using the Sailing and Menus action sets.
3. Bind the official configuration to the standard positional layout documented above.
4. Test the shipping build with Xbox, PlayStation, Nintendo/Switch Pro, and Steam Deck controllers.
5. Verify startup, every menu, gameplay, dialogue, remapping, pausing, and returning to the main menu without a mouse or keyboard.
6. Retest prompts with Steam Input enabled and disabled, including the manual Controller Icons override.

The storefront's Full Controller Support checkbox should only be selected after that shipping-build hardware pass and the official Steam configuration have been published.

## Packaged launch gate

`steam:upload --platform=all` and `--platform=macos` now run this gate
automatically for every selected edition, before starting SteamCMD. These
uploads must run on macOS with Steam signed in; there is no skip flag. A failed
launch, renderer error, loading failure, or timeout blocks the upload. The gate
requires a packaged application and ignores development game-root overrides.

With Steam running and signed in, run `node tools/check-steam-launch.mjs APP_ID
EXECUTABLE` from the app directory for **both** the full and demo packaged apps
(IDs `4516500` and `5029880`). On macOS, EXECUTABLE is the binary inside
`Product.app/Contents/MacOS/`. This uses a temporary browser profile, verifies
that the real Steam host shows a window and finishes production loading, then
closes it without starting a voyage. Run once without a controller to cover
keyboard-only startup. Mocked host tests and web startup tests do not replace
this gate. Controller-connected hardware verification remains a separate check.

## Early startup failures

The bootstrap boundary displays a localized failure screen and copy button even
when platform bootstrap or Cloud hydration fails before the main game loads.
It keeps a single 8 KiB diagnostic in local browser storage under
`marque-and-reprisal.last-startup-failure`; this key is not synchronized to Cloud
or transmitted as telemetry. Storage or clipboard failure cannot hide the
original error. No save is cleared and no automatic startup retry is attempted.

After a production build, run `npm run test:startup-failure` to inject platform,
Cloud, and storage failures and verify the rendered failure screen. Unit tests
cover localization, report bounds, save preservation, and upload-gate rejection.
