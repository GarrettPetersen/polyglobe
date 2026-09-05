import {
  resolveBrowserViewportDimensions,
  responsiveLogicalViewport
} from "../src/responsiveViewport.js";
import { canvasDisplayLayout } from "../src/displayScaling.js";
import { createCitySceneRuntime } from "./main.js";
import { sceneReasonRows } from "./citySceneRules.js";
import { cityVisualizerShipOptions } from "./cityVisualizerLabels.js";
import {
  CITY_WIND_DIRECTION_OPTIONS,
  CITY_WIND_SPEED_OPTIONS
} from "./cityWind.js";
import { PORT_CITY_LOCATION } from "../src/portCityNavigation.js";

const requiredElement = (selector) => {
  const element = document.querySelector(selector);
  if (!element) throw new Error(`City visualizer is missing required element: ${selector}`);
  return element;
};

const stage = requiredElement("#stage");
const canvas = requiredElement("#scene");
const loading = requiredElement("#loading");
const citySelect = requiredElement("#city-select");
const viewportSelect = requiredElement("#viewport-select");
const shipSelect = requiredElement("#ship-select");
const approachOverride = requiredElement("#approach-override");
const leftBankCityOverride = requiredElement("#left-bank-city-override");
const dockOverride = requiredElement("#dock-override");
const fortOverride = requiredElement("#fort-override");
const mountainOverride = requiredElement("#mountain-override");
const leftTerrainOverride = requiredElement("#left-terrain-override");
const rightTerrainOverride = requiredElement("#right-terrain-override");
const windSpeedOverride = requiredElement("#wind-speed-override");
const windDirectionOverride = requiredElement("#wind-direction-override");
const bombardmentToggle = requiredElement("#bombardment-toggle");
const uninhabitedToggle = requiredElement("#uninhabited-toggle");
const resetOverrides = requiredElement("#reset-overrides");
const ruleLedger = requiredElement("#rule-ledger");
const destinationDialog = requiredElement("#destination-dialog");
const destinationTitle = requiredElement("#destination-title");
const destinationCopy = requiredElement("#destination-copy");

const destinationPresentationById = Object.freeze({
  [PORT_CITY_LOCATION.SET_SAIL]: Object.freeze({
    title: "Set Sail",
    copy: "Leave port and return to the world chart."
  }),
  [PORT_CITY_LOCATION.SHIPYARD]: Object.freeze({
    title: "Shipyard",
    copy: "Repairs, outfitting, and available hulls."
  }),
  [PORT_CITY_LOCATION.MARKET]: Object.freeze({
    title: "Market",
    copy: "Buy and sell regional cargo."
  }),
  [PORT_CITY_LOCATION.EQUIPMENT]: Object.freeze({
    title: "Smith",
    copy: "Weapons, tools, armour, and ship equipment."
  }),
  [PORT_CITY_LOCATION.INN]: Object.freeze({
    title: "Inn",
    copy: "Rumours, quests, and crew."
  }),
  [PORT_CITY_LOCATION.AUTHORITY]: Object.freeze({
    title: "Port authority",
    copy: "Permits, commissions, and garrison business."
  }),
  [PORT_CITY_LOCATION.SHIP]: Object.freeze({
    title: "Your ship",
    copy: "Ship loadout, cargo, waiting, and departure."
  }),
  [PORT_CITY_LOCATION.ILLICIT_MERCHANT]: Object.freeze({
    title: "Suspicious merchant",
    copy: "Attempt to trade through the black market."
  })
});

let runtime = null;
let cameraGesture = null;

try {
  runtime = await createCitySceneRuntime({
    canvas,
    onDestination: showDestination
  });
  prepareControls();
  resizeLogicalCanvas();
  loading.hidden = true;
} catch (error) {
  reportVisualizerError(error);
  throw error;
}

