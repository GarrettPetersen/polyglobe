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
    step_y, step_x = max(1, nlat // H), max(1, nlon // W)
    fill_val = getattr(z, "_FillValue", None) or getattr(z, "missing_value", 32767)
    import numpy as np
    # Read entire grid and resample efficiently
    z_full = z[:]
    out_data = np.zeros((H, W), dtype=np.float32)
    for j in range(H):
        src_j = min(j * step_y, nlat - 1)
        for i in range(W):
            src_i = min(i * step_x, nlon - 1)
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
