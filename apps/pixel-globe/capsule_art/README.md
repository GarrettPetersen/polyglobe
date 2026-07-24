# Marque & Reprisal Capsule Art

Run:

```sh
npm --prefix apps/pixel-globe run render:capsules
```

Generate the macOS ICNS and zipped Linux PNG icon set with:

```sh
npm --prefix apps/pixel-globe run render:platform-icons
```

The generator combines the five aligned 1232x706 source layers in this order:

1. `capsule_art/source/background.png`
2. `capsule_art/source/reflection.png`
3. `capsule_art/source/upper_text.png`
4. `capsule_art/source/ship.png`
5. `capsule_art/source/lower_text.png`

Generated files are written to `capsule_art/generated/`.

English uses the hand-authored text layers above. Every other supported language
is generated from `tools/capsule-title-locales.mjs`. Alphabetic titles use
separately sized and positioned drop capitals, including different upper- and
lower-line drops. Chinese, Japanese, and Korean keep both characters or syllables
at the same scale. Their upper words are bottom-aligned and their lower words are
top-aligned around a fixed clear band, so font-specific ascenders and descenders
cannot make the two lines collide. Traditional Chinese uses the Taiwan-localized
MasaFont brush face. All versions reuse `public/assets/capsule/ampersand.png` as
a shared heraldic brand mark. The Korean lower line is visibly centered beneath
the complete upper line, including that ampersand.

The upper title is positioned so its final strokes pass behind the ship while
remaining legible. The lower title draws in front. This preserves the authored
English title's sense of depth in every localization. The long Russian, German,
and Polish upper titles are aligned to the first pixel where their final letter
overlaps the ship, preventing either a visible gap or excessive occlusion.

The game also keeps copies of the five source layers in `public/assets/loading/`
so every development and production server can animate the authored capsule
composition directly. The sea and reflection ripple row by row, the ship bobs
independently, and the two title layers enter once before settling.

All resizing uses nearest-neighbor sampling to keep the pixel art crisp. Standard
formats crop the aligned source canvas as one composition. Tall and exceptionally
wide formats fit the foreground lockup over a separately cropped background so
none of the title is lost, while anchoring the ship to its original waterline.

## Layer Modes

- Standard capsules use all five layers. The ship therefore passes in front of
  the localized upper title and behind the localized lower title.
- Artwork-only files use `background.png`, `reflection.png`, and `ship.png`.
- Fitted capsules transform `reflection.png` with the ship so the two remain aligned.
- `library_logo_{language}.png` is transparent and uses only the two text layers.
- `capsule_title_{language}.png` preserves the full source canvas and combines the two
  transparent text layers for editorial use.
- `capsule_title_with_ship_{language}.png` preserves the full source canvas and uses the
  authored `upper_text.png`, `ship.png`, `lower_text.png` interleaving without
  the background or reflection.
- `client_icon_32.png` remains the purpose-built in-game ship icon.

Use `--only=filename.png` to render one registered output, or `--source-dir`
and `--output-dir` to work from alternate directories.

## Output Sizes

Localized files use Steam language codes as suffixes. For example,
`capsule_main_schinese.png` and `library_logo_koreana.png`.

| File pattern | Size |
| --- | --- |
| `capsule_header_{language}.png` | 920x430 |
| `capsule_small_{language}.png` | 462x174 |
| `capsule_main_{language}.png` | 1232x706 |
| `capsule_title_{language}.png` | 1232x706 |
| `capsule_title_with_ship_{language}.png` | 1232x706 |
| `capsule_vertical_{language}.png` | 748x896 |
| `capsule_background.png` | 1438x810 |
| `library_capsule_{language}.png` | 600x900 |
| `library_header_{language}.png` | 920x430 |
| `library_hero.png` | 3840x1240 |
| `library_logo_{language}.png` | 1280x720 |
| `community_icon_184.png` | 184x184 |
| `client_icon_32.png` | 32x32 |
| `shortcut_icon_256.png` | 256x256 |
| `app_icon_512.png` | 512x512 |
| `event_cover_{language}.png` | 800x450 |
| `event_header_{language}.png` | 1920x622 |
| `social_share_{language}.png` | 1200x630 |
| `itchio_cover_{language}.png` | 630x500 |

| App locale | Steam suffix | Capsule title |
| --- | --- | --- |
| `en` | `english` | Marque & Reprisal |
| `zh-Hans` | `schinese` | 私掠 & 报复 |
| `ru` | `russian` | Каперство & Возмездие |
| `es` | `spanish` | Corso & Represalia |
| `pt-BR` | `brazilian` | Corso & Represália |
| `ja` | `japanese` | 私掠 & 報復 |
| `de` | `german` | Kaperbrief & Vergeltung |
| `fr` | `french` | Marque & Représailles |
| `pl` | `polish` | Kaperstwo & Odwet |
| `zh-Hant` | `tchinese` | 私掠 & 報復 |
| `ko` | `koreana` | 사략 & 보복 |

Three review sheets are also generated:

- `contact-sheet.png` previews the English storefront image set.
- `localized-capsule-main-comparison.png` compares every localized main capsule.
- `client-icon-ship-comparison.png` renders every active ship under identical
  32x32 client-icon conditions.

Platform icon outputs are written alongside the capsule art:

- `marque-and-reprisal.icns` contains the standard macOS icon representations.
- `marque-and-reprisal-linux-icons.zip` contains PNG icons at 16, 24, 32, 48,
  64, 96, 128, 256, and 512 pixels.

Every representation is scaled from one tightly cropped, text-free 512px
painterly capsule icon so the composition remains identical at every size.
