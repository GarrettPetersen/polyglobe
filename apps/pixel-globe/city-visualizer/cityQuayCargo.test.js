import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createCanvas, loadImage } from "../../../examples/globe-demo/node_modules/canvas/index.js";
import {
  CITY_QUAY_CARGO_DOCK_Z,
  CITY_QUAY_CARGO_FOREGROUND_Z,
  cityQuayCargoCount,
  cityQuayCargoPlacements
} from "./cityQuayCargo.js";
import { CITY_NPC_PATHS, cityGroundPainterZ } from "./cityPainterOrder.js";

const manifest = JSON.parse(await readFile(new URL(
  "./assets/port-parallax/manifest.json",
  import.meta.url
), "utf8"));

test("quay cargo scales from a few village goods to a busy major port", () => {
  const small = sampleCity({ id: "small", population: 1200, settlementType: "village" });
  const medium = sampleCity({ id: "medium", population: 30000 });
  const major = sampleCity({ id: "major", population: 180000 });
  const services = { dock: "wood", market: true, shipyard: true };
  assert.ok(cityQuayCargoCount(small, services) <= 5);
  assert.ok(cityQuayCargoCount(small, services) < cityQuayCargoCount(medium, services));
  assert.ok(cityQuayCargoCount(medium, services) < cityQuayCargoCount(major, services));
  assert.ok(cityQuayCargoCount(major, services) >= 15);
});

test("cargo placement is deterministic and mixes barrels with crates", () => {
  const city = sampleCity({ id: "busy-quay", population: 85000 });
  const features = {
    dock: "stone",
    market: true,
    inn: true,
    store: true,
    shipyard: true,
    props: 15
  };
  const placements = cityQuayCargoPlacements({ city, features, frames: manifest.staticFrames });
  assert.deepEqual(placements, cityQuayCargoPlacements({ city, features, frames: manifest.staticFrames }));
  assert.equal(placements.length, 15);
  assert.deepEqual(new Set(placements.map(({ kind }) => kind)), new Set(["barrel", "crate"]));
  assert.ok(placements.some(({ zone }) => zone === "dock"));
  assert.ok(placements.some(({ zone }) => zone !== "dock"));
  assert.ok(placements.filter(({ zone }) => zone === "dock").every(({ z }) => z >= CITY_QUAY_CARGO_DOCK_Z));
  assert.ok(placements
    .filter(({ zone }) => ["market", "inn"].includes(zone))
    .every(({ z }) => z >= CITY_QUAY_CARGO_FOREGROUND_Z));
  for (const zone of ["dock", "market", "inn", "smith", "shipyard"]) {
    assert.ok(placements.some((placement) => placement.zone === zone), `missing ${zone} storage`);
  }
  assert.ok(placements.every(({ zone }) => zone !== "quay"), "cargo never scatters into the open street");
  assert.ok(placements
    .filter(({ zone }) => zone === "dock")
    .every(({ x, width }) => x >= 676 && x + width <= 742), "dock storage hugs its waterfront end");
  assert.ok(placements
    .filter(({ zone }) => zone === "market")
    .every(({ x, width }) => x >= 900 && x + width <= 946), "market storage forms one stack beside the stalls");
  for (const top of placements.filter(({ stackLevel }) => stackLevel === 1)) {
    const support = placements.find((placement) => (
      placement.groupId === top.groupId &&
      placement.stackLevel === 0 &&
      placement.kind === "crate" &&
      placement.x === top.x
    ));
    assert.ok(support, `flying stacked crate: ${top.id}`);
    assert.equal(top.baseY, support.y);
  }
});

test("storage clusters stay clear of every walking lane", () => {
  const placements = cityQuayCargoPlacements({
    city: sampleCity({ id: "walking-clearance", population: 180000 }),
    features: {
      dock: "stone",
      market: true,
      inn: true,
      store: true,
      shipyard: true,
      props: 18
    },
    frames: manifest.staticFrames
  }).filter(({ stackLevel }) => stackLevel === 0);
  for (const placement of placements) {
    for (const path of CITY_NPC_PATHS) {
      const horizontallyClear = placement.x + placement.width + 4 < path.startX ||
        placement.x - 4 > path.endX;
      const verticallyClear = Math.abs(placement.groundY - path.feetY) >= 12;
      assert.ok(
        horizontallyClear || verticallyClear,
        `${placement.id} blocks the ${path.startX}-${path.endX}@${path.feetY} walking lane`
      );
    }
  }
});

