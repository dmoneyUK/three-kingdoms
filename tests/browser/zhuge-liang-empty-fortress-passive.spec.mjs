import { expect, test } from "@playwright/test";

const viewports = [
  { width: 320, height: 640 },
  { width: 390, height: 844 },
  { width: 480, height: 900 },
  { width: 1440, height: 900 },
];

test("Empty Fortress Strategem is presented as passive, not as an unavailable action", async ({ page }) => {
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto("/tests/browser/fixture.html?state=rest&count=4&hero=zhuge-liang");

    const skills = page.locator('.local-player-dock[data-player-anchor="p1"] .local-hero-skills');
    const stargazing = skills.getByRole("button", { name: "Stargazing" });
    const passive = skills.getByRole("group", { name: "Empty Fortress Strategem, passive skill" });
    await expect(stargazing).toBeDisabled();
    await expect(stargazing).toHaveAttribute("aria-pressed", "false");
    await expect(passive).toBeVisible();
    await expect(passive).toHaveText("Empty Fortress Strategem");
    await expect(passive).not.toHaveAttribute("aria-pressed");
    await expect(skills.getByRole("button", { name: "Empty Fortress Strategem" })).toHaveCount(0);
    await expect(passive.getByRole("button")).toHaveCount(0);

    const [stargazingBox, passiveBox, passiveCursor, documentWidth] = await Promise.all([
      stargazing.boundingBox(),
      passive.boundingBox(),
      passive.evaluate((element) => getComputedStyle(element).cursor),
      page.evaluate(() => document.documentElement.scrollWidth),
    ]);
    expect(stargazingBox && passiveBox).toBeTruthy();
    expect(Math.abs(stargazingBox.width - passiveBox.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(stargazingBox.height - passiveBox.height)).toBeLessThanOrEqual(1);
    expect(stargazingBox.width).toBeGreaterThanOrEqual(44);
    expect(stargazingBox.height).toBeGreaterThanOrEqual(44);
    expect(passiveCursor).toBe("default");
    expect(documentWidth).toBeLessThanOrEqual(viewport.width);
    await expect(page.locator(".turn-controls").getByRole("button", { name: /empty fortress|stargazing/i })).toHaveCount(0);

    await page.evaluate(() => { window.__browserActions.length = 0; });
    await passive.click();
    expect(await page.evaluate(() => window.__browserActions)).toEqual([]);
  }
});
