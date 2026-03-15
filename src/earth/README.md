# Earth geography on the hex globe

Sample real Earth land/sea (and optional elevation) onto geodesic tiles at **any subdivision**. Each tile center is converted to lat/lon and sampled against a raster or your own sampler.

## Quick start

1. Get a **land/sea raster** in equirectangular projection (longitude −180…180°, latitude 90°…−90°). Any resolution works (e.g. 360×180 or 720×360).
   - **Land = white (or non‑zero), sea = black (0).**
2. Load it as an image, draw to a canvas, then use `getImageData()` and `earthRasterFromImageData()` to get an `EarthRaster`.
3. Call `buildTerrainFromEarthRaster(globe.tiles, raster)` to get a `Map<tileId, TileTerrainData>`.
4. Optionally call `applyCoastalBeach(tiles, terrain)` so coastal water tiles become beach.
5. Use that map with `createGeodesicGeometryFlat` and `applyTerrainColorsToGeometry` as usual.

## Data sources

- **Natural Earth** (naturalearthdata.com): vector land polygons; rasterize to a PNG (e.g. 360×180) with land=white, sea=black.
- **GMT / GSHHG Earth mask**: pre‑made land/sea grids at 1° down to 15″ (see [GMT remote datasets](https://www.generic-mapping-tools.org/remote-datasets/earth-mask.html)).
- **NASA land/sea masks**: 0.1° or 0.25° resolution, NetCDF; you can export a single band to a PNG or raw array.
- **ETOPO1 / ETOPO2**: elevation; negative = ocean, positive = land. Use the elevation channel for both land/sea and terrain height.

## Custom sampler

If you have vector data (e.g. GeoJSON) or an API, use `buildTerrainFromSampler(tiles, (latRad, lonRad) => ({ land: boolean, elevationM?: number }))` instead of a raster.

## Resolution vs hex scale

The same raster works for any subdivision: more tiles (higher subdivision) = finer sampling of the same image. For a recognizable Earth, subdivision 3–5 with a 360×180 (or 720×360) land/sea image is usually enough.
