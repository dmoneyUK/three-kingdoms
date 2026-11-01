import { expect, test } from "@playwright/test";

test("CONSOLE-01 mobile hand-card retap deselects and End Turn submits only after confirmation", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  try {
    await page.goto("/tests/browser/fixture.html?state=target-eligibility&count=4");
    const cardSlot = page.locator('[data-hand-card-id="browser-target-eligibility-steal"]');
    const card = cardSlot.locator(".game-card");
    const decisionPanel = page.locator('[data-console-surface="local-operation"]');
    await expect(card).toHaveAttribute("aria-pressed", "false");
    await card.tap();
    await expect(card).toHaveAttribute("aria-pressed", "true");
    await expect(card).toHaveAttribute("aria-label", /^Deselect /);
    await expect(decisionPanel).toHaveAttribute("data-ordinary-play-target-selection", "true");
    await expect.poll(() => decisionPanel.locator('[data-action-slots="true"]').evaluate((slots) => getComputedStyle(slots).gridTemplateColumns.trim().split(/\s+/).length)).toBe(2);
    await expect(decisionPanel.locator('[data-action-slot="cancel"]')).toBeHidden();
    await expect(decisionPanel.locator(".local-target-cancel, [data-local-target-selection]")).toHaveCount(0);
    await page.locator('.opponent-player-card[data-player-anchor="p2"] .opponent-hero-target').tap();
    await expect(page.locator('.opponent-player-card[data-player-anchor="p2"]')).toHaveClass(/selected-target/);
    await expect(decisionPanel.locator(".local-target-cancel, [data-local-target-selection]")).toHaveCount(0);
    await expect(decisionPanel.locator('[data-action-slot="primary"] button')).toBeEnabled();
    expect(await page.evaluate(() => window.__browserActions.filter(({ action }) => action === "play_card"))).toHaveLength(0);
    await card.tap();
    await expect(card).toHaveAttribute("aria-pressed", "false");
    await expect(card).toHaveAttribute("aria-label", /^Select /);
    await expect(page.locator(".opponent-player-card.selected-target")).toHaveCount(0);
    await expect(decisionPanel.locator('[data-action-slot="primary"] button')).toBeDisabled();
    expect(await page.evaluate(() => window.__browserActions.filter(({ action }) => action === "play_card"))).toHaveLength(0);

    await card.tap();
    await page.locator('.opponent-player-card[data-player-anchor="p2"] .opponent-hero-target').tap();
    await decisionPanel.locator('[data-action-slot="primary"] button').tap();
    await expect.poll(() => page.evaluate(() => window.__browserActions.filter(({ action }) => action === "play_card"))).toEqual([
      { action: "play_card", extra: { cardId: "browser-target-eligibility-steal", targetId: "p2" } },
    ]);

    const endTurn = page.getByRole("button", { name: "End", exact: true });
    await expect(endTurn).toBeEnabled();
    page.once("dialog", async (dialog) => {
      expect(dialog.type()).toBe("confirm");
      expect(dialog.message()).toBe("End your turn?");
      await dialog.dismiss();
    });
    await endTurn.tap();
    expect(await page.evaluate(() => window.__browserActions.filter(({ action }) => action === "end_turn"))).toHaveLength(0);

    page.once("dialog", async (dialog) => {
      expect(dialog.message()).toBe("End your turn?");
      await dialog.accept();
    });
    await endTurn.tap();
    await expect.poll(() => page.evaluate(() => window.__browserActions.filter(({ action }) => action === "end_turn").length)).toBe(1);
  } finally {
    await context.close();
  }
});
