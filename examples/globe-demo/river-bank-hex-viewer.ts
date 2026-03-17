/**
 * Single-hex river bank mesh using buildRiverBankExtrusionGeometry (same as globe banks).
 */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { buildRiverBankExtrusionGeometry } from "polyglobe";

const R = 1;
const Z_TOP = 1;
const Z_BOT = 0.86;
const INNER_FRAC = 0.58;

const PATTERNS: { edges: number[] }[] = [
  { edges: [0] },
  { edges: [0, 1] },
  { edges: [0, 2] },
  { edges: [0, 3] },
  { edges: [0, 1, 2] },
  { edges: [0, 2, 4] },
];

function regularHexCorners2d(): [number, number][] {
  const O: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const ang = (Math.PI / 3) * i - Math.PI / 6;
    O.push([Math.cos(ang) * R, Math.sin(ang) * R]);
  }
  return O;
}

function flatFrame(): { normal: THREE.Vector3; ex: THREE.Vector3; ey: THREE.Vector3 } {
  return {
    normal: new THREE.Vector3(0, 0, 1),
    ex: new THREE.Vector3(1, 0, 0),
    ey: new THREE.Vector3(0, 1, 0),
  };
}

function tiltedFrame(): { normal: THREE.Vector3; ex: THREE.Vector3; ey: THREE.Vector3 } {
  const normal = new THREE.Vector3(0.4, 0.65, 0.64).normalize();
  let ex = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), normal);
  if (ex.lengthSq() < 1e-8) {
    ex = new THREE.Vector3().crossVectors(new THREE.Vector3(1, 0, 0), normal);
  }
  ex.normalize();
  const ey = new THREE.Vector3().crossVectors(normal, ex).normalize();
  return { normal, ex, ey };
}

function hexTopWireframe(corners2d: [number, number][], z: number, frame: ReturnType<typeof flatFrame>) {
  const pos: number[] = [];
  const { normal, ex, ey } = frame;
  const p = new THREE.Vector3();
  for (let i = 0; i < 6; i++) {
    const a = corners2d[i];
    const b = corners2d[(i + 1) % 6];
    p.copy(normal)
      .multiplyScalar(z)
      .addScaledVector(ex, a[0])
      .addScaledVector(ey, a[1]);
    pos.push(p.x, p.y, p.z);
    p.copy(normal)
      .multiplyScalar(z)
      .addScaledVector(ex, b[0])
      .addScaledVector(ey, b[1]);
    pos.push(p.x, p.y, p.z);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  return new THREE.LineSegments(
    g,
    new THREE.LineBasicMaterial({ color: 0xff44aa, transparent: true, opacity: 0.85 })
  );
}

let bankMesh: THREE.Mesh;
let rim: THREE.LineSegments;
let scene: THREE.Scene;

function rebuild() {
  const sel = document.getElementById("pattern") as HTMLSelectElement;
  const tilted = (document.getElementById("tilted") as HTMLInputElement).checked;
  const idx = Math.min(PATTERNS.length - 1, Math.max(0, parseInt(sel.value, 10) || 0));
  const riverEdges = new Set(PATTERNS[idx].edges);
  const corners2d = regularHexCorners2d();
  const frame = tilted ? tiltedFrame() : flatFrame();

  const geom = buildRiverBankExtrusionGeometry({
    corners2d,
    riverEdges,
    innerFrac: INNER_FRAC,
    rTop: Z_TOP,
    rBot: Z_BOT,
    normal: frame.normal,
    ex: frame.ex,
    ey: frame.ey,
  });

  scene.remove(bankMesh, rim);
  bankMesh.geometry.dispose();
  (bankMesh.material as THREE.Material).dispose();
  rim.geometry.dispose();
  (rim.material as THREE.Material).dispose();

  bankMesh = new THREE.Mesh(
    geom,
    new THREE.MeshStandardMaterial({
      color: 0x3a8a7a,
      metalness: 0.08,
      roughness: 0.45,
      side: THREE.FrontSide,
      flatShading: false,
    })
  );
  rim = hexTopWireframe(corners2d, Z_TOP + 0.004, frame);
  scene.add(bankMesh, rim);
}

function main() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0d12);

  const dummy = new THREE.BufferGeometry();
  bankMesh = new THREE.Mesh(dummy, new THREE.MeshBasicMaterial());
  rim = new THREE.LineSegments(dummy, new THREE.LineBasicMaterial());
  scene.add(bankMesh, rim);
  rebuild();

  document.getElementById("pattern")!.addEventListener("change", rebuild);
  document.getElementById("tilted")!.addEventListener("change", rebuild);

  scene.add(new THREE.AmbientLight(0x668899, 0.55));
  const d = new THREE.DirectionalLight(0xffffff, 0.9);
  d.position.set(-4, 6, 10);
  scene.add(d);
  const d2 = new THREE.DirectionalLight(0xaaccff, 0.35);
  d2.position.set(6, -2, 4);
  scene.add(d2);

  const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.08, 80);
  camera.position.set(2.4, 2.8, 3.2);
  camera.lookAt(0, 0.5, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  document.body.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.95, 0);
  controls.enableDamping = true;
  controls.minDistance = 1.2;
  controls.maxDistance = 14;

  window.addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  const status = document.getElementById("status");
  if (status) status.textContent = "";

  function tick() {
    requestAnimationFrame(tick);
    controls.update();
    renderer.render(scene, camera);
  }
  tick();
}

main();
