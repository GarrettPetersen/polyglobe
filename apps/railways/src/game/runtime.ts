import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type {
  AssignVehiclesToRouteCommand,
  CreateRouteCommand,
  PlayerRouteState,
  PlayerVehicleState,
  PurchaseVehicleCommand,
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
}

interface SessionSetup {
  startCityId: string;
  colorHex: string;
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
const _up = new THREE.Vector3(0, 1, 0);

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
  private railLeft: THREE.InstancedMesh | null = null;
  private railRight: THREE.InstancedMesh | null = null;
  private sleepers: THREE.InstancedMesh | null = null;
  private supports: THREE.InstancedMesh | null = null;
  private buildMarkers: Array<{
    cloud: THREE.Sprite;
    barBg: THREE.Sprite;
    barFill: THREE.Sprite;
    buildStartedAtMs: number;
    buildCompleteAtMs: number;
    baseBarWidth: number;
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
          `${t.fromTileId}:${t.toTileId}:${t.status}:${t.ownerColorHex}:${t.buildStartedAtMs}:${t.buildCompleteAtMs}`,
      )
      .join("|");
    if (key !== this.currentTracksKey) {
      this.currentTracksKey = key;
      this.rebuild(bridge, tracks);
    }
    for (let i = 0; i < this.buildMarkers.length; i++) {
      const marker = this.buildMarkers[i]!;
      const s = marker.cloud;
      const pulse = 0.55 + 0.45 * Math.sin(nowMs * 0.006 + i * 0.7);
      s.scale.setScalar(0.012 + pulse * 0.006);
      (s.material as THREE.SpriteMaterial).opacity = 0.35 + pulse * 0.45;
      const total = Math.max(1, marker.buildCompleteAtMs - marker.buildStartedAtMs);
      const progress = THREE.MathUtils.clamp(
        (simNowMs - marker.buildStartedAtMs) / total,
        0,
        1,
      );
      marker.barFill.scale.set(marker.baseBarWidth * progress, 0.0038, 1);
      marker.barFill.center.set(0, 0.5);
      (marker.barFill.material as THREE.SpriteMaterial).opacity = 0.92;
    }
  }

  private clearMeshes(): void {
    const meshes = [this.railLeft, this.railRight, this.sleepers, this.supports];
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
    this.railLeft = null;
    this.railRight = null;
    this.sleepers = null;
    this.supports = null;
    for (const marker of this.buildMarkers) {
      const sprites = [marker.cloud, marker.barBg, marker.barFill];
      for (const s of sprites) {
        this.group.remove(s);
        const mat = s.material as THREE.SpriteMaterial;
        mat.map?.dispose();
        mat.dispose();
      }
    }
    this.buildMarkers = [];
  }

  private rebuild(bridge: WorldBridge, tracks: TrackSegmentState[]): void {
    this.clearMeshes();
    if (tracks.length === 0) return;
    const globe = bridge.getGlobe();
    const terrain = bridge.getTileTerrain();
    if (!globe || !terrain) return;

    const railGeom = new THREE.BoxGeometry(0.0038, 0.0022, 1);
    const sleeperGeom = new THREE.BoxGeometry(0.03, 0.0025, 0.004);
    const supportGeom = new THREE.CylinderGeometry(0.0018, 0.0024, 1, 6);
    const railMat = new THREE.MeshStandardMaterial({ color: 0xc0c6d2, roughness: 0.65, metalness: 0.35 });
    const sleeperMat = new THREE.MeshStandardMaterial({ color: 0x6f5a42, roughness: 0.92, metalness: 0.05 });
    const supportMat = new THREE.MeshStandardMaterial({ color: 0x4b4f57, roughness: 0.84, metalness: 0.18 });
    this.railLeft = new THREE.InstancedMesh(railGeom, railMat, Math.max(1, tracks.length));
    this.railRight = new THREE.InstancedMesh(railGeom, railMat.clone(), Math.max(1, tracks.length));
    this.sleepers = new THREE.InstancedMesh(sleeperGeom, sleeperMat, Math.max(4, tracks.length * 4));
    this.supports = new THREE.InstancedMesh(supportGeom, supportMat, Math.max(1, tracks.length));
    this.railLeft.frustumCulled = false;
    this.railRight.frustumCulled = false;
    this.sleepers.frustumCulled = false;
    this.supports.frustumCulled = false;
    this.group.add(this.railLeft, this.railRight, this.sleepers, this.supports);

    let railIdx = 0;
    let sleeperIdx = 0;
    let supportIdx = 0;
    const tex = this.makeBuildSpriteTexture();
    for (const tr of tracks) {
      const a = globe.getTile(tr.fromTileId);
      const b = globe.getTile(tr.toTileId);
      if (!a || !b) continue;
      const elevA = terrain.get(tr.fromTileId)?.elevation ?? 0;
      const elevB = terrain.get(tr.toTileId)?.elevation ?? 0;
      _tmpA.copy(a.center).normalize().multiplyScalar(globe.radius + elevA * 0.08 + 0.0018);
      _tmpB.copy(b.center).normalize().multiplyScalar(globe.radius + elevB * 0.08 + 0.0018);
      const len = _tmpA.distanceTo(_tmpB);
      if (len < 1e-6) continue;
      _tmpMid.copy(_tmpA).add(_tmpB).multiplyScalar(0.5);
      _tmpQ.setFromUnitVectors(_up, _tmpB.clone().sub(_tmpA).normalize());

      const trackGap = 0.0055;
      const side = _tmpB.clone().sub(_tmpA).cross(_tmpMid).normalize().multiplyScalar(trackGap);

      const leftPos = _tmpMid.clone().add(side);
      const rightPos = _tmpMid.clone().sub(side);
      _tmpScale.set(1, 1, len);
      this.railLeft!.setMatrixAt(
        railIdx,
        new THREE.Matrix4().compose(leftPos, _tmpQ, _tmpScale),
      );
      this.railRight!.setMatrixAt(
        railIdx,
        new THREE.Matrix4().compose(rightPos, _tmpQ, _tmpScale),
      );

      const sleeperCount = 4;
      for (let i = 0; i < sleeperCount; i++) {
        const t = (i + 1) / (sleeperCount + 1);
        const p = _tmpA.clone().lerp(_tmpB, t);
        const q = new THREE.Quaternion().setFromUnitVectors(
          _up,
          side.clone().normalize(),
        );
        this.sleepers!.setMatrixAt(
          sleeperIdx++,
          new THREE.Matrix4().compose(p, q, new THREE.Vector3(1, 1, 1)),
        );
      }

      const supportNeeded =
        tr.status === "building" ||
        Math.abs(elevA - elevB) > 0.01 ||
        (terrain.get(tr.fromTileId)?.isHilly ?? false) ||
        (terrain.get(tr.toTileId)?.isHilly ?? false);
      if (supportNeeded) {
        const supportLen = Math.max(0.01, _tmpMid.length() - (globe.radius - 0.01));
        const supportPos = _tmpMid.clone().normalize().multiplyScalar(_tmpMid.length() - supportLen * 0.5);
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

      if (tr.status === "building") {
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
        sp.position.copy(_tmpMid);
        sp.scale.setScalar(0.015);
        const barOffset = _tmpMid.clone().normalize().multiplyScalar(0.008);
        const barPos = _tmpMid.clone().add(barOffset);
        const barBg = new THREE.Sprite(
          new THREE.SpriteMaterial({
            color: 0x142235,
            transparent: true,
            depthWrite: false,
            depthTest: false,
            opacity: 0.7,
          }),
        );
        barBg.position.copy(barPos);
        barBg.scale.set(0.026, 0.0038, 1);
        const barFill = new THREE.Sprite(
          new THREE.SpriteMaterial({
            color: new THREE.Color(tr.ownerColorHex),
            transparent: true,
            depthWrite: false,
            depthTest: false,
            opacity: 0.92,
          }),
        );
        barFill.position.copy(barPos);
        barFill.center.set(0, 0.5);
        barFill.scale.set(0.001, 0.0038, 1);
        this.group.add(sp);
        this.group.add(barBg);
        this.group.add(barFill);
        this.buildMarkers.push({
          cloud: sp,
          barBg,
          barFill,
          buildStartedAtMs: tr.buildStartedAtMs,
          buildCompleteAtMs: tr.buildCompleteAtMs,
          baseBarWidth: 0.026,
        });
      }
      railIdx++;
    }
    this.railLeft.count = railIdx;
    this.railRight.count = railIdx;
    this.sleepers.count = sleeperIdx;
    this.supports.count = supportIdx;
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

class RouteVisualLayer {
  private readonly group = new THREE.Group();
  private readonly routeObjects = new Map<string, THREE.Object3D>();
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
      this.group.add(line);
      this.routeObjects.set(route.routeId, line);
    }
  }
}

