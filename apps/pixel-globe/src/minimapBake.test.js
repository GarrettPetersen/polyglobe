import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {decodeMinimapBake,createMinimapPixelCache,MINIMAP_BAKE_WIDTH,MINIMAP_BAKE_HEIGHT} from "./minimapBake.js";

test("prebaked chart rejects missing, incompatible and corrupt geography", () => {
  const bytes=readFileSync(new URL("../public/assets/data/minimap-lookup.bin",import.meta.url));
  const buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
  const map=decodeMinimapBake(buffer,655362);
  assert.equal(map.width,MINIMAP_BAKE_WIDTH);assert.equal(map.height,MINIMAP_BAKE_HEIGHT);
  assert.throws(()=>decodeMinimapBake(buffer,123),/Incompatible/);
  assert.throws(()=>decodeMinimapBake(new ArrayBuffer(2),655362),/Truncated/);
  new Uint8Array(buffer).fill(255,64,67);
  assert.throws(()=>decodeMinimapBake(buffer,655362),/Invalid minimap tile/);
});

test("cached chart updates discoveries and changed terrain without rebuilding other pixels", () => {
  const map={width:4,height:2,tiles:Uint8Array.from([0,1,1,0,0,2,2,0].flatMap(id=>[id,0,0]))};
  const cache=createMinimapPixelCache(map,3,[10,20,30]);
  const pixel=p=>[...cache.pixels.slice(p*4,p*4+4)];
  const allocation=cache.pixels;
  cache.takeDirtyBounds();
  cache.paintTile(1,[100,110,120]);
  assert.deepEqual(pixel(1),[100,110,120,255]);
  assert.deepEqual(pixel(5),[10,20,30,255],"undiscovered land remains concealed");
  assert.deepEqual(cache.takeDirtyBounds(),{x:1,y:0,right:3,bottom:1});
  cache.paintTile(1,[50,60,70]);
  assert.deepEqual(pixel(1),[50,60,70,255],"canal changes can replace known land with water");
  cache.paintTile(0,[1,2,3]);
  assert.deepEqual(pixel(0),pixel(3),"both ends of a seam-crossing tile are painted");
  cache.reset();
  assert.deepEqual(pixel(1),[10,20,30,255],"new games and restored saves clear old discoveries");
  assert.equal(cache.pixels,allocation,"the background allocation is retained");
  assert.throws(()=>cache.paintTile(-1,[1,2,3]),/Invalid/);
});
