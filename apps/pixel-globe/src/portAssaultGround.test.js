import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createCanvas, loadImage } from "../../../examples/globe-demo/node_modules/canvas/index.js";
import { portAssaultGroundLaneBounds, PORT_ASSAULT_TRACK_START_X, PORT_ASSAULT_TRACK_SPAN_PX, PORT_ASSAULT_REAR_FEET_Y, PORT_ASSAULT_LANE_SPACING, PORT_ASSAULT_GROUND_DEPTH_SCALE } from "./portAssaultGround.js";
import { portAssaultFormationStep } from "./portAssaultFormation.js";
import { cityAssaultWaterDepthPx, cityGateGroundFeetY, CITY_GATE_GROUND } from "../city-visualizer/cityAssaultGround.js";
import { CITY_GATE_TRAVERSAL_PATHS, cityNpcPathPoint, cityPortAssaultLaneFeetY } from "../city-visualizer/cityPainterOrder.js";
const manifest=JSON.parse(readFileSync(new URL("../city-visualizer/assets/port-parallax/manifest.json",import.meta.url)));
const atlas=await loadImage(new URL("../city-visualizer/assets/port-parallax/static.png",import.meta.url).pathname);

test("every regional gate keeps all street depths below its rear jamb and behind its near jamb", () => {
  for (const gate of manifest.staticFrames.filter(f => f.layer === "Gate" || f.regionalOf === "Gate")) {
    const canvas = createCanvas(1365, 910), context = canvas.getContext("2d");
    const r = gate.frame, s = gate.spriteSourceSize;
    context.drawImage(atlas, r.x, r.y, r.w, r.h, s.x, s.y, r.w, r.h);
    const pixels = context.getImageData(0, 0, 1365, 910).data;
    for (let x = CITY_GATE_GROUND.entranceX; x <= 1289; x++) {
      for (let lane = 0; lane <= 3; lane += .125) {
        const y = Math.round(cityGateGroundFeetY(x, cityPortAssaultLaneFeetY(lane), true));
        assert.equal(pixels[(y * 1365 + x) * 4 + 3], 0,
          `${gate.layer}: feet intersect the gate masonry at ${x},${y}`);
      }
    }
    for (const path of CITY_GATE_TRAVERSAL_PATHS) {
      const y = Math.round(cityGateGroundFeetY(path.endX, path.endFeetY, true));
      assert.ok(pixels[(y * 1365 + path.endX) * 4 + 3] > 0,
        `${gate.layer}: the path must end inside the opaque gate front`);
    }
  }
});

test("gate approaches are continuous in both directions for civilians and all assault rows", () => {
  for (const feetY of [490, 500, 518, 530, 544, 547.6, 565, 578]) {
    const path = Array.from({length: 141}, (_, index) =>
      cityGateGroundFeetY(1190 + index, feetY, true));
    for (let i = 1; i < path.length; i++) assert.ok(Math.abs(path[i] - path[i - 1]) < 1.5);
    assert.equal(path[0], feetY);
    assert.ok(path.at(-1) >= CITY_GATE_GROUND.rearFeetY && path.at(-1) <= CITY_GATE_GROUND.frontFeetY);
    assert.deepEqual([...path].reverse(), Array.from({length: 141}, (_, i) =>
      cityGateGroundFeetY(1330 - i, feetY, true)));
    assert.equal(cityGateGroundFeetY(1320, feetY, false), feetY, "open towns retain full street depth");
  }
  for (const path of CITY_GATE_TRAVERSAL_PATHS) for (let step = 0; step <= 100; step++) {
    const point = cityNpcPathPoint(path, step / 100);
    if (point.x < CITY_GATE_GROUND.entranceX) continue;
    const y = cityGateGroundFeetY(point.x, point.feetY, true);
    assert.ok(y >= CITY_GATE_GROUND.rearFeetY && y <= CITY_GATE_GROUND.frontFeetY);
  }
  assert.throws(() => cityGateGroundFeetY(NaN, 522, true), /Invalid city gate/);
  assert.throws(() => cityGateGroundFeetY(1254, 522, undefined), /Invalid city gate/);
});

test("every allowed quay position lies on authored ground, not the ocean or dock pilings",()=>{
  for (const dockKind of ["wood","stone"]) {
    const canvas=createCanvas(1365,910);const c=canvas.getContext("2d");
    for (const layer of ["Sand Beach","Road",dockKind==="wood"?"Dock":"Stone Dock"]) {
      const f=manifest.staticFrames.find(f=>f.layer===layer);
      c.drawImage(atlas,f.frame.x,f.frame.y,f.frame.w,f.frame.h,f.spriteSourceSize.x,f.spriteSourceSize.y,f.frame.w,f.frame.h);
    }
    const pixels=c.getImageData(0,0,1365,910).data;
    for (let x=PORT_ASSAULT_TRACK_START_X;x<=1332;x++) {
      const bounds=portAssaultGroundLaneBounds((x-PORT_ASSAULT_TRACK_START_X)/PORT_ASSAULT_TRACK_SPAN_PX,dockKind);
      for (let i=0;i<=10;i++) {
        const lane=bounds.minimum+(bounds.maximum-bounds.minimum)*i/10;
        const y=Math.round(PORT_ASSAULT_REAR_FEET_Y+lane*PORT_ASSAULT_LANE_SPACING*PORT_ASSAULT_TRACK_SPAN_PX*PORT_ASSAULT_GROUND_DEPTH_SCALE);
        assert.ok(pixels[(y*1365+x)*4+3]>16,`${dockKind}: walking over water at ${x},${y}`);
      }
    }
  }
});

