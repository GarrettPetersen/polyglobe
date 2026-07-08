# Pixel Globe Prototype

Standalone Canvas 2D prototype for rendering the subdivision-7 Earth polyglobe as a pixel-art tactics map.

It deliberately does not render the 3D globe. The app:

- builds the geodesic tile graph in plain JavaScript,
- loads the shared `examples/globe-demo/public/earth-globe-cache-7.json`,
- stamps copied Three Kingdoms terrain sprites as detached tile blobs,
- animates water with staggered two-frame Three Kingdoms shallow/deep sprites,
- generates between-tile face polygons at runtime, including pentagon neighborhoods,
- moves a local tangent-plane camera over the spherical tile graph,
- renders a rolling local unwrap where tile pixel positions are fixed when they enter the viewport,
- draws a tiny Mercator minimap from averaged land/sea tile coverage.

Run from the repo root:

```sh
npm run pixel-globe:dev
```

Then open `http://127.0.0.1:5177/`.

Controls: arrow keys or WASD move north/south/east/west. Shift moves faster.
