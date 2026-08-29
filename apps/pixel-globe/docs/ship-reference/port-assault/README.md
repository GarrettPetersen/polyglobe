# Port-assault fleet bake

Every production hull has a dedicated 320×160 orthographic sprite for a
side-running assault scene with 16-pixel sailors. These do not replace the
47-pixel sailing sprites. All 43 ships share the selected stern-quarter view:
72.5 degrees off a true broadside at 20 degrees of camera elevation. Their bows
point away toward roughly one o'clock on screen. The port side faces the dock
and fighting lane; the camera is near the stern, looking along the dock toward
the bow. The lower camera pitch is shared by the city visualizer and keeps the
large dockside rasters consistent with its low forest horizon.

The bake preserves production-fleet scale. It combines each hull's established
`targetModelMaxDim` and `frameScale`, then applies one shared dockside raster
scale to the complete fleet. Small boats therefore remain visibly smaller than
Galleons and ships of the line instead of filling the frame independently.
Oared ships use their static docked geometry rather than a rowing animation
phase.

Docked ships do not carry deployed canvas. The bake separates sail triangles
in model space before rendering. Where a source exposes a coherent cloth
surface, it replaces that surface with a narrow segmented prism along the
supporting yard so the result reads as a furled sail at pixel scale. Junk sails
are handled separately: their deployed cloth, yards, and battens descend to the
foot of the sail, where the cloth concertinas and the rigid battens form a
visible stack. Sources whose cloth is split into many disconnected strips, or
whose surviving source spars provide no valid support for a procedural bundle,
instead use an explicit stowed rig: the deployed cloth and its sail-only
hardware are removed while the mast and permanent standing rig remain. The
Kobaya and Mesoamerican dugout are explicit no-sail exceptions.

Every hull has an explicit selector keyed by source material, source mesh, or
an audited topology component. Selectors record exact triangle counts and the
bake fails if a source mesh is renamed or its selected geometry changes. Do
not replace these selectors with color sampling or raster erasure: dock rig,
depth, foreground occlusion, and deck placement must all be derived from the
same final model-space geometry.

## Runtime files

- `<ship-slug>-dockside.png` is the complete color sprite and first draw layer.
- `<ship-slug>-dockside-foreground.png` contains geometry nearer to the camera
  than a sailor standing at that hull's deck-entry anchor.
- `<ship-slug>-dockside-depth.png` is the complete ship depth map.
- `<ship-slug>-dockside-sink-depth.png` is the model-height waterline bake used
  to split dry and submerged hull pixels.
- `<ship-slug>-city-dockside.png` and its matching
  `<ship-slug>-city-dockside-sink-depth.png` retain three times the native
  raster detail for the city visualizer. They are drawn at 1:1 logical pixels;
  do not enlarge the 320×160 assault sprite to substitute for them.
- `manifest.json` is authoritative for dimensions, deck geometry, anchors,
  fleet-relative scale, view metadata, attribution, and depth encoding.
- `src/portAssaultShipGeometry.js` is a generated native-coordinate catalog.
  `src/portAssaultShipAssets.js` combines it with deterministic runtime paths
  and fails loudly if the bake and production roster differ.

All color pixels use Resurrect 64 and binary alpha. Warm source colors use a
restricted warm subset during quantization so brown timber cannot drift into
Resurrect 64's olive ramp. Two muted mauves remain normally available to the
nearest-palette match so directional lighting can separate decks from hull sides;
genuinely green paint still has access to the green entries. Detailed textured hulls are
reduced to one sampled color per source
triangle before rasterization, and conservative connected-region cleanup
removes only tiny enclosed color flecks in the large dock art. Triangle color
reduction and hue-constrained quantization are also used by normal sailing and side-view
bakes. On the detailed Nao, galleon, and Portuguese carrack, upward-facing timber is
promoted to a sunlit timber plane color so decks remain legible against vertical hulls.
All ship bake lighting comes from high over the viewer's right shoulder, matching the
direction used by the surrounding hand-authored pixel art.
Each native city-dock bake also provides `up`, `level`, and `down` water-shadow masks.
They project the complete clipped model triangles against the water plane instead of
reprojecting scattered visible raster samples, so solid hulls cast contiguous shadows.
The city water renderer selects the matching mask as the hull bobs, so the shadow length
changes without moving the shadow off the water surface.
The depth map deliberately uses grayscale rather than the art
palette: transparent pixels have alpha 0; opaque ship pixels range from 1 at
the farthest visible surface to 255 at the nearest. Depth values are normalized
within this asset and must not be compared with another asset's depth values.

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
- `fleet-dock-rig-review.png` shows open, selected, bare, and final docked
  geometry for every hull. Selected cloth and sail-only hardware are magenta;
  this is the visual gate for incomplete selectors and floating battens.
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

For a source-level topology audit, print component indices, triangle counts,
bounds, source mesh/material names, and sampled colors without changing assets:

```sh
node tools/render-sail-ship-sprites.mjs --port-assault-components <ship-slug>
```

`npm run render:all-ships` also rebuilds this fleet after all production hulls
and side views. The private source models and their licenses remain under
`source-models`; only derived PNGs ship as runtime content. Attribution for
each hull is carried from the production render configuration into the
port-assault manifest.
