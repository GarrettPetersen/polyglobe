import * as THREE from "three";

export interface BuildingDefinition {
  id: string;
  name: string;
  description: string;
  create(): THREE.Group;
}

const WALL_LIGHT = 0xb9c6d4;
const WALL_DARK = 0x95a5b7;
const ROOF_DARK = 0x5c666f;
const WOOD = 0x8b6a4a;
const METAL = 0x66717d;
const WINDOW_LIT = 0xffe59a;

function standard(color: THREE.ColorRepresentation): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.9,
    metalness: 0.05,
    flatShading: true,
  });
}

function litWindow(
  color: THREE.ColorRepresentation = WINDOW_LIT,
): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.98,
  });
}

function addBox(
  group: THREE.Group,
  size: [number, number, number],
  mat: THREE.Material,
  pos: [number, number, number],
  role: "wall" | "roof" | "window" | "detail" = "wall",
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(size[0], size[1], size[2]),
    mat,
  );
  mesh.position.set(pos[0], pos[1], pos[2]);
  mesh.userData.role = role;
  if (role === "window") {
    mesh.castShadow = false;
    mesh.receiveShadow = false;
  }
  group.add(mesh);
  return mesh;
}

function addRoof(
  group: THREE.Group,
  width: number,
  depth: number,
  roofHeight: number,
  y: number,
  mat: THREE.Material,
): THREE.Mesh {
  // 4-sided cone rotated 45 degrees gives a low-poly steep roof silhouette.
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(Math.max(width, depth) * 0.72, roofHeight, 4),
    mat,
  );
  roof.position.set(0, y, 0);
  roof.rotation.y = Math.PI * 0.25;
  roof.scale.set(width / depth, 1, 1);
  roof.userData.role = "roof";
  group.add(roof);
  return roof;
}

function addGableRoof(
  group: THREE.Group,
  width: number,
  depth: number,
  roofHeight: number,
  y: number,
  mat: THREE.Material,
): THREE.Mesh {
  const halfD = depth * 0.5;
  const shape = new THREE.Shape();
  shape.moveTo(-halfD, 0);
  shape.lineTo(0, roofHeight);
  shape.lineTo(halfD, 0);
  shape.lineTo(-halfD, 0);
  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: width,
    bevelEnabled: false,
    steps: 1,
  });
  const roof = new THREE.Mesh(geom, mat);
  roof.rotation.y = Math.PI * 0.5;
  roof.position.set(-width * 0.5, y, 0);
  roof.userData.role = "roof";
  group.add(roof);
  return roof;
}

function addFrontWindow(
  group: THREE.Group,
  size: [number, number, number],
  y: number,
  x = 0,
  z = 0.251,
): void {
  addBox(group, size, litWindow(), [x, y, z], "window");
}

function addBackWindow(
  group: THREE.Group,
  size: [number, number, number],
  y: number,
  x = 0,
  z = -0.251,
): void {
  addBox(group, size, litWindow(), [x, y, z], "window");
}

function createSmallHouse(): THREE.Group {
  const g = new THREE.Group();
  g.name = "BuildingSmallHouse";
  addBox(g, [0.5, 0.34, 0.5], standard(WALL_LIGHT), [0, 0.17, 0]);
  addRoof(g, 0.56, 0.56, 0.34, 0.47, standard(ROOF_DARK));
  addFrontWindow(g, [0.11, 0.11, 0.02], 0.2);
  return g;
}

function createMediumHouse(): THREE.Group {
  const g = new THREE.Group();
  g.name = "BuildingMediumHouse";
  addBox(g, [1.0, 0.42, 0.5], standard(WALL_LIGHT), [0, 0.21, 0]);
  addGableRoof(g, 1.08, 0.56, 0.38, 0.42, standard(ROOF_DARK));
  addFrontWindow(g, [0.13, 0.12, 0.02], 0.22, -0.2);
  addFrontWindow(g, [0.13, 0.12, 0.02], 0.22, 0.2);
  addBackWindow(g, [0.13, 0.12, 0.02], 0.22, -0.2, -0.251);
  addBackWindow(g, [0.13, 0.12, 0.02], 0.22, 0.2, -0.251);
  return g;
}

