import { WORLD_GLOBE_SUBDIVISIONS } from "../src/worldScale.js";
import {readFile,writeFile,mkdir} from "node:fs/promises";
import {createHash} from "node:crypto";
import {dirname} from "node:path";
import {decodeGeodesicGraphBake} from "../src/geodesicBake.js";
import {createDirectionIndex,findNearestTileId} from "../src/geodesic.js";
import {minimapUnprojectLatitude} from "../src/minimapViewport.js";
import {MINIMAP_BAKE_WIDTH as width,MINIMAP_BAKE_HEIGHT as height,MINIMAP_BAKE_HEADER_BYTES as headerBytes,MINIMAP_BAKE_MAX_LATITUDE,decodeMinimapBake} from "../src/minimapBake.js";

export async function ensureMinimapBake(graphPath, outputPath) {
  const graphBytes=await readFile(graphPath);
  const digest=createHash("sha256").update(graphBytes)
    .update(await readFile(new URL("../src/geodesic.js",import.meta.url)))
    .update(await readFile(new URL("../src/minimapViewport.js",import.meta.url)))
    .update(JSON.stringify({width,height,maxLatitude:MINIMAP_BAKE_MAX_LATITUDE,version:1})).digest();
  const graph=decodeGeodesicGraphBake(graphBytes.buffer.slice(graphBytes.byteOffset,graphBytes.byteOffset+graphBytes.byteLength),WORLD_GLOBE_SUBDIVISIONS);
  try {
    const existing=await readFile(outputPath);
    if (existing.subarray(24,56).equals(digest)) {
      decodeMinimapBake(existing.buffer.slice(existing.byteOffset,existing.byteOffset+existing.byteLength),graph.tileCount);
      return;
    }
  } catch(error) { if (error.code!=="ENOENT") throw error; }
  const buffer=new ArrayBuffer(headerBytes+width*height*3), bytes=new Uint8Array(buffer), header=new DataView(buffer);
  header.setUint32(0,0x50414d4d,true);header.setUint32(4,1,true);
  header.setUint32(8,width,true);header.setUint32(12,height,true);header.setUint32(16,graph.tileCount,true);
  bytes.set(digest,24);
  const index=createDirectionIndex(graph);
  for(let y=0;y<height;y++) {
    const lat=minimapUnprojectLatitude(y+.5,MINIMAP_BAKE_MAX_LATITUDE,height)*Math.PI/180;
    for(let x=0;x<width;x++) {
      const lon=(-180+(x+.5)/width*360)*Math.PI/180;
      const id=findNearestTileId(graph,index,[Math.cos(lat)*Math.cos(lon),Math.sin(lat),-Math.cos(lat)*Math.sin(lon)]);
      const p=headerBytes+(y*width+x)*3;
      bytes[p]=id&255;bytes[p+1]=(id>>>8)&255;bytes[p+2]=id>>>16;
    }
  }
  decodeMinimapBake(buffer,graph.tileCount);
  await mkdir(dirname(outputPath),{recursive:true});await writeFile(outputPath,bytes);
  console.log(`Baked ${width}x${height} captain chart lookup (${bytes.length} bytes)`);
}
