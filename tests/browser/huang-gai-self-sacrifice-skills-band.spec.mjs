import { expect, test } from "@playwright/test";

for (const viewport of [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
]) {
  test(`Huang Gai Self Sacrifice activates from the Skills band at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/tests/browser/fixture.html?state=huang-gai-self-sacrifice&count=4&hero=huang-gai");

    const skills = page.locator('.local-player-dock[data-player-anchor="p1"] .local-hero-skills');
    const skill = skills.getByRole("button", { name: "Self Sacrifice", exact: true });
    const duplicate = page.locator('[data-action-extras="true"]').getByRole("button", { name: /Self Sacrifice/ });

    await expect(skill).toBeVisible();
    await expect(skill).toBeEnabled();
    await expect(duplicate).toHaveCount(0);
    expect(await page.evaluate(() => window.__browserRoom.currentAction.triggerOptions.map((option) => option.effectId))).toContain("huang_gai_kurou");

    await page.evaluate(() => { window.__browserActions = []; });
    await skill.click();
    await expect.poll(() => page.evaluate(() => window.__browserActions)).toEqual([
      { action: "trigger", extra: { providerId: "huang_gai_kurou" } },
    ]);
    await expect(duplicate).toHaveCount(0);
  });
}

test("Huang Gai Self Sacrifice stays disabled without its CurrentAction option", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tests/browser/fixture.html?state=rest&count=4&hero=huang-gai");

  const skills = page.locator('.local-player-dock[data-player-anchor="p1"] .local-hero-skills');
  const skill = skills.getByRole("button", { name: "Self Sacrifice", exact: true });
  await expect(skill).toBeDisabled();
  await expect(page.locator('[data-action-extras="true"]').getByRole("button", { name: /Self Sacrifice/ })).toHaveCount(0);
  expect(await page.evaluate(() => window.__browserRoom.currentAction?.triggerOptions?.map((option) => option.effectId) ?? [])).not.toContain("huang_gai_kurou");
});