function createMediumBlock(): THREE.Group {
  const g = new THREE.Group();
  g.name = "BuildingMediumBlock";
  addBox(g, [0.9, 0.75, 0.62], standard(WALL_DARK), [0, 0.375, 0]);
  addBox(g, [0.92, 0.06, 0.64], standard(ROOF_DARK), [0, 0.78, 0], "roof");
  const xCols = [-0.28, 0, 0.28];
  const yRows = [0.2, 0.48];
  for (const x of xCols) {
    for (const y of yRows) {
      addFrontWindow(g, [0.1, 0.1, 0.02], y, x, 0.321);
      addBackWindow(g, [0.1, 0.1, 0.02], y, x, -0.321);
    }
  }
  return g;
}

function createLargeApartment(): THREE.Group {
  const g = new THREE.Group();
  g.name = "BuildingLargeApartment";
  addBox(g, [0.95, 1.95, 0.95], standard(WALL_DARK), [0, 0.975, 0]);
  addBox(g, [1.0, 0.08, 1.0], standard(METAL), [0, 1.99, 0], "detail");
  const xCols = [-0.3, -0.1, 0.1, 0.3];
  const yRows = [0.25, 0.55, 0.85, 1.15, 1.45, 1.75];
  for (const x of xCols) {
    for (const y of yRows) {
      addFrontWindow(g, [0.08, 0.09, 0.02], y, x, 0.481);
      addBackWindow(g, [0.08, 0.09, 0.02], y, x, -0.481);
    }
  }
  return g;
}

function createTrainStation(): THREE.Group {
  const g = new THREE.Group();
  g.name = "BuildingTrainStation";
  addBox(g, [1.2, 0.45, 0.72], standard(WALL_LIGHT), [0, 0.225, 0]);
  addGableRoof(g, 1.28, 0.78, 0.34, 0.45, standard(ROOF_DARK));
  addFrontWindow(g, [0.12, 0.12, 0.02], 0.22, -0.28, 0.371);
  addFrontWindow(g, [0.12, 0.12, 0.02], 0.22, 0.28, 0.371);
  addBackWindow(g, [0.12, 0.12, 0.02], 0.22, -0.28, -0.371);
  addBackWindow(g, [0.12, 0.12, 0.02], 0.22, 0.28, -0.371);
  addBox(g, [0.32, 0.8, 0.32], standard(WALL_DARK), [0, 0.86, -0.05], "wall");
  addBox(g, [0.36, 0.1, 0.36], standard(ROOF_DARK), [0, 1.31, -0.05], "roof");
  const face = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.09, 0.015, 12),
    litWindow(0xfaf5d0),
  );
  face.userData.role = "window";
  face.castShadow = false;
  face.receiveShadow = false;
  face.position.set(0, 0.98, 0.12);
  face.rotation.x = Math.PI * 0.5;
  g.add(face);
  return g;
}

function createDock(): THREE.Group {
  const g = new THREE.Group();
  g.name = "BuildingDock";
  const deckMat = standard(WOOD);
  // Main shore pad.
  addBox(g, [0.7, 0.05, 0.55], deckMat, [0, 0.03, 0], "detail");
  // Long planks extending outward.
  addBox(g, [0.16, 0.04, 1.3], deckMat, [-0.14, 0.04, 0.75], "detail");
  addBox(g, [0.16, 0.04, 1.3], deckMat, [0.14, 0.04, 0.75], "detail");
  addBox(g, [0.38, 0.035, 0.4], deckMat, [0, 0.045, 1.28], "detail");
  const postMat = standard(0x5f4b36);
  addBox(g, [0.05, 0.24, 0.05], postMat, [-0.24, 0.12, 1.25], "detail");
  addBox(g, [0.05, 0.24, 0.05], postMat, [0.24, 0.12, 1.25], "detail");
  addBox(g, [0.05, 0.2, 0.05], postMat, [-0.2, 0.1, 0.25], "detail");
  addBox(g, [0.05, 0.2, 0.05], postMat, [0.2, 0.1, 0.25], "detail");
  return g;
}

