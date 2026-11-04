import { defineConfig } from "@playwright/test";

const localUrl = process.env.AI_BOT_DEMO_LOCAL_URL ?? "http://127.0.0.1:3138";
const parsedLocalUrl = new URL(localUrl);
if (parsedLocalUrl.protocol !== "http:" || !["127.0.0.1", "localhost"].includes(parsedLocalUrl.hostname)) {
  throw new Error("AI_BOT_DEMO_LOCAL_URL must use local loopback HTTP");
}

export default defineConfig({
  testDir: ".",
  testMatch: "**/staging-room-reconnect.spec.mjs",
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: "line",
  outputDir: "test-results/ai-bot-demo-local",
  use: {
    baseURL: parsedLocalUrl.origin,
    browserName: "chromium",
    headless: true,
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
});
