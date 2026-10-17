import { defineConfig, devices } from "@playwright/test";
import { fileURLToPath } from "node:url";

export default defineConfig({
  testDir: ".",
  testMatch: "**/*.spec.mjs",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [["line"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  outputDir: "test-results/browser",
  use: {
    baseURL: "http://127.0.0.1:4177",
    browserName: "chromium",
    ...devices["Desktop Chrome"],
    headless: true,
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "vite --config tests/browser/vite.config.mjs --host 127.0.0.1 --port 4177",
      cwd: fileURLToPath(new URL("../../", import.meta.url)),
      url: "http://127.0.0.1:4177/tests/browser/fixture.html",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: "node tests/browser/worker-server.mjs",
      cwd: fileURLToPath(new URL("../../", import.meta.url)),
      url: "http://127.0.0.1:3137/",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
