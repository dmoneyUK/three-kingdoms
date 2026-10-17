import { expect, test } from "@playwright/test";

const viewports = [
  { width: 320, height: 640 },
  { width: 390, height: 844 },
  { width: 480, height: 900 },
  { width: 1440, height: 900 },
];

async function loadSourceChoice(page, viewport = { width: 390, height: 844 }) {
  await page.setViewportSize(viewport);
  await page.goto("/tests/browser/fixture.html?state=hua-xiong-triumphant&count=4&targetHero=huaxiong");
  const facts = await page.evaluate(() => ({
    viewerId: window.__browserRoom.meId,
    actionActorId: window.__browserRoom.currentAction.actorId,
    viewerHero: window.__browserRoom.players.find((player) => player.id === window.__browserRoom.meId)?.hero,
    targetHero: window.__browserRoom.players.find((player) => player.id === "p2")?.hero,
  }));
  expect(facts).toEqual({ viewerId: "p1", actionActorId: "p1", viewerHero: "cao-cao", targetHero: "huaxiong" });
  return page.locator('.local-player-dock[data-player-anchor="p1"]');
}

for (const viewport of viewports) {
  test(`cross-Hero Triumphant choices use the source player's Dock buttons at ${viewport.width}px`, async ({ page }) => {
    const dock = await loadSourceChoice(page, viewport);
    const skills = dock.locator(".local-hero-skills");
    const actionControls = dock.locator('[data-console-surface="local-operation"]');
    const extras = dock.locator('[data-action-extras="true"]');
    const choiceButtons = extras.locator("[data-trigger-choice-action]");
    const skip = dock.locator('[data-action-slot="decline"] button');

    await expect(actionControls).toBeVisible();
    await expect(skills.getByRole("button", { name: /Triumphant/ })).toHaveCount(0);
    await expect(choiceButtons).toHaveCount(2);
    await expect(extras.locator('[data-trigger-choice-action="recover"]')).toHaveAccessibleName("Triumphant: Recover 1 HP");
    await expect(extras.locator('[data-trigger-choice-action="draw"]')).toHaveAccessibleName("Triumphant: Draw 1 card");
    await expect(skip).toHaveCount(1);
    await expect(skip).toHaveText("Skip");
    await expect(skip).toBeEnabled();
    await expect(page.getByRole("dialog", { name: "Triumphant decision" })).toHaveCount(0);

    const geometry = await dock.evaluate((element) => {
      const dockBounds = element.getBoundingClientRect();
      const controls = element.querySelector('[data-console-surface="local-operation"]');
      const actionBounds = controls.getBoundingClientRect();
      const buttons = Array.from(controls.querySelectorAll("[data-trigger-choice-action], [data-action-slot=\"decline\"] button")).map((button) => {
        const bounds = button.getBoundingClientRect();
        return { left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom, width: bounds.width, height: bounds.height };
      });
      return {
        dock: { left: dockBounds.left, right: dockBounds.right },
        action: { left: actionBounds.left, right: actionBounds.right, top: actionBounds.top, bottom: actionBounds.bottom },
        buttons,
        documentWidth: document.documentElement.scrollWidth,
      };
    });

    expect(geometry.documentWidth).toBeLessThanOrEqual(viewport.width);
    expect(geometry.buttons).toHaveLength(3);
    for (const button of geometry.buttons) {
      expect(button.left).toBeGreaterThanOrEqual(geometry.dock.left - 1);
      expect(button.right).toBeLessThanOrEqual(geometry.dock.right + 1);
      expect(button.left).toBeGreaterThanOrEqual(geometry.action.left - 1);
      expect(button.right).toBeLessThanOrEqual(geometry.action.right + 1);
      expect(button.top).toBeGreaterThanOrEqual(geometry.action.top - 1);
      expect(button.bottom).toBeLessThanOrEqual(geometry.action.bottom + 1);
      expect(button.width).toBeGreaterThan(0);
      expect(button.height).toBeGreaterThan(0);
    }
    for (let left = 0; left < geometry.buttons.length; left += 1) {
      for (let right = left + 1; right < geometry.buttons.length; right += 1) {
        const a = geometry.buttons[left];
        const b = geometry.buttons[right];
        const overlapWidth = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
        const overlapHeight = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
        expect(overlapWidth * overlapHeight).toBe(0);
      }
    }
  });
}

for (const choice of [
  { id: "recover", label: "Recover 1 HP" },
  { id: "draw", label: "Draw 1 card" },
]) {
  test(`Triumphant ${choice.id} submits the exact CurrentAction choice`, async ({ page }) => {
    const dock = await loadSourceChoice(page);
    await page.evaluate(() => { window.__browserActions = []; });
    await dock.locator(`[data-trigger-choice-action="${choice.id}"]`).click();
    await expect.poll(() => page.evaluate(() => window.__browserActions.filter((entry) => entry.action === "trigger" || entry.action === "decline_trigger"))).toEqual([
      { action: "trigger", extra: { providerId: "hua_xiong_triumphant", choice: choice.id } },
    ]);
  });
}

test("Skip stays in the Local Dock action row and uses authoritative decline", async ({ page }) => {
  const dock = await loadSourceChoice(page);
  await page.evaluate(() => { window.__browserActions = []; });
  await dock.locator('[data-action-slot="decline"] button').click();
  await expect.poll(() => page.evaluate(() => window.__browserActions.filter((entry) => entry.action === "trigger" || entry.action === "decline_trigger"))).toEqual([
    { action: "decline_trigger" },
  ]);
});

test("Hua Xiong sees the passive skill identity but not the source player's private choice", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tests/browser/fixture.html?state=hua-xiong-triumphant-observer&count=4&targetHero=huaxiong");
  const facts = await page.evaluate(() => ({
    viewerId: window.__browserRoom.meId,
    actionActorId: window.__browserRoom.currentAction.actorId,
    actionKind: window.__browserRoom.currentAction.kind,
    visibleTriggerOptions: window.__browserRoom.currentAction.triggerOptions ?? [],
  }));
  expect(facts).toEqual({ viewerId: "p2", actionActorId: "p1", actionKind: "response", visibleTriggerOptions: [] });

  const dock = page.locator('.local-player-dock[data-player-anchor="p2"]');
  await expect(dock.locator(".local-hero-skills").getByRole("group", { name: "Triumphant, passive skill" })).toBeVisible();
  await expect(dock.locator('[data-trigger-choice-action]')).toHaveCount(0);
  await expect(dock.locator('[data-action-slot="decline"] button')).toHaveCount(0);
});
