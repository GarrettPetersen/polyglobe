import test from "node:test";
import assert from "node:assert/strict";
import { portAssaultShotIsClear, portAssaultTacticalDecision } from "./portAssaultTactics.js";
import { portAssaultUnitStats } from "./portAssaultBattle.js";
const unit = (id, type, position, lane = 1, side = "attacker") => ({
  id, side, position, lane, alive: true, spawned: true, landed: true,
  lastRangedAttackPosition: null, firearmReload: null,
  stats: portAssaultUnitStats({ id, crewTypeId: type, combatProfileId: type, appearanceId: type, experienceStars: 1, auxiliary: false }), nextPrimaryAttackAtMs: 0
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
