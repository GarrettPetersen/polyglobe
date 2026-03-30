import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type {
  CreateRouteCommand,
  PlayerRouteState,
  PlayerVehicleState,
  RailwaysCommand,
  QueueTrackBuildCommand,
  RailwaysAuthoritativeState,
  TrackSegmentState,
  VehicleKind,
} from "../network/protocol.js";

interface WorldBridge {
  getGlobe: () => {
    radius: number;
    getTile: (id: number) => { center: THREE.Vector3; neighbors: number[] } | undefined;
    getTileIdAtDirection: (d: THREE.Vector3) => number;
  } | undefined;
  getGlobeMesh: () => THREE.Object3D | null;
  getScene: () => THREE.Scene;
  getCamera: () => THREE.PerspectiveCamera;
  getRendererDomElement: () => HTMLCanvasElement;
  getTileTerrain: () => Map<
    number,
    { tileId: number; type: string; elevation: number; isHilly?: boolean }
  > | null;
  getRiverFlowByTile: () => Map<number, { exitEdge: number; directionRad: number }> | null;
  setDateTimeUtc?: (dateTimeUtc: string) => void;
  setPaused?: (paused: boolean) => void;
}

interface SessionSetup {
  startCityId: string;
  colorHex: string;
}

function latLonDegToDirection(latDeg: number, lonDeg: number): THREE.Vector3 {
  const latRad = (latDeg * Math.PI) / 180;
  const lonRad = (lonDeg * Math.PI) / 180;
  const cosLat = Math.cos(latRad);
  return new THREE.Vector3(
    cosLat * Math.cos(lonRad),
    Math.sin(latRad),
    -cosLat * Math.sin(lonRad),
  ).normalize();
}

declare global {
  interface Window {
    __railwaysWorldBridge?: WorldBridge;
  }
}

function getNetState():
  | {
      connected: boolean;
      clientId: string | null;
      lastSnapshot: RailwaysAuthoritativeState | null;
    }
  | undefined {
  const w = window as unknown as {
    __railwaysNetState?: {
      connected: boolean;
      clientId: string | null;
      lastSnapshot: RailwaysAuthoritativeState | null;
    };
  };
  return w.__railwaysNetState;
}

function sendNetCommand(command: RailwaysCommand): void {
  const w = window as unknown as { __railwaysNetSendCommand?: (command: RailwaysCommand) => void };
  w.__railwaysNetSendCommand?.(command);
}

function requestNetSnapshot(): void {
  const w = window as unknown as { __railwaysNetRequestSnapshot?: () => void };
  w.__railwaysNetRequestSnapshot?.();
}

const _tmpA = new THREE.Vector3();
const _tmpB = new THREE.Vector3();
const _tmpMid = new THREE.Vector3();
const _tmpQ = new THREE.Quaternion();
const _tmpScale = new THREE.Vector3();
const _tmpDir = new THREE.Vector3();
const _tmpNormal = new THREE.Vector3();
const _tmpSide = new THREE.Vector3();
const _tmpBasis = new THREE.Matrix4();
const _tmpModel = new THREE.Matrix4();
const _tmpScaleM = new THREE.Matrix4();
const _tmpColor = new THREE.Color();
const _up = new THREE.Vector3(0, 1, 0);
const _pickSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 1);
const _pickPoint = new THREE.Vector3();

function hexCostCategory(
  tileA: { type: string; elevation: number; isHilly?: boolean } | undefined,
  tileB: { type: string; elevation: number; isHilly?: boolean } | undefined,
  hasRiver: boolean,
): { cost: number; flags: { hilly?: boolean; river?: boolean; mountain?: boolean } } {
  const elev = Math.max(tileA?.elevation ?? 0, tileB?.elevation ?? 0);
  const mountain =
    tileA?.type === "mountain" || tileB?.type === "mountain" || elev >= 0.055;
  const hilly = !!tileA?.isHilly || !!tileB?.isHilly;
  if (mountain) return { cost: 100, flags: { mountain: true } };
  if (hasRiver) return { cost: 70, flags: { river: true } };
  if (hilly) return { cost: 30, flags: { hilly: true } };
  return { cost: 10, flags: {} };
}

class TrackVisualLayer {
  private readonly group = new THREE.Group();
  private bed: THREE.InstancedMesh | null = null;
  private ownerStripe: THREE.InstancedMesh | null = null;
  private railLeft: THREE.InstancedMesh | null = null;
  private railRight: THREE.InstancedMesh | null = null;
  private sleepers: THREE.InstancedMesh | null = null;
  private supports: THREE.InstancedMesh | null = null;
  private readonly queuedPreviewLines: THREE.Line[] = [];
  private buildMarkers: Array<{
    cloud: THREE.Sprite;
    worldPos: THREE.Vector3;
    ownerColorHex: string;
    buildStartedAtMs: number;
    buildCompleteAtMs: number;
  }> = [];
  private currentTracksKey = "";

  attach(scene: THREE.Scene): void {
    this.group.name = "RailwaysTrackLayer";
    scene.add(this.group);
  }

  update(
    bridge: WorldBridge,
    tracks: TrackSegmentState[],
    nowMs: number,
    simNowMs: number,
  ): void {
    const key = tracks
      .map(
        (t) =>
          `${t.fromTileId}:${t.toTileId}:${
            t.status === "active" ? "active" : simNowMs < t.buildStartedAtMs ? "queued" : "building"
          }:${t.ownerColorHex}:${t.buildStartedAtMs}:${t.buildCompleteAtMs}`,
      )
      .join("|");
    if (key !== this.currentTracksKey) {
      this.currentTracksKey = key;
      this.rebuild(bridge, tracks, simNowMs);
    }
    for (let i = 0; i < this.buildMarkers.length; i++) {
      const marker = this.buildMarkers[i]!;
      const s = marker.cloud;
      const pulse = 0.55 + 0.45 * Math.sin(nowMs * 0.006 + i * 0.7);
      s.scale.setScalar(0.006 + pulse * 0.0025);
      (s.material as THREE.SpriteMaterial).opacity = 0.35 + pulse * 0.45;
    }
  }

  getBuildMarkers(): readonly {
    worldPos: THREE.Vector3;
    ownerColorHex: string;
    buildStartedAtMs: number;
    buildCompleteAtMs: number;
  }[] {
    return this.buildMarkers;
  }

  private clearMeshes(): void {
    const meshes = [
      this.bed,
      this.ownerStripe,
      this.railLeft,
      this.railRight,
      this.sleepers,
      this.supports,
    ];
    for (const m of meshes) {
      if (!m) continue;
      this.group.remove(m);
      m.geometry.dispose();
      const mat = m.material;
      if (Array.isArray(mat)) {
        for (const mm of mat) mm.dispose();
      } else {
        mat.dispose();
      }
    }
    this.bed = null;
    this.ownerStripe = null;
    this.railLeft = null;
    this.railRight = null;
    this.sleepers = null;
    this.supports = null;
    for (const line of this.queuedPreviewLines) {
      this.group.remove(line);
      line.geometry.dispose();
      const mat = line.material;
      if (Array.isArray(mat)) {
        for (const mm of mat) mm.dispose();
      } else {
        mat.dispose();
      }
    }
    this.queuedPreviewLines.length = 0;
    for (const marker of this.buildMarkers) {
      const s = marker.cloud;
      this.group.remove(s);
      const mat = s.material as THREE.SpriteMaterial;
      mat.map?.dispose();
      mat.dispose();
    }
    this.buildMarkers = [];
  }

  private rebuild(bridge: WorldBridge, tracks: TrackSegmentState[], simNowMs: number): void {
    this.clearMeshes();
    if (tracks.length === 0) return;
    const globe = bridge.getGlobe();
    const terrain = bridge.getTileTerrain();
    if (!globe || !terrain) return;

    // Keep rail geometry as a narrow strip through hex centers.
    const bedGeom = new THREE.BoxGeometry(0.0024, 1, 0.00048);
    const stripeGeom = new THREE.BoxGeometry(0.00045, 1, 0.00016);
    const railGeom = new THREE.BoxGeometry(0.0002, 1, 0.00028);
    const sleeperGeom = new THREE.BoxGeometry(0.0018, 0.00016, 0.0002);
    const supportGeom = new THREE.CylinderGeometry(0.00045, 0.00062, 1, 6);
    const bedMat = new THREE.MeshStandardMaterial({
      color: 0x77808b,
      roughness: 0.88,
      metalness: 0.04,
    });
    const stripeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.5,
      metalness: 0.15,
    });
    const railMat = new THREE.MeshStandardMaterial({
      color: 0xc0c6d2,
      roughness: 0.65,
      metalness: 0.35,
    });
    const sleeperMat = new THREE.MeshStandardMaterial({
      color: 0x8b6a4a,
      roughness: 0.9,
      metalness: 0.04,
    });
    const supportMat = new THREE.MeshStandardMaterial({ color: 0x4b4f57, roughness: 0.84, metalness: 0.18 });
    const segmentBudget = Math.max(1, tracks.length * 40);
    this.bed = new THREE.InstancedMesh(bedGeom, bedMat, segmentBudget);
    this.ownerStripe = new THREE.InstancedMesh(stripeGeom, stripeMat, segmentBudget);
    this.railLeft = new THREE.InstancedMesh(railGeom, railMat, segmentBudget);
    this.railRight = new THREE.InstancedMesh(railGeom, railMat.clone(), segmentBudget);
    this.sleepers = new THREE.InstancedMesh(
      sleeperGeom,
      sleeperMat,
      Math.max(4, tracks.length * 220),
    );
    this.supports = new THREE.InstancedMesh(supportGeom, supportMat, Math.max(1, tracks.length));
    this.bed.frustumCulled = false;
    this.ownerStripe.frustumCulled = false;
    this.railLeft.frustumCulled = false;
    this.railRight.frustumCulled = false;
    this.sleepers.frustumCulled = false;
    this.supports.frustumCulled = false;
    this.group.add(
      this.bed,
      this.ownerStripe,
      this.railLeft,
      this.railRight,
      this.sleepers,
      this.supports,
    );

    let railIdx = 0;
    let sleeperIdx = 0;
    let supportIdx = 0;
    const tex = this.makeBuildSpriteTexture();
    const tileConn = new Map<
      number,
      Array<{ edgePos: THREE.Vector3; centerPos: THREE.Vector3; ownerColorHex: string }>
    >();
    const pushConn = (
      tileId: number,
      centerPos: THREE.Vector3,
      edgePos: THREE.Vector3,
      ownerColorHex: string,
    ): void => {
      let list = tileConn.get(tileId);
      if (!list) {
        list = [];
        tileConn.set(tileId, list);
      }
      list.push({ edgePos, centerPos, ownerColorHex });
    };
    for (const tr of tracks) {
      const a = globe.getTile(tr.fromTileId);
      const b = globe.getTile(tr.toTileId);
      if (!a || !b) continue;
      const stage =
        tr.status === "active" ? "active" : simNowMs < tr.buildStartedAtMs ? "queued" : "building";
      const elevA = terrain.get(tr.fromTileId)?.elevation ?? 0;
      const elevB = terrain.get(tr.toTileId)?.elevation ?? 0;
      _tmpA.copy(a.center).normalize().multiplyScalar(globe.radius + elevA * 0.08 + 0.0018);
      _tmpB.copy(b.center).normalize().multiplyScalar(globe.radius + elevB * 0.08 + 0.0018);
      const len = _tmpA.distanceTo(_tmpB);
      if (len < 1e-6) continue;
      const fullMid = _tmpA.clone().add(_tmpB).multiplyScalar(0.5);
      const edgePos = _tmpA
        .clone()
        .add(_tmpB)
        .normalize()
        .multiplyScalar(globe.radius + ((elevA + elevB) * 0.5) * 0.08 + 0.0018);
      if (stage === "queued") {
        const p0 = _tmpA.clone().addScaledVector(_tmpA.clone().normalize(), 0.0009);
        const p1 = _tmpB.clone().addScaledVector(_tmpB.clone().normalize(), 0.0009);
        const qGeom = new THREE.BufferGeometry().setFromPoints([p0, p1]);
        const qMat = new THREE.LineBasicMaterial({
          color: new THREE.Color(tr.ownerColorHex),
          transparent: true,
          opacity: 0.35,
          depthWrite: false,
        });
        const qLine = new THREE.Line(qGeom, qMat);
        qLine.renderOrder = 84;
        this.group.add(qLine);
        this.queuedPreviewLines.push(qLine);
      }
      if (stage === "active") {
        pushConn(tr.fromTileId, _tmpA.clone(), edgePos.clone(), tr.ownerColorHex);
        pushConn(tr.toTileId, _tmpB.clone(), edgePos, tr.ownerColorHex);
      }

      const supportNeeded =
        stage === "building" ||
        Math.abs(elevA - elevB) > 0.01 ||
        (terrain.get(tr.fromTileId)?.isHilly ?? false) ||
        (terrain.get(tr.toTileId)?.isHilly ?? false);
      if (supportNeeded && stage === "active") {
        const supportLen = Math.max(0.01, fullMid.length() - (globe.radius - 0.01));
        const supportPos = fullMid
          .clone()
          .normalize()
          .multiplyScalar(fullMid.length() - supportLen * 0.5);
        const supportQ = new THREE.Quaternion().setFromUnitVectors(_up, supportPos.clone().normalize());
        this.supports!.setMatrixAt(
          supportIdx++,
          new THREE.Matrix4().compose(
            supportPos,
            supportQ,
            new THREE.Vector3(1, supportLen, 1),
          ),
        );
      }

      if (stage === "building") {
        const sp = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: tex,
            transparent: true,
            depthWrite: false,
            depthTest: false,
            opacity: 0.6,
            color: new THREE.Color(tr.ownerColorHex),
          }),
        );
        sp.position.copy(fullMid);
        sp.scale.setScalar(0.008);
        this.group.add(sp);
        this.buildMarkers.push({
          cloud: sp,
          worldPos: fullMid.clone(),
          ownerColorHex: tr.ownerColorHex,
          buildStartedAtMs: tr.buildStartedAtMs,
          buildCompleteAtMs: tr.buildCompleteAtMs,
        });
      }
    }

    const setMatrix = (
      mesh: THREE.InstancedMesh,
      idx: number,
      center: THREE.Vector3,
      sx: number,
      sy: number,
      sz: number,
    ): void => {
      _tmpScaleM.makeScale(sx, sy, sz);
      _tmpModel.copy(_tmpBasis).multiply(_tmpScaleM);
      _tmpModel.setPosition(center);
      mesh.setMatrixAt(idx, _tmpModel);
    };
    const trackGap = 0.00078;
    const addChunk = (segStart: THREE.Vector3, segEnd: THREE.Vector3, ownerColorHex: string): void => {
      _tmpDir.copy(segEnd).sub(segStart);
      const segLen = _tmpDir.length();
      if (segLen < 1e-6) return;
      _tmpDir.divideScalar(segLen);
      _tmpMid.copy(segStart).add(segEnd).multiplyScalar(0.5);
      _tmpNormal.copy(_tmpMid).normalize();
      _tmpSide.crossVectors(_tmpDir, _tmpNormal);
      if (_tmpSide.lengthSq() < 1e-8) return;
      _tmpSide.normalize();
      _tmpBasis.makeBasis(_tmpSide, _tmpDir, _tmpNormal);

      const bedPos = _tmpMid.clone().addScaledVector(_tmpNormal, 0.00026);
      setMatrix(this.bed!, railIdx, bedPos, 1, segLen, 1);
      this.bed!.setColorAt(railIdx, _tmpColor.set(0x5f6671));

      const stripePos = _tmpMid.clone().addScaledVector(_tmpNormal, 0.00062);
      setMatrix(this.ownerStripe!, railIdx, stripePos, 1, segLen, 1);
      this.ownerStripe!.setColorAt(railIdx, _tmpColor.set(ownerColorHex));

      const leftPos = _tmpMid
        .clone()
        .addScaledVector(_tmpSide, trackGap * 0.5)
        .addScaledVector(_tmpNormal, 0.00052);
      const rightPos = _tmpMid
        .clone()
        .addScaledVector(_tmpSide, -trackGap * 0.5)
        .addScaledVector(_tmpNormal, 0.00052);
      setMatrix(this.railLeft!, railIdx, leftPos, 1, segLen, 1);
      setMatrix(this.railRight!, railIdx, rightPos, 1, segLen, 1);

        const sleeperCount = Math.max(1, Math.floor(segLen / 0.0025));
      for (let i = 0; i < sleeperCount; i++) {
        const t = (i + 1) / (sleeperCount + 1);
          const p = segStart.clone().lerp(segEnd, t).addScaledVector(_tmpNormal, 0.00058);
        _tmpModel.makeBasis(_tmpSide, _tmpNormal, _tmpDir);
        _tmpModel.setPosition(p);
        this.sleepers!.setMatrixAt(sleeperIdx++, _tmpModel);
      }
      railIdx++;
    };
    const addCurve = (
      p0: THREE.Vector3,
      p1: THREE.Vector3,
      ctrl: THREE.Vector3,
      ownerColorHex: string,
      steps = 6,
    ): void => {
      let prev = p0.clone();
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const a = p0.clone().lerp(ctrl, t);
        const b = ctrl.clone().lerp(p1, t);
        const cur = a.lerp(b, t);
        addChunk(prev, cur, ownerColorHex);
        prev = cur;
      }
    };

    for (const conns of tileConn.values()) {
      if (conns.length === 0) continue;
      if (conns.length === 1) {
        addChunk(conns[0]!.edgePos, conns[0]!.centerPos, conns[0]!.ownerColorHex);
        continue;
      }
      if (conns.length === 2) {
        const c0 = conns[0]!;
        const c1 = conns[1]!;
        const d0 = c0.edgePos.clone().sub(c0.centerPos).normalize();
        const d1 = c1.edgePos.clone().sub(c1.centerPos).normalize();
        const dot = THREE.MathUtils.clamp(d0.dot(d1), -1, 1);
        const angle = Math.acos(dot);
        if (angle >= 2.6) {
          addChunk(c0.edgePos, c1.edgePos, c0.ownerColorHex);
        } else if (c0.ownerColorHex === c1.ownerColorHex) {
          addCurve(c0.edgePos, c1.edgePos, c0.centerPos, c0.ownerColorHex);
        } else {
          addCurve(c0.edgePos, c0.centerPos, c0.centerPos, c0.ownerColorHex, 3);
          addCurve(c0.centerPos, c1.edgePos, c1.centerPos, c1.ownerColorHex, 3);
        }
        continue;
      }
      // Junction fallback: draw stubs into center for each connected edge.
      for (const c of conns) {
        addChunk(c.edgePos, c.centerPos, c.ownerColorHex);
      }
    }
    this.bed.count = railIdx;
    this.ownerStripe.count = railIdx;
    this.railLeft.count = railIdx;
    this.railRight.count = railIdx;
    this.sleepers.count = sleeperIdx;
    this.supports.count = supportIdx;
    this.bed.instanceMatrix.needsUpdate = true;
    this.ownerStripe.instanceMatrix.needsUpdate = true;
    if (this.bed.instanceColor) this.bed.instanceColor.needsUpdate = true;
    if (this.ownerStripe.instanceColor) this.ownerStripe.instanceColor.needsUpdate = true;
    this.railLeft.instanceMatrix.needsUpdate = true;
    this.railRight.instanceMatrix.needsUpdate = true;
    this.sleepers.instanceMatrix.needsUpdate = true;
    this.supports.instanceMatrix.needsUpdate = true;
  }

  private makeBuildSpriteTexture(): THREE.Texture {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, 64, 64);
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.beginPath();
    ctx.arc(32, 32, 19, 0, Math.PI * 2);
    ctx.fill();
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }
}

