/**
 * Naked-eye planet positions from astronomy-engine ephemeris.
 * Positions are in the same J2000 equatorial frame as the starfield catalog
 * so they can be added to the starfield group and rotated by GMST together.
 */

import { Body, Illumination, type IlluminationInfo } from "astronomy-engine";
import * as THREE from "three";

/** Planets we draw: Mercury, Venus, Mars, Jupiter, Saturn */
export const NAKED_EYE_PLANETS: Body[] = [
  Body.Mercury,
  Body.Venus,
  Body.Mars,
  Body.Jupiter,
  Body.Saturn,
];

/** One planet's sky position and magnitude for a given date */
export interface PlanetSkyState {
  /** Unit direction in Three.js convention: Y = north celestial pole, X = vernal equinox */
  direction: THREE.Vector3;
  /** Apparent magnitude (brighter = smaller number) */
  mag: number;
}

/**
 * Geocentric vector from astronomy-engine is J2000 equatorial:
 * x = vernal equinox, y = 6h RA, z = north pole.
 * Three.js starfield uses: x = equinox, y = north pole, z = 6h RA.
 * So we map (astronomy x, y, z) -> Three (x, z, y).
 */
function gcToThreeDirection(gc: { x: number; y: number; z: number }): THREE.Vector3 {
  const len = Math.sqrt(gc.x * gc.x + gc.y * gc.y + gc.z * gc.z);
  if (len <= 0) return new THREE.Vector3(1, 0, 0);
  return new THREE.Vector3(gc.x / len, gc.z / len, gc.y / len);
}

/**
 * Get sky positions and magnitudes for the five naked-eye planets at the given date.
 * Coordinates are J2000 equatorial (same frame as star catalog) so they can be
 * placed in the starfield group and rotated by GMST with the stars.
 */
export function getPlanetSkyStates(date: Date): PlanetSkyState[] {
  const states: PlanetSkyState[] = [];
  for (const body of NAKED_EYE_PLANETS) {
    const info: IlluminationInfo = Illumination(body, date);
    const direction = gcToThreeDirection(info.gc);
    states.push({ direction, mag: info.mag });
  }
  return states;
}

const PLANET_VERTEX = `
  attribute float size;
  attribute float magnitude;
  varying float vMagnitude;
  void main() {
    vMagnitude = magnitude;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float ptSize = size * (1200.0 / -mv.z);
    gl_PointSize = max(ptSize, 3.0);
    gl_Position = projectionMatrix * mv;
  }
`;

const PLANET_FRAGMENT = `
  uniform vec3 uColor;
  uniform float uMagBrightest;
  uniform float uBrightnessScale;
  varying float vMagnitude;
  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    float soft = 1.0 - smoothstep(0.1, 0.5, dist);
    float bright = pow(2.512, uMagBrightest - vMagnitude);
    bright = clamp(bright * uBrightnessScale, 0.7, 1.0);
    float alpha = soft * bright;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

/** Slightly warm white so planets are distinguishable from stars */
const PLANET_COLOR = 0xffeedd;

/**
 * Create a Points mesh for the five planets. Add to starfield.catalogGroup so
 * they rotate with the stars. Call update(date, radius) each frame to set positions.
 */
export function createPlanetsMesh(radius: number): {
  points: THREE.Points;
  update: (date: Date) => void;
} {
  const positions = new Float32Array(NAKED_EYE_PLANETS.length * 3);
  const sizes = new Float32Array(NAKED_EYE_PLANETS.length);
  const magnitudes = new Float32Array(NAKED_EYE_PLANETS.length);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute("magnitude", new THREE.BufferAttribute(magnitudes, 1));

  let magBrightest = 10;
  const material = new THREE.ShaderMaterial({
    vertexShader: PLANET_VERTEX,
    fragmentShader: PLANET_FRAGMENT,
    uniforms: {
      uColor: { value: new THREE.Color(PLANET_COLOR) },
      uMagBrightest: { value: -2 },
      uBrightnessScale: { value: 3.0 },
    },
    transparent: true,
    depthWrite: false,
    depthTest: true,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = -999;
  points.name = "Planets";

  function update(date: Date): void {
    const states = getPlanetSkyStates(date);
    const posAttr = geometry.getAttribute("position") as THREE.BufferAttribute;
    const sizeAttr = geometry.getAttribute("size") as THREE.BufferAttribute;
    const magAttr = geometry.getAttribute("magnitude") as THREE.BufferAttribute;
    let brightest = 10;
    for (let i = 0; i < states.length; i++) {
      const s = states[i];
      const d = s.direction;
      posAttr.setXYZ(i, d.x * radius, d.y * radius, d.z * radius);
      sizeAttr.setX(i, 2.0 + (4 - Math.min(4, s.mag)) * 0.5);
      magAttr.setX(i, s.mag);
      if (s.mag < brightest) brightest = s.mag;
    }
    material.uniforms.uMagBrightest.value = brightest;
    posAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
    magAttr.needsUpdate = true;
  }

  update(new Date());
  return { points, update };
}
