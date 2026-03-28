import path from "path";
import { defineConfig } from "vite";

const root = path.resolve(__dirname);
const repoRoot = path.resolve(__dirname, "../..");
const globeDemoDir = path.resolve(repoRoot, "examples/globe-demo");

export default defineConfig({
  root,
  publicDir: path.join(globeDemoDir, "public"),
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(root, "index.html"),
      },
    },
  },
  resolve: {
    dedupe: ["three"],
    alias: {
      polyglobe: path.resolve(repoRoot, "src/index.ts"),
      earcut: path.resolve(root, "node_modules/earcut"),
      "polygon-clipping": path.resolve(root, "node_modules/polygon-clipping"),
    },
  },
  server: {
    fs: {
      allow: [repoRoot],
    },
  },
  optimizeDeps: {
    include: ["jszip"],
  },
});
