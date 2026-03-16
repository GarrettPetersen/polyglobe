# Globe demo

Run `npm run dev` and open the app. Use Earth map mode to see real geography.

## Data (Earth mode) — all local

All data is loaded from **`public/`** (same-origin). Run `npm run download-data` once to fetch sources into `public/`, then `npm run setup-data` (or individual build-* scripts) to generate binaries. Commit `public/` so the repo works offline.

- **Land/sea**: `land-110m.json`, `ne_110m_lakes.json`, `ne_110m_geography_marine_polys.json`. Precomputed raster: `earth-region-grid.bin`, `land-raster-debug.png` (from `npm run build-land-raster-png`).
- **Climate**: `koppen.bin` (from `koppen_ascii.zip` via `npm run build-koppen`). Without it, latitude fallback is used.
- **Elevation**: `elevation.bin` (360×180 float32 m). `npm run build-elevation` writes synthetic peaks; with ETOPO1 + Python netCDF4 it can write real DEM. Sea level set so 0 m land sits just above water wave height.
- **3D peaks**: `mountains.json` from Natural Earth elevation points (`npm run build-mountains`). Build scripts read from `public/` when files exist.

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
3. **View raw raster**: Open `public/land-raster-debug.png` (3600×1800, white = land, black = water). Straits show as water. If a ring appears in the image, it comes from the source data or our drawing; we skip full-globe horizontal-line rings so they should not appear after the fix.
