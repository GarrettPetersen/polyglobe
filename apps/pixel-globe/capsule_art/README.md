# Marque & Reprisal Capsule Art

Run:

```sh
npm --prefix apps/pixel-globe run render:capsules
```

The generator combines the four aligned 1232x706 source layers in this order:

1. `capsule_art/source/background.png`
2. `capsule_art/source/upper_text.png`
3. `capsule_art/source/ship.png`
4. `capsule_art/source/lower_text.png`

Generated files are written to `capsule_art/generated/`.

All resizing uses nearest-neighbor sampling to keep the pixel art crisp. Standard
formats crop the aligned source canvas as one composition. Tall and exceptionally
wide formats fit the foreground lockup over a separately cropped background so
none of the title is lost.

## Layer Modes

- Standard capsules use all four layers. The ship therefore passes in front of
  `upper_text.png` and behind `lower_text.png`.
- Artwork-only files use `background.png` and `ship.png`.
- `library_logo_en.png` is transparent and uses only the two text layers.
- `client_icon_32.png` remains the purpose-built in-game ship icon.

Use `--only=filename.png` to render one registered output, or `--source-dir`
and `--output-dir` to work from alternate directories.

## Output Sizes

| File | Size |
| --- | --- |
| `capsule_header_en.png` | 920x430 |
| `capsule_small_en.png` | 462x174 |
| `capsule_main_en.png` | 1232x706 |
| `capsule_vertical_en.png` | 748x896 |
| `capsule_background.png` | 1438x810 |
| `library_capsule_en.png` | 600x900 |
| `library_header_en.png` | 920x430 |
| `library_hero.png` | 3840x1240 |
| `library_logo_en.png` | 1280x720 |
| `community_icon_184.png` | 184x184 |
| `client_icon_32.png` | 32x32 |
| `shortcut_icon_256.png` | 256x256 |
| `event_cover_en.png` | 800x450 |
| `event_header_en.png` | 1920x622 |
| `social_share_en.png` | 1200x630 |
| `itchio_cover_en.png` | 630x500 |

Two review sheets are also generated:

- `contact-sheet.png` previews every storefront image.
- `client-icon-ship-comparison.png` renders every active ship under identical
  32x32 client-icon conditions.
