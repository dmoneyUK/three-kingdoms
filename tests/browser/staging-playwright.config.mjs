import { defineConfig } from "@playwright/test";

const stagingUrl = process.env.STAGING_URL;
if (!stagingUrl) throw new Error("STAGING_URL is required for the Staging smoke test");

const parsedStagingUrl = new URL(stagingUrl);
if (parsedStagingUrl.protocol !== "https:" || parsedStagingUrl.hostname !== "three-kingdoms-ai-staging.dai-jinge.workers.dev") {
  throw new Error("STAGING_URL must point to the isolated AI Staging Worker over HTTPS");
}

export default defineConfig({
  testDir: ".",
  testMatch: "**/staging-room-reconnect.spec.mjs",
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: "line",
  outputDir: "test-results/staging-browser",
  use: {
    baseURL: parsedStagingUrl.origin,
    browserName: "chromium",
    headless: true,
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
    trace: "off",
    screenshot: "off",
    video: "off",
  },
});
