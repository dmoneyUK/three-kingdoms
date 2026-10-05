import { expect, test } from "@playwright/test";

async function loadFixture(page, { count = 4, width, height = 900, state = "rest", equipmentCase = "matrix" }) {
  await page.setViewportSize({ width, height });
  await page.goto(`/tests/browser/fixture.html?state=${state}&count=${count}&equipmentCase=${equipmentCase}`);
  await expect(page.locator(".game-shell")).toBeVisible();
}

async function seatGeometry(page) {
  return page.locator(".player-board [data-player-anchor]").evaluateAll((seats) => seats.map((seat) => {
    const { x, y, width, height } = seat.getBoundingClientRect();
    return { id: seat.dataset.playerAnchor, x, y, width, height };
  }));
}

for (const viewport of [{ width: 390, height: 844 }, { width: 480, height: 900 }, { width: 1440, height: 900 }]) {
  test(`opponent Inspect uses Hero Focus public details at ${viewport.width}px without moving seats`, async ({ page }) => {
    await loadFixture(page, viewport);
    const before = await seatGeometry(page);
    await page.locator('[data-player-anchor="p2"] .opponent-hero-target').click();

    const inspect = page.locator('.interaction-stage[data-local-ui-mode="INSPECT"] .hero-focus-inspect');
    await expect(inspect).toHaveAttribute("data-hero-focus-mode", "INSPECT");
    await expect(page.getByRole("dialog", { name: "Player 2 opponent inspection" })).toBeVisible();
    await expect(inspect.locator(".hero-focus-identity")).toContainText("Player 2");
    await expect(inspect.locator('[aria-label="Public Skills"] .hero-focus-inspect-skill').first()).toBeVisible();
    await expect(inspect.locator('[aria-label="Equipment"] .opponent-inspection-card[aria-label="Explain Zhuge Crossbow"]')).toHaveCount(1);
    await expect(inspect.locator('[aria-label="Concealed Hand"]')).toHaveAttribute("data-concealed-hand-count", "2");
    await expect(inspect.locator(".hero-focus-inspect-hand-backs i")).toHaveCount(2);
    await expect(inspect.locator('[aria-label="Concealed Hand"] .played-card')).toHaveCount(0);
    await expect(inspect).not.toHaveAttribute("aria-modal", "true");
    await expect(page.locator(".opponent-inspection-layer")).toHaveCount(0);
    expect(await inspect.evaluate((element) => /\b(Lord|Loyalist|Rebel|Renegade|Spy)\b/.test(element.textContent ?? ""))).toBe(false);
    expect(await inspect.evaluate((element) => element.closest(".interaction-stage")?.getAttribute("data-interaction-id") ?? null)).toBeNull();

    await inspect.locator('[aria-label="Equipment"] .opponent-inspection-card[aria-label="Explain Zhuge Crossbow"]').click();
    await expect(page.getByRole("dialog", { name: "Zhuge Crossbow" })).toBeVisible();
    await page.getByRole("button", { name: "Close card explanation" }).click();
    await expect(inspect).toBeVisible();

    const stageBox = await page.locator(".interaction-stage").boundingBox();
    const dockBox = await page.locator(".local-player-dock").boundingBox();
    expect(stageBox).not.toBeNull();
    expect(dockBox).not.toBeNull();
    expect(stageBox.x).toBeGreaterThanOrEqual(0);
    expect(stageBox.x + stageBox.width).toBeLessThanOrEqual(viewport.width);
    expect(Math.max(0, Math.min(stageBox.y + stageBox.height, dockBox.y + dockBox.height) - Math.max(stageBox.y, dockBox.y))).toBe(0);

    await page.getByRole("button", { name: "Close Player 2 inspection", exact: true }).click();
    await expect(page.locator(".interaction-stage")).toHaveCount(0);
    expect(await seatGeometry(page)).toEqual(before);
  });
}

