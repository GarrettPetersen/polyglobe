import test from "node:test";
import assert from "node:assert/strict";
import { portAssaultShotIsClear, portAssaultTacticalDecision } from "./portAssaultTactics.js";
import { PORT_ASSAULT_LANE_SPACING } from "./portAssaultFormation.js";
import { portAssaultUnitStats } from "./portAssaultBattle.js";
const unit = (id, type, position, lane = 1, side = "attacker") => ({
  id, side, position, lane, alive: true, spawned: true, landed: true, landedAtMs: 0,
  lastRangedAttackPosition: null, firearmReload: null,
  stats: portAssaultUnitStats({ id, crewTypeId: type, combatProfileId: type, appearanceId: type, experienceStars: 1, auxiliary: false }), nextPrimaryAttackAtMs: 0
});

test("reloading gunners yield to withdrawing comrades ahead, but clear their landing first", () => {
  for (const side of ["attacker", "defender"]) {
    const forward = side === "attacker" ? 1 : -1;
    const gun = unit("gun", "gunner", .5, 1, side);
    gun.lastRangedAttackPosition = .5 + forward * .08;
    gun.firearmReload = { durationMs: 4000, remainingMs: 2000 };
    const ally = { ...unit("ally", "gunner", .5 + forward * .035, 1, side), retreating: true };
    const enemy = unit("enemy", "swordsman", .5 + forward * .3, 1, side === "attacker" ? "defender" : "attacker");
    const decision = portAssaultTacticalDecision(gun, [gun, ally], [enemy], 2000);
    assert.equal(decision.mode, "yield");
    assert.ok((decision.destination.position - gun.position) * forward < 0);
    assert.equal(gun.firearmReload.remainingMs, 2000, "choosing movement must not advance reloading");
    assert.equal(portAssaultTacticalDecision(gun, [gun, ally], [enemy], 500).mode, "reload");
    ally.position = .5 - forward * .035;
    assert.equal(portAssaultTacticalDecision(gun, [gun, ally], [enemy], 2000).mode, "reload");
  }
});

test("friendly bodies block shots, including diagonals; fallen and off-line soldiers do not", () => {
  const shooter = unit("gun", "gunner", .3);
  const enemy = unit("enemy", "swordsman", .5, 1, "defender");
  const ally = unit("ally", "spearman", .4);
  assert.equal(portAssaultShotIsClear(shooter, enemy, [shooter, ally]), false);
  assert.equal(portAssaultShotIsClear(shooter, enemy, [{ ...ally, lane: 3 }]), true);
  assert.equal(portAssaultShotIsClear(shooter, enemy, [{ ...ally, alive: false }]), true);
  assert.equal(portAssaultShotIsClear({ ...shooter, lane: 0 }, { ...enemy, lane: 2 }, [ally]), false);
  assert.equal(portAssaultShotIsClear(shooter, enemy, [{ ...ally, position: .2 }]), true);
});

test("initial ranged readiness does not order a newly landed soldier to stop and reload", () => {
  for (const profile of ["gunner", "archer"]) {
    const soldier = unit("landing", profile, .04);
    soldier.nextPrimaryAttackAtMs = 5000;
    const enemy = unit("enemy", "swordsman", .8, 1, "defender");
    const decision = portAssaultTacticalDecision(soldier, [soldier], [enemy], 1000);
    assert.equal(decision.mode, "skirmish");
    assert.equal(decision.target, enemy);
  }
});

test("loaded guns find a clear position and retreat toward their rear before reloading", () => {
  const gun = unit("gun", "gunner", .3);
  const pike = unit("pike", "spearman", .34);
  const enemy = unit("enemy", "swordsman", .5, 1, "defender");
  assert.equal(portAssaultTacticalDecision(gun, [gun, pike], [enemy], 0).mode, "find-shot");
  gun.position = .4;
  assert.equal(portAssaultTacticalDecision(gun, [gun, pike], [enemy], 0).mode, "fire");
  gun.lastRangedAttackPosition = gun.position;
  gun.nextPrimaryAttackAtMs = 4000;
  gun.firearmReload = { durationMs: 4000, remainingMs: 4000 };
  const retreat = portAssaultTacticalDecision(gun, [gun, pike], [enemy], 1000);
  assert.equal(retreat.mode, "seek-cover");
  assert.ok(retreat.destination.position < gun.position);
  assert.deepEqual(portAssaultTacticalDecision(gun, [gun], [enemy], 1000), retreat);
});

