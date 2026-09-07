import test from "node:test";
import assert from "node:assert/strict";
import { authoredRigAlignment, selectAuthoredRigComponents } from "../tools/authored-ship-rig.mjs";

test("authored sails register through every shared hull vertex without changing orientation", () => {
  const source = [{x:0,y:0,z:0},{x:2,y:1,z:4},{x:-1,y:3,z:7}];
  const target = source.map(p => ({x:p.x*2+5,y:p.y*2-3,z:p.z*2+1}));
  const {transform} = authoredRigAlignment(source,target);
  assert.deepEqual(source.map(transform),target);
  assert.throws(()=>authoredRigAlignment(source,target.slice(1)),/topology/);
  assert.throws(()=>authoredRigAlignment(source,target.map(p=>({...p,x:-p.x}))),/orientation/);
  assert.throws(()=>authoredRigAlignment(source,target.map(p=>({...p,y:p.y*2}))),/orientation/);
  assert.throws(()=>authoredRigAlignment(source,[...target.slice(0,2),{x:NaN,y:1,z:3}]),/finite/);
});

test("authored cloth follows retained yards and rejects incomplete or ambiguous rigs", () => {
  const yards=[0,3,6].map(x=>({start:{x,y:0,z:0},end:{x,y:0,z:10}}));
  const centers=[{x:0,y:0.1,z:2},{x:0,y:0.1,z:7},{x:3,y:0.1,z:2},{x:3,y:0.1,z:7},{x:6,y:0.1,z:4}];
  const choose=(supports,expectedCount)=>selectAuthoredRigComponents(centers,supports,{maxDistance:0.5,expectedCount});
  assert.deepEqual(choose(yards,5),[0,1,2,3,4]);
  assert.deepEqual(choose(yards.slice(0,2),4),[0,1,2,3]);
  assert.deepEqual(choose(yards.slice(0,1),2),[0,1]);
  assert.throws(()=>choose(yards,4),/wrong number/);
  assert.throws(()=>choose([...yards,{start:{x:20,y:0,z:0},end:{x:20,y:0,z:10}}],5),/no authored/);
  assert.throws(()=>choose([yards[0],yards[0]],2),/ambiguously/);
});
