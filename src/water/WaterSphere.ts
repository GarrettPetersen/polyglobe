/**
 * Spherical ocean layer using the same visual style as Three.js Water:
 * animated normals, sun specular, water color, and fresnel. Works on a sphere
 * (no planar reflection). Optional normal map for even more realistic ripples.
 */

import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export interface WaterSphereOptions {
  /** Radius of the water sphere (typically globe radius). */
  radius?: number;
  /** Segment count for the sphere geometry (higher = smoother). */
  segments?: number;
  /** Sun direction (normalized, from planet center toward sun). */
  sunDirection?: THREE.Vector3;
  /** Sun color for specular. */
  sunColor?: THREE.ColorRepresentation;
  /** Noise scale for wave size (higher = smaller ripples). */
  size?: number;
  /** Animation speed. */
  timeScale?: number;
  /** Gerstner wave amplitude (fraction of radius). Keep ≤ coast-to-sea elevation step. Default 0.0015. */
  waveAmplitude?: number;
  /** Gerstner wavelength (world-space). Default 0.14. */
  wavelength?: number;
  /** Gerstner steepness Q (0–1). Default 0.22. */
  waveSteepness?: number;
  /** Deep water color at equator (turquoise). Default 0x1a5a6a. */
  color?: THREE.ColorRepresentation;
  /** Deep water color at poles (gray/navy). Default 0x2a3548. */
  colorPole?: THREE.ColorRepresentation;
  /** Optional coast mask texture (1 at water/land boundary). From createCoastMaskTexture. */
  coastMask?: THREE.Texture | null;
  /** Radius where water surface meets land (shoreline). Foam is drawn only on this contour. Default 1.0. */
  shorelineRadius?: number;
  /** When true (default), Gerstner waves fade out with camera distance to save fragment/ALU cost. */
  waveDistanceFade?: boolean;
  /** World-space distance at which wave fade begins (full strength below this). Scaled by `radius` if < 10. Default 1.6 * radius. */
  waveFadeNear?: number;
  /** World-space distance at which waves are fully suppressed. Default 3.8 * radius. */
  waveFadeFar?: number;
}

