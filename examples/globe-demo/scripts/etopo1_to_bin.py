#!/usr/bin/env python3
"""
Read ETOPO1 NetCDF and write elevation.bin with PGEL header + uint32 width/height + float32 grid.
Default 1440×720 (~0.25°). Legacy 360×180: pass 360 180 as args.

Usage: python3 etopo1_to_bin.py <input.nc> <output.bin> [width] [height]
Requires: netCDF4 (pip install netCDF4)
"""
import sys
import struct

def main():
    if len(sys.argv) < 3:
        sys.stderr.write(
            "Usage: python3 etopo1_to_bin.py <input.nc> <output.bin> [width] [height]\n"
        )
        sys.exit(1)
    inp, out = sys.argv[1], sys.argv[2]
    W = int(sys.argv[3]) if len(sys.argv) > 3 else 1440
    H = int(sys.argv[4]) if len(sys.argv) > 4 else 720
    if W < 360 or H < 180 or W > 8192 or H > 4096:
        sys.stderr.write("Bad dimensions\n")
        sys.exit(1)
    try:
        from netCDF4 import Dataset
    except ImportError:
        sys.stderr.write("Requires netCDF4: pip install netCDF4\n")
        sys.exit(1)
    ds = Dataset(inp, "r")
    z = None
    for name in ("z", "altitude", "elevation", "Band1"):
        if name in ds.variables:
            z = ds.variables[name]
            break
    if z is None:
        sys.stderr.write("No elevation variable in %s\n" % inp)
        sys.exit(1)
    nlat, nlon = z.shape[0], z.shape[1]
    fill_val = getattr(z, "_FillValue", None) or getattr(z, "missing_value", 32767)
    import numpy as np
    # Read coordinate axes when present; ETOPO1 commonly uses:
    #   lat: -90..90 (ascending)
    #   lon: 0..360 or -180..180
    lat_var = ds.variables.get("lat") or ds.variables.get("latitude") or ds.variables.get("y")
    lon_var = ds.variables.get("lon") or ds.variables.get("longitude") or ds.variables.get("x")
    if lat_var is None or lon_var is None:
        sys.stderr.write("Missing lat/lon coordinate variables; cannot georeference DEM.\n")
        sys.exit(1)
    lat_vals = np.asarray(lat_var[:], dtype=np.float64)
    lon_vals = np.asarray(lon_var[:], dtype=np.float64)
    if lat_vals.ndim != 1 or lon_vals.ndim != 1:
        sys.stderr.write("Expected 1D lat/lon axes.\n")
        sys.exit(1)
    if lat_vals.size != nlat or lon_vals.size != nlon:
        sys.stderr.write("lat/lon axis lengths do not match elevation grid shape.\n")
        sys.exit(1)

    lat_asc = lat_vals[0] < lat_vals[-1]
    lon_min = float(np.nanmin(lon_vals))
    lon_max = float(np.nanmax(lon_vals))
    use_0_360 = lon_min >= 0.0 and lon_max > 180.0

    # Target output georeference (row 0 = north, lon -180..180)
    out_lats = np.linspace(90.0, -90.0, H, dtype=np.float64)
    out_lons = np.linspace(-180.0, 180.0, W, dtype=np.float64)
    if use_0_360:
        out_lons = np.where(out_lons < 0.0, out_lons + 360.0, out_lons)

    # Precompute nearest source index per output axis.
    # np.searchsorted assumes ascending input, so flip descending axes.
    lat_search = lat_vals if lat_asc else lat_vals[::-1]
    lat_idx = np.searchsorted(lat_search, out_lats)
    lat_idx = np.clip(lat_idx, 1, nlat - 1)
    lat_left = lat_search[lat_idx - 1]
    lat_right = lat_search[lat_idx]
    choose_right = np.abs(lat_right - out_lats) < np.abs(out_lats - lat_left)
    lat_idx = lat_idx - 1 + choose_right.astype(np.int64)
    if not lat_asc:
        lat_idx = (nlat - 1) - lat_idx

    lon_search = lon_vals
    lon_idx = np.searchsorted(lon_search, out_lons)
    lon_idx = np.clip(lon_idx, 1, nlon - 1)
    lon_left = lon_search[lon_idx - 1]
    lon_right = lon_search[lon_idx]
    choose_right = np.abs(lon_right - out_lons) < np.abs(out_lons - lon_left)
    lon_idx = lon_idx - 1 + choose_right.astype(np.int64)

    # Read entire grid and georeference to target output.
    z_full = z[:]
    if np.ma.isMaskedArray(z_full):
        z_full = z_full.filled(float(fill_val))
    z_full = np.asarray(z_full, dtype=np.float32)
    out_data = np.zeros((H, W), dtype=np.float32)
    for j in range(H):
        src_j = int(lat_idx[j])
        for i in range(W):
            src_i = int(lon_idx[i])
            v = float(z_full[src_j, src_i])
            if v == fill_val or (v != v):
                v = 0.0
            out_data[j, i] = v
    ds.close()
    # Write header + data in one go
    with open(out, "wb") as f:
        f.write(b"PGEL")
        f.write(struct.pack("<II", W, H))
        out_data.tofile(f)
    print("Wrote %s (PGEL %d×%d float32 m)" % (out, W, H))

if __name__ == "__main__":
    main()
