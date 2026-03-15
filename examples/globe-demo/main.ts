import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  Globe,
  Sun,
  Atmosphere,
  WaterSphere,
  Starfield,
  applyTerrainToGeometry,
  applyPreset,
  getPreset,
  placeObject,
  type TileTerrainData,
} from "polyglobe";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d1520);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 100);
const starfield = new Starfield({
  density: 100,
  twinkleSpeed: 0.6,
  twinkleAmount: 0.65,
  color: 0xe8e8f0,
});
starfield.attachToCamera(camera);
scene.add(camera);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setClearColor(0x0d1520);
document.body.appendChild(renderer.domElement);

const globe = new Globe({ radius: 1, subdivisions: 3 });
scene.add(globe.mesh);

const tileTerrain = new Map<number, TileTerrainData>();
for (let i = 0; i < globe.tileCount; i++) {
  const type = i % 5 === 0 ? "water" : i % 5 === 1 ? "land" : i % 5 === 2 ? "mountain" : i % 5 === 3 ? "desert" : "forest";
  tileTerrain.set(i, { tileId: i, type, elevation: type === "mountain" ? 0.15 : type === "land" ? 0.04 : 0 });
}
applyTerrainToGeometry(globe.mesh.geometry, tileTerrain, 0.08);
(globe.mesh as THREE.Mesh).material = new THREE.MeshStandardMaterial({
  vertexColors: true,
  flatShading: true,
  side: THREE.FrontSide,
});
globe.mesh.renderOrder = 0;

applyPreset(camera, getPreset("strategy"), globe.radius);
camera.position.multiplyScalar(2.8);

// Fixed directional sun: one hemisphere lit, the other in shadow
const sun = new Sun({
  direction: new THREE.Vector3(0.5, 0.6, 0.4).normalize(),
  intensity: 2.2,
  ambientIntensity: 0.15,
  ambientColor: 0x202830,
});
sun.addTo(scene);

const atmosphere = new Atmosphere(scene, { timeOfDay: 0.5 });

const water = new WaterSphere({ radius: 0.98, opacity: 0.85 });
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
  starfield.update();
  water.setCameraPosition(camera.position);
  renderer.render(scene, camera);
}
animate();

window.addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
