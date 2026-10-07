import { expect, test } from "@playwright/test";

for (const viewport of [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
]) {
  test(`Sima Yi Necromancy selects only the projected Hand card at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/tests/browser/fixture.html?state=sima-yi-necromancy&count=4&hero=simayi");

    const skillBand = page.locator('.local-player-dock[data-player-anchor="p1"] .local-hero-skills');
    const skill = skillBand.getByRole("button", { name: "Necromancy", exact: true });
    const extras = page.locator('[data-action-extras="true"]');
    const hand = page.locator(".local-hand-rail");
    const eligible = hand.locator('[data-hand-card-id="browser-necromancy-eligible"] .game-card');
    const ineligible = hand.locator('[data-hand-card-id="browser-necromancy-ineligible"] .game-card');

    await expect(skill).toBeVisible();
    await expect(skill).toBeEnabled();
    await expect(extras.getByRole("button", { name: /Necromancy/ })).toHaveCount(0);
    expect(await page.evaluate(() => window.__browserRoom.currentAction.triggerOptions.map(({ effectId, selection }) => ({
      effectId,
      eligibleCardIds: selection?.eligibleCardIds,
    })))).toEqual([{ effectId: "sima_yi_guicai", eligibleCardIds: ["browser-necromancy-eligible"] }]);
    expect(await page.evaluate(() => window.__browserRoom.myHand.map(({ id }) => id))).toEqual([
      "browser-necromancy-eligible",
      "browser-necromancy-ineligible",
    ]);

    await skill.click();
    await expect(skill).toHaveClass(/active/);
    await expect(eligible).toBeEnabled();
    await expect(eligible).toHaveClass(/hero-skill-eligible/);
    await expect(ineligible).toBeDisabled();
    await expect(hand.locator(".game-card:not(:disabled)")).toHaveCount(1);

    await page.evaluate(() => { window.__browserActions = []; });
    await eligible.click();
    await expect(eligible).toHaveClass(/selected/);
    const confirm = page.locator('[data-action-slot="primary"] button.primary');
    await expect(confirm).toHaveText("Confirm");
    await expect(confirm).toBeEnabled();
    await confirm.click();

    await expect.poll(() => page.evaluate(() => window.__browserActions)).toEqual([
      { action: "trigger", extra: { providerId: "sima_yi_guicai", cardIds: ["browser-necromancy-eligible"] } },
    ]);
    await expect(extras.getByRole("button", { name: /Necromancy/ })).toHaveCount(0);
  });
}

test("Sima Yi Necromancy stays disabled without its CurrentAction option", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tests/browser/fixture.html?state=rest&count=4&hero=simayi");

  const skillBand = page.locator('.local-player-dock[data-player-anchor="p1"] .local-hero-skills');
  const skill = skillBand.getByRole("button", { name: "Necromancy", exact: true });
  await expect(skill).toBeDisabled();
  await expect(page.locator('[data-action-extras="true"]').getByRole("button", { name: /Necromancy/ })).toHaveCount(0);
  expect(await page.evaluate(() => window.__browserRoom.currentAction?.triggerOptions?.map((option) => option.effectId) ?? [])).not.toContain("sima_yi_guicai");
});
