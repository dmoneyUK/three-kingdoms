import { expect, test } from "@playwright/test";

async function loadFixture(page, { count = 4, width, height = 900, state = "active-attack-observer", effect = null }) {
  await page.setViewportSize({ width, height });
  const effectQuery = effect ? `&effect=${encodeURIComponent(effect)}` : "";
  await page.goto(`/tests/browser/fixture.html?state=${state}&count=${count}${effectQuery}`);
  await expect(page.locator(".game-shell")).toBeVisible();
}

for (const viewport of [
  { count: 4, width: 390, height: 844, topology: "top-row" },
  { count: 6, width: 480, height: 900, topology: "side-column" },
  { count: 4, width: 1440, height: 900, topology: "top-row" },
]) {
  test(`proven Attack Response Current Effect fits ${viewport.topology} at ${viewport.width}px`, async ({ page }) => {
    await loadFixture(page, viewport);
    const stage = page.locator('[aria-label="Interaction Stage"]');
    const source = stage.locator('.medium-participant-card[data-medium-participant-player-id="p1"]');
    const effect = stage.locator('[aria-label="Current Effect"]');
    const target = stage.locator('[data-hero-focus="true"][data-hero-focus-player-id="p2"]');
    await expect(stage).toHaveAttribute("data-stage", "ATTACK_RESPONSE");
    await expect(stage).toHaveAttribute("data-current-effect", "Attack");
    await expect(effect).toContainText("CURRENT EFFECT");
    await expect(effect.locator("strong")).toHaveText("Attack");
    await expect(stage).toHaveAttribute("data-interaction-id", "browser-active-attack-observer-interaction");
    await expect(source).toContainText("Player 1");
    await expect(target).toContainText("Player 2");
    await expect(stage).not.toContainText("Player 3");
    await expect(page.locator('.local-player-dock[data-player-anchor="p3"]')).toBeVisible();
    await expect(page.locator(".local-player-dock")).toContainText("Sun Quan");
    await expect(stage).not.toContainText("Sun Quan");
    expect(await page.evaluate(() => window.__browserActions)).toEqual([]);

    const sourceBox = await source.boundingBox();
    const effectBox = await effect.boundingBox();
    const targetBox = await target.boundingBox();
    const stageBox = await stage.boundingBox();
    const dockBox = await page.locator(".local-player-dock").boundingBox();
    expect(sourceBox && effectBox && targetBox && stageBox && dockBox).toBeTruthy();
    if (viewport.topology === "side-column") {
      expect(sourceBox.y + sourceBox.height).toBeLessThanOrEqual(effectBox.y + 2);
      expect(effectBox.y + effectBox.height).toBeLessThanOrEqual(targetBox.y + 2);
    } else if (viewport.width <= 650) {
      expect(sourceBox.x + sourceBox.width).toBeLessThanOrEqual(effectBox.x + 2);
      expect(effectBox.y + effectBox.height).toBeLessThanOrEqual(targetBox.y + 2);
    } else {
      expect(sourceBox.x + sourceBox.width).toBeLessThanOrEqual(effectBox.x + 2);
      expect(effectBox.x + effectBox.width).toBeLessThanOrEqual(targetBox.x + 2);
    }
    expect(stageBox.x).toBeGreaterThanOrEqual(0);
    expect(stageBox.x + stageBox.width).toBeLessThanOrEqual(viewport.width);
    expect(Math.max(0, Math.min(stageBox.y + stageBox.height, dockBox.y + dockBox.height) - Math.max(stageBox.y, dockBox.y))).toBe(0);
  });
}

test("Inspect preserves ACTIVE Current Effect without linking it to the inspected opponent", async ({ page }) => {
  await loadFixture(page, { width: 1440, height: 900 });
  const stage = page.locator('[aria-label="Interaction Stage"]');
  const identity = await stage.evaluate((element) => Object.fromEntries(
    ["data-interaction-id", "data-checkpoint-id", "data-presentation-revision", "data-stage", "data-current-effect"].map((name) => [name, element.getAttribute(name)]),
  ));
  await page.locator('[data-player-anchor="p4"] .opponent-hero-target').click();
  const inspect = stage.locator('.hero-focus-inspect[data-inspect-player-id="p4"]');
  await expect(inspect).toBeVisible();
  await expect(stage.locator('[aria-label="Current Effect"] strong')).toHaveText("Attack");
  await expect(stage.locator(".medium-participant-card, .medium-participant-arrow, .current-effect-arrow")).toHaveCount(0);
  await page.getByRole("button", { name: "Close Player 4 inspection", exact: true }).click();
  await expect(stage.locator('[data-hero-focus="true"][data-hero-focus-player-id="p2"]')).toBeVisible();
  await expect(stage.locator(".medium-participant-card")).toBeVisible();
  expect(await stage.evaluate((element) => Object.fromEntries(
    ["data-interaction-id", "data-checkpoint-id", "data-presentation-revision", "data-stage", "data-current-effect"].map((name) => [name, element.getAttribute(name)]),
  ))).toEqual(identity);
});

test("missing public effect fails closed and local REST/Preview do not invent one", async ({ page }) => {
  await loadFixture(page, { width: 480, effect: "none" });
  let stage = page.locator('[aria-label="Interaction Stage"]');
  await expect(stage).toHaveAttribute("data-stage", "ATTACK_RESPONSE");
  await expect(stage).not.toHaveAttribute("data-current-effect");
  await expect(stage.locator('[aria-label="Current Effect"]')).toHaveCount(0);

  await loadFixture(page, { state: "rest", width: 390 });
  await page.locator('[data-player-anchor="p2"] .opponent-hero-target').click();
  await expect(page.locator('[aria-label="Interaction Stage"] .interaction-stage-current-effect')).toHaveCount(0);

  await loadFixture(page, { state: "ordinary-turn", width: 480 });
  await page.locator('[data-hand-card-id="browser-ordinary-5"] .game-card').click();
  await page.getByRole("button", { name: "Select Player 2", exact: true }).click();
  stage = page.locator('[aria-label="Interaction Stage"]');
  await expect(stage).toHaveAttribute("data-local-ui-mode", "PREVIEW");
  await expect(stage.locator(".interaction-stage-current-effect")).toHaveCount(0);
});
