import { expect, test } from "@playwright/test";

const viewports = [
  { width: 390, height: 844, count: 4 },
  { width: 480, height: 900, count: 6 },
  { width: 1440, height: 900, count: 4 },
];

async function loadScene(page, viewport, negationHistory = null) {
  await page.setViewportSize(viewport);
  const history = negationHistory ? `&negationHistory=${encodeURIComponent(negationHistory)}` : "";
  await page.goto(`/tests/browser/fixture.html?state=active-negation-open&count=${viewport.count}${history}`);
}

async function measure(page) {
  return page.evaluate(() => {
    const box = (element) => {
      if (!element) return null;
      const { left, right, top, bottom, width, height } = element.getBoundingClientRect();
      return { left, right, top, bottom, width, height };
    };
    const stage = document.querySelector('[data-single-target-negation-composition="proven"]');
    const composition = stage.querySelector('[data-single-target-negation-causal-spine="proven"]');
    const dock = document.querySelector('.local-player-dock[data-player-anchor="p4"]');
    const guidance = dock.querySelector(".console-guidance .decision-status");
    const overlap = (a, b) => Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))
      * Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) > 0;
    return {
      stage: box(stage),
      source: box(composition.querySelector('[data-negation-causal-participant="source"]')),
      root: box(composition.querySelector('[data-single-target-negation-root="true"]')),
      target: box(composition.querySelector('[data-negation-causal-participant="target"]')),
      branch: box(composition.querySelector('[data-public-negation-branch="proven"]')),
      responseCards: [...composition.querySelectorAll(".single-target-negation-response-node [data-action-card-kind='Negation']")].map(box),
      responseNodes: [...composition.querySelectorAll(".single-target-negation-response-node")].map(box),
      collapsed: box(composition.querySelector("[data-collapsed-negation-count]")),
      dock: box(dock),
      guidance: box(guidance),
      stageDockOverlap: overlap(box(stage), box(dock)),
      stageGuidanceOverlap: overlap(box(stage), box(guidance)),
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: innerWidth,
    };
  });
}

function expectSpineStable(reference, actual) {
  for (const participant of ["source", "root", "target"]) {
    for (const coordinate of ["left", "top", "width", "height"]) {
      expect(Math.abs(actual[participant][coordinate] - reference[participant][coordinate]), `${participant}.${coordinate}: ${JSON.stringify({ reference: reference[participant], actual: actual[participant] })}`).toBeLessThanOrEqual(2);
    }
  }
}

for (const viewport of viewports) {
  test(`counter-Negation extends the same causal branch at ${viewport.width}px`, async ({ page }, testInfo) => {
    await loadScene(page, viewport);
    const openGeometry = await measure(page);
    await loadScene(page, viewport, "single");
    const firstNegationGeometry = await measure(page);

    await loadScene(page, viewport, "two");
    const stage = page.locator('.interaction-stage[data-negation-counter-branch-composition="proven"]');
    const composition = stage.locator('[data-single-target-negation-causal-spine="proven"]');
    const root = composition.locator('[data-single-target-negation-root="true"]');
    const responseNodes = composition.locator(".single-target-negation-response-node");
    const responseCards = responseNodes.locator('[data-action-card-kind="Negation"]');

    await expect(stage).toBeVisible();
    await expect(stage).toHaveAttribute("data-continuity", "ROOT_FRAME");
    await expect(root).toHaveAttribute("data-active-head", "false");
    await expect(root).toHaveCSS("opacity", "1");
    await expect(root.locator(".group-stage-card-art")).toHaveCSS("filter", "brightness(0.62)");
    await expect(responseNodes).toHaveCount(2);
    await expect(responseCards).toHaveCount(2);
    await expect(responseNodes.nth(0)).toHaveAttribute("data-public-negation-node-actor-id", "p1");
    await expect(responseNodes.nth(0)).toHaveAttribute("data-active-head", "false");
    await expect(responseNodes.nth(0).locator("[data-public-negation-actor='p1']")).toHaveText("Player 1");
    await expect(responseNodes.nth(1)).toHaveAttribute("data-public-negation-node-actor-id", "p2");
    await expect(responseNodes.nth(1)).toHaveAttribute("data-active-head", "true");
    await expect(responseNodes.nth(1).locator("[data-public-negation-actor='p2']")).toHaveText("Player 2");
    await expect(composition.locator('[data-action-card-kind][data-active-head="true"]')).toHaveCount(1);
    await expect(stage.locator(".reaction-chain, [data-reaction-chain], .interaction-stage-current-effect, [data-stage-event-summary], .hero-focus, .medium-participant-card")).toHaveCount(0);
    await expect(stage).not.toContainText("REACTION CHAIN");
    await expect(page.locator('.local-player-dock[data-player-anchor="p4"]')).toBeVisible();

    const counterGeometry = await measure(page);
    expectSpineStable(openGeometry, firstNegationGeometry);
    expectSpineStable(openGeometry, counterGeometry);
    expect(counterGeometry.root.width).toBe(88);
    expect(counterGeometry.root.height).toBe(124);
    expect(counterGeometry.responseCards).toHaveLength(2);
    expect(counterGeometry.responseCards[0].width).toBeGreaterThanOrEqual(56);
    expect(counterGeometry.responseCards[1].width).toBeGreaterThanOrEqual(56);
    for (const responseNode of counterGeometry.responseNodes) {
      expect(responseNode.left).toBeGreaterThanOrEqual(counterGeometry.stage.left - 0.5);
      expect(responseNode.right).toBeLessThanOrEqual(counterGeometry.stage.right + 0.5);
    }
    expect(counterGeometry.stageDockOverlap).toBe(false);
    expect(counterGeometry.stageGuidanceOverlap).toBe(false);
    expect(counterGeometry.documentWidth).toBe(counterGeometry.viewportWidth);
    expect(counterGeometry.guidance.top - counterGeometry.target.bottom).toBeLessThanOrEqual(24);

    const screenshot = await page.screenshot({ path: testInfo.outputPath(`single-target-negation-counter-${viewport.width}px.png`), animations: "disabled" });
    await testInfo.attach(`single-target-negation-counter-${viewport.width}px`, { body: screenshot, contentType: "image/png" });
  });
}