class VehicleVisualLayer {
  private readonly group = new THREE.Group();
  private readonly loader = new GLTFLoader();
  private readonly templateByKind = new Map<VehicleKind, THREE.Object3D>();
  private readonly objectByVehicleId = new Map<string, THREE.Object3D>();
  private readonly loadingKind = new Set<VehicleKind>();

  attach(scene: THREE.Scene): void {
    this.group.name = "RailwaysVehicleLayer";
    scene.add(this.group);
  }

  update(bridge: WorldBridge, snap: RailwaysAuthoritativeState): void {
    const vehicles = snap.playerVehicles.filter((v) => v.assignedRouteId);
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
      obj.position.copy(pos);
      const dir = pb.clone().sub(pa).normalize();
      _tmpQ.setFromUnitVectors(_up, dir);
      obj.quaternion.copy(_tmpQ);
      obj.scale.setScalar(v.kind === "sail_ship" ? 0.02 : 0.016);
    }
  }

  private instantiateVehicle(kind: VehicleKind): THREE.Object3D {
    const cached = this.templateByKind.get(kind);
    if (cached) return cached.clone(true);
    const placeholder = this.makePlaceholder(kind);
    this.templateByKind.set(kind, placeholder);
    this.loadKindTemplate(kind);
    return placeholder.clone(true);
  }

  private kindAssetCandidates(kind: VehicleKind): string[] {
    if (kind === "sail_ship") return ["/assets/vehicles/Sail Ship.glb", "/assets/vehicles/sail_ship.glb"];
    if (kind === "locomotive_front") return ["/assets/vehicles/Locomotive Front.glb", "/assets/vehicles/locomotive_front.glb"];
    if (kind === "passenger_carriage") return ["/assets/vehicles/Locomotive Passenger Carriage.glb", "/assets/vehicles/passenger_carriage.glb"];
    return ["/assets/vehicles/Locomotive Wagon.glb", "/assets/vehicles/locomotive_wagon.glb"];
  }

  private loadKindTemplate(kind: VehicleKind): void {
    if (this.loadingKind.has(kind)) return;
    this.loadingKind.add(kind);
    const candidates = this.kindAssetCandidates(kind);
    const tryLoad = (idx: number) => {
      if (idx >= candidates.length) {
        this.loadingKind.delete(kind);
        return;
      }
      this.loader.load(
        candidates[idx]!,
        (gltf) => {
          const scene = gltf.scene;
          scene.traverse((o) => {
            if (o instanceof THREE.Mesh) {
              o.castShadow = false;
              o.receiveShadow = false;
            }
          });
          this.templateByKind.set(kind, scene);
          this.loadingKind.delete(kind);
        },
        undefined,
        () => tryLoad(idx + 1),
      );
    };
    tryLoad(0);
  }

  private makePlaceholder(kind: VehicleKind): THREE.Object3D {
    const g = new THREE.Group();
    const color =
      kind === "sail_ship"
        ? 0x7bc8ff
        : kind === "locomotive_front"
          ? 0xc84f4f
          : kind === "passenger_carriage"
            ? 0xc9b16a
            : 0x9b9b9b;
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.35, 1.2),
      new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.2 }),
    );
    mesh.position.set(0, 0.2, 0);
    g.add(mesh);
    return g;
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

