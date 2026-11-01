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
    const actionSlots = decisionPanel.locator('[data-action-slots="true"]');
    const confirmButton = actionSlots.locator('[data-action-slot="primary"] button');
    const endButton = actionSlots.locator('[data-action-slot="decline"] button');
    const expectPhoneActionGeometry = async () => {
      const geometry = await actionSlots.evaluate((slots) => {
        const rect = (element) => {
          const box = element.getBoundingClientRect();
          return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height };
        };
        const confirm = slots.querySelector('[data-action-slot="primary"] button');
        const end = slots.querySelector('[data-action-slot="decline"] button');
        const hitAtCenter = (element) => {
          const box = element.getBoundingClientRect();
          const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
          return hit === element || element.contains(hit);
        };
        return { slots: rect(slots), confirm: rect(confirm), end: rect(end), confirmHit: hitAtCenter(confirm), endHit: hitAtCenter(end), viewportHeight: window.innerHeight };
      });
      expect(Math.abs((geometry.confirm.left + geometry.confirm.right) / 2 - (geometry.slots.left + geometry.slots.right) / 2)).toBeLessThanOrEqual(8);
      expect(Math.abs(geometry.end.right - geometry.slots.right)).toBeLessThanOrEqual(12);
      expect(geometry.end.left).toBeGreaterThanOrEqual(geometry.confirm.right);
      for (const button of [geometry.confirm, geometry.end]) {
        expect(button.width).toBeGreaterThanOrEqual(78);
        expect(button.height).toBeGreaterThanOrEqual(32);
        expect(button.top).toBeGreaterThanOrEqual(0);
        expect(button.bottom).toBeLessThanOrEqual(geometry.viewportHeight);
      }
      expect(geometry.confirmHit).toBe(true);
      expect(geometry.endHit).toBe(true);
    };
    await expect(confirmButton).toBeVisible();
    await expect(confirmButton).toBeDisabled();
    await expect(endButton).toBeVisible();
    await expect(endButton).toBeEnabled();
    await expectPhoneActionGeometry();
    await expect(decisionPanel.locator('[data-action-slot="cancel"]')).toBeHidden();
    await expect(decisionPanel.locator(".local-target-cancel, [data-local-target-selection]")).toHaveCount(0);
    await page.locator('.opponent-player-card[data-player-anchor="p2"] .opponent-hero-target').tap();
    await expect(page.locator('.opponent-player-card[data-player-anchor="p2"]')).toHaveClass(/selected-target/);
    await expect(decisionPanel.locator(".local-target-cancel, [data-local-target-selection]")).toHaveCount(0);
    await expect(confirmButton).toBeEnabled();
    await expectPhoneActionGeometry();
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
