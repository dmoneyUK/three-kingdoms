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
    await page.goto("/tests/browser/fixture.html?state=normal&count=4");
    const cardSlot = page.locator(".local-player-dock .local-hand-rail [data-hand-card-id]").first();
    const card = cardSlot.locator(".game-card");
    await expect(card).toHaveAttribute("aria-pressed", "false");
    await card.tap();
    await expect(card).toHaveAttribute("aria-pressed", "true");
    await expect(card).toHaveAttribute("aria-label", /^Deselect /);
    await card.tap();
    await expect(card).toHaveAttribute("aria-pressed", "false");
    await expect(card).toHaveAttribute("aria-label", /^Select /);
    expect(await page.evaluate(() => window.__browserActions.filter(({ action }) => action === "play_card"))).toHaveLength(0);

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
