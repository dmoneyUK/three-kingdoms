import { expect, test } from "@playwright/test";

async function loadSkillFixture(page, state) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/tests/browser/fixture.html?state=${state}&count=4&hero=hua-tuo`);
  await expect(page.locator(".game-shell")).toBeVisible();
}

test("CurrentAction self target is selectable, inspectable, and submitted from the Local Dock", async ({ page }, testInfo) => {
  await loadSkillFixture(page, "self-target-skill");

  const dock = page.locator('.local-player-dock[data-player-anchor="p1"]');
  const skill = page.getByRole("button", { name: "Prodigal Healer", exact: true });
  await expect(skill).toBeEnabled();
  await skill.click();

  const selfTarget = page.getByRole("button", { name: "Select Player 1" });
  const opponentTarget = page.getByRole("button", { name: "Select Player 2" });
  const opponentSeat = page.locator('.opponent-player-card[data-player-anchor="p2"]');
  await expect(selfTarget).toHaveAttribute("aria-pressed", "false");
  await expect(selfTarget).toHaveClass(/targetable-target/);
  await expect(opponentTarget).toBeEnabled();
  const [targetBounds, infoBounds] = await Promise.all([
    selfTarget.boundingBox(),
    page.getByRole("button", { name: "Explain Hua Tuo" }).boundingBox(),
  ]);
  expect(targetBounds?.width).toBeGreaterThan(infoBounds?.width ?? 0);
  expect(targetBounds?.height).toBeGreaterThan(infoBounds?.height ?? 0);

  await page.locator('[data-hand-card-id="browser-attack"] .game-card').click();
  await opponentTarget.click();
  await expect(opponentSeat).toHaveClass(/selected-target/);
  await selfTarget.click();
  await expect(selfTarget).toHaveAttribute("aria-pressed", "true");
  await expect(dock.locator(".local-hero-card")).toHaveClass(/selected-target/);
  await expect(opponentSeat).not.toHaveClass(/selected-target/);
  const screenshot = await page.screenshot({ path: testInfo.outputPath("self-target-selected-390x844.png"), animations: "disabled" });
  await testInfo.attach("selected-self-target-local-dock", { body: screenshot, contentType: "image/png" });

  await expect(page.locator('.interaction-stage [data-hero-focus-player-id="p1"], .interaction-stage [data-medium-participant-player-id="p1"]')).toHaveCount(0);
  await page.getByRole("button", { name: "Explain Hua Tuo" }).click();
  await expect(page.getByRole("dialog", { name: "Hua Tuo" })).toBeVisible();
  await expect(selfTarget).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Close hero information" }).click();
  await expect(selfTarget).toHaveAttribute("aria-pressed", "true");

  const confirm = page.locator('[data-console-surface="local-operation"] button.primary', { hasText: "Confirm" });
  await expect(confirm).toBeEnabled();
  await confirm.click();
  await expect.poll(() => page.evaluate(() => window.__browserActions.at(-1))).toEqual({
    action: "trigger",
    extra: { providerId: "hua_tuo_prodigal_healer", cardIds: ["browser-attack"], targetId: "p1" },
  });
});

test("generic CurrentAction trigger target can select and submit the viewer ID", async ({ page }) => {
  await loadSkillFixture(page, "self-target-trigger");

  await page.getByRole("button", { name: "Use Projected Target", exact: true }).click();
  const selfTarget = page.getByRole("button", { name: "Select Player 1" });
  await expect(selfTarget).toHaveAttribute("aria-pressed", "false");
  await selfTarget.click();
  await expect(selfTarget).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('.interaction-stage [data-hero-focus-player-id="p1"], .interaction-stage [data-medium-participant-player-id="p1"]')).toHaveCount(0);

  await page.getByRole("button", { name: "Explain Hua Tuo" }).click();
  await expect(page.getByRole("dialog", { name: "Hua Tuo" })).toBeVisible();
  await page.getByRole("button", { name: "Close hero information" }).click();
  await expect(selfTarget).toHaveAttribute("aria-pressed", "true");

  const confirm = page.locator('[data-console-surface="local-operation"] button.primary', { hasText: "Confirm" });
  await expect(confirm).toBeEnabled();
  await confirm.click();
  await expect.poll(() => page.evaluate(() => window.__browserActions.at(-1))).toEqual({
    action: "trigger",
    extra: { providerId: "browser_projected_target", targetIds: ["p1"] },
  });
});

test("a Local Dock Hero absent from CurrentAction targetIds is not targetable", async ({ page }) => {
  await loadSkillFixture(page, "self-target-skill-no-self");

  const skill = page.getByRole("button", { name: "Prodigal Healer", exact: true });
  await expect(skill).toBeEnabled();
  await skill.click();

  const localHero = page.locator('.local-player-dock[data-player-anchor="p1"] .local-hero-card');
  await expect(localHero).toHaveAccessibleName("Explain Hua Tuo");
  await expect(localHero).not.toHaveClass(/targetable-target/);
  await localHero.click();
  await expect(page.getByRole("dialog", { name: "Hua Tuo" })).toBeVisible();
  await page.getByRole("button", { name: "Close hero information" }).click();
  await expect(localHero).not.toHaveClass(/selected-target/);
  await expect(page.getByRole("button", { name: "Select Player 2" })).toBeEnabled();
  expect(await page.evaluate(() => window.__browserActions)).toEqual([]);
});
