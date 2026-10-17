import { expect, test } from "@playwright/test";

for (const viewport of [
  { width: 390, height: 844 },
  { width: 480, height: 900 },
  { width: 1440, height: 900 },
]) {
  test(`Raining Arrows emphasizes only the authoritative Dodge card at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/tests/browser/fixture.html?state=raining-arrows-response&groupProgress=valid");

    const handSection = page.locator(".local-hand-section");
    const dodge = page.locator('[data-hand-card-id="browser-raining-arrows-dodge"] .game-card');
    const unrelatedAttack = page.locator('[data-hand-card-id="browser-raining-arrows-unrelated-attack"] .game-card');
    const action = await page.evaluate(() => window.__browserRoom.currentAction);

    expect(action.requirement).toBe("dodge");
    expect(action.options[0].selection.eligibleCardIds).toEqual(["browser-raining-arrows-dodge"]);
    await expect(handSection).toHaveAttribute("data-raining-arrows-dodge-providers", "available");
    await expect(dodge).toBeVisible();
    await expect(dodge).toBeEnabled();
    await expect(unrelatedAttack).toBeVisible();
    await expect(unrelatedAttack).toBeDisabled();
    await expect(unrelatedAttack).toHaveCSS("opacity", "0.64");

    const providerStyles = await dodge.evaluate((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return { borderColor: style.borderColor, boxShadow: style.boxShadow, width: rect.width, height: rect.height };
    });
    const unrelatedGeometry = await unrelatedAttack.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    });
    expect(providerStyles.borderColor).toBe("rgb(229, 189, 104)");
    expect(providerStyles.boxShadow).not.toBe("none");
    expect(providerStyles.width).toBe(unrelatedGeometry.width);
    expect(providerStyles.height).toBe(unrelatedGeometry.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
  });
}

test("provider emphasis fails closed for generic and unproven Dodge responses", async ({ page }) => {
  await page.setViewportSize({ width: 480, height: 900 });

  await page.goto("/tests/browser/fixture.html?state=dodge");
  await expect(page.locator(".local-hand-section")).not.toHaveAttribute("data-raining-arrows-dodge-providers", "available");
  await expect(page.locator('[data-hand-card-id="browser-dodge"] .game-card')).toBeEnabled();

  await page.goto("/tests/browser/fixture.html?state=raining-arrows-response");
  const unprovenHand = page.locator(".local-hand-section");
  const unprovenDodge = page.locator('[data-hand-card-id="browser-raining-arrows-dodge"] .game-card');
  const unrelatedAttack = page.locator('[data-hand-card-id="browser-raining-arrows-unrelated-attack"] .game-card');
  const unprovenSnapshot = await page.evaluate(() => window.__browserRoom.presentationSnapshot);
  expect(unprovenSnapshot.groupParticipantProgress).toBeNull();
  await expect(unprovenHand).not.toHaveAttribute("data-raining-arrows-dodge-providers", "available");
  await expect(unprovenDodge).toBeEnabled();
  await expect(unrelatedAttack).toBeDisabled();
  await expect(unrelatedAttack).toHaveCSS("opacity", "1");
});
