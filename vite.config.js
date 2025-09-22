import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: [
      ".csb.app", // allow any CodeSandbox subdomain
      ".codesandbox.io", // allow fallback domain
    ],
  },
});
