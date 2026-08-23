# Port-assault fleet bake

Every production hull has a dedicated 320×160 orthographic sprite for a
side-running assault scene with 16-pixel sailors. These do not replace the
47-pixel sailing sprites. All 43 ships share the selected stern-quarter view:
72.5 degrees off a true broadside at 30 degrees of camera elevation. Their bows
point away toward roughly one o'clock on screen. The port side faces the dock
and fighting lane; the camera is near the stern, looking along the dock toward
the bow.

The bake preserves production-fleet scale. It combines each hull's established
`targetModelMaxDim` and `frameScale`, then applies one shared dockside raster
scale to the complete fleet. Small boats therefore remain visibly smaller than
Galleons and ships of the line instead of filling the frame independently.
Oared ships use their static docked geometry rather than a rowing animation
phase.

## Runtime files

- `<ship-slug>-dockside.png` is the complete color sprite and first draw layer.
- `<ship-slug>-dockside-foreground.png` contains geometry nearer to the camera
  than a sailor standing at that hull's deck-entry anchor.
- `<ship-slug>-dockside-depth.png` is the complete ship depth map.
- `manifest.json` is authoritative for dimensions, deck geometry, anchors,
  fleet-relative scale, view metadata, attribution, and depth encoding.
- `src/portAssaultShipGeometry.js` is a generated native-coordinate catalog.
  `src/portAssaultShipAssets.js` combines it with deterministic runtime paths
  and fails loudly if the bake and production roster differ.

All color pixels use Resurrect 64 and binary alpha. The depth map deliberately
uses grayscale rather than the art palette: transparent pixels have alpha 0;
opaque ship pixels range from 1 at the farthest visible surface to 255 at the
nearest. Depth values are normalized within this asset and must not be compared
with another asset's depth values.

## Sailor draw order

At native resolution:

1. Draw `<ship-slug>-dockside.png`.
2. Put each sailor's feet at `deckEntryAnchor` or another point inside
   `deckPolygon`, and draw sailors back-to-front along the polygon's near axis.
3. Draw `<ship-slug>-dockside-foreground.png` over the sailors. The port rail,
   near hull, and other camera-near fittings then cover the appropriate parts
   of their bodies while far geometry remains behind them.
4. Move a departing sailor toward `sailorSpawnAnchor`, then begin the jump to
   the dock. Once a sailor no longer overlaps the ship, the foreground pass has
   no effect on it.

The foreground layer is the inexpensive Canvas 2D path. The depth map is kept
for a later shader, more than one walkable deck depth, projectiles passing
through the rig, or per-pixel placement diagnostics. It is not necessary to
sample the depth texture for the first minigame implementation.

Use nearest-neighbour scaling at integer multiples. Do not mirror the completed
PNG to serve the opposite side of a dock; render the opposite camera from the
canonical model so sails, lighting, deck depth, and occlusion remain coherent.

## Reviews and regeneration

- `fleet-dockside-contact-sheet.png` shows every hull at the same scale and
  camera angle.
- `galleon-dockside-contact-sheet.png` records the four camera candidates and
  marks the common production view.
- `galleon-dockside-compositing-review.png` shows the deck polygon and anchors,
  foreground layer, and depth map. The cyan marker is `deckEntryAnchor`; red is
  `sailorSpawnAnchor`.
- `../galleon-orientation-review.png` is the cardinal orientation gate for the
  source model.

Regenerate the complete fleet bake with:

```sh
npm run render:port-assault-ships
```

`npm run render:all-ships` also rebuilds this fleet after all production hulls
and side views. The private source models and their licenses remain under
`source-models`; only derived PNGs ship as runtime content. Attribution for
each hull is carried from the production render configuration into the
port-assault manifest.
