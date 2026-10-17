import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  root: fileURLToPath(new URL("../../", import.meta.url)),
  plugins: [react()],
  define: {
    "process.env.NEXT_PUBLIC_BUILD_SHA": JSON.stringify(process.env.NEXT_PUBLIC_BUILD_SHA ?? ""),
  },
  server: {
    host: "127.0.0.1",
    port: 4177,
    strictPort: true,
  },
});