class BuildProgressOverlay2D {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.style.cssText =
      "position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:10015;pointer-events:none;";
    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext("2d")!;
  }

  private ensureSize(): void {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.floor(window.innerWidth * dpr));
    const h = Math.max(1, Math.floor(window.innerHeight * dpr));
    if (this.canvas.width === w && this.canvas.height === h) return;
    this.canvas.width = w;
    this.canvas.height = h;
  }

  update(
    bridge: WorldBridge,
    markers: readonly {
      worldPos: THREE.Vector3;
      ownerColorHex: string;
      buildStartedAtMs: number;
      buildCompleteAtMs: number;
    }[],
    simNowMs: number,
  ): void {
    this.ensureSize();
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (markers.length === 0) return;
    const camera = bridge.getCamera();
    const barW = 22 * dpr;
    const barH = 4 * dpr;
    for (const m of markers) {
      const total = Math.max(1, m.buildCompleteAtMs - m.buildStartedAtMs);
      const progress = THREE.MathUtils.clamp((simNowMs - m.buildStartedAtMs) / total, 0, 1);
      const p = m.worldPos.clone().project(camera);
      if (p.z < -1 || p.z > 1) continue;
      const x = (p.x * 0.5 + 0.5) * this.canvas.width;
      const y = (1 - (p.y * 0.5 + 0.5)) * this.canvas.height - 10 * dpr;
      ctx.fillStyle = "rgba(20,34,53,0.85)";
      ctx.fillRect(x - barW * 0.5, y - barH * 0.5, barW, barH);
      ctx.fillStyle = m.ownerColorHex;
      ctx.fillRect(x - barW * 0.5 + 1 * dpr, y - barH * 0.5 + 1 * dpr, (barW - 2 * dpr) * progress, barH - 2 * dpr);
    }
  }
}

