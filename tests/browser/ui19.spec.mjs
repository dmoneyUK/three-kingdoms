import { expect, test } from "@playwright/test";

const MATRIX = [
  { width: 1440, height: 900, counts: [2, 4, 6, 10] },
  { width: 650, height: 900, counts: [4, 6, 10] },
  { width: 480, height: 900, counts: [4, 6, 10] },
];

async function loadFixture(page, { state = "normal", count = 4, width, height, reducedMotion = false }) {
  await page.setViewportSize({ width, height });
  await page.emulateMedia({ reducedMotion: reducedMotion ? "reduce" : "no-preference" });
  await page.goto(`/tests/browser/fixture.html?state=${state}&count=${count}`);
  await expect(page.locator(".game-shell")).toBeVisible();
}

async function assertVisible(locator, label) {
  await expect(locator, label).toBeVisible();
  await expect(locator).not.toHaveCSS("display", "none");
}

async function geometry(page) {
  return page.evaluate(() => {
    const visible = (element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
    };
    const rect = (element) => {
      const value = element.getBoundingClientRect();
      return { left: value.left, top: value.top, right: value.right, bottom: value.bottom, width: value.width, height: value.height };
    };
    const anchors = [...document.querySelectorAll("[data-player-anchor]")].filter(visible).map(rect);
    const controls = [
      document.querySelector(".local-player-dock"),
      document.querySelector(".local-hand"),
      document.querySelector('[data-console-surface="local-operation"]'),
    ].filter(Boolean).filter(visible).map(rect);
    const overlap = (left, right) => Math.max(0, Math.min(left.right, right.right) - Math.max(left.left, right.left)) * Math.max(0, Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top));
    const severeAnchorOverlaps = [];
    for (let index = 0; index < anchors.length; index += 1) {
      for (let other = index + 1; other < anchors.length; other += 1) {
        const area = overlap(anchors[index], anchors[other]);
        const smaller = Math.min(anchors[index].width * anchors[index].height, anchors[other].width * anchors[other].height);
        if (smaller > 0 && area / smaller > 0.2) severeAnchorOverlaps.push({ index, other, ratio: area / smaller });
      }
    }
    const stage = document.querySelector(".interaction-stage");
    const stageRect = stage && visible(stage) ? rect(stage) : null;
    const controlOverlap = stageRect ? controls.map((control) => overlap(stageRect, control)).some((area) => area > 0) : false;
    return {
      anchorCount: anchors.length,
      anchors,
      controls,
      severeAnchorOverlaps,
      controlOverlap,
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    };
  });
}

for (const { width, height, counts } of MATRIX) {
  for (const count of counts) {
    test(`UI-19 ${width}x${height} keeps ${count}-player anchors and controls usable`, async ({ page }) => {
      await loadFixture(page, { state: count === 2 ? "rest" : "normal", count, width, height });
      const result = await geometry(page);
      expect(result.anchorCount, "one local dock plus N-1 opponent anchors").toBe(count);
      expect(result.scrollWidth, "no horizontal overflow").toBeLessThanOrEqual(result.viewportWidth);
      expect(result.severeAnchorOverlaps, "no severe seat overlap").toEqual([]);
      expect(result.controls.length, "local dock, hand, and console remain visible").toBe(3);
      if (count >= 5) await expect(page.locator('[data-seat-topology="side-column"]')).toHaveCount(1);
      else await expect(page.locator('[data-seat-topology="top-row"]')).toHaveCount(1);
    });
  }
}

test("UI-19 semantic Interaction Stage and Hero Focus remain viewer-visible", async ({ page }) => {
  await loadFixture(page, { state: "interaction", count: 4, width: 1440, height: 900 });
  await expect(page.locator('[data-stage="ATTACK_RESPONSE"]')).toBeVisible();
  await expect(page.locator('.interaction-stage[data-presentation-transition="INTERACTION_TRANSITION"]')).toBeVisible();
  await expect(page.locator('[data-hero-focus="true"]')).toBeVisible();
  await expect(page.locator('[aria-label="Interaction Stage"]')).toContainText("INTERACTION STAGE");
  await expect(page.locator('[data-interaction-decision-actor="true"]')).toHaveCount(1);
});

