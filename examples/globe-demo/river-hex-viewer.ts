/**
 * River hex patterns: land = outer hex − (inner ∪ river cutouts). One mesh, smooth voids for 3D extrusion.
 */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import earcut from "earcut";
import polygonClipping from "polygon-clipping";

const R_OUT = 1;
const R_IN = 0.38;
const COL_SPACING = 3.25;
const Z_TOP = 0;
const Z_PIT = -0.14;
const TRACK_Z = Z_TOP + 0.03;

type Ring2 = [number, number][];

function hexRing2d(r: number, ccw: boolean): Ring2 {
  const pts: Ring2 = [];
  for (let i = 0; i < 6; i++) {
    const ang = (Math.PI / 3) * i - Math.PI / 6;
    pts.push([Math.cos(ang) * r, Math.sin(ang) * r]);
  }
  if (!ccw) pts.reverse();
  pts.push([pts[0][0], pts[0][1]]);
  return pts;
}

function ringVertex(i: number, r: number, z: number): THREE.Vector3 {
  const ang = (Math.PI / 3) * i - Math.PI / 6;
  return new THREE.Vector3(Math.cos(ang) * r, Math.sin(ang) * r, z);
}

function edgeMidpoint(i: number, r: number, z: number): THREE.Vector3 {
  const a = ringVertex(i, r, z);
  const b = ringVertex((i + 1) % 6, r, z);
  return a.add(b).multiplyScalar(0.5);
}

function addTrackSegmentForEdge(parent: THREE.Group, edgeIndex: number): void {
  const start = edgeMidpoint(edgeIndex, R_OUT * 0.93, TRACK_Z);
  const end = new THREE.Vector3(0, 0, TRACK_Z);
  const dir = end.clone().sub(start);
  const len = dir.length();
  if (len < 1e-6) return;
  dir.divideScalar(len);
  const perp = new THREE.Vector3(-dir.y, dir.x, 0).normalize();
  const gap = 0.034;

  const railGeom = new THREE.BoxGeometry(0.008, len, 0.008);
  const railMat = new THREE.MeshStandardMaterial({
    color: 0xbfc8d6,
    roughness: 0.6,
    metalness: 0.25,
  });
  const sleeperGeom = new THREE.BoxGeometry(0.072, 0.008, 0.01);
  const sleeperMat = new THREE.MeshStandardMaterial({
    color: 0x70573f,
    roughness: 0.9,
    metalness: 0.05,
  });
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  const mid = start.clone().add(end).multiplyScalar(0.5);

  const left = new THREE.Mesh(railGeom, railMat);
  left.position.copy(mid).addScaledVector(perp, gap * 0.5);
  left.quaternion.copy(q);
  parent.add(left);

  const right = new THREE.Mesh(railGeom, railMat.clone());
  right.position.copy(mid).addScaledVector(perp, -gap * 0.5);
  right.quaternion.copy(q);
  parent.add(right);

  const sleepers = 4;
  for (let i = 1; i <= sleepers; i++) {
    const t = i / (sleepers + 1);
    const p = start.clone().lerp(end, t);
    const s = new THREE.Mesh(sleeperGeom, sleeperMat);
    s.position.copy(p);
    s.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), perp);
    parent.add(s);
  }
}

function makeTrackOverlayGroup(trackEdgeIndices: number[]): THREE.Group {
  const g = new THREE.Group();
  g.name = "TrackOverlay";
  for (const edge of trackEdgeIndices) {
    addTrackSegmentForEdge(g, edge);
  }
  return g;
}

