import { expect, test } from "@playwright/test";

const viewports = [
  { width: 390, height: 844, count: 4 },
  { width: 480, height: 900, count: 6 },
  { width: 1440, height: 900, count: 4 },
];

for (const viewport of viewports) {
  test(`proven open single-target Negation is a card-led causal spine at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.goto(`/tests/browser/fixture.html?state=active-negation-open&count=${viewport.count}`);

    const stage = page.locator('.interaction-stage[data-stage="NEGATION"]');
    const composition = stage.locator('[data-single-target-negation-causal-spine="proven"]');
    const source = composition.locator('[data-negation-causal-participant="source"]');
    const root = composition.locator('[data-single-target-negation-root="true"]');
    const target = composition.locator('[data-negation-causal-participant="target"]');
    const dock = page.locator('.local-player-dock[data-player-anchor="p4"]');
    const guidance = dock.locator(".console-guidance .decision-status");

    await expect(stage).toHaveAttribute("data-negation-open-composition", "proven");
    await expect(composition).toHaveAttribute("data-negation-self-target", "false");
    await expect(root).toHaveAttribute("data-action-card-kind", "Dismantle");
    await expect(root).toHaveAttribute("data-active-head", "true");
    await expect(root).toHaveClass(/is-active/);
    await expect(root.locator(".group-stage-card-art")).toHaveAttribute("style", /burning-bridges-card\.jpg/);
    await expect(source.locator(".single-target-negation-portrait")).toBeVisible();
    await expect(source.locator(":scope > b")).toHaveText("Player 1");
    await expect(target.locator(".single-target-negation-portrait")).toBeVisible();
    await expect(target.locator(":scope > b")).toHaveText("Player 2");
    await expect(stage.locator(".hero-focus, .interaction-stage-current-effect, .reaction-chain, [data-reaction-chain], .group-target-scope")).toHaveCount(0);
    await expect(stage.locator(".medium-participant-card, [data-stage-event-summary]")).toHaveCount(0);
    await expect(stage).not.toContainText("NEGATION RESPONSE");
    await expect(stage).not.toContainText("EFFECT");
    await expect(stage).not.toContainText("REACTION CHAIN");
    await expect(stage).not.toContainText("ORIGINAL EFFECT");
    await expect(stage).not.toContainText("NEGATION WINDOW");
    await expect(stage).not.toContainText("A Negation may be played now.");
    await expect(stage).not.toContainText("Waiting for response...");
    await expect(stage).not.toContainText("Player 3");
    await expect(stage).not.toContainText("Player 4");
    await expect(stage.locator("button")).toHaveCount(0);
    await expect(dock).toBeVisible();
    await expect(guidance).toBeVisible();

    const geometry = await page.evaluate(() => {
      const box = (element) => {
        const { left, right, top, bottom, width, height } = element.getBoundingClientRect();
        return { left, right, top, bottom, width, height };
      };
      const overlap = (a, b) => Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))
        * Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) > 0;
      const stageElement = document.querySelector('[data-negation-open-composition="proven"]');
      const sourceElement = stageElement.querySelector('[data-negation-causal-participant="source"]');
      const sourcePortrait = sourceElement.querySelector(".single-target-negation-portrait");
      const rootElement = stageElement.querySelector('[data-single-target-negation-root="true"]');
      const targetElement = stageElement.querySelector('[data-negation-causal-participant="target"]');
      const dockElement = document.querySelector('.local-player-dock[data-player-anchor="p4"]');
      const guidanceElement = dockElement.querySelector(".console-guidance .decision-status");
      return {
        stage: box(stageElement),
        source: box(sourceElement),
        sourcePortrait: box(sourcePortrait),
        root: box(rootElement),
        target: box(targetElement),
        dock: box(dockElement),
        guidance: box(guidanceElement),
        overlapsDock: overlap(box(stageElement), box(dockElement)),
        overlapsGuidance: overlap(box(stageElement), box(guidanceElement)),
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
      };
    });

    expect(geometry.sourcePortrait.width).toBe(64);
    expect(geometry.sourcePortrait.height).toBe(82);
    expect(geometry.root.width).toBe(88);
    expect(geometry.root.height).toBe(124);
    expect(geometry.root.left + geometry.root.width / 2).toBeCloseTo(geometry.source.left + geometry.source.width / 2, 0);
    expect(geometry.root.left + geometry.root.width / 2).toBeCloseTo(geometry.target.left + geometry.target.width / 2, 0);
    expect(geometry.root.top - geometry.source.bottom).toBeGreaterThanOrEqual(12);
    expect(geometry.root.top - geometry.source.bottom).toBeLessThanOrEqual(16);
    expect(geometry.target.top - geometry.root.bottom).toBeGreaterThanOrEqual(12);
    expect(geometry.target.top - geometry.root.bottom).toBeLessThanOrEqual(16);
    expect(geometry.source.left).toBeGreaterThanOrEqual(geometry.stage.left - 0.5);
    expect(geometry.target.right).toBeLessThanOrEqual(geometry.stage.right + 0.5);
    expect(geometry.overlapsDock).toBe(false);
    expect(geometry.overlapsGuidance).toBe(false);
    expect(geometry.guidance.top - geometry.target.bottom, JSON.stringify(geometry)).toBeLessThanOrEqual(24);
    expect(geometry.documentWidth).toBe(geometry.viewportWidth);
    if (viewport.width <= 650) {
      expect(geometry.stage.left).toBeGreaterThanOrEqual(15);
      expect(geometry.viewportWidth - geometry.stage.right).toBeGreaterThanOrEqual(15);
    }

    const screenshot = await page.screenshot({ path: testInfo.outputPath(`single-target-negation-open-${viewport.width}px.png`), animations: "disabled" });
    await testInfo.attach(`single-target-negation-open-${viewport.width}px`, { body: screenshot, contentType: "image/png" });
  });
}

test("proven self-target open Negation uses one participant and a return relationship", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tests/browser/fixture.html?state=active-negation-open&count=4&source=p2&effect=Something%20Out%20of%20Nothing");

  const stage = page.locator('.interaction-stage[data-stage="NEGATION"]');
  const composition = stage.locator('[data-single-target-negation-causal-spine="proven"]');
  await expect(stage).toHaveAttribute("data-negation-open-composition", "proven");
  await expect(composition).toHaveAttribute("data-negation-self-target", "true");
  await expect(composition.locator('[data-negation-causal-participant]')).toHaveCount(1);
  await expect(composition.locator('[data-negation-causal-participant="source"]')).toHaveAttribute("data-negation-participant-id", "p2");
  await expect(composition.locator('[data-negation-causal-participant="target"]')).toHaveCount(0);
  await expect(composition.locator('[data-single-target-negation-root="true"]')).toHaveAttribute("data-action-card-kind", "DrawTwo");
  await expect(composition.locator("[data-self-return-relationship='true']")).toBeVisible();
  await expect(composition).toContainText("Player 2");
  await expect(composition.locator('[data-negation-causal-participant]')).toHaveCount(1);
  await expect(stage.locator(".hero-focus, .interaction-stage-current-effect, .reaction-chain")).toHaveCount(0);
});

test("open single-target Negation fails closed when the typed root card proof is missing", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tests/browser/fixture.html?state=active-negation-open&rootCard=missing");

  const stage = page.locator('.interaction-stage[data-stage="NEGATION"]');
  await expect(stage).not.toHaveAttribute("data-negation-open-composition", "proven");
  await expect(stage.locator("[data-single-target-negation-root='true'], [data-action-card-kind]")).toHaveCount(0);
});
