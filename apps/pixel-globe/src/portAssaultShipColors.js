const OCEAN_DHOW_SURFACE_COLORS = Object.freeze({
  deepHull: flatColor(46, 34, 47),
  lowerHull: flatColor(76, 62, 36),
  hull: flatColor(98, 85, 101),
  upperHull: flatColor(150, 108, 108),
  deckEdge: flatColor(76, 62, 36),
  afterDeck: flatColor(98, 85, 101),
  workingDeck: flatColor(150, 108, 108),
  foreDeck: flatColor(171, 148, 122),
  structuralWood: flatColor(76, 62, 36),
  rope: flatColor(46, 34, 47),
  sail: flatColor(199, 220, 208)
});

const BOROBUDUR_OUTRIGGER_SURFACE_COLORS = Object.freeze({
  deepHull: flatColor(46, 34, 47),
  lowerHull: flatColor(76, 62, 36),
  hull: flatColor(98, 85, 101),
  upperHull: flatColor(150, 108, 108),
  deckEdge: flatColor(98, 85, 101),
  deck: flatColor(171, 148, 122),
  bamboo: flatColor(178, 186, 144),
  structuralWood: flatColor(76, 62, 36),
  rope: flatColor(46, 34, 47),
  sail: flatColor(171, 148, 122)
});

const JOSEON_SURFACE_COLORS = Object.freeze({
  deepHull: flatColor(46, 34, 47),
  lowerHull: flatColor(76, 62, 36),
  hull: flatColor(98, 85, 101),
  upperWorks: flatColor(150, 108, 108),
  deck: flatColor(171, 148, 122),
  lightTimber: flatColor(199, 178, 141),
  structuralWood: flatColor(76, 62, 36),
  tent: flatColor(121, 105, 141),
  hardware: flatColor(67, 83, 76),
  sail: flatColor(199, 220, 208)
});

const DUGOUT_CANOE_SURFACE_COLORS = Object.freeze({
  deepHull: flatColor(46, 34, 47),
  lowerHull: flatColor(76, 62, 36),
  hull: flatColor(98, 85, 101),
  gunwale: flatColor(150, 108, 108),
  interior: flatColor(171, 148, 122)
});

const OTTOMAN_TRADER_SURFACE_COLORS = Object.freeze({
  deepHull: flatColor(46, 34, 47),
  lowerHull: flatColor(76, 62, 36),
  hull: flatColor(98, 85, 101),
  upperHull: flatColor(150, 108, 108),
  deck: flatColor(171, 148, 122),
  structuralWood: flatColor(76, 62, 36),
  rope: flatColor(46, 34, 47),
  metal: flatColor(67, 83, 76),
  accent: flatColor(121, 105, 141),
  sail: flatColor(199, 220, 208)
});

export const PORT_ASSAULT_COLOR_CLEANUP = Object.freeze({
  minimumRegionPixelsAtCityScale: 12,
  passes: 2
});

export function oceanDhowPortAssaultSurfaceColor(_sampledColor, surface, point) {
  const materialName = surface?.sourceMaterialName;
  if (typeof materialName !== "string") {
    throw new Error("Ocean Dhow dockside color requires a source material name");
  }
  if (materialName === "badan_dhow") {
    const height = oceanDhowHeightAboveWaterline(surface, point);
    if (height >= 0.14 && oceanDhowUpwardFacingSurface(surface)) {
      if (oceanDhowDeckPlankSeam(point)) return OCEAN_DHOW_SURFACE_COLORS.deckEdge;
      return oceanDhowModelZ(point) < 0.05
        ? OCEAN_DHOW_SURFACE_COLORS.afterDeck
        : OCEAN_DHOW_SURFACE_COLORS.workingDeck;
    }
    return height < 0
      ? OCEAN_DHOW_SURFACE_COLORS.deepHull
      : height < 0.07
        ? OCEAN_DHOW_SURFACE_COLORS.lowerHull
        : height < 0.15
          ? OCEAN_DHOW_SURFACE_COLORS.hull
          : OCEAN_DHOW_SURFACE_COLORS.upperHull;
  }
  if (materialName === "lantai_dhow") {
    if (oceanDhowHeightAboveWaterline(surface, point) < 0.14) {
      return OCEAN_DHOW_SURFACE_COLORS.deckEdge;
    }
    const modelZ = oceanDhowModelZ(point);
    if (oceanDhowDeckPlankSeam(point)) return OCEAN_DHOW_SURFACE_COLORS.deckEdge;
    return modelZ < 0.05
      ? OCEAN_DHOW_SURFACE_COLORS.afterDeck
      : modelZ < 0.48
        ? OCEAN_DHOW_SURFACE_COLORS.workingDeck
        : OCEAN_DHOW_SURFACE_COLORS.foreDeck;
  }
  if (materialName === "worn_wood_dhow") return OCEAN_DHOW_SURFACE_COLORS.structuralWood;
  if (materialName === "rope.002") return OCEAN_DHOW_SURFACE_COLORS.rope;
  if (
    materialName === "layar_dhow" ||
    materialName === "procedural-furled-sail-cloth"
  ) return OCEAN_DHOW_SURFACE_COLORS.sail;
  throw new Error(`Unmapped Ocean Dhow dockside material: ${materialName}`);
}

