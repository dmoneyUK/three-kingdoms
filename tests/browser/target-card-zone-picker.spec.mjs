import { expect, test } from "@playwright/test";

async function loadPicker(page, { width, height = 844, handCount = 4 }) {
  await page.setViewportSize({ width, height });
  await page.goto(`/tests/browser/fixture.html?state=picker-hand-zone&count=4&targetHandCount=${handCount}`);
  const dialog = page.getByRole("dialog", { name: "Retaliation target card selection" });
  await expect(dialog).toBeVisible();
  return dialog;
}

for (const viewport of [
  { width: 390, height: 844 },
  { width: 480, height: 900 },
  { width: 1440, height: 900 },
]) {
  test(`concealed Hand count and zone choice remain readable at ${viewport.width}px`, async ({ page }) => {
    const dialog = await loadPicker(page, viewport);
    const handZone = dialog.locator('[data-target-card-zone="hand"]');
    const row = dialog.locator(".target-card-picker-card-row");

    await expect(dialog.locator("header span")).toHaveText("Choose where to obtain 1 card");
    await expect(handZone).toHaveCount(1);
    await expect(handZone).toHaveAccessibleName("Hand ×4 · Random card");
    await expect(handZone).toContainText("Hand ×4");
    await expect(handZone).toContainText("Random card");
    await expect(handZone.locator(".target-card-picker-hand-back")).toHaveCount(4);
    await expect(handZone).toHaveAttribute("aria-pressed", "false");
    const targetProjection = await page.evaluate(() => window.__browserRoom.players.find((player) => player.id === "p1"));
    expect(targetProjection.handCount).toBe(4);
    expect(targetProjection.handCards ?? []).toEqual([]);

    const publicEquipment = dialog.locator('[data-target-card-zone="equipment"]');
    const publicJudgement = dialog.locator('[data-target-card-zone="judgement"]');
    await expect(publicEquipment).toHaveCount(1);
    await expect(publicEquipment).toHaveAttribute("aria-label", /^Equipment: /);
    await expect(publicJudgement).toHaveCount(1);
    await expect(publicJudgement).toHaveAttribute("aria-label", /^Judgement: /);

    const bounds = await dialog.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return { left: box.left, right: box.right, top: box.top, bottom: box.bottom };
    });
    const handBounds = await handZone.boundingBox();
    const rowBounds = await row.boundingBox();
    expect(bounds.left).toBeGreaterThanOrEqual(0);
    expect(bounds.right).toBeLessThanOrEqual(viewport.width);
    expect(bounds.top).toBeGreaterThanOrEqual(0);
    expect(bounds.bottom).toBeLessThanOrEqual(viewport.height);
    expect(handBounds && rowBounds).toBeTruthy();
    expect(handBounds.x).toBeGreaterThanOrEqual(rowBounds.x);
    expect(handBounds.x + handBounds.width).toBeLessThanOrEqual(rowBounds.x + rowBounds.width + 1);
  });
}

test("large concealed Hands keep the exact public count without expanding into many selectable cards", async ({ page }) => {
  const dialog = await loadPicker(page, { width: 390, handCount: 10 });
  const handZone = dialog.locator('[data-target-card-zone="hand"]');

  await expect(handZone).toHaveAccessibleName("Hand ×10 · Random card");
  await expect(handZone).toContainText("Hand ×10");
  await expect(handZone.locator(".target-card-picker-hand-back")).toHaveCount(6);
  await expect(handZone.locator(".target-card-picker-hand-overflow")).toHaveText("+4");
  await expect(dialog.locator('[data-target-card-zone="hand"]')).toHaveCount(1);
});

test("selecting the concealed Hand submits its one existing semantic key", async ({ page }) => {
  const dialog = await loadPicker(page, { width: 390 });
  const handZone = dialog.locator('[data-target-card-zone="hand"]');

  await handZone.click();
  await expect(handZone).toHaveAttribute("aria-pressed", "true");
  await expect(dialog.locator(".target-card-picker-count")).toHaveText("1 / 1 selected");
  await dialog.getByRole("button", { name: "Use Retaliation" }).click();

  await expect.poll(() => page.evaluate(() => window.__browserActions.filter((entry) => entry.action === "trigger"))).toEqual([
    { action: "trigger", extra: { providerId: "browser_retaliation_zone", cardKeys: ["hand"] } },
  ]);
});

for (const { zone, key } of [
  { zone: "equipment", key: "browser-public-equipment" },
  { zone: "judgement", key: "browser-public-judgement" },
]) {
  test(`public ${zone} remains an individually selectable physical card`, async ({ page }) => {
    const dialog = await loadPicker(page, { width: 390 });
    const publicCard = dialog.locator(`[data-target-card-zone="${zone}"]`);
    const handZone = dialog.locator('[data-target-card-zone="hand"]');

    await publicCard.click();
    await expect(publicCard).toHaveAttribute("aria-pressed", "true");
    await expect(handZone).toHaveAttribute("aria-pressed", "false");
    await dialog.getByRole("button", { name: "Use Retaliation" }).click();

    await expect.poll(() => page.evaluate(() => window.__browserActions.filter((entry) => entry.action === "trigger"))).toEqual([
      { action: "trigger", extra: { providerId: "browser_retaliation_zone", cardKeys: [key] } },
    ]);
  });
}