const VERTEX = `
  uniform float uTime;
  uniform float uRadius;
  uniform vec3 uGerstnerAmps;
  uniform vec3 uGerstnerWL;
  uniform vec3 uGerstnerSpeed;
  uniform vec3 uGerstnerQ;
  uniform vec2 uGerstnerDir1;
  uniform vec2 uGerstnerDir2;
  uniform vec2 uGerstnerDir3;
  uniform vec3 uCameraWorld;
  uniform float uUseWaveDistanceFade;
  uniform vec2 uWaveFadeNearFar;

  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  const float PI = 3.14159265;

  void gerstnerWave(vec2 dir, float amp, float wl, float speed, float Q, vec3 pos, vec3 N,
    inout vec3 disp, inout vec3 normalTilt) {
    float k = 2.0 * PI / wl;
    float phase = (pos.x * dir.x + pos.z * dir.y) * k - uTime * speed;
    float c = cos(phase);
    float s = sin(phase);
    vec3 waveDir3D = vec3(dir.x, 0.0, dir.y);
    vec3 T = waveDir3D - N * dot(N, waveDir3D);
    float len = length(T);
    if (len > 0.001) T /= len;
    else T = vec3(0.0);
    disp += N * (amp * c) + T * (Q * amp * s);
    normalTilt += T * (amp * k * s);
  }

  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vec3 pos = worldPos.xyz;
    vec3 N = normalize(pos);
    float waveFade = 1.0;
    if (uUseWaveDistanceFade > 0.5) {
      float dist = length(uCameraWorld - pos);
      waveFade = 1.0 - smoothstep(uWaveFadeNearFar.x, uWaveFadeNearFar.y, dist);
    }
    vec3 disp = vec3(0.0);
    vec3 normalTilt = vec3(0.0);
    gerstnerWave(uGerstnerDir1, uGerstnerAmps.x * waveFade, uGerstnerWL.x, uGerstnerSpeed.x, uGerstnerQ.x, pos, N, disp, normalTilt);
    gerstnerWave(uGerstnerDir2, uGerstnerAmps.y * waveFade, uGerstnerWL.y, uGerstnerSpeed.y, uGerstnerQ.y, pos, N, disp, normalTilt);
    gerstnerWave(uGerstnerDir3, uGerstnerAmps.z * waveFade, uGerstnerWL.z, uGerstnerSpeed.z, uGerstnerQ.z, pos, N, disp, normalTilt);
    vec3 newPos = pos + disp;
    vWorldPosition = newPos;
    vNormal = normalize(N - normalTilt);
    vec4 mvPosition = viewMatrix * vec4(newPos, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

// Same structure as Three.js Water: getNoise -> surfaceNormal, sunLight, then albedo with fresnel instead of mirror
const FRAGMENT = `
  uniform float uTime;
  uniform float uSize;
  uniform float uRadius;
  uniform float uUseNormalMap;
  uniform vec3 uSunDirection;
  uniform vec3 uSunColor;
  uniform vec3 uWaterColor;
  uniform vec3 uWaterColorPole;
  uniform sampler2D uNormalMap;
  uniform float uFoamCrestSpeed;
  uniform float uFoamWaveCount;
  uniform float uUseCoastMask;
  uniform sampler2D uCoastMask;
  uniform float uShorelineRadius;

  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  const float TAU = 6.2831853;

  vec4 getNoise(vec2 uv) {
    float t = uTime;
    if (uUseNormalMap > 0.5) {
      vec2 uv0 = (uv / 103.0) + vec2(t / 17.0, t / 29.0);
      vec2 uv1 = uv / 107.0 - vec2(t / -19.0, t / 31.0);
      vec2 uv2 = uv / vec2(8907.0, 9803.0) + vec2(t / 101.0, t / 97.0);
      vec2 uv3 = uv / vec2(1091.0, 1027.0) - vec2(t / 109.0, t / -113.0);
      vec4 n = texture2D(uNormalMap, uv0) + texture2D(uNormalMap, uv1) +
               texture2D(uNormalMap, uv2) + texture2D(uNormalMap, uv3);
      return n * 0.5 - 1.0;
    }
    float n0 = sin(uv.x * 2.0 + t) * cos(uv.y * 2.0 + t * 0.8);
    float n1 = sin(uv.x * 5.0 - t * 0.7) * cos(uv.y * 5.0 + t * 0.9);
    float n2 = sin((uv.x + uv.y) * 4.0 + t * 1.1);
    return vec4(n0, n1, n2, 0.0) * 0.07;
  }

  void sunLight(const vec3 surfaceNormal, const vec3 eyeDirection, float shiny, float spec, float diffuse, inout vec3 diffuseColor, inout vec3 specularColor) {
    vec3 reflection = normalize(reflect(-uSunDirection, surfaceNormal));
    float direction = max(0.0, dot(eyeDirection, reflection));
    specularColor += pow(direction, shiny) * uSunColor * spec;
    diffuseColor += max(dot(uSunDirection, surfaceNormal), 0.0) * uSunColor * diffuse;
  }

  void main() {
    vec2 uv = vWorldPosition.xz * uSize;
    vec4 noise = getNoise(uv);
    vec3 surfaceNormal = normalize(vNormal + noise.xzy * vec3(0.7, 0.5, 0.7));

    vec3 eyeDirection = normalize(vViewPosition);
    vec3 diffuseLight = vec3(0.0);
    vec3 specularLight = vec3(0.0);
    sunLight(surfaceNormal, eyeDirection, 80.0, 0.9, 0.4, diffuseLight, specularLight);

    float theta = max(dot(eyeDirection, surfaceNormal), 0.0);
    float rf0 = 0.3;
    float reflectance = rf0 + (1.0 - rf0) * pow((1.0 - theta), 5.0);
    vec3 dir = normalize(vWorldPosition);
    float lat = asin(clamp(dir.y, -1.0, 1.0));
    float latNorm = abs(lat) / 1.5707963;
    vec3 waterColor = mix(uWaterColor, uWaterColorPole, latNorm);
    vec3 scatter = max(0.0, dot(surfaceNormal, eyeDirection)) * waterColor;
    vec3 skyReflection = vec3(0.4, 0.55, 0.7);
    vec3 albedo = mix(
      (uSunColor * diffuseLight * 0.3 + scatter),
      (vec3(0.1) + skyReflection * 0.9 + specularLight),
      reflectance
    );
    float sunFactor = 0.03 + 0.97 * max(0.0, dot(surfaceNormal, uSunDirection));
    albedo *= sunFactor;

    float foam = 0.0;
    if (uUseCoastMask > 0.5) {
      float r = length(vWorldPosition);
      float gradient = smoothstep(uRadius, uShorelineRadius, r);
      vec3 dir = normalize(vWorldPosition);
      float lon = atan(dir.z, dir.x);
      float lat = asin(clamp(dir.y, -1.0, 1.0));
      float u = lon / 6.2831853 + 0.5;
      float v = lat / 3.14159265 + 0.5;
      float coastMask = texture2D(uCoastMask, vec2(u, v)).r;
      float noise = sin(vWorldPosition.x * 8.0 + uTime) * cos(vWorldPosition.z * 8.0 - uTime * 0.7) * 0.04;
      float distorted = gradient + noise;
      float waveInput = (distorted - uTime * uFoamCrestSpeed) * uFoamWaveCount * TAU;
      float approaching = 1.0 - smoothstep(0.2, 0.65, abs(cos(waveInput)));
      float fadeIn = smoothstep(0.0, 0.5, gradient);
      approaching *= fadeIn;
      float swashOffset = cos(uTime * uFoamCrestSpeed * uFoamWaveCount * TAU) * 0.07;
      float swashPos = distorted + swashOffset;
      float swashNoise = sin(vWorldPosition.x * 15.0 + vWorldPosition.z * 12.0) * 0.025;
      float swash = 1.0 - smoothstep(0.65, 0.92 + swashNoise, swashPos);
      swash *= fadeIn;
      foam = coastMask * max(approaching, swash);
      foam = smoothstep(0.1, 0.5, foam);
    }
    vec3 foamColor = vec3(1.0, 1.0, 0.98);
    albedo = mix(albedo, foamColor, foam * 0.88 * sunFactor);

    float alpha = 0.92;
    gl_FragColor = vec4(albedo, alpha);
  }