function createFactory(): THREE.Group {
  const g = new THREE.Group();
  g.name = "BuildingFactory";
  // Main industrial massing.
  addBox(g, [1.22, 0.42, 0.78], standard(WALL_DARK), [0, 0.21, 0], "wall");
  addBox(g, [1.22, 0.16, 0.78], standard(WALL_LIGHT), [0, 0.5, 0], "wall");

  // Sawtooth roof silhouette (three slanted sections).
  const roofMat = standard(ROOF_DARK);
  const roofPieces = [-0.26, 0.0, 0.26];
  for (const z of roofPieces) {
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.2), roofMat);
    roof.position.set(0, 0.62, z);
    roof.rotation.x = -0.32;
    roof.userData.role = "roof";
    g.add(roof);
  }

  // Clerestory strips under each sawtooth section.
  for (const z of roofPieces) {
    addBox(g, [1.1, 0.05, 0.03], litWindow(0xf7e2a1), [0, 0.57, z + 0.08], "window");
  }

  // Front and back factory windows.
  const xCols = [-0.42, -0.2, 0, 0.2, 0.42];
  const yRows = [0.2, 0.34, 0.48];
  for (const x of xCols) {
    for (const y of yRows) {
      addFrontWindow(g, [0.1, 0.08, 0.02], y, x, 0.401);
      addBackWindow(g, [0.1, 0.08, 0.02], y, x, -0.401);
    }
  }

  // Single smokestack near one end.
  const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.95, 10), standard(0x5a6069));
  stack.position.set(0.46, 0.9, -0.15);
  stack.userData.role = "detail";
  g.add(stack);
  const stackCap = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.08, 0.06, 10), standard(0x3f444c));
  stackCap.position.set(0.46, 1.39, -0.15);
  stackCap.userData.role = "detail";
  g.add(stackCap);
  return g;
}

function createTrackSection(): THREE.Group {
  const g = new THREE.Group();
  g.name = "BuildingTrackSection";

  // Small ballast/ground pad so the track reads clearly in the viewer.
  addBox(g, [1.35, 0.03, 0.22], standard(0x4f5a63), [0, 0.015, 0], "detail");

  // Straight double-track rails.
  addBox(g, [1.3, 0.012, 0.018], standard(0xc0c8d4), [0, 0.036, 0.042], "detail");
  addBox(g, [1.3, 0.012, 0.018], standard(0xc0c8d4), [0, 0.036, -0.042], "detail");

  // Sleepers.
  const sleeperXs = [-0.56, -0.37, -0.18, 0.01, 0.2, 0.39, 0.58];
  for (const x of sleeperXs) {
    addBox(g, [0.048, 0.01, 0.14], standard(WOOD), [x, 0.026, 0], "detail");
  }

  // Minimal support posts, useful when evaluating small elevated sections.
  addBox(g, [0.03, 0.08, 0.03], standard(0x5f6670), [-0.45, -0.01, 0], "detail");
  addBox(g, [0.03, 0.08, 0.03], standard(0x5f6670), [0, -0.01, 0], "detail");
  addBox(g, [0.03, 0.08, 0.03], standard(0x5f6670), [0.45, -0.01, 0], "detail");
  return g;
}

export const BUILDING_DEFS: readonly BuildingDefinition[] = [
  {
    id: "small-house",
    name: "Small house",
    description: "Simple A-frame with one self-lit window.",
    create: createSmallHouse,
  },
  {
    id: "medium-house",
    name: "Medium house",
    description: "Wider A-frame house, roughly double width.",
    create: createMediumHouse,
  },
  {
    id: "medium-block",
    name: "Medium block",
    description: "Two-story tenement block with lit windows.",
    create: createMediumBlock,
  },
  {
    id: "large-apartment",
    name: "Large apartment",
    description: "Tall apartment tower with many lit windows.",
    create: createLargeApartment,
  },
  {
    id: "train-station",
    name: "Train station",
    description: "Large house-like station with a clock tower.",
    create: createTrainStation,
  },
  {
    id: "dock",
    name: "Dock",
    description: "Low wooden dock with long planks and posts.",
    create: createDock,
  },
  {
    id: "factory",
    name: "Factory",
    description: "Industrial hall with sawtooth roof and a single smokestack.",
    create: createFactory,
  },
  {
    id: "track-section",
    name: "Track section",
    description: "Straight double-track segment for rail silhouette tuning.",
    create: createTrackSection,
  },
];

