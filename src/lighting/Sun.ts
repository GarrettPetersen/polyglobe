/**
 * Sun / directional light that can be placed at any angle (longitude/latitude or direction).
 * Optionally shows a visible distant sphere aligned with the light.
 */

import * as THREE from "three";

const DEFAULT_DISTANCE = 1000;

export interface SunOptions {
  /** Sun direction (normalized). Default: above +Y. */
  direction?: THREE.Vector3;
  /** Or set by spherical angles: longitude (radians, 0 = front), latitude (radians, 0 = equator). */
  longitude?: number;
  latitude?: number;
  /** Distance of sun (and light position) from origin. Larger = smaller disc in sky. */
  distance?: number;
  /** Light color. */
  color?: THREE.ColorRepresentation;
  /** Intensity. */
  intensity?: number;
  /** Ambient light (fill). */
  ambientColor?: THREE.ColorRepresentation;
  ambientIntensity?: number;
  /** If set, a visible sun sphere is created at the light position (huge but distant). */
  sphereRadius?: number;
  /** Color of the visible sun sphere. Defaults to light color. */
  sphereColor?: THREE.ColorRepresentation;
}

export class Sun {
  readonly directional: THREE.DirectionalLight;
  readonly ambient: THREE.AmbientLight;
  /** Visible sun sphere, if sphereRadius was set. */
  readonly sphere: THREE.Mesh | null;
  private _distance: number;

  constructor(options: SunOptions = {}) {
    this._distance = options.distance ?? DEFAULT_DISTANCE;
    this.directional = new THREE.DirectionalLight(
      options.color ?? 0xffffff,
      options.intensity ?? 1.8
    );
    this.ambient = new THREE.AmbientLight(
      options.ambientColor ?? 0x445570,
      options.ambientIntensity ?? 0.5
    );

    if (options.direction) {
      this.directional.position.copy(options.direction).multiplyScalar(this._distance);
      this.directional.target.position.set(0, 0, 0);
    } else {
      this.setAngles(
        options.longitude ?? 0,
        options.latitude ?? Math.PI * 0.35
      );
    }

    if (options.sphereRadius != null && options.sphereRadius > 0) {
      const radius = options.sphereRadius;
      const geometry = new THREE.SphereGeometry(radius, 32, 32);
      const material = new THREE.MeshBasicMaterial({
        color: options.sphereColor ?? options.color ?? 0xffffee,
        fog: false,
      });
      this.sphere = new THREE.Mesh(geometry, material);
      this.sphere.name = "SunSphere";
      this.sphere.position.copy(this.directional.position);
    } else {
      this.sphere = null;
    }
  }

  private syncSphere(): void {
    if (this.sphere) {
      this.sphere.position.copy(this.directional.position);
    }
  }

  /** Set sun by spherical angles (longitude, latitude in radians). */
  setAngles(longitude: number, latitude: number): void {
    const r = this._distance;
    const x = r * Math.cos(latitude) * Math.sin(longitude);
    const y = r * Math.sin(latitude);
    const z = r * Math.cos(latitude) * Math.cos(longitude);
    this.directional.position.set(x, y, z);
    this.directional.target.position.set(0, 0, 0);
    this.syncSphere();
  }

  /** Set sun direction from a normalized vector (from planet center toward sun). */
  setDirection(direction: THREE.Vector3): void {
    this.directional.position.copy(direction).multiplyScalar(this._distance);
    this.syncSphere();
  }

  /** Day/night: 0 = midnight, 0.5 = noon, 1 = midnight. */
  setTimeOfDay(t: number): void {
    const longitude = t * Math.PI * 2;
    const latitude = Math.PI * 0.2;
    this.setAngles(longitude, latitude);
  }

  addTo(scene: THREE.Scene): void {
    scene.add(this.directional);
    scene.add(this.directional.target);
    scene.add(this.ambient);
    if (this.sphere) {
      scene.add(this.sphere);
    }
  }

  removeFrom(scene: THREE.Scene): void {
    scene.remove(this.directional);
    scene.remove(this.directional.target);
    scene.remove(this.ambient);
    if (this.sphere) {
      scene.remove(this.sphere);
    }
  }
}
