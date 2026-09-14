import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const target = env.VITE_API_URL || "https://api.rirfit.com";
  return {
    plugins: [react()],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return undefined;
            if (/[/\\](react|react-dom|scheduler)[/\\]/.test(id)) {
              return "react-vendor";
            }
            if (id.includes("@tanstack")) return "query-vendor";
            if (
              id.includes("framer-motion") ||
              id.includes("motion-dom") ||
              id.includes("motion-utils")
            ) {
              return "motion-vendor";
            }
            if (id.includes("axios")) return "http-vendor";
            if (id.includes("sonner")) return "feedback-vendor";
            return undefined;
          },
        },
      },
    },
    server: {
      proxy: {
        "/api": {
          target,
          changeOrigin: true,
          secure: true,
        },
      },
    },
  };
});
