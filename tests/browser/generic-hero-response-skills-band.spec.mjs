import { expect, test } from "@playwright/test";

const viewports = [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
];

const responseSkills = [
  {
    hero: "cao-cao",
    skill: "Entourage",
    providerId: "cao_cao_hujia",
    state: "cao-cao-entourage-response",
    unavailableState: "cao-cao-entourage-no-provider",
    eligibleCardId: null,
    ineligibleCardId: "browser-cao-cao-entourage-dodge",
  },
  {
    hero: "liu-bei",
    skill: "Influencing",
    providerId: "liu_bei_jijiang",
    state: "liu-bei-influencing-response",
    unavailableState: "liu-bei-influencing-no-provider",
    eligibleCardId: null,
    ineligibleCardId: "browser-liu-bei-influencing-attack",
  },
  {
    hero: "zhen-ji",
    skill: "Empress Dowager",
    providerId: "zhen_ji_black_card_dodge",
    state: "zhen-ji-empress-dowager-response",
    unavailableState: "zhen-ji-empress-dowager-no-provider",
    eligibleCardId: "browser-zhen-ji-empress-dowager-black-attack",
    ineligibleCardId: "browser-zhen-ji-empress-dowager-red-dodge",
  },
];

for (const viewport of viewports) {
  for (const responseSkill of responseSkills) {
    test(`${responseSkill.hero} ${responseSkill.skill} uses the Skills band at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto(`/tests/browser/fixture.html?state=${responseSkill.state}&count=4&hero=${responseSkill.hero}`);

      const skills = page.locator('.local-player-dock[data-player-anchor="p1"] .local-hero-skills');
      const skill = skills.getByRole("button", { name: responseSkill.skill, exact: true });
      const row = page.locator('[data-action-extras="true"]');
      const hand = page.locator(".local-hand-rail");
      const extras = row.getByRole("button", { name: /Entourage|Influencing|Empress Dowager/ });

      await expect(skill).toBeVisible();
      await expect(skill).toBeEnabled();
      await expect(extras).toHaveCount(0);
      expect(await page.evaluate(() => window.__browserRoom.currentAction.options.map((option) => option.providerId))).toContain(responseSkill.providerId);
      await page.evaluate(() => { window.__browserActions = []; });

      await skill.click();
      await expect(skill).toHaveClass(/active/);
      await expect(extras).toHaveCount(0);
      await expect(page.locator('[data-action-slot="decline"] button')).toBeVisible();
      await expect(page.locator('[data-action-slot="decline"] button')).toBeEnabled();

      if (responseSkill.eligibleCardId) {
        const eligible = hand.locator(`[data-hand-card-id="${responseSkill.eligibleCardId}"] .game-card`);
        const ineligible = hand.locator(`[data-hand-card-id="${responseSkill.ineligibleCardId}"] .game-card`);
        await expect(eligible).toBeEnabled();
        await expect(ineligible).toBeDisabled();
        await expect(hand.locator(".game-card:not(:disabled)")).toHaveCount(1);
        await eligible.click();
        await expect(eligible).toHaveClass(/selected/);
      } else {
        await expect(hand.locator(".game-card:not(:disabled)")).toHaveCount(0);
      }

      const confirm = page.locator('[data-action-slot="primary"] button.primary');
      await expect(confirm).toHaveText("Confirm");
      await expect(confirm).toBeEnabled();
      await confirm.click();
      await expect.poll(() => page.evaluate(() => window.__browserActions)).toEqual([
        { action: "respond", extra: { providerId: responseSkill.providerId, ...(responseSkill.eligibleCardId ? { cardId: responseSkill.eligibleCardId } : {}) } },
      ]);
    });
  }
}

for (const responseSkill of responseSkills) {
  test(`${responseSkill.hero} ${responseSkill.skill} stays disabled without its CurrentAction provider`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/tests/browser/fixture.html?state=${responseSkill.unavailableState}&count=4&hero=${responseSkill.hero}`);

    const skills = page.locator('.local-player-dock[data-player-anchor="p1"] .local-hero-skills');
    const skill = skills.getByRole("button", { name: responseSkill.skill, exact: true });
    await expect(skill).toBeDisabled();
    await expect(page.locator('[data-action-extras="true"]').getByRole("button", { name: /Entourage|Influencing|Empress Dowager/ })).toHaveCount(0);
    expect(await page.evaluate(() => window.__browserRoom.currentAction.options.map((option) => option.providerId))).not.toContain(responseSkill.providerId);
    await page.evaluate(() => { window.__browserActions = []; });
    expect(await page.evaluate(() => window.__browserActions)).toEqual([]);
  });
}
