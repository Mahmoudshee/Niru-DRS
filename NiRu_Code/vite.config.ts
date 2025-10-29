import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return ({
  server: {
    host: "::",
    port: 8081,
    proxy: {
      // Local dev only: proxy to OpenRouter with server-side header
      "/api/policy-assistant": {
        target: "https://openrouter.ai",
        changeOrigin: true,
        secure: true,
        headers: {
          Authorization: `Bearer ${env.OPENROUTER_API_KEY || ""}`,
          "Content-Type": "application/json",
        },
        rewrite: (path) => path.replace(/^\/api\/policy-assistant$/, "/api/v1/chat/completions"),
      },
    },
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  });
});
