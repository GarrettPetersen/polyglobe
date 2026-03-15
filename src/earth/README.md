# Earth geography on the hex globe

Sample real Earth land/sea, **climate** (desert vs rainforest), **elevation** (mountains), and **temperature** (frozen water) onto geodesic tiles at **any subdivision**. Each tile is sampled at lat/lon against your rasters or a custom sampler.

## How the pipeline uses the data

- **Elevation** (optional `raster.elevation` in meters): Tiles above `mountainThresholdM` (default 1500 m) become **mountain**; elevation also drives geometry height. If you don’t attach elevation, no mountains are generated from data (only from procedural logic if any).
- **Climate / Köppen** (optional `raster.climate`): Encodes **precipitation and temperature**; used for **deserts** (BWh, BWk), **rainforest** (Af, Am), grassland, and land **ice/snow** (ET, EF). This is the main source for “rainfall” (and temperature) for biomes.
- **Temperature** (optional `raster.temperatureC` in °C): When a **water** tile has temperature below `freezeThresholdC` (default 1.5 °C), it becomes **ice** (frozen water). Use for Arctic/Antarctic ocean and cold seas.

## Quick start

1. Get a **land/sea raster** in equirectangular projection (longitude −180…180°, latitude 90°…−90°). Any resolution works (e.g. 360×180 or 720×360). **Land = white (or non‑zero), sea = black (0).**
2. Load it as an image, draw to a canvas, then use `getImageData()` and `earthRasterFromImageData()` to get an `EarthRaster`.
3. Optionally attach **climate** (Köppen–Geiger) so deserts and rainforests are correct: use `parseKoppenAsciiGrid(asciiText)` to get a `ClimateGrid` and set `raster.climate = grid`. See data sources below.
4. Optionally attach **elevation** (meters) via `raster.elevation = elevationFromImageData(imageData, scale, offset)` or your own `Float32Array` for mountains.
5. Optionally attach **temperature** (°C) via `raster.temperatureC` (same dimensions as `data`) for frozen water (ice).
6. Call `buildTerrainFromEarthRaster(globe.tiles, raster)` to get a `Map<tileId, TileTerrainData>`.
7. Optionally call `applyCoastalBeach(tiles, terrain)` so coastal water tiles become beach.
8. Use that map with `createGeodesicGeometryFlat` and `applyTerrainColorsToGeometry` as usual.

## Data sources

### Land/sea

- **Natural Earth** (naturalearthdata.com): vector land polygons; rasterize to a PNG (e.g. 360×180) with land=white, sea=black.
- **GMT / GSHHG Earth mask**: pre‑made land/sea grids at 1° down to 15″ (see [GMT remote datasets](https://www.generic-mapping-tools.org/remote-datasets/earth-mask.html)).
- **NASA land/sea masks**: 0.1° or 0.25° resolution, NetCDF; export a single band to PNG or raw array.

### Climate (desert vs rainforest)

**Köppen–Geiger** is the right source for biomes: it uses precipitation and temperature, so the Amazon is rainforest (Af) and the Sahara is desert (BWh). Latitude alone is wrong (it was marking the tropics as desert).

- **Peel et al. (2007)** 0.1° ASCII: [koppen_ascii.zip](https://people.eng.unimelb.edu.au/mpeel/Koppen/koppen_ascii.zip). ArcGIS ASCII format; parse with `parseKoppenAsciiGrid(text)`.
- **Kottek et al. (2006) / Vienna** 0.5° ASCII: [Koeppen-Geiger-ASCII.zip](https://koeppen-geiger.vu-wien.ac.at/data/Koeppen-Geiger-ASCII.zip). Same format.
- Codes 1–30 map to Af, Am, Aw, BWh, BWk, BSh, BSk, Csa…Cfc, Dsa…Dfd, ET, EF. The pipeline maps these to `forest`, `desert`, `grassland`, `land`, `snow`, `ice` as appropriate.

### Elevation (mountains)

- **ETOPO1** (1 arc‑minute): [NOAA ETOPO1](https://www.ngdc.noaa.gov/mgg/global/global.html). Export or downsample to a single-band raster; use `elevationFromImageData()` with scale/offset (e.g. scale 10000, offset -500 for 0–255 → about -500 m to ~9450 m).
- **SRTM**, **ASTER GDEM**: other options; same idea: get a global equirectangular raster of elevation in meters (or 0–255 with known scale/offset) and fill `raster.elevation` (e.g. via `elevationFromImageData` or a custom `Float32Array`).

### Temperature (frozen water)

- **WorldClim**, **CHELSA**, **CRU**: global temperature rasters (mean annual or winter min in °C). Same grid dimensions as your land raster; fill `raster.temperatureC` (Float32Array). Water tiles with `temperatureC < freezeThresholdC` (default 1.5 °C) become **ice**.
- **Köppen** already encodes cold (ET, EF) for *land*; the temperature layer is used to mark *water* tiles as frozen (e.g. Arctic Ocean).

## Custom sampler

If you have vector data (e.g. GeoJSON) or an API, use `buildTerrainFromSampler(tiles, (latRad, lonRad) => ({ land: boolean, elevationM?: number }))` instead of a raster.

## Resolution vs hex scale

The same rasters work for any subdivision: more tiles = finer sampling. For a recognizable Earth, subdivision 3–5 with a 360×180 (or 720×360) land/sea image is usually enough.
