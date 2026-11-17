import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://demo.equiptracker.rk8.dev",
  output: "static",
  build: { assetsPrefix: "." },
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
});
