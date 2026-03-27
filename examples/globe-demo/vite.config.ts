import path from "path";
import { defineConfig } from "vite";

const root = path.resolve(__dirname);
export default defineConfig({
  root,
  publicDir: path.join(root, "public"),
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
        riverHex: path.resolve(__dirname, "river-hex-viewer.html"),
        riverBankHex: path.resolve(__dirname, "river-bank-hex-viewer.html"),
        assetViewer: path.resolve(__dirname, "asset-viewer.html"),
        buildingViewer: path.resolve(__dirname, "building-viewer.html"),
      },
    },
  },
  resolve: {
    // Aliased ../../src otherwise resolves `three` from repo root; demo resolves from here — two copies → runtime warning.
    dedupe: ["three"],
    alias: {
      polyglobe: path.resolve(__dirname, "../../src/index.ts"),
      // Source under ../../src imports these; Rollup does not use globe-demo/node_modules for those paths.
      earcut: path.resolve(__dirname, "node_modules/earcut"),
      "polygon-clipping": path.resolve(__dirname, "node_modules/polygon-clipping"),
    },
  },
  optimizeDeps: {
    include: ["jszip"],
  },
});
