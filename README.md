# Polyglobe

Reusable TypeScript package for a **low-poly 3D globe** built with Three.js. The globe is a geodesic sphere made of **12 pentagons** and a **variable number of hexagons**, with terrain, water, sun, camera presets, and tile-based placement.

## Features

- **Geodesic globe**: 12 pentagons + N hexagons (subdivision count configurable).
- **Terrain**: Land, water, mountain, desert, snow, forest, grassland, swamp; variable elevation per tile.
- **Sun**: Directional + ambient light; set by angle or time-of-day.
- **Camera presets**: Strategy (top-down), adventure (closer), orbit, top-down.
- **Atmosphere**: Day/night background tint, weather (clear, cloudy, overcast, fog).
- **Water**: Spherical water layer so “down” is always toward the planet center (gravity toward center). Custom Fresnel-style shader; can be swapped for packages like [threejs-water-shader](https://github.com/dgreenheck/threejs-water-shader) or [Three.js Water](https://threejs.org/docs/#examples/en/objects/Water) for advanced effects.
- **Placement**: Place objects by **tile ID** (hex/pentagon index) instead of x/y/z; helpers for position, orientation (up = away from center), height offset, and bearing.

## Install

```bash
npm install three
npm install polyglobe
```

`three` is a peer dependency.

## Quick start

```ts
import * as THREE from "three";
import {
  Globe,
  Sun,
  applyPreset,
  getPreset,
  Atmosphere,
  WaterSphere,
  applyTerrainToGeometry,
  placeObject,
  type TileTerrainData,
} from "polyglobe";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 100);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

const globe = new Globe({ radius: 1, subdivisions: 3 });
scene.add(globe.mesh);

// Terrain per tile
const tileTerrain = new Map<number, TileTerrainData>();
for (let i = 0; i < globe.tileCount; i++) {
  tileTerrain.set(i, { tileId: i, type: i % 4 === 0 ? "water" : "land", elevation: 0.05 });
}
applyTerrainToGeometry(globe.mesh.geometry, tileTerrain, 0.08);
globe.mesh.material = new THREE.MeshStandardMaterial({ vertexColors: true });

const sun = new Sun({ longitude: 0.5, latitude: 0.3 });
sun.addTo(scene);

const atmosphere = new Atmosphere(scene, { timeOfDay: 0.5 });
const water = new WaterSphere({ radius: 1.0 });
scene.add(water.mesh);

applyPreset(camera, getPreset("strategy"), globe.radius);
camera.position.multiplyScalar(2.5);

// Place a cube on tile 42
const cube = new THREE.Mesh(
  new THREE.BoxGeometry(0.05, 0.05, 0.05),
  new THREE.MeshStandardMaterial({ color: 0xff0000 })
);
placeObject(cube, globe, { tileId: 42, heightOffset: 0.02 });
scene.add(cube);

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();
```

## API overview

- **`Globe`** – Builds geodesic mesh; `globe.getTile(id)`, `globe.getTileCenter(id)`, `globe.getTilePose(id)` for tile-based data and placement.
- **`Sun`** – `setAngles(longitude, latitude)`, `setTimeOfDay(0..1)`, `addTo(scene)`.
- **`applyPreset(camera, getPreset("strategy" | "adventure" | "orbit" | "topDown"), globeRadius)`** – Apply camera preset.
- **`Atmosphere`** – `setTimeOfDay`, `setWeather("clear" | "cloudy" | "overcast" | "fog")`.
- **`WaterSphere`** – Spherical water at `radius`; optional `setCameraPosition()` for shader effects.
- **`applyTerrainToGeometry(geometry, tileTerrain, elevationScale)`** – Writes vertex colors and elevation from a `Map<tileId, TileTerrainData>`.
- **`placeObject(object, globe, { tileId, heightOffset?, bearing?, scale? })`** – Place a Three.js object on a tile by ID.
- **`getPlacementMatrix(globe, options)`** / **`getTileTransform(globe, options)`** – For custom placement or physics.

## Water and gravity

Water is rendered as a **sphere** at a fixed radius. So the water surface is always perpendicular to “down” (the radial direction), giving **gravity toward the planet center**. For fancier ocean rendering (waves, foam, caustics), you can replace or layer `WaterSphere` with:

- [threejs-water-shader](https://github.com/dgreenheck/threejs-water-shader)
- Three.js examples’ [Water](https://threejs.org/docs/#examples/en/objects/Water) (reflections)
- [Three.js Water Pro](https://threejs-water-pro.vercel.app/) (WebGPU, paid)
- [threejs-webgpu-ifft-ocean](https://github.com/spiri0/threejs-webgpu-ifft-ocean) (MIT)

Adapt them to use a spherical or curved surface and a radial “down” if your game logic needs it.

## Demo

A minimal globe renderer runs from the repo:

```bash
cd examples/globe-demo && npm install && npm run dev
```

Then open **http://localhost:5173/** — drag to orbit, scroll to zoom. The demo uses the local package source via Vite alias (no need to build the package first).

## License

MIT
