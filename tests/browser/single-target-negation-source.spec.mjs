import { expect, test } from "@playwright/test";

const viewports = [
  { width: 390, height: 844 },
  { width: 480, height: 900 },
  { width: 1440, height: 900 },
];

for (const viewport of viewports) {
  test(`proven single-target Negation source is compact at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.goto("/tests/browser/fixture.html?state=active-negation-observer&count=4&source=p3");

    const stage = page.locator('.interaction-stage[data-stage="NEGATION"]');
    const source = stage.locator('[data-negation-source="proven"]');
    await expect(stage).toBeVisible();
    await expect(source).toHaveAttribute("data-negation-source-player-id", "p3");
    await expect(source).toHaveAttribute("data-negation-source-known", "true");
    await expect(source.locator(".medium-participant-portrait")).toBeVisible();
    await expect(source.locator(".medium-participant-identity > b")).toHaveText("Player 3");
    await expect(source.locator(".medium-participant-role, .medium-participant-identity > span, .medium-participant-identity > small")).toHaveCount(0);
    await expect(stage.locator('[data-hero-focus-player-id="p2"]')).toBeVisible();

    const geometry = await source.evaluate((element) => {
      const rect = (node) => {
        const { left, top, right, bottom, width, height } = node.getBoundingClientRect();
        return { left, top, right, bottom, width, height };
      };
      const bounds = rect(element);
      const stageBounds = rect(element.closest(".interaction-stage"));
      const portrait = rect(element.querySelector(".medium-participant-portrait"));
      const overlaps = [".interaction-stage-current-effect", ".hero-focus"].flatMap((selector) => {
        const other = element.closest(".interaction-stage").querySelector(selector);
        if (!other) return [];
        const otherBounds = rect(other);
        return bounds.left < otherBounds.right && bounds.right > otherBounds.left
          && bounds.top < otherBounds.bottom && bounds.bottom > otherBounds.top ? [selector] : [];
      });
      return { bounds, stageBounds, portrait, overlaps, documentWidth: document.documentElement.scrollWidth };
    });

    expect(geometry.bounds.left).toBeGreaterThanOrEqual(geometry.stageBounds.left - 1);
    expect(geometry.bounds.right).toBeLessThanOrEqual(geometry.stageBounds.right + 1);
    expect(geometry.portrait.width).toBe(64);
    expect(geometry.portrait.height).toBe(82);
    expect(geometry.overlaps).toEqual([]);
    expect(geometry.documentWidth).toBe(viewport.width);
    const screenshot = await page.screenshot({ path: testInfo.outputPath(`single-target-negation-source-${viewport.width}px.png`), animations: "disabled" });
    await testInfo.attach(`single-target-negation-source-${viewport.width}px`, { body: screenshot, contentType: "image/png" });
  });
}

test("self-target Negation keeps one participant representation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tests/browser/fixture.html?state=active-negation-observer&count=4&source=p2");

  const stage = page.locator('.interaction-stage[data-stage="NEGATION"]');
  await expect(stage.locator('[data-hero-focus-player-id="p2"]')).toHaveCount(1);
  await expect(stage.locator('[data-negation-source="proven"], [data-medium-participant-player-id="p2"]')).toHaveCount(0);
});

test("non-Negation Stage source retains its existing medium participant details", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tests/browser/fixture.html?state=active-attack-observer&count=4");

  const stage = page.locator('.interaction-stage[data-stage="ATTACK_RESPONSE"]');
  const source = stage.locator('[data-medium-participant="source"]');
  await expect(source).toHaveAttribute("data-medium-participant-player-id", "p1");
  await expect(source.locator(".medium-participant-role")).toHaveText("SOURCE");
  await expect(source.locator(".medium-participant-identity > span")).toHaveCount(1);
  await expect(source.locator(".medium-participant-identity > small")).toHaveCount(1);
  await expect(source.locator("[data-negation-source]")).toHaveCount(0);
});