export function borobudurOutriggerPortAssaultSurfaceColor(_sampledColor, surface, point) {
  const materialName = surface?.sourceMaterialName;
  if (typeof materialName !== "string") {
    throw new Error("Nusantaran Outrigger dockside color requires a source material name");
  }
  if (materialName === "cabin_cadik") {
    const height = heightAboveWaterline(surface, point, "Nusantaran Outrigger");
    return height < 0
      ? BOROBUDUR_OUTRIGGER_SURFACE_COLORS.deepHull
      : height < 0.08
        ? BOROBUDUR_OUTRIGGER_SURFACE_COLORS.lowerHull
        : height < 0.2
          ? BOROBUDUR_OUTRIGGER_SURFACE_COLORS.hull
          : BOROBUDUR_OUTRIGGER_SURFACE_COLORS.upperHull;
  }
  if (materialName === "lantai_cadik") {
    return heightAboveWaterline(surface, point, "Nusantaran Outrigger") < 0.18
      ? BOROBUDUR_OUTRIGGER_SURFACE_COLORS.deckEdge
      : BOROBUDUR_OUTRIGGER_SURFACE_COLORS.deck;
  }
  if (materialName === "bamboo_wall") return BOROBUDUR_OUTRIGGER_SURFACE_COLORS.bamboo;
  if (
    materialName === "worn_wood_cadik" ||
    materialName === "Kayu_gantung_Layar_cadik"
  ) return BOROBUDUR_OUTRIGGER_SURFACE_COLORS.structuralWood;
  if (materialName === "rope.003") return BOROBUDUR_OUTRIGGER_SURFACE_COLORS.rope;
  if (
    materialName === "Layar_cadik" ||
    materialName === "procedural-furled-sail-cloth"
  ) return BOROBUDUR_OUTRIGGER_SURFACE_COLORS.sail;
  throw new Error(`Unmapped Nusantaran Outrigger dockside material: ${materialName}`);
}

export function joseonPortAssaultSurfaceColor(sampledColor, surface) {
  if (surface?.sourceMaterialName == null) {
    return requiredSampledColor(sampledColor, "Joseon procedural geometry");
  }
  const materialName = requiredMaterialName(surface, "Joseon dockside");
  if (materialName === "bottom") return JOSEON_SURFACE_COLORS.deck;
  if (materialName === "wood_bottom") return JOSEON_SURFACE_COLORS.lowerHull;
  if (materialName === "wood_dark" || materialName === "wood_frame") {
    return JOSEON_SURFACE_COLORS.deepHull;
  }
  if (materialName === "wood_middle") return JOSEON_SURFACE_COLORS.hull;
  if (materialName === "wood_wall" || materialName === "shield") {
    return JOSEON_SURFACE_COLORS.upperWorks;
  }
  if (materialName === "wood_light") return JOSEON_SURFACE_COLORS.deck;
  if (materialName === "wood_window") return JOSEON_SURFACE_COLORS.deepHull;
  if (materialName === "tent") return JOSEON_SURFACE_COLORS.tent;
  if (materialName === "door_handle" || materialName === "Material.001") {
    return JOSEON_SURFACE_COLORS.hardware;
  }
  if (materialName === "Material.002") return JOSEON_SURFACE_COLORS.lightTimber;
  if (materialName === "paddle") return JOSEON_SURFACE_COLORS.structuralWood;
  if (materialName === "sail" || materialName === "procedural-furled-sail-cloth") {
    return JOSEON_SURFACE_COLORS.sail;
  }
  throw new Error(`Unmapped Joseon dockside material: ${materialName}`);
}

