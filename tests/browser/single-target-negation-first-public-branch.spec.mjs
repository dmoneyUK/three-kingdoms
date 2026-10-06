import { expect, test } from "@playwright/test";

const viewports = [
  { width: 390, height: 844, count: 4 },
  { width: 480, height: 900, count: 6 },
  { width: 1440, height: 900, count: 4 },
];

async function loadScene(page, viewport, negationHistory = null, extras = "") {
  await page.setViewportSize(viewport);
  const history = negationHistory ? `&negationHistory=${encodeURIComponent(negationHistory)}` : "";
  await page.goto(`/tests/browser/fixture.html?state=active-negation-open&count=${viewport.count}${history}${extras}`);
}

async function measureComposition(page) {
  return page.evaluate(() => {
    const box = (element) => {
      const { left, right, top, bottom, width, height } = element.getBoundingClientRect();
      return { left, right, top, bottom, width, height };
    };
    const stage = document.querySelector('[data-single-target-negation-composition="proven"]');
    const composition = stage.querySelector('[data-single-target-negation-causal-spine="proven"]');
    const source = composition.querySelector('[data-negation-causal-participant="source"]');
    const root = composition.querySelector('[data-single-target-negation-root="true"]');
    const target = composition.querySelector('[data-negation-causal-participant="target"]');
    const branch = composition.querySelector('[data-public-negation-branch="proven"]');
    const branchCard = branch?.querySelector('[data-action-card-kind="Negation"]');
    const connector = branch?.querySelector(".single-target-negation-branch-connector");
    const dock = document.querySelector('.local-player-dock[data-player-anchor="p4"]');
    const guidance = dock?.querySelector(".console-guidance .decision-status");
    const overlaps = (a, b) => Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))
      * Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) > 0;
    return {
      stage: box(stage),
      source: box(source),
      root: box(root),
      target: target ? box(target) : null,
      branch: branch ? box(branch) : null,
      branchCard: branchCard ? box(branchCard) : null,
      connector: connector ? box(connector) : null,
      dock: box(dock),
      guidance: box(guidance),
      stageDockOverlap: overlaps(box(stage), box(dock)),
      stageGuidanceOverlap: overlaps(box(stage), box(guidance)),
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: innerWidth,
    };
  });
}

