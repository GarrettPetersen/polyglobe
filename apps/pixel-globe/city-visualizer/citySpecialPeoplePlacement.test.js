import assert from "node:assert/strict";
import test from "node:test";
import { PORT_CITY_STAFF_ROLE } from "../src/characterPortraits.js";
import {
  CITY_DOCKLESS_LAND_START_X,
  cityGuardApproachEndX,
  cityGuardPlacement,
  cityPortStaffPlacements,
  citySuspiciousMerchantPlacement
} from "./citySpecialPeoplePlacement.js";

test("dockless city staff and dock events stay on the authored landward road", () => {
  for (const fortified of [false, true]) {
    const staff = cityPortStaffPlacements({ dockKind: "none", fortified });
    const harbourMaster = staff.find(({ role }) => role === PORT_CITY_STAFF_ROLE.HARBOUR_MASTER);
    assert.ok(harbourMaster.startX >= CITY_DOCKLESS_LAND_START_X);
    assert.equal(harbourMaster.feetY, 518);
  }
  for (let index = 0; index < 5; index++) {
    assert.ok(cityGuardPlacement({ dockKind: "none", index }).startX >= CITY_DOCKLESS_LAND_START_X);
  }
  for (let index = 0; index < 3; index++) {
    assert.ok(cityGuardApproachEndX({ dockKind: "none", index }) >= CITY_DOCKLESS_LAND_START_X);
  }
  const merchant = citySuspiciousMerchantPlacement({ dockKind: "none", caught: true });
  assert.ok(merchant.startX >= CITY_DOCKLESS_LAND_START_X);
  assert.ok(merchant.endX >= CITY_DOCKLESS_LAND_START_X);
  assert.equal(merchant.feetY, 518);
});

test("docked city staff retain the authored quay placements", () => {
  const staff = cityPortStaffPlacements({ dockKind: "wood", fortified: false });
  const harbourMaster = staff.find(({ role }) => role === PORT_CITY_STAFF_ROLE.HARBOUR_MASTER);
  assert.deepEqual(
    { startX: harbourMaster.startX, feetY: harbourMaster.feetY },
    { startX: 778, feetY: 521 }
  );
  assert.deepEqual(cityGuardPlacement({ dockKind: "stone", index: 2 }), {
    startX: 742,
    feetY: 518
  });
  assert.equal(cityGuardApproachEndX({ dockKind: "wood", index: 2 }), 814);
  assert.deepEqual(citySuspiciousMerchantPlacement({ dockKind: "wood", caught: false }), {
    startX: 823,
    endX: 823,
    feetY: 519
  });
});

test("special-person placement rejects unknown scene contracts", () => {
  assert.throws(
    () => cityPortStaffPlacements({ dockKind: "rope", fortified: false }),
    /Unknown city dock kind/
  );
  assert.throws(
    () => cityGuardPlacement({ dockKind: "none", index: 5 }),
    /Invalid city guard placement index/
  );
});
