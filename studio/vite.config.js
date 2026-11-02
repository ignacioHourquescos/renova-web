import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { landingStudioPlugin } from "./server/plugin.js";

export default defineConfig({
  plugins: [react(), landingStudioPlugin()],
  server: {
    open: "/landings",
    watch: {
      ignored: ["**/export/**", "**/export-tmp/**", "**/sites/**"],
    },
  },
});
