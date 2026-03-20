/**
 * Twinkling starfield on a fixed celestial sphere (world space).
 * Can be procedural (random) or real: pass a catalog of stars (ra, dec, mag) and
 * sidereal angle each frame so positions match the date/time.
 */

import * as THREE from "three";

/** One star: RA and Dec in degrees (J2000), magnitude (brighter = smaller number). */
export interface StarCatalogEntry {
  ra: number;
  dec: number;
  mag: number;
}

const VERTEX = `
  varying vec2 vUv;
  varying vec3 vWorldDir;
  uniform mat4 uInvViewMatrix;
  void main() {
    vUv = uv;
    vec4 viewPos = modelViewMatrix * vec4(position, 1.0);
    vec3 viewDir = normalize(viewPos.xyz);
    vWorldDir = (uInvViewMatrix * vec4(viewDir, 0.0)).xyz;
    gl_Position = projectionMatrix * viewPos;
  }
`;

const FRAGMENT = `
  uniform float uTime;
  uniform float uTwinkleSpeed;
  uniform float uTwinkleAmount;
  uniform vec3 uColor;
  uniform float uDensity;
  uniform float uSparsity;
  varying vec2 vUv;
  varying vec3 vWorldDir;
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  void main() {
    vec3 d = normalize(vWorldDir);
    float phi = acos(clamp(d.y, -1.0, 1.0));
    float theta = atan(d.z, d.x);
    vec2 skyUv = vec2((theta + 3.14159265) / 6.28318531, phi / 3.14159265);
    vec2 grid = skyUv * uDensity;
    vec2 cell = floor(grid);
    vec2 cellUv = fract(grid);
    float h = hash(cell);
    if (h >= uSparsity) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
      return;
    }
    vec2 starCenter = vec2(hash(cell + 0.1), hash(cell + 0.2));
    float dist = length(cellUv - starCenter);
    float size = hash(cell + 0.3);
    float starRadius = 0.012 + size * 0.02;
    if (dist > starRadius) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
      return;
    }
    float soft = 1.0 - smoothstep(starRadius * 0.15, starRadius * 0.6, dist);
    float twinkle = sin(uTime * uTwinkleSpeed + h * 6.28318) * 0.5 + 0.5;
    float baseBright = (1.0 - uTwinkleAmount) + uTwinkleAmount * twinkle;
    float magnitude = h < 0.04 ? 1.0 : (h < 0.09 ? 0.45 : 0.06);
    float brightness = baseBright * magnitude;
    gl_FragColor = vec4(uColor * brightness, soft * magnitude);
  }
`;

export interface StarfieldOptions {
  /** Grid density (higher = more cells; fewer stars shown due to sparsity). Procedural only. */
  density?: number;
  /** Fraction of cells that show a star (0–1). Procedural only. */
  sparsity?: number;
  /** Twinkle speed (time multiplier). Procedural only. */
  twinkleSpeed?: number;
  /** How much stars dim at minimum (0 = no twinkle, 1 = full twinkle to dark). Procedural only. */
  twinkleAmount?: number;
  /** Star color. */
  color?: THREE.ColorRepresentation;
  /**
   * Real star catalog (RA/Dec in degrees, magnitude). When set, stars are placed on a celestial
   * sphere and rotated by sidereal angle in update(); pass dateToGreenwichMeanSiderealTimeRad(date).
   */
  catalog?: StarCatalogEntry[];
  /** Radius of the star sphere in catalog mode. Default 800. */
  catalogSphereRadius?: number;
  /** Overall brightness multiplier for catalog stars (1 = normalized to brightest). Default 4. */
  catalogBrightnessScale?: number;
}

const CATALOG_VERTEX = `
  attribute float size;
  attribute float magnitude;
  varying float vMagnitude;
  void main() {
    vMagnitude = magnitude;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float ptSize = size * (1000.0 / -mv.z);
    gl_PointSize = max(ptSize, 2.0);
    gl_Position = projectionMatrix * mv;
  }
`;

