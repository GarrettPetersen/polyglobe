import test from 'node:test';
import assert from 'node:assert/strict';
import { createCityAssaultShipEffects, cityAssaultShipEffectsFrame, cityAssaultEscapeUrgency } from '../city-visualizer/cityAssaultShipEffects.js';
import { shipSinkSubmersionTimeMs, SHIP_SINK_EFFECT_DURATION_MS } from './shipSinking.js';
const pixels = Array.from({length:24},(_,i)=>({x:i,y:10+i%3,sinkHeight:.25+i*.015,alpha:1,color:'#976d53'}));
const presentation = (patch={})=>({elapsedMs:1000,shipHitPoints:20,shipMaxHitPoints:100,shipSunkAtMs:null,lastShipHitAtMs:900,events:[],...patch});
test('ship impacts throw a few fragments matching real hull pixels',()=>{
 const model=createCityAssaultShipEffects(pixels,32,32);
 const frame=cityAssaultShipEffectsFrame(model,presentation({events:[{type:'ship-hit',unitId:'guard-1',timeMs:900,damage:4}]}));
 assert.ok(frame.splinters.length>0&&frame.splinters.length<=12);
 assert.ok(frame.splinters.every(p=>p.color==='#976d53'));
 assert.equal(cityAssaultShipEffectsFrame(model,presentation({shipHitPoints:90})).fires.length,0);
});
test('fires are bound to actual height pixels and extinguish individually into smoke when submerged',()=>{
 const model=createCityAssaultShipEffects(pixels,32,32);
 const p=presentation({shipHitPoints:0,shipSunkAtMs:1000});
 const first=cityAssaultShipEffectsFrame(model,p);
 assert.equal(first.fires.length,3);
 assert.ok(model.anchors.every(a=>pixels.includes(a)));
 const extinction=shipSinkSubmersionTimeMs(model.sink,model.anchors[0].sinkHeight);
 const after=cityAssaultShipEffectsFrame(model,{...p,elapsedMs:extinction+20});
 assert.ok(after.fires.length<3);
 assert.ok(after.smoke.length>0);
 const final=cityAssaultShipEffectsFrame(model,{...p,elapsedMs:1000+SHIP_SINK_EFFECT_DURATION_MS});
 assert.equal(final.sink.complete,true);
 assert.equal(final.fires.length,0);
 assert.equal(final.smoke.length,0);
 assert.equal(final.sink.hullPixels.length,0);
});
test('escape warning grows and pulses after a hit, remains calm for reduced motion, and ends on sinking',()=>{
 assert.ok(cityAssaultEscapeUrgency(presentation()).scale>1);
 assert.notEqual(cityAssaultEscapeUrgency(presentation()).flash,cityAssaultEscapeUrgency(presentation({elapsedMs:1600})).flash);
 assert.deepEqual(cityAssaultEscapeUrgency(presentation(),true),{scale:1.15,flash:true});
 assert.equal(cityAssaultEscapeUrgency(presentation({elapsedMs:4000})).scale,1);
 assert.equal(cityAssaultEscapeUrgency(presentation({shipHitPoints:0})).scale,1);
});

test('every docked hull supplies fire anchors above its baked waterline', async () => {
 const { readFile } = await import('node:fs/promises');
 const { createCanvas, loadImage } = await import('../../../examples/globe-demo/node_modules/canvas/index.js');
 const { SHIP_WATERLINE_LEVEL } = await import('./shipWaterline.js');
 const manifest = JSON.parse(await readFile(new URL('../public/assets/vehicles/unity-ships/port-assault/manifest.json', import.meta.url), 'utf8'));
 for (const ship of manifest.ships) {
  const file = new URL('../../../' + ship.cityDockside.sinkDepthFile, import.meta.url);
  const image = await loadImage(file.pathname);
  const canvas = createCanvas(image.width, image.height);
  const context = canvas.getContext('2d');
  context.drawImage(image, 0, 0);
  const rgba = context.getImageData(0, 0, image.width, image.height).data;
  const surface = [];
  for (let i = 0; i < rgba.length; i += 4) if (rgba[i + 3] > 16) {
   surface.push({ x: (i / 4) % image.width, y: Math.floor(i / 4 / image.width),
    alpha: rgba[i + 3] / 255, color: '#ffffff', sinkHeight: rgba[i] / 255 });
  }
  const model = createCityAssaultShipEffects(surface, image.width, image.height);
  assert.ok(model.anchors.every(anchor => anchor.sinkHeight > SHIP_WATERLINE_LEVEL), ship.slug);
 }
});
