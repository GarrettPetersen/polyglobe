# Steam Screenshots

Localized `1920x1080` gameplay screenshots for the Steam store page. The set deliberately omits
the main menu and covers exploration, trade, fishing, whaling, combat, port bombardment,
colonization, storms, a panda encounter, and daylight sailing at the Great Barrier Reef,
the Spice Islands, the Seto Inland Sea, the Bosporus, and Lake Victoria.

Generate the complete set while the local game server is running at `127.0.0.1:5184`:

```sh
npm run capture:steam-screenshots
```

Selective reruns are supported:

```sh
npm run capture:steam-screenshots -- \
  --shots trade-cloves,meet-panda \
  --languages en,ja \
  --jobs 2
```

Selective reruns merge into the existing manifest. Rebuild and validate the complete manifest from
the screenshots already on disk without launching the game:

```sh
npm run capture:steam-screenshots -- --manifest-only
```

Use `--base-url` for a different local server. The script steps the deterministic capture
scenarios to the catalogued frame, verifies the active locale, exports the game's logical canvas,
and scales it to Steam resolution by an exact integer with smoothing disabled. It never captures a
CSS-scaled browser element, so every game pixel remains a uniform `4x4` output block. The script
then writes `manifest.json`.

Each filename ends with Steam's language code: `english`, `schinese`, `russian`, `spanish`,
`brazilian`, `japanese`, `german`, `french`, `polish`, `tchinese`, or `koreana`.