function makePatternGroup(riverEdgeIndices: number[]): THREE.Group {
  const riverEdges = new Set(riverEdgeIndices);
  const O: THREE.Vector3[] = [];
  const I: THREE.Vector3[] = [];
  for (let i = 0; i < 6; i++) {
    O.push(ringVertex(i, R_OUT, Z_TOP));
    I.push(ringVertex(i, R_IN, Z_TOP));
  }

  const m = (k: number) => ((k % 6) + 6) % 6;

  const outerOpeningEnds = (e: number): [THREE.Vector3, THREE.Vector3] => {
    const o0 = O[m(e)];
    const o1 = O[m(e + 1)];
    const u = new THREE.Vector3().subVectors(o1, o0);
    const el = u.length();
    u.divideScalar(el);
    const mid = new THREE.Vector3().addVectors(o0, o1).multiplyScalar(0.5);
    const halfW = Math.min(R_IN, el / 2 - 1e-5);
    return [
      mid.clone().sub(u.clone().multiplyScalar(halfW)),
      mid.clone().add(u.multiplyScalar(halfW)),
    ];
  };

  /** Void = inner hex ∪ each river wedge (single connected hole from outside). */
  let voidMp = [[hexRing2d(R_IN, false)]];
  for (let e = 0; e < 6; e++) {
    if (!riverEdges.has(e)) continue;
    const [A, B] = outerOpeningEnds(e);
    const riverRing: Ring2 = [
      [A.x, A.y],
      [B.x, B.y],
      [I[m(e + 2)].x, I[m(e + 2)].y],
      [I[m(e + 1)].x, I[m(e + 1)].y],
      [I[e].x, I[e].y],
      [I[m(e - 1)].x, I[m(e - 1)].y],
      [A.x, A.y],
    ];
    voidMp = polygonClipping.union(voidMp, [[riverRing]]);
  }

  const outerMp = [[hexRing2d(R_OUT, true)]];
  const landMp = polygonClipping.difference(outerMp, voidMp);

  const positions: number[] = [];
  const indices: number[] = [];
  let vOff = 0;

  for (const polygon of landMp) {
    const outer = polygon[0];
    const holes = polygon.slice(1);
    const flat: number[] = [];
    const holeIdx: number[] = [];
    let v = 0;
    for (let i = 0; i < outer.length - 1; i++) {
      flat.push(outer[i][0], outer[i][1]);
      v++;
    }
    for (const h of holes) {
      holeIdx.push(v);
      for (let i = 0; i < h.length - 1; i++) {
        flat.push(h[i][0], h[i][1]);
        v++;
      }
    }
    const tris = earcut(flat, holeIdx.length ? holeIdx : undefined, 2);
    const base = vOff;
    for (let i = 0; i < flat.length; i += 2) {
      positions.push(flat[i], flat[i + 1], Z_TOP);
    }
    for (let i = 0; i < tris.length; i++) {
      indices.push(base + tris[i]);
    }
    vOff += flat.length / 2;
  }

  const nz = (n: number) => {
    const out: number[] = [];
    for (let k = 0; k < n; k++) out.push(0, 0, 1);
    return out;
  };

  const g = new THREE.Group();

  if (positions.length > 0) {
    const landGeom = new THREE.BufferGeometry();
    landGeom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    landGeom.setAttribute("normal", new THREE.Float32BufferAttribute(nz(positions.length / 3), 3));
    landGeom.setIndex(indices);
    landGeom.computeVertexNormals();
    g.add(
      new THREE.Mesh(
        landGeom,
        new THREE.MeshStandardMaterial({
          color: 0x2d6a6e,
          metalness: 0.06,
          roughness: 0.5,
          side: THREE.DoubleSide,
          flatShading: false,
        })
      )
    );
  }

  const pitPos: number[] = [];
  const pitIdx: number[] = [];
  pitPos.push(0, 0, Z_PIT);
  for (let i = 0; i < 6; i++) {
    const p = ringVertex(i, R_IN * 0.98, Z_PIT);
    pitPos.push(p.x, p.y, p.z);
  }
  for (let i = 0; i < 6; i++) {
    pitIdx.push(0, 1 + i, 1 + ((i + 1) % 6));
  }
  const pitGeom = new THREE.BufferGeometry();
  pitGeom.setAttribute("position", new THREE.Float32BufferAttribute(pitPos, 3));
  const pitN = new Float32Array(pitPos.length);
  for (let i = 0; i < pitN.length; i += 3) pitN[i + 2] = -1;
  pitGeom.setAttribute("normal", new THREE.BufferAttribute(pitN, 3));
  pitGeom.setIndex(pitIdx);
  g.add(
    new THREE.Mesh(
      pitGeom,
      new THREE.MeshStandardMaterial({ color: 0x0a0c10, roughness: 1, metalness: 0 })
    )
  );

  const rim: number[] = [];
  for (let i = 0; i < 6; i++) {
    const a = O[i];
    const b = O[(i + 1) % 6];
    rim.push(a.x, a.y, Z_TOP + 0.002, b.x, b.y, Z_TOP + 0.002);
  }
  g.add(
    new THREE.LineSegments(
      new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(rim, 3)),
      new THREE.LineBasicMaterial({ color: 0x6a9aa8, transparent: true, opacity: 0.35 })
    )
  );

  return g;
}