class TrackPlanCostOverlay2D {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.style.cssText =
      "position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:10016;pointer-events:none;";
    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext("2d")!;
  }

  private ensureSize(): void {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.floor(window.innerWidth * dpr));
    const h = Math.max(1, Math.floor(window.innerHeight * dpr));
    if (this.canvas.width === w && this.canvas.height === h) return;
    this.canvas.width = w;
    this.canvas.height = h;
  }

  update(
    bridge: WorldBridge,
    points: Array<{ worldPos: THREE.Vector3; cost: number }>,
    visible: boolean,
  ): void {
    this.ensureSize();
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (!visible || points.length === 0) return;
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const cam = bridge.getCamera();
    ctx.font = `${10 * dpr}px system-ui,-apple-system,Segoe UI,Roboto,sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const p of points) {
      const ndc = p.worldPos.clone().project(cam);
      if (ndc.z < -1 || ndc.z > 1) continue;
      const x = (ndc.x * 0.5 + 0.5) * this.canvas.width;
      const y = (1 - (ndc.y * 0.5 + 0.5)) * this.canvas.height;
      const label = `£${p.cost}`;
      const padX = 5 * dpr;
      const padY = 3 * dpr;
      const w = ctx.measureText(label).width + padX * 2;
      const h = 14 * dpr;
      const rx = x - w * 0.5;
      const ry = y - 14 * dpr;
      ctx.fillStyle = "rgba(10,20,34,0.88)";
      ctx.fillRect(rx, ry, w, h);
      ctx.fillStyle = "rgba(255,255,255,0.94)";
      ctx.fillText(label, x, ry + h * 0.52);
    }
  }
}

class RouteVisualLayer {
  private readonly group = new THREE.Group();
  private readonly routeObjects = new Map<string, THREE.Object3D>();
  private readonly routeBaseOpacity = new Map<string, number>();
  private readonly highlightedRouteIds = new Set<string>();
  private currentKey = "";

  attach(scene: THREE.Scene): void {
    this.group.name = "RailwaysRouteLayer";
    scene.add(this.group);
  }

  update(
    bridge: WorldBridge,
    snap: RailwaysAuthoritativeState,
    localClientId: string | null,
  ): void {
    const key = snap.playerRoutes
      .map((r) => `${r.routeId}:${r.tileIds.join(".")}:${r.vehicleIds.join(".")}`)
      .join("|");
    if (key === this.currentKey) return;
    this.currentKey = key;
    this.rebuild(bridge, snap.playerRoutes, snap.players, localClientId);
  }

  private clear(): void {
    for (const obj of this.routeObjects.values()) {
      this.group.remove(obj);
      obj.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          const mat = o.material;
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else mat.dispose();
        } else if (o instanceof THREE.Line) {
          o.geometry.dispose();
          const mat = o.material;
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else mat.dispose();
        }
      });
    }
    this.routeObjects.clear();
    this.routeBaseOpacity.clear();
  }

  private rebuild(
    bridge: WorldBridge,
    routes: PlayerRouteState[],
    players: RailwaysAuthoritativeState["players"],
    localClientId: string | null,
  ): void {
    this.clear();
    const globe = bridge.getGlobe();
    const terrain = bridge.getTileTerrain();
    if (!globe || !terrain) return;
    const playerColor = new Map<string, string>();
    for (const p of players) playerColor.set(p.clientId, p.colorHex);

    for (const route of routes) {
      const points: THREE.Vector3[] = [];
      for (const tileId of route.tileIds) {
        const tile = globe.getTile(tileId);
        if (!tile) continue;
        const elev = terrain.get(tileId)?.elevation ?? 0;
        points.push(
          tile.center.clone().normalize().multiplyScalar(globe.radius + elev * 0.08 + 0.007),
        );
      }
      if (points.length < 2) continue;
      if (route.isLoop) points.push(points[0]!.clone());
      const geom = new THREE.BufferGeometry().setFromPoints(points);
      const color =
        playerColor.get(route.ownerClientId) ??
        (route.ownerClientId === localClientId ? "#7ecbff" : "#cfd8e6");
      const mat = new THREE.LineBasicMaterial({
        color: new THREE.Color(color),
        transparent: true,
        opacity: route.ownerClientId === localClientId ? 0.95 : 0.55,
      });
      const line = new THREE.Line(geom, mat);
      line.renderOrder = 90;
      line.userData.routeId = route.routeId;
      this.group.add(line);
      this.routeObjects.set(route.routeId, line);
      this.routeBaseOpacity.set(route.routeId, mat.opacity);
    }
    this.applyHighlightStyling();
  }

  setHighlightedRoutes(routeIds: Iterable<string>): void {
    this.highlightedRouteIds.clear();
    for (const id of routeIds) this.highlightedRouteIds.add(id);
    this.applyHighlightStyling();
  }

  getInteractiveObjects(): THREE.Object3D[] {
    return [...this.routeObjects.values()];
  }

  getRouteIdForObject(obj: THREE.Object3D | null): string | null {
    let cur: THREE.Object3D | null = obj;
    while (cur) {
      if (typeof cur.userData?.routeId === "string") return cur.userData.routeId as string;
      cur = cur.parent;
    }
    return null;
  }

  private applyHighlightStyling(): void {
    for (const [routeId, obj] of this.routeObjects) {
      if (!(obj instanceof THREE.Line)) continue;
      const mat = obj.material;
      if (!(mat instanceof THREE.LineBasicMaterial)) continue;
      const base = this.routeBaseOpacity.get(routeId) ?? 0.7;
      if (this.highlightedRouteIds.size > 0) {
        const on = this.highlightedRouteIds.has(routeId);
        mat.opacity = on ? 1 : Math.max(0.18, base * 0.25);
      } else {
        mat.opacity = base;
      }
      mat.needsUpdate = true;
    }
  }
}

class VehicleVisualLayer {
  private readonly group = new THREE.Group();
  private readonly loader = new GLTFLoader();
  private readonly templateByKind = new Map<VehicleKind, THREE.Object3D>();
  private readonly correctionByKind = new Map<VehicleKind, THREE.Quaternion>();
  private readonly objectByVehicleId = new Map<string, THREE.Object3D>();
  private readonly loadingKind = new Set<VehicleKind>();
  private readonly missingKinds = new Set<VehicleKind>();

  attach(scene: THREE.Scene): void {
    this.group.name = "RailwaysVehicleLayer";
    scene.add(this.group);
  }

  update(bridge: WorldBridge, snap: RailwaysAuthoritativeState): void {
    const vehicles = snap.playerVehicles.filter((v) => v.assignedRouteId);
    const attachedByParent = new Map<string, PlayerVehicleState[]>();
    for (const v of vehicles) {
      if (!v.attachedToVehicleId) continue;
      const list = attachedByParent.get(v.attachedToVehicleId) ?? [];
      list.push(v);
      attachedByParent.set(v.attachedToVehicleId, list);
    }
    for (const list of attachedByParent.values()) {
      list.sort((a, b) => a.vehicleId.localeCompare(b.vehicleId));
    }
    const keep = new Set(vehicles.map((v) => v.vehicleId));
    for (const [vehicleId, obj] of this.objectByVehicleId) {
      if (keep.has(vehicleId)) continue;
      this.group.remove(obj);
      this.objectByVehicleId.delete(vehicleId);
    }
    const routeById = new Map(snap.playerRoutes.map((r) => [r.routeId, r]));
    const terrain = bridge.getTileTerrain();
    const globe = bridge.getGlobe();
    if (!terrain || !globe) return;
    for (const v of vehicles) {
      const route = routeById.get(v.assignedRouteId ?? "");
      if (!route || route.tileIds.length < 2) continue;
      let obj = this.objectByVehicleId.get(v.vehicleId);
      if (!obj) {
        obj = this.instantiateVehicle(v.kind);
        if (!obj) continue;
        obj.userData.vehicleId = v.vehicleId;
        this.objectByVehicleId.set(v.vehicleId, obj);
        this.group.add(obj);
      }
      const curTileId = v.currentTileId ?? route.tileIds[0]!;
      const nextTileId = v.nextTileId ?? route.tileIds[Math.min(1, route.tileIds.length - 1)]!;
      const curTile = globe.getTile(curTileId);
      const nextTile = globe.getTile(nextTileId);
      if (!curTile || !nextTile) continue;
      const elevA = terrain.get(curTileId)?.elevation ?? 0;
      const elevB = terrain.get(nextTileId)?.elevation ?? 0;
      const pa = _tmpA.copy(curTile.center).normalize().multiplyScalar(globe.radius + elevA * 0.08 + 0.004);
      const pb = _tmpB.copy(nextTile.center).normalize().multiplyScalar(globe.radius + elevB * 0.08 + 0.004);
      const nowSim = Date.parse(snap.clock.dateTimeUtc);
      const last = v.lastMoveAtMs ?? nowSim;
      const next = v.nextMoveAtMs ?? nowSim + 1;
      const t = THREE.MathUtils.clamp((nowSim - last) / Math.max(1, next - last), 0, 1);
      const pos = _tmpMid.copy(pa).lerp(pb, t);
      const dir = pb.clone().sub(pa).normalize();
      if (v.attachedToVehicleId) {
        const group = attachedByParent.get(v.attachedToVehicleId) ?? [];
        const idx = Math.max(0, group.findIndex((c) => c.vehicleId === v.vehicleId));
        const gap = 0.00155;
        pos.addScaledVector(dir, -(idx + 1) * gap);
      }
      obj.position.copy(pos);
      const up = pos.clone().normalize();
      const fwd = dir.clone().addScaledVector(up, -dir.dot(up));
      if (fwd.lengthSq() < 1e-10) continue;
      fwd.normalize();
      const right = new THREE.Vector3().crossVectors(fwd, up);
      if (right.lengthSq() < 1e-10) continue;
      right.normalize();
      const worldBasis = new THREE.Matrix4().makeBasis(right, up, fwd);
      _tmpQ.setFromRotationMatrix(worldBasis);
      obj.quaternion.copy(_tmpQ);
      const corr = this.correctionByKind.get(v.kind);
      if (corr) obj.quaternion.multiply(corr);
    }
  }

  getInteractiveObjects(): THREE.Object3D[] {
    return [...this.objectByVehicleId.values()];
  }

  getVehicleIdForObject(obj: THREE.Object3D | null): string | null {
    let cur: THREE.Object3D | null = obj;
    while (cur) {
      if (typeof cur.userData?.vehicleId === "string") return cur.userData.vehicleId as string;
      cur = cur.parent;
    }
    return null;
  }

  private instantiateVehicle(kind: VehicleKind): THREE.Object3D | null {
    const cached = this.templateByKind.get(kind);
    if (cached) return cached.clone(true);
    if (this.missingKinds.has(kind)) return null;
    this.loadKindTemplate(kind);
    return null;
  }

  private kindAssetCandidates(kind: VehicleKind): string[] {
    if (kind === "sail_ship") return ["/assets/vehicles/Sail Ship.glb"];
    if (kind === "locomotive_front") return ["/assets/vehicles/Locomotive Front.glb"];
    if (kind === "passenger_carriage")
      return ["/assets/vehicles/Locomotive Passenger Carriage.glb"];
    return ["/assets/vehicles/Locomotive Wagon.glb"];
  }

  private loadKindTemplate(kind: VehicleKind): void {
    if (this.loadingKind.has(kind) || this.templateByKind.has(kind)) return;
    this.loadingKind.add(kind);
    const candidates = this.kindAssetCandidates(kind);
    const tryLoad = (idx: number) => {
      if (idx >= candidates.length) {
        this.loadingKind.delete(kind);
        this.missingKinds.add(kind);
        console.error(
          `[railways] Missing required vehicle asset for ${kind}. Tried:`,
          candidates,
        );
        return;
      }
      this.loader.load(
        candidates[idx]!,
        (gltf) => {
          const scene = gltf.scene.clone(true);
          scene.traverse((o) => {
            if (o instanceof THREE.Mesh) {
              o.castShadow = false;
              o.receiveShadow = false;
            }
          });
          const box = new THREE.Box3().setFromObject(scene);
          const size = new THREE.Vector3();
          box.getSize(size);
          const maxDim = Math.max(size.x, size.y, size.z);
          if (!Number.isFinite(maxDim) || maxDim <= 1e-6) {
            this.loadingKind.delete(kind);
            this.missingKinds.add(kind);
            return;
          }
          const center = new THREE.Vector3();
          box.getCenter(center);
          scene.position.x -= center.x;
          scene.position.z -= center.z;
          scene.position.y -= box.min.y;
          const targetMaxDim =
            kind === "sail_ship" ? 0.0052 : kind === "locomotive_front" ? 0.0042 : 0.0038;
          const normalizedScale = targetMaxDim / maxDim;
          scene.scale.setScalar(normalizedScale);
          const root = new THREE.Group();
          root.add(scene);
          this.templateByKind.set(kind, root);
          const correction = new THREE.Quaternion();
          correction.setFromAxisAngle(
            _up,
            kind === "sail_ship" ? -Math.PI * 0.5 : -Math.PI * 0.5,
          );
          this.correctionByKind.set(kind, correction);
          this.loadingKind.delete(kind);
        },
        undefined,
        () => tryLoad(idx + 1),
      );
    };
    tryLoad(0);
  }
}

class PassengerVisualLayer {
  private readonly group = new THREE.Group();
  private head: THREE.InstancedMesh | null = null;
  private body: THREE.InstancedMesh | null = null;
  private key = "";

  attach(scene: THREE.Scene): void {
    this.group.name = "RailwaysPassengerLayer";
    scene.add(this.group);
  }

  update(bridge: WorldBridge, snap: RailwaysAuthoritativeState): void {
    const passengers = snap.economy.shipments.filter((s) => s.goodId === "passengers");
    const key = passengers.map((p) => `${p.shipmentId}:${p.currentTileId}:${p.status}`).join("|");
    if (key === this.key) return;
    this.key = key;
    this.rebuild(bridge, passengers);
  }

  private clear(): void {
    const meshes = [this.head, this.body];
    for (const m of meshes) {
      if (!m) continue;
      this.group.remove(m);
      m.geometry.dispose();
      const mat = m.material;
      if (Array.isArray(mat)) mat.forEach((mm) => mm.dispose());
      else mat.dispose();
    }
    this.head = null;
    this.body = null;
  }

  private rebuild(
    bridge: WorldBridge,
    passengers: Array<RailwaysAuthoritativeState["economy"]["shipments"][number]>,
  ): void {
    this.clear();
    if (passengers.length === 0) return;
    const globe = bridge.getGlobe();
    const terrain = bridge.getTileTerrain();
    if (!globe || !terrain) return;
    this.head = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.00042, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xf3d2b4, roughness: 0.75, metalness: 0.02 }),
      Math.max(1, passengers.length),
    );
    this.body = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.00062, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0x6ea6d8, roughness: 0.82, metalness: 0.04 }),
      Math.max(1, passengers.length),
    );
    this.head.frustumCulled = false;
    this.body.frustumCulled = false;
    this.group.add(this.body, this.head);
    let idx = 0;
    const pos = new THREE.Vector3();
    const up = new THREE.Vector3();
    const right = new THREE.Vector3();
    const fwd = new THREE.Vector3();
    const basis = new THREE.Matrix4();
    const model = new THREE.Matrix4();
    const scale = new THREE.Matrix4();
    for (const s of passengers) {
      const tid = s.currentTileId ?? s.originTileId;
      if (tid == null) continue;
      const tile = globe.getTile(tid);
      if (!tile) continue;
      const elev = terrain.get(tid)?.elevation ?? 0;
      up.copy(tile.center).normalize();
      right.crossVectors(up, _up);
      if (right.lengthSq() < 1e-8) right.set(1, 0, 0);
      right.normalize();
      fwd.crossVectors(right, up).normalize();
      const jitter = ((idx % 5) - 2) * 0.00035;
      pos.copy(up).multiplyScalar(globe.radius + elev * 0.08 + 0.0052).addScaledVector(right, jitter);
      basis.makeBasis(right, up, fwd);
      scale.makeScale(1, 1.35, 1);
      model.copy(basis).multiply(scale);
      model.setPosition(pos.clone().addScaledVector(up, 0.00042));
      this.body.setMatrixAt(idx, model);
      model.copy(basis);
      model.setPosition(pos.clone().addScaledVector(up, 0.00126));
      this.head.setMatrixAt(idx, model);
      idx++;
    }
    this.head.count = idx;
    this.body.count = idx;
    this.head.instanceMatrix.needsUpdate = true;
    this.body.instanceMatrix.needsUpdate = true;
  }
}

function buildActiveRailAdjacency(tracks: TrackSegmentState[]): Map<number, Set<number>> {
  const adj = new Map<number, Set<number>>();
  for (const t of tracks) {
    if (t.status !== "active") continue;
    let a = adj.get(t.fromTileId);
    if (!a) {
      a = new Set<number>();
      adj.set(t.fromTileId, a);
    }
    let b = adj.get(t.toTileId);
    if (!b) {
      b = new Set<number>();
      adj.set(t.toTileId, b);
    }
    a.add(t.toTileId);
    b.add(t.fromTileId);
  }
  return adj;
}

function shortestPathUnweighted(
  start: number,
  goal: number,
  getNeighbors: (id: number) => readonly number[],
  maxExpand = 12000,
): number[] | null {
  if (start === goal) return [start];
  const q: number[] = [start];
  const prev = new Map<number, number>();
  prev.set(start, -1);
  let qi = 0;
  while (qi < q.length && q.length < maxExpand) {
    const cur = q[qi++]!;
    const ns = getNeighbors(cur);
    for (let i = 0; i < ns.length; i++) {
      const n = ns[i]!;
      if (prev.has(n)) continue;
      prev.set(n, cur);
      if (n === goal) {
        const path: number[] = [goal];
        let p = cur;
        while (p !== -1) {
          path.push(p);
          p = prev.get(p) ?? -1;
        }
        path.reverse();
        return path;
      }
      q.push(n);
    }
  }
  return null;
}

function waterPathAStar(
  globe: NonNullable<ReturnType<WorldBridge["getGlobe"]>>,
  terrain: NonNullable<ReturnType<WorldBridge["getTileTerrain"]>>,
  rivers: ReturnType<WorldBridge["getRiverFlowByTile"]>,
  start: number,
  goal: number,
): number[] | null {
  const passable = (id: number): boolean => {
    const t = terrain.get(id)?.type;
    if (t === "water" || t === "beach") return true;
    if (rivers?.has(id)) return true;
    return false;
  };
  if (!passable(start) || !passable(goal)) return null;
  const came = new Map<number, number>();
  const gScore = new Map<number, number>([[start, 0]]);
  const open = new Set<number>([start]);
  const f = new Map<number, number>();
  const h = (a: number, b: number): number => {
    const ta = globe.getTile(a);
    const tb = globe.getTile(b);
    if (!ta || !tb) return 1e9;
    return ta.center.distanceToSquared(tb.center);
  };
  f.set(start, h(start, goal));
  let guard = 0;
  while (open.size > 0 && guard++ < 20000) {
    let cur = -1;
    let best = Number.POSITIVE_INFINITY;
    for (const id of open) {
      const fs = f.get(id) ?? Number.POSITIVE_INFINITY;
      if (fs < best) {
        best = fs;
        cur = id;
      }
    }
    if (cur < 0) break;
    if (cur === goal) {
      const path: number[] = [cur];
      while (came.has(path[path.length - 1]!)) {
        path.push(came.get(path[path.length - 1]!)!);
      }
      path.reverse();
      return path;
    }
    open.delete(cur);
    const tile = globe.getTile(cur);
    if (!tile) continue;
    for (const n of tile.neighbors) {
      if (!passable(n)) continue;
      const tentative = (gScore.get(cur) ?? 0) + 1;
      if (tentative >= (gScore.get(n) ?? Number.POSITIVE_INFINITY)) continue;
      came.set(n, cur);
      gScore.set(n, tentative);
      f.set(n, tentative + h(n, goal));
      open.add(n);
    }
  }
  return null;
}

class HudButtonIcons3D {
  private readonly loader = new GLTFLoader();
  private readonly rigs: Array<{
    container: HTMLElement;
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    root: THREE.Group;
    spinSpeed: number;
  }> = [];
  private readonly templateByPath = new Map<string, THREE.Object3D>();

  constructor(trackHost: HTMLElement, routeHost: HTMLElement, vehicleHost: HTMLElement) {
    const trackRig = this.makeRig(trackHost, 0.11);
    trackRig.root.add(this.buildTrackSectionModel());
    this.rigs.push(trackRig);

    const routeRig = this.makeRig(routeHost, 0.08);
    const routeGroup = new THREE.Group();
    const rail = this.buildTrackSectionModel();
    rail.position.z = -0.0016;
    routeGroup.add(rail);
    const buoyGeom = new THREE.SphereGeometry(0.00095, 8, 8);
    const buoyMat = new THREE.MeshStandardMaterial({ color: 0x6ad5ff, roughness: 0.6, metalness: 0.12 });
    const b0 = new THREE.Mesh(buoyGeom, buoyMat);
    b0.position.set(-0.0021, 0.0009, 0.0015);
    const b1 = new THREE.Mesh(buoyGeom, buoyMat.clone());
    b1.position.set(0.0021, 0.0009, 0.0015);
    routeGroup.add(b0, b1);
    routeRig.root.add(routeGroup);
    this.rigs.push(routeRig);

    const vehicleRig = this.makeRig(vehicleHost, 0.06);
    this.rigs.push(vehicleRig);
    this.loadAssetIntoRig(
      "/assets/vehicles/Locomotive Front.glb",
      vehicleRig,
      new THREE.Vector3(-0.0018, 0, 0.0004),
      0.004,
      -Math.PI * 0.5,
    );
    this.loadAssetIntoRig(
      "/assets/vehicles/Sail Ship.glb",
      vehicleRig,
      new THREE.Vector3(0.0018, -0.0001, -0.0007),
      0.0042,
      -Math.PI * 0.35,
    );
  }

  private makeRig(container: HTMLElement, spinSpeed: number): {
    container: HTMLElement;
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    root: THREE.Group;
    spinSpeed: number;
  } {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(42, 42);
    renderer.domElement.style.width = "42px";
    renderer.domElement.style.height = "42px";
    renderer.domElement.style.display = "block";
    container.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.001, 10);
    camera.position.set(0.012, 0.0085, 0.012);
    camera.lookAt(0, 0, 0);
    const hemi = new THREE.HemisphereLight(0xffffff, 0x253348, 0.95);
    const key = new THREE.DirectionalLight(0xffffff, 0.75);
    key.position.set(1, 2, 1.2);
    scene.add(hemi, key);
    const root = new THREE.Group();
    scene.add(root);
    return { container, renderer, scene, camera, root, spinSpeed };
  }

  private buildTrackSectionModel(): THREE.Object3D {
    const g = new THREE.Group();
    const bed = new THREE.Mesh(
      new THREE.BoxGeometry(0.009, 0.00095, 0.0026),
      new THREE.MeshStandardMaterial({ color: 0x7f8894, roughness: 0.86, metalness: 0.05 }),
    );
    g.add(bed);
    const railGeom = new THREE.BoxGeometry(0.0091, 0.00034, 0.00024);
    const railMat = new THREE.MeshStandardMaterial({ color: 0xc9cfda, roughness: 0.58, metalness: 0.42 });
    const railL = new THREE.Mesh(railGeom, railMat);
    railL.position.set(0, 0.00056, 0.0007);
    const railR = new THREE.Mesh(railGeom, railMat.clone());
    railR.position.set(0, 0.00056, -0.0007);
    g.add(railL, railR);
    const sleeperGeom = new THREE.BoxGeometry(0.00022, 0.0002, 0.0022);
    const sleeperMat = new THREE.MeshStandardMaterial({ color: 0x8b6a4a, roughness: 0.9, metalness: 0.05 });
    for (let i = 0; i < 7; i++) {
      const t = (i - 3) / 3;
      const s = new THREE.Mesh(sleeperGeom, sleeperMat.clone());
      s.position.set(t * 0.0013, 0.00035, 0);
      g.add(s);
    }
    g.rotation.y = Math.PI * 0.18;
    g.rotation.x = -Math.PI * 0.05;
    return g;
  }

  private loadAssetIntoRig(
    path: string,
    rig: { root: THREE.Group },
    pos: THREE.Vector3,
    targetMaxDim: number,
    yawRad: number,
  ): void {
    const addTemplate = (template: THREE.Object3D): void => {
      const clone = template.clone(true);
      clone.position.copy(pos);
      clone.rotation.y = yawRad;
      rig.root.add(clone);
    };
    const cached = this.templateByPath.get(path);
    if (cached) {
      addTemplate(cached);
      return;
    }
    this.loader.load(
      path,
      (gltf) => {
        const scene = gltf.scene.clone(true);
        const box = new THREE.Box3().setFromObject(scene);
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        if (!Number.isFinite(maxDim) || maxDim < 1e-6) return;
        const center = new THREE.Vector3();
        box.getCenter(center);
        scene.position.sub(center);
        const scale = targetMaxDim / maxDim;
        scene.scale.setScalar(scale);
        scene.traverse((o) => {
          if (o instanceof THREE.Mesh) {
            o.castShadow = false;
            o.receiveShadow = false;
          }
        });
        this.templateByPath.set(path, scene);
        addTemplate(scene);
      },
      undefined,
      () => {
        // Ignore icon-only asset load failures; gameplay asset loading has own diagnostics.
      },
    );
  }

  update(nowMs: number): void {
    for (const rig of this.rigs) {
      if (rig.container.clientWidth <= 0 || rig.container.clientHeight <= 0) continue;
      rig.root.rotation.y = nowMs * 0.001 * rig.spinSpeed;
      rig.renderer.render(rig.scene, rig.camera);
    }
  }
}

class VehicleSpriteStrip3D {
  private readonly loader = new GLTFLoader();
  private readonly templateByKind = new Map<VehicleKind, THREE.Object3D>();
  private readonly loadingKind = new Set<VehicleKind>();
  private readonly rigs = new Map<
    string,
    {
      vehicleId: string;
      kind: VehicleKind;
      renderer: THREE.WebGLRenderer;
      scene: THREE.Scene;
      camera: THREE.PerspectiveCamera;
      root: THREE.Group;
      host: HTMLElement;
    }
  >();

  sync(items: Array<{ vehicleId: string; kind: VehicleKind; host: HTMLElement }>): void {
    const keep = new Set(items.map((i) => i.vehicleId));
    for (const [id, rig] of this.rigs) {
      if (keep.has(id)) continue;
      rig.renderer.dispose();
      rig.host.innerHTML = "";
      this.rigs.delete(id);
    }
    for (const item of items) {
      let rig = this.rigs.get(item.vehicleId);
      if (!rig) {
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
        renderer.setSize(56, 38);
        renderer.domElement.style.width = "56px";
        renderer.domElement.style.height = "38px";
        renderer.domElement.style.display = "block";
        item.host.innerHTML = "";
        item.host.appendChild(renderer.domElement);
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(30, 56 / 38, 0.001, 10);
        camera.position.set(0.012, 0.008, 0.012);
        camera.lookAt(0, 0, 0);
        scene.add(
          new THREE.HemisphereLight(0xffffff, 0x233248, 0.95),
          Object.assign(new THREE.DirectionalLight(0xffffff, 0.75), {
            position: new THREE.Vector3(1.2, 1.9, 0.9),
          }),
        );
        const root = new THREE.Group();
        scene.add(root);
        rig = { vehicleId: item.vehicleId, kind: item.kind, renderer, scene, camera, root, host: item.host };
        this.rigs.set(item.vehicleId, rig);
      } else {
        rig.kind = item.kind;
        rig.host = item.host;
      }
      if (rig.root.children.length === 0) {
        const tpl = this.templateByKind.get(item.kind);
        if (tpl) rig.root.add(tpl.clone(true));
        else this.loadKindTemplate(item.kind);
      }
    }
  }

  update(nowMs: number): void {
    for (const rig of this.rigs.values()) {
      rig.root.rotation.y = nowMs * 0.00055;
      rig.renderer.render(rig.scene, rig.camera);
    }
  }

  private kindAssetCandidates(kind: VehicleKind): string[] {
    if (kind === "sail_ship") return ["/assets/vehicles/Sail Ship.glb"];
    if (kind === "locomotive_front") return ["/assets/vehicles/Locomotive Front.glb"];
    if (kind === "passenger_carriage") return ["/assets/vehicles/Locomotive Passenger Carriage.glb"];
    return ["/assets/vehicles/Locomotive Wagon.glb"];
  }

  private loadKindTemplate(kind: VehicleKind): void {
    if (this.loadingKind.has(kind) || this.templateByKind.has(kind)) return;
    this.loadingKind.add(kind);
    const candidates = this.kindAssetCandidates(kind);
    const tryLoad = (idx: number): void => {
      if (idx >= candidates.length) {
        this.loadingKind.delete(kind);
        return;
      }
      this.loader.load(
        candidates[idx]!,
        (gltf) => {
          const model = gltf.scene.clone(true);
          const box = new THREE.Box3().setFromObject(model);
          const size = new THREE.Vector3();
          box.getSize(size);
          const maxDim = Math.max(size.x, size.y, size.z);
          if (!Number.isFinite(maxDim) || maxDim <= 1e-6) {
            this.loadingKind.delete(kind);
            return;
          }
          const center = new THREE.Vector3();
          box.getCenter(center);
          model.position.sub(center);
          model.position.y -= box.min.y;
          model.scale.setScalar((kind === "sail_ship" ? 0.0053 : 0.0042) / maxDim);
          model.rotation.y = -Math.PI * 0.5;
          model.traverse((o) => {
            if (o instanceof THREE.Mesh) {
              o.castShadow = false;
              o.receiveShadow = false;
            }
          });
          this.templateByKind.set(kind, model);
          this.loadingKind.delete(kind);
          for (const rig of this.rigs.values()) {
            if (rig.kind !== kind || rig.root.children.length > 0) continue;
            rig.root.add(model.clone(true));
          }
        },
        undefined,
        () => tryLoad(idx + 1),
      );
    };
    tryLoad(0);
  }
}

export function startRailwaysGameRuntime(sessionSetup: SessionSetup): void {
  const hideDemoUi = (): void => {
    const ids = ["panel", "hexDebugPanel"];
    for (const id of ids) {
      const el = document.getElementById(id);
      if (!el) continue;
      el.style.display = "none";
      el.setAttribute("aria-hidden", "true");
    }
  };
  hideDemoUi();
  if (!document.getElementById("rwHudUiStyle")) {
    const st = document.createElement("style");
    st.id = "rwHudUiStyle";
    st.textContent = `
      .rw-main-actions{display:flex;gap:10px;flex-wrap:wrap}
      .rw-main-btn{min-width:182px;min-height:62px;border:1px solid rgba(200,220,255,.35);background:rgba(20,34,50,.78);color:#eaf2ff;border-radius:10px;padding:6px 10px;display:flex;align-items:center;justify-content:center;gap:10px;font-weight:700;cursor:pointer}
      .rw-main-btn:hover{background:rgba(33,52,74,.9)}
      .rw-main-icon3d{width:42px;height:42px;display:inline-flex;align-items:center;justify-content:center;pointer-events:none}
      .rw-submenu{display:none;gap:8px;flex-wrap:wrap;align-items:center}
      .rw-submenu.active{display:flex}
      .rw-time-btn{width:34px;height:30px;border-radius:8px}
      .rw-modal-backdrop{position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(6,10,18,.48);z-index:10040;backdrop-filter:blur(2px)}
      .rw-modal-backdrop.active{display:flex}
      .rw-modal{min-width:320px;max-width:520px;background:rgba(9,16,28,.96);border:1px solid rgba(200,220,255,.28);border-radius:12px;box-shadow:0 18px 42px rgba(0,0,0,.45);padding:14px;color:#eaf2ff}
      .rw-modal-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:12px}
      .rw-modal-actions button{min-width:90px}
      .rw-actions{display:flex;gap:8px;flex-wrap:wrap}
      .rw-chunky-btn{min-height:38px;padding:8px 12px;border:1px solid rgba(200,220,255,.35);border-radius:10px;background:rgba(28,44,66,.92);color:#eaf2ff;font-weight:700;cursor:pointer}
      .rw-chunky-btn:disabled{opacity:.5;cursor:default}
      .rw-assign-hint{opacity:.92;font-weight:600}
      .rw-inventory-strip{display:flex;gap:8px;overflow-x:auto;max-width:min(1100px,92vw);padding:3px 1px 5px 1px}
      .rw-card{min-height:78px;min-width:110px;max-width:110px;border:1px solid rgba(190,210,240,.28);border-radius:10px;background:rgba(18,30,46,.92);color:#eaf2ff;display:flex;flex-direction:column;justify-content:flex-start;align-items:center;gap:4px;padding:4px 4px 6px 4px;cursor:pointer;flex:0 0 auto}
      .rw-card:hover{border-color:rgba(150,220,255,.55)}
      .rw-card.selected{outline:2px solid rgba(110,220,255,.95);background:rgba(22,52,76,.96)}
      .rw-card.glow{box-shadow:0 0 0 2px rgba(126,203,255,.55),0 0 18px rgba(126,203,255,.45)}
      .rw-sprite-host{width:56px;height:38px;display:flex;align-items:center;justify-content:center;pointer-events:none}
      .rw-card .k{font-size:11px;opacity:.85}
      .rw-card .id{font-size:11px;font-weight:700}
    `;
    document.head.appendChild(st);
  }

  const panel = document.createElement("div");
  panel.style.cssText =
    "position:fixed;left:0;right:0;bottom:0;z-index:10020;background:rgba(8,14,24,0.9);border-top:1px solid rgba(200,220,255,0.25);padding:8px 10px;color:#eaf2ff;font:12px system-ui,-apple-system,Segoe UI,Roboto,sans-serif;display:flex;align-items:center;gap:10px;flex-wrap:wrap;backdrop-filter:blur(6px)";
  panel.innerHTML = `
    <div style="font-weight:700;white-space:nowrap;margin-right:2px">Railways</div>
    <div id="rwHudMoney" style="white-space:nowrap">Funds: £1000</div>
    <div id="rwHudClock" style="white-space:nowrap">Time: --</div>
    <div id="rwHudTrackCost" style="white-space:nowrap">Planned cost: £0</div>
    <div id="rwHudRouteInfo" style="white-space:nowrap">Route plan: none</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;padding-left:8px;border-left:1px solid rgba(255,255,255,0.18)">
      <button class="rw-time-btn" data-time="pause" type="button" title="Pause">⏸</button>
      <button class="rw-time-btn" data-time="play1" type="button" title="1:1">▶</button>
      <button class="rw-time-btn" data-time="play2" type="button" title="Speed 2">▶▶</button>
      <button class="rw-time-btn" data-time="play3" type="button" title="Speed 3">▶▶▶</button>
      <button class="rw-time-btn" data-time="play4" type="button" title="Speed 4">▶▶▶▶</button>
    </div>
    <div id="rwMainMenu" class="rw-main-actions" style="padding-left:8px;border-left:1px solid rgba(255,255,255,0.18)">
      <button id="rwMainTrackBtn" class="rw-main-btn" type="button"><span id="rwMainTrackIcon" class="rw-main-icon3d"></span><span>Lay Track</span></button>
      <button id="rwMainRouteBtn" class="rw-main-btn" type="button"><span id="rwMainRouteIcon" class="rw-main-icon3d"></span><span>Plan Route</span></button>
      <button id="rwMainVehicleBtn" class="rw-main-btn" type="button"><span id="rwMainVehicleIcon" class="rw-main-icon3d"></span><span>Assign Vehicle</span></button>
    </div>
    <div id="rwTrackMenu" class="rw-submenu" style="padding-left:8px;border-left:1px solid rgba(255,255,255,0.18)">
      <button id="rwTrackBackBtn" type="button">← Back</button>
      <button id="rwTrackModeBtn" type="button">Track Mode</button>
      <button id="rwTrackUndoBtn" type="button" disabled>Undo</button>
      <button id="rwTrackConfirmBtn" type="button" disabled>Confirm</button>
      <button id="rwTrackCancelBtn" type="button" disabled>Cancel</button>
    </div>
    <div id="rwRouteMenu" class="rw-submenu" style="padding-left:8px;border-left:1px solid rgba(255,255,255,0.18)">
      <button id="rwRouteBackBtn" type="button">← Back</button>
      <button id="rwRouteModeBtn" type="button">Route Mode</button>
      <button id="rwRouteConfirmBtn" type="button" disabled>Confirm Route</button>
      <button id="rwRouteCancelBtn" type="button" disabled>Cancel Route</button>
      <select id="rwRouteTypeSel">
        <option value="rail">Rail</option>
        <option value="water">Water</option>
      </select>
    </div>
    <div id="rwVehicleMenu" class="rw-submenu" style="padding-left:8px;border-left:1px solid rgba(255,255,255,0.18)">
      <button id="rwVehicleBackBtn" type="button">← Back</button>
      <div class="rw-actions">
        <button id="rwAssignSelectedBtn" class="rw-chunky-btn" type="button" disabled>Assign Selected</button>
        <button id="rwUnassignSelectedBtn" class="rw-chunky-btn" type="button" disabled>Unassign Selected At City</button>
        <button id="rwClearSelectionBtn" class="rw-chunky-btn" type="button">Clear Selection</button>
      </div>
      <div id="rwAssignHint" class="rw-assign-hint">Select inventory items to begin assignment.</div>
      <div id="rwInventoryGrid" class="rw-inventory-strip"></div>
      <div id="rwSelectedVehiclePanel" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <span id="rwSelectedVehicleInfo" style="opacity:0.9">Selected vehicle: none</span>
        <button id="rwUnassignAtCityBtn" type="button" disabled>Unassign at next city</button>
      </div>
    </div>
    <div id="rwInventorySummary" style="opacity:0.9;padding-left:8px;border-left:1px solid rgba(255,255,255,0.18)"></div>
  `;
  document.body.appendChild(panel);
  const modalBackdrop = document.createElement("div");
  modalBackdrop.id = "rwModalBackdrop";
  modalBackdrop.className = "rw-modal-backdrop";
  modalBackdrop.innerHTML = `
    <div class="rw-modal" role="dialog" aria-modal="true" aria-live="polite">
      <div id="rwModalMessage"></div>
      <div class="rw-modal-actions">
        <button id="rwModalNoBtn" type="button">No</button>
        <button id="rwModalYesBtn" type="button">Yes</button>
      </div>
    </div>
  `;
  document.body.appendChild(modalBackdrop);
  const trackUndoHotspot = document.createElement("button");
  trackUndoHotspot.type = "button";
  trackUndoHotspot.textContent = "x";
  trackUndoHotspot.title = "Undo last track segment";
  trackUndoHotspot.style.cssText =
    "position:fixed;z-index:10030;width:18px;height:18px;border-radius:9px;border:1px solid rgba(255,255,255,0.85);background:rgba(17,24,39,0.92);color:#fff;font:700 12px/16px system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:0;display:none;cursor:pointer;transform:translate(-50%,-50%)";
  document.body.appendChild(trackUndoHotspot);

  const moneyEl = panel.querySelector("#rwHudMoney") as HTMLDivElement;
  const clockEl = panel.querySelector("#rwHudClock") as HTMLDivElement;
  const costEl = panel.querySelector("#rwHudTrackCost") as HTMLDivElement;
  const routeInfoEl = panel.querySelector("#rwHudRouteInfo") as HTMLDivElement;
  const mainMenuEl = panel.querySelector("#rwMainMenu") as HTMLDivElement;
  const trackMenuEl = panel.querySelector("#rwTrackMenu") as HTMLDivElement;
  const routeMenuEl = panel.querySelector("#rwRouteMenu") as HTMLDivElement;
  const vehicleMenuEl = panel.querySelector("#rwVehicleMenu") as HTMLDivElement;
  const mainTrackBtn = panel.querySelector("#rwMainTrackBtn") as HTMLButtonElement;
  const mainRouteBtn = panel.querySelector("#rwMainRouteBtn") as HTMLButtonElement;
  const mainVehicleBtn = panel.querySelector("#rwMainVehicleBtn") as HTMLButtonElement;
  const mainTrackIconHost = panel.querySelector("#rwMainTrackIcon") as HTMLSpanElement;
  const mainRouteIconHost = panel.querySelector("#rwMainRouteIcon") as HTMLSpanElement;
  const mainVehicleIconHost = panel.querySelector("#rwMainVehicleIcon") as HTMLSpanElement;
  const trackBackBtn = panel.querySelector("#rwTrackBackBtn") as HTMLButtonElement;
  const routeBackBtn = panel.querySelector("#rwRouteBackBtn") as HTMLButtonElement;
  const vehicleBackBtn = panel.querySelector("#rwVehicleBackBtn") as HTMLButtonElement;
  const trackModeBtn = panel.querySelector("#rwTrackModeBtn") as HTMLButtonElement;
  const trackUndoBtn = panel.querySelector("#rwTrackUndoBtn") as HTMLButtonElement;
  const trackConfirmBtn = panel.querySelector("#rwTrackConfirmBtn") as HTMLButtonElement;
  const trackCancelBtn = panel.querySelector("#rwTrackCancelBtn") as HTMLButtonElement;
  const routeModeBtn = panel.querySelector("#rwRouteModeBtn") as HTMLButtonElement;
  const routeConfirmBtn = panel.querySelector("#rwRouteConfirmBtn") as HTMLButtonElement;
  const routeCancelBtn = panel.querySelector("#rwRouteCancelBtn") as HTMLButtonElement;
  const routeTypeSel = panel.querySelector("#rwRouteTypeSel") as HTMLSelectElement;
  const assignSelectedBtn = panel.querySelector("#rwAssignSelectedBtn") as HTMLButtonElement;
  const unassignSelectedBtn = panel.querySelector("#rwUnassignSelectedBtn") as HTMLButtonElement;
  const clearSelectionBtn = panel.querySelector("#rwClearSelectionBtn") as HTMLButtonElement;
  const assignHintEl = panel.querySelector("#rwAssignHint") as HTMLDivElement;
  const inventoryGridEl = panel.querySelector("#rwInventoryGrid") as HTMLDivElement;
  const selectedVehicleInfoEl = panel.querySelector("#rwSelectedVehicleInfo") as HTMLSpanElement;
  const unassignAtCityBtn = panel.querySelector("#rwUnassignAtCityBtn") as HTMLButtonElement;
  const inventorySummaryEl = panel.querySelector("#rwInventorySummary") as HTMLDivElement;
  const modalMessageEl = modalBackdrop.querySelector("#rwModalMessage") as HTMLDivElement;
  const modalYesBtn = modalBackdrop.querySelector("#rwModalYesBtn") as HTMLButtonElement;
  const modalNoBtn = modalBackdrop.querySelector("#rwModalNoBtn") as HTMLButtonElement;
  const timeBtns = [...panel.querySelectorAll("button[data-time]")] as HTMLButtonElement[];

  const visuals = new TrackVisualLayer();
  const buildProgressOverlay = new BuildProgressOverlay2D();
  const trackPlanCostOverlay = new TrackPlanCostOverlay2D();
  const routeVisuals = new RouteVisualLayer();
  const vehicleVisuals = new VehicleVisualLayer();
  const passengerVisuals = new PassengerVisualLayer();
  const inventorySprites = new VehicleSpriteStrip3D();
  const hudIcons = new HudButtonIcons3D(
    mainTrackIconHost,
    mainRouteIconHost,
    mainVehicleIconHost,
  );
  const pendingPath: number[] = [];
  const pendingRoutePath: number[] = [];
  let placingTrack = false;
  let planningRoute = false;
  let lastSnapshot: RailwaysAuthoritativeState | null = null;
  let bridge: WorldBridge | undefined;
  let previewGroup: THREE.Group | null = null;
  let legalNextGroup: THREE.Group | null = null;
  let routePreviewGroup: THREE.Group | null = null;
  let waterCityCandidateGroup: THREE.Group | null = null;
  const cityTileToCityId = new Map<number, string>();
  const reachableWaterCityTiles = new Set<number>();
  const pendingRouteCityStops: number[] = [];
  let clockAnchorSimMs = Number.NaN;
  let clockAnchorWallMs = 0;
  let clockAnchorPaused = true;
  let clockAnchorSpeed = 1;
  let selectedVehicleId: string | null = null;
  const selectedInventoryVehicleIds = new Set<string>();
  let pendingAutoRoute: { path: number[]; isLoop: boolean } | null = null;
  let pendingModal:
    | {
        message: string;
        yesLabel?: string;
        noLabel?: string;
        onYes: () => void;
        onNo?: () => void;
      }
    | null = null;

  type HudMenu = "main" | "track" | "route" | "vehicle";
  let activeHudMenu: HudMenu = "main";

  function isWaterTerrainType(type: string | undefined): boolean {
    if (!type) return false;
    const t = type.toLowerCase();
    return (
      t === "water" ||
      t === "beach" ||
      t === "ocean" ||
      t === "sea" ||
      t === "lake"
    );
  }

  function openDecisionModal(
    message: string,
    onYes: () => void,
    onNo?: () => void,
    yesLabel = "Yes",
    noLabel = "No",
  ): void {
    pendingModal = { message, yesLabel, noLabel, onYes, onNo };
    modalMessageEl.textContent = message;
    modalYesBtn.textContent = yesLabel;
    modalNoBtn.textContent = noLabel;
    modalBackdrop.classList.add("active");
  }

  function closeDecisionModal(accepted: boolean): void {
    const active = pendingModal;
    if (!active) return;
    pendingModal = null;
    modalBackdrop.classList.remove("active");
    if (accepted) active.onYes();
    else active.onNo?.();
  }

  function hasExistingTrackEdge(a: number, b: number): boolean {
    const snap = lastSnapshot;
    if (!snap) return false;
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    return snap.tracks.some((t) => t.fromTileId === lo && t.toTileId === hi);
  }

  function isRailBuildableTile(tileId: number): boolean {
    const terrain = bridge?.getTileTerrain();
    const rivers = bridge?.getRiverFlowByTile();
    if (!terrain) return false;
    // City tiles are always buildable (e.g., port/river city centers like London).
    if (cityTileToCityId.has(tileId)) return true;
    const water = isWaterTerrainType(terrain.get(tileId)?.type);
    if (!water) return true;
    // Allow rail on river-channel hexes (bridges), but keep open water blocked.
    return !!rivers?.has(tileId);
  }

  function updateTrackButtons(): void {
    trackConfirmBtn.disabled = pendingPath.length < 2 || !placingTrack;
    trackUndoBtn.disabled = pendingPath.length === 0 || !placingTrack;
    trackCancelBtn.disabled = pendingPath.length === 0;
    trackModeBtn.textContent = placingTrack ? "Exit Track Mode" : "Place Track";
  }

  function updateRouteButtons(): void {
    routeConfirmBtn.disabled = pendingRoutePath.length < 2 || !planningRoute;
    routeCancelBtn.disabled = pendingRoutePath.length === 0;
    routeModeBtn.textContent = planningRoute ? "Exit Route Mode" : "Plan Route";
    routeInfoEl.textContent =
      pendingRoutePath.length >= 2
        ? `Route plan: ${routeTypeSel.value}, ${pendingRoutePath.length} hexes`
        : "Route plan: none";
  }

  function setHudMenu(menu: HudMenu): void {
    activeHudMenu = menu;
    mainMenuEl.style.display = menu === "main" ? "flex" : "none";
    trackMenuEl.classList.toggle("active", menu === "track");
    routeMenuEl.classList.toggle("active", menu === "route");
    vehicleMenuEl.classList.toggle("active", menu === "vehicle");
    if (lastSnapshot) refreshInventoryUi(lastSnapshot);
  }

  function clearPreview(): void {
    if (!previewGroup) return;
    previewGroup.parent?.remove(previewGroup);
    previewGroup.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.Line) {
        o.geometry.dispose();
        const m = o.material;
        if (Array.isArray(m)) m.forEach((mm) => mm.dispose());
        else m.dispose();
      }
    });
    previewGroup = null;
  }

  function clearLegalNextPreview(): void {
    if (!legalNextGroup) return;
    legalNextGroup.parent?.remove(legalNextGroup);
    legalNextGroup.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        const m = o.material;
        if (Array.isArray(m)) m.forEach((mm) => mm.dispose());
        else m.dispose();
      }
    });
    legalNextGroup = null;
  }

  function clearRoutePreview(): void {
    if (!routePreviewGroup) return;
    routePreviewGroup.parent?.remove(routePreviewGroup);
    routePreviewGroup.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.Line) {
        o.geometry.dispose();
        const m = o.material;
        if (Array.isArray(m)) m.forEach((mm) => mm.dispose());
        else m.dispose();
      }
    });
    routePreviewGroup = null;
  }

  function clearWaterCityCandidates(): void {
    reachableWaterCityTiles.clear();
    if (!waterCityCandidateGroup) return;
    waterCityCandidateGroup.parent?.remove(waterCityCandidateGroup);
    waterCityCandidateGroup.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        const m = o.material;
        if (Array.isArray(m)) m.forEach((mm) => mm.dispose());
        else m.dispose();
      }
    });
    waterCityCandidateGroup = null;
  }

  function rebuildPreview(): void {
    clearPreview();
    if (!bridge || pendingPath.length === 0) return;
    const g = bridge.getGlobe();
    const scene = bridge.getScene();
    const terrain = bridge.getTileTerrain();
    if (!g || !terrain) return;
    previewGroup = new THREE.Group();
    previewGroup.name = "RailTrackPreview";
    const markerMat = new THREE.MeshBasicMaterial({
      color: 0x7ecbff,
      transparent: true,
      opacity: 0.7,
    });
    const points: THREE.Vector3[] = [];
    for (const tileId of pendingPath) {
      const tile = g.getTile(tileId);
      if (!tile) continue;
      const elev = terrain.get(tileId)?.elevation ?? 0;
      const p = tile.center
        .clone()
        .normalize()
        .multiplyScalar(g.radius + elev * 0.08 + 0.0045);
      points.push(p.clone());
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.0033, 8, 8), markerMat.clone());
      m.position.copy(p);
      previewGroup.add(m);
    }
    if (points.length >= 2) {
      const lineGeom = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = new THREE.LineBasicMaterial({
        color: 0x9fd9ff,
        transparent: true,
        opacity: 0.85,
      });
      const line = new THREE.Line(lineGeom, lineMat);
      line.renderOrder = 95;
      previewGroup.add(line);
    }
    scene.add(previewGroup);
  }

  function updateTrackUndoHotspot(): void {
    if (!placingTrack || activeHudMenu !== "track" || pendingPath.length === 0 || !bridge) {
      trackUndoHotspot.style.display = "none";
      return;
    }
    const g = bridge.getGlobe();
    const camera = bridge.getCamera();
    const terrain = bridge.getTileTerrain();
    const rendererEl = bridge.getRendererDomElement();
    if (!g || !terrain) {
      trackUndoHotspot.style.display = "none";
      return;
    }
    const lastTileId = pendingPath[pendingPath.length - 1]!;
    const tile = g.getTile(lastTileId);
    if (!tile) {
      trackUndoHotspot.style.display = "none";
      return;
    }
    const elev = terrain.get(lastTileId)?.elevation ?? 0;
    const worldPos = tile.center
      .clone()
      .normalize()
      .multiplyScalar(g.radius + elev * 0.08 + 0.0054);
    const ndc = worldPos.project(camera);
    if (ndc.z < -1 || ndc.z > 1) {
      trackUndoHotspot.style.display = "none";
      return;
    }
    const rect = rendererEl.getBoundingClientRect();
    const x = rect.left + (ndc.x * 0.5 + 0.5) * rect.width;
    const y = rect.top + (1 - (ndc.y * 0.5 + 0.5)) * rect.height;
    trackUndoHotspot.style.left = `${Math.round(x + 12)}px`;
    trackUndoHotspot.style.top = `${Math.round(y - 12)}px`;
    trackUndoHotspot.style.display = "block";
  }

  function rebuildLegalNextPreview(): void {
    clearLegalNextPreview();
    if (!bridge || !placingTrack || pendingPath.length === 0) return;
    const g = bridge.getGlobe();
    const scene = bridge.getScene();
    const terrain = bridge.getTileTerrain();
    if (!g || !terrain) return;
    const last = pendingPath[pendingPath.length - 1]!;
    const start = pendingPath[0]!;
    const prev = pendingPath.length >= 2 ? pendingPath[pendingPath.length - 2]! : null;
    const legalNeighbors = (g.getTile(last)?.neighbors ?? []).filter((n) => {
      if (!isRailBuildableTile(n)) return false;
      if (prev != null && n === prev) return true;
      const closesLoop = n === start && pendingPath.length >= 3;
      if (!closesLoop && pendingPath.includes(n)) return false;
      return !hasExistingTrackEdge(last, n);
    });
    if (legalNeighbors.length === 0) return;
    legalNextGroup = new THREE.Group();
    legalNextGroup.name = "RailLegalNextPreview";
    const mat = new THREE.MeshBasicMaterial({
      color: 0x56f0b8,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    for (const tileId of legalNeighbors) {
      const tile = g.getTile(tileId);
      if (!tile) continue;
      const elev = terrain.get(tileId)?.elevation ?? 0;
      const p = tile.center
        .clone()
        .normalize()
        .multiplyScalar(g.radius + elev * 0.08 + 0.0034);
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.0048, 8, 8), mat.clone());
      m.position.copy(p);
      m.userData.legalTileId = tileId;
      legalNextGroup.add(m);
    }
    scene.add(legalNextGroup);
  }

  function rebuildRoutePreview(): void {
    clearRoutePreview();
    if (!bridge || pendingRoutePath.length < 2) return;
    const g = bridge.getGlobe();
    const scene = bridge.getScene();
    const terrain = bridge.getTileTerrain();
    if (!g || !terrain) return;
    const points: THREE.Vector3[] = [];
    for (const tileId of pendingRoutePath) {
      const tile = g.getTile(tileId);
      if (!tile) continue;
      const elev = terrain.get(tileId)?.elevation ?? 0;
      points.push(
        tile.center.clone().normalize().multiplyScalar(g.radius + elev * 0.08 + 0.009),
      );
    }
    if (points.length < 2) return;
    routePreviewGroup = new THREE.Group();
    const geom = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineDashedMaterial({
      color: routeTypeSel.value === "water" ? 0x6ad5ff : 0xffc87a,
      dashSize: 0.008,
      gapSize: 0.005,
      transparent: true,
      opacity: 0.8,
    });
    const line = new THREE.Line(geom, mat);
    line.computeLineDistances();
    routePreviewGroup.add(line);
    scene.add(routePreviewGroup);
  }

  function computePlanCosts(pathTileIds: number[]): {
    costs: number[];
    flags: Array<{ hilly?: boolean; river?: boolean; mountain?: boolean }>;
    total: number;
  } {
    if (!bridge) return { costs: [], flags: [], total: 0 };
    const terrain = bridge.getTileTerrain();
    const rivers = bridge.getRiverFlowByTile();
    const costs: number[] = [];
    const flags: Array<{ hilly?: boolean; river?: boolean; mountain?: boolean }> = [];
    let total = 0;
    for (let i = 1; i < pathTileIds.length; i++) {
      const a = pathTileIds[i - 1]!;
      const b = pathTileIds[i]!;
      const ta = terrain?.get(a);
      const tb = terrain?.get(b);
      const hasRiver = !!rivers?.has(a) || !!rivers?.has(b);
      const c = hexCostCategory(ta, tb, hasRiver);
      costs.push(c.cost);
      flags.push(c.flags);
      total += c.cost;
    }
    return { costs, flags, total };
  }

  function rebuildCityTileIndexFromSnapshot(snap: RailwaysAuthoritativeState): void {
    if (!bridge) return;
    const g = bridge.getGlobe();
    if (!g) return;
    cityTileToCityId.clear();
    for (const c of snap.economy.cities) {
      const tid = g.getTileIdAtDirection(latLonDegToDirection(c.lat, c.lon));
      if (!cityTileToCityId.has(tid)) cityTileToCityId.set(tid, c.cityId);
    }
  }

  function isWaterPassableTile(tileId: number): boolean {
    if (!bridge) return false;
    const terrain = bridge.getTileTerrain();
    const rivers = bridge.getRiverFlowByTile();
    const t = terrain?.get(tileId)?.type?.toLowerCase();
    if (t === "water" || t === "beach" || t === "ocean" || t === "sea" || t === "lake") return true;
    return !!rivers?.has(tileId);
  }

  function cityWaterAccessTiles(tileId: number): number[] {
    if (!bridge) return [];
    const g = bridge.getGlobe();
    if (!g) return [];
    const out: number[] = [];
    if (isWaterPassableTile(tileId)) out.push(tileId);
    for (const n of g.getTile(tileId)?.neighbors ?? []) {
      if (isWaterPassableTile(n)) out.push(n);
    }
    return [...new Set(out)];
  }

  function rebuildWaterCityCandidates(fromCityTileId: number): void {
    clearWaterCityCandidates();
    if (!bridge) return;
    const g = bridge.getGlobe();
    const terrain = bridge.getTileTerrain();
    const scene = bridge.getScene();
    if (!g || !terrain) return;
    const seeds = cityWaterAccessTiles(fromCityTileId);
    if (seeds.length === 0) return;
    const q = [...seeds];
    const visited = new Set<number>(seeds);
    let qi = 0;
    while (qi < q.length && q.length < 220000) {
      const cur = q[qi++]!;
      for (const n of g.getTile(cur)?.neighbors ?? []) {
        if (visited.has(n) || !isWaterPassableTile(n)) continue;
        visited.add(n);
        q.push(n);
      }
    }
    for (const cityTile of cityTileToCityId.keys()) {
      if (cityTile === fromCityTileId) continue;
      const access = cityWaterAccessTiles(cityTile);
      if (access.some((a) => visited.has(a))) reachableWaterCityTiles.add(cityTile);
    }
    if (reachableWaterCityTiles.size === 0) return;
    waterCityCandidateGroup = new THREE.Group();
    waterCityCandidateGroup.name = "WaterRouteCityCandidates";
    const mat = new THREE.MeshBasicMaterial({
      color: 0x6ad5ff,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    });
    for (const tileId of reachableWaterCityTiles) {
      const tile = g.getTile(tileId);
      if (!tile) continue;
      const elev = terrain.get(tileId)?.elevation ?? 0;
      const p = tile.center
        .clone()
        .normalize()
        .multiplyScalar(g.radius + elev * 0.08 + 0.0052);
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.0052, 8, 8), mat.clone());
      m.position.copy(p);
      waterCityCandidateGroup.add(m);
    }
    scene.add(waterCityCandidateGroup);
  }

  function updatePlanCostText(): void {
    const plan = computePlanCosts(pendingPath);
    costEl.textContent = `Planned cost: £${plan.total}`;
  }

  function buildTrackPlanCostPoints(): Array<{ worldPos: THREE.Vector3; cost: number }> {
    if (!bridge || pendingPath.length < 2) return [];
    const g = bridge.getGlobe();
    const terrain = bridge.getTileTerrain();
    if (!g || !terrain) return [];
    const plan = computePlanCosts(pendingPath);
    const out: Array<{ worldPos: THREE.Vector3; cost: number }> = [];
    for (let i = 1; i < pendingPath.length; i++) {
      const a = pendingPath[i - 1]!;
      const b = pendingPath[i]!;
      const ta = g.getTile(a);
      const tb = g.getTile(b);
      if (!ta || !tb) continue;
      const ea = terrain.get(a)?.elevation ?? 0;
      const eb = terrain.get(b)?.elevation ?? 0;
      const pa = ta.center.clone().normalize().multiplyScalar(g.radius + ea * 0.08 + 0.005);
      const pb = tb.center.clone().normalize().multiplyScalar(g.radius + eb * 0.08 + 0.005);
      out.push({
        worldPos: pa.lerp(pb, 0.5),
        cost: plan.costs[i - 1] ?? 10,
      });
    }
    return out;
  }

  function sendChooseStartingCityWhenConnected(): void {
    const attempt = () => {
      const st = getNetState();
      if (!st?.connected) return false;
      sendNetCommand({
        kind: "chooseStartingCity",
        cityId: sessionSetup.startCityId,
        colorHex: sessionSetup.colorHex,
      });
      requestNetSnapshot();
      return true;
    };
    if (attempt()) return;
    const id = window.setInterval(() => {
      if (attempt()) window.clearInterval(id);
    }, 250);
  }

  function planRailSegment(fromTileId: number, toTileId: number): number[] | null {
    const snap = lastSnapshot;
    const g = bridge?.getGlobe();
    if (!snap || !g) return null;
    const adj = buildActiveRailAdjacency(snap.tracks);
    const path = shortestPathUnweighted(
      fromTileId,
      toTileId,
      (id) => [...(adj.get(id) ?? [])],
      30000,
    );
    return path;
  }

  function planWaterSegment(fromTileId: number, toTileId: number): number[] | null {
    const g = bridge?.getGlobe();
    const terrain = bridge?.getTileTerrain();
    const rivers = bridge?.getRiverFlowByTile();
    if (!g || !terrain) return null;
    return waterPathAStar(g, terrain, rivers, fromTileId, toTileId);
  }

  function appendRouteTile(tileId: number): void {
    if (!bridge) return;
    if (pendingRoutePath.length === 0) {
      pendingRoutePath.push(tileId);
      return;
    }
    const last = pendingRoutePath[pendingRoutePath.length - 1]!;
    if (tileId === last) return;
    if (
      pendingRoutePath.length >= 2 &&
      tileId === pendingRoutePath[pendingRoutePath.length - 2]
    ) {
      pendingRoutePath.pop();
      return;
    }
    let segment: number[] | null = null;
    if (routeTypeSel.value === "water") {
      segment = planWaterSegment(last, tileId);
    } else {
      segment = planRailSegment(last, tileId);
    }
    if (!segment || segment.length < 2) return;
    for (let i = 1; i < segment.length; i++) {
      pendingRoutePath.push(segment[i]!);
    }
  }

  function resolveClickedCityTile(tileId: number): number | null {
    if (cityTileToCityId.has(tileId)) return tileId;
    if (!bridge) return null;
    const g = bridge.getGlobe();
    if (!g) return null;
    for (const n of g.getTile(tileId)?.neighbors ?? []) {
      if (cityTileToCityId.has(n)) return n;
    }
    return null;
  }

  function resolveTrackStartTile(tileId: number): number | null {
    if (!bridge) return null;
    const g = bridge.getGlobe();
    if (!g) return null;
    if (isRailBuildableTile(tileId)) return tileId;
    const cityTile = resolveClickedCityTile(tileId);
    if (cityTile != null && isRailBuildableTile(cityTile)) return cityTile;
    // Near water/river overlays, click often lands one tile off; allow 1-ring snap.
    for (const n of g.getTile(tileId)?.neighbors ?? []) {
      if (isRailBuildableTile(n)) return n;
      const cityN = resolveClickedCityTile(n);
      if (cityN != null && isRailBuildableTile(cityN)) return cityN;
    }
    return null;
  }

  type AssignIntentMode = "none" | "routeRail" | "routeWater" | "attachCars" | "invalid";
  interface AssignIntent {
    mode: AssignIntentMode;
    selected: PlayerVehicleState[];
    validRouteIds: string[];
    validLocomotiveIds: string[];
    reason: string;
  }

  function vehicleKindLabel(kind: VehicleKind): string {
    if (kind === "locomotive_front") return "Locomotive";
    if (kind === "passenger_carriage") return "Passenger Car";
    if (kind === "wagon") return "Cargo Car";
    return "Ship";
  }

  function computeAssignIntent(
    myVehicles: PlayerVehicleState[],
    myRoutes: PlayerRouteState[],
  ): AssignIntent {
    const selected = myVehicles.filter((v) => selectedInventoryVehicleIds.has(v.vehicleId));
    if (selected.length === 0) {
      return { mode: "none", selected, validRouteIds: [], validLocomotiveIds: [], reason: "Select inventory items to begin assignment." };
    }
    const hasShip = selected.some((v) => v.kind === "sail_ship");
    const hasNonShip = selected.some((v) => v.kind !== "sail_ship");
    if (hasShip && hasNonShip) {
      return { mode: "invalid", selected, validRouteIds: [], validLocomotiveIds: [], reason: "Ships cannot be assigned with rail vehicles in one batch." };
    }
    if (hasShip) {
      const validRouteIds = myRoutes.filter((r) => r.mode === "water").map((r) => r.routeId);
      return {
        mode: "routeWater",
        selected,
        validRouteIds,
        validLocomotiveIds: [],
        reason:
          validRouteIds.length > 0
            ? "Water routes are glowing. Click one to assign selected ships."
            : "Create a water route first.",
      };
    }
    const hasLoco = selected.some((v) => v.kind === "locomotive_front");
    const carsOnly = selected.every(
      (v) => v.kind === "passenger_carriage" || v.kind === "wagon",
    );
    if (hasLoco) {
      if (selected.some((v) => v.kind === "sail_ship")) {
        return { mode: "invalid", selected, validRouteIds: [], validLocomotiveIds: [], reason: "Locomotives cannot be assigned with ships." };
      }
      const validRouteIds = myRoutes.filter((r) => r.mode === "rail").map((r) => r.routeId);
      return {
        mode: "routeRail",
        selected,
        validRouteIds,
        validLocomotiveIds: [],
        reason:
          validRouteIds.length > 0
            ? "Rail routes are glowing. Click one to assign selected locomotives (and attached selected cars)."
            : "Create a rail route first.",
      };
    }
    if (carsOnly) {
      const validLocomotiveIds = myVehicles
        .filter((v) => v.kind === "locomotive_front")
        .map((v) => v.vehicleId);
      return {
        mode: "attachCars",
        selected,
        validRouteIds: [],
        validLocomotiveIds,
        reason:
          validLocomotiveIds.length > 0
            ? "Locomotives are glowing. Click one to attach selected cars."
            : "No locomotives available to attach cars.",
      };
    }
    return { mode: "invalid", selected, validRouteIds: [], validLocomotiveIds: [], reason: "Selection cannot be assigned together." };
  }

  function sendAssignSelectionToRoute(
    routeId: string,
    snap: RailwaysAuthoritativeState,
    selected: PlayerVehicleState[],
  ): void {
    const route = snap.playerRoutes.find((r) => r.routeId === routeId);
    if (!route) return;
    if (route.mode === "water") {
      const shipIds = selected.filter((v) => v.kind === "sail_ship").map((v) => v.vehicleId);
      sendNetCommand({ kind: "assignVehiclesToRoute", routeId, vehicleIds: shipIds });
      requestNetSnapshot();
      return;
    }
    const locoIds = selected.filter((v) => v.kind === "locomotive_front").map((v) => v.vehicleId);
    const carIds = selected
      .filter((v) => v.kind === "passenger_carriage" || v.kind === "wagon")
      .map((v) => v.vehicleId);
    sendNetCommand({ kind: "assignVehiclesToRoute", routeId, vehicleIds: locoIds });
    if (locoIds.length > 0 && carIds.length > 0) {
      const byLoco = new Map<string, string[]>();
      for (const locoId of locoIds) byLoco.set(locoId, []);
      for (let i = 0; i < carIds.length; i++) {
        const locoId = locoIds[i % locoIds.length]!;
        byLoco.get(locoId)!.push(carIds[i]!);
      }
      for (const locoId of locoIds) {
        const existingAttached = snap.playerVehicles
          .filter((v) => v.attachedToVehicleId === locoId)
          .map((v) => v.vehicleId);
        const merged = [...new Set([...existingAttached, ...(byLoco.get(locoId) ?? [])])];
        sendNetCommand({
          kind: "assignCarsToLocomotive",
          locomotiveId: locoId,
          carIds: merged,
        });
      }
    }
    requestNetSnapshot();
  }

  function sendAttachSelectedCarsToLocomotive(
    locomotiveId: string,
    snap: RailwaysAuthoritativeState,
    selected: PlayerVehicleState[],
  ): void {
    const selectedCarIds = selected
      .filter((v) => v.kind === "passenger_carriage" || v.kind === "wagon")
      .map((v) => v.vehicleId);
    if (selectedCarIds.length === 0) return;
    const existingAttached = snap.playerVehicles
      .filter((v) => v.attachedToVehicleId === locomotiveId)
      .map((v) => v.vehicleId);
    sendNetCommand({
      kind: "assignCarsToLocomotive",
      locomotiveId,
      carIds: [...new Set([...existingAttached, ...selectedCarIds])],
    });
    requestNetSnapshot();
  }

  function refreshInventoryUi(snap: RailwaysAuthoritativeState): void {
    const meId = getNetState()?.clientId;
    const myRoutes = snap.playerRoutes.filter((r) => r.ownerClientId === meId);
    const myVehicles = snap.playerVehicles.filter((v) => v.ownerClientId === meId);
    const intent = computeAssignIntent(myVehicles, myRoutes);
    const counts = new Map<VehicleKind, number>();
    for (const v of myVehicles) {
      counts.set(v.kind, (counts.get(v.kind) ?? 0) + 1);
    }
    assignHintEl.textContent = intent.reason;
    assignSelectedBtn.disabled =
      intent.mode === "none" ||
      intent.mode === "invalid" ||
      (intent.mode === "routeRail" && intent.validRouteIds.length === 0) ||
      (intent.mode === "routeWater" && intent.validRouteIds.length === 0) ||
      (intent.mode === "attachCars" && intent.validLocomotiveIds.length === 0);
    unassignSelectedBtn.disabled = !intent.selected.some(
      (v) => (v.assignedRouteId || v.attachedToVehicleId) && !v.pendingUnassignAtCity,
    );
    clearSelectionBtn.disabled = selectedInventoryVehicleIds.size === 0;
    const sorted = [...myVehicles].sort((a, b) =>
      `${a.kind}:${a.vehicleId}`.localeCompare(`${b.kind}:${b.vehicleId}`),
    );
    inventoryGridEl.innerHTML = "";
    const spriteItems: Array<{ vehicleId: string; kind: VehicleKind; host: HTMLElement }> = [];
    for (const v of sorted) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "rw-card";
      if (selectedInventoryVehicleIds.has(v.vehicleId)) card.classList.add("selected");
      if (intent.mode === "attachCars" && intent.validLocomotiveIds.includes(v.vehicleId)) {
        card.classList.add("glow");
      }
      const status = v.pendingUnassignAtCity
        ? "pending city"
        : v.attachedToVehicleId
          ? `attached ${v.attachedToVehicleId}`
          : v.assignedRouteId
            ? `route ${v.assignedRouteId}`
            : "inventory";
      const spriteHost = document.createElement("span");
      spriteHost.className = "rw-sprite-host";
      const title = document.createElement("div");
      title.textContent = vehicleKindLabel(v.kind);
      const id = document.createElement("div");
      id.className = "id";
      id.textContent = v.vehicleId;
      const st = document.createElement("div");
      st.className = "k";
      st.textContent = status;
      card.append(spriteHost, title, id, st);
      card.addEventListener("click", () => {
        if (selectedInventoryVehicleIds.has(v.vehicleId)) selectedInventoryVehicleIds.delete(v.vehicleId);
        else selectedInventoryVehicleIds.add(v.vehicleId);
        refreshInventoryUi(snap);
      });
      inventoryGridEl.appendChild(card);
      spriteItems.push({ vehicleId: v.vehicleId, kind: v.kind, host: spriteHost });
    }
    inventorySprites.sync(spriteItems);
    routeVisuals.setHighlightedRoutes(activeHudMenu === "vehicle" ? intent.validRouteIds : []);
    if (selectedVehicleId) {
      const sv = myVehicles.find((v) => v.vehicleId === selectedVehicleId);
      if (sv) {
        selectedVehicleInfoEl.textContent = `Selected vehicle: ${sv.vehicleId} · ${sv.kind} · ${
          sv.attachedToVehicleId
            ? `attached to ${sv.attachedToVehicleId}`
            : sv.assignedRouteId
              ? `on ${sv.assignedRouteId}`
              : "in inventory"
        }`;
        unassignAtCityBtn.disabled =
          (!sv.assignedRouteId && !sv.attachedToVehicleId) || !!sv.pendingUnassignAtCity;
      } else {
        selectedVehicleId = null;
      }
    }
    if (!selectedVehicleId) {
      selectedVehicleInfoEl.textContent = "Selected vehicle: none";
      unassignAtCityBtn.disabled = true;
    }
    inventorySummaryEl.textContent = `Inventory - Loco: ${counts.get("locomotive_front") ?? 0}/2, Carriage: ${
      counts.get("passenger_carriage") ?? 0
    }/4, Cargo: ${counts.get("wagon") ?? 0}/4, Ships: ${counts.get("sail_ship") ?? 0}/3`;
  }

  function undoLastTrackStep(): void {
    if (!placingTrack || pendingPath.length === 0) return;
    pendingPath.pop();
    clearPreview();
    clearLegalNextPreview();
    if (pendingPath.length > 0) {
      rebuildPreview();
      rebuildLegalNextPreview();
    }
    updateTrackButtons();
    updatePlanCostText();
    updateTrackUndoHotspot();
  }

  function estimatedSimNowMs(nowWallMs: number): number {
    if (!Number.isFinite(clockAnchorSimMs)) return nowWallMs;
    if (clockAnchorPaused || clockAnchorSpeed <= 0) return clockAnchorSimMs;
    return clockAnchorSimMs + Math.max(0, nowWallMs - clockAnchorWallMs) * clockAnchorSpeed;
  }

  function maybeAutoCreateRouteFromBuiltTrack(snap: RailwaysAuthoritativeState): void {
    if (!pendingAutoRoute) return;
    const meId = getNetState()?.clientId;
    if (!meId) return;
    for (let i = 1; i < pendingAutoRoute.path.length; i++) {
      const a = Math.min(pendingAutoRoute.path[i - 1]!, pendingAutoRoute.path[i]!);
      const b = Math.max(pendingAutoRoute.path[i - 1]!, pendingAutoRoute.path[i]!);
      const tr = snap.tracks.find((t) => t.fromTileId === a && t.toTileId === b && t.ownerClientId === meId);
      if (!tr || tr.status !== "active") return;
    }
    sendNetCommand({
      kind: "createRoute",
      mode: "rail",
      tileIds: [...pendingAutoRoute.path],
      isLoop: pendingAutoRoute.isLoop,
      name: "Auto Route",
    });
    pendingAutoRoute = null;
  }

  function onWorldClick(ev: MouseEvent): void {
    if (!bridge) return;
    const snapNow = getNetState()?.lastSnapshot ?? lastSnapshot;
    const globe = bridge.getGlobe();
    const camera = bridge.getCamera();
    const rendererEl = bridge.getRendererDomElement();
    const globeMesh = bridge.getGlobeMesh();
    const rect = rendererEl.getBoundingClientRect();
    const x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((ev.clientY - rect.top) / rect.height) * 2 - 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(x, y), camera);
    let forcedTileId: number | null = null;
    if (placingTrack && legalNextGroup) {
      const legalHits = ray.intersectObjects(legalNextGroup.children, true);
      if (legalHits.length > 0) {
        const raw = legalHits[0]!.object.userData?.legalTileId;
        if (Number.isInteger(raw) && raw >= 0) forcedTileId = raw as number;
      }
    }
    const vehHit = ray.intersectObjects(vehicleVisuals.getInteractiveObjects(), true);
    if (vehHit.length > 0) {
      const id = vehicleVisuals.getVehicleIdForObject(vehHit[0]!.object);
      if (id) {
        if (activeHudMenu === "vehicle" && snapNow) {
          const meId = getNetState()?.clientId;
          const myRoutes = snapNow.playerRoutes.filter((r) => r.ownerClientId === meId);
          const myVehicles = snapNow.playerVehicles.filter((v) => v.ownerClientId === meId);
          const intent = computeAssignIntent(myVehicles, myRoutes);
          if (intent.mode === "attachCars" && intent.validLocomotiveIds.includes(id)) {
            sendAttachSelectedCarsToLocomotive(id, snapNow, intent.selected);
            return;
          }
        }
        selectedVehicleId = id;
        if (snapNow) refreshInventoryUi(snapNow);
      }
      if (!placingTrack && !planningRoute) return;
    }
    if (activeHudMenu === "vehicle" && snapNow) {
      const routeHit = ray.intersectObjects(routeVisuals.getInteractiveObjects(), true);
      if (routeHit.length > 0) {
        const routeId = routeVisuals.getRouteIdForObject(routeHit[0]!.object);
        if (routeId) {
          const meId = getNetState()?.clientId;
          const myRoutes = snapNow.playerRoutes.filter((r) => r.ownerClientId === meId);
          const myVehicles = snapNow.playerVehicles.filter((v) => v.ownerClientId === meId);
          const intent = computeAssignIntent(myVehicles, myRoutes);
          if (
            (intent.mode === "routeRail" || intent.mode === "routeWater") &&
            intent.validRouteIds.includes(routeId)
          ) {
            sendAssignSelectionToRoute(routeId, snapNow, intent.selected);
            return;
          }
        }
      }
    }
    if ((!placingTrack && !planningRoute) || !globe) return;
    let hit: THREE.Intersection<THREE.Object3D> | null = null;
    let fallbackPoint: THREE.Vector3 | null = null;
    const globeHits = globeMesh ? ray.intersectObject(globeMesh, true) : [];
    if (globeHits.length > 0) {
      hit = globeHits[0]!;
    } else {
      // Mesh-independent fallback: intersect the ideal globe sphere.
      // This keeps clicks working over river cutouts/overlay meshes.
      _pickSphere.radius = globe.radius;
      const p = ray.ray.intersectSphere(_pickSphere, _pickPoint);
      if (p) fallbackPoint = p.clone();
      // River/lake surface meshes can sit above cutouts in the globe mesh.
      // Fallback to scene-wide raycast and accept hits close to globe radius.
      const sceneHits = ray.intersectObjects(bridge.getScene().children, true);
      const minR = globe.radius * 0.88;
      const maxR = globe.radius * 1.22;
      hit =
        sceneHits.find((h) => {
          const r = h.point.length();
          return Number.isFinite(r) && r >= minR && r <= maxR;
        }) ?? null;
    }
    if (!hit && !fallbackPoint) return;
    const dir = (hit?.point ?? fallbackPoint!).clone().normalize();
    const rawTileId = forcedTileId ?? globe.getTileIdAtDirection(dir);
    if (!Number.isInteger(rawTileId) || rawTileId < 0) return;
    let tileId = rawTileId;
    const snappedCityTile = resolveClickedCityTile(rawTileId);
    // Only snap to city if the direct clicked tile is not rail-buildable.
    // This prevents adjacent city clicks (e.g. around London) from being hijacked.
    if (
      snappedCityTile != null &&
      !isRailBuildableTile(rawTileId) &&
      isRailBuildableTile(snappedCityTile)
    ) {
      tileId = snappedCityTile;
    }
    if (placingTrack) {
      if (pendingPath.length === 0) {
        const startTile = resolveTrackStartTile(tileId);
        if (startTile == null) return;
        pendingPath.push(startTile);
      } else {
        const last = pendingPath[pendingPath.length - 1]!;
        const start = pendingPath[0]!;
        if (tileId === last) return;
        if (pendingPath.length >= 2 && tileId === pendingPath[pendingPath.length - 2]) {
          pendingPath.pop();
        } else {
          if (!isRailBuildableTile(tileId)) return;
          const neighbors = globe.getTile(last)?.neighbors ?? [];
          if (!neighbors.includes(tileId)) return;
          const closesLoop = tileId === start && pendingPath.length >= 3;
          if (!closesLoop && pendingPath.includes(tileId)) return;
          if (hasExistingTrackEdge(last, tileId)) return;
          pendingPath.push(tileId);
        }
      }
      rebuildPreview();
      rebuildLegalNextPreview();
      updateTrackButtons();
      updatePlanCostText();
      updateTrackUndoHotspot();
    } else if (planningRoute) {
      if (routeTypeSel.value === "water") {
        const cityTile = resolveClickedCityTile(tileId);
        if (cityTile == null) return;
        if (pendingRouteCityStops.length === 0) {
          pendingRouteCityStops.push(cityTile);
          pendingRoutePath.length = 0;
          pendingRoutePath.push(cityTile);
          rebuildWaterCityCandidates(cityTile);
        } else {
          const lastCity = pendingRouteCityStops[pendingRouteCityStops.length - 1]!;
          if (cityTile === lastCity) return;
          if (!reachableWaterCityTiles.has(cityTile)) return;
          const segment = planWaterSegment(lastCity, cityTile);
          if (!segment || segment.length < 2) return;
          for (let i = 1; i < segment.length; i++) {
            pendingRoutePath.push(segment[i]!);
          }
          pendingRouteCityStops.push(cityTile);
          rebuildWaterCityCandidates(cityTile);
        }
      } else {
        appendRouteTile(tileId);
      }
      rebuildRoutePreview();
      updateRouteButtons();
    }
  }

  function exitTrackPlanning(): void {
    placingTrack = false;
    pendingPath.length = 0;
    clearPreview();
    clearLegalNextPreview();
    updateTrackButtons();
    updatePlanCostText();
    updateTrackUndoHotspot();
  }

  function exitRoutePlanning(): void {
    planningRoute = false;
    pendingRoutePath.length = 0;
    pendingRouteCityStops.length = 0;
    clearRoutePreview();
    clearWaterCityCandidates();
    updateRouteButtons();
  }

  mainTrackBtn.addEventListener("click", () => {
    exitRoutePlanning();
    placingTrack = true;
    updateTrackButtons();
    rebuildLegalNextPreview();
    updateTrackUndoHotspot();
    setHudMenu("track");
  });
  mainRouteBtn.addEventListener("click", () => {
    exitTrackPlanning();
    planningRoute = true;
    updateRouteButtons();
    setHudMenu("route");
  });
  mainVehicleBtn.addEventListener("click", () => {
    setHudMenu("vehicle");
  });
  trackBackBtn.addEventListener("click", () => {
    exitTrackPlanning();
    setHudMenu("main");
  });
  routeBackBtn.addEventListener("click", () => {
    exitRoutePlanning();
    setHudMenu("main");
  });
  vehicleBackBtn.addEventListener("click", () => {
    setHudMenu("main");
  });

  trackModeBtn.addEventListener("click", () => {
    if (planningRoute) {
      exitRoutePlanning();
    }
    placingTrack = !placingTrack;
    if (!placingTrack) {
      exitTrackPlanning();
    } else {
      rebuildLegalNextPreview();
      updateTrackUndoHotspot();
      setHudMenu("track");
    }
    updateTrackButtons();
  });
  trackCancelBtn.addEventListener("click", () => {
    pendingPath.length = 0;
    clearPreview();
    clearLegalNextPreview();
    updateTrackButtons();
    updatePlanCostText();
    updateTrackUndoHotspot();
  });
  trackUndoBtn.addEventListener("click", () => undoLastTrackStep());
  trackUndoHotspot.addEventListener("click", (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    undoLastTrackStep();
  });
  trackConfirmBtn.addEventListener("click", () => {
    if (pendingPath.length < 2) return;
    const plannedPath = [...pendingPath];
    const plan = computePlanCosts(pendingPath);
    const cmd: QueueTrackBuildCommand = {
      kind: "queueTrackBuild",
      pathTileIds: [...pendingPath],
      estimatedStepCosts: plan.costs,
      terrainFlagsByStep: plan.flags,
    };
    sendNetCommand(cmd);
    pendingPath.length = 0;
    clearPreview();
    clearLegalNextPreview();
    updateTrackButtons();
    updatePlanCostText();
    updateTrackUndoHotspot();
    requestNetSnapshot();
    openDecisionModal(
      "Auto-create a route from this new rail line when construction completes?",
      () => {
        pendingAutoRoute = {
          path: plannedPath,
          isLoop:
            plannedPath.length >= 3 &&
            plannedPath[0] === plannedPath[plannedPath.length - 1],
        };
      },
    );
  });
  routeModeBtn.addEventListener("click", () => {
    if (placingTrack) {
      exitTrackPlanning();
    }
    planningRoute = !planningRoute;
    if (!planningRoute) {
      exitRoutePlanning();
    } else {
      setHudMenu("route");
    }
    updateRouteButtons();
  });
  routeCancelBtn.addEventListener("click", () => {
    pendingRoutePath.length = 0;
    pendingRouteCityStops.length = 0;
    clearRoutePreview();
    clearWaterCityCandidates();
    updateRouteButtons();
  });
  routeConfirmBtn.addEventListener("click", () => {
    if (pendingRoutePath.length < 2) return;
    const mode = routeTypeSel.value === "water" ? "water" : "rail";
    const cmd: CreateRouteCommand = {
      kind: "createRoute",
      mode,
      tileIds: [...pendingRoutePath],
      isLoop:
        pendingRoutePath.length >= 3 &&
        pendingRoutePath[0] === pendingRoutePath[pendingRoutePath.length - 1],
    };
    sendNetCommand(cmd);
    pendingRoutePath.length = 0;
    pendingRouteCityStops.length = 0;
    clearRoutePreview();
    clearWaterCityCandidates();
    planningRoute = false;
    updateRouteButtons();
    requestNetSnapshot();
  });
  routeTypeSel.addEventListener("change", () => {
    if (pendingRoutePath.length > 0) {
      pendingRoutePath.length = 0;
      pendingRouteCityStops.length = 0;
      clearRoutePreview();
      clearWaterCityCandidates();
    }
    updateRouteButtons();
  });

  assignSelectedBtn.addEventListener("click", () => {
    const snap = getNetState()?.lastSnapshot ?? lastSnapshot;
    if (!snap) return;
    const meId = getNetState()?.clientId;
    const myRoutes = snap.playerRoutes.filter((r) => r.ownerClientId === meId);
    const myVehicles = snap.playerVehicles.filter((v) => v.ownerClientId === meId);
    const intent = computeAssignIntent(myVehicles, myRoutes);
    if (intent.mode === "routeRail" || intent.mode === "routeWater") {
      if (intent.validRouteIds.length === 1) {
        sendAssignSelectionToRoute(intent.validRouteIds[0]!, snap, intent.selected);
      } else {
        assignHintEl.textContent = "Click one of the glowing routes to assign.";
      }
      return;
    }
    if (intent.mode === "attachCars") {
      if (intent.validLocomotiveIds.length === 1) {
        sendAttachSelectedCarsToLocomotive(intent.validLocomotiveIds[0]!, snap, intent.selected);
      } else {
        assignHintEl.textContent = "Click a glowing locomotive to attach selected cars.";
      }
    }
  });
  clearSelectionBtn.addEventListener("click", () => {
    selectedInventoryVehicleIds.clear();
    if (lastSnapshot) refreshInventoryUi(lastSnapshot);
  });
  unassignSelectedBtn.addEventListener("click", () => {
    const snap = getNetState()?.lastSnapshot ?? lastSnapshot;
    if (!snap) return;
    const meId = getNetState()?.clientId;
    const selected = snap.playerVehicles.filter(
      (v) => v.ownerClientId === meId && selectedInventoryVehicleIds.has(v.vehicleId),
    );
    for (const v of selected) {
      if ((!v.assignedRouteId && !v.attachedToVehicleId) || v.pendingUnassignAtCity) continue;
      sendNetCommand({ kind: "requestVehicleUnassign", vehicleId: v.vehicleId });
    }
    requestNetSnapshot();
  });
  unassignAtCityBtn.addEventListener("click", () => {
    if (!selectedVehicleId) return;
    sendNetCommand({ kind: "requestVehicleUnassign", vehicleId: selectedVehicleId });
    requestNetSnapshot();
  });
  modalYesBtn.addEventListener("click", () => closeDecisionModal(true));
  modalNoBtn.addEventListener("click", () => closeDecisionModal(false));
  modalBackdrop.addEventListener("click", (ev) => {
    if (ev.target === modalBackdrop) closeDecisionModal(false);
  });
  for (const b of timeBtns) {
    b.addEventListener("click", () => {
      const key = b.dataset.time;
      const map =
        key === "pause"
          ? { simSpeed: 1, paused: true }
          : key === "play1"
            ? { simSpeed: 1, paused: false }
            : key === "play2"
              ? { simSpeed: 3600, paused: false }
              : key === "play3"
                ? { simSpeed: 5760, paused: false }
                : { simSpeed: 17280, paused: false };
      sendNetCommand({
        kind: "setSimSpeed",
        simSpeed: map.simSpeed,
        paused: map.paused,
      });
    });
  }

  const tryAttach = () => {
    bridge = window.__railwaysWorldBridge;
    if (!bridge) return false;
    visuals.attach(bridge.getScene());
    routeVisuals.attach(bridge.getScene());
    vehicleVisuals.attach(bridge.getScene());
    passengerVisuals.attach(bridge.getScene());
    bridge.getRendererDomElement().addEventListener("click", onWorldClick);
    return true;
  };
  if (!tryAttach()) {
    const i = window.setInterval(() => {
      if (tryAttach()) window.clearInterval(i);
    }, 200);
  }
  sendChooseStartingCityWhenConnected();
  setHudMenu("main");
  updateTrackButtons();
  updateRouteButtons();
  updatePlanCostText();
  updateTrackUndoHotspot();

  const tick = () => {
    const now = Date.now();
    hudIcons.update(now);
    inventorySprites.update(now);
    const snap = getNetState()?.lastSnapshot ?? null;
    if (snap && snap !== lastSnapshot) {
      lastSnapshot = snap;
      rebuildCityTileIndexFromSnapshot(snap);
      clockAnchorSimMs = Date.parse(snap.clock.dateTimeUtc);
      clockAnchorWallMs = now;
      clockAnchorPaused = !!snap.clock.paused;
      clockAnchorSpeed = Number.isFinite(snap.clock.simSpeed) ? snap.clock.simSpeed : 1;
      const me = snap.players.find((p) => p.clientId === getNetState()?.clientId);
      if (me) {
        moneyEl.textContent = `Funds: £${Math.round(me.fundsPounds)}`;
      }
      clockEl.textContent = `Time: ${snap.clock.dateTimeUtc.replace("T", " ").slice(0, 16)}${
        snap.clock.paused ? " (paused)" : ""
      }`;
      const simNow = estimatedSimNowMs(now);
      if (bridge) {
        bridge.setDateTimeUtc?.(new Date(simNow).toISOString());
        bridge.setPaused?.(snap.clock.paused);
        visuals.update(bridge, snap.tracks, now, Number.isFinite(simNow) ? simNow : now);
        buildProgressOverlay.update(bridge, visuals.getBuildMarkers(), simNow);
        trackPlanCostOverlay.update(bridge, buildTrackPlanCostPoints(), placingTrack);
        routeVisuals.update(bridge, snap, getNetState()?.clientId ?? null);
        vehicleVisuals.update(bridge, snap);
        passengerVisuals.update(bridge, snap);
        if (placingTrack) rebuildLegalNextPreview();
        if (planningRoute && routeTypeSel.value === "water" && pendingRouteCityStops.length > 0) {
          rebuildWaterCityCandidates(pendingRouteCityStops[pendingRouteCityStops.length - 1]!);
        }
      }
      maybeAutoCreateRouteFromBuiltTrack(snap);
      refreshInventoryUi(snap);
    } else if (bridge && lastSnapshot) {
      const simNow = estimatedSimNowMs(now);
      bridge.setDateTimeUtc?.(new Date(simNow).toISOString());
      bridge.setPaused?.(lastSnapshot.clock.paused);
      visuals.update(
        bridge,
        lastSnapshot.tracks,
        now,
        Number.isFinite(simNow) ? simNow : now,
      );
      buildProgressOverlay.update(bridge, visuals.getBuildMarkers(), simNow);
      trackPlanCostOverlay.update(bridge, buildTrackPlanCostPoints(), placingTrack);
      routeVisuals.update(bridge, lastSnapshot, getNetState()?.clientId ?? null);
      vehicleVisuals.update(bridge, lastSnapshot);
      passengerVisuals.update(bridge, lastSnapshot);
    }
    updateTrackUndoHotspot();
    window.requestAnimationFrame(tick);
  };
  window.requestAnimationFrame(tick);
}