test("Inspect stays independent from target selection and restores the selected Preview", async ({ page }) => {
  await loadFixture(page, { state: "ordinary-turn", width: 480, height: 900, equipmentCase: "empty" });
  await page.locator('[data-hand-card-id="browser-ordinary-5"] .game-card').click();
  await page.getByRole("button", { name: "Select Player 2", exact: true }).click();
  const preview = page.locator('.interaction-stage[data-local-ui-mode="PREVIEW"]');
  await expect(preview).toHaveAttribute("data-local-preview-player-id", "p2");

  await page.getByRole("button", { name: "Inspect Player 2", exact: true }).click();
  const inspect = page.locator('.interaction-stage[data-local-ui-mode="INSPECT"] .hero-focus-inspect');
  await expect(inspect).toBeVisible();
  await expect(page.locator('.opponent-player-card[data-player-anchor="p2"]')).toHaveClass(/selected-target/);
  await expect(page.locator('[data-console-surface="local-operation"] button.primary', { hasText: "Confirm" })).toBeEnabled();
  await expect(page.locator('[data-console-surface="local-operation"] button.local-target-cancel')).toBeVisible();
  expect(await page.evaluate(() => window.__browserActions.filter(({ action }) => action === "play_card" || action === "trigger"))).toEqual([]);

  await page.getByRole("button", { name: "Explain Liu Bei", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Liu Bei" })).toBeVisible();
  await page.getByRole("button", { name: "Close hero information" }).click();
  await expect(inspect).toBeVisible();
  await expect(page.locator('.opponent-player-card[data-player-anchor="p2"]')).toHaveClass(/selected-target/);

  await page.getByRole("button", { name: "Close Player 2 inspection", exact: true }).click();
  await expect(preview).toHaveAttribute("data-local-preview-player-id", "p2");
  expect(await page.evaluate(() => window.__browserActions.filter(({ action }) => action === "play_card" || action === "trigger"))).toEqual([]);
});

test("Inspect restores authoritative Hero Focus without changing Stage identity or sending actions", async ({ page }) => {
  await loadFixture(page, { state: "interaction", width: 480, height: 900 });
  const stage = page.locator('[aria-label="Interaction Stage"]');
  await expect(stage).toHaveAttribute("data-stage", "ATTACK_RESPONSE");
  const identity = await stage.evaluate((element) => Object.fromEntries(
    ["data-interaction-id", "data-checkpoint-id", "data-presentation-revision", "data-stage", "data-continuity"].map((name) => [name, element.getAttribute(name)]),
  ));
  const actionsBefore = await page.evaluate(() => window.__browserActions.length);

  await page.locator('[data-player-anchor="p2"] .opponent-hero-target').click();
  await expect(stage).toHaveAttribute("data-local-ui-mode", "INSPECT");
  await expect(stage.locator('.hero-focus-inspect[data-inspect-player-id="p2"]')).toBeVisible();
  await expect(stage).toHaveAttribute("data-stage", "ATTACK_RESPONSE");
  await page.getByRole("button", { name: "Close Player 2 inspection", exact: true }).click();

  await expect(stage.locator('[data-hero-focus="true"]')).toBeVisible();
  expect(await stage.evaluate((element) => Object.fromEntries(
    ["data-interaction-id", "data-checkpoint-id", "data-presentation-revision", "data-stage", "data-continuity"].map((name) => [name, element.getAttribute(name)]),
  ))).toEqual(identity);
  expect(await page.evaluate(() => window.__browserActions.length)).toBe(actionsBefore);
});

test("Side Column Inspect keeps public Judgement details inside the centre Stage", async ({ page }) => {
  await loadFixture(page, { count: 6, width: 480, height: 900 });
  const before = await seatGeometry(page);
  await page.locator('[data-player-anchor="p3"] .opponent-hero-target').click();
  const inspect = page.locator('.interaction-stage[data-local-ui-mode="INSPECT"] .hero-focus-inspect');
  await expect(inspect).toBeVisible();
  await expect(inspect.locator('[aria-label="Judgement Zone"] .opponent-inspection-card[aria-label="Explain Lightning"]')).toHaveCount(1);
  await inspect.locator('[aria-label="Judgement Zone"] .opponent-inspection-card[aria-label="Explain Lightning"]').click();
  await expect(page.getByRole("dialog", { name: "Lightning" })).toBeVisible();
  await page.getByRole("button", { name: "Close card explanation" }).click();
  await expect(inspect).toBeVisible();
  await page.getByRole("button", { name: "Close Player 3 inspection", exact: true }).click();
  expect(await seatGeometry(page)).toEqual(before);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(480);
});
