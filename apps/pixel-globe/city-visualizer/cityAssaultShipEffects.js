import { SHIP_WATERLINE_LEVEL } from "../src/shipWaterline.js";
import { createShipSinkEffect, shipSinkFrame, shipSinkPose, shipSinkSubmersionTimeMs } from "../src/shipSinking.js";
import { createHullSplinterBurst, hullSplinterPixels } from "../src/hullSplinters.js";

export function createCityAssaultShipEffects(pixels, width, height) {
  // Keep attachment points on actual above-water surface pixels, across the hull.
  const surfaces = pixels.filter(pixel => pixel.sinkHeight > SHIP_WATERLINE_LEVEL && pixel.sinkHeight < 0.85);
  if (surfaces.length === 0) throw new Error("Dockside ship has no above-water fire attachment pixels");
  let minX = width;
  let maxX = 0;
  for (const pixel of surfaces) { minX = Math.min(minX, pixel.x); maxX = Math.max(maxX, pixel.x); }
  const anchors = [0.2, 0.5, 0.8].map(fraction => {
    const x = minX + (maxX - minX) * fraction;
    const score = pixel => Math.abs(pixel.x - x) + Math.abs(pixel.sinkHeight - (SHIP_WATERLINE_LEVEL + 0.1)) * width;
    return surfaces.reduce((best, pixel) => score(pixel) < score(best) ||
      (score(pixel) === score(best) && pixel.y > best.y) ? pixel : best);
  });
  return { pixels, width, height, anchors, sink: null };
}

export function cityAssaultShipEffectsFrame(model, presentation) {
  const timeMs = presentation.elapsedMs;
  const sinking = presentation.shipHitPoints === 0;
  if (sinking && !Number.isFinite(presentation.shipSunkAtMs)) throw new Error("Sinking assault ship needs its fatal hit time");
  if (sinking && model.sink?.startedAtMs !== presentation.shipSunkAtMs) {
    model.sink = createShipSinkEffect({ id: "assault-ship", pixels: model.pixels,
      frameSize: Math.max(model.width, model.height), originX: 0, originY: 0,
      startedAtMs: presentation.shipSunkAtMs, seed: 725, breakApart: false });
  }
  const sink = sinking ? shipSinkFrame(model.sink, timeMs) : null;
  const pose = sinking ? shipSinkPose(model.sink, timeMs) : { sinkOffset: 0 };
  const fires = [];
  const smoke = [];
  if (presentation.shipHitPoints / presentation.shipMaxHitPoints <= 0.3) {
    for (let index = 0; index < model.anchors.length; index++) {
      const anchor = model.anchors[index];
      const extinguishedAt = sinking ? shipSinkSubmersionTimeMs(model.sink, anchor.sinkHeight) : Infinity;
      if (timeMs < extinguishedAt) fires.push({ ...anchor, y: anchor.y + pose.sinkOffset, seed: index + 73 });
      else if (timeMs - extinguishedAt < 1000) {
        const extinctPose = shipSinkPose(model.sink, extinguishedAt);
        smoke.push({ x: anchor.x, y: anchor.y + extinctPose.sinkOffset, age: (timeMs - extinguishedAt) / 1000 });
      }
    }
  }
  const splinters = [];
  for (const event of presentation.events) {
    if (event.type !== "ship-hit") continue;
    const seed = event.timeMs + [...event.unitId].reduce((n, char) => n + char.charCodeAt(0), 0);
    const anchor = model.anchors[seed % model.anchors.length];
    const burst = createHullSplinterBurst({ kind: "cannon", seed, damage: event.damage,
      startX: anchor.x + 10, startY: anchor.y, targetX: anchor.x, targetY: anchor.y }, anchor);
    burst.age = (timeMs - event.timeMs) / 1000;
    for (const pixel of hullSplinterPixels(burst)) splinters.push({ ...pixel, color: anchor.color });
  }
  return { sink, fires, smoke, splinters };
}

export function cityAssaultEscapeUrgency(presentation, reducedMotion = false) {
  if (!presentation || presentation.shipHitPoints <= 0 || !Number.isFinite(presentation.lastShipHitAtMs)) return { scale: 1, flash: false };
  const ageMs = presentation.elapsedMs - presentation.lastShipHitAtMs;
  if (ageMs < 0 || ageMs > 2500) return { scale: 1, flash: false };
  return { scale: reducedMotion ? 1.15 : 1.15 + 0.1 * Math.sin(ageMs / 250),
    flash: reducedMotion || Math.floor(ageMs / 500) % 2 === 0 };
}
