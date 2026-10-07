import { expect, test } from "@playwright/test";

for (const viewport of [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
]) {
  test(`Liu Bei Benevolence selects an authoritative card and target from the Skills band at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/tests/browser/fixture.html?state=liu-bei-benevolence&count=4&hero=liu-bei");

    const dock = page.locator('.local-player-dock[data-player-anchor="p1"]');
    const skill = dock.locator(".local-hero-skills").getByRole("button", { name: "Benevolence", exact: true });
    const duplicate = dock.locator('[data-action-extras="true"]').getByRole("button", { name: /Benevolence/ });

    await expect(skill).toBeVisible();
    await expect(skill).toBeEnabled();
    await expect(skill).toHaveAttribute("aria-pressed", "false");
    await expect(duplicate).toHaveCount(0);
    expect(await page.evaluate(() => window.__browserRoom.currentAction.triggerOptions.map(({ effectId, selection }) => ({ effectId, selection })))).toEqual([
      {
        effectId: "liu_bei_rende",
        selection: {
          type: "cards",
          min: 1,
          max: 2,
          eligibleCardIds: ["browser-rende-eligible-one", "browser-rende-eligible-two"],
          targetIds: ["p2", "p3"],
        },
      },
    ]);

    await page.evaluate(() => { window.__browserActions = []; });
    await skill.click();
    await expect(skill).toHaveAttribute("aria-pressed", "true");

    const eligibleOne = dock.locator('[data-hand-card-id="browser-rende-eligible-one"] .game-card');
    const eligibleTwo = dock.locator('[data-hand-card-id="browser-rende-eligible-two"] .game-card');
    const ineligible = dock.locator('[data-hand-card-id="browser-rende-ineligible"] .game-card');
    await expect(eligibleOne).toBeEnabled();
    await expect(eligibleTwo).toBeEnabled();
    await expect(ineligible).toBeDisabled();

    const targetTwo = page.locator('[data-player-anchor="p2"] .opponent-hero-target');
    const targetThree = page.locator('[data-player-anchor="p3"] .opponent-hero-target');
    const targetFour = page.locator('[data-player-anchor="p4"] .opponent-hero-target');
    await expect(targetTwo).toBeEnabled();
    await expect(targetThree).toBeEnabled();
    await expect(targetFour).toBeDisabled();

    await eligibleOne.click();
    await expect(eligibleOne).toHaveClass(/selected/);
    await targetTwo.click();

    const confirm = dock.locator('[data-action-slot="primary"] button');
    await expect(confirm).toHaveText("Confirm");
    await expect(confirm).toBeEnabled();
    await confirm.click();
    await expect.poll(() => page.evaluate(() => window.__browserActions)).toEqual([
      { action: "trigger", extra: { providerId: "liu_bei_rende", cardIds: ["browser-rende-eligible-one"], targetId: "p2" } },
    ]);
    await expect(duplicate).toHaveCount(0);
  });
}

test("Liu Bei Benevolence stays disabled without its CurrentAction provider", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tests/browser/fixture.html?state=liu-bei-benevolence-no-provider&count=4&hero=liu-bei");

  const dock = page.locator('.local-player-dock[data-player-anchor="p1"]');
  const skill = dock.locator(".local-hero-skills").getByRole("button", { name: "Benevolence", exact: true });
  await expect(skill).toBeDisabled();
  await expect(dock.locator('[data-action-extras="true"]').getByRole("button", { name: /Benevolence/ })).toHaveCount(0);
  expect(await page.evaluate(() => window.__browserRoom.currentAction.triggerOptions ?? [])).toEqual([]);
  expect(await page.evaluate(() => window.__browserActions)).toEqual([]);
});
