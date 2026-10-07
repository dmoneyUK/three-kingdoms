import { expect, test } from "@playwright/test";

const viewports = [
  { width: 390, height: 844, count: 4 },
  { width: 480, height: 900, count: 6 },
  { width: 1440, height: 900, count: 4 },
];

async function openScene(page, viewport) {
  await page.setViewportSize(viewport);
  await page.goto(`/tests/browser/fixture.html?state=active-negation-open&count=${viewport.count}`);
  await expect(page.locator('.interaction-stage[data-negation-open-composition="proven"]')).toBeVisible();
}

async function compositionGeometry(page) {
  return page.evaluate(() => {
    const bounds = (element) => {
      const { left, right, top, bottom, width, height } = element.getBoundingClientRect();
      return { left, right, top, bottom, width, height };
    };
    const overlaps = (a, b) => Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))
      * Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) > 0;
    const stage = document.querySelector('[data-single-target-negation-composition="proven"]');
    const composition = stage.querySelector('[data-single-target-negation-causal-spine="proven"]');
    const dock = document.querySelector('.local-player-dock[data-player-anchor="p4"]');
    const guidance = dock?.querySelector(".console-guidance .decision-status");
    const source = composition.querySelector('[data-negation-causal-participant="source"]');
    const root = composition.querySelector('[data-single-target-negation-root="true"]');
    const target = composition.querySelector('[data-negation-causal-participant="target"]');
    return {
      stage: bounds(stage),
      source: bounds(source),
      root: bounds(root),
      target: bounds(target),
      dock: bounds(dock),
      guidance: bounds(guidance),
      stageDockOverlap: overlaps(bounds(stage), bounds(dock)),
      stageGuidanceOverlap: overlaps(bounds(stage), bounds(guidance)),
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: innerWidth,
    };
  });
}

function expectSameAnchors(before, after, anchors = ["source", "root", "target"]) {
  for (const anchor of anchors) {
    for (const coordinate of ["left", "top", "width", "height"]) {
      expect(Math.abs(after[anchor][coordinate] - before[anchor][coordinate]), `${anchor}.${coordinate}`).toBeLessThanOrEqual(2);
    }
  }
}

function expectContained(geometry) {
  expect(geometry.stageDockOverlap).toBe(false);
  expect(geometry.stageGuidanceOverlap).toBe(false);
  expect(geometry.documentWidth).toBe(geometry.viewportWidth);
}

for (const viewport of viewports) {
  test(`Negation settlement collapses its branch without moving the causal spine at ${viewport.width}px`, async ({ page }, testInfo) => {
    await openScene(page, viewport);
    const before = await compositionGeometry(page);

    for (const outcome of ["ROOT_CANCELLED", "ROOT_RESTORED"]) {
      await page.evaluate((nextOutcome) => window.__setNegationSettlementState(nextOutcome), outcome);
      const stage = page.locator(`.interaction-stage[data-negation-settlement="${outcome}"]`);
      const composition = stage.locator('[data-single-target-negation-causal-spine="proven"]');
      const root = composition.locator('[data-single-target-negation-root="true"]');

      await expect(stage).toBeVisible();
      await expect(composition.locator("[data-public-negation-branch]")).toHaveCount(0);
      await expect(stage.locator(".reaction-chain, [data-reaction-chain], .interaction-stage-current-effect")).toHaveCount(0);
      if (outcome === "ROOT_CANCELLED") {
        await expect(root).toHaveAttribute("data-negation-root-cancelled", "true");
        await expect(root).toHaveAttribute("data-active-head", "false");
        await expect(root.locator(".single-target-negation-cancelled-mark")).toHaveText("⊘");
        await expect(composition.locator('[data-action-card-kind][data-active-head="true"]')).toHaveCount(0);
      } else {
        await expect(root).not.toHaveAttribute("data-negation-root-cancelled", "true");
        await expect(root).toHaveAttribute("data-active-head", "true");
        await expect(root.locator(".single-target-negation-cancelled-mark")).toHaveCount(0);
        await expect(composition.locator('[data-action-card-kind][data-active-head="true"]')).toHaveCount(1);
      }

      const settled = await compositionGeometry(page);
      expectSameAnchors(before, settled);
      expectContained(settled);
      const screenshot = await page.screenshot({ path: testInfo.outputPath(`negation-settlement-${outcome}-${viewport.width}px.png`), animations: "disabled" });
      await testInfo.attach(`negation-settlement-${outcome}-${viewport.width}px`, { body: screenshot, contentType: "image/png" });
    }
  });
}

