# Port-assault ship bake

The port-assault Galleon is a dedicated 320×160 orthographic sprite for a
side-running assault scene with 16-pixel sailors. It does not replace the
47-pixel sailing sprite. The selected view is 27.5 degrees off a true
broadside at 12.5 degrees of camera elevation, with the bow pointing up-left
and the starboard side facing the dock.

## Runtime files

- `galleon-dockside.png` is the complete color sprite and first draw layer.
- `galleon-dockside-foreground.png` contains geometry nearer to the camera
  than a sailor standing at the deck-entry anchor.
- `galleon-dockside-depth.png` is the complete ship depth map.
- `manifest.json` is authoritative for dimensions, deck geometry, anchors,
  view metadata, attribution, and depth encoding.
- `src/portAssaultShipAssets.js` exposes the same runtime paths and native
  coordinates to game code, and fails loudly for hulls that have no bake.

All color pixels use Resurrect 64 and binary alpha. The depth map deliberately
uses grayscale rather than the art palette: transparent pixels have alpha 0;
opaque ship pixels range from 1 at the farthest visible surface to 255 at the
nearest. Depth values are normalized within this asset and must not be compared
with another asset's depth values.

## Sailor draw order

At native resolution:

1. Draw `galleon-dockside.png`.
2. Put each sailor's feet at `deckEntryAnchor` or another point inside
   `deckPolygon`, and draw sailors back-to-front along the polygon's near axis.
3. Draw `galleon-dockside-foreground.png` over the sailors. The starboard rail,
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

- `galleon-dockside-contact-sheet.png` compares the four camera candidates and
  marks the selected production view.
- `galleon-dockside-compositing-review.png` shows the deck polygon and anchors,
  foreground layer, and depth map. The cyan marker is `deckEntryAnchor`; red is
  `sailorSpawnAnchor`.
- `../galleon-orientation-review.png` is the cardinal orientation gate for the
  source model.

Regenerate only this asset with:

```sh
npm run render:galleon-port-assault
```

The underlying “Sailing ship” model is by cyc3w and is used under CC BY 4.0;
the private source model remains under `source-models` and is not shipped as
runtime 3D content.
