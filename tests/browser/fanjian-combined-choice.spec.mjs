import { expect, test } from "@playwright/test";

test("Fanjian cancels on skill retap and submits one compact combined choice on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tests/browser/fixture.html?state=zhou-yu-sowing-distrust&count=4&hero=zhou-yu");

  const dock = page.locator('.local-player-dock[data-player-anchor="p1"]');
  const skill = dock.locator(".local-hero-skills").getByRole("button", { name: "Sowing Distrust", exact: true });
  await expect(skill).toBeEnabled();
  await page.evaluate(() => { window.__browserActions = []; });

  await skill.click();
  await expect(skill).toHaveAttribute("aria-pressed", "true");
  const target = page.locator('[data-player-anchor="p2"] .opponent-hero-target');
  await expect(target).toBeEnabled();
  await target.click();
  await expect(page.locator('[data-console-surface="local-operation"] button.primary')).toHaveText("Confirm");

  await skill.click();
  await expect(skill).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator('[data-player-anchor="p2"][data-target-selectable="true"]')).toHaveCount(0);
  expect(await page.evaluate(() => window.__browserActions)).toEqual([]);

  await skill.click();
  await target.click();
  await page.locator('[data-console-surface="local-operation"] button.primary').click();
  await expect.poll(() => page.evaluate(() => window.__browserActions)).toEqual([
    { action: "trigger", extra: { providerId: "zhou_yu_fanjian", targetId: "p2" } },
  ]);

  await page.goto("/tests/browser/fixture.html?state=fanjian-combined&count=4&targetHandCount=7&hero=zhou-yu");
  const stage = page.locator('[data-fanjian-combined-choice="true"]');
  await expect(stage).toBeVisible();
  await expect(stage).toHaveAttribute("data-choice-mode", "actor-target-select");
  await expect(stage.getByText("SOWING DISTRUST", { exact: true })).toBeVisible();
  await expect(stage.getByText("Choose a suit and one hidden card.", { exact: true })).toBeVisible();

  const suitGroup = stage.getByRole("group", { name: "Choose a suit" });
  const suitButtons = suitGroup.getByRole("button");
  await expect(suitButtons).toHaveCount(4);
  const suitGeometry = await suitButtons.evaluateAll((buttons) => buttons.map((button) => {
    const rect = button.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  }));
  for (const rect of suitGeometry) {
    expect(rect.width).toBeGreaterThanOrEqual(44);
    expect(rect.height).toBeGreaterThanOrEqual(44);
  }
  expect(suitGeometry[0].y).toBeCloseTo(suitGeometry[1].y, 0);

  await expect(stage.getByText("Hand (7)", { exact: true })).toHaveCount(1);
  await expect(stage.getByRole("heading", { name: "Choose one hidden card", exact: true })).toBeVisible();
  await expect(stage.getByText("Swipe for more", { exact: true })).toBeVisible();
  const handRail = stage.locator(".card-pool-panel__target-public-backs");
  const positions = handRail.locator(".card-pool-panel__target-public-position");
  const hiddenChoices = handRail.getByRole("button", { name: /^Choose hidden Hand position / });
  await expect(positions).toHaveCount(7);
  await expect(hiddenChoices).toHaveCount(7);
  const railGeometry = await handRail.evaluate((rail) => {
    const railRect = rail.getBoundingClientRect();
    const boxes = [...rail.querySelectorAll(".card-pool-panel__target-public-position")].map((position) => {
      const rect = position.getBoundingClientRect();
      return { left: rect.left, right: rect.right, width: rect.width };
    });
    return { left: railRect.left, right: railRect.right, clientWidth: rail.clientWidth, scrollWidth: rail.scrollWidth, boxes };
  });
  expect(railGeometry.scrollWidth).toBeGreaterThan(railGeometry.clientWidth);
  for (const box of railGeometry.boxes.slice(0, 4)) {
    expect(box.width).toBe(44);
    expect(box.left).toBeGreaterThanOrEqual(railGeometry.left);
    expect(box.right).toBeLessThanOrEqual(railGeometry.right + 0.5);
  }
  expect(railGeometry.boxes[4].left).toBeGreaterThanOrEqual(railGeometry.right - 0.5);
  const pageText = await stage.innerText();
  expect(pageText).not.toMatch(/browser-|Attack|Dodge|Peach|Negation/);

  const confirm = stage.getByRole("button", { name: "Confirm", exact: true });
  await expect(stage.getByRole("button", { name: "Confirm", exact: true })).toHaveCount(1);
  await expect(confirm).toBeDisabled();
  await suitGroup.getByRole("button", { name: "♥ Heart", exact: true }).click();
  await expect(confirm).toBeDisabled();
  await handRail.evaluate((rail) => { rail.scrollLeft = rail.scrollWidth; });
  const finalPosition = handRail.getByRole("button", { name: "Choose hidden Hand position 7" });
  await finalPosition.click();
  await expect(finalPosition).toHaveAttribute("aria-pressed", "true");
  await expect(confirm).toBeEnabled();
  await page.evaluate(() => { window.__browserActions = []; });
  await confirm.dblclick();
  await expect.poll(() => page.evaluate(() => window.__browserActions)).toEqual([
    { action: "trigger", extra: { providerId: "zhou_yu_fanjian_choice", choice: "♥", cardKeys: ["hand:6"] } },
  ]);
});