const PATTERNS: { title: string; edges: number[] }[] = [
  { title: "1 river edge", edges: [0] },
  { title: "2 edges — 60° (gap 1)", edges: [0, 1] },
  { title: "2 edges — 120° (gap 2)", edges: [0, 2] },
  { title: "2 edges — 180° (through)", edges: [0, 3] },
  { title: "3 edges (arc)", edges: [0, 1, 2] },
  { title: "3 edges (alt)", edges: [0, 2, 4] },
  { title: "4 edges (mouth/delta)", edges: [0, 1, 2, 3] },
];

function main() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0d12);

  const row = new THREE.Group();
  const cells: THREE.Group[] = [];
  const selectedTrackEdges = new Set<number>();
  const n = PATTERNS.length;
  const x0 = ((-n + 1) * COL_SPACING) / 2;
  for (let i = 0; i < n; i++) {
    const cell = new THREE.Group();
    cell.position.x = x0 + i * COL_SPACING;
    cell.add(makePatternGroup(PATTERNS[i].edges));
    row.add(cell);
    cells.push(cell);
  }
  scene.add(row);

  function refreshTrackOverlays(): void {
    for (const cell of cells) {
      const old = cell.getObjectByName("TrackOverlay");
      if (old) {
        cell.remove(old);
        old.traverse((o) => {
          if (!(o instanceof THREE.Mesh)) return;
          o.geometry.dispose();
          if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
          else o.material.dispose();
        });
      }
      if (selectedTrackEdges.size > 0) {
        cell.add(makeTrackOverlayGroup([...selectedTrackEdges.values()]));
      }
    }
  }

  scene.add(new THREE.AmbientLight(0x6a7a88, 1));
  const d = new THREE.DirectionalLight(0xffffff, 0.55);
  d.position.set(-3, 5, 8);
  scene.add(d);
  const d2 = new THREE.DirectionalLight(0xaaccff, 0.25);
  d2.position.set(4, -2, 4);
  scene.add(d2);

  const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 9.2, 11);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  document.body.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.enableDamping = true;
  controls.minDistance = 5;
  controls.maxDistance = 32;

  const legend = document.getElementById("legend")!;
  legend.innerHTML = PATTERNS.map(
    (p, i) =>
      `<div class="leg-item"><span class="leg-num">${i + 1}</span><span class="leg-title">${escapeHtml(p.title)}</span></div>`
  ).join("");

  const togglesRoot = document.getElementById("track-toggles");
  if (togglesRoot) {
    for (let e = 0; e < 6; e++) {
      const label = document.createElement("label");
      label.className = "track-toggle";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.addEventListener("change", () => {
        if (cb.checked) selectedTrackEdges.add(e);
        else selectedTrackEdges.delete(e);
        refreshTrackOverlays();
      });
      const text = document.createElement("span");
      text.textContent = `Edge ${e}`;
      label.append(cb, text);
      togglesRoot.appendChild(label);
    }
  }
  refreshTrackOverlays();

  window.addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  function escapeHtml(s: string): string {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  function tick() {
    requestAnimationFrame(tick);
    controls.update();
    renderer.render(scene, camera);
  }
  tick();

  const status = document.getElementById("status");
  if (status) status.textContent = "Use Track overlays toggles to test 6 edge directions.";
}

main();