test("UI-19 multi-target preview decorates the existing public recipients", async ({ page }) => {
  await loadFixture(page, { state: "group", count: 6, width: 650, height: 900 });
  await page.locator('[data-hand-card-id="browser-raining-arrows"] button.game-card').click();
  await expect(page.locator('[data-group-scope-preview="RainingArrows"]')).toBeVisible();
  await expect(page.locator('[data-local-group-preview="true"]')).toHaveCount(5);
  await expect(page.locator('[data-console-surface="local-operation"]')).toBeVisible();
});

test("UI-19 Duel responder remains bounded at the 650px breakpoint", async ({ page }) => {
  await loadFixture(page, { state: "duel", count: 4, width: 650, height: 900 });
  await expect(page.locator('[data-stage="DUEL_EXCHANGE"]')).toBeVisible();
  await assertVisible(page.locator('[data-console-surface="local-operation"]'), "Duel console");
  await expect(page.locator('[data-console-surface="local-operation"] button')).toHaveCount(2);
  await expect(page.locator('[data-hero-focus-role="CURRENT PARTICIPANT"]')).toBeVisible();
});

test("UI-19 Negation reaction chain keeps semantic labels at 480px", async ({ page }) => {
  await loadFixture(page, { state: "negation", count: 4, width: 480, height: 900 });
  await expect(page.locator('[data-stage="NEGATION"]')).toBeVisible();
  await expect(page.locator('[data-reaction-chain="proven"]')).toBeVisible();
  await expect(page.locator('[aria-label="Reaction Chain"]')).toContainText("REACTION CHAIN");
  await expect(page.locator('[data-console-surface="local-operation"]')).toBeVisible();
});

test("UI-19 Dying/Peach handoff remains semantic and operable at 480px", async ({ page }) => {
  await loadFixture(page, { state: "dying", count: 4, width: 480, height: 900 });
  await expect(page.locator('[data-stage="DYING"]')).toBeVisible();
  await expect(page.locator('[data-dying-handoff="proven"]')).toBeVisible();
  await expect(page.locator('[data-hero-focus-role="DYING PLAYER"]')).toBeVisible();
  await expect(page.locator('[data-hand-card-id="browser-peach"] button.game-card')).toBeEnabled();
  await expect(page.locator('[data-console-surface="local-operation"] button')).toHaveCount(2);
});

test("UI-19 retained target-card picker stays bounded and scroll-safe at 480px", async ({ page }) => {
  await loadFixture(page, { state: "picker", count: 4, width: 480, height: 900 });
  const panel = page.locator('[role="dialog"][aria-label="Retaliation target card selection"]');
  await expect(panel).toBeVisible();
  const bounds = await panel.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const row = element.querySelector(".target-card-picker-card-row");
    return {
      withinViewport: box.left >= 0 && box.top >= 0 && box.right <= window.innerWidth && box.bottom <= window.innerHeight,
      rowScrollSafe: Boolean(row && row.scrollWidth >= row.clientWidth && getComputedStyle(row).overflowX === "auto"),
      actionButtonsVisible: [...element.querySelectorAll(".target-card-picker-actions button")].every((button) => {
        const buttonBox = button.getBoundingClientRect();
        return buttonBox.width > 0 && buttonBox.height > 0;
      }),
    };
  });
  expect(bounds, "picker panel stays within the mobile viewport").toEqual({ withinViewport: true, rowScrollSafe: true, actionButtonsVisible: true });
  await expect(page.locator("html")).toHaveJSProperty("scrollWidth", 480);
});

test("UI-19 reduced motion removes nonessential transition animation without hiding meaning", async ({ page }) => {
  await loadFixture(page, { state: "interaction", count: 4, width: 480, height: 900, reducedMotion: true });
  const stage = page.locator('.interaction-stage[data-presentation-transition="INTERACTION_TRANSITION"]');
  await expect(stage).toBeVisible();
  await expect(stage).toHaveCSS("animation-name", "none");
  await expect(page.locator('[data-hero-focus="true"]')).toBeVisible();
  await expect(page.locator('[aria-label="Your hand"]')).toBeVisible();
  await expect(page.locator('[data-console-surface="local-operation"]')).toHaveCSS("pointer-events", "auto");
  await page.locator('[data-console-surface="local-operation"] button:not(:disabled)').first().focus();
  await expect(page.locator(':focus')).toHaveClass(/primary|end|serpent-control/);
});