const CATALOG_FRAGMENT = `
  uniform vec3 uColor;
  uniform float uMagBrightest;
  uniform float uBrightnessScale;
  varying float vMagnitude;
  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    float soft = 1.0 - smoothstep(0.1, 0.5, dist);
    float bright = pow(2.512, uMagBrightest - vMagnitude);
    bright = clamp(bright * uBrightnessScale, 0.65, 1.0);
    float alpha = soft * bright;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

function raDecToDirection(raDeg: number, decDeg: number): THREE.Vector3 {
  const ra = (raDeg * Math.PI) / 180;
  const dec = (decDeg * Math.PI) / 180;
  const cosDec = Math.cos(dec);
  return new THREE.Vector3(
    cosDec * Math.cos(ra),
    Math.sin(dec),
    cosDec * Math.sin(ra)
  );
}

export class Starfield {
  readonly mesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;
  private clock: THREE.Clock;
  /** When using catalog: group to add to scene; rotate by sidereal angle in update(). */
  readonly catalogGroup: THREE.Group | null;
  private catalogPoints: THREE.Points | null = null;
  private catalogMaterial: THREE.ShaderMaterial | null = null;

  constructor(options: StarfieldOptions = {}) {
    this.clock = new THREE.Clock();
    const size = 200;
    const geometry = new THREE.PlaneGeometry(size, size);
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: {
        uTime: { value: 0 },
        uInvViewMatrix: { value: new THREE.Matrix4() },
        uDensity: { value: options.density ?? 80 },
        uSparsity: { value: options.sparsity ?? 0.14 },
        uTwinkleSpeed: { value: options.twinkleSpeed ?? 0.8 },
        uTwinkleAmount: { value: options.twinkleAmount ?? 0.6 },
        uColor: { value: new THREE.Color(options.color ?? 0xffffff) },
      },
      transparent: true,
      depthWrite: false,
      depthTest: true,
    });

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.name = "Starfield";
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -1000;

    if (options.catalog && options.catalog.length > 0) {
      const radius = options.catalogSphereRadius ?? 800;
      const positions: number[] = [];
      const sizes: number[] = [];
      const magnitudes: number[] = [];
      let magBrightest = Infinity;
      for (const star of options.catalog) {
        const dir = raDecToDirection(star.ra, star.dec);
        positions.push(dir.x * radius, dir.y * radius, dir.z * radius);
        const mag = Math.max(-2, Math.min(7, star.mag));
        if (mag < magBrightest) magBrightest = mag;
        sizes.push(1.2 + (7 - mag) * 0.25);
        magnitudes.push(mag);
      }
      const geom = new THREE.BufferGeometry();
      geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      geom.setAttribute("size", new THREE.Float32BufferAttribute(sizes, 1));
      geom.setAttribute("magnitude", new THREE.Float32BufferAttribute(magnitudes, 1));
      this.catalogMaterial = new THREE.ShaderMaterial({
        vertexShader: CATALOG_VERTEX,
        fragmentShader: CATALOG_FRAGMENT,
        uniforms: {
          uColor: { value: new THREE.Color(options.color ?? 0xf0f4ff) },
          uMagBrightest: { value: magBrightest },
          uBrightnessScale: { value: options.catalogBrightnessScale ?? 4.0 },
        },
        transparent: true,
        depthWrite: false,
        depthTest: true,
      });
      this.catalogPoints = new THREE.Points(geom, this.catalogMaterial);
      this.catalogPoints.frustumCulled = false;
      this.catalogPoints.renderOrder = -1000;
      this.catalogGroup = new THREE.Group();
      this.catalogGroup.name = "StarfieldCatalog";
      this.catalogGroup.add(this.catalogPoints);
    } else {
      this.catalogGroup = null;
    }
  }

  /** True when using real star catalog (add catalogGroup to scene). */
  get useCatalog(): boolean {
    return this.catalogGroup != null;
  }

  /**
   * Attach procedural starfield to camera (far plane). Only used when not using catalog.
   */
  attachToCamera(camera: THREE.PerspectiveCamera): void {
    if (this.catalogGroup) return;
    const far = camera.far;
    this.mesh.position.set(0, 0, -far * 0.99);
    this.mesh.scale.setScalar((far * 0.5) / 100);
    camera.add(this.mesh);
  }

  /**
   * Call once per frame. Pass siderealAngleRad (e.g. from dateToGreenwichMeanSiderealTimeRad(date))
   * when using catalog so star positions match the date/time.
   */
  update(camera?: THREE.PerspectiveCamera, siderealAngleRad?: number): void {
    if (this.catalogGroup != null) {
      if (siderealAngleRad != null) {
        this.catalogGroup.rotation.y = siderealAngleRad;
      }
      return;
    }
    this.material.uniforms.uTime.value = this.clock.getElapsedTime();
    if (camera) {
      this.material.uniforms.uInvViewMatrix.value.copy(camera.matrixWorld);
    }
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
    if (this.catalogPoints?.geometry) {
      this.catalogPoints.geometry.dispose();
    }
    if (this.catalogMaterial) {
      this.catalogMaterial.dispose();
    }
  }
}
