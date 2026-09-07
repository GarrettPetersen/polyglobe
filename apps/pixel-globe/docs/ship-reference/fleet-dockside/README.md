# Fleet dockside pixel-art workflow

All 43 production ships use a finished native pixel master. Model rendering still
owns projection, fleet scale, rig identity, deck geometry, depth, and waterline.
The painting owns visible color and the reviewed silhouette. Rebuilding must never
silently replace a missing painting with the unpainted model render.

## Art contract

- Use **Resurrect64**, binary alpha, and zero RGB in transparent pixels. Author the
  960×480 master at its native grid; display it with nearest-neighbor scaling.
- Match the ship's profile and overworld identity: hull proportions, mast count,
  rig type, superstructure, trim colors and distinctive construction. Docked sails
  may be furled or lowered, but structural yards must remain accounted for.
- Use quiet two- or three-tone material planes. Suggest wood with a few disconnected
  marks; do not tile every plank, add grain, dither, distressed paint, or random dust.
  Structural patterns that identify a vessel still matter: the turtle ship needs
  recognizable hexagonal armor plates, the double canoe two hulls, and the Atakebune
  its roofed superstructure.
- Compare the final sprite at 1× and 2×, against an authored city building and in
  both river and coastal water. An attractive enlarged intermediate is insufficient.

## Authoritative files

Each slug has these files under `art/ships/dockside/`:

| File | Purpose |
| --- | --- |
| `<slug>.png` | Editable, authoritative native master; open directly in Aseprite |
| `<slug>-geometry.png` | Reviewed unpainted geometry guide, on the same canvas |
| `<slug>-registration.json` | Geometry fingerprint, source frame/crop, allowed contour distance |
| `<slug>-paintover-reference.png` | Enlarged intermediate, retained for reproduction; not a runtime asset |
| `<slug>-conversion.json` | Converter version, palette, crop, cleanup, and input/output hashes |
| `<slug>-*-prompt.txt` | Exact image-model prompts, including corrective passes when needed |
| `palettes.json` | Explicit dockside and sailing pigment sets for every roster slug |

The approved galleon is the one conversion exception: preserve its existing
native master and use its [documented browser conversion](../galleon-dockside/README.md)
if reconstructing it from the enlarged reference. The batch converter deliberately
rejects `galleon` to avoid overwriting that accepted grid.

The sailing palette includes the dockside pigments and any additional sail colors
needed by the deployed rig. Overworld headings, rowing and turning poses, and
profiles are finished through the same per-ship palette. The galleon's ochre source
wood is remapped to muted mauve timber and its canvas to pale cream. This finishing
runs on fresh bakes; it never resizes geometry or changes alpha. Final masters are
not recolored during ordinary dockside rebakes.

## Reproduce existing production assets

Run from `apps/pixel-globe`, with the source models installed as described in
[ship-source-assets](../../ship-source-assets.md):

```sh
npm run render:all-ships
npm run render:game-icons
npm run render:ship-waterline-review
node tools/review-dockside-waterline.mjs --all
node --test src/shipDocksidePaintover.test.js src/shipPaintoverFinishing.test.js src/shipDockRigRetention.test.js src/shipFleetArtAssets.test.js src/portAssaultShipAssets.test.js
npm run city-visualizer:test
```

`render:all-ships` rebuilds the canonical sailing/profile families, all dockside
color and compositing layers, and packed ship layers. It requires no online image
service. To export only an edited native master:

```sh
node tools/render-sail-ship-sprites.mjs --port-assault-ship galleon
node tools/review-dockside-waterline.mjs galleon
```

A single-ship export preserves the full roster manifest and refreshes the fleet
contact sheet. Color, foreground, depth, and sink-depth must be rebuilt together.

## Create or revise a ship

1. Add or modify its canonical model/configuration and sailing/profile outputs.
   Inspect orientation, fleet-relative size, mast/yard layout, and waterline first.
   Do not paint over an incorrect guide. For battened rigs, inspect the hardware
   component report before declaring the docked rig correct:

   ```sh
   node tools/render-sail-ship-sprites.mjs --port-assault-components joseon-panokseon
   node tools/render-sail-ship-sprites.mjs --port-assault-ship joseon-panokseon --paintover-guides-only
   node tools/prepare-fleet-art.mjs --fresh-geometry joseon-panokseon
   ```

   Guide-only mode writes `.captures/fleet-art/geometry/<slug>.png` and `.json`;
   it does not publish unpainted production sprites. `prepare-fleet-art` writes
   enlarged `*-guide.png`, profile/overworld `*-identity.png`, and crop mappings.
   Without `--fresh-geometry`, it uses the committed reviewed geometry instead.
2. Preserve that guide's camera, hull, deck, mast tips and yard ends while painting.
   Use the identity reference and an authored city crop as references. Aseprite
   editing of the native master is sufficient. If using an image model, save the
   exact prompt and accepted enlarged reference; explicitly forbid invented cabins,
   extra yards, missing cloth, altered roof positions, or crew painted into the ship.
3. For a new or deliberately revised geometry registration, copy the exported
   `geometrySha256` and `{width,height,opaqueBounds}` into the registration's
   `sourceFrame`. Add explicit palettes to `palettes.json`. Initially retain a
   conservative `maximumDistancePx`; increase it only after inspecting the actual
   contour differences. Copy the accepted source guide to `<slug>-geometry.png`.
   Hash changes require visual review, not automatic acceptance in the bake.
