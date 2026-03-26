import * as THREE from "three";
import type { Globe } from "../core/Globe.js";
import { geometryWaterSurfacePatch } from "../terrain/terrainMaterial.js";
import {
  fillSeaIceMaskForDay,
  type SeaIceAnnualCycle,
} from "../climate/seaIceCycle.js";

export interface SeaIceOverlayOptions {
  /**
   * Sheet radius. Should sit slightly above water (default 0.996 when water is ~0.995).
   */
  surfaceRadius?: number;
  /** Global alpha for translucent ice. */
  opacity?: number;
  /** Tint color. */
  color?: THREE.ColorRepresentation;
  /** Optional group/mesh name prefix for debugging. */
  namePrefix?: string;
}

const VERTEX = `
  attribute float tileId;
  varying float vTileId;
  varying vec3 vNormalW;
  varying vec3 vWorldPos;
  void main() {
    vTileId = tileId;
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorldPos = w.xyz;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const FRAGMENT = `
  uniform sampler2D uIceMask;
  uniform vec2 uMaskSize;
  uniform float uOpacity;
  uniform vec3 uColor;
  uniform vec3 uCameraWorld;
  uniform vec3 uSunDirection;
  varying float vTileId;
  varying vec3 vNormalW;
  varying vec3 vWorldPos;

  float sampleMask(float tid) {
    float x = mod(tid, uMaskSize.x);
    float y = floor(tid / uMaskSize.x);
    vec2 uv = vec2((x + 0.5) / uMaskSize.x, (y + 0.5) / uMaskSize.y);
    return texture2D(uIceMask, uv).r;
  }

  void main() {
    float m = sampleMask(vTileId);
    if (m < 0.5) discard;
    vec3 N = normalize(vNormalW);
    vec3 V = normalize(uCameraWorld - vWorldPos);
    vec3 L = normalize(uSunDirection);
    float ndl = max(dot(N, L), 0.0);
    // Keep night side visible but clearly darker than day side.
    float lit = 0.10 + ndl * 0.90;
    float fres = pow(1.0 - max(dot(N, V), 0.0), 2.2);
    float alpha = clamp((uOpacity * (0.85 + ndl * 0.25)) + fres * 0.10, 0.0, 1.0);
    vec3 baseLit = uColor * lit;
    vec3 col = mix(baseLit, vec3(1.0), fres * 0.22);
    gl_FragColor = vec4(col, alpha);
  }
`;

function hasAnyIce(cycle: SeaIceAnnualCycle): boolean {
  return (
    cycle.northAlwaysTileIds.length > 0 ||
    cycle.northSeasonalTileIds.length > 0 ||
    cycle.southAlwaysTileIds.length > 0 ||
    cycle.southSeasonalTileIds.length > 0
  );
}

export class SeaIceOverlay {
  readonly group: THREE.Group;
  readonly northMesh: THREE.Mesh | null;
  readonly southMesh: THREE.Mesh | null;

  private readonly _texture: THREE.DataTexture;
  private readonly _maskData: Uint8Array;
  private readonly _material: THREE.ShaderMaterial;
  private readonly _cycle: SeaIceAnnualCycle;
  private _lastDay = -1;

  constructor(globe: Globe, cycle: SeaIceAnnualCycle, opts: SeaIceOverlayOptions = {}) {
    this.group = new THREE.Group();
    const prefix = opts.namePrefix ?? "SeaIce";
    this.group.name = `${prefix}Overlay`;
    this._cycle = cycle;

    const texW = 2048;
    const texH = Math.max(1, Math.ceil(cycle.tileCount / texW));
    this._maskData = new Uint8Array(texW * texH);
    const textureData = new Uint8Array(this._maskData.buffer as ArrayBuffer);
    this._texture = new THREE.DataTexture(
      textureData,
      texW,
      texH,
      THREE.RedFormat,
      THREE.UnsignedByteType,
    );
    this._texture.magFilter = THREE.NearestFilter;
    this._texture.minFilter = THREE.NearestFilter;
    this._texture.generateMipmaps = false;
    this._texture.needsUpdate = true;
    this._texture.colorSpace = THREE.NoColorSpace;

    this._material = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: {
        uIceMask: { value: this._texture },
        uMaskSize: { value: new THREE.Vector2(texW, texH) },
        uOpacity: { value: opts.opacity ?? 0.52 },
        uColor: { value: new THREE.Color(opts.color ?? 0xf1f7ff) },
        uCameraWorld: { value: new THREE.Vector3() },
        uSunDirection: { value: new THREE.Vector3(0, 1, 0) },
      },
      transparent: true,
      depthWrite: false,
      depthTest: true,
      side: THREE.FrontSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    if (!hasAnyIce(cycle)) {
      this.northMesh = null;
      this.southMesh = null;
      return;
    }

    const radius = opts.surfaceRadius ?? 0.996;
    const northSet = new Set<number>();
    const southSet = new Set<number>();
    for (let i = 0; i < cycle.northAlwaysTileIds.length; i++) {
      northSet.add(cycle.northAlwaysTileIds[i]!);
    }
    for (let i = 0; i < cycle.northSeasonalTileIds.length; i++) {
      northSet.add(cycle.northSeasonalTileIds[i]!);
    }
    for (let i = 0; i < cycle.southAlwaysTileIds.length; i++) {
      southSet.add(cycle.southAlwaysTileIds[i]!);
    }
    for (let i = 0; i < cycle.southSeasonalTileIds.length; i++) {
      southSet.add(cycle.southSeasonalTileIds[i]!);
    }

    const northGeom = geometryWaterSurfacePatch(
      globe.mesh.geometry as THREE.BufferGeometry,
      northSet,
      radius,
    );
    const southGeom = geometryWaterSurfacePatch(
      globe.mesh.geometry as THREE.BufferGeometry,
      southSet,
      radius,
    );
    this.northMesh = new THREE.Mesh(northGeom, this._material);
    this.northMesh.name = `${prefix}North`;
    // Water mesh uses renderOrder=1; keep sea ice on top.
    this.northMesh.renderOrder = 2;
    this.northMesh.frustumCulled = false;
    this.southMesh = new THREE.Mesh(southGeom, this._material);
    this.southMesh.name = `${prefix}South`;
    this.southMesh.renderOrder = 2;
    this.southMesh.frustumCulled = false;
    this.group.add(this.northMesh, this.southMesh);
  }

  updateForDay(
    dayOfYear: number,
    cameraWorldPosition?: THREE.Vector3,
    sunDirection?: THREE.Vector3,
  ): void {
    const d = Math.floor(dayOfYear) % 365;
    const dd = d < 0 ? d + 365 : d;
    if (dd !== this._lastDay) {
      fillSeaIceMaskForDay(this._cycle, dd, this._maskData);
      this._texture.needsUpdate = true;
      this._lastDay = dd;
    }
    if (cameraWorldPosition) {
      this._material.uniforms.uCameraWorld.value.copy(cameraWorldPosition);
    }
    if (sunDirection) {
      this._material.uniforms.uSunDirection.value.copy(sunDirection).normalize();
    }
  }

  dispose(): void {
    this.northMesh?.geometry.dispose();
    this.southMesh?.geometry.dispose();
    this._material.dispose();
    this._texture.dispose();
  }
}

