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
