import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as rules from './citySceneRules.js';
const source=readFileSync(new URL('./main.js',import.meta.url),'utf8');
const code=source.slice(source.indexOf('function advanceCamera('),source.indexOf('function sceneWindow('));
for (const target of [null,0.8]) test(`hovering a destination immediately stops camera inertia (target ${target})`,()=>{
  const state={lastRenderTimeMs:100,features:{approach:'ocean'},cameraPanTarget:target,
    pointer:{x:399,y:100},cameraVelocity:0.5,parallax:0.2};
  const runtime={...rules,state,CITY_VISUALIZER_BENCHMARK:null,prefersReducedMotion:{matches:false},
    canvas:{width:400},destinationLabelAtPoint:()=>({id:'market'})};
  vm.runInNewContext(`${code}\nadvanceCamera(116)`,runtime);
  assert.equal(state.parallax,0.2);assert.equal(state.cameraVelocity,0);
});
