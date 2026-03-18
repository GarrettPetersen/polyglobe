import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
        riverHex: path.resolve(__dirname, "river-hex-viewer.html"),
        riverBankHex: path.resolve(__dirname, "river-bank-hex-viewer.html"),
      },
    },
  },
  resolve: {
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
