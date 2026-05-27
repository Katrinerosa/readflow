import node from "@astrojs/node";
import { defineConfig } from "astro/config";

export default defineConfig({
  output: "server", // SSR (so we can have API routes)
  adapter: node({
    mode: "standalone"
  }),
  server: {
    port: 3000,
    host: true, // Listen on all network interfaces (0.0.0.0)
    proxy: {
      // Proxy /reader/* to Vue dev server in development
      "/reader": {
        target: process.env.NODE_ENV === "development"
          ? "http://reader:5173"  // Docker service name in dev mode
          : "http://localhost:5173", // Fallback for local dev
        changeOrigin: true,
        rewrite: (path) => path, // Keep the path as-is
      },
    },
  },
  vite: {
    define: {
      "import.meta.env.PUBLIC_DIRECTUS_URL": JSON.stringify(
        process.env.PUBLIC_DIRECTUS_URL || "http://localhost:8055"
      ),
    },
    ssr: {
      noExternal: [],
    },
  },
});