`;

function defaultGerstnerDirs(): [THREE.Vector2, THREE.Vector2, THREE.Vector2] {
  const a = (deg: number) => (deg * Math.PI) / 180;
  return [
    new THREE.Vector2(Math.cos(a(0)), Math.sin(a(0))),
    new THREE.Vector2(Math.cos(a(70)), Math.sin(a(70))),
    new THREE.Vector2(Math.cos(a(140)), Math.sin(a(140))),
  ];
}

const DUMMY_COAST_MASK = (() => {
  const data = new Uint8Array([0]);
  const tex = new THREE.DataTexture(data, 1, 1, THREE.RedFormat);
  tex.needsUpdate = true;
  return tex;
})();

export class WaterSphere {
  readonly mesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;
  private _radius: number;
  private clock: THREE.Clock;
  private _timeScale: number;

  constructor(options: WaterSphereOptions = {}) {
    const radius = options.radius ?? 1;
    const segments = options.segments ?? 64;
    this._radius = radius;
    this._timeScale = options.timeScale ?? 1;
    this.clock = new THREE.Clock();

    const amp = options.waveAmplitude ?? 0.0015;
    const wl = options.wavelength ?? 0.14;
    const q = options.waveSteepness ?? 0.22;
    const [d1, d2, d3] = defaultGerstnerDirs();
    const fadeOn = options.waveDistanceFade !== false;
    const fadeNear = options.waveFadeNear ?? radius * 1.6;
    const fadeFar = options.waveFadeFar ?? radius * 3.8;

    const geometry = new THREE.SphereGeometry(radius, segments, segments);
    const sunDir =
      options.sunDirection ?? new THREE.Vector3(0.5, 0.6, 0.4).normalize();
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: {
        uTime: { value: 0 },
        uRadius: { value: radius },
        uSize: { value: options.size ?? 1.5 },
        uUseNormalMap: { value: 0 },
        uSunDirection: { value: sunDir.clone() },
        uSunColor: { value: new THREE.Color(options.sunColor ?? 0xffffff) },
        uWaterColor: { value: new THREE.Color(options.color ?? 0x1a5a6a) },
        uWaterColorPole: {
          value: new THREE.Color(options.colorPole ?? 0x2a3548),
        },
        uNormalMap: { value: null as THREE.Texture | null },
        uGerstnerAmps: { value: new THREE.Vector3(amp, amp * 0.85, amp * 0.6) },
        uGerstnerWL: { value: new THREE.Vector3(wl, wl * 0.8, wl * 0.65) },
        uGerstnerSpeed: { value: new THREE.Vector3(1.2, 1.0, 0.85) },
        uGerstnerQ: { value: new THREE.Vector3(q, q * 0.9, q * 0.85) },
        uGerstnerDir1: { value: d1 },
        uGerstnerDir2: { value: d2 },
        uGerstnerDir3: { value: d3 },
        uCameraWorld: { value: new THREE.Vector3(0, 0, 3) },
        uUseWaveDistanceFade: { value: fadeOn ? 1 : 0 },
        uWaveFadeNearFar: { value: new THREE.Vector2(fadeNear, fadeFar) },
        uFoamCrestSpeed: { value: 0.073 },
        uFoamWaveCount: { value: 3.2 },
        uUseCoastMask: { value: options.coastMask ? 1 : 0 },
        uCoastMask: { value: options.coastMask ?? DUMMY_COAST_MASK },
        uShorelineRadius: { value: options.shorelineRadius ?? 1.0 },
      },
      transparent: true,
      side: THREE.DoubleSide, // DoubleSide for terrain-following water table
      depthWrite: false,
    });

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.name = "WaterSphere";
    this.mesh.renderOrder = 1;
  }

  /** Call each frame to animate waves. */
  update(): void {
    this.material.uniforms.uTime.value =
      this.clock.getElapsedTime() * this._timeScale;
  }

  /** World-space camera position; enables distance-based wave fade when `waveDistanceFade` is on. */
  setCameraWorldPosition(position: THREE.Vector3): void {
    (
      this.material.uniforms.uCameraWorld as THREE.IUniform<THREE.Vector3>
    ).value.copy(position);
  }

  setSunDirection(direction: THREE.Vector3): void {
    this.material.uniforms.uSunDirection.value.copy(direction).normalize();
  }

  /** Optional: use Three.js water normal map texture for more realistic ripples. */
  setNormalMap(texture: THREE.Texture | null): void {
    this.material.uniforms.uNormalMap.value = texture;
    this.material.uniforms.uUseNormalMap.value = texture ? 1 : 0;
  }

  /**
   * Replace the sphere geometry with a "water table" geometry that follows terrain elevation.
   * Water sits just below each tile's elevation, naturally filling river cutouts while
   * staying invisible under solid land hexes.
   *
   * For river tiles, corner vertices are smoothly interpolated between neighboring tile
   * water levels to create gradual river slopes. Open-ocean tiles use a fixed level; lakes
   * use elevation-based depth (caller should make `isOcean` false for lakes).
   *
   * Tiles that are not open ocean, not river, and not lake emit no geometry (no subsurface
   * fan under dry land).
   *
   * Lake and river fans use the same **planar** corner placement as land hexes
   * (`centerNormal * r + tangential` from each corner direction). Pure radial corners
   * would sit outside that flat footprint and read as water spilling onto dry tiles.
   * Open ocean / beach fans stay spherical to match radial water-tile terrain vertices.
   */
  setWaterTableGeometry(
    tiles: Array<{
      id: number;
      center: THREE.Vector3;
      vertices: THREE.Vector3[];
    }>,
    getElevation: (tileId: number) => number,
    options: {
      baseRadius: number;
      elevationScale?: number;
      /** Offset below land surface (negative = below). Default -0.008 */
      depthBelowSurface?: number;
      /** Ocean surface level. Default baseRadius * 0.995 */
      oceanLevel?: number;
      /** Open ocean / coastal water at fixed `oceanLevel` (exclude lakes — use `isLake` + elevation). */
      isOcean?: (tileId: number) => boolean;
      /** Inland lake or other water body that follows terrain elevation (not `oceanLevel`). */
      isLake?: (tileId: number) => boolean;
      /** River channel (smooth corner blending with neighbors). */
      isRiver?: (tileId: number) => boolean;
      /** Get neighbor tile IDs for a given edge (0-5). Returns undefined if no neighbor. */
      getEdgeNeighbor?: (
        tileId: number,
        edgeIndex: number,
      ) => number | undefined;
      /**
       * If set, tiles that are open ocean on all sides (no land, river, or lake neighbors)
       * skip per-hex fans and are covered by one low-poly sphere at `oceanLevel` instead.
       */
      interiorOceanSphere?: { widthSegments: number; heightSegments: number };
      /** Log tile/triangle counts (default false — avoid string work on huge builds). */
      verbose?: boolean;
    },
  ): void {
    const {
      baseRadius,
      elevationScale = 1,
      depthBelowSurface = -0.008,
    } = options;
    const oceanLevel = options.oceanLevel ?? baseRadius * 0.995;
    const isOcean = options.isOcean ?? (() => false);
    const isLake = options.isLake ?? (() => false);
    const isRiver = options.isRiver ?? (() => false);
    const getEdgeNeighbor = options.getEdgeNeighbor;
    const interiorSphereCfg = options.interiorOceanSphere;
    const verbose = options.verbose ?? false;

    let maxTileId = 0;
    for (let i = 0; i < tiles.length; i++) {
      const id = tiles[i].id;
      if (id > maxTileId) maxTileId = id;
    }
    const idSpan = maxTileId + 1;
    const waterR = new Float32Array(idSpan);
    for (let i = 0; i < tiles.length; i++) {
      const tile = tiles[i];
      const id = tile.id;
      if (isOcean(id)) {
        waterR[id] = oceanLevel;
      } else {
        const elev = getElevation(id) * elevationScale;
        waterR[id] = baseRadius + elev + depthBelowSurface;
      }
    }

    const interiorOceanFlags = new Uint8Array(idSpan);
    if (interiorSphereCfg && getEdgeNeighbor) {
      for (let ti = 0; ti < tiles.length; ti++) {
        const tile = tiles[ti];
        const tid = tile.id;
        if (!isOcean(tid) || isRiver(tid) || isLake(tid)) continue;
        const n = tile.vertices?.length ?? 0;
        if (n < 3) continue;
        let surroundedByOpenOcean = true;
        for (let e = 0; e < n; e++) {
          const nid = getEdgeNeighbor(tid, e);
          if (
            nid === undefined ||
            !isOcean(nid) ||
            isRiver(nid) ||
            isLake(nid)
          ) {
            surroundedByOpenOcean = false;
            break;
          }
        }
        if (surroundedByOpenOcean) interiorOceanFlags[tid] = 1;
      }
    }

    const cN = new THREE.Vector3();
    const cP = new THREE.Vector3();
    const cornerN = new THREE.Vector3();
    const cornerP = new THREE.Vector3();
    /** `cn * (fv·cn)` for planar water corners (matches flat land hex in geodesic.ts). */
    const cnProjFv = new THREE.Vector3();
    const fvTan = new THREE.Vector3();

    let oceanFanCount = 0;
    let lakeCount = 0;
    let riverCount = 0;
    let skippedDryLand = 0;
    let interiorOceanCount = 0;
    let vertCount = 0;
    let indexCount = 0;

    for (let ti = 0; ti < tiles.length; ti++) {
      const tile = tiles[ti];
      if (!tile.vertices || tile.vertices.length < 3) continue;

      const n = tile.vertices.length;
      const tid = tile.id;
      const tileIsOcean = isOcean(tid);
      const tileIsLake = isLake(tid);
      const tileIsRiver = !tileIsOcean && isRiver(tid);

      if (!tileIsOcean && !tileIsRiver && !tileIsLake) {
        skippedDryLand++;
        continue;
      }

      if (tileIsOcean && interiorOceanFlags[tid]) {
        interiorOceanCount++;
        continue;
      }

      vertCount += 1 + n;
      indexCount += n * 3;
    }

    const positions = new Float32Array(vertCount * 3);
    const normals = new Float32Array(vertCount * 3);
    const use32BitIndex = vertCount > 65535;
    const indices = use32BitIndex
      ? new Uint32Array(indexCount)
      : new Uint16Array(indexCount);

    let vp = 0;
    let ip = 0;
    oceanFanCount = 0;
    lakeCount = 0;
    riverCount = 0;

    for (let ti = 0; ti < tiles.length; ti++) {
      const tile = tiles[ti];
      if (!tile.vertices || tile.vertices.length < 3) continue;

      const n = tile.vertices.length;
      const tid = tile.id;
      const tileIsOcean = isOcean(tid);
      const tileIsLake = isLake(tid);
      const tileIsRiver = !tileIsOcean && isRiver(tid);
      const wr = waterR[tid] ?? oceanLevel;

      if (!tileIsOcean && !tileIsRiver && !tileIsLake) continue;
      if (tileIsOcean && interiorOceanFlags[tid]) continue;

      if (tileIsOcean) oceanFanCount++;
      else if (tileIsRiver) riverCount++;
      else if (tileIsLake) lakeCount++;

      cN.copy(tile.center).normalize();
      cP.copy(cN).multiplyScalar(wr);
      const centerIdx = vp / 3;
      positions[vp] = cP.x;
      positions[vp + 1] = cP.y;
      positions[vp + 2] = cP.z;
      normals[vp] = cN.x;
      normals[vp + 1] = cN.y;
      normals[vp + 2] = cN.z;
      vp += 3;

      const cornerBase = vp / 3;
      for (let v = 0; v < n; v++) {
        cornerN.copy(tile.vertices[v]).normalize();

        let cornerR = wr;

        if (tileIsRiver && getEdgeNeighbor) {
          const prevEdge = (v - 1 + n) % n;
          const neighborA = getEdgeNeighbor(tid, prevEdge);
          const neighborB = getEdgeNeighbor(tid, v);

          let sum = wr;
          let count = 1;

          if (neighborA !== undefined && neighborA < idSpan) {
            sum += waterR[neighborA];
            count++;
          }
          if (
            neighborB !== undefined &&
            neighborB !== neighborA &&
            neighborB < idSpan
          ) {
            sum += waterR[neighborB];
            count++;
          }

          cornerR = sum / count;
        }

        if (tileIsOcean) {
          cornerP.copy(cornerN).multiplyScalar(cornerR);
        } else {
          const d = cornerN.dot(cN);
          cnProjFv.copy(cN).multiplyScalar(d);
          fvTan.copy(cornerN).sub(cnProjFv);
          cornerP.copy(cN).multiplyScalar(cornerR).add(fvTan);
        }
        positions[vp] = cornerP.x;
        positions[vp + 1] = cornerP.y;
        positions[vp + 2] = cornerP.z;
        normals[vp] = cN.x;
        normals[vp + 1] = cN.y;
        normals[vp + 2] = cN.z;
        vp += 3;
      }

      for (let v = 0; v < n; v++) {
        const i0 = cornerBase + v;
        const i1 = cornerBase + ((v + 1) % n);
        indices[ip++] = centerIdx;
        indices[ip++] = i1;
        indices[ip++] = i0;
      }
    }

    if (verbose) {
      console.log(
        `[WaterSphere] water table: ${oceanFanCount} ocean fans, ${interiorOceanCount} interior ocean (sphere), ${riverCount} river, ${lakeCount} lake, ${skippedDryLand} dry land skipped`,
      );
    }

    const fanGeometry = new THREE.BufferGeometry();
    fanGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    fanGeometry.setAttribute(
      "normal",
      new THREE.Float32BufferAttribute(normals, 3),
    );
    if (use32BitIndex) {
      fanGeometry.setIndex(
        new THREE.Uint32BufferAttribute(indices as Uint32Array, 1),
      );
    } else {
      fanGeometry.setIndex(
        new THREE.Uint16BufferAttribute(indices as Uint16Array, 1),
      );
    }
    if (vertCount > 0) {
      fanGeometry.computeVertexNormals();
    }

    let geometry: THREE.BufferGeometry = fanGeometry;
    if (interiorOceanCount > 0 && interiorSphereCfg) {
      const sphereGeom = new THREE.SphereGeometry(
        oceanLevel,
        interiorSphereCfg.widthSegments,
        interiorSphereCfg.heightSegments,
      );
      sphereGeom.deleteAttribute("uv");
      const parts = vertCount > 0 ? [sphereGeom, fanGeometry] : [sphereGeom];
      const merged = mergeGeometries(parts, false);
      if (merged == null) {
        sphereGeom.dispose();
        throw new Error(
          "[WaterSphere] mergeGeometries failed (sphere + water table attribute mismatch)",
        );
      }
      sphereGeom.dispose();
      if (vertCount > 0) fanGeometry.dispose();
      geometry = merged;
    }

    this.mesh.geometry.dispose();
    this.mesh.geometry = geometry;

    if (verbose) {
      const posAttr = geometry.getAttribute("position");
      const idx = geometry.getIndex();
      console.log(
        `[WaterSphere] setWaterTableGeometry: ${tiles.length} tiles, ${posAttr?.count ?? 0} vertices, ${(idx?.count ?? 0) / 3} triangles`,
      );
    }
  }

  set radius(r: number) {
    this._radius = r;
    (this.material.uniforms.uRadius as THREE.IUniform<number>).value = r;
    this.mesh.geometry.dispose();
    this.mesh.geometry = new THREE.SphereGeometry(r, 64, 64);
  }

  /** Set coast mask texture (from createCoastMaskTexture). Foam only draws where mask > 0. */
  setCoastMask(texture: THREE.Texture | null): void {
    (this.material.uniforms.uCoastMask as THREE.IUniform<THREE.Texture>).value =
      texture ?? DUMMY_COAST_MASK;
    (this.material.uniforms.uUseCoastMask as THREE.IUniform<number>).value =
      texture ? 1 : 0;
  }

  get radius(): number {
    return this._radius;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
