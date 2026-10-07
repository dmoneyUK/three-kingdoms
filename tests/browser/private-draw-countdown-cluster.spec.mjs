import { expect, test } from "@playwright/test";

const viewports = [
  { width: 390, height: 844 },
  { width: 480, height: 900 },
  { width: 1440, height: 900 },
];

function overlaps(left, right) {
  return Math.min(left.right, right.right) > Math.max(left.left, right.left)
    && Math.min(left.bottom, right.bottom) > Math.max(left.top, right.top);
}

async function measure(page) {
  return page.evaluate(() => {
    const bounds = (element) => {
      const { left, right, top, bottom, width, height } = element.getBoundingClientRect();
      return { left, right, top, bottom, width, height };
    };
    const cluster = document.querySelector(".stage-system-cluster");
    const timer = cluster.querySelector(":scope > .visible-countdown-event");
    const menu = cluster.querySelector(".stage-system-menu-trigger");
    const guidance = document.querySelector(".local-player-dock .console-guidance");
    const dock = document.querySelector(".local-player-dock");
    const table = document.querySelector(".play-table");
    const eventStage = document.querySelector(".private-draw-stage");
    const eventContent = eventStage ? [...eventStage.querySelectorAll(".card-action-title, .private-draw-row")].map(bounds) : [];
    return {
      cluster: bounds(cluster),
      timer: timer ? bounds(timer) : null,
      menu: bounds(menu),
      guidance: bounds(guidance),
      dock: bounds(dock),
      table: bounds(table),
      eventContent,
      pageWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      timerPointerEvents: timer ? getComputedStyle(timer).pointerEvents : null,
    };
  });
}

test("Private Draw countdown moves into the lower-right System Menu cluster without changing its content", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-01-01T00:00:00.000Z") });
  await page.setViewportSize(viewports[0]);
  await page.goto("/tests/browser/fixture.html?state=normal&count=4");

  const cluster = page.locator(".stage-system-cluster");
  const menu = cluster.getByRole("button", { name: "System menu" });
  await expect(menu).toBeVisible();
  await expect(cluster.locator(":scope > .visible-countdown-event")).toHaveCount(0);
  await expect(page.locator(".private-draw-stage")).toHaveCount(0);

  const baseline = new Map();
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    const geometry = await measure(page);
    baseline.set(`${viewport.width}x${viewport.height}`, geometry);
  }

  const pauseAt = await page.evaluate(() => new Date(Date.now() + 10_000));
  await page.clock.pauseAt(pauseAt);
  await page.evaluate(() => window.__showPrivateDraw(2));

  const eventStage = page.locator(".private-draw-stage");
  const timer = cluster.locator(":scope > .visible-countdown-event");
  await expect(eventStage).toBeVisible();
  await expect(eventStage.locator(".card-action-title")).toContainText("PRIVATE DRAW");
  await expect(eventStage.locator(".card-action-title")).toContainText("Only you can see these cards");
  await expect(eventStage.locator(".private-draw-row > *")).toHaveCount(2);
  await expect(timer).toBeVisible();
  await expect(timer).toHaveAttribute("role", "timer");
  await expect(timer).toHaveAttribute("aria-label", "Cards close in 3 seconds");
  await expect(timer).toHaveText("3s");
  await expect(eventStage.locator(".visible-countdown")).toHaveCount(0);
  await expect(page.locator(".play-table > .visible-countdown")).toHaveCount(0);

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    const geometry = await measure(page);
    const prior = baseline.get(`${viewport.width}x${viewport.height}`);
    const context = JSON.stringify({ viewport, geometry, prior });

    expect(geometry.pageWidth, context).toBeLessThanOrEqual(viewport.width);
    expect(geometry.timer.width, context).toBeGreaterThanOrEqual(44);
    expect(geometry.timer.width, context).toBeLessThanOrEqual(64);
    expect(geometry.timer.height, context).toBeGreaterThanOrEqual(36);
    expect(geometry.timer.height, context).toBeLessThanOrEqual(44);
    expect(Math.abs(geometry.timer.right - geometry.menu.left + 8), context).toBeLessThanOrEqual(1);
    expect(Math.abs(geometry.menu.left - prior.menu.left), context).toBeLessThanOrEqual(2);
    expect(Math.abs(geometry.menu.top - prior.menu.top), context).toBeLessThanOrEqual(2);
    expect(Math.abs(geometry.guidance.top - prior.guidance.top), context).toBeLessThanOrEqual(2);
    expect(geometry.timerPointerEvents, context).toBe("none");
    expect(geometry.timer.left, context).toBeGreaterThanOrEqual(geometry.table.left - 1);
    expect(geometry.menu.right, context).toBeLessThanOrEqual(geometry.table.right + 1);
    expect(geometry.table.bottom, context).toBeLessThanOrEqual(geometry.dock.top + 1);
    expect(geometry.cluster.bottom, context).toBeLessThanOrEqual(geometry.guidance.top);
    expect(geometry.guidance.top - geometry.cluster.bottom, context).toBeGreaterThanOrEqual(8);
    expect(geometry.guidance.top - geometry.cluster.bottom, context).toBeLessThanOrEqual(12);
    expect(geometry.cluster.bottom, context).toBeLessThanOrEqual(geometry.dock.top);
    expect(geometry.eventContent.filter((content) => overlaps(geometry.cluster, content)), context).toEqual([]);
    for (const content of geometry.eventContent) {
      expect(content.left, context).toBeGreaterThanOrEqual(geometry.table.left - 1);
      expect(content.right, context).toBeLessThanOrEqual(geometry.table.right + 1);
      expect(content.top, context).toBeGreaterThanOrEqual(geometry.table.top - 1);
      expect(content.bottom, context).toBeLessThanOrEqual(geometry.table.bottom + 1);
    }
  }

  await page.evaluate(() => window.__switchPrivateDrawObserver());
  await expect(eventStage).toHaveCount(0);
  await expect(timer).toHaveCount(0);
  const observerRoom = await page.evaluate(() => ({ hand: window.__browserRoom.myHand, timeline: window.__browserRoom.timeline }));
  expect(observerRoom.hand).toEqual([]);
  expect(observerRoom.timeline.every((event) => !("card" in event))).toBe(true);
});