for (const viewport of viewports) {
  test(`older public Negations compact while root and active head remain visible at ${viewport.width}px`, async ({ page }, testInfo) => {
    await loadScene(page, viewport, "two");
    const twoCardGeometry = await measure(page);
    await loadScene(page, viewport, "long");
    const stage = page.locator('.interaction-stage[data-negation-counter-branch-composition="proven"]');
    const composition = stage.locator('[data-single-target-negation-causal-spine="proven"]');
    const root = composition.locator('[data-single-target-negation-root="true"]');
    const branch = composition.locator('[data-public-negation-branch="proven"]');
    const responseNodes = branch.locator(".single-target-negation-response-node");

    await expect(root).toBeVisible();
    await expect(root).toHaveAttribute("data-active-head", "false");
    await expect(branch).toHaveAttribute("data-public-negation-count", "5");
    await expect(branch).toHaveAttribute("data-visible-public-negation-count", "2");
    await expect(branch).toHaveAttribute("data-collapsed-public-negation-count", "3");
    await expect(branch.locator("[data-collapsed-negation-count]")).toHaveText("+3");
    await expect(responseNodes).toHaveCount(2);
    await expect(responseNodes.nth(0)).toHaveAttribute("data-public-negation-node-actor-id", "p2");
    await expect(responseNodes.nth(0)).toHaveAttribute("data-active-head", "false");
    await expect(responseNodes.nth(1)).toHaveAttribute("data-public-negation-node-actor-id", "p1");
    await expect(responseNodes.nth(1)).toHaveAttribute("data-active-head", "true");
    await expect(composition.locator('[data-action-card-kind][data-active-head="true"]')).toHaveCount(1);
    await expect(stage.locator(".reaction-chain, [data-reaction-chain]")).toHaveCount(0);

    const geometry = await measure(page);
    expect(geometry.responseCards).toHaveLength(2);
    expect(geometry.responseCards[0].width).toBeGreaterThanOrEqual(56);
    expect(geometry.responseCards[1].width).toBeGreaterThanOrEqual(56);
    expect(geometry.responseCards[0].width).toBeCloseTo(twoCardGeometry.responseCards[0].width, 1);
    expect(geometry.responseCards[1].width).toBeCloseTo(twoCardGeometry.responseCards[1].width, 1);
    expect(geometry.collapsed.left).toBeGreaterThanOrEqual(geometry.branch.left - 0.5);
    expect(geometry.collapsed.right).toBeLessThanOrEqual(geometry.branch.right + 0.5);
    expect(geometry.collapsed.bottom).toBeLessThan(geometry.responseNodes[0].top);
    for (const responseNode of geometry.responseNodes) {
      expect(responseNode.left).toBeGreaterThanOrEqual(geometry.stage.left - 0.5);
      expect(responseNode.right).toBeLessThanOrEqual(geometry.stage.right + 0.5);
    }
    expect(geometry.stageDockOverlap).toBe(false);
    expect(geometry.stageGuidanceOverlap).toBe(false);
    expect(geometry.documentWidth).toBe(geometry.viewportWidth);

    const screenshot = await page.screenshot({ path: testInfo.outputPath(`single-target-negation-compact-history-${viewport.width}px.png`), animations: "disabled" });
    await testInfo.attach(`single-target-negation-compact-history-${viewport.width}px`, { body: screenshot, contentType: "image/png" });
  });
}

test("counter-Negation chain fails closed when a displayed actor cannot be proven", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tests/browser/fixture.html?state=active-negation-open&negationHistory=single-unknown-actor");
  const stage = page.locator('.interaction-stage[data-stage="NEGATION"]');
  await expect(stage).not.toHaveAttribute("data-single-target-negation-composition", "proven");
  await expect(stage).not.toHaveAttribute("data-negation-counter-branch-composition", "proven");
  await expect(stage.locator("[data-public-negation-branch], [data-public-negation-actor]")).toHaveCount(0);
});
