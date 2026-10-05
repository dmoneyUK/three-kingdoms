import { expect, test } from "@playwright/test";

for (const viewport of [
  { width: 390, height: 844 },
  { width: 480, height: 900 },
  { width: 1440, height: 900 },
]) {
  test(`eligible Negation responder gets private Dock guidance at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/tests/browser/fixture.html?state=negation&privateNegationResponder=1");

    const stage = page.locator('.interaction-stage[data-stage="NEGATION"]');
    const guidance = page.locator(".console-guidance .decision-status");
    const primary = page.locator('[data-action-slot="primary"] button');
    const skip = page.getByRole("button", { name: "Skip", exact: true });

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
    await expect(guidance.locator("strong")).toHaveText("Play Negation or Skip.");
    await expect(guidance.locator("em")).toHaveCount(0);
    await expect(primary).toHaveText("Confirm");
    await expect(primary).toBeDisabled();
    await expect(skip).toBeVisible();
    await expect(stage).not.toContainText("Player 2");
    await expect(stage).not.toContainText("YOUR RESPONSE");
    await expect(stage).not.toContainText("Play Negation or Skip.");

    await page.locator('[data-hand-card-id="browser-negation"] .game-card').click();
    await expect(primary).toBeEnabled();
    await expect(skip).toBeVisible();
    await expect(guidance.locator("strong")).toHaveText("Play Negation or Skip.");
    await expect(guidance.locator("em")).toHaveCount(0);
  });
}

test("open Negation observer receives neutral Stage copy and no private response controls", async ({ page }) => {
  await page.setViewportSize({ width: 480, height: 900 });
  await page.goto("/tests/browser/fixture.html?state=negation&timedResponse=1&timedObserver=1");

  const stage = page.locator('.interaction-stage[data-stage="NEGATION"]');
  const guidance = page.locator(".console-guidance .decision-status");
  const currentAction = await page.evaluate(() => window.__browserRoom.currentAction);

  expect(currentAction.actorId).toBeNull();
  expect(currentAction.legalActions).toEqual([]);
  expect(currentAction).not.toHaveProperty("options");
  await expect(guidance).not.toContainText("YOUR RESPONSE");
  await expect(guidance).not.toContainText("Play Negation or Skip.");
  await expect(stage).not.toContainText("Player 2");
  await expect(stage).not.toContainText("YOUR RESPONSE");
  await expect(stage).not.toContainText("Play Negation or Skip.");
  await expect(page.locator('[data-action-slot="primary"] button')).toHaveCount(0);
  await expect(page.locator('[data-action-slot="decline"] button')).toHaveCount(0);
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
    await expect(guidance.locator("strong")).not.toHaveText("Play Negation or Skip.");
    await expect(page.locator('.interaction-stage[data-stage="NEGATION"]')).not.toContainText("Play Negation or Skip.");
  });
}
