import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Use relative paths for all assets - works from any subfolder (/price, /pricing, etc.)
  base: "./",
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Ensure clean output
    outDir: "dist",
    emptyDirBeforeWrite: true,
    // Generate source maps for debugging (optional, can be set to false for production)
    sourcemap: false,
  },
}));
