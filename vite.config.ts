import vinext from "vinext";
import { defineConfig } from "vite";

export default defineConfig(async () => {
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  const { cloudflare } = await import("@cloudflare/vite-plugin");
  const lanTesting = process.env.VINEXT_LAN_TEST === "1";

  return {
    // Keep the HMR socket available for LAN clients, but do not let Vite's
    // development overlay hide the game if that socket briefly reconnects.
    // Gameplay errors are handled by the application's own error UI instead.
    server: lanTesting ? { hmr: { overlay: false } } : undefined,
    plugins: [
      vinext(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
      }),
    ],
  };
});
