/**
 * Twinkling starfield as a fullscreen quad fixed to the camera (screen-space).
 * No depth or clipping issues — stars are always visible in the background.
 */

import * as THREE from "three";

const VERTEX = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT = `
  uniform float uTime;
  uniform float uTwinkleSpeed;
  uniform float uTwinkleAmount;
  uniform vec3 uColor;
  uniform float uDensity;
  varying vec2 vUv;
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  void main() {
    vec2 grid = vUv * uDensity;
    vec2 cell = floor(grid);
    vec2 cellUv = fract(grid);
    float h = hash(cell);
    vec2 starCenter = vec2(hash(cell + 0.1), hash(cell + 0.2));
    float d = length(cellUv - starCenter);
    float starRadius = 0.08 + h * 0.04;
    if (d > starRadius) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
      return;
    }
    float soft = 1.0 - smoothstep(starRadius * 0.3, starRadius, d);
    float twinkle = sin(uTime * uTwinkleSpeed + h * 6.28318) * 0.5 + 0.5;
    float brightness = (1.0 - uTwinkleAmount) + uTwinkleAmount * twinkle;
    gl_FragColor = vec4(uColor * brightness, soft);
  }
`;

export interface StarfieldOptions {
  /** Grid density (higher = more, smaller stars). */
  density?: number;
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
        uTwinkleSpeed: { value: options.twinkleSpeed ?? 0.8 },
        uTwinkleAmount: { value: options.twinkleAmount ?? 0.6 },
        uColor: { value: new THREE.Color(options.color ?? 0xffffff) },
        uDensity: { value: options.density ?? 120 },
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
   * Pass the camera's far plane so the quad sits just in front of it.
   */
  attachToCamera(camera: THREE.PerspectiveCamera): void {
    const far = camera.far;
    this.mesh.position.set(0, 0, -far * 0.99);
    this.mesh.scale.setScalar((far * 0.5) / 100);
    camera.add(this.mesh);
  }

  /** Call once per frame to update twinkle. */
  update(): void {
    this.material.uniforms.uTime.value = this.clock.getElapsedTime();
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
