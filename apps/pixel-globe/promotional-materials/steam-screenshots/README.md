# Steam Screenshots

Localized `1920x1080` gameplay screenshots for the Steam store page. The set deliberately omits
the main menu and covers exploration, trade, fishing, whaling, combat, port bombardment,
colonization, storms, and a panda encounter.

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

Use `--base-url` for a different local server. The script steps the existing deterministic video
scenarios to the catalogued frame, verifies the active locale, captures at exact Steam resolution,
and writes `manifest.json`.

Each filename ends with Steam's language code: `english`, `schinese`, `russian`, `spanish`,
`brazilian`, `japanese`, `german`, `french`, `polish`, `tchinese`, or `koreana`.
