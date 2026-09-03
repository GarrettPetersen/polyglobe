import { PORT_CITY_STAFF_ROLE } from "../src/characterPortraits.js";
import { PORT_CITY_LOCATION } from "../src/portCityNavigation.js";
import { CITY_NPC_PATHS } from "./cityPainterOrder.js";
import { DOCK_STYLES } from "./citySceneRules.js";

export const CITY_DOCKLESS_LAND_START_X = CITY_NPC_PATHS[0].startX;

const FIXED_STAFF_PLACEMENTS = Object.freeze({
  [PORT_CITY_STAFF_ROLE.MERCHANT]: Object.freeze({
    destinationId: PORT_CITY_LOCATION.MARKET,
    startX: 964,
    feetY: 515,
    facingRight: false
  }),
  [PORT_CITY_STAFF_ROLE.INNKEEPER]: Object.freeze({
    destinationId: PORT_CITY_LOCATION.INN,
    startX: 1075,
    feetY: 548,
    facingRight: true
  }),
  [PORT_CITY_STAFF_ROLE.SMITH]: Object.freeze({
    destinationId: PORT_CITY_LOCATION.EQUIPMENT,
    startX: 1150,
    feetY: 510,
    facingRight: false
  })
});

export function cityPortStaffPlacements({ dockKind, fortified }) {
  validatePlacementContext(dockKind, fortified);
  const harbourMaster = dockKind === "none"
    ? Object.freeze({ startX: 905, feetY: 518, facingRight: true })
    : Object.freeze({ startX: 778, feetY: 521, facingRight: true });
  const commander = fortified
    ? Object.freeze({ startX: 1275, feetY: 550, facingRight: false })
    : dockKind === "none"
      ? Object.freeze({ startX: 1100, feetY: 518, facingRight: false })
      : Object.freeze({ startX: 880, feetY: 518, facingRight: false });
  return Object.freeze([
    Object.freeze({ role: PORT_CITY_STAFF_ROLE.HARBOUR_MASTER, destinationId: null, ...harbourMaster }),
    Object.freeze({ role: PORT_CITY_STAFF_ROLE.MERCHANT, ...FIXED_STAFF_PLACEMENTS[PORT_CITY_STAFF_ROLE.MERCHANT] }),
    Object.freeze({ role: PORT_CITY_STAFF_ROLE.INNKEEPER, ...FIXED_STAFF_PLACEMENTS[PORT_CITY_STAFF_ROLE.INNKEEPER] }),
    Object.freeze({ role: PORT_CITY_STAFF_ROLE.SMITH, ...FIXED_STAFF_PLACEMENTS[PORT_CITY_STAFF_ROLE.SMITH] }),
    Object.freeze({
      role: PORT_CITY_STAFF_ROLE.GARRISON_COMMANDER,
      destinationId: PORT_CITY_LOCATION.AUTHORITY,
      ...commander
    })
  ]);
}

export function cityGuardPlacement({ dockKind, index }) {
  validateDockKind(dockKind);
  if (!Number.isInteger(index) || index < 0 || index >= 5) {
    throw new Error(`Invalid city guard placement index: ${index}`);
  }
  const startX = (dockKind === "none" ? CITY_DOCKLESS_LAND_START_X : 704) + index * 19;
  return Object.freeze({ startX, feetY: 518 + index % 2 * 9 });
}

export function cityGuardApproachEndX({ dockKind, index }) {
  validateDockKind(dockKind);
  if (!Number.isInteger(index) || index < 0 || index >= 3) {
    throw new Error(`Invalid approaching city guard index: ${index}`);
  }
  return (dockKind === "none" ? 994 : 798) + index * 8;
}

export function citySuspiciousMerchantPlacement({ dockKind, caught }) {
  validateDockKind(dockKind);
  if (typeof caught !== "boolean") throw new Error("City merchant placement requires a caught state");
  const startX = dockKind === "none" ? 970 : 823;
  return Object.freeze({
    startX,
    endX: caught ? (dockKind === "none" ? 1070 : 975) : startX,
    feetY: dockKind === "none" ? 518 : 519
  });
}

function validatePlacementContext(dockKind, fortified) {
  validateDockKind(dockKind);
  if (typeof fortified !== "boolean") {
    throw new Error("City staff placement requires a fortification state");
  }
}

function validateDockKind(dockKind) {
  if (!DOCK_STYLES.includes(dockKind)) {
    throw new Error(`Unknown city dock kind: ${dockKind}`);
  }
}
