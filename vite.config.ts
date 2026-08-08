import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "src/index.ts",
      formats: ["es"],
      fileName: () => "acd-cards.js",
    },
    outDir: "dist",
    emptyOutDir: true,
    minify: true,
  },
});
