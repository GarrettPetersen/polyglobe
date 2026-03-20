/**
 * Sky dome: background depends on camera position and sun direction.
 * - On the day side of Earth (camera in sunlight): blue sky, red at sunrise/sunset.
 * - On the night side (camera in shadow): black space.
 * Uses sun altitude and view altitude as seen from the camera, so it works
 * both from orbit and when on/near the surface. Drawn behind stars/planets.
 */

import * as THREE from "three";

const VERTEX = `
  varying vec3 vWorldPosition;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorldPosition = w.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT = `
  uniform vec3 uSunDirection;
  uniform vec3 uCameraPosition;
  varying vec3 vWorldPosition;

  void main() {
    vec3 viewDir = normalize(vWorldPosition - uCameraPosition);
    // Up from camera = direction from Earth center to camera (zenith for this observer)
    vec3 upFromCamera = length(uCameraPosition) < 0.01
      ? vec3(0.0, 1.0, 0.0)
      : normalize(uCameraPosition);
    // Sun altitude as seen from camera: > 0 = above horizon (day), < 0 = below (night)
    float sunAltitude = dot(uSunDirection, upFromCamera);
    // View altitude: 1 = zenith (away from Earth), 0 = horizon, -1 = toward Earth
    float viewAltitude = dot(viewDir, upFromCamera);

    // Gradual day -> twilight -> night over a wide band (red right on the cusp)
    // night: 1 when sun well below horizon, 0 when sun above ~-0.15
    float night = smoothstep(0.12, -0.35, sunAltitude);
    // day: 1 when sun well above horizon, 0 when sun below ~0.1
    float day = smoothstep(-0.25, 0.35, sunAltitude);
    // twilight: dominant when sunAltitude in [-0.35, 0.35], peaks near 0
    float twilight = 1.0 - night - day;

    // Night = black/dark (we're in space on the night side)
    vec3 nightColor = vec3(0.005, 0.008, 0.015);

    // Day sky: blue gradient (zenith = deeper blue, horizon = lighter)
    float horizon = smoothstep(0.0, 0.2, viewAltitude);
    vec3 zenithBlue = vec3(0.25, 0.45, 0.85);
    vec3 horizonLight = vec3(0.7, 0.85, 1.0);
    vec3 dayColor = mix(horizonLight, zenithBlue, horizon);

    // Base sky from night/day/twilight blend (no full-sky orange)
    vec3 base = night * nightColor + day * dayColor;
    float twLight = 0.25 + 0.6 * smoothstep(-0.3, 0.2, sunAltitude);
    vec3 twilightColor = mix(nightColor, dayColor, twLight);
    base += twilight * twilightColor;

    // Brilliant sunset: only when sun is actually near the horizon (not at night)
    float sunViewDot = dot(viewDir, uSunDirection);
    float sunNearHorizon = smoothstep(-0.32, -0.02, sunAltitude) * (1.0 - smoothstep(0.0, 0.28, sunAltitude));
    float towardSun = smoothstep(0.7, 0.998, sunViewDot);
    float horizonBand = 1.0 - smoothstep(-0.05, 0.4, viewAltitude);
    float sunsetZone = max(towardSun, horizonBand * 0.85) * sunNearHorizon;
    sunsetZone = pow(sunsetZone, 0.85);

    vec3 sunCore = vec3(1.0, 0.82, 0.45);
    vec3 sunsetCoral = vec3(1.0, 0.38, 0.08);
    vec3 sunsetRed = vec3(0.95, 0.2, 0.08);
    vec3 horizonPink = vec3(0.92, 0.45, 0.55);
    float inSunDir = smoothstep(0.94, 0.999, sunViewDot);
    vec3 brilliant = mix(sunsetCoral, sunCore, inSunDir);
    brilliant = mix(horizonPink, brilliant, towardSun * 0.65 + 0.35);
    brilliant = mix(brilliant, sunsetRed, (1.0 - viewAltitude) * 0.4);

    vec3 sky = mix(base, brilliant, sunsetZone);
    gl_FragColor = vec4(sky, 1.0);
  }
`;

export interface SkyDomeOptions {
  /** Radius of the dome (should be larger than starfield radius so sky is behind stars). Default 4000. */
  radius?: number;
}

/**
 * Sky dome mesh. Add to scene and call update(sunDirection, cameraPosition) each frame.
 * Sky is black when the camera is on the night side of Earth, blue/red on the day side.
 */
export function createSkyDome(options: SkyDomeOptions = {}): {
  mesh: THREE.Mesh;
  update: (sunDirection: THREE.Vector3, cameraPosition: THREE.Vector3) => void;
} {
  const radius = options.radius ?? 4000;
  const geometry = new THREE.SphereGeometry(radius, 32, 24);
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      uSunDirection: { value: new THREE.Vector3(0, 1, 0) },
      uCameraPosition: { value: new THREE.Vector3(0, 0, 0) },
    },
    side: THREE.BackSide,
    depthWrite: true,
    depthTest: true,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "SkyDome";
  mesh.frustumCulled = false;
  mesh.renderOrder = -2000;

  function update(sunDirection: THREE.Vector3, cameraPosition: THREE.Vector3): void {
    material.uniforms.uSunDirection.value.copy(sunDirection);
    material.uniforms.uCameraPosition.value.copy(cameraPosition);
  }

  return { mesh, update };
}
