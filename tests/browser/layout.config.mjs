// Fixture-only layout checks do not need the Worker/D1 server. The complete
// CI suite continues to use playwright.config.mjs and both original servers.
import { defineConfig } from "@playwright/test";
import config from "./playwright.config.mjs";

export default defineConfig({
  ...config,
  testMatch: "ui19.spec.mjs",
  webServer: config.webServer[0],
});
