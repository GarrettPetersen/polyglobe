import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const weatherBakePath = join(
  appRoot,
  "..",
  "..",
  "examples/globe-demo/public/discrete-weather-bake-7.bin"
);
const SNOW_GROUND_FLAG = 8;
const DAYS = 365;

test("the production weather bake gives Norway and Alaska broad winter snow cover", async () => {
  const bake = decodeSnowDays(await readFile(weatherBakePath));
  const samples = [
    { name: "Oslo", tileId: 54977, minimumSnowDays: 90 },
    { name: "Tromso", tileId: 56334, minimumSnowDays: 180 },
    { name: "Anchorage", tileId: 48398, minimumSnowDays: 140 },
    { name: "Juneau", tileId: 41946, minimumSnowDays: 60 }
  ];

  for (const sample of samples) {
    const days = bake.snowDaysByTileId(sample.tileId);
    assert.ok(days.total >= sample.minimumSnowDays, `${sample.name}: ${days.total}`);
    assert.ok(days.january >= 20, `${sample.name} January: ${days.january}`);
    assert.equal(days.july, 0, `${sample.name} should not remain snowy through July`);
  }
});

function decodeSnowDays(buffer) {
  const bytes = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  assert.equal(String.fromCharCode(...bytes.subarray(0, 4)), "PLYW");
  const tileCount = view.getUint32(16, true);
  const packedOffset = 20 + tileCount * 4;
  assert.equal(bytes.byteLength, packedOffset + DAYS * tileCount);
  const ordinalByTileId = new Map();
  for (let ordinal = 0; ordinal < tileCount; ordinal++) {
    ordinalByTileId.set(view.getInt32(20 + ordinal * 4, true), ordinal);
  }
  return {
    snowDaysByTileId(tileId) {
      const ordinal = ordinalByTileId.get(tileId);
      assert.notEqual(ordinal, undefined, `weather bake is missing sample tile ${tileId}`);
      let total = 0;
      let january = 0;
      let july = 0;
      for (let day = 0; day < DAYS; day++) {
        if ((bytes[packedOffset + day * tileCount + ordinal] & SNOW_GROUND_FLAG) === 0) continue;
        total++;
        if (day < 31) january++;
        if (day >= 181 && day < 212) july++;
      }
      return { total, january, july };
    }
  };
}