for (const viewport of viewports) {
  test(`first public Negation branches without moving the causal spine at ${viewport.width}px`, async ({ page }, testInfo) => {
    await loadScene(page, viewport);
    const openStage = page.locator('.interaction-stage[data-negation-open-composition="proven"]');
    await expect(openStage).toBeVisible();
    const openGeometry = await measureComposition(page);

    await loadScene(page, viewport, "single");
    const stage = page.locator('.interaction-stage[data-negation-first-branch-composition="proven"]');
    const composition = stage.locator('[data-single-target-negation-causal-spine="proven"]');
    const root = composition.locator('[data-single-target-negation-root="true"]');
    const branch = composition.locator('[data-public-negation-branch="proven"]');
    const negation = branch.locator('[data-action-card-kind="Negation"]');
    const firstNode = branch.locator(".single-target-negation-response-node").first();

    await expect(stage).toBeVisible();
    await expect(stage).not.toHaveAttribute("data-negation-open-composition", "proven");
    await expect(stage).toHaveAttribute("data-continuity", "ROOT_FRAME");
    await expect(root).toHaveAttribute("data-action-card-kind", "Dismantle");
    await expect(root).toHaveAttribute("data-active-head", "false");
    await expect(root).toHaveClass(/is-context/);
    await expect(root).toHaveCSS("opacity", "1");
    await expect(root.locator(".group-stage-card-art")).toHaveCSS("filter", "brightness(0.62)");
    await expect(negation).toHaveAttribute("data-active-head", "true");
    await expect(negation).toHaveClass(/is-active/);
    await expect(composition.locator('[data-action-card-kind][data-active-head="true"]')).toHaveCount(1);
    await expect(firstNode).toHaveAttribute("data-public-negation-node-actor-id", "p1");
    await expect(firstNode.locator('[data-public-negation-actor="p1"]')).toHaveText("Player 1");
    await expect(stage.locator(".reaction-chain, [data-reaction-chain], .interaction-stage-current-effect, [data-stage-event-summary], .hero-focus, .medium-participant-card")).toHaveCount(0);
    await expect(stage).not.toContainText("REACTION CHAIN");
    await expect(stage).not.toContainText("ORIGINAL EFFECT");
    await expect(page.locator('.local-player-dock[data-player-anchor="p4"]')).toBeVisible();

    const branchGeometry = await measureComposition(page);
    for (const participant of ["source", "root", "target"]) {
      for (const coordinate of ["left", "top", "width", "height"]) {
        expect(Math.abs(branchGeometry[participant][coordinate] - openGeometry[participant][coordinate]), `${participant}.${coordinate}: ${JSON.stringify({ open: openGeometry[participant], branch: branchGeometry[participant] })}`).toBeLessThanOrEqual(2);
      }
    }
    expect(branchGeometry.root.width).toBe(88);
    expect(branchGeometry.root.height).toBe(124);
    expect(branchGeometry.branchCard.width).toBe(78);
    expect(branchGeometry.branchCard.width).toBeGreaterThan(0);
    expect(branchGeometry.branchCard.width).toBeGreaterThanOrEqual(72);
    expect(branchGeometry.branchCard.height).toBeCloseTo(branchGeometry.branchCard.width * 102 / 76, 1);
    expect(Math.abs(branchGeometry.connector.left - branchGeometry.root.right)).toBeLessThanOrEqual(1);
    expect(Math.abs(branchGeometry.connector.right - branchGeometry.branchCard.left)).toBeLessThanOrEqual(1);
    expect(branchGeometry.branchCard.right).toBeLessThanOrEqual(branchGeometry.stage.right + 0.5);
    expect(branchGeometry.stageDockOverlap).toBe(false);
    expect(branchGeometry.stageGuidanceOverlap).toBe(false);
    expect(branchGeometry.documentWidth).toBe(branchGeometry.viewportWidth);
    expect(branchGeometry.guidance.top - branchGeometry.target.bottom).toBeLessThanOrEqual(24);
    if (viewport.width <= 650) {
      expect(branchGeometry.stage.left).toBeGreaterThanOrEqual(15);
      expect(branchGeometry.viewportWidth - branchGeometry.stage.right).toBeGreaterThanOrEqual(15);
    }

    const screenshot = await page.screenshot({ path: testInfo.outputPath(`single-target-negation-first-branch-${viewport.width}px.png`), animations: "disabled" });
    await testInfo.attach(`single-target-negation-first-branch-${viewport.width}px`, { body: screenshot, contentType: "image/png" });
  });
}

test("first public Negation preserves the one-participant self-target relationship", async ({ page }) => {
  const viewport = { width: 390, height: 844, count: 4 };
  const extras = "&source=p2&effect=Something%20Out%20of%20Nothing";
  await loadScene(page, viewport, null, extras);
  const openGeometry = await measureComposition(page);
  await loadScene(page, viewport, "single", extras);

  const stage = page.locator('.interaction-stage[data-negation-first-branch-composition="proven"]');
  const composition = stage.locator('[data-single-target-negation-causal-spine="proven"]');
  await expect(composition.locator('[data-negation-causal-participant]')).toHaveCount(1);
  await expect(composition.locator("[data-self-return-relationship]")).toBeVisible();
  await expect(composition.locator('[data-single-target-negation-root="true"]')).toHaveAttribute("data-action-card-kind", "DrawTwo");
  const branchGeometry = await measureComposition(page);
  for (const coordinate of ["left", "top", "width", "height"]) {
    expect(Math.abs(branchGeometry.source[coordinate] - openGeometry.source[coordinate])).toBeLessThanOrEqual(2);
    expect(Math.abs(branchGeometry.root[coordinate] - openGeometry.root[coordinate])).toBeLessThanOrEqual(2);
  }
  expect(branchGeometry.stageDockOverlap).toBe(false);
  expect(branchGeometry.documentWidth).toBe(branchGeometry.viewportWidth);
});

for (const invalidProof of [
  { query: "negationHistory=single-unknown-actor", label: "unknown public actor" },
  { query: "negationHistory=single&rootCard=missing", label: "missing root card proof" },
  { query: "negationHistory=frame-mismatch", label: "mismatched Negation frame" },
]) {
  test(`first public Negation fails closed with ${invalidProof.label}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/tests/browser/fixture.html?state=active-negation-open&${invalidProof.query}`);
    const stage = page.locator('.interaction-stage[data-stage="NEGATION"]');
    await expect(stage).not.toHaveAttribute("data-single-target-negation-composition", "proven");
    await expect(stage).not.toHaveAttribute("data-negation-first-branch-composition", "proven");
    await expect(stage.locator("[data-public-negation-branch], [data-public-negation-actor]")).toHaveCount(0);
  });
}
