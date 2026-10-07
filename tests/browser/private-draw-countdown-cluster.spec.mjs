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
    const deck = document.querySelector(".draw-stack");
    const discard = document.querySelector(".discard-stack");
    const guidance = document.querySelector(".local-player-dock .console-guidance");
    const dock = document.querySelector(".local-player-dock");
    const table = document.querySelector(".play-table");
    const eventStage = document.querySelector(".private-draw-stage");
    const eventContent = eventStage ? [...eventStage.querySelectorAll(".card-action-title, .private-draw-row")].map(bounds) : [];
    return {
      cluster: bounds(cluster),
      timer: timer ? bounds(timer) : null,
      menu: bounds(menu),
      deck: bounds(deck),
      discard: bounds(discard),
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

async function measurePrivateDrawContent(page) {
  return page.evaluate(() => {
    const bounds = (element) => {
      const { left, right, top, bottom, width, height } = element.getBoundingClientRect();
      return { left, right, top, bottom, width, height };
    };
    const eventStage = document.querySelector(".private-draw-stage");
    const content = eventStage.querySelector(".private-draw-content");
    const title = eventStage.querySelector(".card-action-title");
    const row = eventStage.querySelector(".private-draw-row");
    const cluster = document.querySelector(".stage-system-cluster");
    const guidance = document.querySelector(".local-player-dock .console-guidance");
    const dock = document.querySelector(".local-player-dock");
    const table = document.querySelector(".play-table");
    const menu = cluster.querySelector(".stage-system-menu-trigger");
    const deck = document.querySelector(".draw-stack");
    const discard = document.querySelector(".discard-stack");
    const cards = [...eventStage.querySelectorAll(".private-draw-row .played-card")].map((card) => {
      const animation = card.getAnimations().find((candidate) => candidate.animationName === "privateDrawCardFlight");
      const samples = [];
      if (animation) {
        animation.pause();
        const duration = Number(animation.effect.getComputedTiming().duration);
        for (const progress of [0, 0.025, 0.5, 0.9]) {
          animation.currentTime = duration * progress;
          samples.push({ ...bounds(card), opacity: Number.parseFloat(getComputedStyle(card).opacity), progress });
        }
        animation.currentTime = duration * 0.5;
      }
      return { ...bounds(card), opacity: Number.parseFloat(getComputedStyle(card).opacity), samples };
    });
    return {
      stage: bounds(eventStage), content: bounds(content), title: bounds(title), row: bounds(row),
      cards,
      cluster: bounds(cluster), menu: bounds(menu), deck: bounds(deck), discard: bounds(discard),
      guidance: bounds(guidance), dock: bounds(dock), table: bounds(table),
      seats: [...document.querySelectorAll(".player-board .opponent-player-card")].map(bounds),
      pageWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
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

test("Private Draw content is compact and finishes just above the lower system cluster", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-01-01T00:00:00.000Z") });
  await page.setViewportSize(viewports[0]);
  await page.goto("/tests/browser/fixture.html?state=normal&count=4");

  const baseline = new Map();
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    baseline.set(`${viewport.width}x${viewport.height}`, await measure(page));
  }
  const pauseAt = await page.evaluate(() => new Date(Date.now() + 10_000));
  await page.clock.pauseAt(pauseAt);
  await page.evaluate(() => window.__showPrivateDraw(2));

  const eventStage = page.locator(".private-draw-stage");
  await expect(eventStage).toBeVisible();
  await expect(eventStage.locator(".private-draw-row > *")).toHaveCount(2);

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    const geometry = await measurePrivateDrawContent(page);
    const prior = baseline.get(`${viewport.width}x${viewport.height}`);
    const eventBottom = Math.max(geometry.title.bottom, geometry.row.bottom);
    const contentToCluster = geometry.cluster.top - eventBottom;
    const context = JSON.stringify({ viewport, geometry, prior, contentToCluster });

    expect(geometry.pageWidth, context).toBeLessThanOrEqual(viewport.width);
    expect(geometry.stage.height, context).toBeGreaterThanOrEqual(geometry.table.height - 1);
    expect(geometry.content.height, context).toBeLessThan(geometry.stage.height);
    expect(Math.abs(geometry.content.bottom - geometry.row.bottom), context).toBeLessThanOrEqual(1);
    expect(geometry.title.top, context).toBeGreaterThanOrEqual(geometry.table.top - 1);
    expect(geometry.row.bottom, context).toBeLessThanOrEqual(geometry.table.bottom + 1);
    expect(contentToCluster, context).toBeGreaterThanOrEqual(16);
    expect(contentToCluster, context).toBeLessThanOrEqual(24);
    expect(Math.abs(geometry.dock.top - prior.dock.top), context).toBeLessThanOrEqual(2);
    expect(Math.abs(geometry.guidance.top - prior.guidance.top), context).toBeLessThanOrEqual(2);
    expect(Math.abs(geometry.menu.left - prior.menu.left), context).toBeLessThanOrEqual(2);
    expect(Math.abs(geometry.menu.top - prior.menu.top), context).toBeLessThanOrEqual(2);
    expect(Math.abs(geometry.deck.left - prior.deck.left), context).toBeLessThanOrEqual(2);
    expect(Math.abs(geometry.deck.top - prior.deck.top), context).toBeLessThanOrEqual(2);
    expect(Math.abs(geometry.discard.left - prior.discard.left), context).toBeLessThanOrEqual(2);
    expect(Math.abs(geometry.discard.top - prior.discard.top), context).toBeLessThanOrEqual(2);
    expect(geometry.table.bottom, context).toBeLessThanOrEqual(geometry.dock.top + 1);
    expect(geometry.cluster.bottom, context).toBeLessThanOrEqual(geometry.guidance.top);
    expect(geometry.guidance.top - geometry.cluster.bottom, context).toBeGreaterThanOrEqual(8);
    expect(geometry.guidance.top - geometry.cluster.bottom, context).toBeLessThanOrEqual(12);
    expect(geometry.seats.filter((seat) => overlaps(seat, geometry.title) || overlaps(seat, geometry.row)), context).toEqual([]);
    for (const card of geometry.cards) {
      expect(card.left, context).toBeGreaterThanOrEqual(geometry.table.left - 1);
      expect(card.right, context).toBeLessThanOrEqual(geometry.table.right + 1);
      expect(card.top, context).toBeGreaterThanOrEqual(geometry.table.top - 1);
      expect(card.bottom, context).toBeLessThanOrEqual(geometry.cluster.top - 16);
      expect(card.opacity, context).toBeGreaterThan(0.99);
      expect(card.samples, context).toHaveLength(4);
      for (const sample of card.samples) {
        expect(sample.bottom, JSON.stringify({ viewport, sample, cluster: geometry.cluster })).toBeLessThanOrEqual(geometry.cluster.top - 16);
      }
    }
  }
});
