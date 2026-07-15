# Ship waterline review

The #4d9be6 guide marks each production ship's model-space waterline
projected through the same camera as its side-view raster.

Regenerate the review with:

```sh
npm run render:ship-waterline-review
```

Unity fleet corrections belong in `waterlineOffsetY` on the corresponding
`unityShipRoster` entry. Re-bake one corrected Unity ship with:

```sh
npm run render:unity-ship -- <slug>
```

A negative offset lowers the waterline toward the keel; a positive offset raises it.
The bake rejects offsets outside the model bounds.

`lowestOpaqueRelativeToWaterlinePx` is the signed vertical distance from the guide
to the raster's lowest non-transparent pixel before the guide and background are drawn.
Red 3x3 markers show the projected pivot points used by procedural oars and paddles.
