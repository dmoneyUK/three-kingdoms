import { expect, test } from "@playwright/test";

async function loadFixture(page, { state, count = 4, width, height = 900, hero, acknowledge = false }) {
  await page.setViewportSize({ width, height });
  await page.goto(`/tests/browser/fixture.html?state=${state}&count=${count}${hero ? `&hero=${encodeURIComponent(hero)}` : ""}${acknowledge ? "&ackPreview=1" : ""}`);
  await expect(page.locator(".game-shell")).toBeVisible();
}

async function selectOrdinaryTarget(page, targetId = "p2") {
  await page.locator('[data-hand-card-id="browser-ordinary-5"] .game-card').click();
  await page.getByRole("button", { name: `Select Player ${targetId.slice(1)}`, exact: true }).click();
}

for (const width of [390, 480, 1440]) {
  test(`local target Preview replaces and cancels without semantic events at ${width}px`, async ({ page }) => {
    await loadFixture(page, { state: "ordinary-turn", width, height: 900 });
    const before = await page.locator(".opponent-player-card").evaluateAll((seats) => seats.map((seat) => {
      const { x, y, width: seatWidth, height } = seat.getBoundingClientRect();
      return { id: seat.dataset.playerAnchor, x, y, width: seatWidth, height };
    }));

    await selectOrdinaryTarget(page, "p2");
    const preview = page.locator('.interaction-stage[data-local-ui-mode="PREVIEW"]');
    await expect(preview).toHaveAttribute("data-local-preview-player-id", "p2");
    const previewFocus = preview.locator('[data-hero-focus-mode="PREVIEW"]');
    await expect(previewFocus).toContainText("Player 2");
    await expect(previewFocus.locator(".hero-focus-heading strong")).toHaveText("PREVIEW TARGET");
    await expect(previewFocus).not.toContainText("HERO FOCUS");
    await expect(preview.locator(".hero-focus-context")).toContainText("LOCAL PREVIEW");
    expect(await preview.evaluate((stage) => [
      "data-interaction-id", "data-checkpoint-id", "data-presentation-revision",
      "data-stage", "data-stable-kind", "data-continuity", "data-parent-frame-id",
    ].every((name) => stage.getAttribute(name) === null))).toBe(true);
    await expect(preview.locator('[data-reaction-chain="proven"]')).toHaveCount(0);
    await expect(preview.locator('[data-hero-focus-player-id="p1"], [data-medium-participant-player-id="p1"]')).toHaveCount(0);
    await expect(page.locator('.opponent-player-card.selected-target')).toHaveAttribute("data-player-anchor", "p2");

    await page.getByRole("button", { name: "Select Player 3", exact: true }).click();
    await expect(preview).toHaveAttribute("data-local-preview-player-id", "p3");
    await expect(page.locator('.opponent-player-card.selected-target')).toHaveAttribute("data-player-anchor", "p3");
    const after = await page.locator(".opponent-player-card").evaluateAll((seats) => seats.map((seat) => {
      const { x, y, width: seatWidth, height } = seat.getBoundingClientRect();
      return { id: seat.dataset.playerAnchor, x, y, width: seatWidth, height };
    }));
    expect(after).toEqual(before);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);

    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(page.locator(".interaction-stage")).toHaveCount(0);
    expect(await page.evaluate(() => window.__browserActions.filter(({ action }) => action === "play_card" || action === "trigger"))).toEqual([]);
  });
}

test("generic trigger target Preview follows replacement and remains local until submission", async ({ page }) => {
  await loadFixture(page, { state: "self-target-trigger", width: 480, hero: "hua-tuo" });
  await page.getByRole("button", { name: "Use Projected Target", exact: true }).click();
  await page.getByRole("button", { name: "Select Player 2", exact: true }).click();
  const preview = page.locator('.interaction-stage[data-local-ui-mode="PREVIEW"]');
  await expect(preview).toHaveAttribute("data-local-preview-player-id", "p2");
  await page.getByRole("button", { name: "Select Player 3", exact: true }).click();
  await expect(preview).toHaveAttribute("data-local-preview-player-id", "p3");
  await expect(page.locator('.opponent-player-card.selected-target')).toHaveAttribute("data-player-anchor", "p3");
  await expect.poll(() => page.evaluate(() => window.__browserActions.filter(({ action }) => action === "trigger"))).toEqual([]);
  await page.getByRole("button", { name: "Cancel Projected Target", exact: true }).click();
  await expect(page.locator(".interaction-stage")).toHaveCount(0);
});

