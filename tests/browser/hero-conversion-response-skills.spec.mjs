import { expect, test } from "@playwright/test";

const viewports = [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
];

const conversions = [
  {
    state: "guan-yu-wusheng-response",
    hero: "guan-yu",
    skill: "God of War",
    providerId: "guan_yu_red_card_attack",
    satisfies: "attack",
    eligibleCardId: "browser-wusheng-red-peach",
    ineligibleCardId: "browser-wusheng-black-attack",
  },
  {
    state: "zhao-yun-longdan-attack-response",
    hero: "zhao-yun",
    skill: "Braveheart",
    providerId: "zhao_yun_dodge_as_attack",
    satisfies: "attack",
    eligibleCardId: "browser-longdan-dodge-as-attack",
    ineligibleCardId: "browser-longdan-ineligible-peach",
  },
  {
    state: "zhao-yun-longdan-dodge-response",
    hero: "zhao-yun",
    skill: "Braveheart",
    providerId: "zhao_yun_attack_as_dodge",
    satisfies: "dodge",
    eligibleCardId: "browser-longdan-attack-as-dodge",
    ineligibleCardId: "browser-longdan-ineligible-dodge",
  },
];

for (const viewport of viewports) {
  for (const conversion of conversions) {
    test(`${conversion.hero} ${conversion.providerId} activates from the Skills band at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto(`/tests/browser/fixture.html?state=${conversion.state}&count=4&hero=${conversion.hero}`);

      const skillBand = page.locator('.local-player-dock[data-player-anchor="p1"] .local-hero-skills');
      const skill = skillBand.getByRole("button", { name: conversion.skill, exact: true });
      const extras = page.locator('[data-action-extras="true"]');
      const hand = page.locator(".local-hand-rail");
      const eligible = hand.locator(`[data-hand-card-id="${conversion.eligibleCardId}"] .game-card`);
      const ineligible = hand.locator(`[data-hand-card-id="${conversion.ineligibleCardId}"] .game-card`);

      await expect(skill).toBeVisible();
      await expect(skill).toBeEnabled();
      await expect(extras.getByRole("button", { name: /God of War|Braveheart/ })).toHaveCount(0);
      expect(await page.evaluate(() => window.__browserRoom.currentAction.options.map(({ providerId, satisfies, activation, selection }) => ({
        providerId,
        satisfies,
        activation,
        eligibleCardIds: selection?.eligibleCardIds,
      })))).toContainEqual({
        providerId: conversion.providerId,
        satisfies: conversion.satisfies,
        activation: "explicit",
        eligibleCardIds: [conversion.eligibleCardId],
      });

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
        { action: "respond", extra: { providerId: conversion.providerId, cardId: conversion.eligibleCardId } },
      ]);
    });
  }
}

for (const { hero, skill } of [
  { hero: "guan-yu", skill: "God of War" },
  { hero: "zhao-yun", skill: "Braveheart" },
]) {
  test(`${hero} conversion skill stays unavailable without its CurrentAction provider`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/tests/browser/fixture.html?state=conversion-no-provider&count=4&hero=${hero}`);

    const skillBand = page.locator('.local-player-dock[data-player-anchor="p1"] .local-hero-skills');
    const skillButton = skillBand.getByRole("button", { name: skill, exact: true });
    await expect(skillButton).toBeDisabled();
    await expect(page.locator('[data-action-extras="true"]').getByRole("button", { name: /God of War|Braveheart/ })).toHaveCount(0);
    expect(await page.evaluate(() => window.__browserRoom.currentAction.options.map((option) => option.providerId))).not.toContain(
      hero === "guan-yu" ? "guan_yu_red_card_attack" : "zhao_yun_dodge_as_attack",
    );
  });
}
