import { expect, test } from "@playwright/test";

for (const viewport of [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
]) {
  test(`Cao Cao Treachery activates from the Skills band at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/tests/browser/fixture.html?state=cao-cao-treachery&count=4&hero=cao-cao");

    const skillBand = page.locator('.local-player-dock[data-player-anchor="p1"] .local-hero-skills');
    const skill = skillBand.getByRole("button", { name: "Treachery", exact: true });
    const duplicate = page.locator('[data-action-extras="true"]').getByRole("button", { name: /Treachery/ });

    await expect(skill).toBeVisible();
    await expect(skill).toBeEnabled();
    await expect(duplicate).toHaveCount(0);
    expect(await page.evaluate(() => window.__browserRoom.currentAction.triggerOptions.map((option) => option.effectId))).toEqual([
      "cao_cao_jianxiong",
    ]);

    await page.evaluate(() => { window.__browserActions = []; });
    await skill.click();
    await expect.poll(() => page.evaluate(() => window.__browserActions)).toEqual([
      { action: "trigger", extra: { providerId: "cao_cao_jianxiong" } },
    ]);
    await expect(duplicate).toHaveCount(0);
  });
}

test("Cao Cao Treachery stays disabled without its CurrentAction option", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tests/browser/fixture.html?state=rest&count=4&hero=cao-cao");

  const skillBand = page.locator('.local-player-dock[data-player-anchor="p1"] .local-hero-skills');
  const skill = skillBand.getByRole("button", { name: "Treachery", exact: true });
  await expect(skill).toBeDisabled();
  await expect(page.locator('[data-action-extras="true"]').getByRole("button", { name: /Treachery/ })).toHaveCount(0);
  expect(await page.evaluate(() => window.__browserRoom.currentAction?.triggerOptions?.map((option) => option.effectId) ?? [])).not.toContain("cao_cao_jianxiong");
});
