/**
 * Day/night tint and simple weather / atmosphere effects.
 */

import * as THREE from "three";

export type WeatherKind = "clear" | "cloudy" | "overcast" | "fog";

export interface AtmosphereOptions {
  /** 0 = night, 0.5 = day, 1 = night. */
  timeOfDay?: number;
  weather?: WeatherKind;
  /** Scene background color (sky). */
  backgroundColor?: THREE.ColorRepresentation;
  /** Fog density (0 = no fog). */
  fogDensity?: number;
  fogColor?: THREE.ColorRepresentation;
}

export class Atmosphere {
  private scene: THREE.Scene;
  private fog: THREE.FogExp2 | null = null;
  private _timeOfDay: number = 0.5;
  private _weather: WeatherKind = "clear";

  constructor(scene: THREE.Scene, options: AtmosphereOptions = {}) {
    this.scene = scene;
    this._timeOfDay = options.timeOfDay ?? 0.5;
    this._weather = options.weather ?? "clear";
    if (options.backgroundColor !== undefined) {
      this.scene.background = new THREE.Color(options.backgroundColor);
    }
    this.apply();
  }

  setTimeOfDay(t: number): void {
    this._timeOfDay = t;
    this.apply();
  }

  setWeather(weather: WeatherKind): void {
    this._weather = weather;
    this.apply();
  }

  private apply(): void {
    const isDay = this._timeOfDay > 0.25 && this._timeOfDay < 0.75;
    const t = Math.sin(this._timeOfDay * Math.PI * 2);
    const skyBright = 0.12 + 0.35 * (isDay ? 1 : 0.15);
    const r = 0.06 + 0.2 * skyBright * (1 + t * 0.2);
    const g = 0.08 + 0.22 * skyBright * (1 + t * 0.15);
    const b = 0.14 + 0.4 * skyBright;
    this.scene.background = new THREE.Color(r, g, b);

    const fogDensity = this._weather === "fog" ? 0.02 : this._weather === "overcast" ? 0.008 : 0;
    if (fogDensity > 0) {
      if (!this.fog) {
        this.fog = new THREE.FogExp2(0xcccccc, 0.01);
        this.scene.fog = this.fog;
      }
      this.fog.density = fogDensity;
      this.fog.color.setRGB(r, g, b);
    } else if (this.fog) {
      this.scene.fog = null;
      this.fog = null;
    }
  }

  get timeOfDay(): number {
    return this._timeOfDay;
  }
  get weather(): WeatherKind {
    return this._weather;
  }
}
