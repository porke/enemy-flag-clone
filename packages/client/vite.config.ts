import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@enemy-flag/engine": resolve(__dirname, "../engine/src/index.ts"),
      "@enemy-flag/ai": resolve(__dirname, "../ai/src/index.ts"),
    },
  },
});