export function startRailwaysGameRuntime(sessionSetup: SessionSetup): void {
  const panel = document.createElement("div");
  panel.style.cssText =
    "position:fixed;left:12px;top:12px;z-index:10020;background:rgba(8,14,24,0.82);border:1px solid rgba(200,220,255,0.25);padding:10px;border-radius:10px;color:#eaf2ff;font:12px system-ui,-apple-system,Segoe UI,Roboto,sans-serif;min-width:260px";
  panel.innerHTML = `
    <div style="font-weight:700;margin-bottom:6px">Railways HUD</div>
    <div id="rwHudMoney">Funds: £1000</div>
    <div id="rwHudClock">Time: --</div>
    <div id="rwHudTrackCost">Planned cost: £0</div>
    <div id="rwHudRouteInfo">Route plan: none</div>
    <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">
      <button data-time="pause">Pause</button>
      <button data-time="play">Play</button>
      <button data-time="fast">Fast</button>
      <button data-time="super">Superfast</button>
    </div>
    <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">
      <button id="rwTrackModeBtn">Place Track</button>
      <button id="rwTrackConfirmBtn" disabled>Confirm</button>
      <button id="rwTrackCancelBtn" disabled>Cancel</button>
    </div>
    <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">
      <button id="rwRouteModeBtn">Plan Route</button>
      <button id="rwRouteConfirmBtn" disabled>Confirm Route</button>
      <button id="rwRouteCancelBtn" disabled>Cancel Route</button>
      <select id="rwRouteTypeSel">
        <option value="rail">Rail</option>
        <option value="water">Water</option>
      </select>
    </div>
    <div style="margin-top:10px;border-top:1px solid rgba(255,255,255,0.15);padding-top:8px">
      <div style="font-weight:700;margin-bottom:6px">Vehicle Inventory</div>
      <div style="display:flex;gap:4px;flex-wrap:wrap">
        <button id="rwBuyLocoBtn">Buy Loco £260+</button>
        <button id="rwBuyPassengerBtn">Buy Carriage £110+</button>
        <button id="rwBuyWagonBtn">Buy Wagon £85+</button>
        <button id="rwBuyShipBtn">Buy Sail Ship £320+</button>
      </div>
      <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap">
        <select id="rwAssignRouteSel"></select>
        <input id="rwAssignVehicleIds" placeholder="vehicle ids e.g. v-1,v-2" style="min-width:150px" />
        <button id="rwAssignBtn">Assign</button>
      </div>
      <div id="rwInventorySummary" style="margin-top:6px;opacity:0.9"></div>
    </div>
  `;
  document.body.appendChild(panel);

  const moneyEl = panel.querySelector("#rwHudMoney") as HTMLDivElement;
  const clockEl = panel.querySelector("#rwHudClock") as HTMLDivElement;
  const costEl = panel.querySelector("#rwHudTrackCost") as HTMLDivElement;
  const routeInfoEl = panel.querySelector("#rwHudRouteInfo") as HTMLDivElement;
  const trackModeBtn = panel.querySelector("#rwTrackModeBtn") as HTMLButtonElement;
  const trackConfirmBtn = panel.querySelector("#rwTrackConfirmBtn") as HTMLButtonElement;
  const trackCancelBtn = panel.querySelector("#rwTrackCancelBtn") as HTMLButtonElement;
  const routeModeBtn = panel.querySelector("#rwRouteModeBtn") as HTMLButtonElement;
  const routeConfirmBtn = panel.querySelector("#rwRouteConfirmBtn") as HTMLButtonElement;
  const routeCancelBtn = panel.querySelector("#rwRouteCancelBtn") as HTMLButtonElement;
  const routeTypeSel = panel.querySelector("#rwRouteTypeSel") as HTMLSelectElement;
  const buyLocoBtn = panel.querySelector("#rwBuyLocoBtn") as HTMLButtonElement;
  const buyPassengerBtn = panel.querySelector("#rwBuyPassengerBtn") as HTMLButtonElement;
  const buyWagonBtn = panel.querySelector("#rwBuyWagonBtn") as HTMLButtonElement;
  const buyShipBtn = panel.querySelector("#rwBuyShipBtn") as HTMLButtonElement;
  const assignRouteSel = panel.querySelector("#rwAssignRouteSel") as HTMLSelectElement;
  const assignVehicleIdsInput = panel.querySelector("#rwAssignVehicleIds") as HTMLInputElement;
  const assignBtn = panel.querySelector("#rwAssignBtn") as HTMLButtonElement;
  const inventorySummaryEl = panel.querySelector("#rwInventorySummary") as HTMLDivElement;
  const timeBtns = [...panel.querySelectorAll("button[data-time]")] as HTMLButtonElement[];

  const visuals = new TrackVisualLayer();
  const routeVisuals = new RouteVisualLayer();
  const vehicleVisuals = new VehicleVisualLayer();
  const pendingPath: number[] = [];
  const pendingRoutePath: number[] = [];
  let placingTrack = false;
  let planningRoute = false;
  let lastSnapshot: RailwaysAuthoritativeState | null = null;
  let bridge: WorldBridge | undefined;
  let previewGroup: THREE.Group | null = null;
  let routePreviewGroup: THREE.Group | null = null;

  function updateTrackButtons(): void {
    trackConfirmBtn.disabled = pendingPath.length < 2 || !placingTrack;
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

  function clearPreview(): void {
    if (!previewGroup) return;
    previewGroup.parent?.remove(previewGroup);
    previewGroup.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        const m = o.material;
        if (Array.isArray(m)) m.forEach((mm) => mm.dispose());
        else m.dispose();
      }
    });
    previewGroup = null;
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

  function rebuildPreview(): void {
    clearPreview();
    if (!bridge || pendingPath.length === 0) return;
    const g = bridge.getGlobe();
    const scene = bridge.getScene();
    const terrain = bridge.getTileTerrain();
    if (!g || !terrain) return;
    previewGroup = new THREE.Group();
    previewGroup.name = "RailTrackPreview";
    const mat = new THREE.MeshBasicMaterial({ color: 0x7ecbff, transparent: true, opacity: 0.75 });
    for (const tileId of pendingPath) {
      const tile = g.getTile(tileId);
      if (!tile) continue;
      const elev = terrain.get(tileId)?.elevation ?? 0;
      const p = tile.center.clone().normalize().multiplyScalar(g.radius + elev * 0.08 + 0.003);
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.004, 8, 8), mat.clone());
      m.position.copy(p);
      previewGroup.add(m);
    }
    scene.add(previewGroup);
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

  function updatePlanCostText(): void {
    const plan = computePlanCosts(pendingPath);
    costEl.textContent = `Planned cost: £${plan.total}`;
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

  function refreshInventoryUi(snap: RailwaysAuthoritativeState): void {
    const meId = getNetState()?.clientId;
    const myRoutes = snap.playerRoutes.filter((r) => r.ownerClientId === meId);
    const myVehicles = snap.playerVehicles.filter((v) => v.ownerClientId === meId);
    const counts = new Map<VehicleKind, number>();
    for (const v of myVehicles) {
      counts.set(v.kind, (counts.get(v.kind) ?? 0) + 1);
    }
    assignRouteSel.innerHTML = "";
    for (const r of myRoutes) {
      const opt = document.createElement("option");
      opt.value = r.routeId;
      opt.textContent = `${r.name} (${r.mode}, ${r.tileIds.length} hexes)`;
      assignRouteSel.appendChild(opt);
    }
    inventorySummaryEl.textContent = `Loco: ${counts.get("locomotive_front") ?? 0}/5, Carriage: ${
      counts.get("passenger_carriage") ?? 0
    }, Wagon: ${counts.get("wagon") ?? 0}, Ships: ${counts.get("sail_ship") ?? 0}/5`;
  }

  function onWorldClick(ev: MouseEvent): void {
    if ((!placingTrack && !planningRoute) || !bridge) return;
    const globe = bridge.getGlobe();
    const camera = bridge.getCamera();
    const rendererEl = bridge.getRendererDomElement();
    const globeMesh = bridge.getGlobeMesh();
    if (!globe) return;
    const rect = rendererEl.getBoundingClientRect();
    const x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((ev.clientY - rect.top) / rect.height) * 2 - 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(x, y), camera);
    const intersects = globeMesh ? ray.intersectObject(globeMesh, true) : [];
    if (intersects.length === 0) return;
    const hit = intersects[0]!;
    const dir = hit.point.clone().normalize();
    const tileId = globe.getTileIdAtDirection(dir);
    if (!Number.isInteger(tileId) || tileId < 0) return;
    if (placingTrack) {
      if (pendingPath.length === 0) {
        pendingPath.push(tileId);
      } else {
        const last = pendingPath[pendingPath.length - 1]!;
        if (tileId === last) return;
        if (pendingPath.length >= 2 && tileId === pendingPath[pendingPath.length - 2]) {
          pendingPath.pop();
        } else {
          const neighbors = globe.getTile(last)?.neighbors ?? [];
          if (!neighbors.includes(tileId)) return;
          pendingPath.push(tileId);
        }
      }
      rebuildPreview();
      updateTrackButtons();
      updatePlanCostText();
    } else if (planningRoute) {
      appendRouteTile(tileId);
      rebuildRoutePreview();
      updateRouteButtons();
    }
  }

  trackModeBtn.addEventListener("click", () => {
    if (planningRoute) {
      planningRoute = false;
      pendingRoutePath.length = 0;
      clearRoutePreview();
      updateRouteButtons();
    }
    placingTrack = !placingTrack;
    if (!placingTrack) {
      pendingPath.length = 0;
      clearPreview();
      updatePlanCostText();
    }
    updateTrackButtons();
  });
  trackCancelBtn.addEventListener("click", () => {
    pendingPath.length = 0;
    clearPreview();
    updateTrackButtons();
    updatePlanCostText();
  });
  trackConfirmBtn.addEventListener("click", () => {
    if (pendingPath.length < 2) return;
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
    updateTrackButtons();
    updatePlanCostText();
    requestNetSnapshot();
  });
  routeModeBtn.addEventListener("click", () => {
    if (placingTrack) {
      placingTrack = false;
      pendingPath.length = 0;
      clearPreview();
      updateTrackButtons();
      updatePlanCostText();
    }
    planningRoute = !planningRoute;
    if (!planningRoute) {
      pendingRoutePath.length = 0;
      clearRoutePreview();
    }
    updateRouteButtons();
  });
  routeCancelBtn.addEventListener("click", () => {
    pendingRoutePath.length = 0;
    clearRoutePreview();
    updateRouteButtons();
  });
  routeConfirmBtn.addEventListener("click", () => {
    if (pendingRoutePath.length < 2) return;
    const cmd: CreateRouteCommand = {
      kind: "createRoute",
      mode: routeTypeSel.value === "water" ? "water" : "rail",
      tileIds: [...pendingRoutePath],
      isLoop:
        pendingRoutePath.length >= 3 &&
        pendingRoutePath[0] === pendingRoutePath[pendingRoutePath.length - 1],
    };
    sendNetCommand(cmd);
    pendingRoutePath.length = 0;
    clearRoutePreview();
    planningRoute = false;
    updateRouteButtons();
    requestNetSnapshot();
  });
  routeTypeSel.addEventListener("change", () => {
    if (pendingRoutePath.length > 0) {
      pendingRoutePath.length = 0;
      clearRoutePreview();
    }
    updateRouteButtons();
  });

  function purchaseVehicle(kind: VehicleKind): void {
    const cmd: PurchaseVehicleCommand = {
      kind: "purchaseVehicle",
      vehicleKind: kind,
      quantity: 1,
    };
    sendNetCommand(cmd);
    requestNetSnapshot();
  }
  buyLocoBtn.addEventListener("click", () => purchaseVehicle("locomotive_front"));
  buyPassengerBtn.addEventListener("click", () => purchaseVehicle("passenger_carriage"));
  buyWagonBtn.addEventListener("click", () => purchaseVehicle("wagon"));
  buyShipBtn.addEventListener("click", () => purchaseVehicle("sail_ship"));
  assignBtn.addEventListener("click", () => {
    const routeId = assignRouteSel.value;
    if (!routeId) return;
    const vehicleIds = assignVehicleIdsInput.value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const cmd: AssignVehiclesToRouteCommand = {
      kind: "assignVehiclesToRoute",
      routeId,
      vehicleIds,
    };
    sendNetCommand(cmd);
    requestNetSnapshot();
  });
  for (const b of timeBtns) {
    b.addEventListener("click", () => {
      const key = b.dataset.time;
      const map =
        key === "pause"
          ? { simSpeed: 1, paused: true }
          : key === "play"
            ? { simSpeed: 1, paused: false }
            : key === "fast"
              ? { simSpeed: 20, paused: false }
              : { simSpeed: 120, paused: false };
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
    bridge.getRendererDomElement().addEventListener("click", onWorldClick);
    return true;
  };
  if (!tryAttach()) {
    const i = window.setInterval(() => {
      if (tryAttach()) window.clearInterval(i);
    }, 200);
  }
  sendChooseStartingCityWhenConnected();
  updateTrackButtons();
  updateRouteButtons();
  updatePlanCostText();

  const tick = () => {
    const now = Date.now();
    const snap = getNetState()?.lastSnapshot ?? null;
    if (snap && snap !== lastSnapshot) {
      lastSnapshot = snap;
      const me = snap.players.find((p) => p.clientId === getNetState()?.clientId);
      if (me) {
        moneyEl.textContent = `Funds: £${Math.round(me.fundsPounds)}`;
      }
      clockEl.textContent = `Time: ${snap.clock.dateTimeUtc.replace("T", " ").slice(0, 16)}${
        snap.clock.paused ? " (paused)" : ""
      }`;
      const simNow = Date.parse(snap.clock.dateTimeUtc);
      if (bridge) {
        visuals.update(bridge, snap.tracks, now, Number.isFinite(simNow) ? simNow : now);
        routeVisuals.update(bridge, snap, getNetState()?.clientId ?? null);
        vehicleVisuals.update(bridge, snap);
      }
      refreshInventoryUi(snap);
    } else if (bridge && lastSnapshot) {
      const simNow = Date.parse(lastSnapshot.clock.dateTimeUtc);
      visuals.update(
        bridge,
        lastSnapshot.tracks,
        now,
        Number.isFinite(simNow) ? simNow : now,
      );
      routeVisuals.update(bridge, lastSnapshot, getNetState()?.clientId ?? null);
      vehicleVisuals.update(bridge, lastSnapshot);
    }
    window.requestAnimationFrame(tick);
  };
  window.requestAnimationFrame(tick);
}
