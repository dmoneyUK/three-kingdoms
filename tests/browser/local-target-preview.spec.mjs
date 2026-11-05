import { expect, test } from "@playwright/test";

async function loadFixture(page, { state, count = 4, width, height = 900, hero, acknowledge = false }) {
  await page.setViewportSize({ width, height });
  await page.goto(`/tests/browser/fixture.html?state=${state}&count=${count}${hero ? `&hero=${encodeURIComponent(hero)}` : ""}${acknowledge ? "&ackPreview=1" : ""}`);
  await expect(page.locator(".game-shell")).toBeVisible();
}

async function selectOrdinaryTarget(page, targetId = "p2") {
  await page.locator('[data-hand-card-id="browser-ordinary-5"] .game-card').click();
  await selectOpponentTarget(page, targetId);
}

async function selectOpponentTarget(page, targetId) {
  // The separate 44px Inspect control occupies a corner of compact seats.
  // Tap an unobstructed point on the Hero target so the real target action is
  // exercised without relying on a forced click through the Inspect button.
  await page.getByRole("button", { name: `Select Player ${targetId.slice(1)}`, exact: true })
    .click({ position: { x: 7, y: 7 } });
}

function inspector(page) {
  return page.locator('.interaction-stage[data-local-ui-mode="INSPECT"] .opponent-inspection-panel');
}

