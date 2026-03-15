/**
 * Camera presets for different game / view styles (adventure vs strategy).
 */

import * as THREE from "three";

export type CameraPresetKind = "strategy" | "adventure" | "orbit" | "topDown";

export interface CameraPreset {
  kind: CameraPresetKind;
  /** Camera position as spherical offset from globe center: radius, phi (polar), theta (azimuth). */
  spherical: { radius: number; phi: number; theta: number };
  /** Where the camera looks (e.g. "globe" for center, "horizon" for tangent). */
  lookAt: "center" | "surface" | "horizon";
  /** Optional FOV override. */
  fov?: number;
}

/** Strategy view: higher, more top-down, see more of the globe. */
export const STRATEGY_PRESET: CameraPreset = {
  kind: "strategy",
  spherical: { radius: 4, phi: Math.PI * 0.35, theta: 0 },
  lookAt: "center",
  fov: 50,
};

/** Adventure view: closer, more over-the-shoulder, follow a region. */
export const ADVENTURE_PRESET: CameraPreset = {
  kind: "adventure",
  spherical: { radius: 1.8, phi: Math.PI * 0.4, theta: 0 },
  lookAt: "surface",
  fov: 60,
};

/** Orbit: classic orbit around center. */
export const ORBIT_PRESET: CameraPreset = {
  kind: "orbit",
  spherical: { radius: 2.5, phi: Math.PI * 0.45, theta: 0 },
  lookAt: "center",
  fov: 55,
};

/** Top-down: pole view. */
export const TOP_DOWN_PRESET: CameraPreset = {
  kind: "topDown",
  spherical: { radius: 3, phi: 0.01, theta: 0 },
  lookAt: "center",
  fov: 45,
};

const PRESETS: Record<CameraPresetKind, CameraPreset> = {
  strategy: STRATEGY_PRESET,
  adventure: ADVENTURE_PRESET,
  orbit: ORBIT_PRESET,
  topDown: TOP_DOWN_PRESET,
};

export function getPreset(kind: CameraPresetKind): CameraPreset {
  return PRESETS[kind];
}

export function applyPreset(
  camera: THREE.PerspectiveCamera,
  preset: CameraPreset,
  globeRadius: number = 1
): void {
  const { radius, phi, theta } = preset.spherical;
  const r = globeRadius * radius;
  const x = r * Math.sin(phi) * Math.sin(theta);
  const y = r * Math.cos(phi);
  const z = r * Math.sin(phi) * Math.cos(theta);
  camera.position.set(x, y, z);

  if (preset.lookAt === "center") {
    camera.lookAt(0, 0, 0);
  } else if (preset.lookAt === "surface") {
    const dir = camera.position.clone().normalize();
    const surface = dir.multiplyScalar(globeRadius * 0.98);
    camera.lookAt(surface);
  } else {
    const dir = camera.position.clone().normalize();
    camera.lookAt(dir.multiplyScalar(globeRadius * 1.5));
  }

  if (preset.fov !== undefined) {
    camera.fov = preset.fov;
    camera.updateProjectionMatrix();
  }
}
