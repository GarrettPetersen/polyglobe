/**
 * Left-behind coast foam overlay: draws on the land at the high-water mark (shoreline).
 * White lines that stay in place and fade after each wave recedes.
 */

import * as THREE from "three";

const PI = Math.PI;
const TAU = 2 * PI;

export interface CoastFoamOverlayOptions {
  /** Radius of the overlay sphere (shoreline = where water meets land). Default 1.0 */
  radius?: number;
  /** Wave speed for fade timing (match WaterSphere foam). Default 0.073 */
  speed?: number;
  /** Same as WaterSphere timeScale so phase matches. Default 1.0 */
  timeScale?: number;
}

const VERTEX = `
  varying vec3 vWorldPosition;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorldPosition = w.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT = `
  uniform float uTime;
  uniform sampler2D uCoastLandMask;
  uniform float uSpeed;
  uniform float uWaveCount;
  uniform vec3 uSunDirection;

  varying vec3 vWorldPosition;

  const float TAU = 6.2831853;

  void main() {
    vec3 dir = normalize(vWorldPosition);
    float lon = atan(dir.z, dir.x);
    float lat = asin(clamp(dir.y, -1.0, 1.0));
    float u = lon / 6.2831853 + 0.5;
    float v = lat / 3.14159265 + 0.5;
    float coastLand = texture2D(uCoastLandMask, vec2(u, v)).r;
    if (coastLand < 0.5) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
      return;
    }
    float swashCos = cos(uTime * uSpeed * uWaveCount * TAU);
    float recedeFade = (1.0 + swashCos) * 0.5;
    float noise = 0.92 + 0.08 * sin(vWorldPosition.x * 12.0 + vWorldPosition.z * 10.0);
    float sunFactor = 0.1 + 0.9 * max(0.0, dot(dir, uSunDirection));
    vec3 white = vec3(1.0, 1.0, 0.98);
    gl_FragColor = vec4(white, recedeFade * coastLand * 0.78 * noise * sunFactor);
  }
`;

export class CoastFoamOverlay {
  readonly mesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;
  private clock: THREE.Clock;
  private _timeScale: number;

  constructor(
    coastLandMask: THREE.Texture,
    options: CoastFoamOverlayOptions = {}
  ) {
    const radius = options.radius ?? 1.0;
    const speed = options.speed ?? 0.073;
    this._timeScale = options.timeScale ?? 1.0;
    this.clock = new THREE.Clock();

    const waveCount = 3.2;
    const geometry = new THREE.SphereGeometry(radius, 64, 64);
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: {
        uTime: { value: 0 },
        uCoastLandMask: { value: coastLandMask },
        uSpeed: { value: speed },
        uWaveCount: { value: waveCount },
        uSunDirection: { value: new THREE.Vector3(0.5, 0.6, 0.4).normalize() },
      },
      transparent: true,
      depthWrite: false,
      side: THREE.FrontSide,
    });
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.name = "CoastFoamOverlay";
    this.mesh.renderOrder = 2;
  }

  setSunDirection(direction: THREE.Vector3): void {
    this.material.uniforms.uSunDirection.value.copy(direction);
  }

  update(): void {
    this.material.uniforms.uTime.value = this.clock.getElapsedTime() * this._timeScale;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
