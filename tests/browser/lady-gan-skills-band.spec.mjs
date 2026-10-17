import { expect, test } from "@playwright/test";

for (const viewport of [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
]) {
  test(`Lady Gan Divine Wisdom activates from the Skills band at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/tests/browser/fixture.html?state=lady-gan-divine-wisdom&count=4&hero=lady-gan");

    const dock = page.locator('.local-player-dock[data-player-anchor="p1"]');
    const skill = dock.locator(".local-hero-skills").getByRole("button", { name: "Divine Wisdom", exact: true });
    const duplicate = dock.locator('[data-action-extras="true"]').getByRole("button", { name: /Divine Wisdom/ });

    await expect(skill).toBeVisible();
    await expect(skill).toBeEnabled();
    await expect(duplicate).toHaveCount(0);
    expect(await page.evaluate(() => window.__browserRoom.currentAction.triggerOptions.map(({ effectId, selection }) => ({ effectId, selection })))).toEqual([
      { effectId: "lady_gan_divine_wisdom", selection: null },
    ]);

    await page.evaluate(() => { window.__browserActions = []; });
    await skill.click();
    await expect.poll(() => page.evaluate(() => window.__browserActions)).toEqual([
      { action: "trigger", extra: { providerId: "lady_gan_divine_wisdom" } },
    ]);
    await expect(duplicate).toHaveCount(0);
  });

  test(`Lady Gan Prudence selects its authoritative target from the Skills band at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/tests/browser/fixture.html?state=lady-gan-prudence&count=4&hero=lady-gan");

    const dock = page.locator('.local-player-dock[data-player-anchor="p1"]');
    const skill = dock.locator(".local-hero-skills").getByRole("button", { name: "Prudence", exact: true });
    const duplicate = dock.locator('[data-action-extras="true"]').getByRole("button", { name: /Prudence/ });

    await expect(skill).toBeVisible();
    await expect(skill).toBeEnabled();
    await expect(duplicate).toHaveCount(0);
    expect(await page.evaluate(() => window.__browserRoom.currentAction.triggerOptions.map(({ effectId, selection }) => ({ effectId, selection })))).toEqual([
      { effectId: "lady_gan_prudence", selection: { type: "target", targetIds: ["p2", "p3"], min: 1, max: 1 } },
    ]);

    await skill.click();
    await expect(skill).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator('[data-player-anchor="p2"] .opponent-hero-target')).toBeEnabled();
    const targetThree = page.locator('[data-player-anchor="p3"] .opponent-hero-target');
    await expect(targetThree).toBeEnabled();
    await expect(page.locator('[data-player-anchor="p4"] .opponent-hero-target')).toBeDisabled();

    await page.evaluate(() => { window.__browserActions = []; });
    await targetThree.click();
    const confirm = page.locator('[data-console-surface="local-operation"] button.primary');
    await expect(confirm).toHaveText("Confirm");
    await expect(confirm).toBeEnabled();
    await confirm.click();
    await expect.poll(() => page.evaluate(() => window.__browserActions)).toEqual([
      { action: "trigger", extra: { providerId: "lady_gan_prudence", targetId: "p3" } },
    ]);
    await expect(duplicate).toHaveCount(0);
  });
}

test("Lady Gan skills remain unavailable without their CurrentAction options", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tests/browser/fixture.html?state=lady-gan-no-provider&count=4&hero=lady-gan");

  const dock = page.locator('.local-player-dock[data-player-anchor="p1"]');
  const divineWisdom = dock.locator(".local-hero-skills").getByRole("button", { name: "Divine Wisdom", exact: true });
  const prudence = dock.locator(".local-hero-skills").getByRole("button", { name: "Prudence", exact: true });
  const extras = dock.locator('[data-action-extras="true"]');

  await expect(divineWisdom).toBeDisabled();
  await expect(prudence).toBeDisabled();
  await expect(extras.getByRole("button", { name: /Divine Wisdom|Prudence/ })).toHaveCount(0);
  expect(await page.evaluate(() => window.__browserRoom.currentAction.triggerOptions ?? [])).toEqual([]);

  await page.evaluate(() => { window.__browserActions = []; });
  await divineWisdom.evaluate((button) => button.click());
  await prudence.evaluate((button) => button.click());
  expect(await page.evaluate(() => window.__browserActions)).toEqual([]);
});
