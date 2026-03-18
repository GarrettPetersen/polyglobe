/**
 * Spherical ocean layer using the same visual style as Three.js Water:
 * animated normals, sun specular, water color, and fresnel. Works on a sphere
 * (no planar reflection). Optional normal map for even more realistic ripples.
 */

import * as THREE from "three";

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
    vec3 disp = vec3(0.0);
    vec3 normalTilt = vec3(0.0);
    gerstnerWave(uGerstnerDir1, uGerstnerAmps.x, uGerstnerWL.x, uGerstnerSpeed.x, uGerstnerQ.x, pos, N, disp, normalTilt);
    gerstnerWave(uGerstnerDir2, uGerstnerAmps.y, uGerstnerWL.y, uGerstnerSpeed.y, uGerstnerQ.y, pos, N, disp, normalTilt);
    gerstnerWave(uGerstnerDir3, uGerstnerAmps.z, uGerstnerWL.z, uGerstnerSpeed.z, uGerstnerQ.z, pos, N, disp, normalTilt);
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

    const geometry = new THREE.SphereGeometry(radius, segments, segments);
    const sunDir = options.sunDirection ?? new THREE.Vector3(0.5, 0.6, 0.4).normalize();
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
        uWaterColorPole: { value: new THREE.Color(options.colorPole ?? 0x2a3548) },
        uNormalMap: { value: null as THREE.Texture | null },
        uGerstnerAmps: { value: new THREE.Vector3(amp, amp * 0.85, amp * 0.6) },
        uGerstnerWL: { value: new THREE.Vector3(wl, wl * 0.8, wl * 0.65) },
        uGerstnerSpeed: { value: new THREE.Vector3(1.2, 1.0, 0.85) },
        uGerstnerQ: { value: new THREE.Vector3(q, q * 0.9, q * 0.85) },
        uGerstnerDir1: { value: d1 },
        uGerstnerDir2: { value: d2 },
        uGerstnerDir3: { value: d3 },
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
    this.material.uniforms.uTime.value = this.clock.getElapsedTime() * this._timeScale;
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
   * water levels to create gradual river slopes. Ocean and lake tiles stay flat.
   */
  setWaterTableGeometry(
    tiles: Array<{ id: number; center: THREE.Vector3; vertices: THREE.Vector3[] }>,
    getElevation: (tileId: number) => number,
    options: {
      baseRadius: number;
      elevationScale?: number;
      /** Offset below land surface (negative = below). Default -0.008 */
      depthBelowSurface?: number;
      /** Ocean surface level. Default baseRadius * 0.995 */
      oceanLevel?: number;
      /** Check if tile is ocean/water (use ocean level) vs land (use elevation-based level) */
      isOcean?: (tileId: number) => boolean;
      /** Check if tile is a river (smooth transitions) vs regular land (flat) */
      isRiver?: (tileId: number) => boolean;
      /** Get neighbor tile IDs for a given edge (0-5). Returns undefined if no neighbor. */
      getEdgeNeighbor?: (tileId: number, edgeIndex: number) => number | undefined;
    }
  ): void {
    const { baseRadius, elevationScale = 1, depthBelowSurface = -0.008 } = options;
    const oceanLevel = options.oceanLevel ?? baseRadius * 0.995;
    const isOcean = options.isOcean ?? (() => false);
    const isRiver = options.isRiver ?? (() => false);
    const getEdgeNeighbor = options.getEdgeNeighbor;

    // Pre-compute water radius for each tile
    const tileWaterR = new Map<number, number>();
    for (const tile of tiles) {
      if (isOcean(tile.id)) {
        tileWaterR.set(tile.id, oceanLevel);
      } else {
        const elev = getElevation(tile.id) * elevationScale;
        tileWaterR.set(tile.id, baseRadius + elev + depthBelowSurface);
      }
    }

    const positions: number[] = [];
    const normals: number[] = [];
    const indices: number[] = [];

    let oceanCount = 0;
    let landCount = 0;
    let riverCount = 0;
    
    for (const tile of tiles) {
      if (!tile.vertices || tile.vertices.length < 3) continue;
      
      const n = tile.vertices.length;
      const tileIsOcean = isOcean(tile.id);
      const tileIsRiver = !tileIsOcean && isRiver(tile.id);
      const waterR = tileWaterR.get(tile.id) ?? oceanLevel;
      
      if (tileIsOcean) oceanCount++;
      else if (tileIsRiver) riverCount++;
      else landCount++;

      // Center vertex - always at tile's water level
      const centerNormal = tile.center.clone().normalize();
      const centerPos = centerNormal.clone().multiplyScalar(waterR);
      const centerIdx = positions.length / 3;
      positions.push(centerPos.x, centerPos.y, centerPos.z);
      normals.push(centerNormal.x, centerNormal.y, centerNormal.z);

      // Corner vertices - smoothed for rivers, flat for oceans/lakes/regular land
      const cornerBase = positions.length / 3;
      for (let v = 0; v < n; v++) {
        const cornerNormal = tile.vertices[v].clone().normalize();
        
        let cornerR = waterR;
        
        // For river tiles, interpolate corner height with neighbors
        if (tileIsRiver && getEdgeNeighbor) {
          // This corner is shared by edges v-1 and v (the edges on either side)
          // Get neighbors on those edges
          const prevEdge = (v - 1 + n) % n;
          const neighborA = getEdgeNeighbor(tile.id, prevEdge);
          const neighborB = getEdgeNeighbor(tile.id, v);
          
          // Average water levels of this tile and its corner-sharing neighbors
          let sum = waterR;
          let count = 1;
          
          if (neighborA !== undefined) {
            const nR = tileWaterR.get(neighborA);
            if (nR !== undefined) {
              sum += nR;
              count++;
            }
          }
          if (neighborB !== undefined && neighborB !== neighborA) {
            const nR = tileWaterR.get(neighborB);
            if (nR !== undefined) {
              sum += nR;
              count++;
            }
          }
          
          cornerR = sum / count;
        }
        
        const cornerPos = cornerNormal.clone().multiplyScalar(cornerR);
        positions.push(cornerPos.x, cornerPos.y, cornerPos.z);
        normals.push(centerNormal.x, centerNormal.y, centerNormal.z);
      }

      // Fan triangles from center to corners (CCW winding for outward-facing)
      for (let v = 0; v < n; v++) {
        const i0 = cornerBase + v;
        const i1 = cornerBase + (v + 1) % n;
        indices.push(centerIdx, i1, i0);
      }
    }
    
    console.log(`[WaterSphere] water table: ${oceanCount} ocean, ${riverCount} river, ${landCount} other land tiles`);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    
    this.mesh.geometry.dispose();
    this.mesh.geometry = geometry;
    
    console.log(`[WaterSphere] setWaterTableGeometry: ${tiles.length} tiles, ${positions.length / 3} vertices, ${indices.length / 3} triangles`);
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
    (this.material.uniforms.uUseCoastMask as THREE.IUniform<number>).value = texture ? 1 : 0;
  }

  get radius(): number {
    return this._radius;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