test("ground contact controls cargo painter order, including around trees and people", () => {
  const placements = cityQuayCargoPlacements({
    city: sampleCity({ id: "painter-order", population: 180000 }),
    features: { dock: "stone", market: true, inn: true, store: true, shipyard: true, props: 18 },
    frames: manifest.staticFrames
  });
  assert.ok(placements.every(({ groundY, z }) => z >= cityGroundPainterZ(groundY)));
  assert.ok(cityGroundPainterZ(565) < cityGroundPainterZ(575), "a foreground tree hides a walker behind it");
  assert.ok(cityGroundPainterZ(568) < cityGroundPainterZ(650), "cargo cannot paint up a nearer tree");
});

test("ports without docks place every barrel and crate on landward quay pixels", async () => {
  const city = sampleCity({
    id: "beach-village",
    population: 2400,
    settlementType: "village",
    dock: "none"
  });
  const features = { dock: "none", market: true, shipyard: false, props: 5 };
  const placements = cityQuayCargoPlacements({ city, features, frames: manifest.staticFrames });
  assert.equal(placements.length, 5);
  assert.ok(placements.every(({ zone }) => zone !== "dock"));
  assert.ok(placements.every(({ x }) => x >= 900), "undocked cargo never uses the water/dock span");

  const atlas = await loadImage(new URL("./assets/port-parallax/static.png", import.meta.url).pathname);
  const beach = manifest.staticFrames.find(({ layer }) => layer === "Sand Beach");
  const canvas = createCanvas(beach.frame.w, beach.frame.h);
  const context = canvas.getContext("2d");
  context.drawImage(
    atlas,
    beach.frame.x,
    beach.frame.y,
    beach.frame.w,
    beach.frame.h,
    0,
    0,
    beach.frame.w,
    beach.frame.h
  );
  const pixels = context.getImageData(0, 0, beach.frame.w, beach.frame.h).data;
  for (const placement of placements.filter(({ stackLevel }) => stackLevel === 0)) {
    const sceneX = placement.x + Math.floor(placement.width / 2);
    const localX = sceneX - beach.spriteSourceSize.x;
    const localY = placement.baseY - beach.spriteSourceSize.y;
    assert.ok(localX >= 0 && localX < beach.frame.w);
    assert.ok(localY >= 0 && localY < beach.frame.h);
    assert.ok(pixels[(localY * beach.frame.w + localX) * 4 + 3] > 0, placement.id);
  }
});

test("docked cargo bases are supported by both authored dock surfaces", async () => {
  const atlas = await loadImage(new URL("./assets/port-parallax/static.png", import.meta.url).pathname);
  for (const dock of ["wood", "stone"]) {
    const layer = dock === "wood" ? "Dock" : "Stone Dock";
    const dockFrame = manifest.staticFrames.find((frame) => frame.layer === layer);
    const canvas = createCanvas(dockFrame.frame.w, dockFrame.frame.h);
    const context = canvas.getContext("2d");
    context.drawImage(
      atlas,
      dockFrame.frame.x,
      dockFrame.frame.y,
      dockFrame.frame.w,
      dockFrame.frame.h,
      0,
      0,
      dockFrame.frame.w,
      dockFrame.frame.h
    );
    const pixels = context.getImageData(0, 0, dockFrame.frame.w, dockFrame.frame.h).data;
    const placements = cityQuayCargoPlacements({
      city: sampleCity({ id: `${dock}-quay`, dock }),
      features: { dock, props: 18 },
      frames: manifest.staticFrames
    }).filter(({ zone }) => zone === "dock");
    for (const placement of placements.filter(({ stackLevel }) => stackLevel === 0)) {
      const sceneX = placement.x + Math.floor(placement.width / 2);
      const localX = sceneX - dockFrame.spriteSourceSize.x;
      const localY = placement.baseY - dockFrame.spriteSourceSize.y;
      assert.ok(pixels[(localY * dockFrame.frame.w + localX) * 4 + 3] > 0, placement.id);
    }
  }
});

function sampleCity(overrides = {}) {
  return Object.freeze({
    id: "sample-port",
    settlementType: "city",
    population: 50000,
    dock: "wood",
    ...overrides
  });
}
