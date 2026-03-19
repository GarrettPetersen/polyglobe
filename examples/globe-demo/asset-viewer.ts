/**
 * Asset viewer: load and inspect 3D (glTF/GLB) and image assets from public/assets.
 * Requires assets-manifest.json (run: npm run list-assets).
 */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

interface ManifestEntry {
  path: string;
  name: string;
  folder: string;
}

const EXT_3D = new Set([".gltf", ".glb"]);
const EXT_IMG = new Set([".png", ".jpg", ".jpeg", ".webp"]);

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let currentObject: THREE.Object3D | null = null;
let currentMesh: THREE.Mesh | null = null; // for image-on-plane
let list: ManifestEntry[] = [];
let index = 0;
let loader: THREE.TextureLoader;
let gltfLoader: GLTFLoader;
/** Path of the asset we're currently loading; used to ignore stale async loads. */
let pendingAssetPath: string | null = null;

function getExt(path: string): string {
  return path.slice(path.lastIndexOf(".")).toLowerCase();
}

function is3D(path: string): boolean {
  return EXT_3D.has(getExt(path));
}

function isImage(path: string): boolean {
  return EXT_IMG.has(getExt(path));
}

function clearCurrent() {
  if (currentObject) {
    scene.remove(currentObject);
    disposeObject(currentObject);
    currentObject = null;
  }
  if (currentMesh) {
    scene.remove(currentMesh);
    if (currentMesh.geometry) currentMesh.geometry.dispose();
    if (Array.isArray(currentMesh.material)) {
      currentMesh.material.forEach((m) => m.dispose());
    } else if (currentMesh.material) {
      (currentMesh.material as THREE.Material).dispose();
    }
    currentMesh = null;
  }
}

function disposeObject(obj: THREE.Object3D) {
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry?.dispose();
      const mat = child.material;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat?.dispose();
    }
  });
}

function fitCameraToObject(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  object: THREE.Object3D,
  padding = 1.2
) {
  const box = new THREE.Box3().setFromObject(object);
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  box.getCenter(center);
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z);
  const distance = (maxDim / 2) * padding / Math.tan((camera.fov * Math.PI) / 360);
  camera.position.copy(center).add(new THREE.Vector3(distance * 0.5, distance * 0.6, distance));
  camera.lookAt(center);
  controls.target.copy(center);
  controls.update();
}

function load3D(url: string): Promise<THREE.Group> {
  return new Promise((resolve, reject) => {
    gltfLoader.load(
      url,
      (gltf) => {
        const root = gltf.scene;
        root.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material) {
            const mat = child.material as THREE.Material;
            if (!mat.transparent && mat.depthWrite !== undefined) {
              mat.depthWrite = true;
            }
          }
        });
        resolve(root);
      },
      undefined,
      reject
    );
  });
}

function loadImageAsPlane(url: string): THREE.Mesh {
  const tex = loader.load(url);
  tex.colorSpace = THREE.SRGBColorSpace;
  const geom = new THREE.PlaneGeometry(2, 2);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 1,
  });
  return new THREE.Mesh(geom, mat);
}

function showAsset(entry: ManifestEntry) {
  pendingAssetPath = entry.path;
  clearCurrent();
  const url = `/${entry.path}`;
  const pathEl = document.getElementById("asset-path");
  const errorEl = document.getElementById("error");
  if (pathEl) pathEl.textContent = entry.path;
  if (errorEl) errorEl.textContent = "";

  if (is3D(entry.path)) {
    load3D(url)
      .then((root) => {
        if (pendingAssetPath !== entry.path) {
          disposeObject(root);
          return;
        }
        clearCurrent();
        scene.add(root);
        currentObject = root;
        fitCameraToObject(camera, controls, root);
      })
      .catch((err) => {
        if (pendingAssetPath === entry.path && errorEl) {
          errorEl.textContent = `Load failed: ${err.message || String(err)}`;
        }
      });
  } else if (isImage(entry.path)) {
    try {
      const mesh = loadImageAsPlane(url);
      scene.add(mesh);
      currentMesh = mesh;
      fitCameraToObject(camera, controls, mesh, 1.5);
    } catch (err) {
      if (errorEl) errorEl.textContent = `Load failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  }
}

function setIndex(i: number) {
  if (list.length === 0) return;
  index = ((i % list.length) + list.length) % list.length;
  const entry = list[index];
  const sel = document.getElementById("asset-select") as HTMLSelectElement;
  if (sel) sel.value = entry.path;
  showAsset(entry);
}

function buildDropdown(): void {
  const select = document.getElementById("asset-select") as HTMLSelectElement;
  if (!select) return;
  select.innerHTML = "";
  const byFolder = new Map<string, ManifestEntry[]>();
  for (const e of list) {
    const folder = e.folder || "assets";
    if (!byFolder.has(folder)) byFolder.set(folder, []);
    byFolder.get(folder)!.push(e);
  }
  const folders = [...byFolder.keys()].sort();
  for (const folder of folders) {
    const optgroup = document.createElement("optgroup");
    optgroup.label = folder;
    for (const e of byFolder.get(folder)!) {
      const opt = document.createElement("option");
      opt.value = e.path;
      opt.textContent = e.name;
      optgroup.appendChild(opt);
    }
    select.appendChild(optgroup);
  }
  select.addEventListener("change", () => {
    const path = select.value;
    const i = list.findIndex((e) => e.path === path);
    if (i >= 0) setIndex(i);
  });
}

function main() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x14181e);

  camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.01, 100);
  camera.position.set(2, 1.5, 2);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.getElementById("canvas-wrap")!.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 0.2;
  controls.maxDistance = 50;

  scene.add(new THREE.AmbientLight(0x8090a0, 0.6));
  const dir = new THREE.DirectionalLight(0xffffff, 0.85);
  dir.position.set(4, 6, 5);
  scene.add(dir);
  const fill = new THREE.DirectionalLight(0xa0b0c0, 0.35);
  fill.position.set(-3, 2, -2);
  scene.add(fill);

  loader = new THREE.TextureLoader();
  gltfLoader = new GLTFLoader();

  fetch("/assets-manifest.json")
    .then((r) => {
      if (!r.ok) throw new Error("Manifest not found");
      return r.json();
    })
    .then((data: ManifestEntry[]) => {
      list = data;
      buildDropdown();
      if (list.length > 0) setIndex(0);
      const hint = document.getElementById("hint");
      if (hint) hint.textContent = `${list.length} assets. Use dropdown or Prev/Next.`;
    })
    .catch(() => {
      list = [];
      const hint = document.getElementById("hint");
      if (hint) hint.textContent = "Run npm run list-assets to generate assets-manifest.json.";
      const errorEl = document.getElementById("error");
      if (errorEl) errorEl.textContent = "No manifest. Run: npm run list-assets";
    });

  document.getElementById("btn-prev")!.addEventListener("click", () => setIndex(index - 1));
  document.getElementById("btn-next")!.addEventListener("click", () => setIndex(index + 1));

  window.addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  function tick() {
    requestAnimationFrame(tick);
    controls.update();
    renderer.render(scene, camera);
  }
  tick();
}

main();