test("infantry supports a healthy screen, protects threatened guns, and advances after screen losses", () => {
  const pike = unit("pike", "spearman", .3);
  const gun = unit("gun", "gunner", .37);
  const enemy = unit("enemy", "swordsman", .55, 1, "defender");
  assert.equal(portAssaultTacticalDecision(pike, [pike, gun], [enemy], 0).mode, "support");
  const closeEnemyGunner = unit("enemy-gun", "gunner", .37, 3, "defender");
  assert.equal(portAssaultTacticalDecision(pike, [pike, gun], [closeEnemyGunner], 0).mode, "support",
    "a nearby enemy alone is not permission to abandon our healthy ranged screen");
  enemy.position = .43;
  assert.equal(portAssaultTacticalDecision(gun, [pike, gun], [enemy], 0).mode, "withdraw");
  assert.equal(portAssaultTacticalDecision(pike, [pike, gun], [enemy], 0).mode, "charge");
  enemy.position = .55;
  const fallen = { ...gun, id: "fallen", alive: false };
  assert.equal(portAssaultTacticalDecision(pike, [pike, gun, fallen], [enemy], 0).mode, "charge");
  gun.position = .25;
  assert.equal(portAssaultTacticalDecision(pike, [pike, gun], [enemy], 0).destination.position, pike.position);
});

test("mounted melee charges past its own skirmishers and decisions mirror for the defending side", () => {
  const horse = unit("horse", "horseman", .3);
  const gun = unit("gun", "gunner", .37);
  const enemy = unit("enemy", "swordsman", .55, 1, "defender");
  assert.equal(portAssaultTacticalDecision(horse, [horse, gun], [enemy], 0).mode, "charge");
  const mirror = soldier => ({ ...soldier, position: 1 - soldier.position,
    lastRangedAttackPosition: soldier.lastRangedAttackPosition === null ? null : 1 - soldier.lastRangedAttackPosition,
    side: soldier.side === "attacker" ? "defender" : "attacker" });
  const pike = unit("pike", "spearman", .3);
  gun.lastRangedAttackPosition = gun.position;
  gun.nextPrimaryAttackAtMs = 4000;
  gun.firearmReload = { durationMs: 4000, remainingMs: 4000 };
  const retreat = portAssaultTacticalDecision(gun, [gun, pike], [enemy], 1000);
  const mirrored = portAssaultTacticalDecision(mirror(gun), [mirror(gun), mirror(pike)], [mirror(enemy)], 1000);
  assert.equal(mirrored.mode, retreat.mode);
  assert.ok(Math.abs(mirrored.destination.position - (1 - retreat.destination.position)) < 1e-9);
});

test("reload cover is a fixed short retreat, not a destination that runs away every step", () => {
  const gun = unit("gun", "gunner", .4);
  const enemy = unit("enemy", "swordsman", .6, 1, "defender");
  gun.lastRangedAttackPosition = .4;
  gun.nextPrimaryAttackAtMs = 6000;
  gun.firearmReload = { durationMs: 6000, remainingMs: 6000 };
  const first = portAssaultTacticalDecision(gun, [gun], [enemy], 1200);
  gun.position -= .02;
  const later = portAssaultTacticalDecision(gun, [gun], [enemy], 2000);
  assert.equal(later.destination.position, first.destination.position);
  gun.position = first.destination.position;
  assert.equal(portAssaultTacticalDecision(gun, [gun], [enemy], 3000).destination.position, gun.position);
  gun.position -= .03;
  assert.equal(portAssaultTacticalDecision(gun, [gun], [enemy], 4000).destination.position, gun.position,
    "a threatened gunner already farther back must not advance before loading");
  const archer = unit("bow", "archer", .4);
  archer.lastRangedAttackPosition = .4;
  archer.nextPrimaryAttackAtMs = 3000;
  assert.equal(portAssaultTacticalDecision(archer, [archer], [enemy], 1200).destination.position, .4);
});


