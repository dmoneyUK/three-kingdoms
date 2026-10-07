import { expect, test } from "@playwright/test";

for (const viewport of [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
]) {
  test(`Xiahou Dun Stauchness activates from the Skills band at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/tests/browser/fixture.html?state=xiahou-dun-stauchness&count=4&hero=xiahou-dun");

    const skillBand = page.locator('.local-player-dock[data-player-anchor="p1"] .local-hero-skills');
    const skill = skillBand.getByRole("button", { name: "Stauchness", exact: true });
    const duplicate = page.locator('[data-action-extras="true"]').getByRole("button", { name: /Stauchness/ });

    await expect(skill).toBeVisible();
    await expect(skill).toBeEnabled();
    await expect(duplicate).toHaveCount(0);
    expect(await page.evaluate(() => window.__browserRoom.currentAction.triggerOptions.map((option) => option.effectId))).toEqual([
      "xiahou_dun_ganglie",
    ]);

    await page.evaluate(() => { window.__browserActions = []; });
    await skill.click();
    await expect.poll(() => page.evaluate(() => window.__browserActions)).toEqual([
      { action: "trigger", extra: { providerId: "xiahou_dun_ganglie" } },
    ]);
    await expect(duplicate).toHaveCount(0);
  });
}

test("Xiahou Dun Stauchness stays disabled when CurrentAction lacks its provider", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tests/browser/fixture.html?state=xiahou-dun-stauchness-no-provider&count=4&hero=xiahou-dun");

  const skillBand = page.locator('.local-player-dock[data-player-anchor="p1"] .local-hero-skills');
  const skill = skillBand.getByRole("button", { name: "Stauchness", exact: true });
  await expect(skill).toBeDisabled();
  await expect(page.locator('[data-action-extras="true"]').getByRole("button", { name: /Stauchness/ })).toHaveCount(0);
  expect(await page.evaluate(() => window.__browserRoom.currentAction.triggerOptions)).toEqual([]);
  await page.evaluate(() => { window.__browserActions = []; });
  await skill.evaluate((button) => button.click());
  expect(await page.evaluate(() => window.__browserActions)).toEqual([]);
});
