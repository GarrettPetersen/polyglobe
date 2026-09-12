import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { landCollisionSoundVolume } from './landCollisionSound.js';
const sample = {velocityRad:[0.02,0,0],normal:[1,0,0],topSpeedRad:0.04,nowMs:1000,lastContactAtMs:null};
test('shore impacts get louder with inward speed, while glancing contact stays quiet',()=>{
  const volume=speed=>landCollisionSoundVolume({...sample,velocityRad:[speed,0,0]});
  assert.equal(volume(0),0);
  assert.ok(volume(.005)>0 && volume(.005)<volume(.02) && volume(.02)<volume(.04));
  assert.equal(volume(.4),volume(.04));
  assert.equal(landCollisionSoundVolume({...sample,velocityRad:[0,.04,0]}),0);
  assert.equal(landCollisionSoundVolume({...sample,normal:[3,0,0]}),volume(.02));
});
test('continuous scraping stays silent until the ship has separated from shore',()=>{
  let lastContactAtMs=null;
  for(let nowMs=1000;nowMs<3000;nowMs+=40) {
    const volume=landCollisionSoundVolume({...sample,nowMs,lastContactAtMs});
    assert.equal(volume>0,lastContactAtMs===null);
    lastContactAtMs=nowMs;
  }
  assert.ok(landCollisionSoundVolume({...sample,nowMs:lastContactAtMs+300,lastContactAtMs})>0);
  assert.throws(()=>landCollisionSoundVolume({...sample,normal:[0,0,0]}),/normal/);
  assert.throws(()=>landCollisionSoundVolume({...sample,topSpeedRad:NaN}),/Invalid/);
});
test('actual terrain collision path plays before losing speed, excluding open water and the demo wall',()=>{
  const source=readFileSync(new URL('./main.js',import.meta.url),'utf8');
  const code=source.slice(source.indexOf('function moveShipWithCollision('),source.indexOf('\nfunction recoverPlayerFromNavigationEdge('));
  for(const kind of ['water','demo','land']) {
    const calls=[];
    const context=vm.createContext({ship:{position:[0,0,1],velocity:[.02,0,0],heading:[1,0,0],tileId:1},
      normalizeOrNull:v=>v,projectTangentVector:v=>v,scaleVector:(v,k)=>v.map(n=>n*k),vectorLength:v=>Math.hypot(...v),
      playerRiverGatewayVelocities:()=>[],attemptShipStep:()=>({ok:kind==='water',demoBoundary:kind==='demo',normal:[1,0,0],position:[0,0,1],tileId:1}),
      applyShipMove(){},findShipSlideMove:()=>null,findShipPushOffMove:()=>null,
      SHIP_STOP_DAMPING:.1,SHIP_MIN_SLIDE_SPEED_RAD:.001,
      playLandCollisionSound(normal){calls.push({normal,speed:context.ship.velocity[0]});}
    });
    vm.runInContext(code,context);
    context.moveShipWithCollision(.04,null);
    assert.equal(calls.length,kind==='land'?1:0);
    if(kind==='land') {assert.equal(calls[0].speed,.02);assert.equal(context.ship.velocity[0],.002);}
  }

});

test('river and canal bumps are much quieter and require a long break between contacts', () => {
  const atSea = landCollisionSoundVolume(sample);
  const inRiver = landCollisionSoundVolume({...sample, isRiver:true});
  assert.ok(inRiver > 0 && inRiver <= atSea * 0.1);
  assert.ok(landCollisionSoundVolume({...sample, velocityRad:[.04,0,0], isRiver:true}) < .06);
  for (const gap of [300, 500, 1500, 2499]) {
    assert.equal(landCollisionSoundVolume({...sample, nowMs:3000, lastContactAtMs:3000-gap, isRiver:true}), 0);
  }
  assert.ok(landCollisionSoundVolume({...sample, nowMs:3000, lastContactAtMs:500, isRiver:true}) > 0);
});

test('runtime uses a soft pitched-down wooden thump on waterways and the normal impact at sea', () => {
  const source=readFileSync(new URL('./main.js',import.meta.url),'utf8');
  const code=source.slice(source.indexOf('function playLandCollisionSound('),source.indexOf('\nfunction playArmorGlanceSound('));
  for (const isRiver of [false,true]) {
    const calls=[];
    const context=vm.createContext({ship:{velocity:sample.velocityRad},performance:{now:()=>1000},
      shipIsInRiverWater:()=>isRiver,currentPlayerEffectiveShipStats:()=>({topSpeedRad:sample.topSpeedRad}),
      lastLandCollisionAtMs:null,landCollisionSoundVolume,
      soundEffects:{woodThumpClose:'thump',armorGlance:'crash'},playSoundEffect:(...args)=>calls.push(args)});
    vm.runInContext(code,context);
    context.playLandCollisionSound(sample.normal);
    assert.equal(calls[0][0],isRiver?'thump':'crash');
    assert.equal(calls[0][2],isRiver?.8:.94);
    context.playLandCollisionSound(sample.normal);
    assert.equal(calls.length,1);
  }
});