for (const width of [390, 480, 1440]) {
  test(`legal target selection opens one public inspector without sending an action at ${width}px`, async ({ page }) => {
    await loadFixture(page, { state: "ordinary-turn", width, height: 900 });
    const before = await page.locator(".opponent-player-card").evaluateAll((seats) => seats.map((seat) => {
      const { x, y, width: seatWidth, height } = seat.getBoundingClientRect();
      return { id: seat.dataset.playerAnchor, x, y, width: seatWidth, height };
    }));

    await selectOrdinaryTarget(page, "p2");
    const panel = inspector(page);
    await expect(panel).toHaveAttribute("data-inspect-player-id", "p2");
    await expect(panel.locator(".hero-focus-inspect-identity-caption .hero-focus-identity-player")).toHaveText("Player 2");
    await expect(panel.locator(".hero-focus-identity-stats [data-public-hand-count]")).toHaveText("Hand · 2");
    await expect(page.locator(".opponent-inspection-panel")).toHaveCount(1);
    await expect(page.locator(".hero-focus-preview, [data-hero-focus-mode=PREVIEW]")).toHaveCount(0);
    await expect(page.locator('.opponent-player-card.selected-target')).toHaveAttribute("data-player-anchor", "p2");

    await page.getByRole("button", { name: "Select Player 3", exact: true }).click();
    await expect(panel).toHaveAttribute("data-inspect-player-id", "p3");
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

test("information affordance changes only the inspector subject and closing preserves the selected target", async ({ page }) => {
  await loadFixture(page, { state: "ordinary-turn", width: 480, height: 900 });
  await selectOrdinaryTarget(page, "p2");
  const panel = inspector(page);
  await expect(panel).toHaveAttribute("data-inspect-player-id", "p2");

  const inspectPlayerTwo = page.getByRole("button", { name: "Inspect Player 2", exact: true });
  const inspectPlayerThree = page.getByRole("button", { name: "Inspect Player 3", exact: true });
  await inspectPlayerTwo.click();
  await expect(page.locator(".opponent-inspection-panel")).toHaveCount(0);
  await expect(page.locator('.opponent-player-card.selected-target')).toHaveAttribute("data-player-anchor", "p2");
  await inspectPlayerTwo.click();
  await expect(panel).toHaveAttribute("data-inspect-player-id", "p2");
  await inspectPlayerThree.click();
  await expect(panel).toHaveAttribute("data-inspect-player-id", "p3");
  await expect(page.locator('.opponent-player-card.selected-target')).toHaveAttribute("data-player-anchor", "p2");
  await expect(page.locator('[data-console-surface="local-operation"] button.primary', { hasText: "Confirm" })).toBeEnabled();
  await expect.poll(() => page.evaluate(() => window.__browserActions.filter(({ action }) => action === "play_card" || action === "trigger"))).toEqual([]);

  await inspectPlayerThree.click();
  await expect(page.locator(".opponent-inspection-panel")).toHaveCount(0);
  await expect(page.locator('.opponent-player-card.selected-target')).toHaveAttribute("data-player-anchor", "p2");
  await inspectPlayerThree.click();
  await expect(panel).toHaveAttribute("data-inspect-player-id", "p3");
  await inspectPlayerThree.click();
  await expect(page.locator(".opponent-inspection-panel")).toHaveCount(0);
  await expect(inspectPlayerThree).toBeFocused();
  await expect(page.locator('.opponent-player-card.selected-target')).toHaveAttribute("data-player-anchor", "p2");
  await expect(page.locator('[data-console-surface="local-operation"] button.primary', { hasText: "Confirm" })).toBeEnabled();
});

test("generic trigger target uses the same inspector and remains local until submission", async ({ page }) => {
  await loadFixture(page, { state: "self-target-trigger", width: 480, hero: "hua-tuo" });
  await page.getByRole("button", { name: "Use Projected Target", exact: true }).click();
  await page.getByRole("button", { name: "Select Player 2", exact: true }).click();
  const panel = inspector(page);
  await expect(panel).toHaveAttribute("data-inspect-player-id", "p2");
  await page.getByRole("button", { name: "Select Player 3", exact: true }).click();
  await expect(panel).toHaveAttribute("data-inspect-player-id", "p3");
  await expect(page.locator('.opponent-player-card.selected-target')).toHaveAttribute("data-player-anchor", "p3");
  await expect.poll(() => page.evaluate(() => window.__browserActions.filter(({ action }) => action === "trigger"))).toEqual([]);
  await page.getByRole("button", { name: "Cancel Projected Target", exact: true }).click();
  await expect(page.locator(".interaction-stage")).toHaveCount(0);
});

test("multi-target selection updates one inspector to the latest explicit Seat choice", async ({ page }) => {
  await loadFixture(page, { state: "multi-target-trigger", count: 6, width: 480, height: 900 });
  await page.getByRole("button", { name: "Use Multi Target", exact: true }).click();
  const panel = inspector(page);
  for (const playerId of ["p2", "p3", "p4"]) {
    await selectOpponentTarget(page, playerId);
    await expect(panel).toHaveAttribute("data-inspect-player-id", playerId);
  }
  const selected = await page.locator(".opponent-player-card.selected-target").evaluateAll((seats) => seats.map((seat) => seat.dataset.playerAnchor).sort());
  expect(selected).toEqual(["p2", "p3", "p4"]);
  await expect.poll(() => page.evaluate(() => window.__browserActions.filter(({ action }) => action === "trigger"))).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(480);
});

test("active-skill self target stays in the Local Dock and opponent choices use the unified inspector", async ({ page }) => {
  await loadFixture(page, { state: "self-target-skill", count: 6, width: 480, height: 900, hero: "hua-tuo" });
  await page.getByRole("button", { name: "Prodigal Healer", exact: true }).click();
  await page.locator('[data-hand-card-id="browser-attack"] .game-card').click();
  const selfTarget = page.getByRole("button", { name: "Select Player 1", exact: true });
  await selectOpponentTarget(page, "p2");
  await expect(inspector(page)).toHaveAttribute("data-inspect-player-id", "p2");
  await selfTarget.click();
  await expect(page.locator(".interaction-stage")).toHaveCount(0);
  await expect(page.locator('.local-player-dock[data-player-anchor="p1"] .local-hero-card')).toHaveClass(/selected-target/);
  await expect(page.locator(".opponent-inspection-panel")).toHaveCount(0);

  await selectOpponentTarget(page, "p2");
  const panel = inspector(page);
  await expect(panel).toHaveAttribute("data-inspect-player-id", "p2");
  await page.locator('[data-console-surface="local-operation"] button.primary', { hasText: "Confirm" }).click();
  await expect.poll(() => page.evaluate(() => window.__browserActions.at(-1))).toEqual({
    action: "trigger",
    extra: { providerId: "hua_tuo_prodigal_healer", cardIds: ["browser-attack"], targetId: "p2" },
  });
  await expect(page.locator(".opponent-inspection-panel")).toHaveCount(0);
});

test("authoritative Attack Response closes the local inspector and transfers decision authority", async ({ page }) => {
  await loadFixture(page, { state: "ordinary-turn", width: 390, height: 844, acknowledge: true });
  await selectOrdinaryTarget(page);
  await expect(inspector(page)).toHaveAttribute("data-inspect-player-id", "p2");

  await page.locator('[data-console-surface="local-operation"] button.primary', { hasText: "Confirm" }).click();
  await expect(page.locator(".opponent-inspection-panel, .interaction-stage-inspect-only")).toHaveCount(0);
  const acknowledgedAction = await page.evaluate(() => ({
    phase: window.__browserRoom.phase,
    kind: window.__browserRoom.currentAction?.kind,
    actorId: window.__browserRoom.currentAction?.actorId,
  }));
  expect(acknowledgedAction).toEqual({ phase: "response", kind: "response", actorId: "p2" });
});