test("walking and knockback cannot cross quay boundaries from either direction",()=>{
  for(const dockKind of ["wood","stone"]) for(const lane of [1.3,2.3]) {
    const unit={id:"soldier",position:.04,lane,dockKind,stats:{mounted:false}};
    for(const destination of [{position:0,lane:0},{position:0,lane:3},{position:.4,lane:0}]) {
      const step=portAssaultFormationStep(unit,destination,.3,[]);
      const bounds=portAssaultGroundLaneBounds(step.position,dockKind);
      assert.ok(step.lane>=bounds.minimum-1e-8&&step.lane<=bounds.maximum+1e-8);
    }
  }
});

test("beach depth follows shore position both ashore and back into the water",()=>{
  const rows=[[[40,100]]];
  const route=[0,20,30,35,40,60];
  const depths=route.map(x=>cityAssaultWaterDepthPx(x,0,rows));
  assert.deepEqual(depths,[6,4,2,1,0,0]);
  assert.deepEqual([...route].reverse().map(x=>cityAssaultWaterDepthPx(x,0,rows)),[...depths].reverse());
  assert.equal(cityAssaultWaterDepthPx(120,0,rows),0,"the city beyond the beach artwork is dry land");
  assert.equal(cityAssaultWaterDepthPx(20,0,rows),4,"waiting offshore never expires the water state");
});

test("a beach assault takes attackers ashore and pursuing defenders back into the shallows to hit the ship", async () => {
  const { createPortAssaultScenario, simulatePortAssault } = await import("./portAssaultBattle.js");
  const soldier = id => ({ id, appearanceId: "swordsman-light", crewTypeId: "swordsman",
    combatProfileId: "swordsman", experienceStars: 1, auxiliary: false });
  const battle = simulatePortAssault(createPortAssaultScenario({
    cityId: "tunis|tunisia", dockKind: "none", fortified: true,
    attackers: [soldier("landing-soldier")],
    defenders: Array.from({ length: 12 }, (_, i) => soldier(`pursuer-${i}`)),
    shipHitPoints: 80, shipMaxHitPoints: 100
  }), 19);
  const beach = manifest.staticFrames.find(frame => frame.layer === "Sand Beach");
  const canvas = createCanvas(beach.frame.w, beach.frame.h);
  const context = canvas.getContext("2d");
  context.drawImage(atlas, beach.frame.x, beach.frame.y, beach.frame.w, beach.frame.h,
    0, 0, beach.frame.w, beach.frame.h);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const rows = Array.from({ length: canvas.height }, (_, y) => {
    const runs = [];
    let start = -1;
    for (let x = 0; x <= canvas.width; x++) {
      const opaque = x < canvas.width && pixels[(y * canvas.width + x) * 4 + 3] > 16;
      if (opaque && start < 0) start = x;
      if (!opaque && start >= 0) { runs.push([start, x]); start = -1; }
    }
    return runs;
  });
  const depth = frame => cityAssaultWaterDepthPx(
    PORT_ASSAULT_TRACK_START_X + frame.position * PORT_ASSAULT_TRACK_SPAN_PX - beach.spriteSourceSize.x,
    PORT_ASSAULT_REAR_FEET_Y + frame.lane * PORT_ASSAULT_LANE_SPACING *
      PORT_ASSAULT_TRACK_SPAN_PX * PORT_ASSAULT_GROUND_DEPTH_SCALE - beach.spriteSourceSize.y, rows);
  const landing = battle.tracks["landing-soldier"].filter(frame => !frame.hidden && frame.alive && frame.animationId !== "jump");
  assert.ok(landing.some(frame => depth(frame) > 0), "landing starts in water");
  assert.ok(landing.some(frame => depth(frame) === 0), "attacker reaches dry land");
  const shipHits = battle.events.filter(event => event.type === "ship-hit");
  assert.ok(shipHits.length > 0, "defenders reach and attack the ship");
  for (const id of new Set(shipHits.map(event => event.unitId))) {
    const pursuit = battle.tracks[id].filter(frame => !frame.hidden && frame.alive);
    assert.equal(depth(pursuit[0]), 0, "defender starts on dry land");
    assert.ok(pursuit.some(frame => depth(frame) > 0), "defender descends into water on the way to the ship");
  }
});
