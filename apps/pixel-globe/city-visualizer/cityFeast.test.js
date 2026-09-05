import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  CITY_FEAST_GATHER_DURATION_MS, CITY_FEAST_TABLE, CITY_FEAST_TABLE_Z, CITY_FEAST_SHADOW_Z,
  cityFeastFrames, createCityFeastGuests, cityFeastGuestPose, cityFeastDishes
} from "./cityFeast.js";

const manifest = JSON.parse(readFileSync(new URL("./assets/port-parallax/manifest.json", import.meta.url)));
const catalog = JSON.parse(readFileSync(new URL("./data/cities.json", import.meta.url)));


test("authored feast layers share their table/shadow alignment", () => {
  const frames = cityFeastFrames(manifest);
  assert.equal(frames.Table.frame.w, CITY_FEAST_TABLE.width);
  assert.equal(frames.Table.frame.h, CITY_FEAST_TABLE.feetY - CITY_FEAST_TABLE.y);
  assert.equal(frames["Table shadow"].spriteSourceSize.y + frames["Table shadow"].frame.h,
    frames.Table.spriteSourceSize.y + frames.Table.frame.h);
  assert.throws(() => cityFeastFrames({ staticFrames: [] }), /exactly one/);
  assert.throws(() => cityFeastFrames({ staticFrames: [...manifest.staticFrames, frames.Table] }), /exactly one/);
});

test("all plates are provisioned at sunset and completely cleared afterwards", () => {
  const served = cityFeastDishes("served");
  const clear = cityFeastDishes("afterwards");
  assert.equal(served.filter(({ layer }) => layer === "Plate").length, 12);
  assert.equal(served.filter(({ layer }) => layer === "Serving Platter").length, 3);
  assert.deepEqual(new Set(served.flatMap(({ foods }) => foods.map(({ id }) => id))),
    new Set(["hardtack", "fish", "meat", "grain", "rice"]));
  assert.deepEqual(clear, served.map((dish) => ({ ...dish, foods: [] })));
  assert.throws(() => cityFeastDishes("missing"), /Unknown/);
});

test("regional guests gather on both sides without crossing the table or its painter band", () => {
  for (const city of catalog.cities) {
    const guests = createCityFeastGuests(city);
    assert.equal(guests.length, 12);
    assert.equal(new Set(guests.map(({ id }) => id)).size, 12);
    for (let elapsedMs = 0; elapsedMs <= CITY_FEAST_GATHER_DURATION_MS; elapsedMs += 250) {
      for (const guest of guests) {
        for (const phase of ["served", "afterwards"]) {
          const pose = cityFeastGuestPose(guest, phase, elapsedMs);
          assert.equal(pose.feetY, guest.feetY);
          assert.ok(pose.painterZ > CITY_FEAST_SHADOW_Z);
          assert.equal(pose.painterZ < CITY_FEAST_TABLE_Z, guest.index < 6);
          assert.ok(guest.feetY > 505 && guest.feetY < 569,
            `${city.id}: guests must remain on the street between stall rows`);
        }
      }
    }
    for (const guest of guests) {
      const pose = cityFeastGuestPose(guest, "served", CITY_FEAST_GATHER_DURATION_MS);
      assert.equal(pose.startX, guest.targetX);
      assert.equal(pose.animationId, "idle");
    }
  }
});

test("the feast stays on the street between the two stall rows", () => {
  const stalls = manifest.staticFrames.filter(({ layer }) => layer.startsWith("Market Stall"));
  const rearStalls = stalls.filter(({ spriteSourceSize }) => spriteSourceSize.y < 510);
  const frontStalls = stalls.filter(({ spriteSourceSize }) => spriteSourceSize.y >= 510);
  assert.ok(rearStalls.length > 0 && frontStalls.length > 0);
  assert.ok(CITY_FEAST_TABLE.y >= Math.max(...rearStalls.map(({ spriteSourceSize: r }) => r.y + r.h)));
  assert.ok(CITY_FEAST_TABLE.feetY < Math.min(...frontStalls.map(({ spriteSourceSize: r }) => r.y + r.h)));
  assert.ok(CITY_FEAST_TABLE.x >= Math.min(...frontStalls.map(({ spriteSourceSize: r }) => r.x)));
  assert.ok(CITY_FEAST_SHADOW_Z < CITY_FEAST_TABLE_Z);
});
