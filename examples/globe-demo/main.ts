import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { Lensflare, LensflareElement } from "three/examples/jsm/objects/Lensflare.js";
import {
  Globe,
  Sun,
  Atmosphere,
  WaterSphere,
  Starfield,
  createGeodesicGeometryFlat,
  applyTerrainColorsToGeometry,
  applyTerrainToGeometry,
  createCoastMaskTexture,
  createCoastLandMaskTexture,
  CoastFoamOverlay,
  applyPreset,
  getPreset,
  placeObject,
  type TileTerrainData,
} from "polyglobe";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x030508);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 4000);
const starfield = new Starfield({
  density: 70,
  sparsity: 0.12,
  twinkleSpeed: 0.5,
  twinkleAmount: 0.5,
  color: 0xf0f4ff,
});
starfield.attachToCamera(camera);
scene.add(camera);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setClearColor(0x030508, 1);
document.body.appendChild(renderer.domElement);

const globe = new Globe({ radius: 1, subdivisions: 3 });
scene.add(globe.mesh);

// Continent generation: smooth random field so land clumps together (~50% water)
const landMask = new Float32Array(globe.tileCount);
let seed = 12345;
const rnd = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
};
for (let i = 0; i < globe.tileCount; i++) landMask[i] = rnd();
for (let iter = 0; iter < 6; iter++) {
  const next = new Float32Array(globe.tileCount);
  for (let i = 0; i < globe.tileCount; i++) {
    const t = globe.tiles[i];
    let sum = landMask[i];
    let n = 1;
    for (const j of t.neighbors) {
      sum += landMask[j];
      n++;
    }
    next[i] = sum / n;
  }
  for (let i = 0; i < globe.tileCount; i++) landMask[i] = next[i];
}
const LAND_THRESHOLD = 0.48;

// Latitude from tile center (y = 1 at north pole, -1 at south, 0 at equator)
const tileTerrain = new Map<number, TileTerrainData>();
const midLandTypes: TileTerrainData["type"][] = ["land", "forest", "mountain", "grassland"];
for (let i = 0; i < globe.tileCount; i++) {
  const isLand = landMask[i] > LAND_THRESHOLD;
  const y = globe.tiles[i].center.y;
  const absLat = Math.abs(y);

  let type: TileTerrainData["type"];
  let elevation: number;
  if (!isLand) {
    type = "water";
    elevation = -0.18;
  } else {
    if (absLat > 0.82) {
      type = rnd() < 0.7 ? "ice" : "snow";
      elevation = 0.06;
    } else if (absLat < 0.32) {
      type = rnd() < 0.65 ? "desert" : rnd() < 0.6 ? "land" : "forest";
      elevation = type === "desert" ? 0.05 : 0.1;
    } else {
      type = midLandTypes[Math.floor(rnd() * midLandTypes.length)];
      elevation = type === "mountain" ? 0.28 : 0.1;
    }
  }
  tileTerrain.set(i, { tileId: i, type, elevation });
}
// Water tiles that border land become beach so the visible edge under the surface reads as shoreline
for (let i = 0; i < globe.tileCount; i++) {
  const data = tileTerrain.get(i)!;
  if (data.type !== "water") continue;
  const hasLandNeighbor = globe.tiles[i].neighbors.some(
    (n) => tileTerrain.get(n)?.type !== "water"
  );
  if (hasLandNeighbor) {
    tileTerrain.set(i, { ...data, type: "beach" });
  }
}
const elevationScale = 0.2;
const flatGeometry = createGeodesicGeometryFlat(globe.tiles, {
  radius: globe.radius,
  getElevation: (id) => tileTerrain.get(id)?.elevation ?? 0,
  elevationScale,
});
applyTerrainColorsToGeometry(flatGeometry, tileTerrain);
globe.mesh.geometry.dispose();
globe.mesh.geometry = flatGeometry;
(globe.mesh as THREE.Mesh).material = new THREE.MeshStandardMaterial({
  vertexColors: true,
  flatShading: true,
  side: THREE.DoubleSide,
});
globe.mesh.renderOrder = 0;

const coastMaskTexture = createCoastMaskTexture(globe, tileTerrain, 256, 128);
const coastLandMaskTexture = createCoastLandMaskTexture(globe, tileTerrain, 256, 128);

