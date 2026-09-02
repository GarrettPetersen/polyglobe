import assert from "node:assert/strict";
import test from "node:test";

import {
  CITY_BOMBARDMENT_DAMAGEABLE_LAYERS,
  cityBombardmentBuildingIsAffected,
  cityBombardmentDamage,
  cityBombardmentLayerIsDamageable,
  cityBombardmentSeed
} from "./cityBombardmentDamage.js";

function rectangularAlpha(width, height, inset = 2) {
  const alpha = new Uint8Array(width * height);
  for (let y = inset; y < height - inset; y += 1) {
    for (let x = inset; x < width - inset; x += 1) alpha[y * width + x] = 255;
  }
  return alpha;
}

test("bombardment identity uses the city, stable building slot, and event", () => {
  const seed = cityBombardmentSeed({
    cityId: "lisbon|portugal",
    buildingId: "authored|inn|0",
    eventId: "disabled-until:41760"
  });
  assert.equal(seed, cityBombardmentSeed({
    cityId: "lisbon|portugal",
    buildingId: "authored|inn|0",
    eventId: "disabled-until:41760"
  }));
  assert.notEqual(seed, cityBombardmentSeed({
    cityId: "lisbon|portugal",
    buildingId: "authored|smith|0",
    eventId: "disabled-until:41760"
  }));
  assert.throws(
    () => cityBombardmentSeed({ cityId: "", buildingId: "inn", eventId: "event" }),
    /cityId/
  );
});

test("damage removes one connected rough bite from a real opaque edge", () => {
  const width = 48;
  const height = 40;
  const alpha = rectangularAlpha(width, height);
  const damage = cityBombardmentDamage({ alpha, width, height, seed: 917 });
  const removed = [...damage.hole.keys()].filter((index) => damage.hole[index] !== 0);
  assert.ok(removed.length >= 20);
  assert.ok(removed.every((index) => alpha[index] > 16));
  assert.equal(maskIsConnected(damage.hole, width, removed[0]), true);
  assert.equal(holeTouchesOpaqueSilhouetteEdge(damage, alpha, width, height), true);
  assert.ok(damage.rim.some((value) => value !== 0));

  const runDepths = transverseRunDepths(damage.hole, width, height, damage.edge);
  assert.ok(new Set(runDepths).size >= 3, "blast bite should have an irregular profile");
  for (let index = 1; index < runDepths.length; index += 1) {
    assert.ok(Math.abs(runDepths[index] - runDepths[index - 1]) <= 5);
  }
});

test("damage is deterministic and chooses the alternate substantial edge when required", () => {
  const width = 42;
  const height = 36;
  const alpha = rectangularAlpha(width, height, 3);
  const first = cityBombardmentDamage({ alpha, width, height, seed: 101 });
  const second = cityBombardmentDamage({ alpha, width, height, seed: 101 });
  assert.deepEqual(first.hole, second.hole);
  assert.deepEqual(first.rim, second.rim);
  assert.deepEqual(first.holeBounds, second.holeBounds);
});

test("foreground building families are explicit and background damage density is bounded", () => {
  for (const layer of CITY_BOMBARDMENT_DAMAGEABLE_LAYERS) {
    assert.equal(cityBombardmentLayerIsDamageable(layer), true, layer);
  }
  assert.equal(cityBombardmentLayerIsDamageable("Ocean"), false);
  assert.equal(cityBombardmentLayerIsDamageable("Dock"), false);
  assert.throws(() => cityBombardmentLayerIsDamageable(""), /building layer/);
  assert.equal(typeof cityBombardmentBuildingIsAffected(10, 0.42), "boolean");
  assert.throws(() => cityBombardmentBuildingIsAffected(10, 0), /density/);
});

function maskIsConnected(mask, width, firstIndex) {
  const visited = new Set([firstIndex]);
  const pending = [firstIndex];
  while (pending.length > 0) {
    const index = pending.pop();
    const x = index % width;
    const candidates = [index - width, index + width];
    if (x > 0) candidates.push(index - 1);
    if (x < width - 1) candidates.push(index + 1);
    for (const candidate of candidates) {
      if (candidate < 0 || candidate >= mask.length || mask[candidate] === 0 || visited.has(candidate)) {
        continue;
      }
      visited.add(candidate);
      pending.push(candidate);
    }
  }
  return visited.size === mask.reduce((sum, value) => sum + (value === 0 ? 0 : 1), 0);
}

function holeTouchesOpaqueSilhouetteEdge(damage, alpha, width, height) {
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (damage.hole[index] === 0) continue;
      if (damage.edge === "left") {
        const opaqueBefore = alpha.slice(y * width, index).some((value) => value > 16);
        if (!opaqueBefore) return true;
      } else {
        let opaqueAbove = false;
        for (let sampleY = 0; sampleY < y; sampleY += 1) {
          if (alpha[sampleY * width + x] > 16) opaqueAbove = true;
        }
        if (!opaqueAbove) return true;
      }
    }
  }
  return false;
}

function transverseRunDepths(mask, width, height, edge) {
  const depths = [];
  const transverseLength = edge === "left" ? height : width;
  for (let transverse = 0; transverse < transverseLength; transverse += 1) {
    let count = 0;
    const inwardLength = edge === "left" ? width : height;
    for (let inward = 0; inward < inwardLength; inward += 1) {
      const x = edge === "left" ? inward : transverse;
      const y = edge === "left" ? transverse : inward;
      if (mask[y * width + x] !== 0) count += 1;
    }
    if (count > 0) depths.push(count);
  }
  return depths;
}