test("cancelled root is shown only on the authoritative interaction-ended transition", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tests/browser/fixture.html?state=active-negation-open&count=4");
  await page.evaluate(() => window.__setNegationSettlementState("ROOT_CANCELLED"));
  await expect(page.locator('.interaction-stage[data-negation-settlement="ROOT_CANCELLED"]')).toBeVisible();

  await page.evaluate(() => window.__setNegationSettlementState("REST_CANCELLED"));
  const endingStage = page.locator('.interaction-stage[data-negation-settlement="ROOT_CANCELLED"]');
  await expect(endingStage).toBeVisible();
  await expect(endingStage.locator('[data-negation-root-cancelled="true"] .single-target-negation-cancelled-mark')).toHaveText("⊘");

  await page.evaluate(() => window.__setNegationSettlementState("REST_EMPTY"));
  await expect(page.locator(".interaction-stage[data-single-target-negation-composition='proven']")).toHaveCount(0);
});

test("a REST snapshot loaded without its interaction transition does not replay an old cancellation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tests/browser/fixture.html?state=rest&settlement=ROOT_CANCELLED");
  await expect(page.locator(".interaction-stage[data-single-target-negation-composition='proven']")).toHaveCount(0);
});

test("self-target root restoration keeps one public participant and a stable return spine", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tests/browser/fixture.html?state=active-negation-open&count=4&source=p2&effect=Something%20Out%20of%20Nothing");
  const stage = page.locator('.interaction-stage[data-negation-open-composition="proven"]');
  const composition = stage.locator('[data-single-target-negation-causal-spine="proven"]');
  const measure = () => page.evaluate(() => {
    const rect = (selector) => {
      const { left, top, width, height } = document.querySelector(selector).getBoundingClientRect();
      return { left, top, width, height };
    };
    return {
      source: rect('[data-negation-causal-participant="source"]'),
      root: rect('[data-single-target-negation-root="true"]'),
    };
  });
  await expect(composition).toHaveAttribute("data-negation-self-target", "true");
  await expect(composition.locator('[data-negation-causal-participant]')).toHaveCount(1);
  const before = await measure();

  await page.evaluate(() => window.__setNegationSettlementState("ROOT_RESTORED"));
  const restoredStage = page.locator('.interaction-stage[data-negation-settlement="ROOT_RESTORED"]');
  const restored = restoredStage.locator('[data-single-target-negation-causal-spine="proven"]');
  await expect(restored).toHaveAttribute("data-negation-self-target", "true");
  await expect(restored.locator('[data-negation-causal-participant]')).toHaveCount(1);
  await expect(restored.locator("[data-self-return-relationship='true']")).toBeVisible();
  await expect(restored.locator('[data-single-target-negation-root="true"]')).toHaveAttribute("data-action-card-kind", "DrawTwo");
  await expect(restored.locator('[data-single-target-negation-root="true"]')).toHaveAttribute("data-active-head", "true");
  await expect(restored.locator("[data-public-negation-branch]")).toHaveCount(0);
  const after = await measure();
  expectSameAnchors(before, after, ["source", "root"]);
});

for (const proof of ["missing", "mismatched-root"]) {
  test(`settlement fails closed with ${proof} authoritative proof`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/tests/browser/fixture.html?state=active-negation-open&count=4");
    if (proof === "missing") {
      await page.evaluate(() => window.__setNegationSettlementState("NO_SETTLEMENT"));
    } else {
      await page.evaluate(() => window.__setNegationSettlementState("mismatched-root"));
    }
    const stage = page.locator('.interaction-stage[data-stage="NEGATION"]');
    await expect(stage).not.toHaveAttribute("data-negation-settlement", /.+/);
    await expect(stage.locator(".single-target-negation-cancelled-mark")).toHaveCount(0);
    await expect(stage.locator('[data-single-target-negation-root="true"]')).toHaveAttribute("data-active-head", "true");
  });
}
