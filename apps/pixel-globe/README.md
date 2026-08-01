# Marque & Reprisal Prototype

Standalone Canvas 2D prototype for **Marque & Reprisal**, a pixel-art sailing, trade, and exploration game set in 1522.

It deliberately does not render the 3D globe. The app:

- builds the geodesic tile graph in plain JavaScript,
- loads the shared `examples/globe-demo/public/earth-globe-cache-7.json`,
- stamps copied Three Kingdoms terrain sprites as detached tile blobs,
- animates water with staggered two-frame Three Kingdoms shallow/deep sprites,
- blends generated intermediate water sprites across coast-distance bands for smoother dropoff,
- loads the shared annual weather/runtime bakes for clouds, rain, snow, sea ice, freshwater ice, and selected-hex wind,
- generates between-tile face polygons at runtime, including pentagon neighborhoods,
- moves a local tangent-plane camera over the spherical tile graph,
- renders a rolling local unwrap where tile pixel positions are fixed when they enter the viewport,
- draws a tiny Mercator minimap from averaged land/sea tile coverage.

Run from the repo root:

```sh
npm run pixel-globe:dev
```

Then open `http://127.0.0.1:5177/`.

Build the static Cloudflare Pages bundle from the repo root:

```sh
npm run pixel-globe:build
```

The build output is `apps/pixel-globe/dist`.

Deploy the full browser build to the existing Cloudflare Pages project with:

```sh
npm ci
npm --prefix examples/globe-demo ci
npm --prefix apps/pixel-globe ci
npm --prefix apps/pixel-globe run deploy
```

Deployment reads `PRODUCTION_CLOUDFLARE_ACCOUNT_ID` and
`PRODUCTION_CLOUDFLARE_API_TOKEN` from the environment or the ignored root
`.env` file. Pushes to `master` that change the game, its shared runtime data,
or the deployment workflow automatically test, build, and deploy the full game
through `.github/workflows/deploy-pixel-globe.yml`.

Build the unlimited HTML5 demo ZIP for itch.io:

```sh
make pixel-globe-demo-itch
```

The upload-ready archive is
`apps/pixel-globe/build/marque-and-reprisal-demo-itch.zip`. It contains
`index.html` at the ZIP root, uses relative runtime paths for itch.io's
subdirectory hosting, and validates itch.io's default file, path, and size
limits before packaging.

The demo has no voyage timer. It exposes the complete sandbox but keeps the
captain in the ship selected at the start of the run: shipyard purchases,
surrendered prizes, and the Viking longship reward are shown with a disabled
padlock control.

Controls: arrow keys or WASD steer. Space or Enter activates the available interaction.

Standard gamepads are fully supported. The left stick or D-pad steers and navigates,
the south face button confirms or interacts, the east face button goes back, the west
face button anchors, and the north face button scavenges or releases a tethered whale.
Shoulders or triggers fire the corresponding broadside, Start opens the captain's chart
or pauses battle, and the right stick scrolls long panels.

Developer weather controls are available only with `?debugWeather=true`.
`[` / `]` step the annual weather day, `,` / `.` step the hour, and Backslash pauses/resumes the weather clock.

The default terrain variant is `resurrect-64`. Palette and start-location test URLs.
Available local terrain variants include
`full-color`, `vinik24`, `fantasy-24`, `resurrect-64`, `lost-century`,
and `apollo`.

```text
http://127.0.0.1:5177/?lat=31.2&lon=121.5
http://127.0.0.1:5177/?lat=70&lon=-135&day=20&hour=12
http://127.0.0.1:5177/?terrain=full-color&lat=31.2&lon=121.5
http://127.0.0.1:5177/?terrain=vinik24&lat=23.5&lon=13
```
