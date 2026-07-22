import { LANGUAGE_ENGLISH, translate } from "./localization.js";

export const STATUS_HUD_TOOLTIP_DATE = "date";
export const STATUS_HUD_TOOLTIP_DOUBLOONS = "doubloons";
export const STATUS_HUD_TOOLTIP_WATER = "water";
export const STATUS_HUD_TOOLTIP_FOOD = "food";
export const STATUS_HUD_TOOLTIP_CREW = "crew";
export const STATUS_HUD_TOOLTIP_CARGO = "cargo";

const STATUS_ROW_HEIGHT = 10;
const STATUS_TITLE_HEIGHT = 13;
const STATUS_CREW_TOP = 33;
const STATUS_CARGO_TOP = 43;

export function statusHudTooltipTargets({ x, y, width, height, titleSplitX = x + 72 }) {
  if (![x, y, width, height, titleSplitX].every(Number.isFinite) || width <= 0 || height <= 0) {
    throw new Error("Status HUD tooltip targets require valid panel geometry");
  }
  if (titleSplitX <= x || titleSplitX >= x + width) {
    throw new Error(`Status HUD title split is outside the panel: ${titleSplitX}`);
  }
  return Object.freeze([
    target(STATUS_HUD_TOOLTIP_DATE, x, y, titleSplitX - x, STATUS_TITLE_HEIGHT),
    target(STATUS_HUD_TOOLTIP_DOUBLOONS, titleSplitX, y, x + width - titleSplitX, STATUS_TITLE_HEIGHT),
    target(STATUS_HUD_TOOLTIP_WATER, x, y + 13, width, STATUS_ROW_HEIGHT),
    target(STATUS_HUD_TOOLTIP_FOOD, x, y + 23, width, STATUS_ROW_HEIGHT),
    target(STATUS_HUD_TOOLTIP_CREW, x, y + STATUS_CREW_TOP, width, STATUS_ROW_HEIGHT),
    target(STATUS_HUD_TOOLTIP_CARGO, x, y + STATUS_CARGO_TOP, width, height - STATUS_CARGO_TOP)
  ]);
}

export function statusHudTooltipTargetAtPoint(point, geometry) {
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return null;
  return statusHudTooltipTargets(geometry).find(({ rect }) => (
    point.x >= rect.x && point.x < rect.x + rect.w &&
    point.y >= rect.y && point.y < rect.y + rect.h
  )) || null;
}

export function statusHudTooltipText(language = LANGUAGE_ENGLISH, id, values) {
  if (!values || typeof values !== "object") throw new Error("Status HUD tooltip requires values");
  if (id === STATUS_HUD_TOOLTIP_DATE) {
    return translate(language, "hud.tooltip.localDate", { date: values.date });
  }
  if (id === STATUS_HUD_TOOLTIP_DOUBLOONS) {
    return translate(language, "hud.tooltip.doubloons", { count: values.doubloons });
  }
  if (id === STATUS_HUD_TOOLTIP_WATER || id === STATUS_HUD_TOOLTIP_FOOD) {
    const days = normalizedWholeCount(values.days, `${id} days`);
    const key = `hud.tooltip.${id}Days${days === 1 ? "One" : "Many"}`;
    return translate(language, key, { days });
  }
  if (id === STATUS_HUD_TOOLTIP_CREW) {
    const crew = normalizedWholeCount(values.crew, "crew");
    const passengers = normalizedWholeCount(values.passengers, "passengers");
    const pandas = normalizedWholeCount(values.pandas ?? 0, "pandas");
    if (pandas > 1) throw new Error(`Invalid status HUD panda count: ${pandas}`);
    const crewLabel = translate(language, `hud.tooltip.crewCount${crew === 1 ? "One" : "Many"}`, { count: crew });
    if (passengers === 0 && pandas === 0) {
      return translate(language, "hud.tooltip.aboardCrew", { crew: crewLabel });
    }
    if (passengers === 0) {
      return translate(language, "hud.tooltip.aboardCrewPanda", { crew: crewLabel });
    }
    const passengerLabel = translate(
      language,
      `hud.tooltip.passengerCount${passengers === 1 ? "One" : "Many"}`,
      { count: passengers }
    );
    return translate(language, pandas === 0
      ? "hud.tooltip.aboardCrewPassengers"
      : "hud.tooltip.aboardCrewPassengersPanda", {
      crew: crewLabel,
      passengers: passengerLabel
    });
  }
  if (id === STATUS_HUD_TOOLTIP_CARGO) {
    const used = normalizedWholeCount(values.used, "cargo used");
    const capacity = normalizedWholeCount(values.capacity, "cargo capacity");
    if (used > capacity) throw new Error(`Invalid status HUD cargo: ${used}/${capacity}`);
    return `${translate(language, "ship.cargoHold")}: ${used}/${capacity}`;
  }
  throw new Error(`Unknown status HUD tooltip: ${id}`);
}

function target(id, x, y, w, h) {
  return Object.freeze({ id, rect: Object.freeze({ x, y, w, h }) });
}

function normalizedWholeCount(value, label) {
  if (!Number.isFinite(value) || value < 0) throw new Error(`Invalid status HUD ${label}: ${value}`);
  return Math.round(value);
}
