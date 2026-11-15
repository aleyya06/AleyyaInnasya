import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const page = (path: string) => fileURLToPath(new URL(path, import.meta.url));

// Two HTML entry points keep the live URLs unchanged: / and /projects/snake-game.html
export default defineConfig({
  plugins: [react()],
  build: {
    // The 3D scene chunk (three.js alone is ~700 kB) is lazy-loaded after the page renders;
    // everything on the first paint is far below this.
    chunkSizeWarningLimit: 1000,
    rolldownOptions: {
      input: {
        main: page("./index.html"),
        snake: page("./projects/snake-game.html"),
      },
    },
  },
});
