// Tile IDs here identify spatial samples, never settlements or other entities.
export const MINIMAP_BAKE_WIDTH = 2048;
export const MINIMAP_BAKE_HEIGHT = 1024;
export const MINIMAP_BAKE_MAX_LATITUDE = 72;
export const MINIMAP_BAKE_HEADER_BYTES = 64;

export function decodeMinimapBake(buffer, expectedTileCount) {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < MINIMAP_BAKE_HEADER_BYTES) throw new Error("Truncated minimap bake");
  const header = new DataView(buffer);
  const width = header.getUint32(8,true), height = header.getUint32(12,true);
  const tileCount = header.getUint32(16,true);
  if (header.getUint32(0,true) !== 0x50414d4d || header.getUint32(4,true) !== 1 ||
      width !== MINIMAP_BAKE_WIDTH || height !== MINIMAP_BAKE_HEIGHT || tileCount !== expectedTileCount ||
      bytes.length !== MINIMAP_BAKE_HEADER_BYTES + width * height * 3) throw new Error("Incompatible minimap bake");
  const tiles = bytes.subarray(MINIMAP_BAKE_HEADER_BYTES);
  for (let p=0;p<tiles.length;p+=3) {
    if ((tiles[p] | tiles[p+1]<<8 | tiles[p+2]<<16) >= tileCount) throw new Error(`Invalid minimap tile at sample ${p/3}`);
  }
  return {width,height,tiles};
}

export function createMinimapPixelCache(map, tileCount, unknownColor) {
  const pixels = new Uint8ClampedArray(map.width * map.height * 4);
  const bounds = new Uint16Array(tileCount * 4);
  for (let id=0;id<tileCount;id++) {bounds[id*4]=65535;bounds[id*4+1]=65535;}
  const tileAt = p => map.tiles[p*3] | map.tiles[p*3+1]<<8 | map.tiles[p*3+2]<<16;
  for (let p=0;p<map.width*map.height;p++) {
    const id=tileAt(p), x=p%map.width, y=Math.floor(p/map.width), at=id*4;
    if (id>=tileCount) throw new Error(`Unknown tile in minimap cache: ${id}`);
    bounds[at]=Math.min(bounds[at],x);bounds[at+1]=Math.min(bounds[at+1],y);
    bounds[at+2]=Math.max(bounds[at+2],x);bounds[at+3]=Math.max(bounds[at+3],y);
  }
  let dirty = null;
  function reset() {
    for (let p=0;p<pixels.length;p+=4) {pixels[p]=unknownColor[0];pixels[p+1]=unknownColor[1];pixels[p+2]=unknownColor[2];pixels[p+3]=255;}
    dirty={x:0,y:0,right:map.width,bottom:map.height};
  }
  function paintTile(id,color) {
    if (!Number.isInteger(id)||id<0||id>=tileCount) throw new Error(`Invalid minimap reveal tile: ${id}`);
    const at=id*4,left=bounds[at],top=bounds[at+1],right=bounds[at+2]+1,bottom=bounds[at+3]+1;
    if (left===65535) return;
    for(let y=top;y<bottom;y++) for(let x=left;x<right;x++) {
      const p=y*map.width+x;
      if(tileAt(p)!==id) continue;
      pixels[p*4]=color[0];pixels[p*4+1]=color[1];pixels[p*4+2]=color[2];pixels[p*4+3]=255;
    }
    dirty=dirty?{x:Math.min(dirty.x,left),y:Math.min(dirty.y,top),right:Math.max(dirty.right,right),bottom:Math.max(dirty.bottom,bottom)}
      :{x:left,y:top,right,bottom};
  }
  reset();
  return {pixels,paintTile,reset,takeDirtyBounds(){const result=dirty;dirty=null;return result;}};
}
