import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Backend base URL can be overridden for deployment; localhost default
// matches the FastAPI dev server.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
});
