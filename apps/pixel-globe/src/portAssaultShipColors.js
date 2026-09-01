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

const POLYNESIAN_VOYAGING_CANOE_SURFACE_COLORS = Object.freeze({
  deepHull: flatColor(46, 34, 47),
  lowerHull: flatColor(76, 62, 36),
  hull: flatColor(150, 108, 108),
  gunwale: flatColor(98, 85, 101),
  deckEdge: flatColor(98, 85, 101),
  deck: flatColor(171, 148, 122),
  deckSeam: flatColor(76, 62, 36),
  hullBox: flatColor(121, 105, 141),
  wovenLashing: flatColor(178, 186, 144),
  structuralWood: flatColor(76, 62, 36),
  rope: flatColor(46, 34, 47),
  accentCloth: flatColor(150, 108, 108),
  sail: flatColor(199, 178, 141)
});

const GREAT_CARRACK_SURFACE_COLORS = Object.freeze({
  deepHull: flatColor(46, 34, 47),
  lowerHull: flatColor(76, 62, 36),
  hull: flatColor(98, 85, 101),
  upperHull: flatColor(150, 108, 108),
  deck: flatColor(171, 148, 122),
  deckSeam: flatColor(76, 62, 36),
  structuralWood: flatColor(76, 62, 36),
  sail: flatColor(199, 220, 208)
});

const MEDITERRANEAN_GALLEY_SURFACE_COLORS = Object.freeze({
  deepHull: flatColor(46, 34, 47),
  lowerHull: flatColor(76, 62, 36),
  hull: flatColor(150, 108, 108),
  upperHull: flatColor(98, 85, 101),
  deck: flatColor(171, 148, 122),
  deckSeam: flatColor(76, 62, 36),
  structuralWood: flatColor(76, 62, 36),
  rope: flatColor(46, 34, 47),
  hardware: flatColor(67, 83, 76),
  sail: flatColor(199, 220, 208)
});

const GALLEASS_SURFACE_COLORS = Object.freeze({
  ...MEDITERRANEAN_GALLEY_SURFACE_COLORS,
  hull: flatColor(98, 85, 101),
  upperHull: flatColor(150, 108, 108)
});

const FUSTA_SURFACE_COLORS = Object.freeze({
  ...MEDITERRANEAN_GALLEY_SURFACE_COLORS,
  lowerHull: flatColor(98, 85, 101),
  hull: flatColor(150, 108, 108),
  upperHull: flatColor(171, 148, 122)
});

const ATAKEBUNE_SURFACE_COLORS = Object.freeze({
  deepHull: flatColor(46, 34, 47),
  lowerHull: flatColor(76, 62, 36),
  hull: flatColor(98, 85, 101),
  upperHull: flatColor(150, 108, 108),
  deck: flatColor(171, 148, 122),
  lightTimber: flatColor(199, 178, 141),
  roof: flatColor(121, 105, 141),
  roofEdge: flatColor(98, 85, 101),
  structuralWood: flatColor(76, 62, 36),
  rope: flatColor(46, 34, 47),
  hardware: flatColor(67, 83, 76),
  lantern: flatColor(224, 224, 126),
  sail: flatColor(199, 220, 208)
});

