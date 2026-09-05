import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  CITY_COLONIST_COUNT, CITY_COLONIST_LANDING_DURATION_MS,
  createCityColonistRoster, cityColonistLandingFrame, cityColonistScreenPoint
} from "./cityColonistLanding.js";

const catalog = JSON.parse(await readFile(new URL("./data/cities.json", import.meta.url)));
const people = JSON.parse(await readFile(new URL("./assets/minifolks/manifest.json", import.meta.url)));
const appearanceById = new Map(people.appearances.map((entry) => [entry.id, entry]));

test("all city cultures have deterministic civilian landing rosters with real jump, walk and idle frames", () => {
  for (const city of catalog.cities) {
    const roster = createCityColonistRoster(city);
    assert.deepEqual(roster, createCityColonistRoster(city));
    assert.equal(new Set(roster.map(({ id }) => id)).size, CITY_COLONIST_COUNT);
    for (const { appearanceId } of roster) {
      const appearance = appearanceById.get(appearanceId);
      for (const animation of ["jump", "walk", "idle"]) {
        assert.ok(appearance.animations[animation].length > 0, `${city.id}:${appearanceId}:${animation}`);
      }
    }
  }
});

test("colonists jump and splash, wade as a group, then all reach land before dialogue completion", () => {
  const roster = createCityColonistRoster(catalog.cities[0]);
  const phases = new Set();
  const splashed = new Set();
  let maximumWaders = 0;
  for (let elapsedMs = 0; elapsedMs <= CITY_COLONIST_LANDING_DURATION_MS + 100; elapsedMs += 10) {
    const frame = cityColonistLandingFrame(roster, elapsedMs);
    maximumWaders = Math.max(maximumWaders, frame.units.filter(({ inWater }) => inWater).length);
    for (const unit of frame.units) {
      phases.add(unit.phase);
      if (unit.splashAgeMs !== null) splashed.add(unit.id);
      assert.equal(unit.inWater, unit.phase === "wade");
      assert.ok(unit.animationStartedAtMs <= elapsedMs);
      if (frame.complete) assert.equal(unit.phase, "ashore");
    }
  }
  assert.deepEqual(phases, new Set(["jump", "aboard", "wade", "walk", "ashore"]));
  assert.equal(splashed.size, CITY_COLONIST_COUNT);
  assert.ok(maximumWaders >= 6, "the expedition wades together instead of one person at a time");
  assert.equal(cityColonistLandingFrame(roster, CITY_COLONIST_LANDING_DURATION_MS - 1).complete, false);
  assert.equal(cityColonistLandingFrame(roster, CITY_COLONIST_LANDING_DURATION_MS).complete, true);
  assert.equal(cityColonistLandingFrame(roster, 60_000).complete, true, "delayed frames finish safely");
  assert.throws(() => cityColonistLandingFrame(roster, NaN), /time/);
  assert.throws(() => cityColonistLandingFrame(roster, -1), /time/);
  assert.throws(() => cityColonistLandingFrame(roster.map((actor) => ({ ...actor, departureMs: NaN })), 0),
    /landing actor/);
});

test("landing motion is continuous through jump, wade and shore transitions", () => {
  const roster = createCityColonistRoster(catalog.cities[0]);
  const geometry = { deck: { x: 100, y: 120 }, water: { x: 145, y: 150 },
    beach: { x: 181, y: 150 }, assembly: { x: 245, y: 150 } };
  const previous = new Map();
  for (let elapsedMs = 0; elapsedMs <= CITY_COLONIST_LANDING_DURATION_MS; elapsedMs += 10) {
    for (const unit of cityColonistLandingFrame(roster, elapsedMs).units) {
      const point = cityColonistScreenPoint(unit, geometry);
      const prior = previous.get(unit.id);
      if (prior) assert.ok(Math.hypot(point.x - prior.x, point.y - prior.y) <= 3, unit.id);
      previous.set(unit.id, point);
    }
  }
  for (const point of previous.values()) assert.deepEqual(point, geometry.assembly);
});
