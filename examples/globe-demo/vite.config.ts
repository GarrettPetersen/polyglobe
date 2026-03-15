import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: {
      polyglobe: path.resolve(__dirname, "../../src/index.ts"),
    },
  },
});
