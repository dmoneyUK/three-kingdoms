import { expect, test } from "@playwright/test";

const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 480, height: 900 },
  { width: 1440, height: 900 },
];

for (const response of [
  { state: "duel-response", requirement: "attack", cardId: "browser-attack", instruction: "Duel Exchange" },
  { state: "dodge", requirement: "dodge", cardId: "browser-dodge", instruction: "Attack Response" },
]) {
  for (const viewport of VIEWPORTS) {
    test(`${response.state} response uses private Dock heading at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto(`/tests/browser/fixture.html?state=${response.state}`);

      const action = await page.evaluate(() => window.__browserRoom.currentAction);
      const guidance = page.locator(".console-guidance .decision-status");
      const stage = page.locator(".interaction-stage");
      const primary = page.locator('[data-action-slot="primary"] button');
      const skip = page.getByRole("button", { name: "Skip", exact: true });

      expect(action.kind).toBe("response");
      expect(action.actorId).toBe(await page.evaluate(() => window.__browserRoom.meId));
      expect(action.requirement).toBe(response.requirement);
      expect(action.legalActions).toContain("respond");
      expect(action.options.some((option) => option.satisfies === response.requirement)).toBe(true);
      await expect(guidance.locator("small")).toHaveText("YOUR RESPONSE");
      await expect(guidance.locator("strong")).toHaveText(response.instruction);
      await expect(stage).not.toContainText("YOUR RESPONSE");
      await expect(stage).not.toContainText("YOUR DECISION");
      await expect(primary).toHaveText("Confirm");
      await expect(primary).toBeDisabled();
      await expect(skip).toBeVisible();

      await page.locator(`[data-hand-card-id="${response.cardId}"] .game-card`).click();
      await expect(primary).toBeEnabled();
      await expect(skip).toBeVisible();
    });
  }
}

test("response heading fails closed without a matching CurrentAction requirement provider", async ({ page }) => {
  await page.setViewportSize({ width: 480, height: 900 });
  await page.goto("/tests/browser/fixture.html?state=dodge-mismatch");

  const action = await page.evaluate(() => window.__browserRoom.currentAction);
  const guidance = page.locator(".console-guidance .decision-status");

  expect(action.kind).toBe("response");
  expect(action.legalActions).toContain("respond");
  expect(action.requirement).toBe("dodge");
  expect(action.options.some((option) => option.satisfies === action.requirement)).toBe(false);
  await expect(guidance.locator("small")).not.toHaveText("YOUR RESPONSE");
});

test("Duel observer does not receive private response heading or controls", async ({ page }) => {
  await page.setViewportSize({ width: 480, height: 900 });
  await page.goto("/tests/browser/fixture.html?state=duel&duelObserver=1");

  const action = await page.evaluate(() => window.__browserRoom.currentAction);
  const guidance = page.locator(".console-guidance .decision-status");

  expect(action.actorId).not.toBe(await page.evaluate(() => window.__browserRoom.meId));
  expect(action.legalActions).toEqual([]);
  await expect(guidance.locator("small")).not.toHaveText("YOUR RESPONSE");
  await expect(page.locator('[data-action-slot="primary"] button')).toHaveCount(0);
  await expect(page.locator('[data-action-slot="decline"] button')).toHaveCount(0);
});