const coastFoamOverlay = new CoastFoamOverlay(coastLandMaskTexture, {
  radius: 1.0,
  speed: 0.073,
  timeScale: 0.4,
});
scene.add(coastFoamOverlay.mesh);

applyPreset(camera, getPreset("strategy"), globe.radius);
camera.position.multiplyScalar(2.8);

// Fixed directional sun: one hemisphere lit, the other in shadow
// Visible sun sphere: farther away so it appears smaller in the sky
const sun = new Sun({
  direction: new THREE.Vector3(0.5, 0.6, 0.4).normalize(),
  distance: 3500,
  intensity: 2.2,
  ambientIntensity: 0.15,
  ambientColor: 0x202830,
  sphereRadius: 90,
  sphereColor: 0xfff5e0,
});
sun.addTo(scene);

// Lens flare on the sun — procedural textures (no external assets)
function createFlareTexture(size: number, soft: boolean = true): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  const r = size / 2;
  const g = ctx.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0, "rgba(255,255,255,0.9)");
  g.addColorStop(soft ? 0.2 : 0.4, "rgba(255,255,255,0.3)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.needsUpdate = true;
  return t;
}
const lensflare = new Lensflare();
lensflare.addElement(new LensflareElement(createFlareTexture(64, true), 120, 0, new THREE.Color(0xffffee)));
lensflare.addElement(new LensflareElement(createFlareTexture(32, true), 80, 0.4, new THREE.Color(0xffffee)));
lensflare.addElement(new LensflareElement(createFlareTexture(128, false), 200, 0.6, new THREE.Color(0xffffff)));
sun.directional.add(lensflare);

// Bloom: makes sun and bright stars glow
const composer = new EffectComposer(renderer);
composer.setPixelRatio(renderer.getPixelRatio());
composer.setSize(innerWidth, innerHeight);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(innerWidth, innerHeight),
  0.9,
  0.4,
  0.55
);
composer.addPass(bloomPass);

const atmosphere = new Atmosphere(scene, { timeOfDay: 0.5 });
scene.background = new THREE.Color(0x030508);

const water = new WaterSphere({
  radius: 0.995,
  color: 0x1a5a6a,
  colorPole: 0x2a3548,
  sunDirection: sun.directional.position.clone().normalize(),
  sunColor: 0xffffff,
  coastMask: coastMaskTexture,
  shorelineRadius: 1.0,
  size: 1.5,
  timeScale: 0.4,
});
scene.add(water.mesh);

// Small polymoon: same geodesic style, lighter and darker grays, secondary light source
const moonRadius = 0.14;
const moonDistance = 2.6;
const moonPosition = new THREE.Vector3(-0.6, -0.7, -0.4).normalize().multiplyScalar(moonDistance);
const moon = new Globe({ radius: moonRadius, subdivisions: 2 });
const moonTerrain = new Map<number, TileTerrainData>();
for (let i = 0; i < moon.tileCount; i++) {
  moonTerrain.set(i, {
    tileId: i,
    type: i % 2 === 0 ? "snow" : "mountain",
    elevation: 0.02,
  });
}
applyTerrainToGeometry(moon.mesh.geometry, moonTerrain, 0.04);
(moon.mesh as THREE.Mesh).material = new THREE.MeshStandardMaterial({
  vertexColors: true,
  flatShading: true,
  side: THREE.FrontSide,
});
moon.mesh.position.copy(moonPosition);
scene.add(moon.mesh);

// Moonlight: dim secondary light from the moon (cool gray)
const moonLight = new THREE.PointLight(0xb0b8c8, 0.5, moonDistance * 2.5, 1.5);
moonLight.position.copy(moonPosition);
scene.add(moonLight);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 1.5;
controls.maxDistance = 6;

const marker = new THREE.Mesh(
  new THREE.SphereGeometry(0.03, 12, 12),
  new THREE.MeshStandardMaterial({ color: 0xff4444 })
);
placeObject(marker, globe, { tileId: 42, heightOffset: 0.06 });
scene.add(marker);

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  starfield.update(camera);
  const sunDir = sun.directional.position.clone().normalize();
  water.setSunDirection(sunDir);
  water.update();
  coastFoamOverlay.setSunDirection(sunDir);
  coastFoamOverlay.update();
  composer.render();
}

window.addEventListener("resize", () => {
  const w = innerWidth;
  const h = innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
  composer.setPixelRatio(renderer.getPixelRatio());
});
animate();
