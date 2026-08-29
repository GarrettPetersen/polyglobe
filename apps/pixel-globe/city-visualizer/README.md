# City visualizer

This is a standalone staging tool for the future in-game port view. It uses the
same responsive logical viewport function as the game, but it is not linked from
or bundled into the player-facing menus yet.

Run `npm run city-visualizer:dev` from `apps/pixel-globe`, then open
`http://127.0.0.1:5177/city-visualizer/`.

## Canvas contract

- Canonical landscape: 455 × 256 logical pixels
- Widest landscape: 910 × 256
- Canonical portrait: 256 × 455
- Tallest portrait: 256 × 910
- Aseprite master: 1365 × 910
- Authored horizontal safe span: x=455 through x=1365
- Authored vertical scene bottom: y=583

The vertical crop stays bottom-anchored. Extra portrait height reveals sky
above the master scene rather than making important click targets drift below
the canonical view. Coastal scenes pan within the authored 910-pixel safe span,
so a 910-pixel coastal viewport has no horizontal travel. River scenes can pan
across the entire 1365-pixel master even at that width so both banks remain
reachable. Pointer input sets a camera target and the view eases toward it with
a speed cap instead of snapping to the cursor position.

Every authored layer occurrence and synthetic entity has explicit scene `z`
and parallax-depth metadata. The renderer sorts static art, animated layers,
the ship, and NPCs together. This lets the gatehouse back and gate sit behind
walkers while its front wall shares the inn's foreground row. Duplicate layer
names, such as the two market rows, can have different values by occurrence.

The ocean is divided into horizon, distant, midground, and foreground bands at
render time and uses the loading screen's sine-wave pixel-row displacement.
Beach variants use the matching distant, midground, and foreground boundaries,
so the source Aseprite layers remain intact while their near and far portions
move with the surrounding land and water.

## Generated data and art

`npm run city-visualizer:catalog` rebuilds the list and automatic rules for all
current water-accessible cities. The roster comes from the production
subdivision-eight sailing endpoint bake. Terrain, river, navigation, and peak
signals come from the production Earth geography pipeline. Mountain visibility
uses an elevation-derived horizon radius instead of city-specific overrides.

Fortification is deliberately marked with a confidence. Faction seats and
strategic trade ports have the strongest 1522 signal; large-city and small-town
defaults remain provisional until historical research provides explicit
records.

`npm run city-visualizer:assets` exports compact atlases from
`public/assets/city-view/port-parallax.aseprite`. Set `MINIFOLKS_SOURCE_ROOT` to
the `itch/minifolks` directory in the private source-assets checkout when the
licensed MiniFolks production sheets need to be regenerated. Only the selected
walk-cycle atlases are committed here; the source packs and archives remain in
the private repository.

## Interaction boundary

The city name and hovered destination label are drawn into the logical canvas.
Shipyard, market, item store, inn, and fortified gatehouse are pixel-mask hit
targets. Hovering draws a one-logical-pixel yellow silhouette outline. Clicking
opens a small stand-in dialog at the same boundary where the existing game
modal will later be invoked.
