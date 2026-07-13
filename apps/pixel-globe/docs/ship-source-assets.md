# Ship source assets

Raw ship models live in the private GitHub repository
[`GarrettPetersen/polyglobe-ship-source-assets`](https://github.com/GarrettPetersen/polyglobe-ship-source-assets).
Clone its `main` branch into the ignored checkout at:

```text
apps/pixel-globe/source-models/
```

From the root of the public Polyglobe checkout:

```sh
git clone https://github.com/GarrettPetersen/polyglobe-ship-source-assets.git \
  apps/pixel-globe/source-models
```

Refresh an existing checkout without merging local source-asset changes:

```sh
git -C apps/pixel-globe/source-models pull --ff-only origin main
```

The directory is ignored by this public repository. The static-site builder copies only
`src/`, `index.html`, and `public/assets/`, so raw model files are never included in a
Cloudflare deployment.

The renderer accepts a different checkout through `PIXEL_GLOBE_SHIP_SOURCE_ROOT` and
expects this layout:

```text
unity/low-poly-cartoon-sailing-ships/Models/
unity/low-poly-cartoon-sailing-ships/Textures/texture main.png
sketchfab/polynesian-voyaging-canoe/scene.gltf
sketchfab/mesoamerican-dugout-canoe/scene.gltf
sketchfab/mediterranean-galley/scene.gltf
sketchfab/mediterranean-galley-furled/scene.gltf
blendswap/greek-trireme/trireme-bsw.blend
```

The Polynesian canoe, Mesoamerican canoe, and unfurled Mediterranean galley are
runtime ships. The furled galley and Greek trireme are retained as source references
and are not currently loaded by the game.

## Baking runtime assets

Run these commands from `apps/pixel-globe/` after refreshing the private checkout:

```sh
npm run render:native-boats
npm run render:mediterranean-galley
node --test src/shipInfoAssets.test.js
```

Both render commands generate the 16-heading sprite, lighting and shadow masks,
side view, wake anchors, and an exact per-pixel sink-depth map. Rowing or paddling
ships also receive one sprite and sink-depth map for every animation frame. The
generated runtime files are written under:

```text
public/assets/vehicles/unity-ships/
```

Do not copy these source files into `public/`. Unity Asset Store and Sketchfab Free
Standard source files may not be redistributed as standalone assets. Generated sprites,
lighting masks, shadows, and sink-depth maps belong in `public/assets/vehicles/`.
