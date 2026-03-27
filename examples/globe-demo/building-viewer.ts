import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { BUILDING_DEFS } from "./buildings.js";

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let current: THREE.Object3D | null = null;
let index = 0;

function disposeObject(obj: THREE.Object3D): void {
  obj.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.geometry?.dispose();
    const mat = child.material;
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
    else mat?.dispose();
  });
}

function fitCameraToObject(
  cam: THREE.PerspectiveCamera,
  ctl: OrbitControls,
  obj: THREE.Object3D,
  padding = 1.35,
): void {
  const box = new THREE.Box3().setFromObject(obj);
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  box.getCenter(center);
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z, 0.01);
  const dist = ((maxDim * 0.5 * padding) / Math.tan((cam.fov * Math.PI) / 360));
  cam.position.copy(center).add(new THREE.Vector3(dist * 0.55, dist * 0.6, dist));
  cam.lookAt(center);
  ctl.target.copy(center);
  ctl.update();
}

function setIndex(i: number): void {
  index = ((i % BUILDING_DEFS.length) + BUILDING_DEFS.length) % BUILDING_DEFS.length;
  const def = BUILDING_DEFS[index]!;
  const select = document.getElementById("building-select") as HTMLSelectElement;
  if (select) select.value = def.id;
  const nameEl = document.getElementById("building-name");
  const descEl = document.getElementById("building-desc");
  if (nameEl) nameEl.textContent = def.name;
  if (descEl) descEl.textContent = def.description;
  if (current) {
    scene.remove(current);
    disposeObject(current);
    current = null;
  }
  const group = def.create();
  scene.add(group);
  current = group;
  fitCameraToObject(camera, controls, group);
}

function main(): void {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x131820);

  camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.01, 100);
  camera.position.set(2.1, 1.5, 2.4);
  camera.lookAt(0, 0.2, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.getElementById("canvas-wrap")!.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 0.2;
  controls.maxDistance = 50;

  scene.add(new THREE.AmbientLight(0x90a0b0, 0.45));
  const key = new THREE.DirectionalLight(0xffffff, 1.0);
  key.position.set(4, 6, 5);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x97acc4, 0.45);
  fill.position.set(-3, 2, -2);
  scene.add(fill);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(3, 40),
    new THREE.MeshStandardMaterial({
      color: 0x1b232e,
      roughness: 0.95,
      metalness: 0.03,
      flatShading: true,
    }),
  );
  floor.rotation.x = -Math.PI * 0.5;
  floor.position.y = 0;
  scene.add(floor);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.0, 1.02, 48),
    new THREE.MeshBasicMaterial({ color: 0x2b8cb2, transparent: true, opacity: 0.55 }),
  );
  ring.rotation.x = -Math.PI * 0.5;
  ring.position.y = 0.003;
  scene.add(ring);

  const select = document.getElementById("building-select") as HTMLSelectElement;
  for (const def of BUILDING_DEFS) {
    const opt = document.createElement("option");
    opt.value = def.id;
    opt.textContent = def.name;
    select.appendChild(opt);
  }
  select.addEventListener("change", () => {
    const i = BUILDING_DEFS.findIndex((d) => d.id === select.value);
    if (i >= 0) setIndex(i);
  });

  document.getElementById("btn-prev")!.addEventListener("click", () => setIndex(index - 1));
  document.getElementById("btn-next")!.addEventListener("click", () => setIndex(index + 1));
  document.getElementById("hint")!.textContent =
    `${BUILDING_DEFS.length} building prototypes. Tiny meshes intended for clustered urban tiles.`;

  setIndex(0);

  window.addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  const tick = (): void => {
    requestAnimationFrame(tick);
    controls.update();
    renderer.render(scene, camera);
  };
  tick();
}

main();

