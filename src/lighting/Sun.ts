/**
 * Sun / directional light that can be placed at any angle (longitude/latitude or direction).
 */

import * as THREE from "three";

export interface SunOptions {
  /** Sun direction (normalized). Default: above +Y. */
  direction?: THREE.Vector3;
  /** Or set by spherical angles: longitude (radians, 0 = front), latitude (radians, 0 = equator). */
  longitude?: number;
  latitude?: number;
  /** Light color. */
  color?: THREE.ColorRepresentation;
  /** Intensity. */
  intensity?: number;
  /** Ambient light (fill). */
  ambientColor?: THREE.ColorRepresentation;
  ambientIntensity?: number;
}

export class Sun {
  readonly directional: THREE.DirectionalLight;
  readonly ambient: THREE.AmbientLight;

  constructor(options: SunOptions = {}) {
    this.directional = new THREE.DirectionalLight(
      options.color ?? 0xffffff,
      options.intensity ?? 1.8
    );
    this.ambient = new THREE.AmbientLight(
      options.ambientColor ?? 0x445570,
      options.ambientIntensity ?? 0.5
    );

    if (options.direction) {
      this.directional.position.copy(options.direction).multiplyScalar(1000);
      this.directional.target.position.set(0, 0, 0);
    } else {
      this.setAngles(
        options.longitude ?? 0,
        options.latitude ?? Math.PI * 0.35
      );
    }
  }

  /** Set sun by spherical angles (longitude, latitude in radians). */
  setAngles(longitude: number, latitude: number): void {
    const r = 1000;
    const x = r * Math.cos(latitude) * Math.sin(longitude);
    const y = r * Math.sin(latitude);
    const z = r * Math.cos(latitude) * Math.cos(longitude);
    this.directional.position.set(x, y, z);
    this.directional.target.position.set(0, 0, 0);
  }

  /** Set sun direction from a normalized vector (from planet center toward sun). */
  setDirection(direction: THREE.Vector3): void {
    this.directional.position.copy(direction).multiplyScalar(1000);
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
  }

  removeFrom(scene: THREE.Scene): void {
    scene.remove(this.directional);
    scene.remove(this.directional.target);
    scene.remove(this.ambient);
  }
}