4. Convert an enlarged reference with the local Pixel Fixer workflow below, or
   finish the native pixels directly in Aseprite. Keep the galleon's separate
   accepted conversion intact. If editing a native master by hand, update its
   conversion receipt to record that final edit and resulting image hash.
5. Review geometry correspondence before integration:

   ```sh
   node tools/review-dockside-paintover.mjs joseon-panokseon
   ```

   This compares against the freshly exported scratch geometry, writes a 2×
   comparison in `.captures/fleet-art/reviews/`, validates every pixel and reports
   the maximum contour distance. The hard ceiling is 32 native pixels; most ships
   use 1–10. A few sparse rig strokes use more. A shorter mast, moved cabin, missing
   yard or changed hull is not justified by passing this distance check. Inspect
   internal landmarks and missing geometry too. Store the reviewed integer radius
   in the registration, then rebuild the ship's dockside layers.
6. Review the waterline after painting. The rudder blade and lowest exterior hull
   must enter the water; the deck/gallery and boarding anchor must remain dry.
   Use the three-panel waterline review and the actual city scene, with selection
   and boarding foreground enabled. If draft changes, rebake all three sizes and
   refresh packed layers, menus, waterline reviews and manifests.
7. Run the asset/rig/palette tests, city tests, normal deployment gates, and the
   production build. Review the diff for unrelated generated files before release.

## Deterministic enlarged-reference conversion

The final fleet process uses the local **Retro Diffusion Pixel Fixer grid
reconstruction** library. It is not the hosted neural API. The hosted neural
endpoint was evaluated but could reframe and stretch a hull despite requesting
exact output dimensions, so it is not part of the production process.

Build the pinned MIT-licensed library once (Rust/Cargo required):

```sh
CARGO_TARGET_DIR=.captures/fleet-art/pixel-fixer-build cargo build --release --locked --manifest-path tools/pixel-fixer/Cargo.toml
node tools/finish-dockside-paintover.mjs joseon-turtle-ship
```

The library is [Retro-Diffusion/pixel-art-fixer](https://github.com/Retro-Diffusion/pixel-art-fixer),
revision `ef376e57e1c272633ca2dbf5f29ec3fcf6596465`, copyright Astropulse LLC, MIT.
`Cargo.lock` pins its dependency graph. The small portable wrapper uses the library's
reconstruction function with explicit row/column counts; it does not depend on the
upstream Windows-oriented executable or require an API key.

The converter:

1. Separates the known green chroma key from pigments, then quantizes the source.
   Background is **not** an ordinary nearest-palette candidate: doing that can
   erase cream sails and pale lower hulls. Regression tests cover this failure.
2. Takes the exact non-background crop and reconstructs it to the registered
   source silhouette's width and height, with grid smoothing and dithering off.
3. Places that raster at the registered bounds in the 960×480 canvas. It does not
   infer a new hull scale from a neural result or from the previously painted output.
4. Removes the key, enforces binary alpha and zero hidden RGB, and merges isolated
   color regions smaller than three pixels in one pass without changing silhouette.
5. Writes the master and a hash-bearing conversion receipt. Geometry registration
   remains a separate, reviewed decision.

A reconstruction can still lose a fine seam or introduce speckling when an image
model supplies gradients near a palette boundary. Simplify the source into flat
planes or edit the native master; do not repeatedly soften or dither the result.

## Rig and waterline invariants

The Panokseon, Hyeopseon and turtle-ship source meshes combine top yards with deployed
battens. Their reviewed yard components are explicitly retained while the remaining
battens are removed. The Sekibune's entire yard mesh is retained. Triangle-count
contracts and regression tests prevent future blanket hardware removal. The Chinese
junk family lowers folded cloth and stacked battens onto the booms.

Depth transfer uses the nearest reviewed source surface for newly painted contour
pixels and moves that sample in the camera plane. This is a bounded 2.5D approximation;
large geometric changes need a new model bake. Sink maps encode actual world height,
including sloping rudders. The city uses the uncapped lower exterior immersion mask;
it does not apply the tiny overworld sprite's five-row readability cap. Selection
and boarding foreground both exclude submerged pixels. Water shadows continue to
use the model's continuous triangle geometry at all three bob positions.

The fleet's final color contact sheet is
[port-assault/fleet-dockside-contact-sheet.png](../port-assault/fleet-dockside-contact-sheet.png).
Per-ship `*-dockside-waterline-review.png` files in that directory show the final
master, submerged mask and water composite. The rig-selection contact sheet remains
a diagnostic of the underlying model, not the final painted surface.

## Fleet verification — 2026-09-07

- Rebuilt all 43 dockside masters and their foreground, depth, sink-depth and
  shadow products, plus every sailing/profile family, packed layers and menu icons.
- The asset checks compare every dockside export byte-for-byte with its native
  master, validate its geometry registration, and check all sailing headings,
  rowing/turning poses and profiles against the explicit Resurrect64 pigment sets.
- Reviewed all 43 water composites and loaded every ship in London and Havana
  (86 city presentations, no browser errors). Retained yards were checked against
  fresh geometry guides; the turtle ship's hexagonal armor seams remain visible.
- The deployment suite passed all 6,002 tests and the city suite all 276 tests.
  The production build and source/type
  checks passed. Fresh playtesting passed four 100-step journeys plus the worker,
  economy, fleet and reserve campaigns; save/restore passed 13 frozen fixtures.

- The complete `test:reachability:fast` gate passed, including the built browser
  combat/voyage journey and scene/save restoration checks.

Release uses the repository's deployment test suite and browser reachability
gate. Keep the enlarged references and native masters together when changing a
ship; a successful geometry transfer does not replace visual review.
