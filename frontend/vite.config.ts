import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Backend base URL: the API client (src/api.ts) defaults to
// http://127.0.0.1:8001 and can be overridden with VITE_API_BASE_URL.
export default defineConfig({
  plugins: [react()],
  server: {
    // Prefer 5173; if occupied, Vite automatically picks the next free
    // port (e.g. 5174). strictPort is intentionally NOT set.
    port: 5173,
  },
});
