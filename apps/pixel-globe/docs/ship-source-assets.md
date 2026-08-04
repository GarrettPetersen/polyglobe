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

Original scripted model sources also live in that private checkout. The playable
Kelulus source is generated and baked with:

```sh
node apps/pixel-globe/source-models/procedural/kelulus/build-kelulus.mjs
npm --prefix apps/pixel-globe run render:kelulus
```

Its production rasters are written to
`apps/pixel-globe/public/assets/vehicles/unity-ships/`. Regenerate the visual
review in `apps/pixel-globe/docs/ship-reference/kelulus/` with
`npm --prefix apps/pixel-globe run render:kelulus-reference`.

The related Penjajap, Lancaran, and Royal Lancaran share one original source
builder and production command:

```sh
npm --prefix apps/pixel-globe run render:malay-warships
```

The source builder writes separate GLTF models beneath `procedural/`, then the
normal ship pipeline produces all 32 headings, six rowing phases, lighting,
shadows, sink depth, waterline footprints, wake anchors, flag anchors, side
views, and menu icons. The designs use Deni Kaharudin's non-downloadable
Malacca warship studies as a visual proportion reference; no source geometry
was copied.

The medium Ocean Dhow uses Nisa Nurul Azizah's CC BY 4.0
[Low Poly Ancient Dhow Ship](https://sketchfab.com/3d-models/low-poly-ancient-dhow-ship-f25b4552dce24d379833160dd217db84).
The complete downloaded glTF package and license are kept in the private source
repository. Bake it with:

```sh
npm --prefix apps/pixel-globe run render:ocean-dhow
```

It is treated as a generic broad-beamed, two-masted Indian Ocean merchant
rather than a later, narrowly named regional subtype. Its raw mesh is Z-up with
the bow on positive X, while the imported scene adds a presentation yaw and
slight pitch. The bake uses a measured right/up/forward basis and writes a
labelled cardinal orientation review beside the ship reference documentation.

The renderer accepts a different checkout through `PIXEL_GLOBE_SHIP_SOURCE_ROOT` and
expects this layout:

```text
unity/low-poly-cartoon-sailing-ships/Models/
unity/low-poly-cartoon-sailing-ships/Textures/texture main.png
sketchfab/polynesian-voyaging-canoe/scene.gltf
sketchfab/mesoamerican-dugout-canoe/scene.gltf
sketchfab/mediterranean-galley/scene.gltf
sketchfab/mediterranean-galley-furled/scene.gltf
sketchfab/joseon-turtle-ship/scene.gltf
sketchfab/joseon-panokseon/scene.gltf
sketchfab/kamakura-umi-bune/scene.gltf
sketchfab/atakebune-japanese-warship/scene.gltf
booth/hirokazu-kobayashi-kobaya/kobaya-v1.2.fbx
booth/hirokazu-kobayashi-sekibune/sekibune-v1.2.fbx
sketchfab/nao-victoria/scene.gltf
sketchfab/portuguese-carrack/scene.gltf
sketchfab/dhow-gogiart/scene.gltf
sketchfab/cyc3w-sailing-ship/scene.gltf
sketchfab/borobudur-sriwijaya/scene.gltf
sketchfab/ottoman-coastal-trader/scene.gltf
sketchfab/north-atlantic-right-whale/scene.gltf
sketchfab/blue-whale/scene.gltf
sketchfab/humpback-whale/scene.gltf
sketchfab/southern-minke-whale/scene.gltf
sketchfab/sperm-whale/source/model.fbx
sketchfab/cartoon-horse-with-animations/scene.gltf
sketchfab/wooden-cart/scene.gltf
procedural/kelulus/scene.gltf
sketchfab/low-poly-ancient-dhow-ship/scene.gltf
procedural/penjajap/scene.gltf
procedural/lancaran/scene.gltf
procedural/royal-lancaran/scene.gltf
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
npm run render:joseon-turtle-ship
npm run render:joseon-panokseon
npm run render:japanese-kuribune
npm run render:japanese-sekibune
npm run render:japanese-atakebune
npm run render:spanish-nao
npm run render:portuguese-carrack
npm run render:dhow
npm run render:ocean-dhow
npm run render:galleon
npm run render:nusantaran-outrigger
npm run render:kelulus
npm run render:malay-warships
npm run render:ottoman-coastal-trader
npm run render:whales
npm run render:horse-cart
npm run render:llama-caravan
node --test src/shipInfoAssets.test.js
```

These render commands generate the 32-heading sprite, lighting and shadow masks,
side view, wake anchors, and an exact per-pixel sink-depth map. Rowing or paddling
ships also receive one sprite and sink-depth map for every animation frame. The
generated runtime files are written under:

```text
public/assets/vehicles/unity-ships/
```

All whales use the same fixed-scale, 32-heading hard-edge rasterizer, but write
their sprites, exact model-height sink-depth maps, and manifest to
`public/assets/animals/`. Those exact depth maps drive surfacing and underwater
refraction at runtime.

Do not copy these source files into `public/`. Unity Asset Store and Sketchfab Free
Standard source files may not be redistributed as standalone assets. Generated ship sprites,
lighting masks, shadows, and sink-depth maps belong in `public/assets/vehicles/`; generated
whale assets belong in `public/assets/animals/`.

The horse and cart are combined offline into a small 32-heading ground-trader
sprite under `public/assets/vehicles/horse-cart/`. The horse's authored walk
animation is sampled into six hard-edged frames; neither source model is shipped.

The Inca land trader uses three independently positioned pack llamas with
procedural sacks. One loaded llama's six-frame, 32-heading bake is written under
`public/assets/vehicles/llama-caravan/`; runtime repeats it along the curved road
so each animal turns when it reaches a bend. The labeled cardinal review verifies
that the rig's head-to-tail axis points in the same direction as travel.
