import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const OPENROUTER_API_KEY = env.OPENROUTER_API_KEY || "";
  const OPENROUTER_REFERER = env.OPENROUTER_REFERER || "http://localhost:8081";
  return ({
  server: {
    host: "::",
    port: 8081,
    proxy: {
      "/api/openrouter": {
        target: "https://openrouter.ai",
        changeOrigin: true,
        secure: true,
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "HTTP-Referer": OPENROUTER_REFERER,
          "X-Title": "Policy Assistant Prototype",
        },
        rewrite: (path) => path.replace(/^\/api\/openrouter$/, "/api/v1/chat/completions"),
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