function prepareControls() {
  const catalog = runtime.getCatalog();
  citySelect.replaceChildren(...catalog.cities.map((city) => (
    option(city.id, `${city.label} — ${city.country}`)
  )));
  shipSelect.replaceChildren(...cityVisualizerShipOptions(catalog.ships).map((ship) => (
    option(ship.value, ship.label)
  )));
  setOptions(approachOverride, ["auto", "ocean", "river", "lake"]);
  setOptions(leftBankCityOverride, ["auto", "on", "off"]);
  setOptions(dockOverride, ["auto", "none", "wood", "stone"]);
  setOptions(fortOverride, ["auto", "on", "off"]);
  setOptions(mountainOverride, ["auto", "none", "left", "right", "both"]);
  setOptions(leftTerrainOverride, ["auto", "grass", "forest", "desert", "rocky"]);
  setOptions(rightTerrainOverride, ["auto", "grass", "forest", "desert", "rocky"]);
  setLabeledOptions(windSpeedOverride, CITY_WIND_SPEED_OPTIONS);
  setLabeledOptions(windDirectionOverride, CITY_WIND_DIRECTION_OPTIONS);
  resetControlValues();
  syncControlsToScene();

  citySelect.addEventListener("change", () => {
    void selectCity(citySelect.value).catch(reportVisualizerError);
  });
  viewportSelect.addEventListener("change", resizeLogicalCanvas);
  shipSelect.addEventListener("change", () => {
    void runtime.selectShip(shipSelect.value)
      .then(updateRuleLedger)
      .catch(reportVisualizerError);
  });
  for (const control of [...featureControls(), uninhabitedToggle]) {
    control.addEventListener("change", applyFeatureOverrides);
  }
  for (const control of [windSpeedOverride, windDirectionOverride]) {
    control.addEventListener("change", applyWindOverrides);
  }
  bombardmentToggle.addEventListener("change", () => {
    runtime.setBombardmentEventId(
      bombardmentToggle.checked ? "visualizer-test-bombardment" : null
    );
    updateRuleLedger();
  });
  resetOverrides.addEventListener("click", () => {
    resetControlValues();
    runtime.setBombardmentEventId(null);
    runtime.setFeatureOverrides({});
    applyWindOverrides();
  });

  new ResizeObserver(resizeLogicalCanvas).observe(stage);
  window.visualViewport?.addEventListener("resize", resizeLogicalCanvas);
  canvas.addEventListener("pointermove", handlePointerMove);
  canvas.addEventListener("pointerdown", handlePointerDown);
  canvas.addEventListener("pointerup", finishCameraGesture);
  canvas.addEventListener("pointercancel", cancelCameraGesture);
  canvas.addEventListener("pointerleave", handlePointerLeave);
  canvas.addEventListener("wheel", handleWheel, { passive: false });
}

async function selectCity(cityId) {
  resetControlValues();
  await runtime.selectCity(cityId);
  syncControlsToScene();
}

function featureControls() {
  return [
    approachOverride,
    leftBankCityOverride,
    dockOverride,
    fortOverride,
    mountainOverride,
    leftTerrainOverride,
    rightTerrainOverride
  ];
}

function resetControlValues() {
  for (const control of featureControls()) control.value = "auto";
  windSpeedOverride.value = "auto";
  windDirectionOverride.value = "auto";
  bombardmentToggle.checked = false;
  uninhabitedToggle.checked = false;
  syncSettlementControls();
}

function syncControlsToScene() {
  const presentation = runtime.getPresentationState();
  citySelect.value = presentation.city.id;
  shipSelect.value = presentation.shipSlug;
  bombardmentToggle.checked = presentation.bombardmentEventId !== null;
  uninhabitedToggle.checked = presentation.features.uninhabited;
  syncSettlementControls();
  updateRuleLedger();
}

function syncSettlementControls() {
  for (const control of [leftBankCityOverride, dockOverride, fortOverride, bombardmentToggle]) {
    control.disabled = uninhabitedToggle.checked;
  }
}

function applyFeatureOverrides() {
  const mountain = mountainOverride.value;
  runtime.setFeatureOverrides({
    uninhabited: uninhabitedToggle.checked,
    approach: autoValue(approachOverride.value),
    leftBankCity: leftBankCityOverride.value === "auto"
      ? undefined
      : leftBankCityOverride.value === "on",
    dock: autoValue(dockOverride.value),
    fortified: fortOverride.value === "auto" ? undefined : fortOverride.value === "on",
    mountainsLeft: mountain === "auto" ? undefined : mountain === "left" || mountain === "both",
    mountainsRight: mountain === "auto" ? undefined : mountain === "right" || mountain === "both",
    leftTerrain: autoValue(leftTerrainOverride.value),
    rightTerrain: autoValue(rightTerrainOverride.value)
  });
  syncSettlementControls();
  updateRuleLedger();
}

function applyWindOverrides() {
  runtime.setPreviewWind({
    speed: windSpeedOverride.value,
    direction: windDirectionOverride.value
  });
  updateRuleLedger();
}

function updateRuleLedger() {
  const { city, features, wind } = runtime.getPresentationState();
  const rows = [...sceneReasonRows(city, features), Object.freeze({
    label: "Wind",
    value: `${wind.speedLabel}, ${wind.directionLabel}`,
    reason: wind.automaticSpeed && wind.automaticDirection
      ? "production game wind field at this city's coordinates"
      : "visualizer weather override"
  })];
  ruleLedger.replaceChildren(...rows.flatMap((row) => {
    const term = document.createElement("dt");
    term.textContent = row.label;
    const detail = document.createElement("dd");
    detail.textContent = `${humanize(row.value)} — ${row.reason}`;
    return [term, detail];
  }));
}

