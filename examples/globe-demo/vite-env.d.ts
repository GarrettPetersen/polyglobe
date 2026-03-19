/// <reference types="vite/client" />

declare module "*.gltf?url" {
  const url: string;
  export default url;
}
declare module "*.glb?url" {
  const url: string;
  export default url;
}
