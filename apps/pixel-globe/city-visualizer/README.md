# City visualizer

This is a standalone staging tool for the future in-game port view. It uses the
same responsive logical viewport function as the game, but it is not linked from
the player-facing menus yet.

Production: `https://pirates-of-the-pixel-globe.pages.dev/city-visualizer/`

Run `npm run city-visualizer:dev` from `apps/pixel-globe`, then open
`http://127.0.0.1:5177/city-visualizer/`.

Run `npm run city-visualizer:benchmark` from the repository root for the
repeatable London frame benchmark. Use `-- --camera pan` to measure continuous
edge scrolling, or `-- --city 'nanjing|china'` to select another catalog ID.
Reports are written below `apps/pixel-globe/build/performance/`.

## Rendering boundary

The visualizer builds and sorts its scene entries only when the selected city
or feature set changes. `src/cachedSceneRenderer.js` then collapses consecutive
static entries into offscreen Canvas2D batches. Those batches rebuild only when
their visible pixel projection, viewport, or hover treatment changes; ordinary
frames composite them with `drawImage` while water, clouds, smoke, flags, ships,
and people stay dynamic. The renderer is independent of the visualizer controls
so the same entry plan can move into the main game loop without importing the
standalone page.

## Canvas contract

- Canonical landscape: 455 × 256 logical pixels
- Widest landscape: 910 × 256
- Canonical portrait: 256 × 455
- Tallest portrait: 256 × 910
- Aseprite master: 1365 × 910
- Authored horizontal safe span: x=455 through x=1365
- Authored vertical scene bottom: y=583

The viewer uses the same two-stage fullscreen policy as the game: first choose
responsive logical dimensions, then continuously scale and center that canvas
to fill the browser display. The canonical crop remains y=327 through y=583.
Extra portrait height expands around its center, and the 256 × 910 extreme uses
the entire y=0 through y=910 Aseprite master. Coastal scenes pan within the
authored 910-pixel safe span, so a 910-pixel coastal viewport has no horizontal
travel. River scenes can pan across the entire 1365-pixel master even at that
width so both banks remain reachable. The camera uses RTS-style edge scrolling:
the center is a dead zone, speed increases toward either edge, and leaving the
canvas stops motion without changing the current view. Fractional fullscreen
canvas edges are clamped to the logical bounds so subpixel pointer coordinates
cannot stop the render loop. River scenes stop at their useful left-bank framing
instead of continuing into an all-land view; their full rightward range remains
available for inspecting the town and fortifications.

Every authored layer occurrence and synthetic entity has explicit scene `z`
and parallax-depth metadata. The renderer sorts static art, animated layers,
the ship, and NPCs together. This lets the gatehouse back and gate sit behind
walkers while its front wall draws above the foreground terrain. The three
castle sections retain a slight depth difference, capped so their relative
horizontal positions stay within three logical pixels. Duplicate layer names,
such as the two market rows, can have different values by occurrence.

The far castle wall has rearward parallax but draws above the road; depth never
implicitly determines z-order. The road-cast castle shadow is locked to the
road plane and draws immediately above it, while the foreground shadow draws
above foreground terrain.

The ocean is divided into horizon, distant, midground, and foreground bands at
render time and uses the loading screen's sine-wave pixel-row displacement.
Each band shares the parallax rate of the scenery touching it: horizon water
with horizon scenery, distant water with the distant shoreline, and both near
bands with the beach-road plane.
Beach variants remain rigid, unsliced layers because their authored shapes
already contain perspective. In river scenes, the intact left-bank assembly is
inset toward the city bank to produce a much narrower visible river channel.
Its horizon and distant terrain sit six logical pixels lower than the opposing
bank, suggesting a bend instead of a mirrored chokepoint.

Forest banks use near-shore parallax rather than distant-hill depth, so trees
read as nearby river terrain instead of horizon mountains. Their authored
river gap remains open throughout the pan.
The right-bank beach, its dock shadow, the ship, every dock component, the
road, walkers, gate opening, near gate face, waves, and surf share one parallax
level. They form a continuous walkable lane and shoreline whose authored joints
cannot separate. The dock shadow repeats each row's leftmost shadow pixel for
the 66-pixel portion of the dock that projects beyond the beach frame. Wave
underpaint is clipped to the beach's opaque pixels, so it never paints into an
area where no beach was authored. The repeated dock-shadow rows use the same
beach mask and remain below the animated shoreline, preventing shadow color
from leaking onto open water.

The behind-road business row retains real depth, but uses the right-hand town
view as its zero-displacement anchor. At that focus the upper and lower market
stalls return to their authored across-the-street alignment and the blacksmith
remains clear of the castle; depth separation grows only while panning away.

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
walk cycles are committed here in one packed Resurrect 64 atlas; the source
packs and archives remain in the private repository.

`cityPeopleCatalog.js` owns source archetypes and production palette variants.
`cityPeople.js` owns culture-aware ambient and garrison pools and deterministic
scene-only people. Every generated city record stores its
`populationProfileId`, so the mapping is portable to the game without importing
the visualizer renderer. The future recruitment and combat identity boundary is
documented in `PEOPLE.md`.

## Interaction boundary

The hovered destination label is drawn into the graded logical canvas. The city
name uses the post-grade overlay in production so it remains fixed white at all
times of day.
Shipyard, market, item store, inn, and fortified gatehouse are pixel-mask hit
targets. Hovering draws a one-logical-pixel yellow silhouette outline. Clicking
opens a small stand-in dialog at the same boundary where the existing game
modal will later be invoked.
