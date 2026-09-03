import { resolveShipCollision } from "./shipCollision.js";
import {
  WHITE_WHALE_ID,
  WHALE_LIFE_STAGE_ADOLESCENT,
  WHALE_LIFE_STAGE_ADULT,
  WHALE_SPECIES_SPERM
} from "./whaleSpecies.js";

const WHALE_RAM_PROFILE = Object.freeze({
  [WHALE_LIFE_STAGE_ADOLESCENT]: Object.freeze({
    lengthPx: 30,
    widthPx: 8,
    mass: 150,
    speedPx: 7.5
  }),
  [WHALE_LIFE_STAGE_ADULT]: Object.freeze({
    lengthPx: 40,
    widthPx: 11,
    mass: 430,
    speedPx: 10.5
  })
});

export function resolveWhaleRamCollision(playerBody, whaleHeading, lifeStage) {
  const profile = WHALE_RAM_PROFILE[lifeStage];
  if (!profile) throw new Error(`Whale life stage cannot ram: ${lifeStage}`);
  const heading = normalizedHeading(whaleHeading);
  if (!Array.isArray(playerBody?.footprint) || playerBody.footprint.length < 3) {
    throw new Error("Whale ram requires a player hull footprint");
  }
  const contact = leadingHullContact(playerBody.footprint, heading);
  const x = contact.x - heading.x * (profile.lengthPx / 2 - 2);
  const y = contact.y - heading.y * (profile.lengthPx / 2 - 2);
  const whaleBody = {
    id: `ramming-whale:${lifeStage}`,
    x,
    y,
    vx: heading.x * profile.speedPx,
    vy: heading.y * profile.speedPx,
    headingX: heading.x,
    headingY: heading.y,
    mass: profile.mass,
    footprint: orientedRectangle(x, y, heading, profile.lengthPx, profile.widthPx)
  };
  const collision = resolveShipCollision(playerBody, whaleBody);
  if (!collision) throw new Error("Ramming whale did not overlap the player hull");
  return Object.freeze({
    player: Object.freeze(collision.a),
    whale: Object.freeze(collision.b),
    closingSpeed: collision.closingSpeed,
    whaleMass: profile.mass
  });
}

function leadingHullContact(footprint, heading) {
  let targetProjection = Infinity;
  for (const point of footprint) {
    targetProjection = Math.min(targetProjection, point.x * heading.x + point.y * heading.y);
  }
  const contacts = footprint.filter((point) => (
    Math.abs(point.x * heading.x + point.y * heading.y - targetProjection) <= 1e-6
  ));
  if (contacts.length === 0) throw new Error("Whale ram could not find the player hull edge");
  return {
    x: contacts.reduce((sum, point) => sum + point.x, 0) / contacts.length,
    y: contacts.reduce((sum, point) => sum + point.y, 0) / contacts.length
  };
}

export function whaleRamAppliedDamage(hitPoints, collisionDamage) {
  if (!Number.isFinite(hitPoints) || hitPoints <= 0) {
    throw new Error(`Invalid hull points before whale ram: ${hitPoints}`);
  }
  if (!Number.isFinite(collisionDamage) || collisionDamage < 0) {
    throw new Error(`Invalid whale collision damage: ${collisionDamage}`);
  }
  const damage = Math.max(1, Math.round(collisionDamage));
  return hitPoints > 1 ? Math.min(damage, hitPoints - 1) : damage;
}

export function whaleRamWarningText(whale) {
  assertRammingSpermWhale(whale);
  return whale.id === WHITE_WHALE_ID
    ? "THE WHITE WHALE WHEELS TO RAM"
    : "THE SPERM WHALE WHEELS TO RAM";
}

export function whaleRamImpactText(whale, damageLabel) {
  assertRammingSpermWhale(whale);
  if (typeof damageLabel !== "string" || damageLabel === "") {
    throw new Error("Whale ram impact requires a damage label");
  }
  return whale.id === WHITE_WHALE_ID
    ? `WHITE WHALE RAM  -${damageLabel} HULL`
    : `SPERM WHALE RAM  -${damageLabel} HULL`;
}

export function whaleRamLossText(whale) {
  assertRammingSpermWhale(whale);
  return whale.id === WHITE_WHALE_ID
    ? Object.freeze({
        sinkingReason: "The white whale stove in your hull.",
        crewLossReason: "The last of the crew died when the white whale rammed the ship."
      })
    : Object.freeze({
        sinkingReason: "A sperm whale stove in your hull.",
        crewLossReason: "The last of the crew died when a sperm whale rammed the ship."
      });
}

function assertRammingSpermWhale(whale) {
  if (!whale || typeof whale.id !== "string" || whale.id === "") {
    throw new Error("Whale ram text requires an individual whale ID");
  }
  if (whale.speciesId !== WHALE_SPECIES_SPERM) {
    throw new Error(`Only sperm whales can ram ships: ${whale.id}/${whale.speciesId}`);
  }
}

function orientedRectangle(x, y, heading, length, width) {
  const halfLength = length / 2;
  const halfWidth = width / 2;
  const side = { x: -heading.y, y: heading.x };
  return [
    point(x, y, heading, side, halfLength, halfWidth),
    point(x, y, heading, side, halfLength, -halfWidth),
    point(x, y, heading, side, -halfLength, -halfWidth),
    point(x, y, heading, side, -halfLength, halfWidth)
  ];
}

function point(x, y, heading, side, along, across) {
  return {
    x: x + heading.x * along + side.x * across,
    y: y + heading.y * along + side.y * across
  };
}

function normalizedHeading(heading) {
  if (!heading || !Number.isFinite(heading.x) || !Number.isFinite(heading.y)) {
    throw new Error("Whale ram requires a finite screen heading");
  }
  const length = Math.hypot(heading.x, heading.y);
  if (length <= 1e-6) throw new Error("Whale ram heading has no direction");
  return { x: heading.x / length, y: heading.y / length };
}
