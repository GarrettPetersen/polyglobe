# Pixel Globe Prototype

Standalone Canvas 2D prototype for rendering the subdivision-7 Earth polyglobe as a pixel-art tactics map.

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

Controls: arrow keys or WASD move north/south/east/west. Shift moves faster.
`[` / `]` step the annual weather day, `,` / `.` step the hour, and Space pauses/resumes the weather clock.

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
