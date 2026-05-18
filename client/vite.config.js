import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
import { defineConfig, loadEnv } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Load VITE_* vars from repo root and client/ (client wins). */
function loadMergedEnv(mode) {
  const fromRoot = loadEnv(mode, path.resolve(__dirname, ".."), "VITE_");
  const fromClient = loadEnv(mode, __dirname, "VITE_");
  return { ...fromRoot, ...fromClient };
}

export default defineConfig(({ mode }) => {
  const env = loadMergedEnv(mode);
  const googleClientId =
    env.VITE_GOOGLE_CLIENT_ID?.trim() ||
    loadEnv(mode, path.resolve(__dirname, ".."), "")["GOOGLE_CLIENT_ID"]?.trim() ||
    loadEnv(mode, __dirname, "")["GOOGLE_CLIENT_ID"]?.trim() ||
    "";

  return {
    plugins: [react(), tailwindcss()],
    define: {
      "import.meta.env.VITE_GOOGLE_CLIENT_ID": JSON.stringify(googleClientId),
    },
    server: {
      port: 5173,
      host: "localhost",
      strictPort: true,
      proxy: {
        "/api": {
          target: "http://localhost:3001",
          changeOrigin: true,
        },
      },
    },
  };
});
