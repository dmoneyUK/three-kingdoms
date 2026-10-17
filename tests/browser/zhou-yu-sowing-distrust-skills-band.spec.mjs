import { expect, test } from "@playwright/test";

for (const viewport of [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
]) {
  test(`Zhou Yu Sowing Distrust starts from the Skills band at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/tests/browser/fixture.html?state=zhou-yu-sowing-distrust&count=4&hero=zhou-yu");

    const dock = page.locator('.local-player-dock[data-player-anchor="p1"]');
    const skill = dock.locator(".local-hero-skills").getByRole("button", { name: "Sowing Distrust", exact: true });
    const duplicate = dock.locator('[data-action-extras="true"]').getByRole("button", { name: /Sowing Distrust/ });

    await expect(skill).toBeVisible();
    await expect(skill).toBeEnabled();
    await expect(duplicate).toHaveCount(0);
    expect(await page.evaluate(() => window.__browserRoom.currentAction.triggerOptions.map(({ effectId, selection }) => ({ effectId, selection })))).toEqual([
      { effectId: "zhou_yu_fanjian", selection: { type: "target", targetIds: ["p2", "p3"] } },
    ]);

    await page.evaluate(() => { window.__browserActions = []; });
    await skill.click();
    await expect(skill).toHaveAttribute("aria-pressed", "true");

    const targetTwo = page.locator('[data-player-anchor="p2"] .opponent-hero-target');
    const targetThree = page.locator('[data-player-anchor="p3"] .opponent-hero-target');
    const targetFour = page.locator('[data-player-anchor="p4"] .opponent-hero-target');
    await expect(targetTwo).toBeEnabled();
    await expect(targetThree).toBeEnabled();
    await expect(targetFour).toBeDisabled();
    await targetTwo.click();

    const confirm = page.locator('[data-console-surface="local-operation"] button.primary');
    await expect(confirm).toHaveText("Confirm");
    await expect(confirm).toBeEnabled();
    await confirm.click();
    await expect.poll(() => page.evaluate(() => window.__browserActions)).toEqual([
      { action: "trigger", extra: { providerId: "zhou_yu_fanjian", targetId: "p2" } },
    ]);
    await expect(duplicate).toHaveCount(0);
  });
}

test("Zhou Yu Sowing Distrust stays disabled without its CurrentAction provider", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tests/browser/fixture.html?state=zhou-yu-sowing-distrust-no-provider&count=4&hero=zhou-yu");

  const dock = page.locator('.local-player-dock[data-player-anchor="p1"]');
  const skill = dock.locator(".local-hero-skills").getByRole("button", { name: "Sowing Distrust", exact: true });
  await expect(skill).toBeDisabled();
  await expect(dock.locator('[data-action-extras="true"]').getByRole("button", { name: /Sowing Distrust/ })).toHaveCount(0);
  expect(await page.evaluate(() => window.__browserRoom.currentAction.triggerOptions ?? [])).toEqual([]);

  await page.evaluate(() => { window.__browserActions = []; });
  await skill.evaluate((button) => button.click());
  expect(await page.evaluate(() => window.__browserActions)).toEqual([]);
});
