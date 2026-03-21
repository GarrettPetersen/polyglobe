# Globe demo

Run `npm run dev` and open the app. Use Earth map mode to see real geography.

### River hex viewer (mini app)

The main dev server opens the **full globe** at `/`. For the **river hex pattern gallery** (flat hexes only — no Earth):

- **`npm run dev:rivers`** or **`make demo-rivers`** opens **`/river-hex-viewer.html`**, or use **“River hex patterns →”** (top-right on the main demo).

That page shows **seven canonical configurations** (1 edge, two-edge gaps 1/2/3, sample 3- and 4-edge cases). Yellow = river edges. No terrain data required.

## Data (Earth mode) — all local

All data is loaded from **`public/`** (same-origin). Run `npm run download-data` once to fetch sources into `public/`, then `npm run setup-data` (or individual build-* scripts) to generate binaries. Commit smaller `public/` assets so the repo works offline.

- **Land/sea**: `land-50m.json`, `ne_110m_lakes.json`, `ne_110m_geography_marine_polys.json`. **`earth-region-grid.bin` (~198MB) is gitignored** (over GitHub’s 100MB limit). Generate locally: `npm run download-data && npm run build-land-raster-png` (also writes `land-raster-debug.png`). **Without the bin**, Earth mode still runs: the demo builds a coarser raster from TopoJSON in the browser (slower). **`npm run build-earth-globe-cache` requires the bin** — run the build step above first on a new machine.
- **Climate**: `koppen.bin` (from `koppen_ascii.zip` via `npm run build-koppen`). Without it, latitude fallback is used.
- **Elevation**: `elevation.bin` — **PGEL** header (`PGEL` + width + height) + float32 DEM (default **1440×720**, ~0.25°; legacy **360×180** still works). Bilinear sampling. Land hex height = biome base + capped DEM lift + mountain peak extra (`terrainDemMeterScale`, `maxTerrainDemLiftGlobe`, optional `elevationQuantizationM` for stepped meters). `npm run build-elevation`: synthetic PGEL or ETOPO1 via `etopo1_to_bin.py` (pass width/height to change res).
- **3D peaks**: `mountains.json` from Natural Earth elevation points (`npm run build-mountains`). Build scripts read from `public/` when files exist.

### Earth globe cache (per subdivision)

The demo loads **`public/earth-globe-cache-{n}.json`** for the current scale (`n` = subdivisions 1–7). For **subdivisions = 6** it also tries legacy **`earth-globe-cache.json`**. Version must match **`earthGlobeCacheVersion.ts`** (`EARTH_GLOBE_CACHE_VERSION`, with optional legacy `6-v17` for old 6-only files).

- **Regenerate** (default: subdivision 6 only, also writes `earth-globe-cache.json`):  
  `npm run build-earth-globe-cache`
- **One subdivision** (e.g. 7):  
  `npm run build-earth-globe-cache -- 7`
- **Several sizes** (6 and 7):  
  `npm run build-earth-globe-cache-all` or `npm run build-earth-globe-cache -- 6 7`  
  Subdivision 7 is much larger (~160k tiles) and slow to build.
- **Strait tile IDs** in the terrain resolver are **only applied at subdivision 6** (tile IDs change at other scales).
- **Force full in-browser recompute**: add **`?noEarthCache=1`** to the URL.
- **Performance (subdivision 7, ~163k tiles)**: the demo auto-tiers **device pixel ratio** (cap **0.85**), **512² shadow maps** with **BasicShadowMap**, **no lensflare**, **smaller coast masks / foam grid / inner sphere**, **tighter vegetation** (fewer plants per hex, ~900 max instances per type, update every 8 frames, aggressive hemisphere cull), and **half-rate water & foam updates** plus **quarter-rate cloud depth sort**. Subdivision 6 keeps higher quality settings. **EffectComposer / bloom** is not used (direct `renderer.render` only).

### Rivers (Earth)

The demo draws a **transparent water ribbon** plus **solid U-shaped banks and a bed** (`createRiverTerrainMeshes`): straight-through hexes use two lofted bank strips (geodesic corners) and a flat bed; bends/forks fall back to the cutout extrusion path. Pentagons are not river terrain targets.

## Debug (rings / polar artifacts)

### Why the “straight line around the globe” rings exist (TopoJSON schema)

The TopoJSON schema has **no separate “boundary” or “clip” object**. The file has:

- **`objects.land`**: a single `GeometryCollection` with one `MultiPolygon`. Each polygon ring references shared **`arcs`** (delta-encoded segments).
- **`bbox`**: `[minLon, minLat, maxLon, maxLat]`. For world-atlas land-110m this is about `[-180, -85.6, 180, 83.6]` — the dataset doesn’t extend to the poles.
- **`transform`**: scale/translate to turn integer arc coordinates into lon/lat.

The “rings” you see (horizontal lines at constant latitude that span the full globe) are **normal arcs** in that same `land` MultiPolygon. They are the **data extent boundary**: the northern/southern clip of the source (e.g. Natural Earth 110m) is encoded as real polygon rings. So there is no “artifact” flag in the schema — we detect them by geometry: a ring with nearly constant latitude and longitude span ≥ 350° is treated as a data-boundary artifact and skipped when drawing.

### Inspecting and viewing the raster

1. **Inspect topology**: Open the browser console. On load you’ll see `[Earth raster] Topology objects: [...] bbox: [...]`. That shows which layers exist in the TopoJSON (e.g. only `land` in world-atlas) and the data extent.
2. **Precomputed region grid (recommended)**: Run `npm run build-land-raster-png` to generate `public/earth-region-grid.bin` and `public/land-raster-debug.png`. The demo loads the bin once and samples only at tile center + vertices (no canvas, no connected components in-browser). If the bin is missing, the demo falls back to building the raster from TopoJSON in the browser (slower).
3. **View raw raster**: Open `public/land-raster-debug.png` (7200×3600, white = land, black = water).