test("both firearm troops reload only after reaching cover, and leave it when threatened", () => {
  for (const type of ["gunner", "teppo-ashigaru"]) {
    const gun = unit("gun", type, .4);
    gun.lastRangedAttackPosition = .4;
    gun.firearmReload = { durationMs: 6000, remainingMs: 6000 };
    const enemy = unit("enemy", "swordsman", .6, 1, "defender");
    assert.equal(portAssaultTacticalDecision(gun, [gun], [enemy], 10000).mode, "seek-cover",
      "elapsed wall time must not load a moving gun");
    gun.position = .345;
    assert.equal(portAssaultTacticalDecision(gun, [gun], [enemy], 10000).mode, "reload");
    enemy.position = .4;
    assert.equal(portAssaultTacticalDecision(gun, [gun], [enemy], 10000).mode, "withdraw");
  }
});

test("infantry opens the retreat corridor without following withdrawing guns backward", () => {
  for (const side of ["attacker", "defender"]) {
    const forward = side === "attacker" ? 1 : -1;
    const pike = unit("pike", "spearman", .5, 1, side);
    const gun = { ...unit("gun", "gunner", .5 + forward * .035, 1, side), retreating: true };
    const enemy = unit("enemy", "swordsman", .5 + forward * .3, 1, side === "attacker" ? "defender" : "attacker");
    const decision = portAssaultTacticalDecision(pike, [pike, gun], [enemy], 2000);
    assert.equal(decision.mode, "yield");
    assert.ok(Math.abs(decision.destination.lane - gun.lane) * PORT_ASSAULT_LANE_SPACING >= .02, "make physical passage sideways");
    gun.lane = 3;
    assert.equal(portAssaultTacticalDecision(pike, [pike, gun], [enemy], 2000).mode, "support",
      "an off-path withdrawing gun does not require yielding");
    gun.retreating = false;
    gun.firearmReload = { durationMs: 4000, remainingMs: 2000 };
    assert.ok((portAssaultTacticalDecision(pike, [pike, gun], [enemy], 2000).destination.position - pike.position) * forward >= 0,
      "reloading does not make the infantry follow guns backward");
    gun.firearmReload = null;
    assert.equal(portAssaultTacticalDecision(pike, [pike, gun], [enemy], 2000).mode, "support");
  }
});

test("yielding troops choose the open side of a retreat corridor", () => {
  const pike = unit("pike", "spearman", .5, 1);
  const gun = { ...unit("gun", "gunner", .535, 1), retreating: true };
  const blocker = unit("blocker", "spearman", .49, 1 - .021 / PORT_ASSAULT_LANE_SPACING);
  const enemy = unit("enemy", "swordsman", .8, 1, "defender");
  const decision = portAssaultTacticalDecision(pike, [pike, gun, blocker], [enemy], 2000);
  assert.equal(decision.mode, "yield");
  assert.ok(decision.destination.lane > pike.lane, "the nearer blocked side cannot provide passage");
});

test("gunners hold behind intervening infantry, but withdraw when that protection opens", () => {
  for (const side of ["attacker", "defender"]) {
    const forward = side === "attacker" ? 1 : -1;
    const gun = unit("gun", "gunner", .5, 1, side);
    gun.lastRangedAttackPosition = .5;
    gun.firearmReload = { durationMs: 4000, remainingMs: 2000 };
    const pike = unit("pike", "spearman", .5 + forward * .03, 1, side);
    const enemy = unit("enemy", "swordsman", .5 + forward * .08, 1, side === "attacker" ? "defender" : "attacker");
    assert.equal(portAssaultTacticalDecision(gun, [gun, pike], [enemy], 2000).mode, "reload",
      "the infantry screen protects a stationary reload");
    for (const exposedPike of [{ ...pike, lane: 3 }, { ...pike, alive: false }]) {
      assert.equal(portAssaultTacticalDecision(gun, [gun, exposedPike], [enemy], 2000).mode, "withdraw");
    }
  }
});

