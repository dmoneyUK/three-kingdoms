import { expect, test } from "@playwright/test";

for (const viewport of [
  { width: 390, height: 844 },
  { width: 480, height: 900 },
  { width: 1440, height: 900 },
]) {
  test(`proven no-Dodge Raining Arrows offers TAKE DAMAGE at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/tests/browser/fixture.html?state=raining-arrows-no-dodge&groupProgress=valid");

    const stage = page.locator('.interaction-stage[data-stage="GROUP_RESOLUTION"]');
    const dock = page.locator('.local-player-dock[data-player-anchor="p1"]');
    const decline = dock.locator('[data-action-slot="decline"] button');
    const action = await page.evaluate(() => window.__browserRoom.currentAction);
    const snapshot = await page.evaluate(() => window.__browserRoom.presentationSnapshot);

    expect(action.actorId).toBe("p1");
    expect(action.requirement).toBe("dodge");
    expect(action.legalActions).toEqual(["decline_response"]);
    expect(action.options).toEqual([]);
    expect(snapshot.interaction.currentParticipantId).toBe("p1");
    expect(snapshot.groupParticipantProgress.currentParticipantId).toBe("p1");

    await expect(stage.locator('[data-group-root-action="RainingArrows"]')).toBeVisible();
    await expect(dock.locator('[data-action-slot="primary"] button')).toHaveCount(0);
    await expect(decline).toHaveText("TAKE DAMAGE");
    await expect(decline).toBeEnabled();
    await expect(stage).not.toContainText("TAKE DAMAGE");
    await expect(stage).not.toContainText("YOUR RESPONSE");

    await decline.click();
    expect(await page.evaluate(() => window.__browserActions.map(({ action: submitted }) => submitted).filter((submitted) => submitted !== "start_response_timer"))).toEqual(["decline_response"]);
  });
}

test("Raining Arrows keeps TAKE DAMAGE beside an available Dodge without enabling Confirm early", async ({ page }) => {
  await page.setViewportSize({ width: 480, height: 900 });
  await page.goto("/tests/browser/fixture.html?state=raining-arrows-response&groupProgress=valid");

  const dock = page.locator('.local-player-dock[data-player-anchor="p1"]');
  const decline = dock.locator('[data-action-slot="decline"] button');
  const confirm = dock.locator('[data-action-slot="primary"] button');
  const action = await page.evaluate(() => window.__browserRoom.currentAction);

  expect(action.actorId).toBe("p1");
  expect(action.requirement).toBe("dodge");
  expect(action.legalActions).toEqual(["respond", "decline_response"]);
  expect(action.options).toHaveLength(1);
  expect(action.options[0].selection.eligibleCardIds).toEqual(["browser-raining-arrows-dodge"]);

  await expect(decline).toHaveText("TAKE DAMAGE");
  await expect(confirm).toHaveText("Confirm");
  await expect(confirm).toBeDisabled();
  await page.locator('[data-hand-card-id="browser-raining-arrows-dodge"] .game-card').click();
  await expect(confirm).toBeEnabled();
  await expect(decline).toHaveText("TAKE DAMAGE");
});

test("the damage label fails closed without proven Group progress and stays generic outside Raining Arrows", async ({ page }) => {
  await page.setViewportSize({ width: 480, height: 900 });
  const decline = page.locator('[data-action-slot="decline"] button');

  await page.goto("/tests/browser/fixture.html?state=raining-arrows-no-dodge");
  await expect(decline).toHaveText("Skip");

  await page.goto("/tests/browser/fixture.html?state=dodge");
  await expect(page.locator('.interaction-stage[data-stage="ATTACK_RESPONSE"]')).toBeVisible();
  await expect(page.locator('.local-player-dock[data-player-anchor="p2"] [data-action-slot="decline"] button')).toHaveText("Skip");
});
