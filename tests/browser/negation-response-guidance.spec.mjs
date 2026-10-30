import { expect, test } from "@playwright/test";

for (const viewport of [
  { width: 390, height: 844 },
  { width: 480, height: 900 },
  { width: 1440, height: 900 },
]) {
  test(`eligible Negation responder gets private Dock guidance at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/tests/browser/fixture.html?state=negation&privateNegationResponder=1");

    const legacyStage = page.locator('.interaction-stage[data-stage="NEGATION"]');
    const guidance = page.locator(".console-guidance .decision-status");
    const primary = page.locator('[data-action-slot="primary"] button');
    const pass = page.getByRole("button", { name: "Pass", exact: true });

    const action = await page.evaluate(() => window.__browserRoom.currentAction);
    const publicScene = await page.evaluate(() => window.__browserRoom.presentationSnapshot.interaction);
    expect(action.actorId).toBe("p2");
    expect(action.actorId).toBe(await page.evaluate(() => window.__browserRoom.meId));
    expect(action.requirement).toBe("negate");
    expect(action.legalActions).toEqual(["respond", "decline_response"]);
    expect(action.options.some((option) => option.satisfies === "negate")).toBe(true);
    expect(publicScene.decisionActorId).toBeNull();
    expect(publicScene.currentParticipantId).toBe("p1");

    await expect(guidance.locator("small")).toHaveText("YOUR RESPONSE");
    await expect(guidance.locator("strong")).toHaveText("Play Negation to cancel Dismantle's effect on Test Player 1, or Pass.");
    await expect(guidance.locator("em")).toHaveCount(0);
    await expect(primary).toHaveText("Confirm");
    await expect(primary).toBeDisabled();
    await expect(pass).toBeVisible();
    await expect(legacyStage).toHaveCount(0);

    await page.locator('[data-hand-card-id="browser-negation"] .game-card').click();
    await expect(primary).toBeEnabled();
    await expect(pass).toBeVisible();
    await expect(guidance.locator("strong")).toHaveText("Play Negation to cancel Dismantle's effect on Test Player 1, or Pass.");
    await expect(guidance.locator("em")).toHaveCount(0);
  });
}

test("a no-provider Negation participant can Pass without rendering the legacy public Stage", async ({ page }) => {
  await page.setViewportSize({ width: 480, height: 900 });
  await page.goto("/tests/browser/fixture.html?state=negation&privateNegationResponder=1&negationAuthority=missing-provider");

  const legacyStage = page.locator('.interaction-stage[data-stage="NEGATION"]');
  const guidance = page.locator(".console-guidance .decision-status");
  const currentAction = await page.evaluate(() => window.__browserRoom.currentAction);

  expect(currentAction.actorId).toBe(await page.evaluate(() => window.__browserRoom.meId));
  expect(currentAction.negationWindowId).toBe("browser-shared-negation-window");
  expect(currentAction.presentation.readyAfterEventId).toBe("browser-unpresented-negation-root");
  expect(currentAction.legalActions).toEqual(["decline_response"]);
  expect(currentAction.options).toEqual([]);
  await expect(guidance.locator("strong")).toHaveText("No Negation available. Pass.");
  await expect(legacyStage).toHaveCount(0);
  await expect(page.locator('[data-action-slot="primary"] button')).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Pass", exact: true })).toBeEnabled();
});

for (const { authority, hasResponseHeading } of [
  { authority: "missing-response", hasResponseHeading: false },
  { authority: "missing-decline", hasResponseHeading: true },
  { authority: "missing-provider", hasResponseHeading: false },
]) {
  test(`Negation guidance fails closed when CurrentAction is ${authority}`, async ({ page }) => {
    await page.setViewportSize({ width: 480, height: 900 });
    await page.goto(`/tests/browser/fixture.html?state=negation&privateNegationResponder=1&negationAuthority=${authority}`);

    const guidance = page.locator(".console-guidance .decision-status");
    if (hasResponseHeading) await expect(guidance.locator("small")).toHaveText("YOUR RESPONSE");
    else await expect(guidance.locator("small")).not.toHaveText("YOUR RESPONSE");
    await expect(guidance.locator("strong")).not.toHaveText("Play Negation to cancel Dismantle's effect on Test Player 1, or Pass.");
  });
}

test("a submitted shared Negation intent shows only the viewer's waiting state and no controls", async ({ page }) => {
  await page.setViewportSize({ width: 440, height: 894 });
  await page.goto("/tests/browser/fixture.html?state=negation&privateNegationResponder=1&privateNegationSubmitted=1");

  const guidance = page.locator(".console-guidance .decision-status");
  const currentAction = await page.evaluate(() => window.__browserRoom.currentAction);
  expect(currentAction.actorId).toBe(await page.evaluate(() => window.__browserRoom.meId));
  expect(currentAction.negationWindowId).toBe("browser-shared-negation-window");
  expect(currentAction.legalActions).toEqual([]);
  expect(currentAction.options).toEqual([]);
  await expect(guidance.locator("small")).toHaveText("WAITING FOR OTHERS");
  await expect(guidance.locator("strong")).toHaveText("Waiting for the other players.");
  await expect(page.locator('[data-action-slot="primary"] button, [data-action-slot="decline"] button')).toHaveCount(0);
  await expect(page.locator('.interaction-stage[data-stage="NEGATION"]')).toHaveCount(0);
});
