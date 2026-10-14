import { expect, test } from "@playwright/test";

for (const viewport of [
  { width: 390, height: 844 },
  { width: 480, height: 900 },
  { width: 1440, height: 900 },
]) {
  test(`proven no-Dodge Raining Arrows offers TAKE DAMAGE at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/tests/browser/fixture.html?state=raining-arrows-no-dodge&groupProgress=valid");

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

    await expect(dock.locator('[data-action-slot="primary"] button')).toHaveCount(0);
    await expect(decline).toHaveText("TAKE DAMAGE");
    await expect(decline).toBeEnabled();

    await decline.click();
    expect(await page.evaluate(() => window.__browserActions.map(({ action: submitted }) => submitted).filter((submitted) => submitted !== "start_response_timer"))).toEqual(["decline_response"]);
  });
}

test("Raining Arrows with a legal Dodge keeps the generic decline label without enabling Confirm early", async ({ page }) => {
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

  await expect(decline).toHaveText("Skip");
  await expect(confirm).toHaveText("Confirm");
  await expect(confirm).toBeDisabled();
  await page.locator('[data-hand-card-id="browser-raining-arrows-dodge"] .game-card').click();
  await expect(confirm).toBeEnabled();
  await expect(decline).toHaveText("Skip");
});

test("damage labels use the authoritative CurrentAction and Negation retains Pass", async ({ page }) => {
  await page.setViewportSize({ width: 480, height: 900 });
  const decline = page.locator('[data-action-slot="decline"] button');

  await page.goto("/tests/browser/fixture.html?state=raining-arrows-no-dodge");
  await expect(decline).toHaveText("TAKE DAMAGE");

  await page.goto("/tests/browser/fixture.html?state=dodge");
  await expect(page.locator('.local-player-dock[data-player-anchor="p2"] [data-action-slot="decline"] button')).toHaveText("Skip");

  await page.goto("/tests/browser/fixture.html?state=negation&privateNegationResponder=1&negationAuthority=missing-provider");
  await expect(page.locator('[data-action-slot="decline"] button')).toHaveText("Pass");

  await page.goto("/tests/browser/fixture.html?state=xiahou-dun-stauchness");
  await expect(page.locator('[data-action-slot="decline"] button')).toHaveText("Skip");
});
