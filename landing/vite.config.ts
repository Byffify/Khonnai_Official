import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: "./", // relative URLs so the built site works from any folder, e.g. GitHub Pages
  plugins: [react(), tailwindcss()],
  server: { port: 5180 },
});
