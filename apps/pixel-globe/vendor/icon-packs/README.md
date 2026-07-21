# Vendored Icon Packs

## Nikoichu - 1-bit Pixel Icons

- Version: 1.2 (28 November 2025)
- Archive: `nikoichu-1-bit-pixel-icons-v1.2.zip`
- Original archive: `1-bit_Pixel_Icons.zip`
- Source: https://nikoichu.itch.io/pixel-icons
- License: Creative Commons Zero v1.0 Universal (CC0 1.0)

The game icon atlas uses the uncropped `Sprites/` files at their native 16x16
size, then maps their colors to Resurrect 64. The complete original archive is
kept here so the checked-in atlas can be rebuilt without a copy in Downloads.

## alexkovacsart - 100 Free Pixel Art Foods!

- Archive: `alexkovacsart-free-pixel-art-foods.zip`
- Original archive: `Free_pixel_food_16x16.zip`
- Source: https://alexkovacsart.itch.io/free-pixel-art-foods
- License: Creative Commons Attribution 4.0 International (CC BY 4.0)

The complete archive is redistributable with attribution and supplies the
hardtack, foraged-food, cheese, ginger, tea, and coffee atlas cells.

`game-icon-source-fallbacks-v14.png` and its JSON manifest retain the approved
Resurrect 64 cells from attributed packs whose licenses forbid publishing their
complete source archives. Together with the redistributable archives, they let
`npm run render:game-icons` rebuild the complete atlas from a fresh clone without
reading a personal Downloads folder. `PIXEL_GLOBE_ICON_PACK_DIR` remains an
optional override for developers with access to the private source-assets repo.