test("yielding responds to the nearest withdrawing comrade regardless of roster order", () => {
  const pike = unit("pike", "spearman", .5, 1.2);
  const farther = { ...unit("farther", "gunner", .54, .8), retreating: true };
  const nearer = { ...unit("nearer", "gunner", .525, 1.3), retreating: true };
  const enemy = unit("enemy", "swordsman", .8, 1, "defender");
  const expected = portAssaultTacticalDecision(pike, [pike, nearer], [enemy], 2000);
  for (const allies of [[pike, farther, nearer], [nearer, pike, farther]]) {
    assert.deepEqual(portAssaultTacticalDecision(pike, allies, [enemy], 2000), expected);
  }
});

test("covered gunners reload in close quarters but yield to a retreating comrade", () => {
  const gun = unit("gun", "gunner", .5, 1);
  gun.lastRangedAttackPosition=.56;
  gun.firearmReload={durationMs:4000,remainingMs:2000};
  const friend=unit("friend", "gunner", .52,1);
  const enemy=unit("enemy", "swordsman",.8,1,"defender");
  assert.equal(portAssaultTacticalDecision(gun,[gun,friend],[enemy],2000).mode,"reload");
  friend.retreating = true;
  assert.equal(portAssaultTacticalDecision(gun,[gun,friend],[enemy],2000).mode,"yield");
  const infantry=unit("infantry","spearman",.52,1);
  assert.equal(portAssaultTacticalDecision(gun,[gun,infantry],[enemy],2000).mode,"reload");
});

test("clearing the quay is a one-time landing order, never an order to reverse a retreat", () => {
  const soldier = { ...unit("infantry", "spearman", .34), dockKind: "wood", deploymentLane: 1,
    clearedQuay: false };
  const enemy = unit("enemy", "swordsman", .7, 1, "defender");
  const retreating = { ...unit("retreating", "gunner", .37), retreating: true };
  assert.equal(portAssaultTacticalDecision(soldier, [soldier], [], 2000).mode, "clear-quay");
  assert.equal(portAssaultTacticalDecision(soldier, [soldier], [enemy], 2000).mode, "clear-quay");
  soldier.clearedQuay = true;
  assert.equal(portAssaultTacticalDecision(soldier, [soldier, retreating], [enemy], 2000).mode, "yield",
    "infantry returning toward the quay must clear the gunner's retreat route");
});

test("an all-ranged crew can reload behind its own screen near either rear boundary", () => {
  for (const side of ["attacker", "defender"]) for (const type of ["gunner", "teppo-ashigaru", "archer", "hunter"]) {
    const position = x => side === "attacker" ? x : 1 - x;
    const gun = unit("rear-gunner", type, position(.075), 1.6, side);
    gun.lastRangedAttackPosition = position(.1);
    gun.nextPrimaryAttackAtMs = 6000;
    if (gun.stats.attackType === "firearm") gun.firearmReload = { durationMs: 4000, remainingMs: 2000 };
    const comrade = unit("front-gunner", type, position(.105), 1.6, side);
    const enemy = unit("pursuer", "swordsman", position(.135), 1.6,
      side === "attacker" ? "defender" : "attacker");
    assert.equal(portAssaultTacticalDecision(gun, [gun, comrade], [enemy], 2000).mode, "reload",
      "a ranged comrade can protect the rear rank when there is no infantry");
    assert.equal(portAssaultTacticalDecision(gun, [gun], [enemy], 2000).mode, "withdraw",
      "an exposed gunner must still respond to the pursuer");
    comrade.lane = 0;
    assert.equal(portAssaultTacticalDecision(gun, [gun, comrade], [enemy], 2000).mode, "withdraw",
      "an off-line comrade does not block the enemy's approach");
  }
});
