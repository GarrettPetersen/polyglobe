import test from "node:test";
import assert from "node:assert/strict";
import { nextChefFeastMinute, sunAltitudeAtMinute } from "./solarClock.js";

test("feasts advance to the next descending sunset and then into night across longitudes", () => {
  for (const latitudeDeg of [-40, 0, 38]) {
    for (const longitudeDeg of [-179, -9, 0, 120, 179]) {
      for (const currentMinute of [0, 700, 1400, 1440 * 200]) {
        const options = { currentMinute, latitudeDeg, longitudeDeg };
        const served = nextChefFeastMinute({ ...options, phase: "served" });
        assert.ok(served > currentMinute && served <= currentMinute + 1440);
        assert.ok(sunAltitudeAtMinute(served - 1, latitudeDeg, longitudeDeg) > 0);
        assert.ok(sunAltitudeAtMinute(served, latitudeDeg, longitudeDeg) <= 0);
        const afterwards = nextChefFeastMinute({ ...options, currentMinute: served, phase: "afterwards" });
        assert.ok(afterwards > served);
        assert.ok(sunAltitudeAtMinute(afterwards, latitudeDeg, longitudeDeg) <= -0.45);
        const tomorrow = nextChefFeastMinute({ ...options, currentMinute: served, phase: "served" });
        assert.ok(tomorrow > served + 1200);
      }
    }
  }
});

test("polar feasts use bounded local evening and midnight when there is no daily solar crossing", () => {
  for (const latitudeDeg of [-90, 90]) {
    for (const currentMinute of [1440 * 10, 1440 * 180]) {
      const served = nextChefFeastMinute({ currentMinute, latitudeDeg, longitudeDeg: 0, phase: "served" });
      const afterwards = nextChefFeastMinute({ currentMinute: served, latitudeDeg, longitudeDeg: 0, phase: "afterwards" });
      assert.equal(served % 1440, 18 * 60);
      assert.equal(afterwards % 1440, 0);
      assert.equal(afterwards - served, 6 * 60);
    }
  }
  assert.throws(() => nextChefFeastMinute({ currentMinute: 0, latitudeDeg: NaN, longitudeDeg: 0, phase: "served" }), /Solar clock/);
  assert.throws(() => nextChefFeastMinute({ currentMinute: 0, latitudeDeg: 0, longitudeDeg: 0, phase: "missing" }), /Unknown/);
});