const SEKIBUNE_SURFACE_COLORS = Object.freeze({
  deepHull: flatColor(46, 34, 47),
  lowerHull: flatColor(76, 62, 36),
  hull: flatColor(98, 85, 101),
  upperWorks: flatColor(150, 108, 108),
  upperHull: flatColor(150, 108, 108),
  deck: flatColor(171, 148, 122),
  structuralWood: flatColor(76, 62, 36),
  flag: flatColor(199, 178, 141),
  sail: flatColor(199, 220, 208)
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

export function polynesianVoyagingCanoePortAssaultSurfaceColor(
  _sampledColor,
  surface,
  point
) {
  const materialName = requiredMaterialName(surface, "Polynesian Voyaging Canoe dockside");
  if (materialName === "Deck") {
    const height = heightAboveWaterline(surface, point, "Polynesian Voyaging Canoe");
    if (height < 0.14) return POLYNESIAN_VOYAGING_CANOE_SURFACE_COLORS.deckEdge;
    if (modelSpacePlankSeam(point, {
      plankWidth: 0.08,
      plankLength: 0.24,
      seamHalfWidth: 0.006,
      columnOffset: 0.24,
      label: "Polynesian Voyaging Canoe"
    })) return POLYNESIAN_VOYAGING_CANOE_SURFACE_COLORS.deckSeam;
    return POLYNESIAN_VOYAGING_CANOE_SURFACE_COLORS.deck;
  }
  if (materialName === "Hull") {
    const height = heightAboveWaterline(surface, point, "Polynesian Voyaging Canoe");
    return height < 0
      ? POLYNESIAN_VOYAGING_CANOE_SURFACE_COLORS.deepHull
      : height < 0.08
        ? POLYNESIAN_VOYAGING_CANOE_SURFACE_COLORS.lowerHull
        : height < 0.18
          ? POLYNESIAN_VOYAGING_CANOE_SURFACE_COLORS.hull
          : POLYNESIAN_VOYAGING_CANOE_SURFACE_COLORS.gunwale;
  }
  if (materialName === "Hull-box") {
    return POLYNESIAN_VOYAGING_CANOE_SURFACE_COLORS.hullBox;
  }
  if (materialName === "Leaf" || materialName === "Leaf.001") {
    return POLYNESIAN_VOYAGING_CANOE_SURFACE_COLORS.wovenLashing;
  }
  if (materialName === "material") {
    return POLYNESIAN_VOYAGING_CANOE_SURFACE_COLORS.accentCloth;
  }
  if (materialName === "Ropes") return POLYNESIAN_VOYAGING_CANOE_SURFACE_COLORS.rope;
  if (materialName === "Trim") {
    return POLYNESIAN_VOYAGING_CANOE_SURFACE_COLORS.structuralWood;
  }
  if (materialName === "Sails" || materialName === "procedural-furled-sail-cloth") {
    return POLYNESIAN_VOYAGING_CANOE_SURFACE_COLORS.sail;
  }
  throw new Error(`Unmapped Polynesian Voyaging Canoe dockside material: ${materialName}`);
}

export function greatCarrackPortAssaultSurfaceColor(_sampledColor, surface, point) {
  const materialName = requiredMaterialName(surface, "Great Carrack dockside");
  if (materialName === "procedural-furled-sail-cloth") {
    return GREAT_CARRACK_SURFACE_COLORS.sail;
  }
  if (materialName !== "texture main") {
    throw new Error(`Unmapped Great Carrack dockside material: ${materialName}`);
  }
  const height = heightAboveWaterline(surface, point, "Great Carrack");
  if (height >= 0.15 && upwardFacingSurface(surface)) {
    if (modelSpacePlankSeam(point, {
      plankWidth: 0.08,
      plankLength: 0.24,
      seamHalfWidth: 0.006,
      columnOffset: 0.24,
      label: "Great Carrack"
    })) return GREAT_CARRACK_SURFACE_COLORS.deckSeam;
    return GREAT_CARRACK_SURFACE_COLORS.deck;
  }
  if (height >= 0.52) return GREAT_CARRACK_SURFACE_COLORS.structuralWood;
  return bandedHullColor(height, GREAT_CARRACK_SURFACE_COLORS, {
    lowerHullTop: 0.08,
    hullTop: 0.24,
    upperHullTop: 0.52
  });
}

export function mediterraneanGalleyPortAssaultSurfaceColor(_color, surface, point) {
  return galleyPortAssaultSurfaceColor(
    surface,
    point,
    "Mediterranean Galley",
    MEDITERRANEAN_GALLEY_SURFACE_COLORS,
    0.85
  );
}

export function galleassPortAssaultSurfaceColor(_color, surface, point) {
  return galleyPortAssaultSurfaceColor(
    surface,
    point,
    "Galleass",
    GALLEASS_SURFACE_COLORS,
    1.025
  );
}

export function fustaPortAssaultSurfaceColor(_color, surface, point) {
  return galleyPortAssaultSurfaceColor(
    surface,
    point,
    "Fusta",
    FUSTA_SURFACE_COLORS,
    0.68
  );
}

export function atakebunePortAssaultSurfaceColor(_sampledColor, surface, point) {
  const materialName = requiredMaterialName(surface, "Atakebune dockside");
  if (materialName === "Wood" || materialName === "Material" || materialName === "CopperPlating") {
    const height = heightAboveWaterline(surface, point, "Atakebune");
    if (height >= 0.14 && upwardFacingSurface(surface)) {
      return ATAKEBUNE_SURFACE_COLORS.deck;
    }
    return bandedHullColor(height, ATAKEBUNE_SURFACE_COLORS, {
      lowerHullTop: 0.07,
      hullTop: 0.18,
      upperHullTop: 0.42
    });
  }
  if (materialName === "WhitePlanks") return ATAKEBUNE_SURFACE_COLORS.lightTimber;
  if (materialName === "WoodPlankGrey") return ATAKEBUNE_SURFACE_COLORS.deck;
  if (materialName === "RoofTopTile") return ATAKEBUNE_SURFACE_COLORS.roof;
  if (materialName === "RoofBrick" || materialName === "Black") {
    return ATAKEBUNE_SURFACE_COLORS.roofEdge;
  }
  if (materialName === "MastHolz") return ATAKEBUNE_SURFACE_COLORS.structuralWood;
  if (materialName === "Rope") return ATAKEBUNE_SURFACE_COLORS.rope;
  if (materialName === "ChainSteel" || materialName === "FrogStone") {
    return ATAKEBUNE_SURFACE_COLORS.hardware;
  }
  if (materialName === "Lantern") return ATAKEBUNE_SURFACE_COLORS.lantern;
  if (materialName === "Sail" || materialName === "procedural-furled-sail-cloth") {
    return ATAKEBUNE_SURFACE_COLORS.sail;
  }
  throw new Error(`Unmapped Atakebune dockside material: ${materialName}`);
}

export function sekibunePortAssaultSurfaceColor(_sampledColor, surface, point) {
  const materialName = requiredMaterialName(surface, "Sekibune dockside");
  if (materialName === "procedural-furled-sail-cloth") {
    return SEKIBUNE_SURFACE_COLORS.sail;
  }
  if (materialName !== "__DEFAULT") {
    throw new Error(`Unmapped Sekibune dockside material: ${materialName}`);
  }
  const meshName = requiredMeshName(surface, "Sekibune dockside");
  if (meshName === "船体") {
    const height = heightAboveWaterline(surface, point, "Sekibune");
    return bandedHullColor(height, SEKIBUNE_SURFACE_COLORS, {
      lowerHullTop: 0.07,
      hullTop: 0.18,
      upperHullTop: 0.36
    });
  }
  if (meshName === "櫓") {
    return upwardFacingSurface(surface)
      ? SEKIBUNE_SURFACE_COLORS.deck
      : SEKIBUNE_SURFACE_COLORS.upperWorks;
  }
  if (meshName.startsWith("旗")) return SEKIBUNE_SURFACE_COLORS.flag;
  if (["帆柱_倒", "帆柱_立", "帆桁", "筒車立", "舵", "艫車立", "表車立"].includes(meshName)) {
    return SEKIBUNE_SURFACE_COLORS.structuralWood;
  }
  if (meshName === "帆") return SEKIBUNE_SURFACE_COLORS.sail;
  throw new Error(`Unmapped Sekibune dockside mesh: ${meshName}`);
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
  return upwardFacingSurface(surface);
}

function galleyPortAssaultSurfaceColor(surface, point, label, colors, scale) {
  const materialName = requiredMaterialName(surface, `${label} dockside`);
  if (materialName === "M_Ship03_Sail" || materialName === "procedural-furled-sail-cloth") {
    return colors.sail;
  }
  if (materialName === "M_Ship03_Rope_01") return colors.rope;
  if (materialName === "M_Ship03_Metal" || materialName === "M_Ship03_Glass") {
    return colors.hardware;
  }
  if (materialName === "M_Ship03_Plank_01") return colors.structuralWood;
  if (
    materialName === "M_Ship03_Plank_02" ||
    materialName === "M_Ship03_WoodDark_01" ||
    materialName === "M_Ship03_WoodDark_02"
  ) {
    const height = heightAboveWaterline(surface, point, label);
    const isDeckPlane = surface?.sourceMeshName === "Object_24" || horizontalFacingSurface(surface);
    if (height >= 0.11 * scale && isDeckPlane) {
      if (modelSpacePlankSeam(point, {
        plankWidth: 0.075 * scale,
        plankLength: 0.22 * scale,
        seamHalfWidth: 0.006 * scale,
        columnOffset: 0.225 * scale,
        label
      })) return colors.deckSeam;
      return colors.deck;
    }
    if (height >= 0.38 * scale) return colors.structuralWood;
    return bandedHullColor(height, colors, {
      lowerHullTop: 0.07 * scale,
      hullTop: 0.2 * scale,
      upperHullTop: 0.38 * scale
    });
  }
  throw new Error(`Unmapped ${label} dockside material: ${materialName}`);
}

function bandedHullColor(height, colors, { lowerHullTop, hullTop, upperHullTop }) {
  return height < 0
    ? colors.deepHull
    : height < lowerHullTop
      ? colors.lowerHull
      : height < hullTop
        ? colors.hull
        : height < upperHullTop
          ? colors.upperHull
          : colors.structuralWood;
}

function upwardFacingSurface(surface) {
  const normalY = surface?.normal?.y;
  return Number.isFinite(normalY) && normalY >= 0.62;
}

function horizontalFacingSurface(surface) {
  const normalY = surface?.normal?.y;
  return Number.isFinite(normalY) && Math.abs(normalY) >= 0.62;
}

function oceanDhowDeckPlankSeam(point) {
  return modelSpacePlankSeam(point, {
    plankWidth: 0.07,
    plankLength: 0.18,
    seamHalfWidth: 0.006,
    columnOffset: 0.21,
    label: "Ocean Dhow"
  });
}

function modelSpacePlankSeam(point, {
  plankWidth,
  plankLength,
  seamHalfWidth,
  columnOffset,
  label
}) {
  if (!Number.isFinite(point?.modelX) || !Number.isFinite(point?.modelZ)) {
    throw new Error(`${label} dockside deck color requires canonical deck position`);
  }
  const longitudinalSeam = periodicDistance(point.modelX, plankWidth) < seamHalfWidth;
  const plankColumn = Math.floor((point.modelX + columnOffset) / plankWidth);
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

function requiredMeshName(surface, label) {
  if (typeof surface?.sourceMeshName !== "string") {
    throw new Error(`${label} color requires a source mesh name`);
  }
  return surface.sourceMeshName;
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