test("multi-target Preview follows the most recently selected external target", async ({ page }) => {
  await loadFixture(page, { state: "multi-target-trigger", count: 6, width: 480, height: 900 });
  await page.getByRole("button", { name: "Use Multi Target", exact: true }).click();
  const preview = page.locator('.interaction-stage[data-local-ui-mode="PREVIEW"]');
  for (const playerId of ["p2", "p3", "p4"]) {
    await page.getByRole("button", { name: `Select Player ${playerId.slice(1)}`, exact: true }).click();
    await expect(preview).toHaveAttribute("data-local-preview-player-id", playerId);
  }
  const selected = await page.locator(".opponent-player-card.selected-target").evaluateAll((seats) => seats.map((seat) => seat.dataset.playerAnchor).sort());
  expect(selected).toEqual(["p2", "p3", "p4"]);
  await expect.poll(() => page.evaluate(() => window.__browserActions.filter(({ action }) => action === "trigger"))).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(480);
});

test("active-skill Preview stays external while self-target stays in the Local Dock", async ({ page }) => {
  await loadFixture(page, { state: "self-target-skill", count: 6, width: 480, height: 900, hero: "hua-tuo" });
  await page.getByRole("button", { name: "Prodigal Healer", exact: true }).click();
  await page.locator('[data-hand-card-id="browser-attack"] .game-card').click();
  const selfTarget = page.getByRole("button", { name: "Select Player 1", exact: true });
  const opponentTarget = page.getByRole("button", { name: "Select Player 2", exact: true });
  await opponentTarget.click();
  const preview = page.locator('.interaction-stage[data-local-ui-mode="PREVIEW"]');
  await expect(preview).toHaveAttribute("data-local-preview-player-id", "p2");
  await selfTarget.click();
  await expect(page.locator(".interaction-stage")).toHaveCount(0);
  await expect(page.locator('.local-player-dock[data-player-anchor="p1"] .local-hero-card')).toHaveClass(/selected-target/);
  await expect(page.locator('[data-preview-player-id="p1"], [data-hero-focus-player-id="p1"], [data-medium-participant-player-id="p1"]')).toHaveCount(0);

  await opponentTarget.click();
  await expect(preview).toHaveAttribute("data-local-preview-player-id", "p2");
  await page.locator('[data-console-surface="local-operation"] button.primary', { hasText: "Confirm" }).click();
  await expect.poll(() => page.evaluate(() => window.__browserActions.at(-1))).toEqual({
    action: "trigger",
    extra: { providerId: "hua_tuo_prodigal_healer", cardIds: ["browser-attack"], targetId: "p2" },
  });
  await expect(preview).toHaveAttribute("data-local-preview-player-id", "p2");
});

test("authoritative Attack Response takes over the same Hero Focus node", async ({ page }) => {
  await loadFixture(page, { state: "ordinary-turn", width: 390, height: 844, acknowledge: true });
  await selectOrdinaryTarget(page);
  const preview = page.locator('.interaction-stage[data-local-ui-mode="PREVIEW"]');
  await expect(preview).toHaveAttribute("data-local-preview-player-id", "p2");
  await preview.locator(".hero-focus").evaluate((node) => { window.__previewHeroFocusNode = node; });

  await page.locator('[data-console-surface="local-operation"] button.primary', { hasText: "Confirm" }).click();
  const stage = page.locator('.interaction-stage[data-stage="ATTACK_RESPONSE"]');
  await expect(stage).toBeVisible();
  await expect(stage).not.toHaveAttribute("data-local-ui-mode", /.+/);
  await expect(stage.locator('[data-hero-focus="true"][data-hero-focus-player-id="p2"]')).toBeVisible();
  expect(await stage.locator(".hero-focus").evaluate((node) => node === window.__previewHeroFocusNode)).toBe(true);
});