export function mesoamericanDugoutPortAssaultSurfaceColor(sampledColor, surface, point) {
  if (surface?.sourceMaterialName == null) {
    return requiredSampledColor(sampledColor, "Mesoamerican dugout procedural geometry");
  }
  const materialName = requiredMaterialName(surface, "Mesoamerican dugout dockside");
  if (materialName !== "Canoe") {
    throw new Error(`Unmapped Mesoamerican dugout dockside material: ${materialName}`);
  }
  const height = heightAboveWaterline(surface, point, "Mesoamerican dugout");
  return height < 0
    ? DUGOUT_CANOE_SURFACE_COLORS.deepHull
    : height < 0.055
      ? DUGOUT_CANOE_SURFACE_COLORS.lowerHull
      : height < 0.13
        ? DUGOUT_CANOE_SURFACE_COLORS.hull
        : height < 0.2
          ? DUGOUT_CANOE_SURFACE_COLORS.gunwale
          : DUGOUT_CANOE_SURFACE_COLORS.interior;
}

export function ottomanTraderPortAssaultSurfaceColor(_sampledColor, surface, point) {
  const materialName = requiredMaterialName(surface, "Ottoman trader dockside");
  if (materialName === "Wood") {
    if (/^(Cylinder|Torus)/.test(surface?.sourceMeshName || "")) {
      return OTTOMAN_TRADER_SURFACE_COLORS.structuralWood;
    }
    const height = heightAboveWaterline(surface, point, "Ottoman trader");
    return height < 0
      ? OTTOMAN_TRADER_SURFACE_COLORS.deepHull
      : height < 0.09
        ? OTTOMAN_TRADER_SURFACE_COLORS.lowerHull
        : height < 0.2
          ? OTTOMAN_TRADER_SURFACE_COLORS.hull
          : height < 0.34
            ? OTTOMAN_TRADER_SURFACE_COLORS.upperHull
            : OTTOMAN_TRADER_SURFACE_COLORS.deck;
  }
  if (materialName === "Deadeye" || materialName.startsWith("Rope.")) {
    return OTTOMAN_TRADER_SURFACE_COLORS.rope;
  }
  if (materialName === "Metal") return OTTOMAN_TRADER_SURFACE_COLORS.metal;
  if (materialName === "Material" || materialName === "Material.002") {
    return OTTOMAN_TRADER_SURFACE_COLORS.accent;
  }
  if (materialName === "Sail" || materialName === "procedural-furled-sail-cloth") {
    return OTTOMAN_TRADER_SURFACE_COLORS.sail;
  }
  throw new Error(`Unmapped Ottoman trader dockside material: ${materialName}`);
}

function oceanDhowHeightAboveWaterline(surface, point) {
  return heightAboveWaterline(surface, point, "Ocean Dhow");
}

function oceanDhowModelZ(point) {
  if (!Number.isFinite(point?.modelZ)) {
    throw new Error("Ocean Dhow dockside deck color requires canonical fore-aft position");
  }
  return point.modelZ;
}

function oceanDhowUpwardFacingSurface(surface) {
  const normalY = surface?.normal?.y;
  if (!Number.isFinite(normalY)) return false;
  return normalY >= 0.62;
}

function oceanDhowDeckPlankSeam(point) {
  if (!Number.isFinite(point?.modelX)) {
    throw new Error("Ocean Dhow dockside deck color requires canonical athwartship position");
  }
  const plankWidth = 0.07;
  const plankLength = 0.18;
  const seamHalfWidth = 0.006;
  const longitudinalSeam = periodicDistance(point.modelX, plankWidth) < seamHalfWidth;
  const plankColumn = Math.floor((point.modelX + 0.21) / plankWidth);
  const stagger = Math.abs(plankColumn % 2) * plankLength * 0.5;
  const transverseSeam = periodicDistance(point.modelZ + stagger, plankLength) < seamHalfWidth;
  return longitudinalSeam || transverseSeam;
}

function periodicDistance(value, period) {
  return Math.abs(value - Math.round(value / period) * period);
}

function heightAboveWaterline(surface, point, label) {
  if (!Number.isFinite(surface?.waterlineY) || !Number.isFinite(point?.y)) {
    throw new Error(`${label} dockside color requires model height and waterline`);
  }
  return point.y - surface.waterlineY;
}

function requiredMaterialName(surface, label) {
  if (typeof surface?.sourceMaterialName !== "string") {
    throw new Error(`${label} color requires a source material name`);
  }
  return surface.sourceMaterialName;
}

function requiredSampledColor(color, label) {
  if (!color || ![color.r, color.g, color.b].every(Number.isFinite)) {
    throw new Error(`${label} requires a finite sampled RGB color`);
  }
  return color;
}

function flatColor(r, g, b) {
  return Object.freeze({ r, g, b, bakeLighting: false });
}
