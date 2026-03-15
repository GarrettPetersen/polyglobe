/**
 * Spherical water layer: water sits on a sphere at a given radius, so "down" is always
 * toward the planet center (gravity toward center). Beautiful water via custom shader
 * (Fresnel, reflection). For advanced ocean (FFT, foam) consider integrating
 * threejs-water-shader or Three.js Water from examples.
 */

import * as THREE from "three";

export interface WaterSphereOptions {
  /** Radius of the water sphere (typically globe radius). */
  radius?: number;
  /** Segment count for the sphere geometry (higher = smoother). */
  segments?: number;
  /** Base color (deep water). */
  color?: THREE.ColorRepresentation;
  /** Fresnel power (rim intensity). */
  fresnelPower?: number;
  /** Opacity. */
  opacity?: number;
}

const DEFAULT_VERTEX = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const DEFAULT_FRAGMENT = `
  uniform vec3 uColor;
  uniform float uFresnelPower;
  uniform float uOpacity;
  uniform vec3 uCameraPosition;
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    vec3 viewDir = normalize(vPosition);
    float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), uFresnelPower);
    float rim = fresnel * 0.7 + 0.3;
    vec3 col = uColor * (0.4 + 0.6 * rim);
    gl_FragColor = vec4(col, uOpacity * (0.7 + 0.3 * fresnel));
  }
`;

export class WaterSphere {
  readonly mesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;
  private _radius: number;

  constructor(options: WaterSphereOptions = {}) {
    const radius = options.radius ?? 1;
    const segments = options.segments ?? 64;
    this._radius = radius;

    const geometry = new THREE.SphereGeometry(radius, segments, segments);
    this.material = new THREE.ShaderMaterial({
      vertexShader: DEFAULT_VERTEX,
      fragmentShader: DEFAULT_FRAGMENT,
      uniforms: {
        uColor: { value: new THREE.Color(options.color ?? 0x1a4d6d) },
        uFresnelPower: { value: options.fresnelPower ?? 2.5 },
        uOpacity: { value: options.opacity ?? 0.92 },
        uCameraPosition: { value: new THREE.Vector3(0, 0, 5) },
      },
      transparent: true,
      side: THREE.FrontSide,
      depthWrite: false,
    });

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.name = "WaterSphere";
    this.mesh.renderOrder = 1;
  }

  /** Update camera position for per-pixel effects (optional). */
  setCameraPosition(pos: THREE.Vector3): void {
    this.material.uniforms.uCameraPosition.value.copy(pos);
  }

  set radius(r: number) {
    this._radius = r;
    this.mesh.geometry.dispose();
    this.mesh.geometry = new THREE.SphereGeometry(r, 64, 64);
  }

  get radius(): number {
    return this._radius;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
