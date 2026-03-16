#!/usr/bin/env python3
"""
Read ETOPO1 NetCDF (e.g. ETOPO1_Bed_g_gmt4.grd) and write 360×180 float32 elevation.bin.
Row 0 = north (90°N), longitude -180..180. Meters (negative = bathymetry).
Usage: python3 etopo1_to_bin.py <input.nc> <output.bin>
Requires: netCDF4 (pip install netCDF4)
"""
import sys
import struct

def main():
    if len(sys.argv) != 3:
        sys.stderr.write("Usage: etopo1_to_bin.py <input.nc> <output.bin>\n")
        sys.exit(1)
    inp, out = sys.argv[1], sys.argv[2]
    try:
        from netCDF4 import Dataset
    except ImportError:
        sys.stderr.write("Requires netCDF4: pip install netCDF4\n")
        sys.exit(1)
    W, H = 360, 180
    ds = Dataset(inp, "r")
    # ETOPO1 GMT4: variable often 'z' or 'z'; dimensions (lat, lon) or (y, x)
    z = None
    for name in ("z", "altitude", "elevation", "Band1"):
        if name in ds.variables:
            z = ds.variables[name]
            break
    if z is None:
        sys.stderr.write("No elevation variable (z, altitude, elevation) in %s\n" % inp)
        sys.exit(1)
    dims = z.dimensions
    if len(dims) != 2:
        sys.stderr.write("Expected 2D variable, got %s\n" % dims)
        sys.exit(1)
    lat_dim, lon_dim = dims[0], dims[1]
    nlat, nlon = z.shape[0], z.shape[1]
    # stride to get 180×360
    step_y, step_x = max(1, nlat // H), max(1, nlon // W)
    fill_val = getattr(z, "_FillValue", None) or getattr(z, "missing_value", 32767)
    out_bin = open(out, "wb")
    # Output row 0 = north (90°N). ETOPO1 GMT4 lat often 90 → -90, so row 0 = 90.
    for j in range(H):
        src_j = j * step_y
        for i in range(W):
            src_i = i * step_x
            v = float(z[src_j, src_i])
            if v == fill_val or (v != v):
                v = 0.0
            out_bin.write(struct.pack("f", v))
    out_bin.close()
    ds.close()
    print("Wrote %s (%d×%d float32 m)" % (out, W, H))

if __name__ == "__main__":
    main()
