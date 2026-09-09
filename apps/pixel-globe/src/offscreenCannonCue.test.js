import assert from 'node:assert/strict';
import test from 'node:test';
import { offscreenCannonCue } from './offscreenCannonCue.js';
test('cannon glow follows the precise bearing, including corners', () => {
  for (const [point, expected] of [
    [{x:500,y:100}, {x:400,y:100}],
    [{x:-100,y:100}, {x:0,y:100}],
    [{x:600,y:300}, {x:400,y:200}],
    [{x:250,y:-100}, {x:225,y:0}]
  ]) {
    const cue = offscreenCannonCue(point,400,200,0);
    assert.equal(cue.x,expected.x); assert.equal(cue.y,expected.y);
  }
});
test('visible cannons have no cue; offscreen glow fades and expires after five seconds', () => {
  assert.equal(offscreenCannonCue({x:50,y:50},400,200,0),null);
  const point={x:500,y:100};
  assert.equal(offscreenCannonCue(point,400,200,2500).opacity,0.325);
  assert.equal(offscreenCannonCue(point,400,200,5000),null);
  assert.equal(offscreenCannonCue(point,400,200,-1),null);
});
