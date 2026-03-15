/**
 * Twinkling starfield on a fixed celestial sphere (world space).
 * Stars stay fixed as you orbit — you see different stars when you rotate the view.
 */

import * as THREE from "three";

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
  /** Grid density (higher = more cells; fewer stars shown due to sparsity). */
  density?: number;
  /** Fraction of cells that show a star (0–1). e.g. 0.12 = few stars, 0.3 = more. */
  sparsity?: number;
  /** Twinkle speed (time multiplier). */
  twinkleSpeed?: number;
  /** How much stars dim at minimum (0 = no twinkle, 1 = full twinkle to dark). */
  twinkleAmount?: number;
  /** Star color. */
  color?: THREE.ColorRepresentation;
}

export class Starfield {
  readonly mesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;
  private clock: THREE.Clock;

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
  }

  /**
   * Attach to camera so the quad stays at the far plane (call after camera is in the scene).
   * Stars are in world space; pass the camera each frame so the correct sky is shown.
   */
  attachToCamera(camera: THREE.PerspectiveCamera): void {
    const far = camera.far;
    this.mesh.position.set(0, 0, -far * 0.99);
    this.mesh.scale.setScalar((far * 0.5) / 100);
    camera.add(this.mesh);
  }

  /** Call once per frame to update twinkle and view (so stars change as you orbit). */
  update(camera?: THREE.PerspectiveCamera): void {
    this.material.uniforms.uTime.value = this.clock.getElapsedTime();
    if (camera) {
      this.material.uniforms.uInvViewMatrix.value.copy(camera.matrixWorld);
    }
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
