import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  base: "/reader/", // important: so assets resolve under Astro /reader
  server: {
    port: 5173,
    host: true, // Listen on all network interfaces (0.0.0.0)
    strictPort: true,
    allowedHosts: [".localhost", "reader", "web"], // Allow proxied requests from web service
  },
  build: {
    outDir: "dist",
  },
  define: {
    "import.meta.env.PUBLIC_DIRECTUS_URL": JSON.stringify(
      process.env.PUBLIC_DIRECTUS_URL || "http://localhost:8055"
    ),
  },
});
