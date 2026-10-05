import { expect, test } from "@playwright/test";

async function loadFixture(page, state) {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`/tests/browser/fixture.html?state=${state}&count=4`);
  await expect(page.locator(".game-shell")).toBeVisible();
  const borrowedSword = page.locator('[data-hand-card-id="browser-borrowed-sword"] .game-card');
  await expect(borrowedSword).toBeEnabled();
  await borrowedSword.click();
  await expect(borrowedSword).toHaveClass(/selected/);
}

test("Borrowed Sword target selection consumes only the CurrentAction projection", async ({ page }) => {
  await loadFixture(page, "borrowed-sword-play");
  expect(await page.evaluate(() => window.__browserRoom.currentAction.borrowedSwordTargets)).toEqual([
    { cardId: "browser-borrowed-sword", targetIds: ["p2"] },
  ]);

  const legalHolder = page.getByRole("button", { name: "Select Player 2" });
  const unprojectedPlayer = page.getByRole("button", { name: "Select Player 3" });
  await expect(legalHolder).toBeEnabled();
  await expect(unprojectedPlayer).toBeDisabled();

  await legalHolder.click();
  await expect(page.locator('.opponent-player-card[data-player-anchor="p2"]')).toHaveClass(/selected-target/);
  const preview = page.locator('.interaction-stage[data-local-ui-mode="PREVIEW"]');
  await expect(preview).toHaveAttribute("data-local-preview-player-id", "p2");
  await expect(preview).toContainText("UNSUBMITTED TARGET · LOCAL PREVIEW");
  const confirm = page.locator('[data-console-surface="local-operation"] button.primary', { hasText: "Confirm" });
  await expect(confirm).toBeEnabled();
  await confirm.click();
  await expect.poll(() => page.evaluate(() => window.__browserActions.at(-1))).toEqual({
    action: "play_card",
    extra: { cardId: "browser-borrowed-sword", targetId: "p2" },
  });
  await expect(preview).toHaveAttribute("data-local-preview-player-id", "p2");
});

test("Borrowed Sword does not invent a target when CurrentAction projects none", async ({ page }) => {
  await loadFixture(page, "borrowed-sword-no-target");

  await expect(page.getByRole("button", { name: "Select Player 2" })).toBeDisabled();
  const confirm = page.locator('[data-console-surface="local-operation"] button.primary', { hasText: "Confirm" });
  await expect(confirm).toBeDisabled();
  expect(await page.evaluate(() => window.__browserActions)).toEqual([]);
});
