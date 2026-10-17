import { expect, test } from "@playwright/test";

test("Quick Test viewer switching reprojects one public Attack without replaying it", async ({ page }) => {
  await page.setViewportSize({ width: 480, height: 900 });
  await page.goto("/tests/browser/fixture.html?state=active-attack-observer&count=4");

  const stage = page.locator('[aria-label="Interaction Stage"][data-stage="ATTACK_RESPONSE"]');
  const publicSnapshot = () => page.evaluate(() => {
    const shared = { ...window.__browserRoom.presentationSnapshot };
    delete shared.localControl;
    return shared;
  });
  const sharedBefore = await publicSnapshot();
  const initialRoom = await page.evaluate(() => ({
    meId: window.__browserRoom.meId,
    currentAction: window.__browserRoom.currentAction,
    localControl: window.__browserRoom.presentationSnapshot.localControl,
  }));

  expect(initialRoom.meId).toBe("p3");
  expect(initialRoom.currentAction.actorId).toBe("p2");
  expect(initialRoom.currentAction.legalActions).toEqual([]);
  expect(initialRoom.localControl.entitled).toBe(false);
  expect(await page.evaluate(() => window.__browserActions)).toEqual([]);
  await expect(stage.locator('[data-hero-focus-player-id="p2"]')).toBeVisible();
  await expect(page.locator('.local-player-dock[data-player-anchor="p3"]')).toBeVisible();
  await expect(page.locator('[data-action-slot="primary"] button')).toHaveCount(0);

  await page.evaluate(() => window.__switchQuickTestViewer("p2"));

  const actingRoom = await page.evaluate(() => ({
    meId: window.__browserRoom.meId,
    currentAction: window.__browserRoom.currentAction,
    localControl: window.__browserRoom.presentationSnapshot.localControl,
  }));
  expect(actingRoom.meId).toBe("p2");
  expect(actingRoom.currentAction.actorId).toBe("p2");
  expect(actingRoom.currentAction.legalActions).toEqual(["respond", "decline_response"]);
  expect(actingRoom.currentAction.options).toEqual(expect.arrayContaining([
    expect.objectContaining({ providerId: "dodge_card", satisfies: "dodge" }),
  ]));
  expect(actingRoom.localControl.entitled).toBe(true);
  expect(await publicSnapshot()).toEqual(sharedBefore);

  const actingDock = page.locator('.local-player-dock[data-player-anchor="p2"]');
  await expect(actingDock).toBeVisible();
  await expect(actingDock).toHaveAttribute("data-interaction-active-target", "true");
  await expect(actingDock).toHaveAttribute("data-interaction-current-participant", "true");
  await expect(actingDock).toHaveAttribute("data-interaction-decision-actor", "true");
  await expect(actingDock).toHaveAttribute("data-interaction-viewer-decision", "true");
  await expect(page.locator('.local-player-dock[data-player-anchor="p3"]')).toHaveCount(0);
  await expect(stage.locator('[data-hero-focus-player-id="p2"]')).toHaveCount(0);
  await expect(actingDock.locator('[data-hand-card-id="browser-dodge"]')).toBeVisible();
  await expect(actingDock.locator(".console-guidance .decision-status small")).toHaveText("YOUR RESPONSE");
  await expect(page.locator(".game-shell")).toHaveAttribute("data-presentation-transition", "NONE");
  await expect(stage).toHaveAttribute("data-presentation-transition", "NONE");
  await expect(page.locator(".play-table")).not.toHaveClass(/sequence-active|sequence-concluding/);
  const timerArmCalls = await page.evaluate(() => window.__browserActions);
  expect(timerArmCalls.map(({ action }) => action)).toEqual(["start_response_timer"]);

  await page.evaluate(() => window.__switchQuickTestViewer("p3"));

  const observerRoom = await page.evaluate(() => ({
    meId: window.__browserRoom.meId,
    currentAction: window.__browserRoom.currentAction,
    localControl: window.__browserRoom.presentationSnapshot.localControl,
  }));
  expect(observerRoom.meId).toBe("p3");
  expect(observerRoom.currentAction.actorId).toBe("p2");
  expect(observerRoom.currentAction.legalActions).toEqual([]);
  expect(observerRoom.currentAction.options).toBeUndefined();
  expect(observerRoom.localControl.entitled).toBe(false);
  expect(await publicSnapshot()).toEqual(sharedBefore);
  await expect(page.locator('.local-player-dock[data-player-anchor="p3"]')).toBeVisible();
  await expect(page.locator('.local-player-dock[data-player-anchor="p2"]')).toHaveCount(0);
  await expect(stage.locator('[data-hero-focus-player-id="p2"]')).toBeVisible();
  await expect(page.locator('[data-action-slot="primary"] button')).toHaveCount(0);
  await expect(page.locator(".game-shell")).toHaveAttribute("data-presentation-transition", "NONE");
  await expect(stage).toHaveAttribute("data-presentation-transition", "NONE");
  expect(await page.evaluate(() => window.__browserActions)).toEqual(timerArmCalls);
  expect(timerArmCalls.filter(({ action }) => action !== "start_response_timer")).toEqual([]);
});
