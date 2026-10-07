import { expect, test } from "@playwright/test";

const viewports = [
  { width: 320, height: 640 },
  { width: 390, height: 844 },
  { width: 480, height: 900 },
  { width: 1440, height: 900 },
];

test("Stargazing stays active only for the acting viewer's private deck-reorder decision", async ({ page }) => {
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto("/tests/browser/fixture.html?state=rest&count=4&hero=zhuge-liang");
    const restSkill = page.locator('.local-player-dock[data-player-anchor="p1"] .local-hero-skills').getByRole("button", { name: "Stargazing" });
    await expect(restSkill).toBeDisabled();
    await expect(restSkill).toHaveAttribute("aria-pressed", "false");
    const restBox = await restSkill.boundingBox();
    expect(restBox).toBeTruthy();

    await page.goto("/tests/browser/fixture.html?state=stargazing-active&count=4&hero=zhuge-liang");
    const activeSkill = page.locator('.local-player-dock[data-player-anchor="p1"] .local-hero-skills').getByRole("button", { name: "Stargazing" });
    const dialog = page.getByRole("dialog", { name: "Stargazing deck reorder" });
    await expect(activeSkill).toBeDisabled();
    await expect(activeSkill).toHaveAttribute("aria-pressed", "true");
    await expect(dialog).toBeVisible();
    await expect(dialog.locator(".deck-reorder-card")).toHaveCount(1);
    await expect(page.locator(".turn-controls").getByRole("button", { name: /use stargazing/i })).toHaveCount(0);
    const activeBox = await activeSkill.boundingBox();
    expect(activeBox).toBeTruthy();
    expect(Math.abs(activeBox.x - restBox.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(activeBox.y - restBox.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(activeBox.width - restBox.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(activeBox.height - restBox.height)).toBeLessThanOrEqual(1);

    await page.evaluate(() => window.__replaceBrowserDeckReorder());
    await expect(page.getByRole("dialog", { name: "Stargazing deck reorder" })).toHaveCount(0);
    await expect(activeSkill).toBeDisabled();
    await expect(activeSkill).toHaveAttribute("aria-pressed", "false");
    const replacedBox = await activeSkill.boundingBox();
    expect(replacedBox).toBeTruthy();
    expect(Math.abs(replacedBox.x - restBox.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(replacedBox.y - restBox.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(replacedBox.width - restBox.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(replacedBox.height - restBox.height)).toBeLessThanOrEqual(1);

    await page.goto("/tests/browser/fixture.html?state=stargazing-active-observer&count=4&hero=zhuge-liang");
    const observerSkill = page.locator('.local-player-dock[data-player-anchor="p1"] .local-hero-skills').getByRole("button", { name: "Stargazing" });
    await expect(observerSkill).toBeDisabled();
    await expect(observerSkill).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByRole("dialog", { name: "Stargazing deck reorder" })).toHaveCount(0);
    await expect(page.locator(".deck-reorder-card")).toHaveCount(0);
  }
});
