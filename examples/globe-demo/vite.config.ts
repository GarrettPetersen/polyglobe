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
    },
  },
  optimizeDeps: {
    include: ["jszip"],
  },
});
