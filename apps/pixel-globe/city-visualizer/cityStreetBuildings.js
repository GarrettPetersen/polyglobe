import { PORT_SCENE_DEPTH, PORT_SCENE_MASTER } from "./citySceneRules.js";
import {
  cityBuildingLogicalLayer,
  cityRegionalBuildingFrame
} from "./cityRegionalBuildings.js";

export const CITY_STREET_BUILDING_FOUNDATION_SOURCE_HEIGHT = 12;
export const CITY_STREET_CHURCH_FOUNDATION_SOURCE_HEIGHT = 36;

export const CITY_STREET_BUILDING_SLOTS = Object.freeze([
  buildingSlot({
    id: "rear-west",
    centerX: 921.5,
    groundY: 475,
    z: 24.5,
    depth: PORT_SCENE_DEPTH.rearBuildings
  }),
  buildingSlot({
    id: "rear-center",
    centerX: 1069.5,
    groundY: 476,
    z: 40,
    depth: PORT_SCENE_DEPTH.rearBuildings
  }),
  buildingSlot({
    id: "rear-east",
    centerX: 1203.5,
    groundY: 473,
    z: 40,
    depth: PORT_SCENE_DEPTH.rearBuildings
  }),
  buildingSlot({
    id: "business-east",
    centerX: 1153,
    groundY: 488,
    z: 45,
    depth: PORT_SCENE_DEPTH.businesses
  }),
  buildingSlot({
    id: "foreground-east",
    centerX: 1121.5,
    groundY: 562,
    z: 65,
    depth: PORT_SCENE_DEPTH.foreground
  })
]);

const FIXED_GATEHOUSE_LAYERS = new Set(["Far Castle", "Gate", "Near Castle"]);

export function defaultCityStreetBuildingAssignments(features) {
  if (!features || typeof features !== "object") {
    throw new Error("City street building assignments require scene features");
  }
  const housing = [
    Object.freeze({ slotId: "rear-center", layerName: "Home 2" }),
    Object.freeze({ slotId: "rear-east", layerName: "Home" })
  ];
  if (!features.primitiveSettlement || features.settlementStage === "colony") return Object.freeze(housing);
  return Object.freeze([
    ...housing,
    Object.freeze({ slotId: "business-east", layerName: "Home" }),
    Object.freeze({ slotId: "foreground-east", layerName: "Home 2" })
  ]);
}

export function cityStreetBuildingPlacements({
  features,
  frames,
  assignments,
  buildingStyle,
  cityType = buildingStyle || "northern-european"
}) {
  if (!Array.isArray(frames)) throw new Error("City street buildings require atlas frames");
  if (features?.settlementStage === "uninhabited") return Object.freeze([]);
  const resolvedAssignments = assignments || defaultCityStreetBuildingAssignments(features);
  if (!Array.isArray(resolvedAssignments)) {
    throw new Error("City street building assignments must be an array");
  }
  const frameByLayer = new Map(frames.map((frame) => [frame.layer, frame]));
  const slotById = new Map(CITY_STREET_BUILDING_SLOTS.map((slot) => [slot.id, slot]));
  const occupiedSlots = new Set();
  return Object.freeze(resolvedAssignments.map(({ slotId, layerName }) => {
    const slot = slotById.get(slotId);
    if (!slot) throw new Error(`Unknown city street building slot: ${slotId}`);
    if (occupiedSlots.has(slotId)) throw new Error(`City street building slot is occupied: ${slotId}`);
    occupiedSlots.add(slotId);
    if (FIXED_GATEHOUSE_LAYERS.has(layerName)) {
      throw new Error(`${layerName} is fixed at the street terminus and cannot occupy a building slot`);
    }
    const frame = cityRegionalBuildingFrame(frames, cityType, layerName) || frameByLayer.get(layerName);
    requireBuildingFrame(frame, layerName);
    return placeCityStreetBuilding(slot, frame, layerName);
  }));
}

export function placeCityStreetBuilding(slot, frame, logicalLayerName = cityBuildingLogicalLayer(frame)) {
  requireBuildingSlot(slot);
  requireBuildingFrame(frame, logicalLayerName);
  const foundationHeight = logicalLayerName === "Church"
    ? CITY_STREET_CHURCH_FOUNDATION_SOURCE_HEIGHT
    : CITY_STREET_BUILDING_FOUNDATION_SOURCE_HEIGHT;
  const x = Math.round(slot.centerX - frame.frame.w / 2);
  const y = slot.groundY - (frame.frame.h - foundationHeight);
  if (x < 0 || x + frame.frame.w > PORT_SCENE_MASTER.width || y < 0) {
    throw new Error(`${frame.layer} does not fit city street slot ${slot.id}`);
  }
  return Object.freeze({
    id: `${slot.id}|${logicalLayerName}`,
    slotId: slot.id,
    layerName: logicalLayerName,
    frame,
    x,
    y,
    width: frame.frame.w,
    height: frame.frame.h,
    foundationHeight,
    wallBottomY: slot.groundY,
    bottomY: slot.groundY + foundationHeight,
    z: slot.z,
    depth: slot.depth,
    parallaxAnchor: slot.parallaxAnchor
  });
}

function buildingSlot({ id, centerX, groundY, z, depth }) {
  const slot = { id, centerX, groundY, z, depth, parallaxAnchor: 1 };
  requireBuildingSlot(slot);
  return Object.freeze(slot);
}

function requireBuildingSlot(slot) {
  if (
    !slot ||
    typeof slot.id !== "string" ||
    slot.id === "" ||
    ![slot.centerX, slot.groundY, slot.z, slot.depth, slot.parallaxAnchor].every(Number.isFinite) ||
    slot.depth < 0 ||
    slot.depth > 1 ||
    slot.parallaxAnchor < -1 ||
    slot.parallaxAnchor > 1
  ) {
    throw new Error("Invalid city street building slot");
  }
}

function requireBuildingFrame(frame, layerName) {
  if (
    !frame ||
    cityBuildingLogicalLayer(frame) !== layerName ||
    !Number.isInteger(frame.frame?.w) ||
    frame.frame.w <= 0 ||
    !Number.isInteger(frame.frame?.h) ||
    frame.frame.h <= 0
  ) {
    throw new Error(`Missing city street building frame: ${layerName}`);
  }
}
