import { expect, test } from "@playwright/test";

test("CONSOLE-01 mobile hand-card retap deselects and End Turn submits only after confirmation", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 440, height: 766 },
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
    let browserDialogSeen = false;
    page.on("dialog", async (dialog) => {
      browserDialogSeen = true;
      await dialog.dismiss();
    });
    const confirmationStage = page.locator('.play-table > [data-end-turn-confirmation="true"]');
    const openConfirmation = async () => {
      await endTurn.tap();
      await expect(confirmationStage).toHaveAttribute("data-end-turn-confirmation-ready", "true");
      await expect(page.getByRole("dialog", { name: "End your Play Phase?" })).toBeVisible();
    };
    const endTurnActions = () => page.evaluate(() => window.__browserActions.filter(({ action }) => action === "end_turn"));
    const originalRoom = await page.evaluate(() => window.__browserRoom);

    await openConfirmation();
    await page.evaluate((revision) => window.__setBrowserActionRevision(`${revision}-stale`), originalRoom.actionRevision);
    await expect(confirmationStage).toHaveCount(0);
    expect(await endTurnActions()).toHaveLength(0);
    await page.evaluate((revision) => window.__setBrowserActionRevision(revision), originalRoom.actionRevision);

    await openConfirmation();
    const switchedViewerId = originalRoom.players.find(({ id }) => id !== originalRoom.meId).id;
    await page.evaluate((viewerId) => {
      const current = window.__browserRoom;
      window.__updateBrowserRoom({ ...current, meId: viewerId, isMyTurn: false, isMyAction: false });
    }, switchedViewerId);
    await expect.poll(() => page.evaluate(() => window.__browserRoom.meId)).toBe(switchedViewerId);
    await expect(confirmationStage).toHaveCount(0);
    expect(await endTurnActions()).toHaveLength(0);
    await page.evaluate((room) => window.__updateBrowserRoom(room), originalRoom);
    await expect.poll(() => page.evaluate(() => window.__browserRoom.meId)).toBe(originalRoom.meId);

    await openConfirmation();
    const dialog = page.getByRole("dialog", { name: "End your Play Phase?" });
    const geometry = await dialog.evaluate((element) => {
      const rect = (node) => {
        const box = node.getBoundingClientRect();
        return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height };
      };
      const panel = rect(element);
      const table = rect(element.closest(".play-table"));
      const blockers = [...document.querySelectorAll(
        ".player-board > .opponent-player-card, .public-card-display-journey-copy, .public-activity-chip, [data-public-activity-chip], .visible-countdown, .local-player-dock, .local-hand-section, .turn-controls, .public-card-journey-card[data-public-card-journey-phase='reveal'], .public-card-journey-card[data-public-card-journey-phase='move'], .active-table-reveal",
      )].filter((node) => {
        const style = getComputedStyle(node);
        const box = node.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && box.width > 0 && box.height > 0;
      }).map((node) => rect(node));
      const overlaps = (first, second) => first.left < second.right && first.right > second.left && first.top < second.bottom && first.bottom > second.top;
      return { panel, table, insideTable: panel.left >= table.left && panel.right <= table.right && panel.top >= table.top && panel.bottom <= table.bottom, overlaps: blockers.filter((blocker) => overlaps(panel, blocker)) };
    });
    expect(geometry.insideTable).toBe(true);
    expect(geometry.overlaps).toEqual([]);
    const cancelButton = dialog.getByRole("button", { name: "Cancel" });
    await expect(cancelButton).toBeFocused();
    await cancelButton.tap();
    await expect(confirmationStage).toHaveCount(0);
    expect(await endTurnActions()).toHaveLength(0);
    await expect(endTurn).toBeFocused();

    await openConfirmation();
    await page.keyboard.press("Escape");
    await expect(confirmationStage).toHaveCount(0);
    expect(await endTurnActions()).toHaveLength(0);

    await openConfirmation();
    await page.getByRole("dialog", { name: "End your Play Phase?" }).getByRole("button", { name: "Confirm End" }).dblclick();
    await expect.poll(async () => (await endTurnActions()).length).toBe(1);
    expect(browserDialogSeen).toBe(false);
  } finally {
    await context.close();
  }
});
