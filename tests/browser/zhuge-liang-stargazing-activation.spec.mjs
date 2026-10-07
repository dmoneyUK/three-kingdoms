import { expect, test } from "@playwright/test";

const viewports = [
  { width: 320, height: 640 },
  { width: 390, height: 844 },
  { width: 480, height: 900 },
  { width: 1440, height: 900 },
];

test("Stargazing uses its authoritative Skills-band activation without a duplicate bottom control", async ({ page }) => {
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto("/tests/browser/fixture.html?state=rest&count=4&hero=zhuge-liang");

    const skill = page.locator('.local-player-dock[data-player-anchor="p1"] .local-hero-skills').getByRole("button", { name: "Stargazing" });
    await expect(skill).toBeVisible();
    await expect(skill).toBeDisabled();
    await expect(skill).toHaveAttribute("aria-pressed", "false");

    await page.goto("/tests/browser/fixture.html?state=stargazing-offer&count=4&hero=zhuge-liang");
    const offeredSkill = page.locator('.local-player-dock[data-player-anchor="p1"] .local-hero-skills').getByRole("button", { name: "Stargazing" });
    await expect(offeredSkill).toBeEnabled();
    await expect(offeredSkill).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator(".turn-controls").getByRole("button", { name: /stargazing/i })).toHaveCount(0);

    await page.evaluate(() => { window.__browserActions.length = 0; });
    await offeredSkill.click();
    await expect.poll(() => page.evaluate(() => window.__browserActions)).toEqual([
      { action: "trigger", extra: { providerId: "zhuge_liang_stargazing" } },
    ]);
  }
});