function resizeLogicalCanvas() {
  const browserViewport = window.visualViewport;
  const dimensions = resolveBrowserViewportDimensions({
    shellWidth: stage.clientWidth,
    shellHeight: stage.clientHeight,
    windowWidth: window.innerWidth,
    windowHeight: window.innerHeight,
    visualViewportWidth: browserViewport?.width,
    visualViewportHeight: browserViewport?.height
  });
  if (!dimensions) return;
  const { width: viewportWidth, height: viewportHeight } = dimensions;
  const preset = viewportSelect.value;
  const logical = preset === "auto"
    ? responsiveLogicalViewport({ viewportWidth, viewportHeight })
    : ({
        canonical: { width: 455, height: 256 },
        wide: { width: 910, height: 256 },
        portrait: { width: 256, height: 455 },
        tall: { width: 256, height: 910 }
      })[preset];
  if (!logical) throw new Error(`Unknown city visualizer viewport: ${preset}`);
  runtime.resize(logical.width, logical.height);
  const layout = canvasDisplayLayout({
    viewportWidth,
    viewportHeight,
    canvasWidth: logical.width,
    canvasHeight: logical.height
  });
  canvas.style.left = `${layout.left}px`;
  canvas.style.top = `${layout.top}px`;
  canvas.style.width = `${layout.width}px`;
  canvas.style.height = `${layout.height}px`;
}

function handlePointerMove(event) {
  const point = canvasPoint(event);
  runtime.setPointer(point.x, point.y);
  if (cameraGesture?.pointerId !== event.pointerId) return;
  const movementX = event.clientX - cameraGesture.lastClientX;
  cameraGesture.lastClientX = event.clientX;
  cameraGesture.totalX = event.clientX - cameraGesture.startClientX;
  if (!cameraGesture.moved && Math.abs(cameraGesture.totalX) >= 4) {
    cameraGesture.moved = true;
    canvas.classList.add("is-panning");
    panByScreenPixels(-cameraGesture.totalX);
  } else if (cameraGesture.moved && movementX !== 0) {
    panByScreenPixels(-movementX);
  }
}

function handlePointerDown(event) {
  if (!event.isPrimary || event.button !== 0 || cameraGesture) return;
  cameraGesture = {
    pointerId: event.pointerId,
    pointerType: event.pointerType,
    startClientX: event.clientX,
    lastClientX: event.clientX,
    totalX: 0,
    moved: false
  };
  canvas.setPointerCapture(event.pointerId);
}

function finishCameraGesture(event) {
  if (!cameraGesture || cameraGesture.pointerId !== event.pointerId) return;
  const gesture = cameraGesture;
  cameraGesture = null;
  canvas.classList.remove("is-panning");
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  const point = canvasPoint(event);
  if (gesture.pointerType === "mouse") runtime.setPointer(point.x, point.y);
  else runtime.setPointer(null, null);
  if (!gesture.moved) runtime.activateAt(point.x, point.y);
}

function cancelCameraGesture(event) {
  if (cameraGesture?.pointerId !== event.pointerId) return;
  cameraGesture = null;
  canvas.classList.remove("is-panning");
  runtime.setPointer(null, null);
}

function handlePointerLeave() {
  if (cameraGesture) return;
  runtime.setPointer(null, null);
}

function handleWheel(event) {
  let screenDeltaX = event.deltaX;
  if (screenDeltaX === 0 && event.shiftKey) screenDeltaX = event.deltaY;
  if (screenDeltaX === 0 || (!event.shiftKey && Math.abs(screenDeltaX) < Math.abs(event.deltaY))) return;
  if (event.deltaMode === 1) screenDeltaX *= 16;
  else if (event.deltaMode === 2) screenDeltaX *= canvas.clientWidth;
  event.preventDefault();
  const maximumDelta = canvas.clientWidth * 0.25;
  panByScreenPixels(clamp(screenDeltaX, -maximumDelta, maximumDelta));
}

function panByScreenPixels(screenDeltaX) {
  if (canvas.clientWidth <= 0) throw new Error("City visualizer canvas has no display width");
  runtime.panByLogicalPixels(screenDeltaX * canvas.width / canvas.clientWidth);
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    throw new Error("City visualizer canvas has no display dimensions");
  }
  return Object.freeze({
    x: clamp((event.clientX - rect.left) / rect.width * canvas.width, 0, canvas.width),
    y: clamp((event.clientY - rect.top) / rect.height * canvas.height, 0, canvas.height)
  });
}

function showDestination({ id }) {
  const presentation = destinationPresentationById[id];
  if (!presentation) throw new Error(`Unknown city visualizer destination: ${id}`);
  destinationTitle.textContent = presentation.title;
  destinationCopy.textContent = presentation.copy;
  destinationDialog.showModal();
}

function reportVisualizerError(error) {
  console.error(error);
  loading.hidden = false;
  loading.textContent = error instanceof Error ? error.message : String(error);
}

function option(value, label) {
  const entry = document.createElement("option");
  entry.value = value;
  entry.textContent = label;
  return entry;
}

function setOptions(select, values) {
  select.replaceChildren(...values.map((value) => option(value, humanize(value))));
}

function setLabeledOptions(select, values) {
  select.replaceChildren(...values.map(({ value, label }) => option(value, label)));
}

function autoValue(value) {
  return value === "auto" ? undefined : value;
}

function humanize(value) {
  return String(value).replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}
