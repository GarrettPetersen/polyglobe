// Zero-based contact/release frames reviewed against the shipped people atlas.
// Slashes use the first sweeping blade frame; thrusts use full extension; bows
// and matchlocks use the release/muzzle frame. Atlas tests guard timing drift.
export const PORT_ASSAULT_ATTACK_CUES = Object.freeze({
  "hunter": Object.freeze({ archetypeId: "hunter", contactFrame: 6, sourceContactMs: 700, sourceDurationMs: 1500 }),
  "sailor": Object.freeze({ archetypeId: "mariner", contactFrame: 3, sourceContactMs: 400, sourceDurationMs: 800 }),
  "gunner": Object.freeze({ archetypeId: "gunner", contactFrame: 3, sourceContactMs: 500, sourceDurationMs: 1100 }),
  "tribal-spearman": Object.freeze({ archetypeId: "wrapped-cloth-man", contactFrame: 4, sourceContactMs: 600, sourceDurationMs: 1000 }),
  "archer": Object.freeze({ archetypeId: "archer", contactFrame: 5, sourceContactMs: 600, sourceDurationMs: 1400 }),
  "cavalier": Object.freeze({ archetypeId: "cavalier", contactFrame: 4, sourceContactMs: 550, sourceDurationMs: 1050 }),
  "crossbowman": Object.freeze({ archetypeId: "crossbowman", contactFrame: 2, sourceContactMs: 300, sourceDurationMs: 1400 }),
  "halberdier": Object.freeze({ archetypeId: "halberdier", contactFrame: 3, sourceContactMs: 500, sourceDurationMs: 900 }),
  "horseman": Object.freeze({ archetypeId: "horseman", contactFrame: 4, sourceContactMs: 550, sourceDurationMs: 1050 }),
  "shieldman": Object.freeze({ archetypeId: "shieldman", contactFrame: 3, sourceContactMs: 500, sourceDurationMs: 900 }),
  "spearman": Object.freeze({ archetypeId: "spearman", contactFrame: 4, sourceContactMs: 600, sourceDurationMs: 1000 }),
  "swordsman": Object.freeze({ archetypeId: "swordsman", contactFrame: 3, sourceContactMs: 500, sourceDurationMs: 900 }),
  "islamicate-warrior": Object.freeze({ archetypeId: "islamicate-warrior", contactFrame: 3, sourceContactMs: 500, sourceDurationMs: 900 }),
  "ming-crossbowman": Object.freeze({ archetypeId: "ming-crossbowman", contactFrame: 2, sourceContactMs: 300, sourceDurationMs: 1400 }),
  "ming-swordsman": Object.freeze({ archetypeId: "ming-swordsman", contactFrame: 3, sourceContactMs: 500, sourceDurationMs: 900 }),
  "horse-samurai": Object.freeze({ archetypeId: "horse-samurai", contactFrame: 4, sourceContactMs: 550, sourceDurationMs: 1050 }),
  "ronin": Object.freeze({ archetypeId: "ronin", contactFrame: 3, sourceContactMs: 500, sourceDurationMs: 900 }),
  "samurai": Object.freeze({ archetypeId: "samurai", contactFrame: 3, sourceContactMs: 500, sourceDurationMs: 900 }),
  "teppo-ashigaru": Object.freeze({ archetypeId: "teppo-ashigaru", contactFrame: 5, sourceContactMs: 700, sourceDurationMs: 1000 }),
  "yari-ashigaru": Object.freeze({ archetypeId: "yari-ashigaru", contactFrame: 4, sourceContactMs: 600, sourceDurationMs: 1000 }),
  "yumi-samurai": Object.freeze({ archetypeId: "yumi-samurai", contactFrame: 4, sourceContactMs: 700, sourceDurationMs: 1300 }),
});

export function portAssaultAttackTiming(profileId, attackType) {
  const cue = PORT_ASSAULT_ATTACK_CUES[profileId];
  if (!cue || !["melee", "arrow", "firearm"].includes(attackType)) {
    throw new Error(`Missing assault attack cue: ${profileId}/${attackType}`);
  }
  // Retiming keeps melee fast while placing contact exactly on a simulation tick.
  const contactMs = attackType === "melee" ? 200 : 400;
  return Object.freeze({ ...cue, contactMs,
    durationMs: cue.sourceDurationMs * contactMs / cue.sourceContactMs });
}

export function portAssaultProjectileFlightMs(attackType) {
  if (attackType === "melee") return 0;
  if (attackType === "arrow") return 400;
  if (attackType === "firearm") return 200;
  throw new Error(`Unknown assault projectile type: ${attackType}`);
}
